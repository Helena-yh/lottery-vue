<template>
  <div class="rc-kit-app-wrapper-left">
    <div class="rc-kit-app-conv">
      <rc-conversation-list-provider></rc-conversation-list-provider>
    </div>
  </div>
</template>

<script setup lang="ts">
import { setEnvInfo } from './context';

setEnvInfo();
</script>

<style>
.rc-kit-app-wrapper-left {
  min-width: 312px;
  width: 312px;
  height: 100%;
  display: flex;
  flex-direction: column;
}
.rc-kit-app-conv {
  flex: auto;
  overflow: hidden;
  padding-top: 10px;
}
</style>