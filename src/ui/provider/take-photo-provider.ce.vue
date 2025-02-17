<template>
  <div class="rc-take-photo-provider">
    <div class="header-bar">
      <div class="header-bar-left" @click="handleCancel">
        <img :src="TAKE_PHOTO_CANCEL_ICON" alt="Cancel Icon"><span>{{ cancelLabel }}</span>
      </div>
      <div class="header-bar-right" v-show="photo" @click="handleRetry">
        <img :src="TAKE_PHOTO_RETRY_ICON" alt="Retry Icon"><span>{{ retryLabel }}</span>
      </div>
    </div>
    <div class="video-container" ref="videoContainer">
      <video v-show="!photo && stream" ref="videoDom" playsinline :srcObject="stream" autoplay></video>
      <img ref="imageDom" v-show="photo" :src="photo" alt="Photo">
      <span class="message" v-if="!stream">{{ message }}</span>
    </div>
    <div class="footer">
      <div v-if="stream" class="footer-button" @click="!photo ? takePhoto() : sendImage()">
        <img v-if="!photo" :src="TAKE_PHOTO_CAMERA_ICON" alt="Camera Icon">
        <span v-else="photo">{{ sendLabel }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick, computed } from 'vue';
import { cameraOpened, ctx } from './context';
import { TAKE_PHOTO_CAMERA_ICON, TAKE_PHOTO_CANCEL_ICON, TAKE_PHOTO_RETRY_ICON } from '../../assets';
import { $t } from '../i18n-vue';
import { RCKitEvents } from '@lib/core/EventDefined';

const videoDom = ref();
const videoContainer = ref();
const imageDom = ref();
const stream = ref<MediaStream | null>(null);
const photo = ref<string>('');
const sendLabel = $t('take-photo.send-btn.label');
const cancelLabel = $t('take-photo.cancel-btn.label');
const retryLabel = $t('take-photo.retry-btn.label');
let blob: Blob | null = null;

let capturing: Promise<MediaStream> | null = null;

const errormsg = ref('');
const message = computed(() => {
  if (errormsg.value) {
    return $t('take-photo.msg.camera-startup-failure', errormsg.value).value;
  }
  if (!stream.value) {
    return $t('take-photo.msg.camera-starting').value;
  }
  return '';
});

const handleCancel = () => {
  cameraOpened.value = false;
  if (photo.value) {
    URL.revokeObjectURL(photo.value);
    photo.value = '';
  }
  blob = null;
  destroyStream();
};

const handleRetry = () => {
  URL.revokeObjectURL(photo.value);
  photo.value = '';
  blob = null;
};

const takeStream = async () => {
  if (capturing) {
    return capturing;
  }
  try {
    capturing = navigator.mediaDevices.getUserMedia({ video: { width: 720, height: 720 } });
    stream.value = await capturing;
  } catch (error: any) {
    errormsg.value = error.message;
  }
}

const destroyStream = async () => {
  if (!capturing) {
    return;
  }

  // 正在取流中，等待取流完成，否则可能因异步问题导致清理无效，取流后 stream 被重新赋值
  const stream = await capturing;
  stream?.getTracks().forEach(track => track.stop());
};

const takePhotoHandle = (): Promise<Blob> => {
  return new Promise(resolve => {
    const canvas = document.createElement('canvas');
    const video = videoDom.value;
    const { width, height } = video;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(video, 0, 0, width, height);
    canvas.toBlob((blob) => resolve(blob!), 'image/jpg', 1);
  });
};

const takePhoto = async () => {
  blob = await takePhotoHandle();
  photo.value = URL.createObjectURL(blob);
};

const sendImage = () => {
  // 发送照片
  const context = ctx();
  context.message.sendImages(
    context.conversation.getOpenedConversation()!,
    [ new File([blob!], `screenshot-${Date.now()}.jpg`, { type: 'image/jpg' }) ]
  );
  // 清理资源
  handleCancel();
};

const resize = () => {
  const video = videoDom.value;
  const container = videoContainer.value;
  const image = imageDom.value;
  const { scrollWidth: width, scrollHeight: height } = container;
  const size = Math.min(width, height);
  image.width = video.width = image.height = video.height = size;
}

onMounted(async () => {
  ctx().addEventListener(RCKitEvents.CONVERSATION_SELECTED, handleCancel);
  window.addEventListener('resize', resize);
  takeStream();
  // 等待 DOM 尺寸计算完成
  await nextTick();
  resize();
})

onUnmounted(() => {
  ctx().removeEventListener(RCKitEvents.CONVERSATION_SELECTED, handleCancel);
  window.removeEventListener('resize', resize);
});
</script>

<style>
.rc-take-photo-provider {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
}

.header-bar {
  height: 32px;
  width: 100%;
  background-color: #226bc0;
  display: flex;
  flex-direction: row;
  align-items: center;
  border: none;
  color: #fff;
  font-size: 12px;
}

.header-bar-left {
  display: flex;
  align-items: center;
  flex: auto;
  margin-left: 16px;
  cursor: pointer;
}

.header-bar-right {
  cursor: pointer;
  display: flex;
  align-items: center;
  margin-right: 16px;
}

.header-bar-left img,
.header-bar-right img {
  width: 12px;
  height: 12px;
  margin-right: 6px;
}

.video-container {
  flex: 1 auto;
  display: flex;
  flex-direction: row;
  align-items: center;
  pointer-events: none;
}

.message {
  color: #a1a1a1;
  font-size: 14px;
  margin: 0 auto;
}

.video-container video,
.video-container img {
  object-fit: contain;
  margin: 0 auto;
}

.footer {
  height: 80px;
  display: flex;
  flex-direction: row;
  /* 兼容safari浏览器遮挡发送按钮*/
  z-index: 1;
}

.footer-button {
  display: inline-block;
  border-radius: 24px;
  height: 48px;
  width: 48px;
  background-color: #0099ff;
  margin: -24px auto 0;
  cursor: pointer;
  font-size: 14px;
  color: #fff;
  text-align: center;
}

.footer-button img {
  display: block;
  width: 18px;
  height: 16px;
  margin: 16px 15px;
}

.footer-button span {
  display: block;
  line-height: 48px;
}
</style>
