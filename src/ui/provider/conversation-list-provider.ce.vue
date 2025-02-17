<template>
  <rc-scrollbar-provider v-if="conversationList.length > 0" ref="scrollbar" @loading="handleScrollLoading">
    <div class="rc-conversation-wrap">
      <div class="rc-conversation-list-menu" ref="conversationMenuRef"
        :style="{ top: `${conversationMenuStyle.top}px`, left: `${conversationMenuStyle.left}px`, display: conversationMenuStyle.display }">
        <rc-conversation-list-menu-item
          v-for="item in menu"
          :icon="item.icon"
          :id="item.id"
          :label="item.label"
          @click="handleMenuItemClick(item.id, item.target)"
          ></rc-conversation-list-menu-item>
      </div>

      <div class="rc-conversation-list">
        <rc-conversation-list-item v-for="item in conversationList"
          :message="getMessageDigest(item.latestMessage)"
          :time="handleTimeFilter(item.latestMessage?.sentTime || 0)"
          :key="item.key"
          :conversation="item"
          :draft="isDraft(item)"
          :statusEnable="handleShowSentStatus(item.latestMessage)"
          :name="handleUserProfile(item.latestMessage)"
          :selected="opened ? isSameConversation(item, opened): false"
          @contextmenu.prevent.native="handleConversationRightClick(item, $event)"
          @click="handleConversationClick(item, $event)"
          ></rc-conversation-list-item>

          <template v-if="loading">
            <rc-conversation-loading></rc-conversation-loading>
          </template>
      </div>
    </div>
  </rc-scrollbar-provider>
  <rc-conversation-list-empty v-else :desc="emptyDesc"></rc-conversation-list-empty>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, onUnmounted, nextTick } from 'vue'
import { ctx, conversationList, openedConversation as opened, handleShowSentStatus, textarea, unreadCountBottom, getMessageDigest } from './context';
import { IRCKitCachedConversation } from '../../modules/conversation/IRCKitCachedConversation';
import { $tt, $t } from '../i18n-vue';
import { RCKitEvent } from '../../core/RCKitEvent';
import { ConversationType, MessageType } from '@rongcloud/engine';
import { isSameConversation, formatTime } from '../../helper';
import { IRCKitLanguageEntries } from '../../languages';
import { IRCKitCachedMessage } from '../../modules/MessageDataModule';
import { ConversationItemOrderChangeEvent, ConversationItemRemoveEvent, ConversationListFirstScreenRenderingEvent, ConversationListItemChangeEvent, InnerEvent, RCKitEvents } from '@lib/core/EventDefined';
import { StatisticKey } from '@lib/modules/Statistic';
import { electronExtension } from '@rongcloud/imlib-next';
import { InnerErrorCode } from '@lib/enums/RCKitCode';

const context = ctx();

const conversationMenuRef = ref();
const loading = ref<boolean>(false);
const scrollbar = ref<any>(null);

const conversationMenuStyle = reactive({
  left: 0,
  top: 0,
  display: 'none',
})

const menu = ref<{ id: string, icon: string, label: string, target: string }[]>([]);
const weeklist: Array<keyof IRCKitLanguageEntries> = [
  "time.format.sunday",
  "time.format.monday",
  "time.format.tueday",
  "time.format.wedday",
  "time.format.thurday",
  "time.format.friday",
  "time.format.satday",
];
const emptyDesc = $t('conversation.list.empty.desc');

/**
 * 控制时间格式转化
 * @param updateTime
 */
const handleTimeFilter = (updateTime: number): string => {
  const { year, month, day, hour, minute, weekDay } = formatTime(updateTime)!;
  const interval: number = (Date.now() - updateTime) / 1000 / 60 / 60 / 24;
  if (new Date().toDateString() === new Date(updateTime).toDateString()) {
    return `${hour}:${minute}`;
  }
  if ((new Date().toDateString() !== new Date(updateTime).toDateString() && interval < 1 ) || 1 <= interval && interval < 2 ) {
    return $tt('time.format.yesterday');
  }
  if (2 <= interval && interval < 7) {
    return $tt(weeklist[weekDay] as keyof IRCKitLanguageEntries);
  }
  return $tt('time.format.full', year, month, day);
}

const onConversationListInited = async (e: ConversationListFirstScreenRenderingEvent) => {
  const len = conversationList.value.length;
  conversationList.value.splice(0, len, ...e.data);
  // 初始化会话列表时，当数据不够 30 时不显示 loding 组件
  loading.value = conversationList.value.length >= 30;
  if (electronExtension.enable()) return
  context.conversation.updateLatesMessageStatus(conversationList.value);
}

const onConversationListItemOrderChange = (e: ConversationItemOrderChangeEvent) => {
  e.data.forEach((item) => {
    const index = conversationList.value.findIndex((conversation) => isSameConversation(item.conversation, conversation));
    if (index !== -1) {
      conversationList.value.splice(index, 1);
    }
    conversationList.value.splice(item.order, 0, JSON.parse(JSON.stringify(item.conversation)));

    // 定位组件数据更新取决于会话未读数更新
    if(opened.value && isSameConversation(item.conversation, opened.value!)) {
      unreadCountBottom.value = item.conversation.unreadCount;
    }
  });
}

const onConversationListItemChange = (e: ConversationListItemChangeEvent) => {
  e.data.forEach((item) => {
    const index = conversationList.value.findIndex((conversation) => isSameConversation(item, conversation));
    if (index !== -1) {
      conversationList.value.splice(index, 1, JSON.parse(JSON.stringify(item)));
    }

    // 定位组件数据更新取决于会话未读数更新
    if(opened.value && isSameConversation(item, opened.value!)) {
      unreadCountBottom.value = item.unreadCount;
    }

  });
}

const onConversationListItemRemove = (e: ConversationItemRemoveEvent) => {
  e.data.forEach((item) => {
    const index = conversationList.value.findIndex((conversation) => isSameConversation(item, conversation));
    if (index !== -1) {
      conversationList.value.splice(index, 1);
    }
  });
}

/**
 * 处理鼠标右键事件
 */
const handleConversationRightClick = async (conversation: IRCKitCachedConversation, e: MouseEvent) => {
  e.preventDefault();

  const list = context.conversationMenu.getMenum(conversation).map(item => {
    return { id: item.id, icon: item.icon, label: $tt(item.id as keyof IRCKitLanguageEntries), target: conversation.key }
  });
  menu.value.splice(0, menu.value.length, ...list);
  conversationMenuStyle.left = e.clientX;
  conversationMenuStyle.display = 'block';
  await nextTick()
  conversationMenuStyle.top = calculateTop(conversationMenuRef.value.clientHeight, e.clientY);
}

const handleConversationClick = async (item: IRCKitCachedConversation, e: MouseEvent) => {
  e.preventDefault();
  // 切换会话前判断是否要设置/清除缓存
  if(opened.value){
      context.conversation.handleConversationDraft(opened.value, textarea.value?.value);
    }
  if (item.markUnread) {
    item.markUnread = false;
    item.markReaded = true;
  }
  if (item.conversationType === ConversationType.SYSTEM) {
    // 派发点击事件，允许业务层拦截
    const evt = new RCKitEvent(RCKitEvents.BEFORE_SYSTEM_CONVERSATION_OPEN, item);
    context.emit(evt, 2);
    if (evt.isDefaultPrevented()) {
      // 业务已阻断，不再继续执行
      return;
    }
  } else {
    context.statistic(StatisticKey.CONVERSATION_LIST_ITEM_CLICK);
  }
  const { code } = await context.conversation.openConversation(item);
  if (code === InnerErrorCode.CONVERSATION_LIST_NOT_READY) {
    context.alert('alert.conversation.list.not.ready');
  }
}

const handleMenuItemClick = (menuId: string, key: string) => {
  context.statistic(StatisticKey.CONVERSATION_LIST_ITEM_OPTION_CLICK);

  const conversation = context.conversation.getCachedConversationByKey(key);
  context.emit(new RCKitEvent(RCKitEvents.CONVERSATION_MENU_ITEM_CLICK, { id: menuId, conversation }));
  conversationMenuStyle.display = 'none';
}

const handleScrollLoading = async () => {
  if (!loading.value) {
    return;
  }
  const lastConversation = conversationList.value[conversationList.value.length - 1];
  // 从 lastConversation 开始向前获取更多会话列表数据
  const { hasMore, code, list } = await context.conversation.getMoreConversationList(lastConversation);
  if (code === 0) {
    conversationList.value = [ ...conversationList.value, ...list]
    loading.value = hasMore
  }
  if (electronExtension.enable()) return
  context.conversation.updateLatesMessageStatus([...list]);
}

/**
 * 根据内容高度计算菜单 top 值
 * @param menuHeight
 * @param clientY
 */
const calculateTop = (menuHeight: number, clientY: number) => {
  const { clientHeight } = document.documentElement;
  if (conversationMenuStyle) {
    return clientHeight - clientY < menuHeight ? (clientY - menuHeight) : clientY;
  }
  return 0;
}

/**
 * 关闭菜单
 * @param e
 */
const handleHide = (e: any) => {
  if (e.button !== 0) {
    return;
  }
  conversationMenuStyle.display = 'none'
}

const handleUserProfile = (message: IRCKitCachedMessage | null) => {
  if (!message || message.senderUserId == ctx().userId || message.messageType === MessageType.RECALL || message.messageType === MessageType.RECALL_NOTIFICATION_MESSAGE) return ''
  if (message.conversationType === ConversationType.SYSTEM)  return context.appData.getSystemProfiles([message.targetId])[0].name
  return context.appData.getUserProfile(message.senderUserId).name
}
const isDraft = (conversation: IRCKitCachedConversation): boolean => {
  if (opened.value) {
    return !isSameConversation(opened.value, conversation) && !!conversation.draft
  }
  return !!conversation.draft
}

onMounted(async () => {
  document.body.addEventListener('mouseup', handleHide, false);
  window.addEventListener('blur', handleHide, false);

  context.addEventListener(InnerEvent.CONVERSATION_LIST_RESET, onConversationListInited);
  context.addEventListener(InnerEvent.CONVERSATION_ITEM_ORDER_CHANGE, onConversationListItemOrderChange);
  context.addEventListener(InnerEvent.CONVERSATION_ITEM_CHANGE, onConversationListItemChange);
  context.addEventListener(InnerEvent.CONVERSATIN_ITEM_REMOVE, onConversationListItemRemove);

  conversationList.value = context.conversation.getCachedConversationList();
});

onUnmounted(() => {
  document.body.removeEventListener('mouseup', handleHide, false);
  window.removeEventListener('blur', handleHide, false);
  context.removeEventListener(InnerEvent.CONVERSATION_LIST_RESET, onConversationListInited);
  context.removeEventListener(InnerEvent.CONVERSATION_ITEM_ORDER_CHANGE, onConversationListItemOrderChange);
  context.removeEventListener(InnerEvent.CONVERSATION_ITEM_CHANGE, onConversationListItemChange);
  context.removeEventListener(InnerEvent.CONVERSATIN_ITEM_REMOVE, onConversationListItemRemove);
})

</script>

<style>
.rc-conversation-wrap {
  padding: 0 10px;
}
.rc-conversation-list-menu {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3;
  padding: 5px;
  background-color: #fff;
  border-radius: 9px;
  box-shadow: 0px 5px 16px 0px #00000014;
  min-width: 95px;
}
</style>../../modules/conversation/ConversationDataModule
