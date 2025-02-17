<template>
  <div class="rc-input-provider">
    <!-- emoji 面板 -->
    <rc-emoji-panel-provider v-if="showEmoji" class="rc-input-emoji-panel"
      @insert-chat="insertChatEmoji($event, textarea)" @send-image="sendImageEmoji($event, conversation)" />
    <!-- @ 人员列表 -->
    <rc-at-users-panel-provider @at-user="handleAtUser" @at-all="handleAtAll(textarea)" v-show="showAtList" :atAll="atAll"
      :members="selectedGroupMembers" style="width: 100%; box-sizing: border-box;" />
    <!-- 引用消息条 -->
    <rc-input-reply-bar class="replay-bar" v-if="replyMessage" :username="replyMessageSender" :desc="replyDesc"
      :thumbnail="replyThumbnail" @cancel="replyMessage = null"></rc-input-reply-bar>
    <div class="rc-input-bar" ref="main">
      <!-- 输入框左侧功能区 -->
      <div class="rc-input-bar-left" v-if="leftMenu.length">
        <img class="rc-input-menu-button" v-for="item in leftMenu" :src="item.icon" :alt="item.label"
          @click="handleMenuClick(item, $event)">
      </div>
      <!-- 输入框 -->
      <div class="input-text-container" ref="inputContainer">
        <textarea ref="textarea" class="textarea" :placeholder="placeholder" @keyup="onKeyUp" @keydown="onKeyDown"
          autofocus @keypress="onKeyPress($event, hiddenDom, inputContainer, main)"
          @input="handleInput(textarea, hiddenDom, inputContainer, main, $event as InputEvent)"></textarea>
        <!-- 用于动态计算调整 textarea 宽高 -->
        <div ref="hiddenDom" contenteditable class="hidden-dom"></div>
      </div>
      <!-- 输入框右侧功能区 -->
      <div class="rc-input-bar-right" v-if="rightMenu.length">
        <img class="rc-input-menu-button" v-for="item in rightMenu" :src="item.icon" :alt="item.label"
          @click="handleMenuClick(item, $event)">
      </div>
      <!-- 二级菜单 -->
      <div class="secondary-menu" ref="secondarDOM" v-show="secondaryVisible">
        <div v-for="item in secondaryMenu" class="secondary-menu-item" @click="handleMenuClick(item, $event)">
            <img :src="item.icon" alt="Icon"><span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import { RCKitEvent } from '../../core/RCKitEvent';
import { IRCKitCachedConversation } from '../../modules/conversation/IRCKitCachedConversation';
import { IRCKitInputMenumItem, RCKitInputMenumID } from '../../modules/InputModule';
import { $t } from '../i18n-vue';
import { cameraOpened, ctx, replyMessage, replyDesc, replyThumbnail, replyMessageSender, selectedGroupMembers, textarea, openedConversation } from './context';
import { IRCKitLanguageEntries } from '../../languages';
import {
  hidePrompt, pickFiles, secondaryVisible, showAtList, showEmoji, showSecondaryMenu, insertChatEmoji, sendImageEmoji,
  onKeyDown, onKeyPress, onKeyUp, onPaste, showEmojiPanel, handleInput, handleAtAll, addMentionedUser, clearMentionedInfo,
  resetTextareaValue, resizeTextarea,
} from './input-helper';
import { RCKitCommand } from '@lib/enums/RCKitCommand';
import { ConversationSelectedEvent, RCKitEvents, InnerEvent, SetTextareaValueEvent } from '@lib/core/EventDefined';
import { StatisticKey } from '@lib/modules/Statistic';

const context = ctx();

// at all 功能开关
const atAll = context.store.getCommandSwitch(RCKitCommand.AT_ALL);

const props = defineProps<{
  conversation: IRCKitCachedConversation;
}>();

const placeholder = $t('input.placeholder');

/** 二级菜单 DOM */
const secondarDOM = ref();
/** 主容器 DOM */
const main = ref();
const inputContainer = ref();
const hiddenDom = ref();

const filter = (item: IRCKitInputMenumItem) => !item.filter || item.filter(props.conversation)
const mapHandle = (item: IRCKitInputMenumItem) => ({ ...item, label: $t(item.id as keyof IRCKitLanguageEntries).value })

const secondaryMenu = computed(() => context.input.secondary.filter(filter).map(mapHandle));
const rightMenu = computed(() => context.input.right.filter(filter).map(mapHandle));
const leftMenu = computed(() => context.input.left.filter(filter).map(mapHandle));

const handleMenuClick = (item: IRCKitInputMenumItem, event: MouseEvent) => {
  const { id } = item;
  switch (id) {
    case RCKitInputMenumID.PLUS:
      event.stopPropagation();
      ctx().statistic(StatisticKey.CONVERSATION_INPUT_EXTEND_CLICK);
      showSecondaryMenu(event, secondarDOM.value);
      return;
    case RCKitInputMenumID.PHOTO:
      cameraOpened.value = true;
      return;
    case RCKitInputMenumID.EMOJI:
      event.stopPropagation();
      ctx().statistic(StatisticKey.INPUT_EMOJI_ENTRY_CLICK);
      showEmojiPanel();
      return;
    case RCKitInputMenumID.IMAGES:
      pickFiles('image/jpg, image/png, image/jpeg, image/gif', (files) => context.message.sendImages(props.conversation, files));
      return;
    case RCKitInputMenumID.FILES:
      pickFiles('*/*', (files) => context.message.sendFiles(props.conversation, files));
      return;
    default:
      // 业务自定义事件
      context.emit(new RCKitEvent(RCKitEvents.INPUT_MENU_ITEM_CLICK, { id, conversation: props.conversation }), 2);
      return;
  }
};

const handleAtUser = (evt: CustomEvent) => {
  const [userId] = evt.detail;
  addMentionedUser(userId, textarea.value);
};

const handleConversationOpen = async (evt: ConversationSelectedEvent) => {
  const draft = evt.data?.draft || ''
  // 选中回话发生变更，清理输入框既有内容
  replyMessage.value = null;
  hidePrompt();
  clearMentionedInfo();
  resetTextareaValue(textarea.value, hiddenDom.value, inputContainer.value, main.value, draft);
  textarea.value.focus();
};

const setTextareaValue = (e: SetTextareaValueEvent) => {
  if(!e.data) return
  textarea.value.focus();
  const length = textarea.value.value.length
  textarea.value.setRangeText(e.data, length, length, 'end');
  resizeTextarea(textarea.value, hiddenDom.value, inputContainer.value, main.value);
}

// 监听回复消息变更
watch(replyMessage, (val, oldVal) => {
  if (!val) {
    return;
  }
  // reply 消息变更，保留输入框信息和 MentionedInfo。只有切换会话和发送消息成功清空
  // clearMentionedInfo();
  // resetTextareaValue(textarea.value, hiddenDom.value, inputContainer.value, main.value);
  // 重新添加 @ 信息
  if (context.store.getCommandSwitch(RCKitCommand.PROMPT_SENDER_WHEN_QUOTE_MESSAGE)) {
    addMentionedUser(val.senderUserId, textarea.value, true);
  }
});

onMounted(() => {
  // 全局监听关闭
  window.addEventListener('click', hidePrompt);
  textarea.value.addEventListener('paste', onPaste);
  textarea.value.value = openedConversation.value?.draft || '';
  context.addEventListener(RCKitEvents.CONVERSATION_SELECTED, handleConversationOpen);
  context.addEventListener(InnerEvent.SET_TEXTAREA_VALUE_EVENT, setTextareaValue);
});
onBeforeUnmount(() => {
  // 全局移除监听
  window.removeEventListener('click', hidePrompt);
  textarea.value.removeEventListener('paste', onPaste);
  context.removeEventListener(RCKitEvents.CONVERSATION_SELECTED, handleConversationOpen);
})
</script>

<style>
.rc-input-provider {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #fff;
  align-items: center;
  justify-content: center;
}

.rc-input-emoji-panel,
.rc-input-at-prompt {
  float: left;
  width: 100%;
  height: 248px;
  border-bottom: 1px solid #efefef;
  border-top: 1px solid #efefef;
}

.rc-input-bar {
  width: 100%;
  max-width: 100%;
  min-height: 50px;
  height: 50px;
  display: flex;
  flex-direction: row;
  border-top: 1px solid #efefef;
  background-color: #fff;
  align-items: bottom;
}

.rc-input-bar-left,
.rc-input-bar-right {
  display: flex;
  flex-direction: row;
  align-items: center;
  margin: 0 8px;
}

.rc-input-menu-button {
  width: 26px;
  height: 26px;
  margin: auto 4px 12px;
}

.secondary-menu {
  position: absolute;
  min-width: 126px;
  background-color: #fff;
  border-radius: 9px;
  box-shadow: 0 0 4px 0 rgba(0, 0, 0, 0.1);
  padding: 18px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  font-size: 16px;
  color: #606060;
}

.secondary-menu-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  cursor: pointer;
  height: 34px;
}

.secondary-menu img {
  width: 18px;
  height: 18px;
  margin-right: 10px;
}

.input-text-container {
  background: none;
  width: 100%;
  font-size: 14px;
  overflow: hidden;
  padding: 10px 0px 10px 16px;
  line-height: 18px;
  min-height: 18px;
  background-color: #e9f0fb;
  border: none;
  border-radius: 6px;
  margin: 6px 0;
}

.textarea {
  border: none;
  outline: none;
  background: none;
  line-height: 18px;
  min-height: 18px;
  height: 18px;
  overflow-y: scroll;
  box-sizing: border-box;
  padding: 0 16px 0 0;
  width: calc(100% - 2px);
  resize: none;
  font-size: 14px;
  word-wrap: break-word;
}

.hidden-dom {
  border: none;
  outline: none;
  background: none;
  line-height: 18px;
  min-height: 18px;
  height: 18px;
  overflow: scroll;
  box-sizing: border-box;
  padding: 0 16px 0 0;
  width: calc(100% - 2px);
  resize: none;
  font-size: 14px;
  word-wrap: break-word;
  color: black;
  color: #e9f0fb;
  margin-top: 20px;
}

.replay-bar {
  width: 100%;
}
</style>../../modules/conversation/ConversationDataModule
