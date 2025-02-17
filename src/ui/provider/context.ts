import { ConversationType, IConversationOption, ILogger, SentStatus, MessageType } from '@rongcloud/engine';
import { computed, provide, readonly, ref, watch } from 'vue';
import { RCKitContext } from '../../core/RCKitContext';
import { IRCKitCachedMessage as IAReceivedMessage, IRCKitCachedMessage } from '../../modules/MessageDataModule';
import { IRCKitLanguageEntries } from '../../languages';
import { $has, $t, $tt, lang } from '../i18n-vue';
import { getCurrentUserId, RCConnectionStatus } from '@rongcloud/imlib-next';
import { IRCKitCachedConversation } from '@lib/modules/conversation/IRCKitCachedConversation';
import { isSameConversation } from '@lib/helper';
import { RCKitEvent } from '@lib/core/RCKitEvent';
import { InnerComponentTag } from '../component';
import { InnerProviderTag } from '.';
import { RCKitCommand } from "../../enums/RCKitCommand";
import { ConnectionStatusChangeEvent, ConversationSelectedEvent, DeleteMessageModalEvent, ForwardingEvent, InnerEvent, RCKitEvents, RCKitModalBtnType, RCKitModalForwardingType } from '@lib/core/EventDefined';
import { RCKIT_ENV_KEYS } from '@lib/constants';

let _logger: ILogger;
let _ctx: RCKitContext;

const currentUserId = ref<string>('')
/**
 * 在两个核心顶级组件中向注入环境变量
 */
export const setEnvInfo = () => {
  // 将环境变量 CURRENT_USER_ID 改为响应式数据，用户切换能进行更新
  currentUserId.value = ctx().userId;
  provide(RCKIT_ENV_KEYS.CURRENT_USER_ID, currentUserId);
  provide(RCKIT_ENV_KEYS.LANGUAGE, readonly(lang));
}

/**
 * 已打开的会话
 */
export const openedConversation = ref<IRCKitCachedConversation | null>(null)
/**
 * 编辑框的 DOM 元素，草稿和重新编辑功能需要对编辑框的内容进行获取或者设置
 */
export const textarea = ref();
/**
 * Bottom 定位组件未读数
 */
export const unreadCountBottom = ref<number>(0);

/**
 * 选中的群组会话的成员列表
 * @description - 该列表数据不包含当前登录用户
 */
export const selectedGroupMembers = ref<{
  name: string
  nickname?: string
  userId: string
  portraitUri: string
}[]>([]);

/**
 * 当前用户配置信息
 */
export const currentUserProfile = ref<{
  name: string
  nickname?: string
  userId: string
  portraitUri: string
}>();

const _onConnectionStatusChange = async (e: ConnectionStatusChangeEvent) => {
  const { status } = e.data;
  if (status === RCConnectionStatus.CONNECTED) {
    const userId = getCurrentUserId();
    const users = await _ctx.appData.requestUserProfiles([userId]);
    currentUserProfile.value = users[0];
  };
}

const _onConversationSelected = async (evt: ConversationSelectedEvent) => {
  const conversation = evt.data;
  // 更新缓存
  openedConversation.value = conversation;
  selectedGroupMembers.value.length = 0;

  // 切换会话时停止音频播放
  ctx().audioPlayer.pause();

  if (!conversation) {
    return;
  }

  // 更新群成员列表数据
  const { conversationType, targetId } = conversation;
  if (conversationType !== ConversationType.GROUP) {
    return;
  }

  // 获取群组成员列表
  const mems = await _ctx.appData.reqGroupMembers(targetId);
  if (mems.length === 0) {
    return;
  }

  const users = await _ctx.appData.requestUserProfiles(mems.map(item => item.userId));
  if (!openedConversation.value || !isSameConversation(conversation, openedConversation.value)) {
    // 数据请求是异步的，需要在数据获取后判断是否重新切换了会话
    return;
  }

  selectedGroupMembers.value.push(...users.filter(item => item.userId !== _ctx.userId).map((item) => {
    const index = mems.findIndex((mem) => mem.userId === item.userId)
    return {
      userId: item.userId,
      nickname: mems[index].nickname,
      name: item.name,
      portraitUri: item.portraitUri,
    }
  }));
};

/**
 * 重置 UIModule 数据
 */
export const destroyUserCache = async () => {
  // 重置当前打开的会话
  openedConversation.value = null;
  // 重置输入框内容
  if (textarea.value) {
    textarea.value.value = '';
  }
  // 重置未读数
  unreadCountBottom.value = 0;
  // 重置群成员列表
  selectedGroupMembers.value = [];
  // 更新环境变量 userId
  currentUserId.value = ctx().userId;
}

export function initProviderContext(ctx: RCKitContext): void {
  _ctx = ctx;
  _logger = ctx.logger;

  _ctx.addEventListener(RCKitEvents.CONVERSATION_SELECTED, _onConversationSelected);
  // 获取当前连接成功的用户信息
  _ctx.addEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, _onConnectionStatusChange);
  // 切换用户登入，重置数据
  _ctx.addEventListener(InnerEvent.DESTROY_USER_CACHE, destroyUserCache);
  initModalListener(_ctx);
}

export const ctx = () => _ctx;
export const logger = () => _logger;

/**
 * 会话列表数据
 */
export const conversationList = ref<IRCKitCachedConversation[]>([]);

/**
 * 消息列表数据
 */
export const messageList = ref<IAReceivedMessage[]>([]);

/**
 * 多选模式
 */
export const multiChoiceMode = ref(false);

/**
 * 多选模式下被选中的消息列表
 */
export const selectedMessages = ref<IAReceivedMessage[]>([]);

export const selectedMessageUids = ref<string[]>([]);
export const selected = ref<boolean>(true);

// 观察多选模式变更，有变更即清空选中的消息列表
watch(multiChoiceMode, () => {
  selectedMessages.value = [];
  selectedMessageUids.value = [];
  selected.value = true;
});

/** 已选中消息数量 */
export const selectedCount = computed(() => selectedMessages.value.length);

/**
 * 是否显示相机面板
 */
export const cameraOpened = ref(false);

/**
 * 被回复的消息
 */
export const replyMessage = ref<IAReceivedMessage | null>(null);

/**
 * 获取消息描述，若为文本消息，则直接返回文本内容，否则返回消息类型的简短描述
 * @param message
 * @returns
 */
export const getMessageDesc = (message: IAReceivedMessage): string => {
  const messageType = message.messageType;
  if (messageType === MessageType.TextMessage || messageType === MessageType.REFERENCE) {
    return message.content.content;
  }

  let key = `message-type.${messageType}` as keyof IRCKitLanguageEntries;
  if (!$has(key)) {
    key = 'message-type.unknown';
  }

  return $t(key).value;
};

/**
 * 被回复的消息的描述
 */
export const replyDesc = computed(() => {
  if (!replyMessage.value) {
    return ''
  }
  return getMessageDesc(replyMessage.value);
});

/** 被回复消息的缩略图展示，值可能为 '' */
export const replyThumbnail = computed<string | null>(() => {
  if (!replyMessage.value) {
    return null;
  }

  const { messageType, content } = replyMessage.value;
  switch (messageType) {
    case MessageType.IMAGE:
    case MessageType.SIGHT:
      return `data:image/png;base64,${content.content}`;
  }
  return null;
});

export const replyMessageSender = computed(() => {
  if (!replyMessage.value) {
    return '';
  }
  return _ctx.appData.getUserProfile(replyMessage.value.senderUserId).name;
});


const appendChild = (ctx: RCKitContext, ele: HTMLElement) => {
  let elementParent = document.body;
  if (ctx.modalContainerId && document.getElementById(ctx.modalContainerId)) {
    elementParent = document.getElementById(ctx.modalContainerId)!;
  }
  elementParent.appendChild(ele);
}
/**
 * 注册弹框事件监听
 * @param ctx
 */
export const initModalListener = (ctx: RCKitContext): void => {
  ctx.addEventListener(RCKitEvents.CONFIRM_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_CONFIRM_PROVIDER);
    element.addEventListener('cancel', () => {
      e.sendResult(false);
      element.remove();
    })
    element.addEventListener('confirm', () => {
      e.sendResult(true);
      element.remove();
    });

    appendChild(ctx, element)
  });

  ctx.addEventListener(RCKitEvents.ALERT_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_ALERT_PROVIDER);
    element.addEventListener('cancel', (event) => {
      element.remove();
    });

    appendChild(ctx, element);
  });

  ctx.addEventListener(RCKitEvents.FORWARDING_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_FORWARDING_PROVIDER);
    element.addEventListener('cancel', () => {
      e.sendResult({ type: RCKitModalBtnType.CANCEL });
      element.remove();
    })
    element.addEventListener('confirm', (event: any) => {
      e.sendResult({ type: RCKitModalBtnType.CONFIRM, list: event.detail[0].list });
      element.remove();
    });
    appendChild(ctx, element);
  });

  ctx.addEventListener(RCKitEvents.DELETE_MESSAGE_MODAL_EVENT, (e) => {
    const { recallEnable } = e.data;
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_DELETE_MESSAGE_PROVIDER);
    element.addEventListener('cancel', () => {
      e.sendResult({ type: RCKitModalBtnType.CANCEL });
      element.remove();
    })
    element.addEventListener('confirm', (event: any) => {
      e.sendResult({ type: RCKitModalBtnType.CONFIRM, recall: recallEnable && !!event.detail[0] });
      element.remove();
    });
    element.setAttribute('recall-enable', recallEnable ? 'true' : 'false');
    appendChild(ctx, element)
  });

  ctx.addEventListener(RCKitEvents.MEDIA_MESSAGE_MODAL_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_MEDIA_MESSAGE_PROVIDER);
    element.addEventListener('cancel', (event) => {
      element.remove();
    });
    element.addEventListener('download', (event) => {
      ctx.emit(new RCKitEvent(RCKitEvents.DOWNLOAD_LINK_EVENT, e.data));
    });
    const url = e.data.content?.sightUrl || e.data.content?.imageUri || e.data.content?.remoteUrl || e.data.content?.fileUrl
    element.setAttribute('url', url);
    element.setAttribute('user-id', e.data.senderUserId);
    element.setAttribute('sent-time', `${e.data.sentTime}`);
    element.setAttribute('message-type', `${e.data.messageType}`);
    element.setAttribute('message-uid', `${e.data.messageUId}`);
    element.setAttribute('content', `${e.data.content.content}`);
    appendChild(ctx, element);
  });

  ctx.addEventListener(RCKitEvents.COMBINE_MESSAGE_MODAL_EVENT, (e) => {
    const element: HTMLElement = document.createElement(InnerProviderTag.MODAL_COMBINE_MESSAGE_PROVIDER);
    element.addEventListener('cancel', (event: any) => {
      ctx.audioPlayer.pause();
      element.remove();
    });
    element.addEventListener('download', (event: any) => {
      ctx.emit(new RCKitEvent(RCKitEvents.DOWNLOAD_LINK_EVENT, event.detail[0]));
    });
    const url = e.data.content.remoteUrl || '';
    element.setAttribute('url', url);
    const content = e.data.content || {};
    const type = e.data.messageType || MessageType.COMBINE_V2;
    element.setAttribute('content', JSON.stringify(content));
    element.setAttribute('type', type);
    element.setAttribute('message-uid', `${e.data.messageUId}`);
    appendChild(ctx, element);
  });

  // 文本消息中邮箱和链接事件通知
  ctx.addEventListener(RCKitEvents.MESSAGE_LINK_CLICK, (e) => {
    if (e.data.type === 'mail') {
      location.href = `mailto:${e.data.address}`;
      return
    }
    window.open(e.data.address);
  });

  ctx.addEventListener(InnerEvent.GROUP_MEMBERS_UPDATE, async (e) => {
    if (!openedConversation.value) {
      return;
    }

    const { groupId, members } = e.data;

    const { conversationType, targetId } = openedConversation.value;
    if (conversationType !== ConversationType.GROUP || targetId !== e.data.groupId) {
      return;
    }

    // 更新群成员列表数据
    const users = await _ctx.appData.requestUserProfiles(members.map(item => item.userId));
    if (!openedConversation.value || openedConversation.value.conversationType !== ConversationType.GROUP || openedConversation.value.targetId !== groupId) {
      // 数据请求是异步的，需要在数据获取后判断是否重新切换了会话
      return;
    }

    selectedGroupMembers.value.splice(0, selectedGroupMembers.value.length, ...users.filter(item => item.userId !== _ctx.userId).map((item, index) => ({
      userId: item.userId,
      nickname: members[index].nickname,
      name: item.name,
      portraitUri: item.portraitUri,
    })));
  });

  /** 群组信息更新，同时需要更新当前打开会话的信息 */
  ctx.addEventListener(InnerEvent.GROUP_PROFILES_UPDATE, async (e) => {
    if (!openedConversation.value) {
      return;
    }
    const { conversationType, targetId } = openedConversation.value;
    const newConv = { ...openedConversation.value }
    e.data.forEach((item) => {
      const { groupId, memberCount, name } = item;

      if (conversationType == ConversationType.GROUP && targetId === groupId) {
        newConv.name = name;
        newConv.memberCount = memberCount;
        openedConversation.value = newConv;
      }
    })
  });
}

const messageComponentTags: Record<string, string> = {
  [MessageType.TextMessage]: InnerComponentTag.TEXT_MESSAGE,
  [MessageType.IMAGE]: InnerComponentTag.IMAGE_MESSAGE,
  [MessageType.SIGHT]: InnerComponentTag.SIGHT_MESSAGE,
  [MessageType.FILE]: InnerComponentTag.FILE_MESSAGE,
  [MessageType.REFERENCE]: InnerComponentTag.REFERENCE_MESSAGE,
  [MessageType.COMBINE]: InnerComponentTag.COMBINE_V2_MESSAGE,
  [MessageType.COMBINE_V2]: InnerComponentTag.COMBINE_V2_MESSAGE,
  [MessageType.HQ_VOICE]: InnerProviderTag.HQ_VOICE_MESSAGE_PROVIDER,
  [MessageType.GIF]: InnerComponentTag.GIF_MESSAGE,
};

const customMessageDigestHandlers: Map<string, (message: IAReceivedMessage, language: string) => string> = new Map();

/**
 * 设置自定义消息的内容摘要计算函数
 * @param messageType - 消息类型
 * @param getContent - 获取灰条消息内容的钩子函数，用于消息列表内容展示
 * @param digest - 获取灰条消息摘要的钩子函数，用于会话最后一条消息展示
 */
export const setCustomMessageDigestHandler = (
  messageType: string,
  digest: (message: IAReceivedMessage, language: string) => string,
) => {
  customMessageDigestHandlers.set(messageType, digest);
}

// 注册撤回消息为小灰条
// todo: 还需判断哪些内置消息需要注册为小灰条消息
setCustomMessageDigestHandler('RC:RcCmd', (message) => {
  if (message.senderUserId === _ctx.userId) {
    return $tt('message.list.recall.by.self')
  }
  const name = _ctx.appData.getUserProfile(message.senderUserId).name
  return $tt('message.list.recall.by.other', name)
})

setCustomMessageDigestHandler('RC:RcNtf', (message) => {
  if (message.senderUserId === _ctx.userId) {
    return $tt('message.list.recall.by.self')
  }
  const name = _ctx.appData.getUserProfile(message.senderUserId).name
  return $tt('message.list.recall.by.other', name)
})

/**
 * 注册消息渲染组件标签
 * @param messageType
 * @param tag
 */
export const regMessageTypeComponentTag = (messageType: string, tag: string) => {
  messageComponentTags[messageType] = tag;
};

export const getMessageComponentTag = (messageType: string): string => {
  return messageComponentTags[messageType] || "rc-unsupported-message";
};

/**
 * 检测消息是否为灰条消息
 * @param messageType
 * @returns
 */
export const isGreyMessage = (messageType: string): boolean => {
  return !messageComponentTags[messageType];
};

/**
 * 消息转发
 * @description 该方法会弹窗确认框，并根据用户选择行为执行转发操作
 * @param forwardType - 转发类型
 * @returns - boolean 值，`true` 表示用户确认转发，`false` 表示用户已取消
 */
export const forwarding = async (forwardType: RCKitModalForwardingType, messages: IAReceivedMessage[]): Promise<boolean> => {
  // 弹窗确认
  const evt: ForwardingEvent = new RCKitEvent(RCKitEvents.FORWARDING_EVENT, forwardType);
  _ctx.emit(evt);
  const { type, list } = await evt.awaitResult();
  if (type === RCKitModalBtnType.CANCEL || !(list instanceof Array) || list.length === 0) {
    // 用户取消或其他返回值异常
    // TODO: 该事件会被业务层捕获，因此需对数据进行校验
    return false;
  }

  const conversationList = list.map((item) => ({
    conversationType: item.conversationType,
    targetId: item.targetId,
    channelId: item.channelId,
  }));

  if (forwardType === RCKitModalForwardingType.SINGLE) {
    // 逐条转发
    conversationList.forEach((item) => _ctx.message.forward(item, messages.slice()));
  } else {
    // 合并转发
    conversationList.forEach((item) => _ctx.message.sendCombineMessage(item, messages.slice()));
  }

  // 合并转发
  return true;
}
export const handleDeleteMessage = async (messages: IAReceivedMessage[]) => {
  if (messages.length === 0) {
    return;
  }

  const crtUserId = _ctx.userId;
  // 所有消息必然属于同一会话，因此取第一条消息作为会话参数即可
  const conversation: IConversationOption = messages[0];
  // 只有己方发送的消息（不是发送中, 发送失败）可撤回
  const maxRecallDuration = _ctx.allowedToRecallTime;
  const recallEnable = messages.every(item => item.senderUserId === crtUserId && item.sentStatus !== SentStatus.SENDING && item.sentStatus !== SentStatus.FAILED && ((maxRecallDuration * 1000 + item.sentTime) > Date.now()));
  // 弹窗确认弹窗，允许业务层自定义弹窗
  const evt: DeleteMessageModalEvent = new RCKitEvent(RCKitEvents.DELETE_MESSAGE_MODAL_EVENT, { messages, recallEnable });
  _ctx.emit(evt);
  const { type, recall } = await evt.awaitResult();

  if (type === RCKitModalBtnType.CANCEL) {
    // 取消删除
    return;
  }

  // 批量删除
  _ctx.message.deleteMessages(conversation, messages, !!recall);
  multiChoiceMode.value = false;
}

// 判断消息状态是否显示
export const handleShowSentStatus = (msg: IRCKitCachedMessage | null): boolean => {
  if (!msg) return false
  if (msg.messageType === MessageType.RECALL || msg.messageType === MessageType.RECALL_NOTIFICATION_MESSAGE) return false;

  const isSelf = msg.senderUserId === _ctx.userId;

  if (_ctx.store.getCommandSwitch(RCKitCommand.SHOW_MESSAGE_STATE) && isSelf) return true
  if (
    (msg.sentStatus === SentStatus.FAILED || msg.sentStatus === SentStatus.SENDING) &&
    isSelf
  ) return true

  return false
}

/**
 * 获取消息摘要信息
 */
export const getMessageDigest = (message: IRCKitCachedMessage | null): string => {
  if (!message) {
    return ' '
  }

  // 内置消息摘要计算

  const { messageType, content, senderUserId } = message;
  if (messageType === MessageType.TextMessage || messageType === MessageType.REFERENCE) {
    return content.content || ' ';
  }
  if (messageType === MessageType.RECALL || messageType === MessageType.RECALL_NOTIFICATION_MESSAGE) {
    if (senderUserId === _ctx.userId) {
      return $tt('message.list.recall.by.self')
    }
    const name = _ctx.appData.getUserProfile(senderUserId).name
    return $tt('message.list.recall.by.other', name)
  }

  const messageTypes: string[] = [
    MessageType.IMAGE,
    MessageType.GIF,
    MessageType.VOICE,
    MessageType.HQ_VOICE,
    MessageType.FILE,
    MessageType.SIGHT,
    MessageType.COMBINE,
    MessageType.COMBINE_V2,
  ];
  if (messageTypes.includes(messageType)) {
    const name = `message-type.${messageType}` as keyof IRCKitLanguageEntries
    return $tt(name)
  }

  // 自定义消息摘要计算
  if (!customMessageDigestHandlers.has(messageType)) {
    return $tt('message-type.unknown')
  }
  const digest = customMessageDigestHandlers.get(messageType)!;
  return computed(() => digest(message, lang.value)).value;
}
