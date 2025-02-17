<template>
  <div v-if="opened" class="rc-kit-msg-list" ref="messageListRef" @scroll="handleScroll">
    <!-- 滚动条 -->
    <rc-scrollbar-thumb-provider @handlemove="handleMove" v-if="sizeHeight" :height="sizeHeight" :move="moveY"
      :scrollheight="messageListRef?.scrollHeight" :ratio="ratioY"></rc-scrollbar-thumb-provider>
    <!-- 滚动条 End-->
    <!-- 消息菜单 -->
    <div class="rc-message-list-menu" ref="messageMenuRef" :style="{
      top: `${messageMenuStyle.top}px`,
      left: `${messageMenuStyle.left}px`,
      display: messageMenuStyle.display,
    }">
      <div v-if="!showReadList" style="padding: 5px;">
        <div
          v-if="opened.conversationType === ConversationType.GROUP && currentSelectMessage?.senderUserId === userId && showMessageState && currentSelectMessage.sentStatus !== SentStatus.SENDING && currentSelectMessage.sentStatus !== SentStatus.FAILED"
          class="read-number" @click="handleReadNumberClick"> {{ readList.length }} {{ readNumberMsg }} </div>
        <rc-message-list-menu-item v-for="item in msgMenu" :icon="item.icon" :id="item.id" :label="item.label"
        @click="handleMenuItemClick(item.id, item.message)"></rc-message-list-menu-item>
      </div>

      <div v-else class="read-list">
        <div style="padding: 0 5px;">
          <div class="read-back" @click="handleReadBack">
            &lt;
           <span style="margin-left: 3px;">{{ backMsg }}</span>
          </div>

        </div>
        <rc-scrollbar-provider>
          <ul class="read-list-ul">
            <li class="read-list-li" v-for="user in readList">
              <rc-icon
                :url="context.appData.getUserProfile(user.userId).portraitUri"
                :radius="50" :width="30" :height="30" :online="false"></rc-icon>
              <div class="read-info">
                <p class="read-name">{{ context.appData.getUserProfile(user.userId).name }}</p>
                <p class="read-time">
                  <img style="margin-right: 5px;" :src="SENT_STATUS_READ_ICON" alt="status">
                  {{ timeController(user.readTime) }}
                </p>
              </div>
            </li>
          </ul>
        </rc-scrollbar-provider>
      </div>
    </div>
    <!-- 消息菜单 End -->
    <!-- 多选线 -->
    <rc-message-select class="rc-kit-select" v-if="multiChoiceMode" :selected="!!selected" @select="handleSelectMessages"
      ref="DOMSelect">
    </rc-message-select>
    <!-- 多选线 End -->
    <!-- 消息列表 -->
    <div ref="messageBoxRef" style="padding: 10px;">
      <div class="rc-kit-msg-list-box" v-for="(item, index) in messageRenderList" :key="(typeof item === 'string' ? item : item.messageUId || item.transactionId || `rc-kit-${index}`)">
        <!-- 多选框 -->
        <div class="checkbox"
          v-if="typeof item !== 'string' && (item.sentStatus !== 10 ) && multiChoiceMode && !isGreyMessage(item.messageType)">
          <label :for="item.messageUId || `${item.transactionId}`">
            <input :id="item.messageUId || `${item.transactionId}`" type="checkbox" v-model="selectedMessageUids" :value="item.messageUId || `${item.transactionId}`">
            <span class="custom">
              <img :src="CHECKED_ICON" alt="CHECKED_ICON">
            </span>
          </label>
        </div>
        <!-- 时间间隔组件 -->
        <rc-message-time class="rc-kit-time-section" v-if="typeof item === 'string'" :time="item"></rc-message-time>
        <template v-else>
          <!-- 灰条消息 -->
          <rc-grey-message-provider class="rc-kit-grey-message" v-if="isGreyMessage(item.messageType)"  @click.capture="stopEventWhenMultiChoiceMode($event)" :message="item"></rc-grey-message-provider>
          <!-- 气泡消息 -->
          <div v-else class="rc-kit-msg-list-item" :style="{ 'flex-direction': bubbleDirection(item) }" @click.capture="stopEventWhenMultiChoiceMode($event)">
            <rc-icon
              class="rc-kit-msg-avatar"
              :url="handleUserProfiles(item).portraitUri"
              :width="40" :height="40"
              :style="{'opacity': showAvatar(item, messageRenderList[index -1]) ? 1 : 0}"
              :radius="50" @click="handleIconClisk(item)" :online="false" v-if="bubbleShowPortrait(item)"></rc-icon>

            <rc-message-bubble class="rc-kit-msg-bubble" :style="bubbleColorStyle(item, showAvatar(item, messageRenderList[index -1]))" :showname="bubbleShowName(item)"
              :align="bubbleStyleAlign(item)" :message="item" :message-uid="item.messageUId"
              :profile="handleUserProfiles(item)" @click="handleBubbleClick(item)"
              :statusEnable="handleShowSentStatus(item)"
              @contextmenu.prevent.native="handleMessageRightClick(item, $event)">

              <component @link="handleLinkClick"
                :is="getMessageComponentTag(item.messageType)" :message="item">
              </component>

            </rc-message-bubble>
          </div>
        </template>
      </div>
    </div>

    <!-- 消息列表 End -->
    <rc-message-location v-if="unreadCountBottom > 0 && hasMoreBackward"
      @click.capture="stopEventWhenMultiChoiceMode($event)"
      :count="unreadCountBottom" :direction="1"
      @location="handleLocation2Bottom"></rc-message-location>
    <!-- 消息定位 到未读位置-->
    <rc-message-location @click.capture="stopEventWhenMultiChoiceMode($event)"
      v-if="unreadCountTop > 0 && FOCUS_ON_LATEST_MESSAGE"
      :count="unreadCountTop"
      :direction="0"
      @location="handleLocation2Top"></rc-message-location>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, onUnmounted, nextTick, reactive, computed, watch } from "vue";
import {
  electronExtension,
  IMessageReader,
  getFirstUnreadMessage,
  ErrorCode,
  ConversationType,
  MessageDirection,
  BaseMessage,
  ITextMessageBody,
} from '@rongcloud/imlib-next'
import {
  ctx, multiChoiceMode, replyMessage, selectedMessages, selectedMessageUids,
  openedConversation as opened, selectedGroupMembers, currentUserProfile, getMessageComponentTag, isGreyMessage,
  selected, messageList, forwarding, handleDeleteMessage, handleShowSentStatus, unreadCountBottom,
} from "./context";
import { $tt, $t } from "../i18n-vue";
import { IRCKitLanguageEntries } from "../../languages";
import { RCKitEvent } from "../../core/RCKitEvent";
import { IRCKitCachedMessage } from "../../modules/MessageDataModule";
import { IRCKitMessageBubbleCfg, RCKitBubbleLayout } from "../../modules/BubbleModule";
import { isSameConversation, formatTime, findLastIndex, transIAReceivedMessage } from "../../helper";
import { RCKitCommand } from "../../enums/RCKitCommand";
import { RCKitMessageMenuID } from "../../modules/MessageMenu";
import { CHECKED_ICON, SENT_STATUS_READ_ICON } from "../../assets";
import { MessageType, SentStatus } from "@rongcloud/engine";
import {
  ConversationSelectedEvent, MessagesDeletedEvent, FileUploadProgressEvent, InnerEvent, InsertNewMessagesEvent,
  MessageStateChangeEvent, RCKitEvents, RCKitModalForwardingType, RecvNewMessagesEvent,
} from "@lib/core/EventDefined";
import { StatisticKey } from "@lib/modules/Statistic";

type IUIMessage = string | IRCKitCachedMessage;
const context = ctx();
const userId = context.userId;

const weeklist: Array<keyof IRCKitLanguageEntries> = [
  "time.format.sunday",
  "time.format.monday",
  "time.format.tueday",
  "time.format.wedday",
  "time.format.thurday",
  "time.format.friday",
  "time.format.satday",
];

// 时间组件数据过滤
const handleTimeFilter = (time: number): string => {
  const { year, month, day, weekDay } = formatTime(time)!;
  const interval: number = (Date.now() - time) / 1000 / 60 / 60 / 24;
  let name = $tt("time.format.full", year, month, day);
  if (new Date().toDateString() === new Date(time).toDateString()) {
    name = $tt("time.format.today");
  }
  if ((new Date().toDateString() !== new Date(time).toDateString() && interval < 1) || 1 <= interval && interval < 2) {
    name = $tt("time.format.yesterday");
  }
  if (2 <= interval && interval < 7) {
    name = $tt(weeklist[weekDay] as keyof IRCKitLanguageEntries);
  }
  return name
}

//#region 消息列表

/**
 * 根据历史消息计算渲染数据，区分不同时间段的消息
 */
const messageRenderList = computed(() => {
  const list = messageList.value;
  const result: IUIMessage[] = [];

  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    result.unshift(item);

    const before = list[i - 1];
    if (before) {
      // 与前一消息不属于同一天，向前插入时间数据
      if (new Date(item.sentTime).toDateString() !== new Date(before.sentTime).toDateString()) {
        result.unshift(handleTimeFilter(item.sentTime));
      }
    } else {
      // 当前消息为第一条消息，判断是否有更多可拉取的历史消息，没有则插入时间数据
      if (!hasMoreForward) {
        result.unshift(handleTimeFilter(item.sentTime));
      }
    }
  }
  return result;
});

/**
 * 处理用户详细信息
 */
const handleUserProfiles = (msg: IRCKitCachedMessage): {
  name: string
  nickname?: string
  userId: string
  portraitUri: string
} => {
  if (msg.messageDirection === MessageDirection.SEND) {
    return currentUserProfile.value!
  }
  if (opened.value?.conversationType === ConversationType.GROUP) {
    const value = selectedGroupMembers.value.find(item => item.userId == msg.senderUserId);
    return value || {
      name: msg.senderUserId,
      userId: msg.senderUserId,
      portraitUri: opened.value?.portraitUri,
    }
  }
  return {
    name: opened.value!.name,
    userId: opened.value!.targetId,
    portraitUri: opened.value!.portraitUri,
  }
}

/**
 * 点击头像派发点击事件
 * @param msg
 */
const handleIconClisk = (msg: IRCKitCachedMessage) => {
  const profile = handleUserProfiles(msg);
  context.emit(new RCKitEvent(RCKitEvents.CONVERSATION_ICON_CLICK, {
    conversation: {
      conversationType: msg.conversationType,
      targetId: msg.targetId,
      channelId: msg.channelId,
    },
    profile
  }), 2);
}

const unreadCountTop = ref<number>(0);

let backupFirstUnreadMessageTime = 0;
const FOCUS_ON_LATEST_MESSAGE = context.store.getCommandSwitch(RCKitCommand.FOCUS_ON_LATEST_MESSAGE);

let firstUnreadMessageTime = 0;

/**
 *
 * @param timestamp 拉取时间戳
 * @param backward 是否要往后拉取
 */
const handleReqHistories = async (timestamp: number, backward: boolean): Promise<IRCKitCachedMessage[]> => {
  const conversationOption = {
    conversationType: opened.value!.conversationType,
    targetId: opened.value!.targetId,
    channelId: opened.value!.channelId,
  };

  // 判断是否需要往后拉取
  if (backward){
    const { code: code1, list, hasMore: hasMore1 } = await context.message.reqHistories(
      conversationOption,
      timestamp - 1,
      false
    );
    if (code1 === ErrorCode.SUCCESS) {
      hasMoreBackward.value = hasMore1;
      messageList.value = list;
      await nextTick();
      update();
    }
  }

  const { scrollHeight } = messageListRef.value;
  const { code, list, hasMore } = await context.message.reqHistories(
    conversationOption,
    timestamp,
    true
  );
  if (code === ErrorCode.SUCCESS) {
    messageList.value = [...list, ...messageList.value];
    hasMoreForward = hasMore;
    await nextTick();
    update();
    if(backward){
      // 最新滚动位置是两次 scrollHeight 之差
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight - scrollHeight;
    } else {
      // 新滚动位置是为底部
      messageListRef.value.scrollTop = messageListRef.value.scrollHeight - messageListRef.value.offsetHeight;
    }
  }
  return messageList.value
}

/**
 * 初始化消息列表
 * 首次进入会话获取历史消息逻辑：
 * FOCUS_ON_LATEST_MESSAGE => true - 进入会话，会话中展示的是最新消息（Default）
 *  - 默认拉取时间为 0, 向前获取
 * FOCUS_ON_LATEST_MESSAGE => false - 进入会话，会话中展示的是最近已读消息
 *  - 根据该时间戳向前获取历史消息，同时也要向后获取一次历史消息
 *  - 滚动条需定位到首次消息加载的位置
 *
 */
const initMessageList = async () => {
  if (!opened.value) {
    return;
  }

  const { conversationType, targetId, channelId, unreadCount } = opened.value;
  const conversation = { conversationType, targetId, channelId }
  // 切换会话，数据重置
  messageList.value.length = 0;
  firstUnreadMessageTime = 0;
  timer = null;
  unreadCountBottom.value = unreadCount;

  const { data } = await getFirstUnreadMessage(conversation);
  backupFirstUnreadMessageTime = data?.sentTime || 0;
  if (!FOCUS_ON_LATEST_MESSAGE) {
    firstUnreadMessageTime = backupFirstUnreadMessageTime
  }

  const backward = !FOCUS_ON_LATEST_MESSAGE && firstUnreadMessageTime > 0;
  const list = await handleReqHistories(firstUnreadMessageTime, backward);

  if (FOCUS_ON_LATEST_MESSAGE && electronExtension.enable() && unreadCount) {
    const count = unreadCount - list.length
    unreadCountTop.value = count < 0 ? 0 : count;
  }

  const length = list.length;
  if (!length) return

  // Web 不关注是否有未读数的情况再发送回执，多端时未读数同步，web 会清空所有未读，导致 web 发送回执异常
  // Electron 平台可以按照有未读数的情况发送回执
  if(unreadCountBottom.value) {
    await context.conversation.clearUnreadCountByTimestamp(conversation, list[length - 1].sentTime);
    await context.message.sendReadReceiptMessage(conversation, list);
  } else if(!electronExtension.enable()) {
    await context.message.sendReadReceiptMessage(conversation, list);
  }

};

//#endregion

//#region 自定义消息气泡

const showAvatar= (message: IRCKitCachedMessage, beforMessage: IUIMessage): boolean => {
  if (!beforMessage || typeof beforMessage === 'string') {
    return true
  }
  const isSameDay =  new Date(message.sentTime).toDateString() !== new Date(beforMessage.sentTime).toDateString()
  if (isGreyMessage(beforMessage.messageType) && message.senderUserId === beforMessage.senderUserId) {
    return true
  }
  if (message.senderUserId !== beforMessage.senderUserId ||  isSameDay ) {
    return true
  }

  return false
}
const messageBubbleCfg = ref<IRCKitMessageBubbleCfg>();
// 根据配置是否展示用户头像
const bubbleShowPortrait = (item: IRCKitCachedMessage): boolean => {
  const showMyProfileInGroupConversation =
    messageBubbleCfg.value?.showMyProfileInGroupConversation;
  const showMyProfileInPrivateConversation =
    messageBubbleCfg.value?.showMyProfileInPrivateConversation;
  const showOthersProfileInGroupConversation =
    messageBubbleCfg.value?.showOthersProfileInGroupConversation;
  const showOthersProfileInPrivateConversation =
    messageBubbleCfg.value?.showOthersProfileInPrivateConversation;
  if (
    item.messageDirection === MessageDirection.SEND &&
    item.conversationType === ConversationType.PRIVATE
  ) {
    return !!showMyProfileInPrivateConversation;
  }
  if (
    item.messageDirection === MessageDirection.SEND &&
    item.conversationType === ConversationType.GROUP
  ) {
    return !!showMyProfileInGroupConversation;
  }
  if (
    item.messageDirection === MessageDirection.RECEIVE &&
    item.conversationType === ConversationType.PRIVATE
  ) {
    return !!showOthersProfileInPrivateConversation;
  }
  if (
    item.messageDirection === MessageDirection.RECEIVE &&
    item.conversationType === ConversationType.GROUP
  ) {
    return !!showOthersProfileInGroupConversation;
  }
  return false;
};
// 根据配置是否展示用户昵称
const bubbleShowName = (item: IRCKitCachedMessage): boolean => {
  const showMyNameInPrivateConversation =
    messageBubbleCfg.value?.showMyNameInPrivateConversation;
  const showMyNameInGroupConversation =
    messageBubbleCfg.value?.showMyNameInGroupConversation;
  const showOthersNameInGroupConversation =
    messageBubbleCfg.value?.showOthersNameInGroupConversation;
  const showOthersNameInPrivateConversation =
    messageBubbleCfg.value?.showOthersNameInPrivateConversation;

  if (
    item.messageDirection === MessageDirection.SEND &&
    item.conversationType === ConversationType.PRIVATE
  ) {
    return !!showMyNameInPrivateConversation;
  }
  if (
    item.messageDirection === MessageDirection.SEND &&
    item.conversationType === ConversationType.GROUP
  ) {
    return !!showMyNameInGroupConversation;
  }
  if (
    item.messageDirection === MessageDirection.RECEIVE &&
    item.conversationType === ConversationType.PRIVATE
  ) {
    return !!showOthersNameInPrivateConversation;
  }
  if (
    item.messageDirection === MessageDirection.RECEIVE &&
    item.conversationType === ConversationType.GROUP
  ) {
    return !!showOthersNameInGroupConversation;
  }
  return false;
};
// 根据配置修改对齐方式
const bubbleDirection = (item: IRCKitCachedMessage) => {
  if (
    item.messageDirection === 1 &&
    messageBubbleCfg.value?.layout === RCKitBubbleLayout.LEFT_RIGHT
  ) {
    return "row-reverse";
  }
  return "row";
};
// 根据配置修改文字和背景颜色、边框角
const bubbleColorStyle = (item: IRCKitCachedMessage, showAvatar: boolean) => {
  if (!messageBubbleCfg.value) {
    return;
  }
  const textColorForOthers = Number(messageBubbleCfg.value.textColorForOthers);
  const backgroundColorForOthers = Number(
    messageBubbleCfg.value.backgroundColorForOthers
  );
  const textColorForMyself = Number(messageBubbleCfg.value.textColorForMyself);
  const backgroundColorForMyself = Number(
    messageBubbleCfg.value.backgroundColorForMyself
  );
  let color = `#${textColorForOthers.toString(16).padStart(6, "0")}`;
  let backgroundColor = `#${backgroundColorForOthers.toString(16).padStart(6, "0")}`;
  let borderRadius = `0 ${messageBubbleCfg.value?.redius}px ${messageBubbleCfg.value?.redius}px`;
  if (item.messageDirection === MessageDirection.SEND) {
    color = `#${textColorForMyself.toString(16).padStart(6, "0")}`;
    backgroundColor = `#${backgroundColorForMyself.toString(16).padStart(6, "0")}`;
    if (messageBubbleCfg.value?.layout === RCKitBubbleLayout.LEFT_RIGHT) {
      borderRadius = `${messageBubbleCfg.value.redius}px 0 ${messageBubbleCfg.value.redius}px ${messageBubbleCfg.value.redius}px`;
    }
  }
  // 不展示头像的气泡都是圆角
  if(!showAvatar) {
    borderRadius =  `${messageBubbleCfg.value.redius}px`
  }
  return {
    color,
    backgroundColor,
    borderRadius,
  };
};

const bubbleStyleAlign = (item: IRCKitCachedMessage) => {
  return !!(item.messageDirection === 1 && messageBubbleCfg.value?.layout === 'left-right');
}

const handleBubbleClick = (item: IRCKitCachedMessage) => {
  switch (item.messageType) {
    case MessageType.IMAGE:
      context.emit(new RCKitEvent(RCKitEvents.MEDIA_MESSAGE_MODAL_EVENT, item));
      break;
    case MessageType.SIGHT:
      context.audioPlayer.pause();
      context.emit(new RCKitEvent(RCKitEvents.MEDIA_MESSAGE_MODAL_EVENT, item));
      break;
    case MessageType.GIF:
      context.emit(new RCKitEvent(RCKitEvents.MEDIA_MESSAGE_MODAL_EVENT, item));
      break;
    case MessageType.COMBINE:
    case MessageType.COMBINE_V2:
      context.emit(new RCKitEvent(RCKitEvents.COMBINE_MESSAGE_MODAL_EVENT, item));
      break
    default:
      break;
  }
}

//#endregion

//#region 右键菜单
const messageListRef = ref();
const messageMenuRef = ref();
const showReadList = ref<boolean>(false);
const showMessageState = context.store.getCommandSwitch(RCKitCommand.SHOW_MESSAGE_STATE);
const readList = ref<IMessageReader[]>([]);
const msgMenu = ref<
  { id: string; icon: string; label: string; message: IRCKitCachedMessage }[]
>([]);
const messageMenuStyle = reactive({ left: 0, top: 0, display: "none" });

const readNumberMsg = $t('message.list.read');
const backMsg = $t('message.list.back');
const currentSelectMessage = ref<IRCKitCachedMessage>();
/**
 * 根据内容高度计算菜单 top 值
 * @param menuHeight
 * @param clientY
 */
const calculateTop = (menuHeight: number, clientY: number) => {
  const { clientHeight } = document.documentElement;
  return clientHeight - clientY < menuHeight ? (clientY - menuHeight) : clientY;
}

const handleMessageRightClick = async (message: IRCKitCachedMessage, e: MouseEvent) => {
  if (multiChoiceMode.value) {
    return
  }

  showReadList.value = false;
  currentSelectMessage.value = message;
  const { conversationType, messageUId, senderUserId } = message;
  if (conversationType === ConversationType.GROUP && senderUserId === context.userId && messageUId && showMessageState) {
    const { code, data } = await context.message.getMessageReadReceiptV4(message);
    if (code === ErrorCode.SUCCESS && data?.list) {
      readList.value = data.list;
    }
  }

  const list = context.msgMenu.getMenu(message).map((item) => {
    return {
      id: item.id,
      icon: item.icon,
      label: $tt(item.id as keyof IRCKitLanguageEntries),
      message,
    };
  });
  msgMenu.value.splice(0, msgMenu.value.length, ...list);
  messageMenuStyle.left = e.clientX;
  messageMenuStyle.display = "block";
  await nextTick()
  messageMenuStyle.top = calculateTop(messageMenuRef.value.clientHeight, e.clientY);
};

const handleMenuItemClick = async (menuId: string, message: IRCKitCachedMessage) => {
  context.statistic(StatisticKey.CONVERSATION_MESSAGE_OPTION_CLICK);

  switch (menuId) {
    case RCKitMessageMenuID.COPY: // 复制
      const text = (message as BaseMessage<ITextMessageBody>).content.content;
      if (!navigator.clipboard || text.length === 0) {
        return;
      }
      navigator.clipboard.writeText(text);
      break;
    case RCKitMessageMenuID.DELETE:
      handleDeleteMessage([message]);
      break;
    case RCKitMessageMenuID.MULIT_CHOICE:
      // 开启多选模式，多选模式开启后支持逐条转发功能与删除功能
      multiChoiceMode.value = true;
      break;
    case RCKitMessageMenuID.REPLY:
      // 引用回复，在输入框最前部插入 @xxx
      replyMessage.value = message;
      break;
    case RCKitMessageMenuID.FORWARD: // 单条消息转发，直接派发事件，业务层可拦截处理
      forwarding(RCKitModalForwardingType.SINGLE, [message]);
      break;
    default:
      // 业务自定义菜单
      context.emit(new RCKitEvent(RCKitEvents.MESSAGE_MENU_ITEM_CLICK, { id: menuId, message }))
      break;
  }
};

const hideMsgMenu = () => {
  messageMenuStyle.display = "none";
  showReadList.value = false;
};

const handleReadNumberClick = (e: Event) => {
  e.stopImmediatePropagation();
  showReadList.value = true;
}

const handleReadBack = (e:Event) => {
  e.stopImmediatePropagation();
  showReadList.value = false;
}

const timeController = (time: number) => {
  const { hour, minute } = formatTime(time)!;
  return `${hour}:${minute}`;
};

//#endregion

//#region 滚动逻辑
let timer: any = null;
let hasMoreForward = true;
let hasMoreBackward = ref<boolean>(false);
const ratioY = ref(1);
const sizeHeight = ref(0);
const moveY = ref(0);
const messageBoxRef = ref();
// 底部区域
const onBottomArea = ref<boolean>(true);
/**
 * 滚动逻辑细分：
 * 向上（在当前时间戳往前获取）: 取第一条消息时间戳请求历史消息，添加数据时设置滚动条位置保持数据不发生异常滑动
 * 向下（在当前时间戳往后获取）: 只有 RCKitCommand.FOCUS_ON_LATEST_MESSAGE 为 false 滚动的一定位置获取历史消息
 *
 * todo: 当渲染数据达到最大限制时需要进行裁切，涉及数据滚动位置，没有很好的方案。等做自定义滚动条组件时再考虑这部分逻辑
 */
const handleScroll = () => {
  if(!opened.value || messageList.value.length === 0) return
  const conversation =  {
    conversationType: opened.value.conversationType, targetId: opened.value.targetId, channelId: opened.value.channelId
  }
  const { scrollHeight, scrollTop, offsetHeight } = messageListRef.value;
  // 设置滚动条距离底部多少显示定位组件
  onBottomArea.value = (scrollHeight - offsetHeight - scrollTop) <= 100;
  // 计算滑块滚动距离
  moveY.value = ((messageListRef.value.scrollTop * 100) / offsetHeight) * ratioY.value || 0;

  // 在当前时间戳往前获取
  if (scrollTop <= 200 && !timer) {
    if (!hasMoreForward) return;
    timer = setTimeout(async () => {
      moreForward(conversation, scrollHeight);
    }, 1000);
  }

  // 在当前时间戳往后获取
  if (
    hasMoreBackward.value &&
    scrollHeight - (scrollTop + offsetHeight) <= 200 &&
    !timer
  ) {
    if (!hasMoreBackward.value) return;
    timer = setTimeout(async () => {
      moreBackward(conversation, offsetHeight);
    }, 1000);
  }
};

const moreForward = async (conversation: any, scrollHeight: any) => {
  const { hasMore, code, list } = await context.message.reqHistories(
    conversation,
    messageList.value[0].sentTime,
    true
  );
  if (code === ErrorCode.SUCCESS) {
    messageList.value = [...list, ...messageList.value];
    hasMoreForward = hasMore;
    if (unreadCountTop.value){
      const count = unreadCountTop.value - list.length;
      unreadCountTop.value = count < 0 ? 0 : count;
    }
    await nextTick();
    update();
    messageListRef.value.scrollTop = messageListRef.value.scrollHeight - scrollHeight;
    // 重新计算滚动距离后再判断数据是否有超最大限制
    if( messageList.value.length > 300){
      messageList.value.splice(300);
      await nextTick();
      update();
      hasMoreBackward.value = true;
    }
    // 发送单群已读回执
    if(conversation.conversationType === ConversationType.GROUP && electronExtension.enable()) {
      await context.message.sendReadReceiptMessage(conversation, list);
    }
  }
  timer = null;
}

const moreBackward = async (conversation: any, offsetHeight: any) => {
  const { hasMore, code, list } = await context.message.reqHistories(
    conversation,
    messageList.value[messageList.value.length - 1].sentTime,
    false
  );
  if (code === 0) {
    messageList.value = [...messageList.value, ...list];
    hasMoreBackward.value = hasMore;

    // 如果会话还存在未读数
    if (unreadCountBottom.value) {
      if(electronExtension.enable()) {
        await context.conversation.clearUnreadCountByTimestamp(conversation, list[list.length - 1].sentTime);
        await context.message.sendReadReceiptMessage(conversation, list);
      }
      // Web 等拉取完所有消息才会清除未读数
      if(!electronExtension.enable() && !hasMore) {
        await context.conversation.clearUnreadCountByTimestamp(conversation, list[list.length - 1].sentTime);
        await context.message.sendReadReceiptMessage(conversation, list);
      }

    }

    // 插入数据后等 Dom 渲染完成，重新更新滑块位置
    await nextTick();
    update();
    moveY.value = ((messageListRef.value.scrollTop * 100) / offsetHeight) * ratioY.value || 0;
    const messageBoxOffsetHeight = messageBoxRef.value.offsetHeight
    // 当数据超过最大渲染时，进行数据裁切。
    if( messageList.value.length > 300){
      messageList.value.splice(0, messageList.value.length - 300);
      // 最新 scrollTop 值 - 裁切前后消息容器的高度差 = 裁切前展示底部消息的 scrollTop 值
      await nextTick();
      update();
      messageListRef.value.scrollTop = messageListRef.value.scrollTop - (messageBoxOffsetHeight - messageBoxRef.value.offsetHeight);
    }

  }
  timer = null;
}

/**
 * 处理滚轮跳移动距离
 * @param e
 */
const handleMove = (e: CustomEvent) => {
  if (!messageListRef.value) return
  const thumbPositionPercentage = e.detail[0];
  messageListRef.value.scrollTop = (thumbPositionPercentage * messageListRef.value.scrollHeight) / 100
}

/**
 * 重置滑块高度和比率
 */
const update = () => {
  if (!messageListRef.value) return

  const original = messageListRef.value.offsetHeight ** 2 / messageListRef.value.scrollHeight
  const originalHeight = Math.floor(original * 100) / 100;;

  // 滑块最小高度为 20
  const height = Math.max(originalHeight, 20);

  const ratio = originalHeight / (messageListRef.value.offsetHeight - originalHeight) / (height / (messageListRef.value.offsetHeight - height));
  ratioY.value = Math.floor(ratio * 100) / 100 || 1;
  sizeHeight.value = originalHeight < messageListRef.value.offsetHeight ? Math.floor(height) : 0;
}

/**
 * 设置滚动条到底部
 */
const setScroll2bottom = async () => {
  await nextTick();
  update();
  const { scrollHeight, offsetHeight } = messageListRef.value
  messageListRef.value.scrollTop = scrollHeight - offsetHeight;
}

//#endregion

//#region 定位组件
const handleLocation2Bottom = async () => {
  if(!opened.value) return

  const conversation = {
    conversationType: opened.value.conversationType,
    targetId: opened.value.targetId,
    channelId: opened.value.channelId,
  }
  // 直接请求最新时间点的消息，其他数据抛弃
  const { code, list, hasMore } = await context.message.reqHistories(conversation, 0, true);
  if (code === ErrorCode.SUCCESS) {
    messageList.value.length = 0;
    messageList.value = list;
    hasMoreForward = hasMore;
    hasMoreBackward.value = false;
    // 滚动到底部
    await nextTick();
    update();
    const { scrollHeight, offsetHeight } = messageListRef.value
    messageListRef.value.scrollTop = scrollHeight - offsetHeight;
    moveY.value = ((messageListRef.value.scrollTop * 100) / offsetHeight) * ratioY.value;
    // 清除会话未读数
    await context.conversation.clearUnreadCountByTimestamp(conversation, list[list.length -1].sentTime);
    // Electron 平台 starMsgUid 需要取第一条未读消息
    if (electronExtension.enable()) {
      const { data } = await getFirstUnreadMessage(conversation);
      if(data && data.sentTime > list[0].sentTime){
        list.unshift(transIAReceivedMessage(data));
      }
    }
    await context.message.sendReadReceiptMessage(conversation, list);
  }

}

const handleLocation2Top = async () => {
  if (!opened.value) return
  const conversation = {
    conversationType: opened.value.conversationType,
    channelId: opened.value.channelId,
    targetId: opened.value.targetId,
  }
  unreadCountTop.value = 0;
  hasMoreBackward.value = true;
  update();
  // 拉取未读消息时间戳前后消息
  const list = await handleReqHistories(backupFirstUnreadMessageTime, true);
  if(!list.length) return;
  await context.message.sendReadReceiptMessage(conversation, list);
}
//#endregion

//#region 多选组件
const DOMSelect = ref();

const stopMessageUidsWatch = watch(selectedMessageUids, (data) => {
  const length = selectedMessages.value.length;
  const msgList: IRCKitCachedMessage[] = []
  data.forEach((item) => {
    const index = messageList.value.findIndex((msg) => {
      if (msg.messageUId) {
        return msg.messageUId == item
      }
      return `${msg.transactionId}` == item
    });
    if(index > -1){
      msgList.push(messageList.value[index]);
    }
  })
  selectedMessages.value.splice(0, length, ...msgList)
}, { deep: true });

/**
 * checked 全选，从最新消息开始判断 y 坐标以及加上本身内容高度是否大于选择器y坐标
 */
const handleSelectMessages = () => {
  const selectedY = DOMSelect.value.getBoundingClientRect().y;
  const msgList = messageListRef.value.querySelectorAll('.rc-kit-msg-list-box');
  for (let i = msgList.length - 1; i >= 1; i--) {
    const topY = msgList[i].getBoundingClientRect().y;
    const bottomY = msgList[i].getBoundingClientRect().y + msgList[i].clientHeight;
    if (topY > selectedY || bottomY > selectedY) {
      const inputNode = msgList[i].querySelectorAll('.checkbox input');
      // 设置 checkbox 为选中状态，并将值添加到响应式数据中
      if (inputNode.length <= 0) continue
      setCheckboxStatus(inputNode);
    } else { break }
  }
  selected.value = !selected.value;
}

const setCheckboxStatus = (inputNode: any) => {
  if (selected.value) {
    inputNode[0].checked = true;
    const index = selectedMessageUids.value.findIndex(item => inputNode[0].value === item);
    if (index === -1) {
      selectedMessageUids.value.unshift(inputNode[0].value);
    }
  } else {
    inputNode[0].checked = false;
    const index = selectedMessageUids.value.findIndex(item => inputNode[0].value === item);
    if (index >= 0) {
      selectedMessageUids.value.splice(index, 1);
    }
  }
}

//#endregion

const onDeleteMessages = async (e: MessagesDeletedEvent) => {
  e.data.forEach((item) => {
    const { target, recallMsg } = item;
    // 被删除的消息可能为已发送消息，或发送失败消息，不能仅根据 messageUId 进行匹配，优先判断 transactionId
    const index = messageList.value.findIndex(item => item.transactionId === target.transactionId || (
      item.messageUId && item.messageUId === target.messageUId
    ));
    if (index === -1) {
      return;
    }
    if (recallMsg) {
      // 撤回消息需要替换 UI 数据，如果有多选的消息数据也需要删除
      messageList.value.splice(index, 1, recallMsg);
      const selecteIndex = selectedMessageUids.value.findIndex((item) => item === recallMsg.content.messageUId)
      if(selecteIndex === -1) return
      selectedMessageUids.value.splice(selecteIndex, 1);
    } else {
      messageList.value.splice(index, 1);
    }
  })
  await nextTick();
  update();
}

const onFileUploadProgress = (e: FileUploadProgressEvent) => {
  const { message } = e.data;
  const index = findLastIndex(messageList.value, item => item.transactionId === message.transactionId);
  if (index === -1) return;
  messageList.value.splice(index, 1, { ...message });
}

const onMessageStateChange = (e: MessageStateChangeEvent) => {
  e.data.forEach((message) => {
    if (isSameConversation(opened.value!, message)) {
      // 需要同时考虑 transactionId 和 messageUId（多端场景下，另一端的 transactionId 为 NAN）
      const index = findLastIndex(messageList.value, (item) => {
        if(item.messageUId) {
          return item.messageUId === message.messageUId
        }
        return item.transactionId === message.transactionId
      });
      if (index === -1) return;
      messageList.value.splice(index, 1, JSON.parse(JSON.stringify(message)));
    }
  })
}

// 处理文本消息中邮箱和链接点击
const handleLinkClick = (data: CustomEvent) => {
  context.emit(new RCKitEvent(RCKitEvents.MESSAGE_LINK_CLICK, data.detail[0]));
}

/**
 * 处理收到新消息
 * @param RecvNewMessagesEvent
 */
const onRecvNewMessages = async (e: RecvNewMessagesEvent) => {
  if(!opened.value) return
  const conversation = {
    conversationType: opened.value.conversationType,
    targetId: opened.value.targetId,
    channelId: opened.value.channelId,
  }
  const msgList: IRCKitCachedMessage[] = [];
  e.data.forEach(async (item) => {
    // 防止消息重复，对应场景：创建群组。原因是获取了历史消息，同时收到了该消息
    const index = messageList.value.findIndex((msg) => msg.messageUId === item.messageUId)
    if (isSameConversation(conversation, item) && index < 0) {
      msgList.push(item)
    }
  });

  if(!msgList.length) return
  // 当滑块不在底部时，记录接收到的消息记为未读
  if (!onBottomArea.value || hasMoreBackward.value) {
    hasMoreBackward.value = true;
    return
  }
  messageList.value.push(...msgList);

  setScroll2bottom();
  const length = msgList.length;
  // 清除会话未读数以及发送消息回执
  // 因为会话有定时 20ms 后更新会话，会出现多端未读数同步时机会早于会话更新时机，导致会话未读数一直累加
  setTimeout(async () => {
    const { code } = await context.conversation.clearUnreadCountByTimestamp(conversation, msgList[length - 1].sentTime);
    if(code === ErrorCode.SUCCESS) {
      await context.message.sendReadReceiptMessage(conversation, msgList, true);
    }
  }, 100)
};

/**
 * 处理发送消息
 * @param e
 */
const onInsertNewMessages = async (e: InsertNewMessagesEvent) => {
  // 还有历史消息直接请求最新时间点的消息，其他数据抛弃
  if (hasMoreBackward.value) {
    const { code, list, hasMore } = await context.message.reqHistories(
      {
        conversationType: opened.value!.conversationType,
        targetId: opened.value!.targetId,
        channelId: opened.value!.channelId,
      }, 0, true
    );
    if (code === ErrorCode.SUCCESS) {
      messageList.value.length = 0;
      messageList.value = list;
      hasMoreForward = hasMore;
      hasMoreBackward.value = false;
      // 添加数据后，滚到底部
      setScroll2bottom();
    }
    return
  }
  e.data.forEach(async (item) => {
    if (isSameConversation(opened.value!, item)) {
      messageList.value.push(item);
      if(messageList.value.length > 300){
        messageList.value.splice(0, messageList.value.length - 300);
      }
      // 添加数据后，滚到底部
      setScroll2bottom();
    }
  });
};

/**
 *  切换会话
 * @param e
 */
const onSelectedChanged = (e: ConversationSelectedEvent) => {
  hasMoreForward = true;
  hasMoreBackward.value = false;
  multiChoiceMode.value = false;
  unreadCountTop.value = 0;
  initMessageList();
};

// 监听容器高度变化，更新滑块
let resizeRefObserver: ResizeObserver | null = null;
const useResizeObserver = (el: HTMLElement, callback: ResizeObserverCallback) => {
  let observer: ResizeObserver | null = null;
  if ( window && "ResizeObserver" in window && el) {
    observer = new ResizeObserver(callback);
    observer.observe(el);
  }
  return observer;
}

/**
 * 多选模式下，阻止点击事件捕获
 */
const stopEventWhenMultiChoiceMode = (evt: Event) => {
  if (multiChoiceMode.value) {
    evt.stopImmediatePropagation();
  }
};

const handleResizeRef = () => {
  if (!messageListRef.value) return
  update();
  moveY.value = ((messageListRef.value.scrollTop * 100) / messageListRef.value.offsetHeight) * ratioY.value || 0;
}

onMounted(async () => {
  // 全局监听关闭
  window.addEventListener("click", hideMsgMenu);
  window.addEventListener('resize', update);
  context.addEventListener(RCKitEvents.CONVERSATION_SELECTED, onSelectedChanged);
  context.addEventListener(InnerEvent.RECV_NEW_MESSAGES, onRecvNewMessages);
  context.addEventListener(InnerEvent.INSERT_NEW_MESSAGES, onInsertNewMessages);
  context.addEventListener(RCKitEvents.MESSAGES_DELETED, onDeleteMessages);
  context.addEventListener(InnerEvent.MESSAGE_STATE_CHANGE, onMessageStateChange);
  context.addEventListener(InnerEvent.FILE_UPLOAD_PROGRESS, onFileUploadProgress);
  initMessageList();
  messageBubbleCfg.value = context.bubble.messageBubbleCfg;
  if (messageListRef.value) {
    resizeRefObserver = useResizeObserver(messageListRef.value, handleResizeRef);
  }
});

onUnmounted(() => {
  context.removeEventListener(RCKitEvents.CONVERSATION_SELECTED, onSelectedChanged);
  context.removeEventListener(InnerEvent.RECV_NEW_MESSAGES, onRecvNewMessages);
  context.removeEventListener(InnerEvent.INSERT_NEW_MESSAGES, onInsertNewMessages);
  context.removeEventListener(RCKitEvents.MESSAGES_DELETED, onDeleteMessages);
  context.removeEventListener(InnerEvent.MESSAGE_STATE_CHANGE, onMessageStateChange);
  context.removeEventListener(InnerEvent.FILE_UPLOAD_PROGRESS, onFileUploadProgress);
  window.removeEventListener("click", hideMsgMenu);
  window.removeEventListener('resize', update);
  stopMessageUidsWatch();
  if (messageListRef.value) {
    resizeRefObserver?.unobserve(messageListRef.value);
  }
});
</script>

<style>
p {
  margin: 0;
}
ul,li {
  padding: 0;
  margin: 0;
  list-style: none;
}
.rc-kit-msg-list {
  overflow-y: scroll;
  overflow-x: hidden;
  height: 100%;
  /* padding: 10px 6px; */
  scrollbar-width: none;
  box-sizing: border-box;
}

.rc-kit-msg-list::-webkit-scrollbar {
  display: none;
}

.rc-kit-msg-list-item {
  display: flex;
  width: 100%;
}

.rc-kit-grey-message {
  flex: 1;
  text-align: center;
}

.rc-kit-msg-avatar {
  padding: 0 8px;
}

.rc-kit-msg-bubble {
  padding: 8px 8px 8px 12px;
  border-radius: 8px 0 8px;
  font-size: 12px;
  line-height: 16px;
  /* flex: 1; */
  overflow: hidden;
  max-width: 70%;
}

.rc-message-list-menu {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  /* padding: 5px; */
  background-color: #fff;
  border-radius: 9px;
  box-shadow: 0px 5px 16px 0px #00000014;
  min-width: 95px;
}
.rc-message-list-menu  .read-number {
  font-size: 12px;
  font-weight: bold;
  padding: 6px;
  cursor: pointer;
}

.read-back {
  font-size: 12px;
  font-weight: bold;
  padding: 6px;
  cursor: pointer;
  border-bottom: 1px solid #A1A1A1;
  display: flex;
  align-items: center;
}

.read-list-ul {
  padding: 0 10px 0 0;
  height: 200px;
}

.read-list-li {
  display: flex;
  align-items: center;
  padding: 6px;
}

.read-info {
  margin-left: 10px;
}
.read-name {
  font-weight: bold;
  font-size: 12px;
}
.read-time {
  color: #A1A1A1;
  font-size: 12px;
  display: flex;
  align-items: center;
}


.rc-kit-msg-list-box {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.rc-kit-time-section {
  width: 100%;
}

.rc-kit-msg-list-box .checkbox {
  margin-right: 7px;
}

.rc-kit-msg-list-box .checkbox input[type="checkbox"] {
  display: none;
}

.rc-kit-msg-list-box .checkbox .custom {
  display: flex;
  width: 19px;
  height: 19px;
  border: 1px solid #ABB8CB;
  border-radius: 50%;
  background-color: #FFFFFF;
  font-size: 0;
  justify-content: center;
  align-items: center;
  cursor: pointer;
}

.rc-kit-msg-list-box .checkbox input[type="checkbox"]:checked+.custom {
  background-color: #0099FF;
  border-color: #0099FF;
}

.rc-kit-select {
  position: absolute;
  top: 150px;
  left: 0px;
  width: 100%;
  box-sizing: border-box;
  z-index: 1;
}
</style>
