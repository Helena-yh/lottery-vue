<template>
  <div class="modal-combine-provider" @click="handleCancel">
    <div class="rc-imkit-combine-box" @click="(e: Event) => e.stopPropagation()">
      <div class="rc-imkit-combine-header">
          <div class="title">{{ title }}</div>
          <span class="close" @click="handleCancel">x</span>
      </div>
      <div class="rc-imkit-combine-body">
        <div style="height: 100%;" v-if="props.type === MessageType.COMBINE">
          <div v-if="loading" class="loading">加载中.....</div>
          <iframe class="rc-imkit-iframe" :src="props.url" title="Iframe" @load="handleIframeOnload"></iframe>
        </div>
        <rc-scrollbar-provider v-else>
          <div style="padding: 10px 20px;">
            <div v-for="item in messageRenderList">
              <rc-message-time style="margin-bottom: 10px;" v-if="typeof item === 'string'" :time="item"></rc-message-time>
              <div v-else class="rc-kit-msg-list-item" :style="{ 'flex-direction': 'row' }">
                <rc-icon
                  class="rc-kit-msg-avatar"
                  :url="handleUserProfiles(item).portraitUri"
                  :width="40" :height="40"
                  :radius="50" :online="false"></rc-icon>

                <div class="rc-kit-msg-bubble" @click="handleBubbleClick(item)">
                  <p class="name">{{ handleUserProfiles(item).name }}</p>
                  <div class="message-body-wrapper">
                    <component @download="handleFileDownload(item)" :is="getMessageComponentTag(item.objectName)"
                      @link="handleLinkClick"
                      :userId="item.fromUserId" :message="{
                        ...item, messageType: item.objectName,
                        messageDirection: MessageDirection.RECEIVE,
                        messageUId: `${item.timestamp}`
                        }">
                    </component>
                  </div>
                  <div class="footer">
                    <span class="time">{{ timeController(item.timestamp) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </rc-scrollbar-provider>
      </div>

    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { MessageType, IAReceivedMessage, ConversationType, CombineV2MessageContent, ICombinedMessage, MessageDirection }  from '@rongcloud/imlib-next'
import { ctx, getMessageComponentTag } from '../context';
import { ICacheUserProfile } from '../../../modules/appdata/UserCache';
import { formatTime } from '../../../helper';
import { RCKitEvent } from "../../../core/RCKitEvent";
import { $t, $tt } from '@lib/ui/i18n-vue';
import { IRCKitLanguageEntries } from '@lib/languages'
import { RCKitEvents, MessagesDeletedEvent } from '@lib/core/EventDefined';

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const props = defineProps<{
  url: string
  content: string
  type: string
  messageUid: string
}>();

const content = ref<CombineV2MessageContent>(JSON.parse(props.content));

const loading = ref<boolean>(true);
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
const messageRenderList = computed(() => {
  const list = content.value.msgList;
  const result: (ICombinedMessage | string)[] = [];
  if(!list) return
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const item = list[i];
    result.unshift(item);

    const before = list[i - 1];
    if (before) {
      // 与前一消息不属于同一天，向前插入时间数据
      if (new Date(item.timestamp).toDateString() !== new Date(before.timestamp).toDateString()) {
        result.unshift(handleTimeFilter(item.timestamp));
      }
    } else {
      // 当前消息为第一条消息，判断是否有更多可拉取的历史消息，没有则插入时间数据
      result.unshift(handleTimeFilter(item.timestamp));
    }
  }
  return result;
});

/**
 * 处理用户详细信息
 */
 const handleUserProfiles = (msg: ICombinedMessage): ICacheUserProfile => {
  return ctx().appData.getUserProfile(msg.fromUserId)
}

const title = computed(() => {
  if (!content.value || !content.value.conversationType || !content.value.nameList) return ''
  if (content.value.conversationType === ConversationType.PRIVATE) {
    return content.value.nameList.length === 2 ?  $t('private.combine-msg.title', ...content.value.nameList).value : $t('private.combine-msg.signal.title', ...content.value.nameList).value
  } else {
    return $t('group.combine-msg.title').value;
  }
})

const timeController = (time: number) => {
  const { hour, minute } = formatTime(time)!;
  return `${hour}:${minute}`;
};
const handleBubbleClick = (item: ICombinedMessage) => {
  switch (item.objectName) {
    case MessageType.IMAGE:
    case MessageType.SIGHT:
      const msg: any = {
        senderUserId: item.fromUserId,
        sentTime: item.timestamp,
        messageType: item.objectName,
        content: item.content
      }
      ctx().emit(new RCKitEvent(RCKitEvents.MEDIA_MESSAGE_MODAL_EVENT, msg));
      break;
    case MessageType.COMBINE:
    case MessageType.COMBINE_V2:
      ctx().emit(new RCKitEvent(RCKitEvents.COMBINE_MESSAGE_MODAL_EVENT, item as any));
      break
    default:
      break;
  }
}

const handleFileDownload = (message: ICombinedMessage) => {
  // 需将合并转发的消息格式转换成 IAReceivedMessage
  const msg: IAReceivedMessage = {
    messageType: message.objectName,
    content: message.content,
    senderUserId: message.fromUserId,
    targetId: message.targetId,
    channelId: '',
    conversationType: 1,
    sentTime: 0,
    receivedTime: 0,
    messageUId:'',
    messageDirection: 1,
    isPersited: true,
    isCounted: true,
    isOffLineMessage: false,
    canIncludeExpansion: true,
    receivedStatus: 1,
  }
  emit('download', msg);
}
const handleLinkClick = (data: CustomEvent) => {
  ctx().emit(new RCKitEvent(RCKitEvents.MESSAGE_LINK_CLICK, data.detail[0]));
}

const handleCancel = (e: MouseEvent) => {
  emit('cancel');
}
const handleIframeOnload = () => {
  loading.value = false;
}

const _onDeleteMessages = (e: MessagesDeletedEvent) => {
  e.data.forEach((item) => {
    const { recallMsg } = item;
    if (recallMsg && recallMsg.content.messageUId === props.messageUid) {
      ctx().alert('alert.message-deleted');
      emit('cancel');
    }
  })
}

onMounted(() => {
  // 请求远端地址获取 json 数据
  if(content.value.remoteUrl) {
    fetch(content.value.remoteUrl).then((res) => {
      return res.json();
    }).then((data) => {
      content.value.msgList = data;
    })
  }
  ctx().addEventListener(RCKitEvents.MESSAGES_DELETED, _onDeleteMessages);
})

onUnmounted(() => {
  ctx().removeEventListener(RCKitEvents.MESSAGES_DELETED, _onDeleteMessages);
})

</script>
<style>
.modal-combine-provider {
  flex-direction: column;
  position: absolute;
  inset: 0px;
  z-index: 2;
  background-color: rgba(0, 0, 0, .5);
}
.rc-imkit-combine-box {
  background-color: #E6ECF3;
  height: 70%;
  width: 50%;
  box-shadow: 0px 10px 16px 0px #00000033;
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 8px;
  overflow: hidden;
}
.rc-imkit-combine-header {
  background-color: #FFFFFF;
  position: relative;
}
.title {
  text-align: center;
  line-height: 19px;
  font-size: 12px;
  padding: 11px 0;
}
.close {
  position: absolute;
  top: 50%;
  right: 15px;
  padding: 0 5px;
  transform: translate(0, -50%);
  cursor: pointer;
}
.rc-imkit-combine-body {
  flex: 1;
  overflow: hidden;
}

.loading {
  font-size: 18px;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
.rc-imkit-iframe {
  height: 100%;
  width: 100%;
  overflow: scroll;
}
.rc-kit-msg-list-item {
  display: flex;
  width: 100%;
  font-size: 12px;
  margin-bottom: 20px;
}
.rc-kit-msg-avatar {
  padding: 0 8px;
}

.rc-kit-msg-bubble {
  padding: 8px 8px 8px 12px;
  border-radius: 0px 8px 8px;
  font-size: 12px;
  line-height: 16px;
  background-color: #fff;
}
p {
  margin: 0 0 5px 0;
  line-height: 16px;
  padding: 0;
  word-break: break-word;
  font-size: 12px;
}

.name {
  font-weight: 500;
  font-size: 12px;
}
.footer {
  text-align: right;
  margin-top: 5px;
  font-size: 10px;
  display: flex;
  align-items: center;
  flex-direction: row-reverse;
}

.time {
  display: inline-block;
  margin-left: 7px;
  font-size: 12px;
  color: #7B87A5;
}

</style>
../../../modules/appdata/AppDataModule
