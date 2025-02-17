<template>
  <rc-hq-voice-message :value="componentProps"></rc-hq-voice-message>
</template>

<script setup lang="ts">
import { ctx } from './context';
import { IRCKitCachedMessage } from '../../modules/MessageDataModule';
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { AudioPlayEvent, AudioPlayState, InnerEvent } from '../../core/EventDefined';
import { MessageDirection } from '@rongcloud/imlib-next';
import { IRCKitHQVoiceMessageComponentProps } from '../override-able';

const context = ctx();
const props = defineProps<{
  message: IRCKitCachedMessage
}>();

const message = props.message;
const msgContent = message.content;
const duration: number = msgContent.duration;
const remoteUrl: string = msgContent.remoteUrl;
const progress = ref(0);
const playing = ref(false);
const isOwner: boolean = message.messageDirection === MessageDirection.SEND;

const onAudioPlay = (evt: AudioPlayEvent) => {
  parseAudioState(evt.data);
}

const parseAudioState = (data: AudioPlayState) => {
  const { status, progress: p, messageUId, transactionId } = data;
  const { messageUId: cUid, transactionId: cTid } = message;

  if ((cUid && cUid === messageUId) || (transactionId && transactionId === cTid)) {
    playing.value = status === 'playing';
    // 播放进度
    progress.value = p === 100 ? 0 : (p || 0);
    return;
  }

  // 清理非当前播放的音频消息状态
  progress.value = 0;
  playing.value = false;
}

const onToggle = () => {
  if (playing.value) {
    context.audioPlayer.pause();
  } else {
    context.audioPlayer.play(remoteUrl, props.message.messageUId, props.message.transactionId);
  }
};

const componentProps: IRCKitHQVoiceMessageComponentProps = reactive({
  duration,
  isOwner,
  playing,
  progress,
  toggle: onToggle
})

onMounted(() => {
  context.addEventListener(InnerEvent.AUDIO_PLAY_EVENT, onAudioPlay);
  const data = context.audioPlayer.getCurrentState();
  parseAudioState(data);
})

onUnmounted(() => {
  context.removeEventListener(InnerEvent.AUDIO_PLAY_EVENT, onAudioPlay);
})

</script>
