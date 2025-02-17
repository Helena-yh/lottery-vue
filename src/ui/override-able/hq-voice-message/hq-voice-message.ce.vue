<template>
  <div>
    <div class="voice">
      <img :src="btnIcon" alt="Button Icon" class="control" @click="toggleState" />
      <div class="right">
        <div class="progress">
          <div class="line" v-for="(item, index) in processLines"
            :style="{height: item + 'px', backgroundColor: lineColor}"
            :class="{active: runIndex >= index}"
          ></div>
        </div>
        <div class="time">{{ duration }}</div>
      </div>
    </div>
  </div>

</template>
<script setup lang="ts">
import { computed } from 'vue';
import { AUDIO_RUN_ICON, AUDIO_RUN_SELF_ICON, AUDIO_STOP_ICON, AUDIO_STOP_SELF_ICON } from '../../../assets';
import { IRCKitHQVoiceMessageComponentProps } from './IRCKitHQVoiceMessageComponentProps'

const { value: props } = defineProps<{ value: IRCKitHQVoiceMessageComponentProps }>();

/**
 * 获取时间长度, 单位 s
 */
 const formatTimeLength = (time: number): string => {
  const minutes = Math.floor(time / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (time < 60) return `0:${ Math.floor(time).toString().padStart(2, '0')}`;
  time = Math.floor(time)

  return `${days > 0 ? `${days}d ` : ''}${
    hours > 0 ? `${(hours % 24).toString().padStart(2, '0').trim()}:` : ''}${
    minutes > 0 ? `${(minutes % 60).toString()}:` : ''}${
    (time % 60).toString().padStart(2, '0')}`.trim();
};

const duration = formatTimeLength(props.duration);

/**
 * 按钮图标
 */
const stopIcon = props.isOwner ? AUDIO_STOP_SELF_ICON : AUDIO_STOP_ICON
const runIcon = props.isOwner ? AUDIO_RUN_SELF_ICON : AUDIO_RUN_ICON
/**
 * 进度条颜色
 */
const lineColor = props.isOwner ? '#FFF' : '#0099FF'
/**
 * 进度条
 */
const processLines = new Array(20).fill(0).map(item => (Math.floor(Math.random() * 9) + 3) * 2 )

/**
 * 进度条运行索引
 */
const runIndex = computed(() => Math.floor(props.progress / 100 * 20) || -1);
const btnIcon = computed(() => props.playing ? runIcon : stopIcon);

/**
 * 切换状态
 */
const toggleState = () => props.toggle();

</script>
<style lang="scss">
.voice {
  display: flex;
  align-items: center;
  .control {
    width: 41px;
    height: 41px;
    margin-right: 15px;
    cursor: pointer;
  }
  .right {
    .progress {
      height: 22px;
      margin-bottom: 5px;
      display: flex;
      align-items: flex-end;
      .line {
        margin-right: 3px;
        width: 4px;
        border-radius: 4px;
        opacity: 0.4;
        animation: bounce-in 2s;

        &.active {
          transition: all 0.5s;
          opacity: 1;
        }
      }
    }
    .time {
      font-style: 12px;
    }
  }
}
</style>
../../assets
