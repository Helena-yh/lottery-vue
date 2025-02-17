
<template>
  <p v-if="contentInfo.type === 0">{{ message.content.content || '' }}</p>
  <p v-else>
    <span v-for="(item, index) in contentInfo.content" :key="index">
      <span v-if="contentInfo.position.includes(index+1)">
        <a v-if="item.type === 'mail'" @click="emit('link',{ type: 'mail', address: item.content })" href="javascript:;">{{ item.content }}</a>
        <a v-else @click="emit('link',{ type: 'url', address: item.content })" href="javascript:;">{{ item.content }}</a>
      </span>
      <span v-else>{{ item.content }}</span>
    </span>

  </p>
</template>

<script setup lang="ts">
/**
 * @description: 文本消息组件
 */
import { formatTxtMessageContent } from '../../../helper';
import { IRCKitCachedMessage } from '../../../modules/MessageDataModule';

const props = defineProps<{
  message: IRCKitCachedMessage
}>();

const emit = defineEmits<{
  (e: string, ...item: any[]): void;
}>();

const contentInfo = formatTxtMessageContent(props.message.content.content || '');

</script>

<style>

p {
  margin: 0;
  padding: 0;
  word-break: break-word;
  font-size: 12px;
  line-height: 16px;
  white-space: pre-wrap;
}
</style>
