<template>
  <div class="rc-imkit-connection-status">
    {{ content }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { $tt } from '../i18n-vue';
import { RCConnectionStatus, ErrorCode } from '@rongcloud/imlib-next'
const props = defineProps<{
  status: RCConnectionStatus
  code: ErrorCode | undefined
}>()
const content = computed(() => {
  if (props.status === RCConnectionStatus.DISCONNECTED) {
    return  $tt('connection.status.disconnected')
  }
  return $tt('connection.status.suspended')
})
</script>

<style>
.rc-imkit-connection-status {
  width: 50%;
  position: absolute;
  top: 70px;
  left: 50%;
  transform: translate(-50%, 0%);
  text-align: center;
  line-height: 26px;
  border-radius: 26px;
  background-color: #DA2424;
  color: #fff;
  font-size: 12px;
  opacity: .6;
  z-index: 1;
}
</style>