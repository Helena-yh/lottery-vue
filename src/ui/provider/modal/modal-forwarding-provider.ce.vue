<template>
  <div class="modal-forwarding-provider">
    <rc-modal-provider @click="handleCancel">
      <rc-modal-dialog
        :width="312">
        <div class="rc-kit-modal-dialog-header" slot="header">{{ titleMsg }}</div>
        <div class="rc-kit-modal-dialog-content" slot="content">
          <div class="search">
            <input class="search-input" disabled v-model="search" type="text" :placeholder="searchMsg" @input="handleInputChange" >
            <img class="search-icon" :src="SEARCH_ICON" alt="SEARCH_ICON">
          </div>
          <div class="list">
            <div 
              class="list-item" 
              :class="{ 'active': 
              convCheckedList.findIndex((val) => val.key === item.key) !== -1 }" 
              v-for="item in convRenderList">
              <div class="checkbox">
                <label :for="item.key">
                  <input :id="item.key" type="checkbox" v-model="convCheckedList" :value="item">
                  <span class="custom">
                    <img :src="CHECKED_ICON" alt="CHECKED_ICON">
                  </span>
                </label>
              </div>
              <div class="conversation">
                <rc-icon 
                  class="profile" 
                  :width="28" 
                  :height="28" 
                  :radius="50" 
                  :url="item.portraitUri" 
                  :online="false"></rc-icon>
                <span class="name">{{ item.name }}</span>
              </div>
            </div>
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
import { ref, onMounted } from 'vue'
import { SEARCH_ICON, CHECKED_ICON } from '../../../assets'
import { IRCKitCachedConversation } from '../../../modules/conversation/IRCKitCachedConversation'
import { $tt } from "../../i18n-vue";
import { conversationList } from '../context';

const emit = defineEmits<{
  (e: string, ...item: any[]): void,
}>();

const search = ref<string>('');
const convCheckedList = ref<IRCKitCachedConversation[]>([]);
const convRenderList = ref<IRCKitCachedConversation[]>([]);

const titleMsg = $tt('dialog.forwarding.msg');
const cancelMsg = $tt('dialog.cancel.msg');
const confirmMsg = $tt('dialog.confirm.msg');
const searchMsg = $tt('input.placeholder.search');
let timer: any = null

const handleInputChange = () => {
  if (!timer) {
    timer = setTimeout(() => {
      convRenderList.value = conversationList.value.filter((item) => {
        return item.name.includes(search.value)
      });
      clearTimeout(timer);
      timer = null
    }, 500);
  }
  
}

const handleCancel = (e: MouseEvent) => {
  emit('cancel');
  
}
const handleConfirm = (e: MouseEvent) => {
  emit('confirm', { list: convCheckedList.value });
}

onMounted(() => {
  convRenderList.value.splice(0, convRenderList.value.length, ...conversationList.value)
})

</script>
<style>
input {
  border: 0;
  padding: 0;
  outline: none;
}
.rc-kit-modal-dialog-header {
  font-size: 14px;
  padding: 10px 13px;
  line-height: 20px;
}
.rc-kit-modal-dialog-content {
  padding: 13px;
}
.rc-kit-modal-dialog-content .search {
  font-size: 12px;
  margin-bottom: 15px;
  position: relative;
}
.search .search-input {
  padding: 8px 28px 8px 8px;
  border: 1px solid #EAEAEA;
  background-color: #F4F4F4;
  width: 100%;
  box-sizing: border-box;
  border-radius: 5px;
  font-size: 12px;
}
.search .search-icon {
  position: absolute;
  top: 8px;
  right: 10px;
}
.list {
  height: 210px;
  padding: 10px;
  overflow: scroll;
  border-radius: 5px;
  background-color: #FFFFFF;
  border: 1px solid #EAEAEA;
  font-size: 12px;
}
.list-item {
  display: flex;
  align-items: center;
  border-radius: 4px;
  padding: 0 8px;
}
.list-item.active {
  background-color: #F3F3F3;
}
.list-item:hover {
  background-color: #F3F3F3;
}
.list .conversation {
 display: flex;
 align-items: center;
 flex: 1;
 overflow: hidden;
}
.list .conversation .profile {
  padding: 0 10px;
}
.list .conversation .name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}


.list-item .checkbox input[type="checkbox"] {
  display: none;
}

.list-item .checkbox .custom {
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
}

.list-item .checkbox input[type="checkbox"]:checked + .custom {
  background-color: #0099FF;
  border-color: #0099FF;
}

.rc-kit-modal-dialog-footer {
  display: flex;
  justify-content: center;
  padding: 0px 20px 18px;
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
</style>
../../../modules/conversation/ConversationDataModule