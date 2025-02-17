<template>
  <div class="modal-delete-provider">
    <rc-modal-provider @click="handleCancel">
      <rc-modal-dialog
        :width="286">
        <div class="rc-kit-modal-dialog-header" slot="header">{{ titleMsg }}</div>
        <div class="rc-kit-modal-dialog-content" slot="content">
          {{ contentMsg }}
          <div class="content-check" v-if="recallEnable === 'true'">
            <div class="checkbox">
              <label for="rc-kit-modal-delete-message-check">
                <input id="rc-kit-modal-delete-message-check" type="checkbox" v-model="recall">
                <span class="custom">
                  <img :src="CHECKED_ICON" alt="CHECKED_ICON">
                </span>
              </label>
            </div>
            {{ recallMsg }}
          </div>
        </div>
        <div class="rc-kit-modal-dialog-footer" slot="footer">
          <button class="cancel" @click="handleCancel">{{ cancelMsg }}</button>
          <button class="confirm" @click="handleConfirm">{{ confirmMsg }}</button>
        </div>
      </rc-modal-dialog>
    </rc-modal-provider>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'

import { CHECKED_ICON } from '../../../assets'
import { $tt } from "../../i18n-vue";

defineProps<{
  // 是否显示撤回选项，因为是通过 document.createElement 创建的，props 定义为字符串
  recallEnable: 'true' | 'false',
}>();

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const recall = ref<boolean>(false);

const titleMsg = $tt('dialog.tips.msg');
const contentMsg = $tt('dialog.delete.msg');
const cancelMsg = $tt('dialog.cancel.msg');
const confirmMsg = $tt('dialog.confirm.msg');
const recallMsg = $tt('dialog.recall.msg');

const handleCancel = (e: MouseEvent) => {
  emit('cancel');
  
}
const handleConfirm = (e: MouseEvent) => {
  emit('confirm', recall.value);
}

</script>
<style>
.rc-kit-modal-dialog-header {
  font-size: 14px;
  border-bottom: 1px solid #EAEAEA;
  padding: 10px 30px;
  line-height: 20px;
}
.rc-kit-modal-dialog-content {
  font-size: 12px;
  padding: 15px 30px;
}
.rc-kit-modal-dialog-footer {
  display: flex;
  justify-content: center;
  padding: 20px;
}
.rc-kit-modal-dialog-footer  button {
  min-width: 70px;
  text-decoration: none;
  border-radius: 3px;
  outline: none;
  font-size: 12px;
  padding: 5px 15px;
  border: 0;
  margin: 0 23px;
  cursor: pointer;
}
.rc-kit-modal-dialog-footer .cancel {
  border: 1px solid #DEDEDE;
  background-color: #F5F5F5;
}
.rc-kit-modal-dialog-footer  .confirm {
  border: 1px solid #0099FF;
  background-color: #0099FF;
  color: #FFFFFF;
}
.content-check {
  display: flex;
  margin-top: 15px;
  align-items: center;
}
.checkbox input[type="checkbox"] {
  display: none;
}

.checkbox .custom {
  display: flex;
  width: 15px;
  height: 15px;
  border: 1px solid #ABB8CB;
  border-radius: 3px;
  background-color: #FFFFFF;
  font-size: 0;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  margin-right: 7px;
  box-sizing: border-box;
}

.checkbox input[type="checkbox"]:checked + .custom {
  background-color: #0099FF;
  border-color: #0099FF;
}

</style>
