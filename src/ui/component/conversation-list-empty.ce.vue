<!-- 会话列表未选中时，左侧的展示组件 -->
<template>
  <div class="empty">
    <span>{{ desc }}</span>
  </div>
</template>

<script setup lang="ts">

defineProps({
  desc: {
    type: String,
    required: true
  }
})
</script>

<style>
.empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  line-height: 24px;
  background: #FFFFFF;
  color: #b3b3b3;
  font-size: 16px;
}
</style>