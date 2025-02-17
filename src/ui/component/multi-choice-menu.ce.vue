<template>
  <div class="rc-multi-choice-menu" style="height: 50px;">
    <div @click="_emit('cancel')" class="cancel"><img :src="MULTI_CHOICE_MENU_CANCEL_ICON" alt="Cancel"></div>
    <span class="selected-count">{{ message }}</span>
    <div @click="emit('merge-forward')" class="button">{{ mergedLabel }}</div>
    <div @click="emit('forward')" class="button">{{ forwardLabel }}</div>
    <div @click="emit('delete')" class="button delete">{{ deleteLabel }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { $tt, $t } from '../i18n-vue';
import { MULTI_CHOICE_MENU_CANCEL_ICON } from '../../assets';

const props = defineProps({
  count: {
    type: Number,
    required: true,
  },
});

const _emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const emit = (type: string) => {
  if (props.count === 0) {
    return;
  }
  _emit(type);
}

const message = computed(() => {
  return $tt('multi-choice.menu.selected-count', props.count.toString());
});
const mergedLabel = $t('multi-choice.menu.merge-forward');
const forwardLabel = $t('multi-choice.menu.forward-item-by-item');
const deleteLabel = $t('multi-choice.menu.delete');

</script>

<style>
.rc-multi-choice-menu {
  height: 50px;
  background-color: #fff;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-top: 1px solid #efefef;
  font-size: 12px;
  color: #7f8aa8;
  padding: 0 16px;
}
.selected-count {
  flex: 1 auto;
  margin-left: 24px;
}
img {
  width: 13px;
  height: 13px;
}
.cancel {
  cursor: pointer;
  line-height: 13px;
  height: 13px;
}
.button {
  margin-left: 32px;
  cursor: pointer;
}
.delete {
  color: #e35858;
}
</style>
