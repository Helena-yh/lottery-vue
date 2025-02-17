import { IPluginGenerator, VersionManage } from '@rongcloud/engine';
import { IRCKitInitOpts, RCKitApplication } from './core/RCKitApplication';
import { RCKIT_COMMIT_VERSION, RCKIT_VERSION } from './constants';
import { LogTag } from './enums/LogTag';

VersionManage.add('Global_IM_UIKit', RCKIT_VERSION);

export type { IPushConfig } from '@rongcloud/engine';

export const RCKitInstaller: IPluginGenerator<RCKitApplication, IRCKitInitOpts> = {
  tag: 'GIMKit',
  verify(runtime) {
    return runtime.tag === 'browser' && typeof customElements !== 'undefined';
  },
  setup(context, _, options) {
    const logger = context.createLogger('GIMKit', 'IM');

    if (options.logLevel) {
      logger.setOutputLevel(options.logLevel);
    }

    logger.warn(LogTag.A_INIT_O, `Commit: ${RCKIT_COMMIT_VERSION}, Version: ${RCKIT_VERSION}`);
    return new RCKitApplication(context, logger, options);
  },
};

export type { RCKitLanguageDirection, IRCKitLanguageEntries } from './languages';
export type { RCKitEvent } from './core/RCKitEvent';
export type { IRCKitServiceHooks } from './modules/appdata/AppDataModule';
export type { IRCKitGroupProfile, IRCKitGroupMemberProfile } from './modules/appdata/GroupCache';
export type { IRCKitUserProfile, IRCKitUserOnlineStatus } from './modules/appdata/UserCache';
export type { IRCKitSystemProfile } from './modules/appdata/SystemCache';
export type { IRCKitCachedConversation } from './modules/conversation/IRCKitCachedConversation';
export { RCKitMentionedType } from './modules/conversation/RCKitMenthionedType';
export type { IRCKitCachedMessage } from './modules/MessageDataModule';
export { RCKIT_COMMIT_VERSION, RCKIT_VERSION } from './constants';
export type {
  IRCKitRegisterMessageTypeOpts, IRCKitCustomMessageComponentOpts
} from './ui'
export type {
  IRCKitComponentContext, IRCKitOverrideAbleComponentProps, IRCKitDefineCustomElementOptions,
  IRCKitHQVoiceMessageComponentProps,
} from './ui/override-able';
export { RCKitOverrideAbleComponent } from './ui/override-able';
export type { IRCKitInitOpts, RCKitApplication } from './core/RCKitApplication';
export { RCKitCommand } from './enums/RCKitCommand';
export { RCKitEvents, RCKitModalBtnType, RCKitModalForwardingType } from './core/EventDefined';
export type { 
  DeleteMessageModalEvent, BeforeSystemConversationOpenEvent, IRCKitModalDeleteMessage, IRCKitModalDeleteMessageResult,
  IRCKitModalForwardingResult, IRCKitConversationExtensionClick, IRCKitConversationMenuItemClick,
  IRCKitInputMenuItemClick, IRCKitConversationIconClick, IRCKitDeleteMessageData, IRCKitMessageMenuItemClick, IRCKitMessageLinckClick,
} from './core/EventDefined';
export type {
  IRCKitInputMenu, IRCKitInputMenumItem,
  IRCKitChatEmojiLibrary, IRCKitImageEmojiLibrary, IRCKitImageEmoji, IRCKitGifImageInfo,
} from './modules/InputModule';
export type { IRCKitMessageBubbleCfg } from './modules/BubbleModule';
export { RCKitBubbleLayout } from './modules/BubbleModule';
export { RCKitInputMenumPosition, RCKitInputMenumID, RCKitChatEmojiLibraryID } from './modules/InputModule';
export type {
  IRCKitConversationMenuItem, RCKitConversationMenuID,
} from './modules/ConversationMenu';
export type {
  IRCKitMessageMenuItem, RCKitMessageMenuID,
} from './modules/MessageMenu';
export type { IRCKitConversationExtension, IRCKitPushConfigHook } from './modules/RCKitStore';
