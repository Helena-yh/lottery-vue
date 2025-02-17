<template>
  <div @click="(e: Event) => e.stopPropagation()" :style="{width: `${props.width}px`}" class="rc-kit-modal-dialog">
    <slot name="header"></slot>
    <slot name="content"> </slot>
    <slot name="footer"></slot>
  </div>
</template>
<script setup lang="ts">

const props = defineProps({
  width: {
    type: Number
  }
});

</script>
<style>
.rc-kit-modal-dialog {
  background-color: #fff;
  border-radius: 5px;
}
</style>