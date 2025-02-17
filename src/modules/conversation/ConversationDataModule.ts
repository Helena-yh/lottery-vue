import {
  getConversationList,
  ConversationType, ErrorCode, Events,
  removeConversation, IConversationEvent,
  NotificationLevel, SentStatus,
  IAReceivedConversation, clearMessagesUnreadStatus,
  IConversationOption,
  setConversationToTop,
  setConversationNotificationLevel,
  MentionedType,
  getServerTime,
  electronExtension,
  clearUnreadCountByTimestamp,
  getUnreadCount,
  clearHistoryMessages,
  addEventListener, removeEventListener,
  IConversationState,
  getConversation, saveTextMessageDraft,
  clearTextMessageDraft, getTextMessageDraft,
  sendSyncReadStatusMessage, sendTypingStatusMessage, MessageType,
  getFirstUnreadMessage, batchGetMessageReadReceiptInfoV4, IAReceivedMessage,
  ISyncReadStatusData,
  IUpdateItem
} from '@rongcloud/imlib-next';

import { RCKitModule } from '../RCKitModule';
import { RCKitCommand } from '../../enums/RCKitCommand';
import { RCKitEvent } from '../../core/RCKitEvent';
import { LogTag } from '../../enums/LogTag';
import { isInvalidConversation, isSameConversation, trans2ConversationKey, transIAReceivedMessage } from '../../helper';
import { IRCKitCachedMessage } from '../MessageDataModule';
import { InnerErrorCode } from '../../enums/RCKitCode';
import { MessagesDeletedEvent, GroupProfilesUpdateEvent, IRCKitDeleteMessageData, InnerEvent, InsertNewMessagesEvent, MessageStateChangeEvent, RCKitEvents, RecvNewMessagesEvent, SystemProfilesUpdateEvent, UserProfilesUpdateEvent } from '@lib/core/EventDefined';
import { RCKitMentionedType } from './RCKitMenthionedType';
import { IRCKitCachedConversation } from './IRCKitCachedConversation';

/**
 * 会话列表数据模块
 * @description
 * 会话列表拉取与更新逻辑：
 * 1. 初始化即拉取全量会话列表，期间接收到的消息（仅 Electron）、会话事件均缓存，待会话列表拉取完成后，再处理；
 * 2. 会话列表拉取完成后，先处理消息（仅 Electron 会监听消息），再处理会话事件；
 */
export class ConversationDataModule extends RCKitModule {
  /** 全量会话列表，列表排序顺序与 UI 显示顺序一致 */
  private _list: IRCKitCachedConversation[] = [];

  // 等待处理的消息队列
  private _messageQueue: IAReceivedMessage[] = [];

  /** 等待处理的会话通知队列 */
  private _converNtfQueue: IConversationState[] = [];

  /**
   * 会话缓存数据对象池，避免置顶列表与会话列表中存在相同会话的不同实例
   */
  private _pool: Map<string, IRCKitCachedConversation> = new Map();

  /** 远端会话列表拉取失败时的延迟重试计时器 */
  private _getRemoteConversationTimer: any = null;

  /** 离线消息拉取完成 */
  private _pullOfflineMessageFinished: boolean = false;

  /**
   * 已打开的会话
   */
  private _openedConversation: IRCKitCachedConversation | null = null;

  public getOpenedConversation(): IRCKitCachedConversation | null {
    return this._openedConversation;
  }

  /**
   * 创建会话缓存数据对象，若已存在则直接返回
   */
  private _createCachedConversation(conversation: IConversationOption): IRCKitCachedConversation {
    const key = trans2ConversationKey(conversation);
    if (this._pool.has(key)) {
      return this._pool.get(key)!;
    }

    const cached: IRCKitCachedConversation = {
      key,
      targetId: conversation.targetId,
      conversationType: conversation.conversationType,
      channelId: conversation.channelId || '',
      name: '',
      portraitUri: '',
      draft: '',
      latestMessage: null,
      isTop: false,
      notificationLevel: NotificationLevel.ALL_MESSAGE, // 默认所有会话接收通知
      unreadCount: 0,
      updateTime: 0,
      online: false,
      memberCount: 0,
      mentionedType: 0,
      markReaded: false,
      markUnread: false,
    };
    this._pool.set(key, cached);
    return cached;
  }

  protected _onInit(): void {
    this.ctx.addEventListener(InnerEvent.USER_PROFILES_UPDATE, this._onUserProfilesUpdate, this);
    this.ctx.addEventListener(InnerEvent.GROUP_PROFILES_UPDATE, this._onGroupProfilesUpdate, this);
    this.ctx.addEventListener(InnerEvent.SYSTEM_PROFILES_UPDATE, this._onSystemProfilesUpdate, this);

    this.ctx.addEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages, this);
    this.ctx.addEventListener(RCKitEvents.MESSAGES_DELETED, this._onDeleteMessages, this);
    this.ctx.addEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange, this);

    addEventListener(Events.SYNC_READ_STATUS, this._onSyncReadStatus, this);
    // 监听会话变更事件
    addEventListener(Events.CONVERSATION, this._onRecvConversationNtf, this);
    // 监听离线消息拉取完成通知
    addEventListener(Events.PULL_OFFLINE_MESSAGE_FINISHED, this._onPullOfflineMessageFinished, this);

    if (electronExtension.enable()) {
      this.ctx.addEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages, this);
    }
  }

  protected _onInitUserCache(): void {
    // 请求会话列表数据
    this._getMoreRemoteConversation(true);
  }

  protected _onDestroyUserCache(): void {
    // 登录用户发生变更，需要清空原用户内存数据
    this._list.length = 0;
    this._pool.clear();
    this._openedConversation = null;
    this._getRemoteConversationFinished = false;
    this._pullOfflineMessageFinished = false;

    if (this._getRemoteConversationTimer) {
      clearTimeout(this._getRemoteConversationTimer);
      this._getRemoteConversationTimer = null;
    }
    if (this._handleQueueTimer) {
      clearTimeout(this._handleQueueTimer);
      this._handleQueueTimer = null;
    }

    this._clearTypingStatus();
  }

  public destroy(): void {
    this._onDestroyUserCache();
    this.ctx.removeEventListener(InnerEvent.USER_PROFILES_UPDATE, this._onUserProfilesUpdate, this);
    this.ctx.removeEventListener(InnerEvent.GROUP_PROFILES_UPDATE, this._onGroupProfilesUpdate, this);
    this.ctx.removeEventListener(InnerEvent.SYSTEM_PROFILES_UPDATE, this._onSystemProfilesUpdate, this);

    this.ctx.removeEventListener(InnerEvent.INSERT_NEW_MESSAGES, this._onInsertNewMessages, this);
    this.ctx.removeEventListener(RCKitEvents.MESSAGES_DELETED, this._onDeleteMessages, this);
    this.ctx.removeEventListener(InnerEvent.MESSAGE_STATE_CHANGE, this._onMessageStateChange, this);

    removeEventListener(Events.SYNC_READ_STATUS, this._onSyncReadStatus, this);

    removeEventListener(Events.PULL_OFFLINE_MESSAGE_FINISHED, this._onPullOfflineMessageFinished, this);
    removeEventListener(Events.CONVERSATION, this._onRecvConversationNtf, this);

    this.ctx.removeEventListener(InnerEvent.RECV_NEW_MESSAGES, this._onRecvNewMessages, this);
  }

  private async _onDeleteMessages(evt: MessagesDeletedEvent) {
    const list: IRCKitDeleteMessageData[] = evt.data;

    // 所有被同一批次删除或撤销的消息，必定属于为同一会话，且为时间正序排列，取最后一条消息即可
    const { target, recallMsg } = list[list.length - 1]!;
    const cached = this._pool.get(trans2ConversationKey(target));
    if (!cached) {
      return;
    }

    // Electron 撤回消息不会作为消息通知给 UI，所以在 DeleteMessage 更新会话状态
    if (electronExtension.enable() && recallMsg) {
      const { conversationType, targetId, channelId } = recallMsg
      const { data } = await getConversation({ conversationType, targetId, channelId });
      if (!data) return
      // TODO: electron 没有 mentionedInfo 信息
      if (data.conversationType === ConversationType.GROUP && data.hasMentioned) {
        cached.mentionedType = RCKitMentionedType.AT_ME;
      } else {
        cached.mentionedType = RCKitMentionedType.NONE;
      }
      this._paddingData(cached, data!);
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [cached]));
      return
    }

    const latestMessage = cached.latestMessage;
    if (!latestMessage
      || (latestMessage.transactionId !== target.transactionId && latestMessage.messageUId !== target.messageUId)
    ) {
      return;
    }

    // 更新会话最后一条消息, TODO: 可以考虑缓存的最后一条消息赋值给 latestMessage，防止出现为 null 的情况
    cached.latestMessage = recallMsg ? recallMsg : this.ctx.message.getConversationLatestMessage(cached);
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [cached]));
  }

  /**
   * 处理本地插入消息时间，时间会导致会话列表顺序变更；
   * 若会话不存在，需要新建会话；
   * 若会话存在，需要更新会话列表顺序及最后一条消息;
   * 插入会话，一般所有消息均属于同一会话，可做优化处理
   * @param evt
   */
  private async _onInsertNewMessages(evt: InsertNewMessagesEvent) {
    // 更新会话列表
    const messages = evt.data;
    // 不能使用 pop，因为 UI 等模块也会监听同一事件进行 UI 处理
    const message = messages[messages.length - 1];
    const key = trans2ConversationKey(message);
    let conversation = this._pool.get(key);

    if (!conversation) {
      // 一般不会存在插入会话时，回话不存在的情况，除非业务层调插入接口时传入了不存在的会话参数
      const res = this._parseConversationList([{
        latestMessage: message,
        conversationType: message.conversationType,
        targetId: message.targetId,
        channelId: message.channelId,
      }]);
      conversation = res[0]!;
    }
    conversation.latestMessage = message;
    conversation.updateTime = message.sentTime;
    conversation.markReaded = true;
    conversation.markUnread = false;

    this._recalculatePosition(new Set([conversation]));
  }

  /**
   * 发送状态变更事件，一般为发送状态变更，或文件上传进度变更等。状态变更不影响列表排序
   * @param evt
   */
  private _onMessageStateChange(evt: MessageStateChangeEvent): void {
    const messages = evt.data;
    const changed: IRCKitCachedConversation[] = [];
    messages.forEach((item) => {
      const key = trans2ConversationKey(item);
      const conversation = this._pool.get(key);
      if (!conversation) {
        // 本地缓存中不存在的会话，该情况可能是由于消息发送完成之前用户删除了会话，此时不做处理
        return;
      }

      // 查看是否为回话的最后一条消息，否则不做处理
      if (conversation.latestMessage && (conversation.latestMessage.transactionId === item.transactionId || conversation.latestMessage.messageUId == item.messageUId)) {
        conversation.latestMessage = item;
        changed.push(conversation);
      }
    });

    if (changed.length) {
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, changed));
    }
  }

  /**
   * 移动会话到最顶部位置，并返回其当前所处的新索引位置。返回值会因排序规则、会话置顶属性不同而有变化
   * @param item
   */
  protected _moveConversationToTop(item: IRCKitCachedConversation): number {
    let index = this._list.indexOf(item);
    if (index > -1) {
      // 从原位置删除元素
      this._list.splice(index, 1);
    }

    index = this._list.findIndex((item) => !item.isTop);
    if (index === -1) {
      index = this._list.length;
    }
    this._list.splice(index, 0, item);
    return index;
  }

  /**
   * 根据会话时间戳移动位置
   * @param item
   */
  private _moveConversationBytime(item: IRCKitCachedConversation): number {
    let index = this._list.indexOf(item);
    if (index > -1) {
      // 从原位置删除元素
      this._list.splice(index, 1);
    }

    if (item.isTop) {
      index = this._list.findIndex((conv) => conv.isTop && item.updateTime > conv.updateTime);
      if (index === -1) {
        index = this._list.filter((conv) => conv.isTop).length;
      }
    } else {
      index = this._list.findIndex((conv) => !conv.isTop && item.updateTime > conv.updateTime);
      if (index === -1) {
        index = this._list.length;
      }
    }

    this._list.splice(index, 0, item);
    return index;
  }

  protected _getMentionedType(userId: string, mentionedInfo?: { userIdList: string[], type: MentionedType }) {
    if (!mentionedInfo) {
      return RCKitMentionedType.NONE;
    }
    const { type, userIdList } = mentionedInfo;
    if (type === MentionedType.ALL) {
      return RCKitMentionedType.AT_ALL;
    }

    if (!userIdList || !Array.isArray(userIdList)) {
      return RCKitMentionedType.NONE;
    }

    return userIdList.includes(userId) ? RCKitMentionedType.AT_ME : RCKitMentionedType.NONE;
  }

  private _onUserProfilesUpdate(e: UserProfilesUpdateEvent): void {
    const changed: IRCKitCachedConversation[] = [];
    e.data.forEach((item) => {
      const conversation = this._pool.get(trans2ConversationKey({
        conversationType: ConversationType.PRIVATE,
        targetId: item.userId,
      }));
      if (!conversation) {
        return;
      };
      if (conversation.name !== item.name || conversation.portraitUri !== item.portraitUri || conversation.online !== item.online) {
        conversation.name = item.name;
        conversation.portraitUri = item.portraitUri;
        conversation.online = item.online;
        changed.push(conversation);
      }
    })

    if (changed.length) {
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, changed));
    }
  }

  private _onSystemProfilesUpdate(evt: SystemProfilesUpdateEvent): void {
    const changed: IRCKitCachedConversation[] = [];
    evt.data.forEach((item) => {
      const conversation = this._pool.get(trans2ConversationKey({
        conversationType: ConversationType.SYSTEM,
        targetId: item.systemId,
      }));
      if (!conversation) {
        return;
      };
      if (conversation.name !== item.name || conversation.portraitUri !== item.portraitUri) {
        conversation.name = item.name;
        conversation.portraitUri = item.portraitUri;
        changed.push(conversation);
      }
    })

    if (changed.length) {
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, changed));
    }
  }

  private _onGroupProfilesUpdate(e: GroupProfilesUpdateEvent): void {
    const profiles = e.data;
    const changed: IRCKitCachedConversation[] = [];
    profiles.forEach((item) => {
      const opt: IConversationOption = {
        conversationType: ConversationType.GROUP,
        targetId: item.groupId,
      };

      const conversation = this._pool.get(trans2ConversationKey(opt));
      if (!conversation) {
        return;
      }

      // 会话数据仅关心群名称、头像、群成员数量
      if (conversation.name !== item.name || conversation.portraitUri !== item.portraitUri || conversation.memberCount !== item.memberCount) {
        conversation.name = item.name;
        conversation.portraitUri = item.portraitUri;
        conversation.memberCount = item.memberCount;
        changed.push(conversation);
      }
    });

    if (changed.length) {
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, changed));
    }
  }

  /**
   * 更新群组会话latestMessage的发送状态
   */
  updateLatesMessageStatus(list: IRCKitCachedConversation[]): void {
    if (!list || list.length <= 0) return
    const newList = list.filter((item) => item.conversationType === ConversationType.GROUP && item.latestMessage && item.latestMessage.senderUserId === this.ctx.userId && item.latestMessage.sentStatus === SentStatus.SENT);
    newList.forEach(async (item) => {
      const conversation = { conversationType: item.conversationType, targetId: item.targetId, channelId: item.channelId }
      const { data } = await batchGetMessageReadReceiptInfoV4(conversation, [item.latestMessage!.messageUId]);
      if (!data || data.length <= 0) return
      if (data[0].readedCount && data[0].readedCount > 0) {
        item.latestMessage!.sentStatus = SentStatus.READ;
        this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [item]));
      }
    });
  }

  /**
   * 处理多端未读数同步
   */
  private async _onSyncReadStatus(e: ISyncReadStatusData): Promise<void> {
    const conversation = {
      conversationType: e.conversationType,
      channelId: e.channelId || '',
      targetId: e.targetId,
    }
    const key = trans2ConversationKey(conversation);
    let cached = this._pool.get(key);
    if (!cached) return

    const { code, data } = await getUnreadCount(conversation);
    if (code !== ErrorCode.SUCCESS) return

    if (cached.unreadCount !== data!) {
      cached.mentionedType = RCKitMentionedType.NONE;
      if (electronExtension.enable()) {
        const { data: data1 } = await getConversation(conversation);
        cached.mentionedType = data1 && data1.hasMentioned ? RCKitMentionedType.AT_ME : RCKitMentionedType.NONE;
      }
      cached.unreadCount = data!;
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [cached]));
    }
  }

  private _onRecvConversationNtf(e: IConversationEvent): void {
    this._converNtfQueue.push(...e.conversationList);
  }

  /**
   * 处理会话通知，并将处理后的缓存会话返回
   * @returns - 返回的 changeType 变更类型，0：无变更，1：状态变更，位置不变，2：会话位置变更
   */
  private _handleConversationNtf(item: IConversationState): { changeType: number, conversation?: IRCKitCachedConversation } {
    const { conversation, updatedItems } = item;
    const key = trans2ConversationKey(conversation);
    let changeType = 0;

    // 获取缓存会话
    let cached = this._pool.get(key);
    if (cached && updatedItems) {
      return this._handleUpdatedItems(cached, updatedItems, conversation);
    }

    if (!cached && updatedItems?.latestMessage) {
      if (conversation.conversationType === ConversationType.PRIVATE) {
        cached = this._transPriConversation(conversation);
      } else if (conversation.conversationType === ConversationType.GROUP) {
        cached = this._transGroupConversation(conversation);
      } else {
        cached = this._transSystemConversation(conversation);
      }
      return { changeType: 2, conversation: cached };
    }
    return { changeType };
  }

  private _handleUpdatedItems(cached: IRCKitCachedConversation, updatedItems: IUpdateItem, conversation: IAReceivedConversation) {
    let changeType = 0;
    // 处理会话置顶状态
    if (updatedItems.isTop) {
      cached.isTop = updatedItems.isTop.val;
      changeType = Math.max(2, changeType);
    }
    // 处理会话免打扰状态
    if (updatedItems.notificationLevel) {
      cached.notificationLevel = updatedItems.notificationLevel.val;
      changeType = Math.max(1, changeType);
    }
    // 处理最后一条消息更新
    if (updatedItems.latestMessage?.val) {
      if (conversation.conversationType === ConversationType.GROUP && conversation.hasMentioned) {
        cached.mentionedType = conversation.mentionedInfo!.type === MentionedType.ALL ? RCKitMentionedType.AT_ALL : RCKitMentionedType.AT_ME;
      } else {
        cached.mentionedType = RCKitMentionedType.NONE;
      }
      this._paddingData(cached, conversation);
      // 会话未读数累加需重置 markReaded 和 markUnread，防止菜单按钮展示错误
      if (cached.markReaded && conversation.unreadMessageCount) {
        cached.markReaded = false;
      }
      changeType = Math.max(2, changeType);
    }
    return { changeType, conversation: cached };
  }

  private _paddingData(cached: IRCKitCachedConversation, data: IAReceivedConversation): void {
    cached.latestMessage = data.latestMessage ? transIAReceivedMessage(data.latestMessage) : null;
    cached.unreadCount = data.unreadMessageCount || 0;
    cached.isTop = !!data.isTop;
    if (electronExtension.enable()) {
      cached.draft = data.draft || ''
      // Electron 平台下会话列表数据使用操作时间作为 updateTime
      cached.updateTime = data.operationTime! || (data.latestMessage ? data.latestMessage.sentTime : 0);
    } else {
      cached.updateTime = data.latestMessage ? data.latestMessage.sentTime : 0;
    }
    if (data.notificationLevel) {
      cached.notificationLevel = data.notificationLevel;
    }
  }

  protected _transPriConversation(item: IAReceivedConversation): IRCKitCachedConversation {
    const profile = this.ctx.appData.getUserProfiles([item.targetId])[0];
    const cached = this._createCachedConversation(item);
    cached.name = profile.name;
    cached.portraitUri = profile.portraitUri;
    cached.online = profile.online;
    this._paddingData(cached, item);
    return cached;
  }

  protected _transSystemConversation(item: IAReceivedConversation): IRCKitCachedConversation {
    const profile = this.ctx.appData.getSystemProfiles([item.targetId])[0];
    const cached = this._createCachedConversation(item);
    cached.name = profile.name;
    cached.portraitUri = profile.portraitUri;
    this._paddingData(cached, item);
    return cached;
  }

  protected _transGroupConversation(item: IAReceivedConversation): IRCKitCachedConversation {
    const profile = this.ctx.appData.getGroupProfiles([item.targetId])[0];
    const cached = this._createCachedConversation(item);
    cached.name = profile.name;
    cached.portraitUri = profile.portraitUri;
    cached.memberCount = profile.memberCount;
    if (item.hasMentioned) {
      cached.mentionedType = item.mentionedInfo!.type === MentionedType.ALL ? RCKitMentionedType.AT_ALL : RCKitMentionedType.AT_ME;
    } else {
      cached.mentionedType = RCKitMentionedType.NONE;
    }
    this._paddingData(cached, item);
    return cached;
  }

  /**
   * 解析会话列表数据
   */
  private _parseConversationList(list: IAReceivedConversation[]): IRCKitCachedConversation[] {
    const result: IRCKitCachedConversation[] = [];

    list.forEach((item) => {
      const { targetId, conversationType, latestMessage, channelId } = item;

      if (latestMessage) {
        // 已读回执只判断 Web 平台且是单聊会话。群回执主动调用IMLib接口获取
        const readEnable = conversationType === ConversationType.PRIVATE && !electronExtension.enable();
        let lastReadTime = 0;
        if (readEnable) {
          // 获取本地缓存最新的已读时间戳，小于缓存时间戳的消息标记为已读
          lastReadTime = this.getLastReadTime({ targetId, conversationType, channelId });
        }
        if (readEnable && latestMessage.sentTime <= lastReadTime && latestMessage.senderUserId === this.ctx.userId) {
          latestMessage.sentStatus = SentStatus.READ
        }
        if (latestMessage.readReceiptInfo && latestMessage.senderUserId === this.ctx.userId) {
          latestMessage.sentStatus = SentStatus.READ
        }
      }
      switch (conversationType) {
        case ConversationType.PRIVATE:
          result.push(this._transPriConversation(item));
          return;
        case ConversationType.GROUP:
          result.push(this._transGroupConversation(item));
          return;
        case ConversationType.SYSTEM:
          result.push(this._transSystemConversation(item));
          return;
        default:
          // 无法解析的数据类型，打印提示
          this.logger.warn(LogTag.L_PARSE_CONVERSATION_E, `unknown conversation type: ${conversationType}, targetId: ${targetId}`);
          return;
      }
    });

    return result;
  }

  /**
   * 获取既有的会话列表缓存
   * @returns
   */
  getCachedConversationList(): IRCKitCachedConversation[] {
    return this._list.slice();
  }

  /**
   * 将会话添加到会话列表，根据会话 `updateTime` 与 `isTop` 值排序，并返回其当前所处的索引位置
   * @param item
   * @param sort - 若列表已存在该会话，是否重新计算其位置，若为 false，则终止插入
   * @returns - 返回会话在列表中的原始位置与当前位置
   */
  private _addToConversationList(item: IRCKitCachedConversation, sort: boolean = true): {
    /**
     * 原始位置
     */
    origin: number,
    /**
     * 当前位置
     */
    current: number
  } {
    // 如果会话列表中有重复数据，说明会话列表数据的过程中远端列表发生过变更
    let origin = this._list.findIndex((conv) => isSameConversation(conv, item));
    if (origin > -1) {
      if (!sort) {
        return { origin, current: origin };
      }

      // 从原位置删除元素，以便于重新计算位置
      this._list.splice(origin, 1);
    }

    const { isTop, updateTime } = item;
    let current = this._list.findIndex((conv) => {
      if (isTop) {
        return !conv.isTop || updateTime > conv.updateTime;
      }
      return !conv.isTop && updateTime > conv.updateTime;
    });
    if (current === -1) {
      current = this._list.length;
    }
    this._list.splice(current, 0, item);
    return { origin, current };
  }

  /** 处理从消息模块接收到的数据，仅 Electron 需要 */
  private _onRecvNewMessages(evt: RecvNewMessagesEvent) {
    this._messageQueue.push(...evt.data);
  }

  /**
   * 处理消息数据，并将处理后的缓存会话返回
   * @returns - 返回的 changeType 变更类型，0：无变更，1：状态变更，位置不变，2：会话位置变更
   */
  private _handleMessage(message: IRCKitCachedMessage): { changeType: number, conversation: IRCKitCachedConversation } {
    const currentUserId = this.ctx.userId;
    // 0：无变更，1：状态变更，位置不变，2：会话位置变更
    let changeType = 0;
    // 根据消息批量更新会话列表
    const key = trans2ConversationKey(message);
    const {
      content, conversationType, targetId, channelId, sentTime, isCounted, senderUserId,
    } = message;

    // 获取缓存会话
    let conversation = this._pool.get(key);
    if (!conversation) { // 无会话记录，需要新增会话
      const item: IAReceivedConversation = {
        latestMessage: message,
        conversationType,
        targetId,
        channelId,
      };

      // 非法数据在消息模块已处理，如非法会话类型消息、非存储的消息等
      if (conversationType === ConversationType.PRIVATE) {
        conversation = this._transPriConversation(item);
      } else if (conversationType === ConversationType.GROUP) {
        conversation = this._transGroupConversation(item);
      } else {
        conversation = this._transSystemConversation(item);
      }

      changeType = 2;
    }

    // 计算 @ 信息，根据显示规则，如果已经是 @我，是最高显示优先级，无需继续计算
    if (conversationType === ConversationType.GROUP && conversation.mentionedType !== RCKitMentionedType.AT_ME && senderUserId !== currentUserId) {
      conversation.mentionedType = Math.max(this._getMentionedType(currentUserId, content.mentionedInfo), conversation.mentionedType);
      changeType = Math.max(changeType, 1);
    }

    // 消息的发送时间若大于会话的 updateTime 操作时间，更新会话的 updateTime 与 latestMessage
    if (sentTime >= conversation.updateTime) {
      conversation.latestMessage = message;
      conversation.updateTime = sentTime;
      changeType = 2;
    }

    // 更新未读数
    if (isCounted && senderUserId !== currentUserId) {
      conversation.unreadCount += 1;
      // 会话未读数累加需重置 markReaded 和 markUnread，防止菜单按钮展示错误
      conversation.markReaded = false;
      changeType = Math.max(changeType, 1);
    }

    return { changeType, conversation };
  }

  /**
   * 批量计算会话新位置，并对外派发会话列表排序变更事件
   * @param changed
   * @description 由于是批量处理，可能包含状态变更，因此不考虑 origin 与 current 相等的情况，照常计算通知
   */
  private _recalculatePosition(changed: Set<IRCKitCachedConversation>): void {
    const evtData: { order: number, conversation: IRCKitCachedConversation }[] = [];
    // 按 updateTime 升序排列，以便于有限处理位置更靠后的会话，使其变更不会影响前面的排序结果
    // 列表渲染时，根据 evtData 中的顺序还原变更列表即可
    const list = [...changed].sort((a, b) => a.updateTime - b.updateTime);
    // 统一处理位置变更
    list.forEach(conversation => {
      const { current } = this._addToConversationList(conversation);
      evtData.push({ order: current, conversation });
    })
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_ORDER_CHANGE, evtData));
  }

  /**
   * 获取远端会话列表数据
   * @param firstScreen - 是否是拉取首屏动作
   * @description - 首屏拉取时，数据仅为做及时渲染显示，无需确保数据准确，也不需拉取完整数据。
   * 当离线消息拉取完成后，会重新拉取全量会话列表覆盖
   */
  private async _getMoreRemoteConversation(firstScreen: boolean = false, startTime: number = 0) {
    const count = startTime === 0 ? 30 : 200;
    const { code, data } = await getConversationList({ count, startTime });

    if (firstScreen && this._pullOfflineMessageFinished) {
      // 离线消息拉取完成，直接丢弃首屏数据
      return;
    }

    if (code !== ErrorCode.SUCCESS && !firstScreen) {
      // 首屏数据为临时数据，失败无需重试
      this.logger.error(LogTag.L_GET_CONVERSATION_E, `get conversation list failed: code = ${code}, count = ${count}, startTime = ${startTime}`);
      // 3s 后重试
      this._getRemoteConversationTimer = setTimeout(() => this._getMoreRemoteConversation(firstScreen, startTime), 3000);
      return
    }

    const conversationList: IAReceivedConversation[] = data || [];
    if (conversationList.length === 0 || firstScreen) {
      // 无数据，不做处理，终止递归
      this._onGetRemoteConversationListDone(firstScreen);
      return;
    }

    const reset = startTime === 0 && !firstScreen;
    if (reset) {
      // 清空原临时首屏数据
      this._list.length = 0;
    }

    // 解析会话列表数据，并同步填充业务数据
    const list = this._parseConversationList(conversationList);

    let nextRequestTimestamp = startTime;
    // 将会话列表数据向后插入到缓存列表中
    // 需要排重处理，原因在于会话列表数据获取过程中，SDK 接收消息造成数据库中的会话列表数据变更
    // 根据 updateTime 与 isTop 属性确定其在列表中的位置
    nextRequestTimestamp = this._handleNextRequestTimestamp(nextRequestTimestamp, list);

    if (firstScreen || reset) {
      // 通知 UI 做首屏渲染
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_LIST_RESET, this._list));
    }

    if (firstScreen || electronExtension.enable() || conversationList.length < count) {
      // electron 平台 getConversationList 接口会一次性返回所有会话，不需要分页拉取
      // 首屏仅需拉取一屏即可，无需全量拉取
      this._onGetRemoteConversationListDone(firstScreen);
      return;
    }

    // 递归拉取更多数据，为避免限频，每次拉取间隔 300ms
    this._getRemoteConversationTimer = setTimeout(() => this._getMoreRemoteConversation(false, nextRequestTimestamp), 300);
  }

  // 根据 updateTime 与 isTop 属性确定其在列表中的位置
  private _handleNextRequestTimestamp(nextRequestTimestamp: number, list: IRCKitCachedConversation[]) {
    list.forEach(item => {
      // 由于列表是按照 updateTime 降序排列，所以不需要继续向缓存列表中插入数据，以既有数据为准
      // 一般情况下不会出现该问题，除非业务层调用了插入会话接口，且传入了已存在的会话参数
      this._addToConversationList(item, false)

      // web 端会话列表数据 updateTime 可能为 0，保持数据不变，在下页拉取时处理重复
      if (item.updateTime) {
        nextRequestTimestamp = nextRequestTimestamp === 0 ? item.updateTime : Math.min(item.updateTime, nextRequestTimestamp);
      }
    })
    return nextRequestTimestamp;
  }

  private _onPullOfflineMessageFinished(): void {
    this._pullOfflineMessageFinished = true;

    // 停止正在进行的首屏数据拉取
    if (this._getRemoteConversationTimer) {
      clearTimeout(this._getRemoteConversationTimer);
      this._getRemoteConversationTimer = null;
    }

    // 停止进行中的解析动作
    if (this._handleQueueTimer) {
      clearTimeout(this._handleQueueTimer);
      this._handleQueueTimer = null;
    }

    this._getMoreRemoteConversation(false);
  }

  private _getRemoteConversationFinished: boolean = false;

  /**
   * 获取远端会话列表数据完成，开始消息与会话通知
   */
  private _onGetRemoteConversationListDone(tmpData: boolean): void {
    if (!tmpData) {
      // 首屏数据拉取完毕，不更新会话列表拉取完成标识
      this._getRemoteConversationFinished = true;
    }

    // 开启定时器，定时处理消息与会话通知
    this._handleQueue();
  }

  private _handleQueueTimer: any;

  private _handleQueueDelay() {
    if (this._handleQueueTimer) {
      return;
    }
    this._handleQueueTimer = setTimeout(() => {
      this._handleQueueTimer = null;
      this._handleQueue();
    }, 20);
  }

  /**
   * 批量处理消息与会话通知
   * @returns
   */
  private _handleQueue() {
    if (this._messageQueue.length === 0 && this._converNtfQueue.length === 0) {
      this._handleQueueDelay();
      return;
    }

    if (this._list.length >= 20 && !this._getRemoteConversationFinished) {
      // 首屏会话展示阶段，直接停止，不需要继续解析
      return;
    }

    const changed: Set<IRCKitCachedConversation> = new Set();
    // 用于暂存变更的会话: 位置变更、仅状态变更
    const orderChanged: Set<IRCKitCachedConversation> = new Set();
    const statChanged: Set<IRCKitCachedConversation> = new Set();
    // 计算消息队列和会话通知引发的会话列表变更长度，当长度超出 max 定义时暂停处理，避免 UI 一次性处理过多变更造成线程阻塞
    const max = Number.MAX_SAFE_INTEGER;
    // 计算队列处理时间，当处理时间超过 maxCostTime （毫秒）时，暂停处理，避免阻塞主线程
    const maxCostTime = 20;
    const startTime = Date.now();

    const handleChange = (data: { changeType: number, conversation?: IRCKitCachedConversation }) => {
      const { changeType, conversation } = data;
      if (changeType === 1) {
        statChanged.add(conversation!);
        changed.add(conversation!);
      } else if (changeType === 2) {
        orderChanged.add(conversation!);
        changed.add(conversation!);
      }
    }

    // 优先处理消息队列（仅 Electron 平台需要）
    this._handleMessageQueue(handleChange, changed, max, maxCostTime, startTime);

    // 处理会话通知前，需要确保 message 列表已清空，否则当接收到本地缓存不存在的会话通知时，无法识别该会话时被删除还是尚未生成
    // 列表拉取完成前，仅处理 updatedItems.latestMessage.isOffline 为 true 的通知
    // 列表拉取完成后，丢弃 updatedItems.latestMessage.isOffline 为 true 的通知，其他正常处理
   this._handleQueueNotify(handleChange, changed, max, maxCostTime, startTime);

    if (orderChanged.size) {
      // 计算会话位置变更并通知 UI
      this._recalculatePosition(orderChanged);
    }

    if (statChanged.size) {
      // orderChanged 中重复的会话不需要再次通知 UI
      const list = [...statChanged].filter(item => !orderChanged.has(item));
      if (list.length) {
        // 通知 UI 更新会话列表
        this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, list));
      }
    }

    this._handleQueueDelay();
  }

  private _handleMessageQueue(
    handleChange: (data: { changeType: number, conversation?: IRCKitCachedConversation }) => void,
    changed: Set<IRCKitCachedConversation>,
    max: number,
    maxCostTime: number,
    startTime: number,
  ) {
    while (this._messageQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
      const msg = this._messageQueue[0];
      // 会话列表拉取完成前，仅处理离线消息，遇到非离线消息中止处理
      if (!this._getRemoteConversationFinished && !msg.isOffLineMessage) {
        // 未拉取完成会话列表，说明当前处于首屏临时数据显示中，不处理在线消息
        break;
      } else if (this._getRemoteConversationFinished && msg.isOffLineMessage) {
        // 会话列表拉取完成后，仅处理在线消息，离线消息丢弃
        this._messageQueue.shift();
        continue;
      }
      const message = transIAReceivedMessage(this._messageQueue.shift()!);
      handleChange(this._handleMessage(message));
    }
  }

  private _handleQueueNotify(
    handleChange: (data: { changeType: number, conversation?: IRCKitCachedConversation }) => void,
    changed: Set<IRCKitCachedConversation>,
    max: number,
    maxCostTime: number,
    startTime: number,
  ) {
    if (!this._getRemoteConversationFinished) {
      // 会话列表数据拉取完成前，仅处理离线消息造成的 conversation 通知，其他等待会话列表拉取完成后处理
      let i = 0;
      while (this._messageQueue.length === 0 && i < this._converNtfQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
        const item = this._converNtfQueue[i];
        if (item.updatedItems?.latestMessage) {
          if (!item.updatedItems.latestMessage.val.isOffLineMessage) {
            // 碰到在线消息直接中止循环
            break;
          }
          this._converNtfQueue.splice(i, 1);
          handleChange(this._handleConversationNtf(item));
          continue;
        }
        i += 1; // 其他通知跳过处理
      }
      return;
    }

    while (this._messageQueue.length === 0 && this._converNtfQueue.length && Date.now() - startTime < maxCostTime && changed.size < max) {
      const item = this._converNtfQueue.shift()!;
      if (item.updatedItems?.latestMessage?.val.isOffLineMessage) {
        // 离线消息产生的通知直接丢弃
        continue;
      }
      handleChange(this._handleConversationNtf(item));
    }
  }

  /**
   * 获取指定会话之前的会话列表数据
   * @param conversation - 指定会话，若不传，则获取最新的会话列表数据
   * @param count - 获取数量，默认为 30
   * @description - 该方法会根据指定会话在会话列表中的位置，向前获取 30 条会话数据；返回结果不包含传入的会话。
   */
  public async getMoreConversationList(conversation: IRCKitCachedConversation | null, count?: number) {
    let index = conversation ? this._list.findIndex((item) => isSameConversation(item, conversation)) : -1;
    if (index === -1) {
      index = 0;
    } else {
      // 返回结果不包含传入的会话。
      index = index + 1;
    }

    const endIndex = index + (count || 30);
    const list = this._list.slice(index, endIndex);
    const hasMore = this._list.length > endIndex || !this._getRemoteConversationFinished;
    return { hasMore, code: ErrorCode.SUCCESS, list };
  }

  /**
   * 删除指定会话，若会话已被打开，则会同时派发会话选中状态变更事件
   * @emits {@link RCKitEvents.CONVERSATIN_ITEM_REMOVE}
   * @param conversation
   */
  async removeConversation(conversation: IConversationOption): Promise<void> {
    // 从 IMLib 层面删除会话
    const { code } = await removeConversation(conversation);
    if (code !== ErrorCode.SUCCESS) {
      this.ctx.alert('alert.delete.conversation.failed', code);
      return;
    }

    // 清理缓存
    const key = trans2ConversationKey(conversation);
    const index = this._list.findIndex((item) => isSameConversation(item, conversation));
    if (index > -1) {
      const [cached] = this._list.splice(index, 1);
      this._pool.delete(key);
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATIN_ITEM_REMOVE, [cached]));

      if (cached === this._openedConversation) {
        this._setOpenedConversation(null);
      }
    }

    // 删除回话的同时，清理消息
    const bool = this.ctx.store.getCommandSwitch(RCKitCommand.DELETE_MESSAGES_WHILE_DELETE_CONVERSSATION);
    if (!bool) {
      return;
    }
    // 清空消息缓存列表
    this.ctx.message.removeCachedMessages(conversation);

    const timestamp = getServerTime() + 5000;
    // 从服务删除消息
    clearHistoryMessages(conversation, timestamp);
    // 清理 Electron 平台本地数据库消息
    if (electronExtension.enable()) {
      electronExtension.deleteMessagesByTimestamp(conversation, timestamp, false);
    }
  }

  /**
   * 打开指定会话，若会话不存在，则会先创建会话并插入到会话列表顶部
   * @param conversation
   */
  async openConversation(conversation: IConversationOption): Promise<{ code: number }> {
    if (isInvalidConversation(conversation)) {
      return { code: InnerErrorCode.INVALID_CONVERSATION };
    }

    if (!this._getRemoteConversationFinished || !this._pullOfflineMessageFinished) {
      return { code: InnerErrorCode.CONVERSATION_LIST_NOT_READY }
    }

    if (this._openedConversation && isSameConversation(this._openedConversation, conversation)) {
      return { code: ErrorCode.SUCCESS };
    }

    const { targetId, conversationType, channelId } = conversation;

    // 检查会话是否已存在
    let index = this._list.findIndex((item) => isSameConversation(item, conversation));
    let cached = this._list[index];

    if (!cached) {
      // 生成新会话
      [cached] = this._parseConversationList([{
        targetId,
        conversationType,
        channelId,
        latestMessage: null,
      }]);

      // 标记更新时间
      cached.updateTime = getServerTime();
      this._recalculatePosition(new Set([cached]));
    }

    this._setOpenedConversation(cached);
    return { code: ErrorCode.SUCCESS };
  }

  private _setOpenedConversation(conversation: IRCKitCachedConversation | null): void {
    // 清理 typing 状态限频记录
    this._clearTypingStatus();

    this._openedConversation = conversation;
    this.ctx.emit(new RCKitEvent(RCKitEvents.CONVERSATION_SELECTED, conversation), 1);
  }

  /**
   * 设置会话免打扰等级
   * @param conversation - 会话
   * @param level - 免打扰等级
   */
  async setConversationNotificationLevel(conversation: IConversationOption, level: NotificationLevel): Promise<{ code: number }> {
    if (isInvalidConversation(conversation)) {
      return { code: InnerErrorCode.INVALID_CONVERSATION };
    }
    const cached = this._list.find((item) => isSameConversation(item, conversation));
    if (!cached) {
      return { code: ErrorCode.CONVER_GET_ERROR };
    }

    if (cached.notificationLevel === level) {
      return { code: ErrorCode.SUCCESS };
    }

    const { code } = await setConversationNotificationLevel(conversation, level);
    if (code !== ErrorCode.SUCCESS) {
      return { code };
    }

    // Electron 主动通知 UI 更新
    if (electronExtension.enable()) {
      cached.notificationLevel = level;
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [cached]));
    }

    return { code };
  }

  /**
   * 设置会话置顶
   * @param conversation - 会话
   * @param isTop - 是否置顶
   */
  async setConversationToTop(conversation: IConversationOption, isTop: boolean): Promise<{ code: number }> {
    if (isInvalidConversation(conversation)) {
      return { code: InnerErrorCode.INVALID_CONVERSATION };
    }

    isTop = !!isTop;
    const cached = this._list.find((item) => isSameConversation(item, conversation));
    if (!cached) {
      return { code: ErrorCode.CONVER_GET_ERROR };
    }
    if (cached.isTop === isTop) {
      return { code: ErrorCode.SUCCESS };
    }

    const { code } = await setConversationToTop(conversation, isTop);
    if (code !== ErrorCode.SUCCESS) {
      return { code };
    }

    // Electron 设置置顶不会触发会话监听，需要主动更新缓存数据, Web 由会话监听触发更新
    if (electronExtension.enable()) {
      cached.isTop = isTop;
      this._recalculatePosition(new Set([cached]));
    }

    return { code };
  }

  /**
   * 标记会话为已读
   * @param conversation
   */
  public async markConversationReaded(conversation: IRCKitCachedConversation) {
    const { data } = await getFirstUnreadMessage(conversation);
    // 标记已读的同时该会话未读数置为 0
    await this.clearUnreadCountByTimestamp(conversation, conversation.latestMessage?.sentTime || Date.now())

    const list: IRCKitCachedMessage[] = []
    // 标记会话已读需要发送回执

    if (data) {
      list.push(transIAReceivedMessage(data))
    }
    if (conversation.latestMessage) {
      list.push(conversation.latestMessage)
    }
    this.ctx.message.sendReadReceiptMessage(conversation, list);
  }

  /**
   * 标记会话为未读
   * @param conversation
   */
  public markConversationUnread(conversation: IRCKitCachedConversation) {
    // TODO: 定位组件存在的时候，清空未读数定位组件未读数应该也需要置空
    conversation.markReaded = false;
    conversation.markUnread = true;

    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [conversation]));
  }

  getCachedConversationByKey(key: string): IRCKitCachedConversation {
    return this._pool.get(key)!;
  }

  /**
   * 按时间戳清理消息未读数
   */
  async clearUnreadCountByTimestamp(conversation: IConversationOption, timestamp: number): Promise<{ code: number }> {
    const cached = this.getCachedConversationByKey(trans2ConversationKey(conversation));
    if (!electronExtension.enable()) {
      // web 平台不支持，直接清理所有未读数
      await clearMessagesUnreadStatus(conversation);
      cached.unreadCount = 0;
      cached.mentionedType = RCKitMentionedType.NONE;
      // 清除未读数需重置 markReaded 和 markUnread，会话状态展示错误
      cached.markReaded = true;
      cached.markUnread = false;
    } else {
      await clearUnreadCountByTimestamp(conversation, timestamp);
      // 重新获取未读数
      const { data } = await getUnreadCount(conversation);
      cached.unreadCount = data!
      cached.markReaded = true;
      cached.markUnread = false;
      // TODO: 需确认 mentionedType 是否能够按时间戳清理后，以余量未读消息重新计算
      cached.mentionedType = RCKitMentionedType.NONE;
    }

    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_CHANGE, [cached]));
    // 多端未读数同步
    await sendSyncReadStatusMessage(conversation, timestamp + 1 || Date.now());
    return { code: ErrorCode.SUCCESS };
  }

  /**
   * 切换会话处理缓存数据
   * @param conversation
   * @param value
   * @returns
   */
  async handleConversationDraft(conversation: IConversationOption | null, value?: string): Promise<void> {
    if (!conversation) return
    const { data } = await getTextMessageDraft(conversation);
    if (data === value) return

    const key = trans2ConversationKey(conversation);
    let cached = this._pool.get(key);

    if (value) {
      const { code } = await saveTextMessageDraft(conversation, value);
      if (code !== ErrorCode.SUCCESS || !cached) return
      cached.draft = value
      const newPosition = this._moveConversationToTop(cached);
      // 派发通知
      this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_ORDER_CHANGE, [{ order: newPosition, conversation: cached }]));
      return
    }
    await clearTextMessageDraft(conversation);
    if (!cached) return
    cached.draft = ''
    const index = this._moveConversationBytime(cached);
    // 派发通知
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.CONVERSATION_ITEM_ORDER_CHANGE, [{ order: index, conversation: cached }]));

  }

  updateLastReadTime(conversation: IConversationOption, time: number): void {
    if (!this.ctx.conversationStore) return
    const { conversationType, targetId, channelId = '' } = conversation
    const localStorage = this.ctx.conversationStore.get(conversationType, targetId, channelId);
    if (time > localStorage.lastReadTime!) {
      this.ctx.conversationStore.set(conversationType, targetId, {
        lastReadTime: time
      }, channelId!);
    }
  }

  getLastReadTime(conversation: IConversationOption): number {
    if (!this.ctx.conversationStore) return 0
    const { conversationType, targetId, channelId = '' } = conversation;
    return this.ctx.conversationStore.get(conversationType, targetId, channelId).lastReadTime || 0;
  }

  private _typingTime: any = null;

  /**
   * 向当前打开的单聊会话发送输入状态
   */
  sendTypingStatus(type: string = MessageType.TEXT) {
    if (!this._openedConversation || this._openedConversation.conversationType !== ConversationType.PRIVATE) {
      return;
    }
    // 限频检查
    if (this._typingTime) {
      return;
    }

    this._typingTime = setTimeout(() => {
      this._typingTime = null;
    }, 5000);
    sendTypingStatusMessage(this._openedConversation!, type)
  }

  /**
   * 清理 typing 限频记录
   */
  private _clearTypingStatus() {
    if (this._typingTime) {
      clearTimeout(this._typingTime);
      this._typingTime = null;
    }
  }
}
