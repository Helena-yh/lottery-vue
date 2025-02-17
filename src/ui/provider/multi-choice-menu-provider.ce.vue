<template>
  <rc-multi-choice-menu :count="selectedCount"
    @forward="handleForward(RCKitModalForwardingType.SINGLE)"
    @merge-forward="handleForward(RCKitModalForwardingType.MERGE)"
    @cancel="hide"
    @delete="handleDelete"></rc-multi-choice-menu>
</template>
<script setup lang="ts">
import { RCKitModalForwardingType } from '@lib/core/EventDefined';
import {
  multiChoiceMode, selectedCount, selectedMessages, forwarding, handleDeleteMessage, ctx,
} from './context';
import { MessageType, SentStatus } from '@rongcloud/imlib-next';

const hide = () => multiChoiceMode.value = false;

const handleForward = async (type: RCKitModalForwardingType) => {
  if (selectedMessages.value.length <= 0) return
  if (selectedMessages.value.length > 100 && type === RCKitModalForwardingType.MERGE) {
    ctx().alert('alert.forward.over.length');
    return
  }
  const unaccepted: number[] = [];
  let types = [
    MessageType.TEXT, MessageType.IMAGE, MessageType.FILE,
    MessageType.RICH_CONTENT, MessageType.HQ_VOICE, MessageType.VOICE,
    MessageType.COMBINE, MessageType.COMBINE_V2, MessageType.GIF,
    MessageType.SIGHT, MessageType.FILE, MessageType.REFERENCE,
  ];
  if (type === RCKitModalForwardingType.MERGE) {
    const length = types.length - 1
    types.splice(length, 1)
  }

  selectedMessages.value.forEach((item, index) => {
    
    if(!(types.includes(item.messageType) && item.sentStatus !== SentStatus.SENDING && item.sentStatus !== SentStatus.FAILED)) {
      unaccepted.push(index + 1)
    }
  });

  if (unaccepted.length > 0) {
    ctx().alert('alert.forward.not.supported', `${unaccepted.join(',')}`)
    return
  }
  // 对选中的消息列表按升序排列
  selectedMessages.value.sort((a, b) =>  a.sentTime - b.sentTime);
  const bool = await forwarding(type, selectedMessages.value);
  if (!bool) {
    return;
  }
  hide();
};

const handleDelete = () => handleDeleteMessage(selectedMessages.value);
</script>