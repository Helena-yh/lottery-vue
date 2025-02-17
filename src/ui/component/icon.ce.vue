<template>
  <div class="rc-icon" :style="{ 'width': `${props.width}px`, 'height': `${props.height}`, 'borderRadius': `${props.radius}%` }">
    <img 
      class="author" 
      :src="props.url" alt="icon">
    <span v-if="props.online" class="rc-icon-online"></span>
  </div>
</template>

<script setup lang="ts">
const props = defineProps({
  url: {
    type: String,
    require: true,
  },
  online: {
    type: Boolean,
    require: true
  },
  width: {
    type: Number,
    require: true
  },
  height: {
    type: Number,
    require: true
  },
  radius: {
    type: Number,
    require: true
  },
})

</script>
<style>
.author {
  border: none;
  margin: 0;
  padding: 0; 
  width: 100%;
  height: 100%;
}
.rc-icon {
  font-size: 0;
  overflow: hidden;
}
.rc-icon-online {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #1BC12E;
  border: 1px solid #FFFFFF;
  position: absolute;
  right: 3px;
  bottom: 3px;
}
</style>