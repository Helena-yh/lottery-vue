import groupProfile from './icon/group-portrait.svg?raw';
import userProfile from './icon/user-portrait.svg?raw';
import systemProfile from './icon/system-portrait.svg?raw';

import notification from './icon/notification.svg?raw';
import online from './icon/online.svg?raw';
import moreTags from './icon/more-tags.svg?raw';
import topIcon from './icon/top.svg?raw';
import checked from './icon/checked.svg?raw';
import search from './icon/search.svg?raw';
import triangle from './icon/triangle.svg?raw';

import modalClose from './icon/modal/close.svg?raw';
import modalDownload from './icon/modal/download.svg?raw';
import modalForward from './icon/modal/forward.svg?raw';

import inputPhotoIcon from './icon/input/icon-photo.svg?raw';
import inputImageIcon from './icon/input/icon-images.svg?raw';
import inputEmojiIcon from './icon/input/icon-emoji.svg?raw';
import inputPlusIcon from './icon/input/icon-plus.svg?raw';
import inputFilesIcon from './icon/input/icon-files.svg?raw';
import EmojiPanelEmojiBtnIcon from './icon/input/emoji-pannel-emoji.svg?raw';

import convMenuTopIcon from './icon/conversation-menu/top.svg?raw';
import convMenuUnTopIcon from './icon/conversation-menu/untop.svg?raw';
import convMenuUnmuteIcon from './icon/conversation-menu/unmute.svg?raw';
import convMenuMuteIcon from './icon/conversation-menu/mute.svg?raw';
import convMenuMarkReadedIcon from './icon/conversation-menu/mark-readed.svg?raw';
import convMenuMarkUnreadIcon from './icon/conversation-menu/mark-unread.svg?raw';
import convMenuDeleteIcon from './icon/conversation-menu/delete.svg?raw';

import MsgMenuDeleteIcon from './icon/message-menu/delete.svg?raw';
import MsgMenuCopyIcon from './icon/message-menu/copy.svg?raw';
import MsgMenuReplyIcon from './icon/message-menu/reply.svg?raw';
import MsgMenuSelectIcon from './icon/message-menu/select.svg?raw';
import MsgMenuForwardIcon from './icon/message-menu/forward.svg?raw';

import ConversationEmptyIcon from './icon/conversation-empty.svg?raw';
import GroupMembersIcon from './icon/group-members-icon.svg?raw';

import TakePhotoCancelIcon from './icon/take-photo/cancel-icon.svg?raw';
import TakePhotoRetryIcon from './icon/take-photo/retry-icon.svg?raw';
import TakePhotoCameraIcon from './icon/take-photo/camera-icon.svg?raw';

import MultiChoiceMenuCancelIcon from './icon/multi-choice-menu-cancel.svg?raw';

import AudioIcon from './icon/message/audio.svg?raw';
import AudioSelfIcon from './icon/message/audio-self.svg?raw';
import CombineIcon from './icon/message/combine.svg?raw';
import CombineSelfIcon from './icon/message/combine-self.svg?raw';
import AudioStopIcon from './icon/message/audio-stop.svg?raw';
import AudioStopSelfIcon from './icon/message/audio-stop-self.svg?raw';
import AudioRunIcon from './icon/message/audio-run.svg?raw';
import AudioRunSelfIcon from './icon/message/audio-run-self.svg?raw';
import ImageDefault from './icon/message/image-default.svg?raw';
import ImageFailed from './icon/message/image-failed.svg?raw';

import SentStatusFailedIcon from './icon/message/status-failed.svg?raw';
import SentStatusReadIcon from './icon/message/status-read.svg?raw';
import SentStatusUnreadIcon from './icon/message/status-unread.svg?raw';
import SentStatusSendingIcon from './icon/message/status-sending.svg?raw';
import SentStatusUnreadChatIcon from './icon/message/status-unread-chat.svg?raw';
import SentStatusSendingChatIcon from './icon/message/status-sending-chat.svg?raw';

export const MODAL_CLOSE_ICON = URL.createObjectURL(new Blob([modalClose], { type: 'image/svg+xml' }));
export const MODAL_DOWNLOAD_ICON = URL.createObjectURL(new Blob([modalDownload], { type: 'image/svg+xml' }));
export const MODAL_FORWARD_ICON = URL.createObjectURL(new Blob([modalForward], { type: 'image/svg+xml' }));


export const MSG_MENU_DEELTE_ICON = URL.createObjectURL(new Blob([MsgMenuDeleteIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_COPY_ICON = URL.createObjectURL(new Blob([MsgMenuCopyIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_REPLY_ICON = URL.createObjectURL(new Blob([MsgMenuReplyIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_SELECT_ICON = URL.createObjectURL(new Blob([MsgMenuSelectIcon], { type: 'image/svg+xml' }));
export const MSG_MENU_FORWARD_ICON = URL.createObjectURL(new Blob([MsgMenuForwardIcon], { type: 'image/svg+xml' }));

export const CONV_MENU_TOP_ICON = URL.createObjectURL(new Blob([convMenuTopIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_UNTOP_ICON = URL.createObjectURL(new Blob([convMenuUnTopIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_UNMUTE_ICON = URL.createObjectURL(new Blob([convMenuUnmuteIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_MUTE_ICON = URL.createObjectURL(new Blob([convMenuMuteIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_MARK_READED_ICON = URL.createObjectURL(new Blob([convMenuMarkReadedIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_MARK_UNREAD_ICON = URL.createObjectURL(new Blob([convMenuMarkUnreadIcon], { type: 'image/svg+xml' }));
export const CONV_MENU_DELETE_ICON = URL.createObjectURL(new Blob([convMenuDeleteIcon], { type: 'image/svg+xml' }));

export const INPUT_ICON_PHOTO = URL.createObjectURL(new Blob([inputPhotoIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_IMAGES = URL.createObjectURL(new Blob([inputImageIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_EMOJI = URL.createObjectURL(new Blob([inputEmojiIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_PLUS = URL.createObjectURL(new Blob([inputPlusIcon], { type: 'image/svg+xml' }));
export const INPUT_ICON_FILES = URL.createObjectURL(new Blob([inputFilesIcon], { type: 'image/svg+xml' }));
export const EMOJI_PANEL_EMOJI_BTN_ICON = URL.createObjectURL(new Blob([EmojiPanelEmojiBtnIcon], { type: 'image/svg+xml' }));

export const DEFAULT_GROUP_PORTRAIT_SVG = URL.createObjectURL(new Blob([groupProfile], { type: 'image/svg+xml' }));
export const DEFAULT_USER_PORTRAIT_SVG = URL.createObjectURL(new Blob([userProfile], { type: 'image/svg+xml' }));
export const DEFAULT_SYSTEM_PORTRAIT_SVG = URL.createObjectURL(new Blob([systemProfile], { type: 'image/svg+xml' }));

export const NOTIFICATION_SVG = URL.createObjectURL(new Blob([notification], { type: 'image/svg+xml' }));
export const ONLINE_SVG = URL.createObjectURL(new Blob([online], { type: 'image/svg+xml' }));
export const MORE_TAGS = URL.createObjectURL(new Blob([moreTags], { type: 'image/svg+xml' }));
export const TOP_ICON = URL.createObjectURL(new Blob([topIcon], { type: 'image/svg+xml' }));
export const CHECKED_ICON = URL.createObjectURL(new Blob([checked], { type: 'image/svg+xml' }));
export const SEARCH_ICON = URL.createObjectURL(new Blob([search], { type: 'image/svg+xml' }));
export const TRIANGLE_ICON = URL.createObjectURL(new Blob([triangle], { type: 'image/svg+xml' }));

export const CONVERSATION_EMPTY_ICON = URL.createObjectURL(new Blob([ConversationEmptyIcon], { type: 'image/svg+xml' }));
export const GROUP_MEMBERS_ICON = URL.createObjectURL(new Blob([GroupMembersIcon], { type: 'image/svg+xml' }));

export const TAKE_PHOTO_CANCEL_ICON = URL.createObjectURL(new Blob([TakePhotoCancelIcon], { type: 'image/svg+xml' }));
export const TAKE_PHOTO_RETRY_ICON = URL.createObjectURL(new Blob([TakePhotoRetryIcon], { type: 'image/svg+xml' }));
export const TAKE_PHOTO_CAMERA_ICON = URL.createObjectURL(new Blob([TakePhotoCameraIcon], { type: 'image/svg+xml' }));

export const MULTI_CHOICE_MENU_CANCEL_ICON = URL.createObjectURL(new Blob([MultiChoiceMenuCancelIcon], { type: 'image/svg+xml' }));

export const AUDIO_ICON = URL.createObjectURL(new Blob([AudioIcon], { type: 'image/svg+xml' }));
export const AUDIO_SELF_ICON = URL.createObjectURL(new Blob([AudioSelfIcon], { type: 'image/svg+xml' }));
export const COMBINE_ICON = URL.createObjectURL(new Blob([CombineIcon], { type: 'image/svg+xml' }));
export const COMBINE_SELF_ICON = URL.createObjectURL(new Blob([CombineSelfIcon], { type: 'image/svg+xml' }));
export const AUDIO_STOP_ICON = URL.createObjectURL(new Blob([AudioStopIcon], { type: 'image/svg+xml' }));
export const AUDIO_STOP_SELF_ICON = URL.createObjectURL(new Blob([AudioStopSelfIcon], { type: 'image/svg+xml' }));
export const AUDIO_RUN_ICON = URL.createObjectURL(new Blob([AudioRunIcon], { type: 'image/svg+xml' }));
export const AUDIO_RUN_SELF_ICON = URL.createObjectURL(new Blob([AudioRunSelfIcon], { type: 'image/svg+xml' }));
export const IMAGE_DEFAULT = URL.createObjectURL(new Blob([ImageDefault], { type: 'image/svg+xml' }));
export const IMAGE_FAILED = URL.createObjectURL(new Blob([ImageFailed], { type: 'image/svg+xml' }));

export const SENT_STATUS_FAILED_ICON = URL.createObjectURL(new Blob([SentStatusFailedIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_READ_ICON = URL.createObjectURL(new Blob([SentStatusReadIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_UNREAD_ICON = URL.createObjectURL(new Blob([SentStatusUnreadIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_SENDING_ICON = URL.createObjectURL(new Blob([SentStatusSendingIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_UNREAD_CHAT_ICON = URL.createObjectURL(new Blob([SentStatusUnreadChatIcon], { type: 'image/svg+xml' }));
export const SENT_STATUS_SENDING_CHAT_ICON = URL.createObjectURL(new Blob([SentStatusSendingChatIcon], { type: 'image/svg+xml' }));