<template>
  <div class="file-message">
    <div class="icon">
      <rc-file-transfer-ctrl-provider :message="message">
        <svg width="37" height="44" viewBox="0 0 37 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M33.7016 43.0046H3.38582C1.56688 43.0046 0.354248 41.7919 0.354248 39.973V3.59408C0.354248 1.77513 1.56688 0.5625 3.38582 0.5625H21.5753V12.6888C21.5753 14.5077 22.7879 15.7204 24.6069 15.7204H36.7332V39.973C36.7332 41.7919 35.5205 43.0046 33.7016 43.0046ZM24.6069 9.65723V0.5625L36.7332 12.6888H27.6384C25.8195 12.6888 24.6069 11.4762 24.6069 9.65723Z"
            :fill="isSender ? 'white' : '#0099FF'" />
        </svg>
        <svg slot="marked" width="37" height="44" viewBox="0 0 37 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M33.7016 43.0514H3.38582C1.56688 43.0514 0.354248 41.8388 0.354248 40.0199V3.64095C0.354248 1.82201 1.56688 0.609375 3.38582 0.609375H21.5753V12.7357C21.5753 14.5546 22.7879 15.7673 24.6069 15.7673H36.7332V40.0199C36.7332 41.8388 35.5205 43.0514 33.7016 43.0514ZM24.6069 9.7041V0.609375L36.7332 12.7357H27.6384C25.8195 12.7357 24.6069 11.523 24.6069 9.7041Z"
            fill="black" fill-opacity="0.3" />
        </svg>
      </rc-file-transfer-ctrl-provider>
    </div>
    <div class="desc">
      <div class="name" :style="{ color: isSender ? 'white' : 'black' }">{{ message.content.name }}</div>
      <span :style="{ color: isSender ? 'white' : '#7B87A5' }">{{ formatFileSize(message.content.size) }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * @description: 文件消息组件
 */
import { IRCKitMessageComponentProps } from "@lib/ui/interface";
import { formatFileSize } from "../../../helper";
import { Ref, computed, inject } from "vue";
import { RCKIT_ENV_KEYS } from "@lib/constants";

const { message } = defineProps<IRCKitMessageComponentProps>();

const userId: Ref | undefined = inject(RCKIT_ENV_KEYS.CURRENT_USER_ID);
const isSender = computed(() => {
  if(!userId?.value) return false
  return userId.value === message.senderUserId
});
</script>

<style lang="scss">
.file-message {
  display: flex;
  align-items: center;
}

.icon {
  position: relative;
  height: 44px;
}

.desc {
  font-size: 12px;
  line-height: 18px;
  padding: 0 6px;
}

.name {
  max-width: 360px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}</style>

