import { ErrorCode, IConversationOption, RCConnectionStatus } from '@rongcloud/engine';
import { RCKitEvent } from './RCKitEvent';
import { IRCKitCachedConversation } from '@lib/modules/conversation/IRCKitCachedConversation';
import { IRCKitCachedMessage } from '@lib/modules/MessageDataModule';
import { IAReceivedMessage } from '@rongcloud/imlib-next';
import { ICacheUserProfile } from '@lib/modules/appdata/UserCache';
import { ICacheGroupProfile, IRCKitGroupMemberProfile } from '@lib/modules/appdata/GroupCache';
import { ICacheSystemProfile } from '@lib/modules/appdata/SystemCache';

export interface IRCKitDeleteMessageData {
  /**
   * 被删除的原始消息
   */
  target: IRCKitCachedMessage
  /**
   * 替换的撤回消息，仅在撤回操作时存在
   */
  recallMsg?: IRCKitCachedMessage
}
export interface IRCKitConversationExtensionClick {
  /** 设置拓展功能时定义的 ID */
  id: string
  /** 点击功能时所处的当前会话数据 */
  conversation: IRCKitCachedConversation
}
export interface IRCKitConversationMenuItemClick {
  /** 会话菜单项 ID */
  id: string
  /** 会话数据 */
  conversation: IRCKitCachedConversation
}
export interface IRCKitInputMenuItemClick {
  id: string
  conversation: IRCKitCachedConversation
}
export interface IRCKitConversationIconClick {
  conversation: IConversationOption
  profile: {
    name: string
    nickname?: string
    userId: string
    portraitUri: string
  }
}
export interface IRCKitMessageMenuItemClick {
  /** 消息菜单项 ID */
  id: string;
  /** 消息数据 */
  message: IRCKitCachedMessage,
}
export interface IRCKitMessageLinckClick { 
  /** mail 或者 url */
  type: string,
  /** 地址 */
  address: string,
}

export enum RCKitModalBtnType {
  /** 取消按钮 */
  CANCEL = 0,
  /** 确认按钮 */
  CONFIRM = 1
}

export interface IRCKitConnectionStatusChange {
  status: RCConnectionStatus;
  code?: ErrorCode;
}
export class ConnectionStatusChangeEvent extends RCKitEvent<'CONNECTION_STATUS_CHANGE', IRCKitConnectionStatusChange> {
  constructor(status: RCConnectionStatus, code?: ErrorCode) {
    super(InnerEvent.CONNECTION_STATUS_CHANGE, { status, code });
  }
}

export type ConversationSelectedEvent = RCKitEvent<'CONVERSATION_SELECTED', IRCKitCachedConversation | null>;
export type ConfirmEvent = RCKitEvent<'CONFIRM_EVENT', string, boolean>;
export type AlertEvent = RCKitEvent<'ALERT_EVENT', string>;

export enum RCKitModalForwardingType {
  /** 单条转发 */
  SINGLE = 'single',
  /** 合并转发 */
  MERGE = 'merge',
}
export interface IRCKitModalForwardingResult {
  type: RCKitModalBtnType
  list?: IRCKitCachedConversation[]
}
export type ForwardingEvent = RCKitEvent<'FORWARDING_EVENT', RCKitModalForwardingType, IRCKitModalForwardingResult>;

export interface IRCKitModalDeleteMessage {
  /**
   * 所选中消息是否支持撤回
   */
  recallEnable: boolean
  /**
   * 待删除或撤回消息
   */
  messages: IRCKitCachedMessage[]
}
export interface IRCKitModalDeleteMessageResult {
  type: RCKitModalBtnType
  recall?: boolean,
}
export type DeleteMessageModalEvent = RCKitEvent<'DELETE_MESSAGE_MODAL_EVENT', IRCKitModalDeleteMessage, IRCKitModalDeleteMessageResult>;

export type UserProfilesUpdateEvent = RCKitEvent<'USER_PROFILES_UPDATE', ICacheUserProfile[]>;
export type GroupProfilesUpdateEvent = RCKitEvent<'GROUP_PROFILES_UPDATE', ICacheGroupProfile[]>;
export type GroupMembersUpdateEvent = RCKitEvent<'GROUP_MEMBERS_UPDATE', {
  groupId: string;
  members: IRCKitGroupMemberProfile[];
}>;
export type SystemProfilesUpdateEvent = RCKitEvent<'SYSTEM_PROFILES_UPDATE', ICacheSystemProfile[]>;
export type ConversationMenuItemClickEvent = RCKitEvent<'CONVERSATION_MENU_ITEM_CLICK', IRCKitConversationMenuItemClick>;
/**
 * 会话列表首屏渲染事件
 */
export type ConversationListFirstScreenRenderingEvent = RCKitEvent<'CONVERSATION_LIST_RESET', IRCKitCachedConversation[]>;
export type ConversationItemOrderChangeEvent = RCKitEvent<'CONVERSATION_ITEM_ORDER_CHANGE', {
  order: number;
  conversation: IRCKitCachedConversation;
}[]>;
export type ConversationListItemChangeEvent = RCKitEvent<'CONVERSATION_ITEM_CHANGE', IRCKitCachedConversation[]>;
export type ConversationItemRemoveEvent = RCKitEvent<'CONVERSATIN_ITEM_REMOVE', IRCKitCachedConversation[]>;
export type MessageStateChangeEvent = RCKitEvent<'MESSAGE_STATE_CHANGE', IRCKitCachedMessage[]>;
export type InsertNewMessagesEvent = RCKitEvent<'INSERT_NEW_MESSAGES', IRCKitCachedMessage[]>;
export type RecvNewMessagesEvent = RCKitEvent<'RECV_NEW_MESSAGES', IRCKitCachedMessage[]>;
export type FileUploadProgressEvent = RCKitEvent<'FILE_UPLOAD_PROGRESS', {
  message: IRCKitCachedMessage,
  /**
   * 上传进度，与 msg.progress 一致
   */
  progress: number;
}>;
export type MessagesDeletedEvent = RCKitEvent<'MESSAGES_DELETED', IRCKitDeleteMessageData[]>;
export type BeforeSystemConversationOpenEvent = RCKitEvent<'BEFORE_SYSTEM_CONVERSATION_OPEN', IRCKitCachedConversation>;

export type DownloadLinkEvent = RCKitEvent<'DOWNLOAD_LINK_EVENT', IRCKitCachedMessage>;
export type FileSendFailedEvent = RCKitEvent<'FILE_SEND_FAILED_EVENT', File[]>;

export type AudioPlayState = {
  /**
   * 播放进度
   */
  progress: number,
  /**
   * 播放状态
   * - playing: 播放中
   * - stopped: 已停止，需配合 process 确认停止原因是否为播放完成
   */
  status: 'playing' | 'stopped',
  /**
   * 播放中的音频所属消息 uid
   */
  messageUId: string,
  /**
   * 播放中的音频所属消息 transactionId
   */
  transactionId?: number,
}

/**
 * 音频消息播放事件
 */
export type AudioPlayEvent = RCKitEvent<'AUDIO_PLAY_EVENT', AudioPlayState>
export type SetTextareaValueEvent = RCKitEvent<'SET_TEXTAREA_VALUE_EVENT', string>

/**
 * 内部事件类型定义
 * @description - 对内事件继承对外事件定义，原因在于事件派发至外部时，外部未必会进行拦截处理，SDK 内部需要保持默认实现。
 */
export interface EventDefined {
  /**
   * 用户信息变更事件
   */
  USER_PROFILES_UPDATE: UserProfilesUpdateEvent,
  /**
   * 群组信息变更事件
   */
  GROUP_PROFILES_UPDATE: GroupProfilesUpdateEvent,
  /**
   * 群组成员信息变更事件
   */
  GROUP_MEMBERS_UPDATE: GroupMembersUpdateEvent,
  /**
   * 连接状态变更事件
   */
  CONNECTION_STATUS_CHANGE: ConnectionStatusChangeEvent,
  /**
   * 语言变更事件
   */
  LANGUAGE_CHANGE: RCKitEvent<'LANGUAGE_CHANGE', { lang: string, direction: 'ltr' | 'rtl' }>,
  /**
   * 会话列表首屏渲染事件
   */
  CONVERSATION_LIST_RESET: ConversationListFirstScreenRenderingEvent,
  /**
   * 会话列表项属性变更事件
   */
  CONVERSATION_ITEM_CHANGE: ConversationListItemChangeEvent,
  /**
   * 会话列表项顺序变更事件，会话列表接收到该事件后需要重新设置元素位置，并更新 UI 元素属性展示信息
   */
  CONVERSATION_ITEM_ORDER_CHANGE: ConversationItemOrderChangeEvent,
  /**
   * 会话列表项删除事件
   */
  CONVERSATIN_ITEM_REMOVE: ConversationItemRemoveEvent,
  /**
   * 选中会话变更事件
   */
  CONVERSATION_SELECTED: ConversationSelectedEvent,
  /**
   * 系统会话信息变更事件
   */
  SYSTEM_PROFILES_UPDATE: SystemProfilesUpdateEvent,
  /**
   * 通知销毁缓存数据，该事件仅在发现新登录用户与上次登录用户不一致时触发
   */
  DESTROY_USER_CACHE: RCKitEvent<'DESTROY_USER_CACHE'>,
  /**
   * 通知初始化缓存数据，该事件仅在用户首次登录后触发一次
   */
  INIT_USER_CACHE: RCKitEvent<'INIT_USER_CACHE'>,
  /**
   * 确认弹窗事件
   */
  CONFIRM_EVENT: ConfirmEvent,
  /**
   * 弹窗提醒事件
   */
  ALERT_EVENT: AlertEvent,
  /**
   * 消息转发弹框事件
   */
  FORWARDING_EVENT: ForwardingEvent,
  /**
   * 消息删除弹框事件
   */
  DELETE_MESSAGE_MODAL_EVENT: DeleteMessageModalEvent,
  /**
   * 媒体消息弹框事件
   */
  MEDIA_MESSAGE_MODAL_EVENT: RCKitEvent<'MEDIA_MESSAGE_MODAL_EVENT', IRCKitCachedMessage>,
  /**
   * 合并转发消息弹框事件
   */
  COMBINE_MESSAGE_MODAL_EVENT: RCKitEvent<'COMBINE_MESSAGE_MODAL_EVENT', IRCKitCachedMessage>,
  /**
   * 消息被删除或撤回通知
   */
  MESSAGES_DELETED: MessagesDeletedEvent,
  /**
   * 接收到 SDK 内部无法处理的消息，业务层可通过监听该事件获取消息
   */
  UNSCHEDULED_MESSAGES: RCKitEvent<'UNSCHEDULED_MESSAGES', IAReceivedMessage[]>,
  /**
   * 会话菜单项点击事件
   */
  CONVERSATION_MENU_ITEM_CLICK: ConversationMenuItemClickEvent,
  /**
   * 消息菜单项点击事件
   */
  MESSAGE_MENU_ITEM_CLICK: RCKitEvent<'MESSAGE_MENU_ITEM_CLICK', IRCKitMessageMenuItemClick>
  /**
   * 输入框菜单按钮点击事件
   */
  INPUT_MENU_ITEM_CLICK: RCKitEvent<'INPUT_MENU_ITEM_CLICK', IRCKitInputMenuItemClick>,
  /**
   * 系统会话打开前的事件，业务层可通过监听该事件拦截系统会话打开，以自定义系统会话的打开方式
   */
  BEFORE_SYSTEM_CONVERSATION_OPEN: BeforeSystemConversationOpenEvent,
  /**
   * 接收到新消息，UI 和各数据模块可根据该事件处理 UI 变更
   */
  RECV_NEW_MESSAGES: RecvNewMessagesEvent,
  /**
   * 插入新消息，UI 和各数据模块可根据该事件处理 UI 变更
   */
  INSERT_NEW_MESSAGES: InsertNewMessagesEvent,
  /**
   * 消息状态变更事件，一般为发送状态变更，或文件上传进度变更等
   */
  MESSAGE_STATE_CHANGE: MessageStateChangeEvent,
  /**
   * 上传进度变更事件
   */
  FILE_UPLOAD_PROGRESS: FileUploadProgressEvent,
  /**
   * 业务拓展功能按钮点击事件，直接向业务层派发
   */
  CONVERSATION_EXTENSION_CLICK: RCKitEvent<'CONVERSATION_EXTENSION_CLICK', IRCKitConversationExtensionClick>,
  /**
   * 消息列表头像点击事件
   */
  CONVERSATION_ICON_CLICK: RCKitEvent<'CONVERSATION_ICON_CLICK', IRCKitConversationIconClick>,
  /**
   * 消息列表 Header 头像点击事件
   */
  CONVERSATION_NAVI_CLICK: RCKitEvent<'CONVERSATION_NAVI_CLICK', IRCKitCachedConversation>,
  /**
   * 文本消息中链接点击事件
   */
  MESSAGE_LINK_CLICK: RCKitEvent<'MESSAGE_LINK_CLICK', IRCKitMessageLinckClick>
  DOWNLOAD_LINK_EVENT: DownloadLinkEvent,
  FILE_SEND_FAILED_EVENT: FileSendFailedEvent,
  /** 音频消息播放事件 */
  AUDIO_PLAY_EVENT: AudioPlayEvent,
  SET_TEXTAREA_VALUE_EVENT: SetTextareaValueEvent,
}

/**
 * 内部事件类型集合
 */
export enum InnerEvent {
  /**
   * 用户信息变更事件
   */
  USER_PROFILES_UPDATE = 'USER_PROFILES_UPDATE',
  /**
   * 群组信息变更事件
   */
  GROUP_PROFILES_UPDATE = 'GROUP_PROFILES_UPDATE',
  /**
   * 群组成员信息变更事件
   */
  GROUP_MEMBERS_UPDATE = 'GROUP_MEMBERS_UPDATE',
  INIT_USER_CACHE = 'INIT_USER_CACHE',
  DESTROY_USER_CACHE = 'DESTROY_USER_CACHE',
  SYSTEM_PROFILES_UPDATE = 'SYSTEM_PROFILES_UPDATE',
  CONVERSATION_ITEM_CHANGE = 'CONVERSATION_ITEM_CHANGE',
  CONVERSATION_LIST_RESET = 'CONVERSATION_LIST_RESET',
  CONVERSATION_ITEM_ORDER_CHANGE = 'CONVERSATION_ITEM_ORDER_CHANGE',
  CONVERSATIN_ITEM_REMOVE = 'CONVERSATIN_ITEM_REMOVE',
  MESSAGE_STATE_CHANGE = 'MESSAGE_STATE_CHANGE',
  INSERT_NEW_MESSAGES = 'INSERT_NEW_MESSAGES',
  FILE_UPLOAD_PROGRESS = 'FILE_UPLOAD_PROGRESS',
  LANGUAGE_CHANGE = 'LANGUAGE_CHANGE',
  AUDIO_PLAY_EVENT = 'AUDIO_PLAY_EVENT',
  SET_TEXTAREA_VALUE_EVENT = 'SET_TEXTAREA_VALUE_EVENT',
  /**
   * 接收到新消息事件（对内事件）
   */
  RECV_NEW_MESSAGES = 'RECV_NEW_MESSAGES',
  /**
   * 连接状态变更事件
   */
  CONNECTION_STATUS_CHANGE = 'CONNECTION_STATUS_CHANGE',
}

/**
 * 事件枚举
 */
export enum RCKitEvents {
  /**
   * 确认弹窗事件
   */
  CONFIRM_EVENT = 'CONFIRM_EVENT',
  /**
   * 弹窗提醒事件
   */
  ALERT_EVENT = 'ALERT_EVENT',
  /**
   * 消息删除弹框事件
   */
  DELETE_MESSAGE_MODAL_EVENT = 'DELETE_MESSAGE_MODAL_EVENT',
  /**
   * 媒体消息弹框事件
   */
  MEDIA_MESSAGE_MODAL_EVENT = 'MEDIA_MESSAGE_MODAL_EVENT',
  /**
   * 合并转发消息 V1 版本弹框事件
   */
  COMBINE_MESSAGE_MODAL_EVENT = 'COMBINE_MESSAGE_MODAL_EVENT',
  /**
   * 消息转发弹框事件
   */
  FORWARDING_EVENT = 'FORWARDING_EVENT',
  /**
   * 接收到 SDK 内部无法处理的消息，业务层可通过监听该事件获取消息
   */
  UNSCHEDULED_MESSAGES = 'UNSCHEDULED_MESSAGES',
  /**
   * 业务拓展功能按钮点击事件
   */
  CONVERSATION_EXTENSION_CLICK = 'CONVERSATION_EXTENSION_CLICK',
  /**
   * 系统会话打开前的事件，业务层可通过监听该事件拦截系统会话打开，以自定义系统会话的打开方式
   */
  BEFORE_SYSTEM_CONVERSATION_OPEN = 'BEFORE_SYSTEM_CONVERSATION_OPEN',
  /**
   * 会话菜单项点击事件
   */
  CONVERSATION_MENU_ITEM_CLICK = 'CONVERSATION_MENU_ITEM_CLICK',
  /**
   * 输入框菜单点击事件
   */
  INPUT_MENU_ITEM_CLICK = 'INPUT_MENU_ITEM_CLICK',
  /**
   * 选中会话变更事件，该事件会在会话列表中选中会话时触发
   */
  CONVERSATION_SELECTED = 'CONVERSATION_SELECTED',
  /**
   * 消息列表头像点击事件
   */
  CONVERSATION_ICON_CLICK = 'CONVERSATION_ICON_CLICK',
  /**
   * 消息列表 Header 头像点击事件
   */
  CONVERSATION_NAVI_CLICK = 'CONVERSATION_NAVI_CLICK',
  /**
   * 消息菜单点击事件
   */
  MESSAGE_MENU_ITEM_CLICK = 'MESSAGE_MENU_ITEM_CLICK',
  /**
   * 文本消息中链接点击事件
   */
  MESSAGE_LINK_CLICK = 'MESSAGE_LINK_CLICK',
  /**
   * 下载链接事件
   */
  DOWNLOAD_LINK_EVENT = 'DOWNLOAD_LINK_EVENT',
  /**
   * 文件发送失败事件，一般是由于文件超出尺寸限制或为空文件导致
   */
  FILE_SEND_FAILED_EVENT = 'FILE_SEND_FAILED_EVENT',
  /**
   * 消息被删除或撤回通知
   */
  MESSAGES_DELETED = 'MESSAGES_DELETED',
}

// test
// const d = new EventDispatcher<EventDefined>();
// d.addEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, (evt) => {});
// d.addEventListener(InnerEvent.GROUP_MEMBERS_UPDATE, (evt) => {});
// d.addEventListener(InnerEvent.GROUP_PROFILES_UPDATE, (evt) => {});
// d.addEventListener(InnerEvent.USER_PROFILES_UPDATE, (evt) => {});
// d.dispatchEvent(new RCKitEvent(InnerEvent.USER_PROFILES_UPDATE, []));