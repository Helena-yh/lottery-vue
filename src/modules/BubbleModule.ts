import { RCKitModule } from './RCKitModule';
import { RCKitContext } from '../core/RCKitContext';

/**
 * 消息气泡对齐方式
 */
export enum RCKitBubbleLayout {
  /**
   * 消息气泡全部居左侧显示
   */
  LEFT_JUSTIFYING = 'left-justifying',
  /**
   * 消息气泡左右分布，己方气泡显示在右侧，他人气泡显示在左侧
   */
  LEFT_RIGHT = 'left-right'
}

export interface IRCKitMessageBubbleCfg {
  /** 圆角半径 */
  redius?: number
  /** 消息对齐方式：左对齐 or 左右分布 */
  layout?: RCKitBubbleLayout
  /** 己方气泡背景色 */
  backgroundColorForMyself?: number
  /** 他人气泡背景色 */
  backgroundColorForOthers?: number
  /** 己方文本颜色 */
  textColorForMyself?: number
  /** 他人文本颜色 */
  textColorForOthers?: number
  /**
   * 单聊中展示己方头像，默认不展示
   */
  showMyProfileInPrivateConversation?: boolean
  /**
   * 单聊中展示己方名称，默认不展示
   */
  showMyNameInPrivateConversation?: boolean
  /**
   * 群聊中展示己方头像，默认不展示
   */
  showMyProfileInGroupConversation?: boolean
  /**
   * 群聊中展示己方名称，默认不展示
   */
  showMyNameInGroupConversation?: boolean
  /**
   * 单聊中展示对方头像，默认不展示
   */
  showOthersProfileInPrivateConversation?: boolean
  /**
   * 单聊中展示对方名称，默认不展示
   */
  showOthersNameInPrivateConversation?: boolean
  /**
   * 群聊中展示对方头像，默认展示
   */
  showOthersProfileInGroupConversation?: boolean
  /**
   * 群聊中展示对方名称，默认不展示
   */
  showOthersNameInGroupConversation?: boolean
}

/**
 * 默认气泡配置
 */
const defaultBubbleCfg: IRCKitMessageBubbleCfg = {
  redius: 8,
  layout: RCKitBubbleLayout.LEFT_RIGHT,
  backgroundColorForMyself: 0x0099FF,
  backgroundColorForOthers: 0xFFFFFF,
  textColorForMyself: 0xFFFFFF,
  textColorForOthers: 0x000000,
  showMyProfileInPrivateConversation: true,
  showMyNameInPrivateConversation: true,
  showMyProfileInGroupConversation: true,
  showMyNameInGroupConversation: true,
  showOthersProfileInPrivateConversation: true,
  showOthersNameInPrivateConversation: true,
  showOthersProfileInGroupConversation: true,
  showOthersNameInGroupConversation: true,

};
const cloneMessageBubbleCfg = (config: IRCKitMessageBubbleCfg) => ({ ...config });

export class BubbleModule extends RCKitModule {
  public messageBubbleCfg: IRCKitMessageBubbleCfg = {};

  constructor(ctx: RCKitContext) {
    super(ctx);

    this.setMessageBubbleCfg(defaultBubbleCfg);
  }

  protected _onInit(): void {
    // 无需实现
  }

  protected _onInitUserCache(): void {
    // 无需实现
  }

  protected _onDestroyUserCache(): void {
    // 无需实现
  }

  public destroy(): void {
    this.setMessageBubbleCfg(defaultBubbleCfg);
  }

  cloneMessageBubbleCfg(): IRCKitMessageBubbleCfg {
    return cloneMessageBubbleCfg(this.messageBubbleCfg);
  }

  setMessageBubbleCfg(bubbleCfg: IRCKitMessageBubbleCfg): void {
    this.messageBubbleCfg = { ...this.messageBubbleCfg, ...bubbleCfg };
  }
}
