<template>
  <div class="rc-conversation-detail-bar">
    <!-- 群成员数量 -->
    <div class="info">
      <img @click="handleConversationNaviClick" class="icon" :src="conversation.portraitUri" alt="Conversation Icon">
      <span class="name">{{ conversation.name }}</span>
      <template v-if="isGroup">
        <img class="member-icon" :src="GROUP_MEMBERS_ICON" alt="Group Members Icon">
        <span class="member-count">{{ conversation.memberCount }}</span>
      </template>
      <span class="typing-content" v-if="showTypingStatus && !isGroup">{{ typingContent }}</span>
    </div>
    <!-- 动态功能区，允许业务层拓展 -->
    <div class="extension">
      <img class="extension-icon" v-for="item in list" :src="item.icon" :key="item.id" alt="Extension Icon" @click="handleExtension(item)">
    </div>
  </div>
</template>

<script setup lang="ts">
import { PropType, computed, onMounted, onUnmounted, ref } from 'vue';
import { IRCKitCachedConversation } from '../../modules/conversation/IRCKitCachedConversation';
import { ConversationType, addEventListener, removeEventListener, Events, ITypingStatusEvent } from '@rongcloud/imlib-next';
import { GROUP_MEMBERS_ICON } from '../../assets'
import { ctx, openedConversation } from './context';
import { IRCKitConversationExtension } from '../../modules/RCKitStore';
import { RCKitEvent } from '../../core/RCKitEvent';
import { isSameConversation } from "../../helper";
import { $t } from '../i18n-vue';
import { ConversationSelectedEvent, RCKitEvents } from '@lib/core/EventDefined';
import { StatisticKey } from '@lib/modules/Statistic';

const props = defineProps({
  conversation: {
    type: Object as PropType<IRCKitCachedConversation>,
    required: true,
  },
});
const isGroup = computed(() => props.conversation.conversationType === ConversationType.GROUP);

const context = ctx();
const extension = context.store.getConversationExtension();
const list = computed(() => extension.filter((item) => !item.filter || item.filter(props.conversation)));

const handleExtension = (item: IRCKitConversationExtension) => {
  context.emit(new RCKitEvent(RCKitEvents.CONVERSATION_EXTENSION_CLICK, {
    id: item.id, conversation: props.conversation
  }));
};

const handleConversationNaviClick = () => {
  context.statistic(StatisticKey.CONVERSATION_NAVI_CLICK);
  context.emit(new RCKitEvent(RCKitEvents.CONVERSATION_NAVI_CLICK, { ...props.conversation }), 2);
}

let typingTimer: any = null;
const showTypingStatus = ref<boolean>(false);
const typingContent = $t('conversation.detail.bar.typing');
/**
 * 对方正在输入中
 * @param evt
 */
const _onTypingStatus = (evt: ITypingStatusEvent) => {
  const hasCurrentConversation = evt.status.findIndex(
    (item) => (openedConversation.value && isSameConversation(item, openedConversation.value)),
  );
  if (hasCurrentConversation === -1) {
    return;
  }
  if (typingTimer) {
    clearTimeout(typingTimer);
    typingTimer = null;
  }
  showTypingStatus.value = true;
  typingTimer = setTimeout(() => {
    showTypingStatus.value = false;
  }, 5000);
}

const _onConversationSelected = (env: ConversationSelectedEvent) => {
  showTypingStatus.value = false
}

onMounted(() => {
  addEventListener(Events.TYPING_STATUS, _onTypingStatus);
  ctx().addEventListener(RCKitEvents.CONVERSATION_SELECTED, _onConversationSelected);
})

onUnmounted(() => {
  removeEventListener(Events.TYPING_STATUS, _onTypingStatus);
  ctx().removeEventListener(RCKitEvents.CONVERSATION_SELECTED, _onConversationSelected);
})

</script>

<style>
.rc-conversation-detail-bar {
  width: 100%;
  height: 68px;
  display: flex;
  flex-direction: row;
  align-items: center;
  border-bottom: 1px solid #efefef;
}
.info {
  display: flex;
  flex-direction: row;
  align-items: center;
  flex: auto;
}
.icon {
  width: 40px;
  height: 40px;
  margin: 0 10px 0 28px;
}
.name {
  font-size: 14px;
  color: #000;
}
.member-icon {
  margin: 0 4px 0 20px;
  width: 12px; height: 12px;
}
.member-count {
  font-size: 12px;
  color: #bcbcbc;
}
.extension {
  margin: 0 28px 0 10px;
}
.extension-icon {
  width: 26px;
  height: 26px;
  margin-right: 10px;
}
.typing-content {
  margin-left: 5px;
  font-size: 12px;
  color: #7B87A5;
}
</style>../../modules/conversation/ConversationDataModule
