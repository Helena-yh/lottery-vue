<template>
  <div>
    <p v-if="props.showname" class="name" :class="{ align: props.align }"
      :style="{ color: message.messageDirection === 1 ? '#FFF' : '#0099FF' }">
      {{ profile.nickname || profile.name }}
    </p>
    <div class="message-body-wrapper">
      <slot></slot>
    </div>
    <div class="footer" :style="{ color: message.messageDirection === 1 ? '#FFF' : '#7B87A5' }">

      <span class="time">{{ timeController(message.sentTime) }}</span>
      <rc-message-sent-status
        v-if="props.statusEnable" :type="0"
        :message="props.message"></rc-message-sent-status>
    </div>
  </div>
</template>
<script setup lang="ts">
import { IAReceivedMessage } from "@rongcloud/imlib-next";
import { formatTime } from "../../helper";

const props = defineProps<{
  showname: boolean | null;
  align: boolean | null;
  message: IAReceivedMessage;
  statusEnable: boolean | null;
  profile: {
    name: string
    nickname?: string
    userId: string
    portraitUri: string
  }
}>();

const timeController = (time: number) => {
  const { hour, minute } = formatTime(time)!;
  return `${hour}:${minute}`;
};


</script>
<style>
p {
  margin: 0 0 5px 0;
  line-height: 16px;
  padding: 0;
  word-break: break-word;
}

.name {
  font-weight: 500;
  font-size: 12px;
}

.align {
  text-align: right;
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
}
</style>
