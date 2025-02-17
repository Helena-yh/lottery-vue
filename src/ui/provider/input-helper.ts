import { ref } from 'vue';
import {
  BaseMessage, ConversationType, GIFMessage, IConversationOption, ImageMessage, MentionedType, ReferenceMessage, TextMessage,
  MessageType,
} from '@rongcloud/imlib-next';
import { ctx, replyMessage, selectedGroupMembers } from './context';
import { IRCKitGifImageInfo } from '@lib/modules/InputModule';
import { $tt } from '../i18n-vue';

/** 是否显示二级菜单 */
export const secondaryVisible = ref(false);
/** 显示表情面板 */
export const showEmoji = ref(false);
/** 显示 @ 列表 */
export const showAtList = ref(false);
/** 当前 mentioned 用户列表 */
const mentionedUsers: Map<string, RegExp> = new Map();
/** 是否已添加 @所有人 相关标识 */
let atAll = false;


/**
 * 清空缓存的 @ 信息
 */
export const clearMentionedInfo = () => {
  atAll = false;
  mentionedUsers.clear();
};

/**
 * 添加 @ 人员
 * @param userId
 * @param textarea
 * @returns
 */
export const addMentionedUser = (userId: string, textarea: HTMLTextAreaElement, prefix: boolean = false) => {
  const groupMembers = selectedGroupMembers.value;
  const user = groupMembers.find((member) => member.userId === userId);
  if (!user) {
    return;
  }

  hidePrompt();
  const name = user.nickname || user.name;
  mentionedUsers.set(userId, new RegExp(`@${name}`));
  textarea.focus();
  const txt = prefix ? `@${name} ` : `${name} `;
  textarea.setRangeText(txt, textarea.selectionStart, textarea.selectionEnd, 'end');
};

export const handleAtAll = (textarea: HTMLTextAreaElement) => {
  atAll = true;
  hidePrompt();

  textarea.focus();
  textarea.setRangeText(`@${$tt('input.mentioned.all')} `, textarea.selectionStart, textarea.selectionEnd, 'end');
};

/** 隐藏输入相关弹窗 */
export const hidePrompt = () => {
  secondaryVisible.value = false;
  showEmoji.value = false;
  showAtList.value = false;
};

export const showEmojiPanel = () => {
  showEmoji.value = true;
};

export const sendImageEmoji = (evt: CustomEvent, conversation: IConversationOption) => {
  hidePrompt();
  const { detail } = evt;
  const { url, thumbnail, gif } = detail;
  let message: BaseMessage;
  if (gif) {
    const { size, width, height } = gif as IRCKitGifImageInfo;
    message = new GIFMessage({ gifDataSize: size, width, height, remoteUrl: url })
  } else {
    message = new ImageMessage({ content: thumbnail, imageUri: url });
  }
  ctx().message.sendMessage(conversation, message);
};

export const insertChatEmoji = (evt: CustomEvent, textarea: HTMLTextAreaElement) => {
  textarea.focus();
  textarea.setRangeText(evt.detail, textarea.selectionStart, textarea.selectionEnd, 'end');
  hidePrompt();
  // 发送输入中状态
  ctx().conversation.sendTypingStatus()
};

/** 选择文件 */
export const pickFiles = (filter: string, handle: (files: File[]) => void): void => {
  const element = document.createElement('input');
  element.type = 'file';
  element.accept = filter;
  element.multiple = true;
  element.onchange = () => handle(Array.from(element.files!));
  element.click();
};

/**
 * 展示 DOM 二级菜单
 * @param event
 * @param dom
 */
export const showSecondaryMenu = (event: MouseEvent, dom: HTMLElement) => {
  dom.style.bottom = '50px';
  secondaryVisible.value = true;
};

/**
 * shift 键是否按下
 */
let shiftDown = false;

/**
 * 键盘按下事件
 * @param e
 */
export const onKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Backspace':
      hidePrompt();
      break;
    case 'Shift':
      shiftDown = true;
      break;
    case 'ArrowRight':
    case 'ArrowLeft':
    case 'ArrowUp':
    case 'ArrowDown':
      break;
    default:
      break;
  }
};

/**
 * 键盘抬起事件
 * @param e
 */
export const onKeyUp = (e: KeyboardEvent) => {
  if (e.key === 'Shift') {
    shiftDown = false;
  }
};

export const handleInput = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement, event: InputEvent) => {
  const value = textarea.value;
  resizeTextarea(textarea, hidden, container, bar);

  // 输入框输入非 @ 字符关闭，群人员列表展示
  if(event.data !== '@') {
    showAtList.value = false;
  }
  // 判断 mentionedUsers 是否有变更，用户可能从任何位置增加或删除字符
  mentionedUsers.forEach((reg, userId) => {
    if (!reg.test(value)) {
      mentionedUsers.delete(userId);
    }
  });

  // 检查 @all 是否仍有效
  if (atAll) {
    const atAllTag = `@${$tt('input.mentioned.all')}`;
    if (!value.includes(atAllTag)) {
      atAll = false;
    }
  }

  ctx().conversation.sendTypingStatus();
}

export const resizeTextarea = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement) => {
  // 同步内容到 hidden，并在末尾为换行符时增加一个空标签以便于使 DOM 更新高度
  hidden.innerHTML = textarea.value.replace(/\n$/g, '<br>.').replace(/\n/g, '<br>');
  const height = Math.min((Math.floor(textarea.scrollHeight / 18), 5) * 18, hidden.scrollHeight);
  textarea.style.height = `${height}px`;
  container.style.height = `${height}px`;
  bar.style.height = `${height + 32}px`;
};

/**
 * 重置输入框内容，并重置元素尺寸
 */
export const resetTextareaValue = (textarea: HTMLTextAreaElement, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement, value?: string) => {
  textarea.value = value || '';
  resizeTextarea(textarea, hidden, container, bar);
};

export const onKeyPress = (e: KeyboardEvent, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement) => {
  switch (e.key) {
    case 'Enter':
      _handleEnter(e, hidden, container, bar);
      break;
    case '@':
      const conversation = ctx().conversation.getOpenedConversation()!;
      if (conversation.conversationType !== ConversationType.GROUP) {
        return;
      }
      hidePrompt();
      // 展示 @ 人员列表
      showAtList.value = true;
      break;
    default:
      break;
  }
};

const _handleEnter = (e: KeyboardEvent, hidden: HTMLDivElement, container: HTMLDivElement, bar: HTMLDivElement) => {
  const target = e.target as HTMLTextAreaElement;
  const conversation = ctx().conversation.getOpenedConversation()!;
  if (shiftDown) {
    // 正常换行行为
    return;
  }

  // 取消默认事件
  e.preventDefault();
  target.value = target.value.trim();
  const mentionedType = atAll ? MentionedType.ALL : MentionedType.SINGAL;
  if (target.value.length) {
    // 发送消息
    let msg: BaseMessage;
    if (replyMessage.value) {
      msg = new ReferenceMessage({
        content: target.value,
        referMsg: { ...replyMessage.value.content },
        referMsgUserId: replyMessage.value.senderUserId,
        objName: replyMessage.value.messageType,
        referMsgUid: replyMessage.value.messageUId,
      })
    } else {
      msg = new TextMessage({ content: target.value });
    }

    const isMentioned = atAll || mentionedUsers.size > 0;

    if (isMentioned) {
      msg.content.mentionedInfo = {
        type: mentionedType,
        userIdList: Array.from(mentionedUsers.keys()),
        mentionedContent: 'TODO: 补充内容'
      }
    }
    const verifyMessageType = [ MessageType.TEXT, MessageType.REFERENCE ].includes(msg.messageType)
    if (verifyMessageType && msg.content.content.length > 5000) {
      ctx().alert('alert.send.message.maxcount', '5000');
      return
    }
    ctx().message.sendMessage(conversation, msg, { isMentioned });

    replyMessage.value = null;
    // 清空内容，重置高度
    clearMentionedInfo();
    target.value = '';
  }
  resizeTextarea(target, hidden, container, bar);
}

export const onPaste = (event: ClipboardEvent) => {
  const paste: DataTransfer | null = event.clipboardData;
  if (!paste) {
    return;
  }

  if (paste.files.length === 0) {
    return;
  }

  event.preventDefault();

  const context = ctx();
  const conversation = context.conversation.getOpenedConversation()!;

  // 处理文件类型数据
  const files = Array.from(paste.files);
  if (files.length > 100) {
    context.alert('alert.pickfiles.maxcount', '100');
    return;
  }

  const validFiles = files.filter((file) => file.type !== '' && file.size > 0);
  if (validFiles.length === 0) {
    return;
  }

  context.message.sendFiles(conversation, validFiles);
};
