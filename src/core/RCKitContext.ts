import { ILogger, RCConnectionStatus, PluginContext } from '@rongcloud/engine';
import {
  addEventListener, Events, getCurrentUserId, removeEventListener, ErrorCode,
} from '@rongcloud/imlib-next';

import { EventDispatcher } from './EventDispatcher';
import { RCKitStore } from '../modules/RCKitStore';
import { RCKitConversationStore } from '../modules/RCKitConversationStore';
import { AppDataModule } from '../modules/appdata/AppDataModule';
import { IRCKitInitOpts } from './RCKitApplication'
import { I18nModule } from '../modules/I18nModule';
import { RCKitEvent } from './RCKitEvent';
import { MessageModule } from '../modules/MessageDataModule';
import { InputModule } from '../modules/InputModule';
import { BubbleModule } from '../modules/BubbleModule';
import { ConversationMenu } from '../modules/ConversationMenu';
import { MessageMenu } from '../modules/MessageMenu';
import { IRCKitLanguageEntries } from '../languages';
import { AudioPlayer } from '../modules/AudioPlayer';
import { ConfirmEvent, ConnectionStatusChangeEvent, EventDefined, InnerEvent, RCKitEvents } from './EventDefined';
import { Statistic, StatisticKey } from '@lib/modules/Statistic';
import { ConversationDataModule } from '@lib/modules/conversation/ConversationDataModule';

/**
 * 业务上下文总线
 * @emits
 * - RCKitEvents.CONNECTION_STATUS_CHANGE - 连接状态变更
 * - RCKitEvents.USER_CHANGED - 用户变更，UI 与数据模块依据此事件判断是否需要清理缓存
 */
export class RCKitContext extends EventDispatcher<EventDefined> {
  public readonly store: RCKitStore;

  public conversationStore: RCKitConversationStore | null = null;

  public readonly i18n: I18nModule;

  public readonly appData: AppDataModule;

  public readonly message: MessageModule;

  public readonly conversation: ConversationDataModule;

  public readonly input: InputModule;

  public readonly bubble: BubbleModule;

  /** Audio 音频管理模块 */
  public readonly audioPlayer: AudioPlayer;

  /**
   * 会话菜单管理模块
   */
  public readonly conversationMenu: ConversationMenu;

  public readonly msgMenu: MessageMenu;

  /** 埋点模块 */
  private readonly _stat: Statistic;

  /** 登录的用户 ID，用于判断连接后是否已更换登录用户 */
  private _originUserId: string = '';

  /** 当前登录用户 ID */
  public get userId(): string {
    return this._originUserId;
  }

  /** 当前连接状态 */
  private _status: RCConnectionStatus = RCConnectionStatus.DISCONNECTED;

  /**
   * 是否运行在 Electron 版本 IMLib 引擎之上
   */
  public readonly isElectronRuntime = false;

  /**
   * IM 连接状态
   */
  public get status(): RCConnectionStatus {
    return this._status;
  }

  /**
   * 业务层定义的模态框容器
   */
  public readonly modalContainerId: string = ''

  /**
   * 允许撤回的时间范围，单位：秒
   */
  public readonly allowedToRecallTime: number;

  /**
   * 允许撤回消息编辑的时间范围，单位：秒
   */
  public readonly allowedToReEditTime: number;

  constructor(
    private context: PluginContext,
    public readonly logger: ILogger,
    /**
     * 业务层事件派发器
     */
    private readonly _emittor: EventDispatcher<EventDefined>,
    _opts: IRCKitInitOpts,
  ) {
    super();

    this._stat = new Statistic(context);

    this.modalContainerId = _opts.modalContainerId || '';
    this.allowedToRecallTime = _opts.allowedToRecallTime || 120;
    this.allowedToReEditTime = _opts.allowedToReEditTime || 60;

    this.store = new RCKitStore(logger);

    // UI 无关性模块初始化
    this.i18n = new I18nModule(this);
    this.audioPlayer = new AudioPlayer(this);
    this.appData = new AppDataModule(this, _opts.hooks);
    this.message = new MessageModule(this);
    this.conversation = new ConversationDataModule(this);
    this.input = new InputModule(this);
    this.bubble = new BubbleModule(this);
    this.conversationMenu = new ConversationMenu(this);
    this.msgMenu = new MessageMenu(this);

    // 设置默认语言
    if(_opts.language) {
      this.i18n.setLanguage(_opts.language);
    }

    addEventListener(Events.CONNECTED, this._onConnected, this);
    addEventListener(Events.DISCONNECT, this._onDisconnected, this);
    addEventListener(Events.SUSPEND, this._onSuspend, this);
    addEventListener(Events.CONNECTING, this._onConnecting, this);
  }

  private _onConnecting() {
    this._status = RCConnectionStatus.CONNECTING;
    this.dispatchEvent(new ConnectionStatusChangeEvent(RCConnectionStatus.CONNECTING));
  }

  private _onDisconnected(code: ErrorCode) {
    this._status = RCConnectionStatus.DISCONNECTED;
    this.dispatchEvent(new ConnectionStatusChangeEvent(RCConnectionStatus.DISCONNECTED, code));
  }

  private _onSuspend(code: ErrorCode) {
    this._status = RCConnectionStatus.SUSPENDED;
    this.dispatchEvent(new ConnectionStatusChangeEvent(RCConnectionStatus.SUSPENDED, code));
  }

  private _onConnected() {
    this._status = RCConnectionStatus.CONNECTED;

    // 重新连接后，userId 与原 ID 不匹配，说明用户已切换
    const newUserId = getCurrentUserId();

    if (this._originUserId === newUserId) {
      // 重新连接后，userId 与原 ID 匹配，说明用户未切换
      this.dispatchEvent(new ConnectionStatusChangeEvent(RCConnectionStatus.CONNECTED));
      return;
    }

    if (this._originUserId && this._originUserId !== newUserId) {
      // 重新连接后，userId 与原 ID 不匹配，说明用户已切换，UI 与数据层应清空数据缓存
      // 不在 disconnec 事件中清空，是为了避免重新登录后数据构建过程过长
      this._originUserId = newUserId;
      this.dispatchEvent(new RCKitEvent(InnerEvent.DESTROY_USER_CACHE), false);
    }

    // 首次连接
    this._originUserId = newUserId;
    // 通知 UI 与数据层构建数据缓存
    this.dispatchEvent(new RCKitEvent(InnerEvent.INIT_USER_CACHE), false);

    this.dispatchEvent(new ConnectionStatusChangeEvent(RCConnectionStatus.CONNECTED));

    this.conversationStore = new RCKitConversationStore(window, this.getAppkey(), this.userId, this.logger);
  }

  public destroy() {
    removeEventListener(Events.CONNECTED, this._onConnected, this);
    removeEventListener(Events.DISCONNECT, this._onDisconnected, this);
    removeEventListener(Events.SUSPEND, this._onSuspend, this);
    removeEventListener(Events.CONNECTING, this._onConnecting, this);

    this.i18n.destroy();
    this.appData.destroy();
    this.message.destroy();
    this.conversation.destroy();
    this.input.destroy();
    this.bubble.destroy();
    this.conversationMenu.destroy();
    this.msgMenu.destroy();

    this._originUserId = '';
  }

  /**
   * 弹窗提示
   * @param msgkey - 多语言词条 key
   */
  public alert(msgkey: keyof IRCKitLanguageEntries, ...args: Array<string | number>): void {
    this.emit(new RCKitEvent(RCKitEvents.ALERT_EVENT, this.i18n.format(msgkey, ...args)));
  }

  /**
   * 弹窗确认框，等待用户进行选择确认
   * @param msgkey - 多语言词条 key
   * @returns
   */
  public confirm(msgkey: keyof IRCKitLanguageEntries, ...args:  Array<string | number>): Promise<boolean> {
    const evt: ConfirmEvent = new RCKitEvent(RCKitEvents.CONFIRM_EVENT, this.i18n.format(msgkey, ...args));
    this.emit(evt);
    return evt.awaitResult();
  }

  /**
   * 派发事件，如果事件不需要向 App 层传递，应调用 `dispatchEvent`。
   * @param event - 事件
   * @param mode - 派发模式，默认值为 0
   * - 0. (default)优先向业务层派发，业务层弱拦截后，将停止向 SDK 内部继续传递
   * - 1. 向业务派发，同时向 SDK 内部派发，不受业务拦截影响，同时也不接收业务层的事件处理结果
   * - 2. 仅向业务层派发，SDK 内部不处理
   */
  emit<K extends keyof EventDefined>(event: EventDefined[K], mode: 0 | 1 | 2 = 0): void {
    // 对业务层派发的事件，使用 clone 复制实例
    const tmpEvent = event.clone(mode !== 0);
    // 立即执行监听器函数，避免 event.isDefaultPrevented() 无法获取到正确的值
    this._emittor.dispatchEvent(tmpEvent, false);

    if (mode === 2 || (mode === 0 && tmpEvent.isDefaultPrevented())) {
      // 若业务层已拦截事件，则统一不再向 SDK 内部派发，避免各模块分散处理引发混乱
      return;
    }

    // 将原始数据在 SDK 内部分发
    this.dispatchEvent(event);
  }

  /**
   * 获取当前的 appkey
   * @returns
   */
  getAppkey() {
    return this.context.getAppkey();
  }

  /**
   * 记录埋点数据
   * @param key
   * @param value
   */
  statistic(key: StatisticKey | string) {
    this._stat.report(key);
  }
}
