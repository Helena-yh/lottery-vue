import {
  Events, IAReceivedMessage, IMessagesEvent, addEventListener, removeEventListener,
  IConversationOption, electronExtension, deleteMessages, recallMessage,
  BaseMessage, CombineV2Message,
  ISendMessageOptions,
  getHistoryMessages,
  ErrorCode,
  SentStatus,
  getServerTime,
  IInsertOptions,
  MessageType,
  CombineV2MessageContent,
  ICombinedMessage,
  ConversationType,
  IReadReceiptData,
  IGroupReadReceiptData,
  IPrivateReadReceiptData,
  sendReadReceiptMessageV4,
  batchGetMessageReadReceiptInfoV4,
  getMessageReadReceiptV4,
  IMessageReadReceiptV4Response,
} from '@rongcloud/imlib-next';
import { isObject, cloneByJSON } from '@rongcloud/engine';
import { RCKitModule } from './RCKitModule';
import { MessageSendQueue, FileUploadQueue } from './Queue';
import {
  isInvalidConversation, isPrivOrGroupConversation, trans2ConversationKey, parseFileToMessage, transIAReceivedMessage, findLastIndex,
} from '../helper';
import { RCKitEvent } from '../core/RCKitEvent';
import { RCKitContext } from '../core/RCKitContext';
import { InnerErrorCode } from '../enums/RCKitCode';
import { LogTag } from '@lib/enums/LogTag';
import { getMessageDesc } from '@lib/ui/provider/context';
import { IRCKitDeleteMessageData, InnerEvent, RCKitEvents } from '@lib/core/EventDefined';

export interface IRCKitCachedMessage extends IAReceivedMessage {
  /**
   * 对应的发送事务 ID，本地生成的消息会携带此 ID，用于匹配相关事件
   */
  transactionId: number;
  /**
   * 上传进度
   * * 100 为上传完成
   * * -1 为上传失败
   */
  progress?: number;
  /**
   * 待上传文件 Blob
   */
  file?: File;
}

/**
 * 内存态缓存消息列表
 */
interface IRCKitCachedMessageData {
  /**
   * 消息记录片段数据
   */
  histories: IRCKitCachedMessage[];
  /**
   * 片段数据的开始时间，片段数据将不包含该时间点的消息
   */
  startTime: number;
  /**
   * 片段数据的结束时间，片段数据将不包含该时间点的消息
   */
  endTime: number;
  /**
   * 起始时间以前是否还有更多历史消息
   */
  hasMoreBeforeStartTime: boolean;
  /**
   * 结束时间以后是否还有更多历史消息
   */
  hasMoreAfterEndTime: boolean;
}

const MESSAGE_PAGE_SIZE = 30;

/**
 * 消息模块，仅处理消息数据，不与会话列表产生有交互。
 * 会话列表中的 latestMessage 等状态更新，有会话模块自行解析处理。
 * @emits
 * - {@link RCKitEvents.INSERT_MESSAGE} - 向列表插入一条消息
 * - {@link RCKitEvents.MESSAGE_UPDATE} - 消息状态更新
 * @method
 * - 内存态历史消息维护，用于处理发送中的消息和实际消息的交叉展示
 * - 消息发送队列维护
 * - 消息上传队列维护
 * - 消息发送、发送状态维护
 * - 插入消息
 * - 消息接收、分发、暂存
 * - 消息删除、撤回
 */
export class MessageModule extends RCKitModule {
  /**
   * 消息发送队列
   */
  private readonly _sendQueue: MessageSendQueue;

  /**
   * 文件上传队列
   */
  private readonly _uploadQueue: FileUploadQueue;

  private _transactionIdCount = 0;

  /**
   * 需要暂存部分消息列表缓存，以维护本地发送中的消息和实际消息的展示。
   */
  private _histories: Map<string, IRCKitCachedMessageData> = new Map();

  constructor(ctx: RCKitContext) {
    super(ctx);

    this._sendQueue = new MessageSendQueue(ctx);
    this._uploadQueue = new FileUploadQueue(ctx);
  }

  protected _onInit(): void {
    if (electronExtension.enable()) {
      addEventListener(Events.MESSAGES, this._onRecvElectronMessage, this);
      this._handleElectronMessages();
    } else {
      addEventListener(Events.MESSAGES, this._onRecvMessages, this);
    }
    addEventListener(Events.MESSAGE_READ_RECEIPT_V4, this._onMessageReadReceipt, this);
  }

  protected _onInitUserCache(): void {
    // 无需实现
  }

  protected _onDestroyUserCache(): void {
    this._histories.clear();
    this._transactionIdCount = 0;
    this._messageQueue.length = 0;
    if (this._messageHandleTimer) {
      clearTimeout(this._messageHandleTimer);
      this._messageHandleTimer = null;
    }
  }

  public destroy(): void {
    this._onDestroyUserCache();
    this._sendQueue.destroy();
    this._uploadQueue.destroy();
    removeEventListener(Events.MESSAGES, this._onRecvElectronMessage, this);
    removeEventListener(Events.MESSAGES, this._onRecvMessages, this);
    removeEventListener(Events.MESSAGE_READ_RECEIPT_V4, this._onMessageReadReceipt, this);
  }

  /**
   * 生成本地消息标识 ID，用以匹配消息发送过程中的不同阶段处理任务
   */
  private _createTransactionId(): number {
    return ++this._transactionIdCount;
  }

  private _getExistCache(conversation: IConversationOption): IRCKitCachedMessageData | undefined {
    return this._histories.get(trans2ConversationKey(conversation));
  }

  /**
   * 获取或创建指定会话的缓存数据
   * 注意：本地没有缓存时，startTime 应该为 0
   * 否则获取a会话历史消息前接收到a消息，远端历史消息无法与缓存数据合并
   * @param conversation
   * @param forword
   * @returns
   */
  private _getOrCreateCache(
    conversation: IConversationOption,
    timestamp: number,
    hasMoreAfterEndTime: boolean,
    hasMoreBeforeStartTime: boolean,
  ): IRCKitCachedMessageData {
    const key = trans2ConversationKey(conversation);
    let cached = this._histories.get(key);
    if (!cached) {
      cached = {
        histories: [],
        startTime: 0,
        endTime: timestamp === 0 ? getServerTime() : timestamp,
        hasMoreAfterEndTime,
        hasMoreBeforeStartTime,
      };
      this._histories.set(key, cached);
    }
    return cached;
  }

  /**
   * 向缓存队列尾部插入消息，插入时会自动去重
   * @param histories
   * @param message
   */
  private _push2Cache(cache: IRCKitCachedMessageData, ...messages: IRCKitCachedMessage[]): void {
    const { histories, startTime } = cache;
    messages.forEach((message) => {
      // 查找比当前消息时间更早的消息
      const index = findLastIndex(histories, (item) => item.messageUId === message.messageUId || item.sentTime < message.sentTime);
      if (index === -1) {
        histories.unshift(message);
      } else {
        histories.splice(index + 1, 0, message);
      }
      // 更新结束时间
      const newTime = message.sentTime + 1;
      cache.endTime = cache.endTime === 0 ? newTime : Math.max(cache.endTime, newTime);
    });
    if (!startTime) {
      cache.startTime = Math.min(...messages.map(item => item.sentTime)) - 1;
    }
  }

  /**
   * 向缓存队列头部插入消息，插入时会自动去重
   * @param cache
   * @param messages
   */
  private _unshift2Cache(cache: IRCKitCachedMessageData, ...messages: IRCKitCachedMessage[]): void {
    const { histories } = cache;
    messages.forEach((message) => {
      // 查找比当前消息时间更晚的消息
      const index = histories.findIndex((item) => item.messageUId === message.messageUId || item.sentTime > message.sentTime);
      if (index === -1) {
        histories.push(message);
      } else if(histories[index].messageUId !== message.messageUId) {
        // 相同消息 id 就不再插入
        histories.splice(index, 0, message);
      }
      // 更新起始时间
      const newTime = message.sentTime - 1;
      cache.startTime = cache.startTime === 0 ? newTime : Math.min(cache.startTime, newTime);
    });
  }

  private _messageQueue: IAReceivedMessage[] = [];

  /**
   * 处理 Electron 平台接收消息
   * @description - Electron 平台下消息为逐条抛出，离线场景下会大量派发事件，事件会产生大量 timer 计时器，同时会频繁刷新 UI 导致性能下降；因此需要聚合消息批量处理
   * @param message
   */
  private _onRecvElectronMessage(evt: IMessagesEvent): void {
    this._messageQueue.push(...evt.messages);
  }

  private _messageHandleTimer: any = null;

  private _handleElectronMessages(): void {
    this._messageHandleTimer = setTimeout(() => {
      if (this._messageQueue.length > 0) {
        const messages = this._messageQueue.splice(0);
        this._handleMessages(messages);
      }

      this._messageHandleTimer = null;
      this._handleElectronMessages();
    }, 60)
  }

  private _onRecvMessages(evt: IMessagesEvent): void {
    this._handleMessages(evt.messages);
  }

  private _handleMessages(messages: IAReceivedMessage[]): void {
    // 非存储的消息，由业务层处理
    const unPresitedMsgs: IRCKitCachedMessage[] = [];
    // 需要通知 UI 层的消息
    let newMsgs: IRCKitCachedMessage[] = [];

    messages.forEach(async(message) => {
      const msg = transIAReceivedMessage(message);

      // Electron 接收的是撤回信令信息，不存储。和 web 报错一致改为存储继续走下面逻辑
      if (electronExtension.enable() && msg.messageType === MessageType.RECALL_MESSAGE_TYPE) {
        message.isPersited = true;
      }
      if (!message.isPersited || isInvalidConversation(message)) {
        // 不存储的消息，以及会话类型不合法的消息，直接派发给业务层
        unPresitedMsgs.push(msg);
        return;
      }

      // 处理撤回消息
      if (msg.messageType === MessageType.RECALL_MESSAGE_TYPE) {
        const { messageUId } = msg.content;
        // 从当前批次待处理消息中查找删除消息，替换为撤回消息，无需再通知新接收消息
        // 一般发生在拉取大量离线消息时，消息中包含撤回消息的场景
        let index = newMsgs.findIndex((item) => item.messageUId === messageUId);
        if (index !== -1) {
          newMsgs.splice(index, 1, msg);
          return;
        }
      }

      newMsgs.push(msg);
    });

    // 二次处理 newMsgs
    newMsgs = this._handleNotifiedUIMessaages(newMsgs);

    // 通知 UI 层接收到新消息
    const messageList = newMsgs.filter((item) => item.messageType !== MessageType.RECALL_MESSAGE_TYPE)
    if (messageList.length) {
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.RECV_NEW_MESSAGES, newMsgs));
    }

    // 通知 App 层接收到非存储的消息
    if (unPresitedMsgs.length) {
      this.ctx.emit(new RCKitEvent(RCKitEvents.UNSCHEDULED_MESSAGES, unPresitedMsgs));
    }
  }

  // 需要通知 UI 层的消息
  private _handleNotifiedUIMessaages(messages: IRCKitCachedMessage[]): IRCKitCachedMessage[] {
    messages.forEach((msg) => {
      const cached = this._getOrCreateCache(msg, msg.sentTime + 1, false, true);
      // 撤回消息二次检查
      // 因要保证撤回消息与原消息位置一致，故需从缓存中查找，不能直接向缓存队列中 push
      if (msg.messageType === MessageType.RECALL_MESSAGE_TYPE && cached.histories.length > 0) {
        const index = cached.histories.findIndex((item) => item.messageUId === msg.content.messageUId);
        if (index !== -1) {
          // 替换缓存中的原始消息
          const [target] = cached.histories.splice(index, 1, msg);
          // 修改撤回消息发送时间为原始消息发送时间
          msg.sentTime = target.sentTime;
          // 从 newMsgs 中移除撤回消息，避免重复
          // 派发撤回通知
          this.ctx.emit(new RCKitEvent(RCKitEvents.MESSAGES_DELETED, [{ target, recallMsg: msg }]), 1);
          return;
        }
      }

      // 非撤回消息，尝试向缓存中插入
      if (!cached.hasMoreAfterEndTime && msg.messageType !== MessageType.RECALL_MESSAGE_TYPE) {
        // 缓存数据已与现实最新时间有连续性，直接向后插入消息，并更新 endTime
        this._push2Cache(cached, msg);
      }
    });

    return messages;
  }

  /**
   * 消息回执监听
   * @param evt
   */
  private async _onMessageReadReceipt(evt: IReadReceiptData) {
    const { privateReadReceipt, groupReadReceipt } = evt;
    if (privateReadReceipt) {
      this._handleReadReceipt2Private(privateReadReceipt)
    };

    if (groupReadReceipt) {
      this._handleReadReceipt2Group(groupReadReceipt)
    }
  }

  /**
   * 处理单聊会话收到已读回执
   * @param conversation
   * @param cached
   * @param endMsgTime
   * @returns
   */
  private async _handleReadReceipt2Private(privateReadReceipt: IPrivateReadReceiptData) {
    const { conversationType, targetId, channelId, endMsgTime } = privateReadReceipt;
    const conversation = { conversationType, targetId, channelId };

    // TODO: imlib 发群回执 privateReadReceipt 也有值。bug 兼容判断
    if (!endMsgTime) return;
    const time = endMsgTime;
    if (electronExtension.enable()) {
      await electronExtension.setMessageStatusToRead(conversation, time);
    }
    this.ctx.conversation.updateLastReadTime(conversation, time);

    const readMsgs: IRCKitCachedMessage[] = [];
    const key = trans2ConversationKey(conversation);
    let cached = this._histories.get(key);
    if(!cached) {
      // 没有消息缓存数据，需要更新会话lastermessage发送的状态
      const conversationCached = this.ctx.conversation.getCachedConversationByKey(trans2ConversationKey(conversation));
      if(!conversationCached || !conversationCached.latestMessage) return
      if(conversationCached.latestMessage.sentTime <= time && conversationCached.latestMessage.senderUserId === this.ctx.userId) {
        conversationCached.latestMessage.sentStatus = SentStatus.READ;
        readMsgs.push(conversationCached.latestMessage);
      }
    }

    this._handleCached(cached, readMsgs, time, conversation);

    if(readMsgs.length) {
      // 通知消息状态变更
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, readMsgs));
    }
  }

  private _handleCached(
    cached: IRCKitCachedMessageData | undefined,
    readMsgs: IRCKitCachedMessage[],
    time: number,
    conversation: any,
  ): IRCKitCachedMessage[] {
    if (!cached) return readMsgs;

    // 减少遍历次数，从最新消息开始设置已读状态，当前一条消息为已读即跳出循环
    for (let i = cached.histories.length - 1; i >= 0; i -= 1) {
      if (cached.histories[i].sentStatus === SentStatus.SENDING || cached.histories[i].sentStatus === SentStatus.FAILED){
        continue
      }
      // 只处理已经发送成功的消息
      if(cached.histories[i].sentTime <= time && cached.histories[i].senderUserId === this.ctx.userId) {
        cached.histories[i].sentStatus = SentStatus.READ;
        readMsgs.push(cached.histories[i]);
      }
      if (cached.histories[i - 1] && cached.histories[i - 1].sentStatus === SentStatus.READ) break
    }
    return readMsgs;
  }


  private async _handleReadReceipt2Group(groupReadReceipt: IGroupReadReceiptData) {
    const { conversationType, targetId, channelId, messageUId } = groupReadReceipt;
    const conversation = { conversationType, targetId, channelId };
    const key = trans2ConversationKey(conversation);
    let cached = this._histories.get(key);
    if(!cached) {
      // 如果缓存消息不在，需要检查会话最后一条消息是否满足
      const conversationCached = this.ctx.conversation.getCachedConversationByKey(trans2ConversationKey(conversation));
      if(
        !conversationCached
        || !conversationCached.latestMessage
        || conversationCached.latestMessage.sentStatus === SentStatus.READ
        || conversationCached.latestMessage.senderUserId !== this.ctx.userId
        || conversationCached.latestMessage.messageUId === messageUId
      ) return

      conversationCached.latestMessage.sentStatus = SentStatus.READ;
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [conversationCached.latestMessage]));
    } else {
      const index = cached.histories.findIndex((item) => item.messageUId === messageUId);
      if(index < 0 || cached.histories[index].sentStatus === SentStatus.READ || cached.histories[index].senderUserId !== this.ctx.userId) return
      cached.histories[index].sentStatus = SentStatus.READ;
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cached.histories[index]]));
    }
  }

  /**
   * 判断时间点是否与指定消息列表数据有时间重合
   * @param cache
   * @param timestamp
   * @returns
   */
  private _ifTimeCoincides(cache: IRCKitCachedMessageData, timestamp: number): boolean {
    return cache.endTime >= timestamp && cache.startTime <= timestamp;
  }

  /**
   * 从 IMLib 请求历史消息，当返回数据与缓存数据有重合时，将会合并到缓存数据中
   * @param conversation
   * @param timestamp
   * @param forward
   */
  private async _requestHistoriesFromLib(conversation: IConversationOption, timestamp: number, forward: boolean): Promise<{ hasMore: boolean, list: IRCKitCachedMessage[], code: number }> {
    const res = await getHistoryMessages(conversation, { timestamp, count: MESSAGE_PAGE_SIZE, order: forward ? 0 : 1 });
    if (res.code !== ErrorCode.SUCCESS) {
      return { code: res.code, hasMore: true, list: [] };
    }

    const { list, hasMore } = res.data!;
    let tmpList = this._handleTransIAReceivedMessages(list, conversation);

    // 取缓存数据，此时必定存在缓存数据，所以从第二个参数开始并无实际意义
    const cached = this._getOrCreateCache(conversation, timestamp, timestamp !== 0, true);

    // 缓存的开始时间始终小于第一条未读时间(Electron场景会出现第一条未读大于本地缓存记录缓存的问题)
    if (!forward && timestamp !== 0 && cached.startTime > timestamp) {
      cached.startTime = timestamp - 1
    }

    if (
      // 检查请求时间是否与缓存数据时间重合
      this._ifTimeCoincides(cached, timestamp)
      // 消息队列数据与缓存时间重合
      || (list.length && (this._ifTimeCoincides(cached, list[0].sentTime) || this._ifTimeCoincides(cached, list[list.length - 1].sentTime)))
    ) {
      // 数据重合，合并数据
      if (forward) {
        // 服务给的数据为降序，需反转
        tmpList = tmpList.reverse();
        this._unshift2Cache(cached, ...tmpList);
        cached.hasMoreBeforeStartTime = hasMore;
      } else {
        this._push2Cache(cached, ...tmpList);
        cached.hasMoreAfterEndTime = hasMore;
      }
    }

    return { hasMore, list: tmpList, code: ErrorCode.SUCCESS };
  }

  private _handleTransIAReceivedMessages(messages: IAReceivedMessage[], conversation: IConversationOption): IRCKitCachedMessage[] {
    // 已读回执只判断 Web 平台且是单聊会话。群回执主动调用IMLib接口获取
    const readEnable = conversation.conversationType === ConversationType.PRIVATE && !electronExtension.enable();
    let lastReadTime = 0;
    if (readEnable) {
      // 获取本地缓存最新的已读时间戳，小于缓存时间戳的消息标记为已读
      lastReadTime = this.ctx.conversation.getLastReadTime(conversation);
    }

    return messages.map((item) => {
      if (readEnable && item.sentTime <= lastReadTime && item.senderUserId === this.ctx.userId) {
        item.sentStatus = SentStatus.READ
      }
      if (item.readReceiptInfo && item.senderUserId === this.ctx.userId) {
        item.sentStatus = SentStatus.READ
      }

      return transIAReceivedMessage(item);
    });
  }

  private async _reqHistoriesHandler(conversation: IConversationOption, timestamp: number = 0, forward: boolean = true): Promise<{ hasMore: boolean, list: IRCKitCachedMessage[], code: number }> {
    // 获取缓存数据
    const cached = this._getOrCreateCache(conversation, timestamp, timestamp !== 0, true);
    const { histories, hasMoreAfterEndTime, hasMoreBeforeStartTime, startTime, endTime } = cached;
    if (!hasMoreAfterEndTime && timestamp === 0 && forward) {
      // 解决 endTime 小于缓存中最后一条消息的 sentTime 时，切会话无法获取最新历史消息
      const messageTime = histories[histories.length - 1]?.sentTime || 0
      if (messageTime > endTime) {
        cached.endTime = messageTime + 1
      }
      timestamp = cached.endTime;
    }

    if (!this._ifTimeCoincides(cached, timestamp)) {
      // 请求时间点与缓存数据时间不重合，请求远程数据)
      return this._requestHistoriesFromLib(conversation, timestamp, forward);
    }

    // 从缓存中获取所有符合时间要求的消息列表
    let list: IRCKitCachedMessage[];
    if (forward) {
      const index = findLastIndex(histories, (item) => item.sentTime < timestamp);
      list = histories.slice(0, index + 1);
    } else {
      const index = histories.findIndex((item) => item.sentTime > timestamp);
      list = histories.slice(index);
    }

    const hasMore = forward ? hasMoreBeforeStartTime : hasMoreAfterEndTime;

    if (list.length < MESSAGE_PAGE_SIZE) {
      return await this._reqHasMoreHistories(hasMore, startTime, endTime, forward, conversation, timestamp, list);
    }

    let msgList = forward ? list.slice(list.length - MESSAGE_PAGE_SIZE) : list.slice(0, MESSAGE_PAGE_SIZE);

    // Web 平台群组需要批量请求消息的已读信息，改变缓存消息的 sentStatus
    if (!electronExtension.enable() && conversation.conversationType === ConversationType.GROUP) {
      const { msgList: newMsgList, histories: newHistories } = await this._setCacheSentStatus(conversation, msgList, histories);
      msgList = newMsgList;
      cached.histories = newHistories;
    }

    // 缓存数据充足，直接指定条目
    return {
      // 远端 hasMore 或缓存数据有更多数据，均返回 true
      hasMore: hasMore || list.length > MESSAGE_PAGE_SIZE,
      list: msgList,
      code: ErrorCode.SUCCESS
    };
  }

  async _reqHasMoreHistories(hasMore: boolean, startTime: number, endTime: number, forward: boolean, conversation: IConversationOption, timestamp: number = 0, list: IRCKitCachedMessage[] = []) {
    if (hasMore) {
      // 缓存数据不足，且存在更多历史消息可拉取，从 IMLib 同步数据
      const forwardTime = startTime === 0 ? 0 : startTime + 1;
      const backwardTime = endTime === 0 ? 0 : endTime - 1;
      const tmpTimestamp = forward ? forwardTime : backwardTime;
      const { code } = await this._requestHistoriesFromLib(conversation, tmpTimestamp, forward);
      if (code === ErrorCode.SUCCESS) {
        // 递归
        return this._reqHistoriesHandler(conversation, timestamp, forward);
      }
      // 当次请求失败，直接返回缓存数据
      return { hasMore, list, code };
    }
    // 无更多数据可拉取
    return { hasMore, list, code: ErrorCode.SUCCESS };
  }

  async _setCacheSentStatus(conversation: IConversationOption, msgList: IRCKitCachedMessage[], histories: IRCKitCachedMessage[]) {
    const unreadMsgList: string[] = [];
    msgList.forEach((item) => {
      if(item.sentStatus === SentStatus.SENT && item.senderUserId === this.ctx.userId) {
        return unreadMsgList.push(item.messageUId)
      }
    })
    if (unreadMsgList.length > 0) {
      const { data } = await batchGetMessageReadReceiptInfoV4(conversation, unreadMsgList);
      // 返回的消息列表 readedCount 不为 0 即为已读。TODO: 会话列表会重新处理，需要更新会话lasterMessage的状态
      if (data && data.length > 0) {
        data.filter((item) => item.readedCount).forEach((msg) => {
          const index = histories.findIndex((cacheItem) => cacheItem.messageUId === msg.messageUId);
          const index1 = msgList.findIndex((cacheItem) => cacheItem.messageUId === msg.messageUId);
          if (index > -1) { histories[index].sentStatus = SentStatus.READ; }
          if (index1 > -1) { msgList[index1].sentStatus = SentStatus.READ; }

        })
      }
    }
    return { msgList, histories };
  }

  /**
   * 获取指定会话历史消息，默认一次获取 30 条
   * @param conversation - 会话
   * @param timestamp - 时间戳，默认从最新当前时间开始获取，返回数据不包含该时间点的消息
   * @param forward - 是否取时间点以前的消息，默认为 true
   */
  reqHistories(conversation: IConversationOption, timestamp: number = 0, forward: boolean = true): Promise<{ hasMore: boolean, list: IRCKitCachedMessage[], code: number }> {
    // this.logger.info(LogTag.D, `reqHistories -> timestamp: ${timestamp}, forward: ${forward}`)
    return this._reqHistoriesHandler(conversation, timestamp, forward);
  }

  /**
   * 发送消息，该接口仅限于发送单、群聊消息，向其他类型会话发送消息会返回 -3 参数错误
   * @param conversation - 会话
   * @param message - 消息
   * @param options - 发送选项
   */
  async sendMessage(conversation: IConversationOption, message: BaseMessage<any>, options?: ISendMessageOptions): Promise<{ code: number, message?: IAReceivedMessage }> {
    if (isInvalidConversation(conversation) || !isPrivOrGroupConversation(conversation)) {
      return { code: InnerErrorCode.INVALID_CONVERSATION };
    }

    const transactionId = this._createTransactionId();
    const msg = this._transBaseMessage2CachedMessage(conversation, message, transactionId, options);

    if (isObject(msg.content)) {
      // 消息 content 进行拷贝，防止 Proxy 数据导致 Electron 发送消息报错导致消息状态一直是发送中
      try {
        msg.content = cloneByJSON(msg.content)
      } catch (error: any) {
        this.logger.warn(LogTag.A_SEND_MESSAGE_E, error.message);
      }
    }
    // 不存储的消息不需要缓存和通知 UI 变更
    if (msg.isPersited) {
      const cached = this._getOrCreateCache(conversation, msg.sentTime + 1, false, true);
      if (cached.hasMoreAfterEndTime) {
        // 说明存在以中间时间点拉取消息的记录，消息记录与现实数据不连续
        // 因发送有本地状态需要存储，所以以本地发送数据为准，清理缓存数据以避免缓存断档
        cached.histories.length = 0;
        cached.startTime = msg.sentTime;
        cached.hasMoreBeforeStartTime = true;
        cached.hasMoreAfterEndTime = false;
      }
      this._push2Cache(cached, msg);

      //  通知 UI 层更新消息列表
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.INSERT_NEW_MESSAGES, [msg]));
    }

    // 推送到消息发送队列
    const { code, data } = await this._sendQueue.push({ conversation, message: msg, options, transactionId: msg.transactionId });
    if (code !== ErrorCode.SUCCESS) {
      msg.sentStatus = SentStatus.FAILED;
    } else {
      this._updateCachedMessage(msg, data!);
    }

    if (msg.isPersited) {
      //  通知 UI 层更新消息列表
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [msg]));
    }
    return { code, message: data };
  }

  private _updateCachedMessage(msg: IRCKitCachedMessage, source: IAReceivedMessage): void {
    const { sentStatus, sentTime, messageUId, messageId } = source;
    msg.sentStatus = sentStatus;
    msg.sentTime = sentTime;
    msg.messageUId = messageUId;
    msg.messageId = messageId;
  }

  /**
   * 批量发送媒体类、文件类消息
   * @param conversation
   * @param files
   * @param msgCreator
   */
  private async _sendMultiMediaMessage(msgCreator: (file: File) => Promise<BaseMessage<any>>, conversation: IConversationOption, files: File[]): Promise<void> {
    if (files.length > 99) {
      this.ctx.alert('alert.pickfiles.maxcount', '99');
      return;
    }

    // 拣选非法文件
    const invalid: File[] = [];
    const valid: File[] = [];
    for (let file of files) {
      // 超出 100MB 或为 0 大小的文件均视为非法
      if (file.size > 100 * 1024 * 1024 || file.size === 0) {
        invalid.push(file);
      } else {
        valid.push(file);
      }
    }

    if (invalid.length > 0) {
      // 对业务层抛出事件，以提示用户部分文件超过大小非法
      this.ctx.emit(new RCKitEvent(RCKitEvents.FILE_SEND_FAILED_EVENT, invalid))
    }

    if (valid.length === 0) {
      return;
    }

    // 用于缓存的消息
    const msgs: IRCKitCachedMessage[] = await Promise.all(valid.map(async (file) => {
      const basemsg = await msgCreator(file);
      const msg = this._transBaseMessage2CachedMessage(conversation, basemsg, this._createTransactionId());
      msg.file = file;
      msg.progress = 0;
      return msg;
    }));

    // 插入缓存
    const msg = msgs[0];
    const cached = this._getOrCreateCache(conversation, msg.sentTime + 1, false, true);
    if (cached.hasMoreAfterEndTime) {
      // 清空缓存
      cached.histories.length = 0;
      cached.startTime = msg.sentTime + 1;
      cached.hasMoreBeforeStartTime = true;
      cached.hasMoreAfterEndTime = false;
    }
    this._push2Cache(cached, ...msgs);

    // 通知 UI 层更新消息列表
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.INSERT_NEW_MESSAGES, msgs));

    // 按顺序推入上传队列
    const promises = msgs.map((msg) => this._uploadQueue.push({ message: msg, transactionId: msg.transactionId! }));
    for (let promise of promises) {
      // 顺序等待上传完成，以保证消息发送顺序
      const { code, data } = await promise;

      const { message } = data!;

      // 验证 message 是否还处于列表，若不在列表中，说明已被删除，不再处理
      const index = cached.histories.findIndex((item) => item.transactionId === message.transactionId);
      if (index === -1) {
        continue;
      }

      if (code !== ErrorCode.SUCCESS) {
        // 更新消息状态
        message.progress = -1;
        message.sentStatus = SentStatus.FAILED;
        // 派发消息状态变更事件
        this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [message]));
        continue;
      }

      const httpUrl = data!.httpUrl!;

      // 清空 file 引用
      message.file = undefined;
      this._updateHttpUrl(message, httpUrl);

      // 顺序推入发送队列
      this._push2SendQueue(message, message);
    }
  }

  private _updateHttpUrl(message: IRCKitCachedMessage, httpUrl: string): void {
    switch (message.messageType) {
      case MessageType.IMAGE:
        message.content.imageUri = httpUrl;
        break;
      case MessageType.GIF:
        message.content.remoteUrl = httpUrl;
        break;
      case MessageType.SIGHT:
        message.content.sightUrl = httpUrl;
        break;
      case MessageType.COMBINE_V2:
        message.content.remoteUrl = httpUrl;
        break
      default:
        message.content.fileUrl = httpUrl;
        break;
    }
  }

  /**
   * 批量发送文件消息，若文件为可解析的视频编码且时长不大于 1min，会被发送为视频消息，否则都按文件消息发送
   * @param conversation - 会话
   * @param files - 待发送文件列表
   * @description - 内部使用接口，不校验参数合法性
   */
  public sendFiles = this._sendMultiMediaMessage.bind(this, parseFileToMessage);

  /**
   * 批量发送图片消息
   * @param conversation - 会话
   * @param files - 待发送图片列表
   * @description - 内部使用接口，不校验参数合法性
   */
  public sendImages = this._sendMultiMediaMessage.bind(this, parseFileToMessage);

  /**
   * 向本地插入一条消息，不发送到服务器
   * @param conversation - 会话
   * @param message - 消息
   * @param options
   * @description - 不允许用户直接插入从服务器接收到的消息，否则可能会导致消息缓存列表断档
   */
  async insertMessage(conversation: IConversationOption, message: BaseMessage<any>, options?: IInsertOptions): Promise<{ code: number, message?: IAReceivedMessage }> {
    if (isInvalidConversation(conversation) || !isPrivOrGroupConversation(conversation)) {
      // 非单群聊消息禁止插入
      return { code: InnerErrorCode.INVALID_CONVERSATION };
    }

    // 用户可能从任意时间点插入消息，因此插入不能影响缓存数据的 endTime 和 startTime 时间，以免造成缓存数据不连续
    const transactionId = this._createTransactionId();
    const msg = this._transBaseMessage2CachedMessage(conversation, message, transactionId);

    if (msg.isPersited) {
      const cached = this._getOrCreateCache(conversation, msg.sentTime + 1, true, true);
      let index = findLastIndex(cached.histories, (item) => item.messageUId === msg.messageUId || item.messageId === msg.messageId);
      if (index !== -1) {
        cached.histories.splice(index, 1, msg);
      } else {
        index = findLastIndex(cached.histories, (item) => item.sentTime <= msg.sentTime);
        if (index === -1) {
          cached.histories.unshift(msg);
        } else {
          cached.histories.splice(index, 0, msg);
        }
      }

      //  通知 UI 层更新消息列表
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.INSERT_NEW_MESSAGES, [msg]));
    }

    if (electronExtension.enable()) {
      // 向协议栈数据库插入消息
      const { code, data } = await electronExtension.insertMessage(conversation, msg, options);
      if (code === ErrorCode.SUCCESS) {
        msg.messageId = data!.messageId;
      }
      return { code, message: msg };
    }
    return { code: ErrorCode.SUCCESS, message: msg };
  }

  private _transBaseMessage2CachedMessage(
    conversation: IConversationOption,
    message: BaseMessage<any>,
    transactionId: number,
    options?: ISendMessageOptions,
  ): IRCKitCachedMessage {
    const { conversationType, targetId, channelId } = conversation;
    const {
      isCounted, isPersited, content, messageType,
    } = message;
    const msg: IRCKitCachedMessage = {
      transactionId,
      targetId,
      conversationType,
      messageDirection: 1,
      messageType,
      sentTime: getServerTime(),
      isStatusMessage: options?.isStatusMessage,
      isCounted,
      isPersited,
      content,
      channelId: channelId || '',
      senderUserId: this.ctx.userId,
      receivedTime: 0,
      messageUId: '',
      sentStatus: SentStatus.SENDING,
      isOffLineMessage: false,
      canIncludeExpansion: options?.canIncludeExpansion || false,
      receivedStatus: 0,
      isMentioned: options?.isMentioned,
      expansion: options?.expansion,
    };
    return msg;
  }

  /**
   * 消息批量删除或撤回
   * @param conversation
   * @param messages
   * @param recall
   */
  async deleteMessages(conversation: IConversationOption, messages: IRCKitCachedMessage[], recall: boolean): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    // 筛选发送成功或失败的消息，发送中的消息不可撤回或删除，不予处理
    const sentList: IRCKitCachedMessage[] = [];
    const failedList: IRCKitCachedMessage[] = [];
    messages.forEach((message) => {
      if (message.messageUId) {
        sentList.push(message);
      } else if (message.sentStatus === SentStatus.FAILED) {
        failedList.push(message);
      }
    });

    const history = this._getExistCache(conversation);


    // 分别记录被撤回或删除的消息
    const recallList: IRCKitDeleteMessageData[] = [];

    // 已发送的消息，根据 recall 确定是否需要撤回，或仅调用删除接口
    if (sentList.length) {
      const { recallList: sendRecallList } = await this._handleSentList(recall, history, sentList, conversation);
      recallList.push(...sendRecallList);
    }

    // 对于本身状态为发送失败的消息，直接删除本地缓存和数据库
    if (failedList.length && history && history.histories.length) {
      failedList.forEach((message) => {
        // 失败的消息没有 messageUid，需根据 messageId 或 transactionId 匹配
        const index = history.histories.findIndex((item) => {
          if(item.messageUId) {
            return item.messageUId === message.messageUId
          }
          return item.transactionId === message.transactionId
        });
        if (index !== -1) {
          const [target] = history.histories.splice(index, 1);
          recallList.push({ target });
        }
      });
    }

    // 通知 UI 层消息被撤回
    if (recallList.length) {
      this.ctx.dispatchEvent(new RCKitEvent(RCKitEvents.MESSAGES_DELETED, recallList));
    }
  }

  private async _handleSentList(recall: boolean, history: IRCKitCachedMessageData | undefined, sentList: IRCKitCachedMessage[], conversation: IConversationOption) {
    const reqSuccess: IRCKitCachedMessage[] = [];
    const reqFailed: IRCKitCachedMessage[] = [];
    const recallList: IRCKitDeleteMessageData[] = [];

    if (recall) {
      const list = await Promise.all(sentList.map((message) => recallMessage(conversation, {
        messageUId: message.messageUId!,
        sentTime: message.sentTime,
        isDelete: false,
      })))
      list.forEach((res, index) => {
        if (res.code === ErrorCode.SUCCESS) {
          reqSuccess.push(sentList[index]);
          return;
        }

        reqFailed.push(sentList[index]);
      });
    } else {
      const res = await deleteMessages(conversation, sentList.map((message) => ({
        messageUId: message.messageUId!,
        sentTime: message.sentTime,
        messageDirection: message.messageDirection,
      })));
      if (res.code === ErrorCode.SUCCESS) {
        reqSuccess.push(...sentList);
        return { recallList };
      }
      reqFailed.push(...sentList);
    }

    // 处理撤回或删除成功的消息
    if (reqSuccess.length && history && history.histories.length) {
      reqSuccess.forEach((message) => {
        const index = history.histories.findIndex((item) => item.messageUId === message.messageUId);
        if (recall) {
          // 请求成功后，若为撤回操作，向本地缓存中插入一条 RC:Ntf 撤回消息
          const recallMsg = this._trans2RecallMessage(message);
          const [target] = history.histories.splice(index, 1, recallMsg);
          recallList.push({ target, recallMsg })
        } else {
          // 删除本地缓存
          const [target] = history.histories.splice(index, 1);
          recallList.push({ target });
        }
      })
    }

    // 删除失败的消息不予处理（产品逻辑：删除远端成功后才删本地）
    if (reqFailed.length) {
      // 提示部分消息删除失败
      this.ctx.alert('alert.delete.messages.partial.failure', reqFailed.length);
    }
    return { recallList };
  }

  private _trans2RecallMessage(message: IRCKitCachedMessage): IRCKitCachedMessage {
    const msg: IRCKitCachedMessage = {
      ...message,
      messageType: MessageType.RECALL_MESSAGE_TYPE,
      content: {
        messageUid: message.messageUId,
        sentTime: message.sentTime,
        targetId: message.targetId,
        conversationType: message.conversationType,
        channelId: message.channelId,
      },
      isMentioned: false,
    };
    return msg;
  }

  /**
   * 将消息逐条转发到指定会话
   * @param conversation
   * @param messages
   * @description - 仅用于 UI 层面调用，无需校验参数合法性
   */
  async forward(conversation: IConversationOption, messages: IRCKitCachedMessage[]) {
    if (messages.length === 0) {
      return;
    }

    const { conversationType, targetId, channelId } = conversation;
    const sentTime = getServerTime();

    // 修改消息内容与状态
    const msgs: IRCKitCachedMessage[] = messages.map((item) => {
      const msg: IRCKitCachedMessage = { ...item };
      if(item.content.mentionedInfo) {
        // 转发消息去掉 mentionedInfo 信息，防止接收端会话识别为@信息
        delete item.content.mentionedInfo
      }
      msg.content = item.content;
      msg.messageUId = '';
      msg.transactionId = this._createTransactionId();
      msg.conversationType = conversationType;
      msg.targetId = targetId;
      msg.channelId = channelId || '';
      msg.sentStatus = SentStatus.SENDING;
      msg.messageDirection = 1;
      msg.sentTime = sentTime;
      msg.senderUserId = this.ctx.userId;
      return msg;
    });

    const cache = this._getOrCreateCache(conversation, sentTime + 1, false, true);
    // 向后插入缓存队列
    this._push2Cache(cache, ...msgs);

    // 通知 UI 层更新消息列表
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.INSERT_NEW_MESSAGES, msgs));

    // 推送到消息发送队列
    msgs.forEach((msg) => this._push2SendQueue(conversation, msg));
  }

  /**
   * 发送合并转发消息
   * @param conversation
   * @param messages
   */
  public async sendCombineMessage(conversation: IConversationOption, messages: IRCKitCachedMessage[]): Promise<void> {
    if (messages.length === 0 || isInvalidConversation(conversation)) {
      return;
    }

    // 消息来源会话
    const { conversationType: fromConversationType, targetId: fromTargetId } = messages[0]

    const summaryList: string[] = [];
    const currentUserId = this.ctx.userId;
    const currentUsername = this.ctx.appData.getUserProfile(currentUserId)!.name;

    // 单聊合并转发，nameList 为己方与对方昵称，群聊为群组名称
    const nameList: string[] = [];

    if(fromConversationType === ConversationType.PRIVATE) {
      // 单聊场景 nameList 需要根据消息不同的 senderUserId 添加
      const selfIndex = messages.findIndex(item => item.senderUserId === currentUserId);
      const otherIndex = messages.findIndex(item => item.senderUserId !== currentUserId);
      if (selfIndex > -1) {
        nameList.push(currentUsername);
      }
      if (otherIndex > -1) {
        nameList.push(this.ctx.appData.getUserProfile(fromTargetId)!.name);
      }
    } else {
      nameList.push(this.ctx.appData.getGroupProfile(fromTargetId)!.name)
    }

    const msgList: ICombinedMessage[] = messages.map((message, index) => {
      const content = message.content;
      // TODO: 确认是否需要删除消息中的额外信息
      delete content.user;
      delete content.extra;
      delete content.mentionedInfo;

      const { targetId, sentTime, messageType, senderUserId } = message;

      // summary 信息记录
      if (index < 4) {
        summaryList.push(`${this.ctx.appData.getUserProfile(senderUserId)!.name}: ${getMessageDesc(message)}`.substring(0, 1000));
      }

      return {
        targetId, timestamp: sentTime, objectName: messageType, content, fromUserId: senderUserId,
      };
    });

    const combineMsgContent: CombineV2MessageContent = {
      summaryList,
      nameList,
      conversationType: fromConversationType,
      msgNum: msgList.length,
    };

    const jsonStr = JSON.stringify(msgList);
    if (jsonStr.length >= 120 * 1024) {
      // 发文件
      const jsonMsgKey = `${Date.now()}-${Math.floor(Math.random() * Date.now())}.json`
      combineMsgContent.jsonMsgKey = jsonMsgKey;
      const file = new File([jsonStr], jsonMsgKey, { type: 'application/json' });
      this._sendMultiMediaMessage(async (file) => new CombineV2Message(combineMsgContent), conversation, [file])
    } else {
      combineMsgContent.msgList = msgList;
      this.sendMessage(conversation, new CombineV2Message(combineMsgContent));
    }
  }

  private async _push2SendQueue(conversation: IConversationOption, message: IRCKitCachedMessage) {
    const { code, data } = await this._sendQueue.push({ conversation, message, transactionId: message.transactionId! });

    if (code !== ErrorCode.SUCCESS) {
      message.sentStatus = SentStatus.FAILED;
    } else {
      this._updateCachedMessage(message, data!);
    }

    // 通知 UI 层更新消息列表
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [message]));
  }

  removeCachedMessages(conversation: IConversationOption): void {
    this._histories.delete(trans2ConversationKey(conversation));
  }

  /**
   * 取消消息上传与发送，同时删除本地消息缓存
   * @param message
   */
  cancelMessageSent(message: IRCKitCachedMessage): void {
    const { transactionId, conversationType, targetId, channelId } = message;
    const conversation = { conversationType, targetId, channelId };
    const cached = this._getExistCache(conversation);
    if (!cached) {
      return;
    }

    const index = cached.histories.findIndex((item) => item.transactionId === transactionId);
    const cachedMessage = cached.histories[index];
    if (
      !cachedMessage // 缓存消息不存在
      || cachedMessage.sentStatus !== SentStatus.SENDING // 消息已发送成功或发送失败，不做处理
      || typeof cachedMessage.transactionId !== 'number' // 无 transactionId，不做处理
    ) {
      return;
    }

    // 删除本地缓存
    cached.histories.splice(index, 1);
    // 通知 UI 删除消息
    this.ctx.dispatchEvent(new RCKitEvent(RCKitEvents.MESSAGES_DELETED, [{ target: message }]));

    // 从上传队列或发送队列中取消任务，由于任务不可能同时存在于两个队列中，因此进行 || 运算即可
    this._uploadQueue.remove(transactionId!) || this._sendQueue.remove(transactionId!);
  }

  /**
   * 重发发送失败的消息
   * @param message
   */
  async resendMessage(message: IRCKitCachedMessage): Promise<void> {
    const { transactionId, conversationType, targetId, channelId } = message;
    const conversation = { conversationType, targetId, channelId };
    const cached = this._getExistCache(conversation);
    if (!cached) {
      return;
    }

    const cachedMessage = cached.histories.find((item) => item.transactionId === transactionId);
    if (
      !cachedMessage // 缓存消息不存在
      || cachedMessage.sentStatus !== SentStatus.FAILED // 消息已发送成功或发送失败，不做处理
      || typeof transactionId !== 'number' // 无 transactionId，不做处理
    ) {
      return;
    }

    // 更新消息状态
    cachedMessage.sentStatus = SentStatus.SENDING;

    if (cachedMessage.file && cachedMessage.progress !== 100) {
      cachedMessage.progress = 0;
      // 派发时间更新 UI 状态
      this.ctx.emit(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cachedMessage]));

      // 重新上传文件
      const { code, data } = await this._uploadQueue.push({ message: cachedMessage, transactionId });
      if (code !== ErrorCode.SUCCESS) {
        cachedMessage.sentStatus = SentStatus.FAILED;
        cachedMessage.progress = -1;
        // 派发时间更新 UI 状态
        this.ctx.emit(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cachedMessage]));
        return;
      }

      cachedMessage.file = undefined;
      this._updateHttpUrl(cachedMessage, data!.httpUrl!);
    }

    // 推入发送队列
    this._push2SendQueue(cachedMessage, cachedMessage);
  }

  /**
   * 发送回执
   * @param conversation
   * @param list
   * @param isStart 是否要传 startMsgId（web平台在线收消息适用）
   * @returns
   */
  async sendReadReceiptMessage(conversation: IConversationOption, list: IRCKitCachedMessage[], isStart?: boolean): Promise<void> {
    if (electronExtension.enable()) {
      this._sendReadReceiptMessage2Electron(conversation, list);
      return
    }
    this._sendReadReceiptMessage2Web(conversation, list, isStart);
  }

  private async _sendReadReceiptMessage2Web(conversation: IConversationOption, list: IRCKitCachedMessage[], isStart?: boolean): Promise<void> {
    const { conversationType, targetId, channelId = '' } = conversation
    if (!list.length || !this.ctx.conversationStore) return
    const sendReadReceiptTime = this.ctx.conversationStore.get(conversationType, targetId, channelId).sendReadReceiptTime || 0;
    // 发送的回执时间小于本地记录的时间，不发回执
    if (sendReadReceiptTime > list[list.length -1].sentTime) return

    let startMsgId = '';
    // 在线收到消息可以带上 startMsgId，单聊场景传 startMsgId 服务端不会处理
    if (isStart) {
      startMsgId = list[0].messageUId
    }

    // web 直接传历史最后一条消息 Uid，不作是否是他人信息的判断，因为每次进入会话都可能发送回执，无法进行判断
    const endMsgId = list[list.length - 1].messageUId;

    this.logger.info(LogTag.L_SEND_READ_RECEIPT_MESSAGEV4_T, `sendReadReceiptMessageV4 -> endMsgId: ${endMsgId}, startMsgId: ${startMsgId}`);
    const { code }  = await sendReadReceiptMessageV4(conversation, endMsgId, startMsgId);
    this.logger.info(LogTag.L_SEND_READ_RECEIPT_MESSAGEV4_R, `sendReadReceiptMessageV4 -> code: ${code}`);
    if (code !== ErrorCode.SUCCESS) return

    // 发送回执后更新本地记录
    this.ctx.conversationStore.set(conversationType, targetId, {
      sendReadReceiptTime: list[list.length - 1].sentTime
    }, channelId);
  }

  private async _sendReadReceiptMessage2Electron(conversation: IConversationOption, list: IRCKitCachedMessage[], isStart?: boolean): Promise<void> {
    if (!list.length) return
    // 过滤消息，并根据 sentTime 排序，防止开始和结束消息id位置传错
    const recvList = list.filter((item) => {
      // Electron 群聊 receivedStatus 不为 1 表示已经发送过回执
      if (conversation.conversationType === ConversationType.GROUP && electronExtension.enable()){
        return item.senderUserId !== this.ctx.userId && item.receivedStatus !== 1
      }
      return item.senderUserId !== this.ctx.userId
    }).sort((a, b) => a.sentTime - b.sentTime);
    if (!recvList.length) return

    const startMsgId = recvList[0].messageUId;
    const endMsgId = recvList[recvList.length - 1].messageUId;
    this.logger.info(LogTag.L_SEND_READ_RECEIPT_MESSAGEV4_T, `sendReadReceiptMessageV4 -> endMsgId: ${endMsgId}, startMsgId: ${startMsgId}`);
    const { code }  = await sendReadReceiptMessageV4(conversation, endMsgId, startMsgId);
    this.logger.info(LogTag.L_SEND_READ_RECEIPT_MESSAGEV4_R, `sendReadReceiptMessageV4 -> code: ${code}`);
    if (code !== ErrorCode.SUCCESS) return

    // 消息二次处理，修改缓存中的 receivedStatus 值
    const cached = this._getExistCache(conversation);
    if (!cached) {
      return;
    }
    recvList.forEach((msg) => {
      const index = cached.histories.findIndex((item) => item.messageUId === msg.messageUId);
      msg.receivedStatus = 1;
      if (index > -1) {
        cached.histories.splice(index, 1, msg)
      }
    })
  }

  /**
   * 获取会话最后一条消息
   * @param conversation
   */
  getConversationLatestMessage(conversation: IConversationOption): IRCKitCachedMessage | null {
    const cached = this._getExistCache(conversation);
    if (!cached) {
      return null;
    }
    const length = cached.histories.length;
    return cached.histories[length - 1];
  }

  async getMessageReadReceiptV4(message: IRCKitCachedMessage): Promise<{ code: ErrorCode, data?: IMessageReadReceiptV4Response }> {
    const { conversationType, targetId, channelId, messageUId, transactionId } = message;
    const { code, data } = await getMessageReadReceiptV4({
      conversationType, targetId, channelId,
    }, messageUId);
    if(message.sentStatus === SentStatus.SENT && data && data.list.length > 0) {
      const key = trans2ConversationKey({ conversationType, targetId, channelId });
      let cached = this._histories.get(key);
      if (!cached) return { code, data }

      const index = cached.histories.findIndex((item) => item.messageUId === messageUId || transactionId === item.transactionId);
      if (index < 0) return { code, data }

      cached.histories[index].sentStatus = SentStatus.READ;
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.MESSAGE_STATE_CHANGE, [cached.histories[index]]));
    }

    return { code, data }
  }

}
