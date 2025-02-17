import { IRCKitLanguageEntries } from './IRCKitLanguageEntries';

const entries: IRCKitLanguageEntries = {
  'conv.loading.msg': 'Loading...',
  'conv.mentioned.me.msg': '@me',
  'conv.mentioned.all.msg': '@all',
  'conv.draft.msg': 'Draft',

  'message.list.select': 'Select the following message',
  'message.list.unselect': 'Unselect',
  'message.list.recall.by.self': 'You deleted one message',
  'message.list.recall.by.other': '{0} deleted one message',
  'message.list.read': 'Seen',
  'message.list.back': 'Back',
  'message.list.reedit': 'Reedit',


  // 消息类型
  'message-type.RC:ImgMsg': '[Image]',
  'message-type.RC:HQVCMsg': '[Audio]',
  'message-type.RC:VcMsg': '[Audio]',
  'message-type.RC:GIFMsg': '[Image]',
  'message-type.RC:FileMsg': '[File]',
  'message-type.RC:SightMsg': '[Video]',
  'message-type.RC:ImgTextMsg': '[Image text]',
  'message-type.RC:LBSMsg': '[Location]',
  'message-type.RC:CombineMsg': '[Combine]',
  'message-type.RC:CombineV2Msg': '[Combine]',
  'message-type.RC:ReferenceMsg': '[Reference]',
  'message-type.unknown': '[Unsupported message types]',

  // 时间格式
  'time.format.today': 'Today',
  'time.format.yesterday': 'Yesterday',
  'time.format.monday': 'Mon',
  'time.format.tueday': 'Tue',
  'time.format.wedday': 'Wed',
  'time.format.thurday': 'Thur',
  'time.format.friday': 'Fri',
  'time.format.satday': 'Sat',
  'time.format.sunday': 'Sun',
  'time.format.full': '{0}/{1}/{2}',

  // 输入框菜单
  'input.menu.item.photo': 'Photo',
  'input.menu.item.images': 'Image',
  'input.menu.item.files': 'File',
  'input.menu.item.emoji': 'Emoji',
  'input.placeholder': 'Shift + Enter for newline, Enter for send',
  'input.reply.prefix': 'Reply ',
  'input.mentioned.all': 'All',
  'input.placeholder.search': 'search',

  'conversation.menu.item.add_top': 'Pin',
  'conversation.menu.item.remove_top': 'Unpin',
  'conversation.menu.item.mute': 'Mute',
  'conversation.menu.item.unmute': 'Unmute',
  'conversation.menu.item.mark_read': 'Mark as read',
  'conversation.menu.item.mark_unread': 'Mark as unread',
  'conversation.menu.item.remove': 'Delete',

  'message.menu.item.reply': 'Reply',
  'message.menu.item.multi.choice': 'Select',
  'message.menu.item.copy': 'Copy',
  'message.menu.item.forward': 'Forward',
  'message.menu.item.delete': 'Delete',

  'conversation.empty.desc': 'No messages',
  'conversation.list.empty.desc': 'No Conversation',
  'conversation.detail.bar.typing': 'Typing...',

  // 警告信息
  'alert.req.msg.error': 'Request message failed: {0}',
  'alert.pickfiles.maxcount': 'You can only select up to {0} files',
  'alert.paste.not.supported': 'Paste is not supported in your browser',
  'alert.delete.message.failed': 'Delete message failed: {0}',
  'alert.delete.messages.partial.failure': 'Delete {0} messages failed',
  'alert.delete.conversation.failed': 'Delete conversation failed: {0}',
  'alert.forward.not.supported': 'The {0} selected message cannot be forwarded',
  'alert.forward.over.length': 'Select up to 100 chat transcripts',
  'alert.send.message.maxcount': 'Exceeds {0} characters, please delete some and try again.',
  'alert.message-deleted': 'Message deleted',
  'alert.conversation.list.not.ready': 'Conversation list is not ready, please try again later',

  'dialog.delete.msg': 'Are you sure to delete this message?',
  'dialog.tips.msg': 'Tips',
  'dialog.cancel.msg': 'Cancel',
  'dialog.confirm.msg': 'OK',
  'dialog.forwarding.msg': 'Forward it to',
  'dialog.recall.msg': 'Also delete for everyone',

  'take-photo.send-btn.label': 'Send',
  'take-photo.cancel-btn.label': 'Cancel',
  'take-photo.retry-btn.label': 'Retry',
  'take-photo.msg.camera-starting': 'Camera starting...',
  'take-photo.msg.camera-startup-failure': 'Camera startup failure: {0}',

  'multi-choice.menu.selected-count': 'Selected {0} items',
  'multi-choice.menu.merge-forward': 'Merge Forward',
  'multi-choice.menu.forward-item-by-item': 'Forward',
  'multi-choice.menu.delete': 'Delete',

  'private.combine-msg.title': '{0} and {1} chat history',
  'private.combine-msg.signal.title': '{0}\'s chat history',
  'group.combine-msg.title': 'Group chat history',

  'connection.status.suspended': 'Network Unavailabel',
  'connection.status.disconnected': 'Active disconnection',
  'connection.status.connecting': 'Connecting...'
};

export default entries;
