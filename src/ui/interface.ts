import { IRCKitCachedMessage } from "../modules/MessageDataModule";

/**
 * 消息组件 Props 数据结构定义
 */
export type IRCKitMessageComponentProps = {
  /**
   * 消息数据
   */
  message: IRCKitCachedMessage,
};
