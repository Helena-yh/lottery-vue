<template>
  <div class="rc-kit-app-wrapper-right">
    <rc-connection-status v-if="connectionStatus !== RCConnectionStatus.CONNECTED && showConnectionStatus" :status="connectionStatus" :code="connectionCode"></rc-connection-status>
    <rc-conversation-empty style="width: 100%; height: 100%;" v-if="!opened" :desc="emptyDesc"></rc-conversation-empty>
    <template v-else>
      <rc-conversation-detail-bar-provider :conversation="opened"></rc-conversation-detail-bar-provider>
      <rc-take-photo-provider v-if="cameraOpened" class="camera-screen"></rc-take-photo-provider>
      <rc-message-list-provider v-show="!cameraOpened" class="rc-kit-msg-list"></rc-message-list-provider>
      <rc-input-provider :conversation="opened"
        v-show="!multiChoiceMode && !isSystem && !cameraOpened"></rc-input-provider>
      <rc-multi-choice-menu-provider v-if="multiChoiceMode"></rc-multi-choice-menu-provider>
    </template>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { cameraOpened, multiChoiceMode, openedConversation as opened, ctx, setEnvInfo } from './context';;
import { ConversationType, RCConnectionStatus, ErrorCode } from '@rongcloud/engine';
import { $t } from '../i18n-vue';
import { ConnectionStatusChangeEvent, InnerEvent } from '@lib/core/EventDefined';
import { RCKitCommand } from '@lib/enums/RCKitCommand'

setEnvInfo();

const emptyDesc = $t('conversation.empty.desc');
const isSystem = computed(() => opened.value && opened.value.conversationType === ConversationType.SYSTEM);

const connectionStatus = ref<RCConnectionStatus>(0);
const connectionCode = ref<ErrorCode | undefined>(0);
const showConnectionStatus = ctx().store.getCommandSwitch(RCKitCommand.SHOW_CONNECTION_STATUS);

const _onConnectionStatusChange = (e: ConnectionStatusChangeEvent) => {
  const { status, code } = e.data;
  connectionStatus.value = status;
  connectionCode.value = code; 
}


onMounted(() => {
  ctx().addEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, _onConnectionStatusChange, this);
})
onUnmounted(() => {
  ctx().removeEventListener(InnerEvent.CONNECTION_STATUS_CHANGE, _onConnectionStatusChange, this);
});


</script>

<style>
.rc-kit-app-wrapper-right {
  width: 100%;
  height: 100%;
  min-width: 600px;
  display: flex;
  flex-direction: column;
  position: relative;
}

.rc-kit-msg-list {
  flex: 1 1 auto;
  overflow: hidden;
  background-color: #f1f4f8;
  position: relative;
}

.camera-screen {
  flex: 1 auto;
}
</style>