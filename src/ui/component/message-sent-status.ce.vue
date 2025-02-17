<template>
<div class="rc-kit-message-sent-status">
  <img :src="handleMessageSentStatus(props.message)" alt="status">
</div>
</template>
<script setup lang="ts">
import { IAReceivedMessage } from "@rongcloud/imlib-next";
import {
  SENT_STATUS_FAILED_ICON,
  SENT_STATUS_READ_ICON,
  SENT_STATUS_UNREAD_ICON,
  SENT_STATUS_SENDING_ICON,
  SENT_STATUS_UNREAD_CHAT_ICON,
  SENT_STATUS_SENDING_CHAT_ICON,
} from '../../assets'

const props = defineProps<{
  message: IAReceivedMessage,
  type: number
}>()

const handleMessageSentStatus = (message: IAReceivedMessage) => {
  let icon = SENT_STATUS_UNREAD_ICON
  switch (message.sentStatus) {
    case 10:
      icon = props.type ? SENT_STATUS_SENDING_ICON : SENT_STATUS_SENDING_CHAT_ICON
      break;
    case 20:
      icon = SENT_STATUS_FAILED_ICON
      break;
    case 30:
      icon = props.type ? SENT_STATUS_UNREAD_ICON : SENT_STATUS_UNREAD_CHAT_ICON
      break;
    case 50:
      icon = SENT_STATUS_READ_ICON
      break;
    default:
      break;
  }
  return icon
}

</script>
<style>
.rc-kit-message-sent-status {
  display: flex;
  align-items: center;
  font-size: 0;
}
</style>
