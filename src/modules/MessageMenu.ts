import {
  MSG_MENU_COPY_ICON, MSG_MENU_DEELTE_ICON, MSG_MENU_REPLY_ICON, MSG_MENU_SELECT_ICON, MSG_MENU_FORWARD_ICON,
} from '../assets';
import { IRCKitCachedMessage } from './MessageDataModule';
import { RCKitModule } from './RCKitModule';
import { MessageType, SentStatus } from '@rongcloud/imlib-next';

/**
 * 消息菜单项 ID
 */
export enum RCKitMessageMenuID {
  /** 回复/引用 */
  REPLY = 'message.menu.item.reply',
  /** 多选 */
  MULIT_CHOICE = 'message.menu.item.multi.choice',
  /** 复制 */
  COPY = 'message.menu.item.copy',
  /** 转发 */
  FORWARD = 'message.menu.item.forward',
  /** 删除 */
  DELETE = 'message.menu.item.delete'
}

export interface IRCKitMessageMenuItem {
  /**
   * 菜单 ID，SDK 在派发点击事件时包含此数据，同时也通过此 ID 查询多语言 UI 展示文案
   */
  id: RCKitMessageMenuID | string,
  /**
   * 菜单图标
   */
  icon: string,
  /**
   * 过滤器，返回 true 时显示菜单，返回 false 时不显示菜单
   * @param message
   */
  readonly filter?: (message: IRCKitCachedMessage) => boolean,
}

const defaultMenu: IRCKitMessageMenuItem[] = [
  {
    id: RCKitMessageMenuID.REPLY,
    icon: MSG_MENU_REPLY_ICON,
    // 引用/回复 仅限文本消息、文件消息、图片消息、图文消息、引用消息，其他不显示
    filter: (message) => {
      const types = [MessageType.TEXT, MessageType.IMAGE, MessageType.FILE, MessageType.RICH_CONTENT, MessageType.REFERENCE];
      return types.includes(message.messageType) && message.sentStatus !== SentStatus.SENDING && message.sentStatus !== SentStatus.FAILED
    }
  },
  {
    id: RCKitMessageMenuID.COPY,
    icon: MSG_MENU_COPY_ICON,
    filter: (message) => message.messageType === MessageType.TEXT && !!navigator.clipboard,
  },
  {
    id: RCKitMessageMenuID.FORWARD,
    icon: MSG_MENU_FORWARD_ICON,
    filter: (message) => {
      const types = [
        MessageType.TEXT, MessageType.IMAGE, MessageType.FILE,
        MessageType.RICH_CONTENT, MessageType.HQ_VOICE, MessageType.VOICE,
        MessageType.COMBINE, MessageType.COMBINE_V2, MessageType.GIF,
        MessageType.SIGHT, MessageType.FILE, MessageType.REFERENCE,
      ];
      return types.includes(message.messageType) && message.sentStatus !== SentStatus.SENDING && message.sentStatus !== SentStatus.FAILED
    }
  },
  {
    id: RCKitMessageMenuID.MULIT_CHOICE,
    icon: MSG_MENU_SELECT_ICON,
  },
  {
    id: RCKitMessageMenuID.DELETE,
    icon: MSG_MENU_DEELTE_ICON,
    filter: (message) => message.sentStatus !== SentStatus.SENDING,
  },
];

const cloneMsgMenu = (menu: IRCKitMessageMenuItem[]): IRCKitMessageMenuItem[] => menu.map((item) => ({ ...item }));

export class MessageMenu extends RCKitModule {
  private _menu: IRCKitMessageMenuItem[] = cloneMsgMenu(defaultMenu);

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
    this._menu = cloneMsgMenu(defaultMenu);
  }

  getMenu(message: IRCKitCachedMessage): IRCKitMessageMenuItem[] {
    return this._menu.filter((item) => !item.filter || item.filter(message));
  }

  public cloneMessageMenu(): IRCKitMessageMenuItem[] {
    return cloneMsgMenu(this._menu);
  }

  public setMessageMenu(menu: IRCKitMessageMenuItem[]) {
    this._menu = cloneMsgMenu(menu);
  }
}
