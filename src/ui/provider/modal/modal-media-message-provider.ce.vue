<template>
  <div class="modal-media-message-provider">
    <rc-modal-provider @click="handleCancel">
      <div class="media-message-header" @click="(e: Event) => e.stopPropagation()">
        <div class="user-info">
          <rc-icon
            width="40"
            height="40"
            :radius="50"
            :online="false"
            :url="getUserProfile()?.portraitUri"></rc-icon>
            <div class="user-info-text">
              <p class="name">{{ getUserProfile()?.name }}</p>
              <p class="time">{{ handleTime(props.sentTime) }}</p>
            </div>
        </div>
        <div class="menu">
          <span class="btn active" @click="handleChangeHeight(+5, $event)">+</span>
          <span class="btn active" @click="handleChangeHeight(-5, $event)">-</span>
          <img class="btn" @click="handleFileDownload" :src="MODAL_DOWNLOAD_ICON" alt="MODAL_DOWNLOAD_ICON">
          <img class="btn" @click="handleCancel" :src="MODAL_CLOSE_ICON" alt="MODAL_CLOSE_ICON">
        </div>
      </div>
      <div v-if="props.messageType === MessageType.IMAGE || props.messageType === MessageType.GIF"
        class="media-message-box" ref="boxRef" :class="{'self-start': selfStart}">
        <div class="media-message" :style="{ 'width':`${widthSize}%` }">
          <img style="width: 100%;" ref="imgRef" @click="(e: Event) => e.stopPropagation()"
            :src="props.url" :onload="handleLoad" :onerror="handleError" alt="image">
        </div>
      </div>
      <div class="media-message-box" ref="boxRef" v-if="props.messageType === MessageType.SIGHT">
        <div class="media-message" :style="{ 'height':`${heightSize}%` }">
          <video
            :poster="`data:image/png;base64,${props.content}`"
            style="height: 100%;" @click="(e: Event) => e.stopPropagation()"
            :src="props.url" controls>
            <track kind="subtitles">
            <track kind="description">
          </video>
        </div>
      </div>

    </rc-modal-provider>
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { MessageType } from "@rongcloud/engine";
import { ctx } from '../context';
import { MODAL_CLOSE_ICON, MODAL_DOWNLOAD_ICON } from '../../../assets';
import { formatTime } from '@lib/helper';
import { RCKitEvents, MessagesDeletedEvent } from '@lib/core/EventDefined';
import { IMAGE_FAILED } from '@lib/assets/index';

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const props = defineProps<{
  url: string
  userId: string
  sentTime: string
  messageType: string
  messageUid: string
  content: string
}>()

const handleCancel = (e: MouseEvent) => {
  emit('cancel');
}

const getUserProfile = () => {
  return ctx().appData.getUserProfile(props.userId)
}

 const widthSize = ref<number>(50);
 const heightSize = ref<number>(100);

 const handleChangeHeight = (num: number, e: Event) => {
  if(props.messageType === MessageType.SIGHT){
    if((heightSize.value + num) > 100 || (heightSize.value + num)  < 50) return;
    heightSize.value = heightSize.value + num
  } else {
    selfStart.value = imgRef.value.clientHeight > boxRef.value.clientHeight
    if((widthSize.value + num) > 70 || (widthSize.value + num)  < 10) return;
    widthSize.value = widthSize.value + num
  }
}

 const handleFileDownload = () => {
  emit('download');
}

 const handleTime = (time: string) => {
  const { year, month, day, hour, minute } = formatTime(Number(time));
  return `${year}.${month}.${day} ${hour}:${minute}`
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

 const imgRef = ref();
 const boxRef = ref();

 const handleError = () => {
  imgRef.value.src = IMAGE_FAILED
}

 const handleLoad = () => {
  selfStart.value = imgRef.value.clientHeight > boxRef.value.clientHeight
}

 const selfStart = ref(false);

onMounted(() => {
  ctx().addEventListener(RCKitEvents.MESSAGES_DELETED, _onDeleteMessages);
})

onUnmounted(() => {
  ctx().removeEventListener(RCKitEvents.MESSAGES_DELETED, _onDeleteMessages);
})


</script>
<style>
p {
  margin: 0;
  padding: 0;
}
.media-message-box {
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  display: flex;
  justify-content: center;
  align-items: center;
}
.media-message-box.self-start{
  align-items: self-start;
}
.media-message-header{
  position: absolute;
  top: 0px;
  width: 100%;
  display: flex;
  justify-content: space-between;
  padding: 5px 25px;
  background-color: rgba(0, 0, 0, .7);
  box-sizing: border-box
}
.user-info {
 display: flex;
 align-items: center;
}
.user-info-text {
  margin-left: 12px;
  font-size: 12px;
  line-height: 18px;
}
.user-info-text .name{
  color: #FFFFFF;
  font-weight: bold;
}
.user-info-text .time{
  color: #818181;
}

.media-message {
  width: 50%;
  font-size: 0;
  display: flex;
  justify-content: center;
  z-index: 1;
}
.menu {
  display: flex;
  align-items: center;
  z-index: 2;
}

.btn {
  padding: 0 12px;
  cursor: pointer;
}
.btn.active {
  color: #FFFFFF;
  font-size: 20px
}
</style>
