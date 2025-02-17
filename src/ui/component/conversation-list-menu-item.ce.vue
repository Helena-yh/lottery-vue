<template>
  <div class="rc-conversation-list-menu-item">
    <img :src="props.icon" alt="Icon">
    <div class="content">
      <span>{{ label }}</span>
    </div>

  </div>
</template>
<script setup lang="ts">
const props = defineProps<{
  id: string
  icon: string,
  label: string,
}>()
</script>

<style>
.rc-conversation-list-menu-item {
  display: flex;
  align-items: center;
  font-size: 12px;
  padding: 6px;
  border-radius: 5px;
  cursor: pointer;
}
.rc-conversation-list-menu-item:hover {
  background-color: #E3EDF7;
}
.content{
  flex: auto;
  padding-left: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
