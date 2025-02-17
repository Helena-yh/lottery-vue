<template>
  <el-main class="chat-scene">
    <rc-imkit-app-provider class="rc-kit-app"></rc-imkit-app-provider>
  </el-main>
  <el-aside>
    <el-form>
      <el-form-item>
        当前用户：{{ userId }}
      </el-form-item>
      <el-form-item>
        <el-button @click="dialogUserChange = true">切换 Token 登入</el-button>
        <el-button @click="handleImLibDestroy">反初始化</el-button>
      </el-form-item>
      <el-form-item>
        <el-switch v-model="useDefaultUI" active-text="使用 IMKit 弹框" @change="handleModalChaneg"
          inactive-text="使用 Demo 弹框"></el-switch><br>
      </el-form-item>
      <el-form-item>
        选择语言：<el-select v-model="selectLanguage" @change="changeLanguage">
          <el-option v-for="item in languages" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-space wrap>
          <el-button @click="sendGreyMessage">发送自定义灰条消息</el-button>
          <el-button @click="sendBubbleMessage">发送自定义消息</el-button>
        </el-space>
      </el-form-item>
      <el-form-item>
        <el-button @click="updateUserOnline">设置当前会话状态：</el-button>
        <el-switch style="margin-left: 5px;" v-model="conversationStatus" active-text="在线"
          inactive-text="离线"></el-switch><br>
      </el-form-item>
    </el-form>
    <el-divider>事件通知 & 调用回执</el-divider>
    <el-empty v-if="logs.length === 0" description="暂无数据"></el-empty>
    <div class="log-item" v-for="item in logs" :key="item">{{ item }}</div>
  </el-aside>

  <el-dialog v-model="dialogDeleteMessage" title="Demo 弹框" width="30%">
    <p>确定要删除{{ deleteMessageList.messages.map(item => item.messageUId) }}消息吗？</p>
    <el-checkbox v-model="recall" v-if="deleteMessageList.recallEnable" label="是否要撤回" size="large" />
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogDeleteMessageHandle(0)">Cancel</el-button>
        <el-button @click="dialogDeleteMessageHandle(1)" type="primary">
          Confirm
        </el-button>
      </span>
    </template>
  </el-dialog>

  <el-dialog v-model="dialogUserChange" title="切换用户重新登入">
    <el-form :model="newUserInfo">
      <el-form-item label="Token" label-width="100px">
        <el-input v-model="newUserInfo.token" autocomplete="off" />
      </el-form-item>
    </el-form>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="dialogUserChange = false">Cancel</el-button>
        <el-button type="primary" @click="handleUserChangeConnect">
          Confirm
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { destroy, disconnect, ErrorCode } from '@rongcloud/imlib-next';
import { RCKitEvents, RCKitModalBtnType, DeleteMessageModalEvent, IRCKitCachedMessage } from "@rongcloud/global-im-uikit";
import { userId, connectSocket, authed } from '../services/imlib';
import { getApp, sendBubbleMessage, sendGreyMessage } from '../services/imkit';
import { ElMessage } from 'element-plus';
import { initData } from '../services/cache';
import router from "../router";
const { appkey, token } = initData.value;

const app = getApp();

app.addEventListener(RCKitEvents.FILE_SEND_FAILED_EVENT, (evt) => {
  const files = evt.data.map(item => `${item.name}(${item.size})`);
  ElMessage.warning({
    message: `以下文件不符合发送条件：${files.join('、')}`,
  })
});

const useDefaultUI = ref(true);
const conversationStatus = ref(true);
const languages = app.getSupportedLanguages();
const selectLanguage = ref(app.getLanguage());
const changeLanguage = () => app.setLanguage(selectLanguage.value);

const logs = ref<string[]>(['测试 Log']);

//#region 删除消息
const dialogDeleteMessage = ref<boolean>(false);
const deleteMessageList = ref<{ recallEnable: boolean, messages: IRCKitCachedMessage[] }>({ recallEnable: false, messages: [] });
let deleteMessageModalEvent: DeleteMessageModalEvent;
const recall = ref<boolean>(false);
const dialogDeleteMessageHandle = (type: RCKitModalBtnType) => {
  deleteMessageModalEvent.sendResult({
    type,
    recall: recall.value
  });
  dialogDeleteMessage.value = false;
}
const onDeleteMessageModal = (evt: DeleteMessageModalEvent) => {
  dialogDeleteMessage.value = true;
  deleteMessageList.value = evt.data;
  evt.preventDefault();
  deleteMessageModalEvent = evt;
}
const handleModalChaneg = (data: boolean) => {
  if (!data) {
    app.addEventListener(RCKitEvents.DELETE_MESSAGE_MODAL_EVENT, onDeleteMessageModal);
    return
  }
  app.removeEventListener(RCKitEvents.DELETE_MESSAGE_MODAL_EVENT, onDeleteMessageModal);
}
//#endregion

//#region 切换用户重新登入
const dialogUserChange = ref<boolean>(false);
const newUserInfo = ref<{ token: string, appkey: string }>({ token, appkey });
const handleUserChangeConnect = async (): Promise<void> => {
  await disconnect();
  initData.value.token = newUserInfo.value.token
  // data 为 undefined 时增加默认值
  const { code, data = { userId: '' } } = await connectSocket();
  if (code !== ErrorCode.SUCCESS) {
    ElMessage({ message: `IM 连接失败: ${code}`, type: "error" });
    return
  }
  dialogUserChange.value = false
  document.title = `User: ${data.userId}`;
}
//#endregion

const handleImLibDestroy = async () => {
    await destroy();
    authed.value = false;
    router.push({ name: 'index' });
}

const updateUserOnline = async () => {
  const data = app.getOpenedConversation();
  if (!data || data.conversationType !== 1) {
    ElMessage.error('会话格式不正确, 仅支持选中的单聊会话');
    return
  }
  app.updateUserOnlineStatus(data.targetId, conversationStatus.value);
}
</script>
<style scoped>
.el-aside {
  width: 400px;
  border-left: 1px solid #eee;
  padding: 20px;
}

.chat-scene {
  padding: 0px;
}

.rc-kit-app {
  width: 100%;
  height: 100%;
}

.log-item {
  border-bottom: 1px solid #eee;
}
</style>../pinia/pinia../stores
