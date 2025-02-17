<template>
  <div class="rc-kit-select" >
    <span class="line"></span>
    <span class="btn" @click="emit('select')">{{ msg }}</span>
  </div>
</template>

<script setup lang="ts">

import { computed } from 'vue'
import { $tt } from '../i18n-vue';
const props = defineProps<{
  selected: boolean | null
}>()

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const msg = computed(() => {
  return props.selected ? $tt('message.list.select') : $tt('message.list.unselect');
})

</script>

<style>
.rc-kit-select .line {
  /* position: absolute;
  top: 50%;
  left: 0; */
  display: block;
  width: 100%;
  border: 1px solid #99B2CF;
}
.rc-kit-select .btn {
  position: absolute;
  padding: 0 12px;
  line-height: 25px;
  color: #FFFFFF;
  background-color: #99B2CF;
  border-radius: 6px;
  font-size: 12px;
  display: inline-block;
  margin-left: 68px;
  z-index: 2;
  top: -12px;
  cursor: pointer;
}

</style>
