<template>
  <div>
    <div class="reference-box"
      :style="{borderColor: message.messageDirection === MessageDirection.SEND ? '#fff': '#f5f5f5'}">
      <div class="left" v-if="showReferenceImage">
        <img :src="formatBase64Image(message.content.referMsg.content)" alt="ReferMsg Image">
      </div>
      <div class="right">
        <div class="title"> {{ reply }} {{ message.content.referMsgUserId }} </div>
        <div class="content">
          <img :src="message.messageDirection === MessageDirection.SEND ? AUDIO_SELF_ICON : AUDIO_ICON"
            v-if="props.message.content.objName === MessageType.HQ_VOICE" alt="">
          <img :src="message.messageDirection === MessageDirection.SEND ? COMBINE_SELF_ICON : COMBINE_ICON"
            v-else-if="props.message.content.objName === MessageType.COMBINE" alt="">
          <p>
            {{
              referenceContent()
            }}
            <span v-if="message.content.objName === MessageType.FILE">{{ message.content.referMsg.name }}</span>
          </p>
        </div>
      </div>
    </div>
    <div class="reference-content">{{ message.content.content }}
    </div>
  </div>
</template>
<script setup lang="ts">
/**
 * @description: 引用消息组件
 */
import { MessageType, MessageDirection } from "@rongcloud/imlib-next";
import { formatBase64Image } from "@lib/helper";
import { AUDIO_ICON, COMBINE_ICON, AUDIO_SELF_ICON, COMBINE_SELF_ICON } from '@lib/assets'
import { $tt, $t } from '@lib/ui/i18n-vue'
import { IRCKitCachedMessage } from '../../../modules/MessageDataModule';

const props = defineProps<{
  message: IRCKitCachedMessage;
}>();

const showReferenceImage = [MessageType.IMAGE, MessageType.GIF, MessageType.SIGHT].includes(props.message.content.objName)

const referenceContent = () => {
  switch(props.message.content.objName) {
    case MessageType.IMAGE:
      return $tt('message-type.RC:ImgMsg')
    case MessageType.GIF:
      return $tt('message-type.RC:GIFMsg')
    case MessageType.SIGHT:
      return $tt('message-type.RC:SightMsg')
    case MessageType.FILE:
      return $tt('message-type.RC:FileMsg')
    case MessageType.HQ_VOICE:
      return $tt('message-type.RC:HQVCMsg')
    case MessageType.TEXT:
      return props.message.content.referMsg.content
    case MessageType.COMBINE:
      return $tt('message-type.RC:CombineMsg')
    case MessageType.REFERENCE:
      return props.message.content.referMsg.content
    default:
      return $tt('message-type.unknown')
  }
}

const reply = $t('input.reply.prefix');

</script>


<style lang="scss">
@import "../../styles/base.scss";

.reference-box {
  border-left: 2px solid;
  padding-left: 8px;
  display: flex;
  margin-bottom: 8px;
  margin-top: 3px;
  .left {
    img {
      width: 46px;
      height: 34px;
      border-radius: 2px;
      margin-right: 5px;
      display: block;
    }
  }
  .right {
    .title {
      font-size: 14px;
      font-weight: 500;
      line-height: 16px;
      margin-bottom: 5px;
    }
    .content {
      font-size: 12px;
      line-height: 16px;
      display: flex;
      align-items: center;
      p {
        margin: 0;
        @include ellipsis(1);
        width: 150px;
      }
      img {
        margin-right: 5px;
      }
    }
  }
}
.reference-content {
  word-break: break-word;
  font-size: 12px;
  line-height: 16px;
  white-space: pre-wrap;
}
</style>
