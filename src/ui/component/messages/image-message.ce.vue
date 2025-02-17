<template>
  <rc-file-transfer-ctrl-provider :message="message">
    <img class="thumbnail" :src="formatBase64Image(message.content.content)" alt="Image"/>
    <div slot="marked" class="marked"></div>
  </rc-file-transfer-ctrl-provider>
</template>

<script setup lang="ts">
import { IRCKitMessageComponentProps } from "@lib/ui/interface";
import { formatBase64Image } from "../../../helper";

const { message } = defineProps<IRCKitMessageComponentProps>()
</script>

<style>
.thumbnail, .marked {
  width: 247px;
  max-height: 400px;
  border-radius: 6px;
}
.marked {
  background-color: rgba(0, 0, 0, .6);
  height: 100%;
}
</style>
