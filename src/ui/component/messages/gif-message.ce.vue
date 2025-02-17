<template>
  <rc-file-transfer-ctrl-provider :message="message">
    <div class="gif-message-box">
      <img ref="imgRef" style="max-width: 100%;" :src="message.content.remoteUrl" :onerror="handleError" alt="Git Image"/>
    </div>
  </rc-file-transfer-ctrl-provider>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import { IMAGE_FAILED } from '@lib/assets/index'
import { IRCKitMessageComponentProps } from '@lib/ui/interface';

const { message } = defineProps<IRCKitMessageComponentProps>();
const imgRef = ref();

const handleError = () => {
  imgRef.value.src = IMAGE_FAILED;
}

</script>
<style lang="scss">
.gif-message-box {
  width: 247px;
  height: 247px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
