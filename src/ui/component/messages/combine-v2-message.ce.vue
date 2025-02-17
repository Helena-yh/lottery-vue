<template>
  <div>
    <div class="title">{{ title }}</div>
    <div class="summary" :style="{ color: isSender ? '#ffffff' : '#8f8f8f' }" v-for="item in summaryList">{{ item }}</div>
  </div>
</template>
<script setup lang="ts">
import { CombineV2MessageContent, ConversationType, getCurrentUserId } from "@rongcloud/imlib-next";
import { IRCKitMessageComponentProps } from "@lib/ui/interface";
import { $t } from '@lib/ui/i18n-vue';
import { Ref, computed, inject } from "vue";
import { RCKIT_ENV_KEYS } from "@lib/constants";

const { message } = defineProps<IRCKitMessageComponentProps>();

const content: CombineV2MessageContent = message.content as CombineV2MessageContent;
const { summaryList, conversationType, nameList, msgNum } = content;

const title = computed(() => {
  if (!conversationType || !nameList) return ''
  if (conversationType === ConversationType.PRIVATE) {
    return nameList.length === 2 ?  $t('private.combine-msg.title', ...nameList).value : $t('private.combine-msg.signal.title', ...nameList).value
  } else {
    return $t('group.combine-msg.title').value;
  }
})

const userId: Ref | undefined = inject(RCKIT_ENV_KEYS.CURRENT_USER_ID);
const isSender = computed(() => {
  // if(!userId?.value) return false
  // return userId.value === message.senderUserId
  // 修复 userId 可能为 false 的情况
  const userId = getCurrentUserId()
  if(!userId) return false
  return userId === message.senderUserId
});

</script>
<style lang="scss">
.title {
  font-size: 12px;
}
.summary {
  font-size: 10px;
  overflow: hidden;
  opacity: 0.7;
  height: 14px;
}
.title, .summary {
  max-width: 350px;
  word-wrap: break-word;
  word-break: break-all;
  text-overflow: ellipsis;
}
</style>
