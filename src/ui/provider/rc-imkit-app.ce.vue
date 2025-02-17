<template>
  <div class="rc-kit-app">
    <rc-conversation-list-container-provider class="list"></rc-conversation-list-container-provider>
    <rc-conversation-detail-provider class="detail"></rc-conversation-detail-provider>
  </div>
</template>

<script setup lang="ts">
</script>

<style>
.rc-kit-app {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: row;
}
.detail {
  flex: 1 auto;
  overflow: hidden;
}
.list {
  border-right: 1px solid #EFEFEF;
}
</style>