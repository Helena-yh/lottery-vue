<template>
  <div class="rc-conversation-list-item" 
  :class="{
    'active-top': props.conversation.isTop,
    'active-selected': props.selected,
  }"
    >
    <rc-icon 
      class="rc-icon"
      :width="50"
      :height="50"
      :radius="50" 
      :url="props.conversation.portraitUri" 
      :online="props.conversation.online"></rc-icon>
    <div class="conversation-info">
      <div class="info-block" style="align-items: center;">
        <div style="max-width: 50%;">
          <rc-conversation-label :name="props.conversation.name"></rc-conversation-label>
        </div>
        <rc-icon-notification v-if="props.conversation.notificationLevel === 5"></rc-icon-notification>
        <rc-icon-top v-if="props.conversation.isTop"></rc-icon-top>
        <rc-conversation-time style="flex: auto;" :time="props.time"></rc-conversation-time>
      </div>
      <div class="info-block">
        <div class="rc-kit-conversation-draft" v-if="props.draft">
          <span class="draft">{{ draftMsg }}</span>
        </div>
        <div class="rc-kit-conversation-group" v-if="props.conversation.conversationType === ConversationType.GROUP && !props.draft">
          <span v-if="props.conversation.mentionedType" class="mentioned">{{ msg }}</span>
          <span v-if="props.name">{{ props.name }}: </span>
        </div>
        <rc-conversation-latest-message
          v-if="props.message || conversation.draft"
          class="rc-conversation-latest-message"
          :message="props.draft ? conversation.draft : props.message"
          :mentioned="props.conversation.mentionedType"></rc-conversation-latest-message>
        <rc-message-sent-status 
          v-if="props.statusEnable && !props.conversation.unreadCount && !props.conversation.markUnread && props.conversation.latestMessage"
          :type="1"
          :message="props.conversation.latestMessage"></rc-message-sent-status>
        <rc-conversation-unread v-else
          :markunread="props.conversation.markUnread" 
          :count="props.conversation.unreadCount" 
          :notification="props.conversation.notificationLevel"></rc-conversation-unread>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ConversationType } from '@rongcloud/engine';
import { IRCKitCachedConversation } from '../../modules/conversation/IRCKitCachedConversation';
import { $t } from '../i18n-vue';
const props = defineProps<{
  message: string,
  time: string,
  conversation: IRCKitCachedConversation,
  statusEnable: boolean | null,
  name: string,
  draft: boolean | null;
  selected: boolean | null;
}>()
const msg = $t('conv.mentioned.me.msg');
const draftMsg = $t('conv.draft.msg');
</script>
<style>
.rc-conversation-list-item {
  display: flex;
  height: 68px;
  align-items: center;
  padding: 0 5px;
  border-radius: 5px;
  cursor: pointer;
}
.rc-conversation-list-item.active-top {
  background-color: #EDF3FC;
}
.rc-conversation-list-item.active-selected {
  background-color: #E9F3FF;
}
.rc-conversation-list-item:hover {
  background-color:  #F1F1F1;
}
.rc-conversation-list-item .conversation-info {
  margin-left: 3px;
  flex: 1 1 auto;
  overflow: hidden;
}
.rc-conversation-list-item .conversation-info .info-block {
  display: flex;
  font-size: 12px;
}
.rc-conversation-latest-message {
  flex: 1;
  overflow: hidden;
  margin-right: 15px;
  min-height: 18px;
}
.rc-icon {
  position: relative;
  font-size: 0px;
  padding: 3px;
}
.rc-kit-conversation-group {
  color: #A1A1A1;
  line-height: 18px;
}
.mentioned {
  color: #D45F5F;
  margin-right: 5px;
}
.rc-kit-conversation-draft .draft {
  color: #D45F5F;
  margin-right: 5px;
}

</style>../../modules/conversation/ConversationDataModule