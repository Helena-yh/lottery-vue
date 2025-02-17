<template>
  <div class="rc-kit-conversation-unread">
    <div v-if="props.count || props.markunread" 
      :class="{ 'active': props.notification == 5 }" class="unread-box">
      <span 
        :class="{'active':  props.count > 99}"
        class="message-count">
          {{ props.count ? handleCount() : '' }}
      </span>
    </div>
  </div>
  
</template>

<script setup lang="ts">
const props = defineProps({
  count: {
    type: Number,
    require: true,
    default: 0,
  },
  notification: {
    type: Number,
    require: true,
    default: -1,
  },
  markunread: {
    type: Boolean,
    require: true,
    default: false,
  }
})

const handleCount = () => {
  if (props.count > 99) {
    return '99+'
  }
  return props.count
}
</script>
<style>
.rc-kit-conversation-unread {
  /* width: 18px; */
  /* height: 100%; */
  display: flex;
  align-items: center;
  justify-content: center;
}
.unread-box {
  background-color: #0099FF;
  font-size: 12px;
  color: #fff;
  border-radius: 18px;
  /* width: 18px;
  height: 18px; */
  text-align: center;
}
.unread-box.active {
  background-color: #BDC8E4;
}
.message-count{
  display: block;
  line-height: 18px;
  min-width: 18px;
  height: 18px;
}
.message-count.active {
  padding: 0 3px;
}

</style>