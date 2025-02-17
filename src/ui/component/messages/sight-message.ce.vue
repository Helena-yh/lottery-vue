
<template>
  <rc-file-transfer-ctrl-provider :message="message">
    <div class="rc-kit-sight-message">
      <div class="wraper">
        <img :src="'data:image/png;base64,' + message.content.content" :alt="message.content.name" />
        <span class="time">{{ formatTimeLength(Math.floor(message.content.duration)) }}</span>
      </div>
      
    </div>
    <div slot="marked"></div>
  </rc-file-transfer-ctrl-provider>
</template>

<script setup lang="ts">
import { IRCKitMessageComponentProps } from '@lib/ui/interface';
import { formatTimeLength } from '../../../helper'

const { message } = defineProps<IRCKitMessageComponentProps>()
</script>

<style lang="scss">
.rc-kit-sight-message {
  text-align: center;
}
.wraper {
  position: relative;
  display: inline-block;
  .time {
    position: absolute;
    bottom: 10px;
    right: 10px;
    background-color: rgba(0, 0, 0, 0.5);
    color: #fff;
    padding: 2px 4px;
    font-size: 12px;
    line-height: 1;
    border-radius: 2px;
  }

  img {
    max-width: 200px;
  }
}
.marked {
  background-color: rgba(0, 0, 0, .6);
  height: 100%;
}
</style>