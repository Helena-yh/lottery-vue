/**
 * 语言包词条
 */
export interface IRCKitLanguageEntries {
  'conv.loading.msg': string,
  'conv.mentioned.me.msg': string,
  'conv.mentioned.all.msg': string,
  'conv.draft.msg': string,
  
  'message.list.select': string,
  'message.list.unselect': string,
  'message.list.recall.by.self': string,
  'message.list.recall.by.other': string,
  'message.list.read': string,
  'message.list.back': string,
  'message.list.reedit': string,
  
  // 消息类型
  'message-type.RC:ImgMsg': string,
  'message-type.RC:HQVCMsg': string,
  'message-type.RC:VcMsg': string,
  'message-type.RC:GIFMsg': string,
  'message-type.RC:FileMsg': string,
  'message-type.RC:SightMsg': string,
  'message-type.RC:ImgTextMsg': string,
  'message-type.RC:LBSMsg': string,
  'message-type.RC:CombineMsg': string,
  'message-type.RC:CombineV2Msg': string,
  'message-type.RC:ReferenceMsg': string,
  'message-type.unknown': string,

  // 时间格式
  'time.format.today': string,
  'time.format.yesterday': string,
  'time.format.monday': string,
  'time.format.tueday': string,
  'time.format.wedday': string,
  'time.format.thurday': string,
  'time.format.friday': string,
  'time.format.satday': string,
  'time.format.sunday': string,
  'time.format.full': string,

  // 输入框组件
  'input.menu.item.photo': string,
  'input.menu.item.images': string,
  'input.menu.item.files': string,
  'input.menu.item.emoji': string,
  'input.placeholder': string,
  'input.reply.prefix': string,
  'input.mentioned.all': string,
  'input.placeholder.search': string,

  // 会话菜单
  'conversation.menu.item.add_top': string,
  'conversation.menu.item.remove_top': string,
  'conversation.menu.item.mute': string,
  'conversation.menu.item.unmute': string,
  'conversation.menu.item.mark_read': string,
  'conversation.menu.item.mark_unread': string,
  'conversation.menu.item.remove': string,

  // 消息菜单
  'message.menu.item.reply': string,
  'message.menu.item.multi.choice': string,
  'message.menu.item.copy': string,
  'message.menu.item.forward': string,
  'message.menu.item.delete': string,

  'conversation.empty.desc': string,
  'conversation.list.empty.desc': string,
  'conversation.detail.bar.typing': string,

  // 警告信息
  'alert.req.msg.error': string,
  'alert.pickfiles.maxcount': string,
  'alert.paste.not.supported': string,
  'alert.delete.message.failed': string,
  'alert.delete.messages.partial.failure': string,
  'alert.delete.conversation.failed': string,
  'alert.forward.not.supported': string,
  'alert.forward.over.length': string,
  'alert.send.message.maxcount': string,
  'alert.message-deleted': string,
  'alert.conversation.list.not.ready': string,

  'dialog.delete.msg': string,
  'dialog.tips.msg': string,
  'dialog.cancel.msg': string,
  'dialog.confirm.msg': string,
  'dialog.forwarding.msg': string,
  'dialog.recall.msg': string,

  'take-photo.send-btn.label': string,
  'take-photo.cancel-btn.label': string,
  'take-photo.retry-btn.label': string,
  'take-photo.msg.camera-starting': string,
  'take-photo.msg.camera-startup-failure': string,

  'multi-choice.menu.selected-count': string,
  'multi-choice.menu.merge-forward': string,
  'multi-choice.menu.forward-item-by-item': string,
  'multi-choice.menu.delete': string,

  'private.combine-msg.title': string,
  'group.combine-msg.title': string,
  'private.combine-msg.signal.title': string,

  'connection.status.suspended': string,
  'connection.status.disconnected': string,
  'connection.status.connecting': string,
}
