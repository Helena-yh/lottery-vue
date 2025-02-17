<template>
  <el-main>
    <div class="container">
      <el-form label-width="160px">
        <h4>SDK 开关配置</h4>
        <el-form-item v-for="item in commands" :label="item.desc" :key="item.command">
          <el-switch v-model="item.value.value" :active-text="item.active" :inactive-text="item.inactive"
            @change="app.setCommandSwitch(item.command, item.value.value)">
          </el-switch>
        </el-form-item>
      </el-form>
      <el-form label-width="160px">
        <h4>Demo 自定义</h4>
        <el-form-item label="启用自定义 zh_HK 语言包">
          <el-switch v-model="useHKLanguage"></el-switch>
        </el-form-item>
        <el-form-item label="启用自定义会话标题栏拓展">
          <el-switch v-model="useConvExtension"></el-switch>
        </el-form-item>
        <el-form-item label="启用自定义输入菜单">
          <el-switch v-model="useCustomInput"></el-switch>
        </el-form-item>
        <el-form-item label="启用自定义表情">
          <el-switch v-model="useCustomEmoji"></el-switch>
        </el-form-item>
        <el-form-item label="自定义高清语音消息组件">
          <el-switch v-model="useCustomElement"></el-switch>
        </el-form-item>
        <el-form-item label="自定义气泡">
          <el-button @click="useCustomMessageBubbleCfg">自定义气泡</el-button>
        </el-form-item>
        <el-button type="primary" :loading="locked" @click="start">{{
          locked ? "连接中..." : "启动测试"
        }}</el-button>
      </el-form>
    </div>

    <el-dialog v-model="dialogFormBubble" title="自定义气泡">
      <el-form :inline="true" :model="bubbleForm">
        <el-form-item label="圆角半径">
          <el-input v-model="bubbleForm!.redius" />
        </el-form-item>
        <el-form-item label="消息对齐方式">
          <el-select v-model="bubbleForm!.layout" placeholder="layout">
            <el-option label="left-justifying" value="left-justifying" />
            <el-option label="left-right" value="left-right" />
          </el-select>
        </el-form-item>
        <el-form-item label="己方气泡背景色">
          <el-input v-model="bubbleForm!.backgroundColorForMyself" />
        </el-form-item>
        <el-form-item label="他人气泡背景色">
          <el-input v-model="bubbleForm!.backgroundColorForOthers" />
        </el-form-item>
        <el-form-item label="己方文本颜色">
          <el-input v-model="bubbleForm!.textColorForMyself" />
        </el-form-item>
        <el-form-item label="他人文本颜色">
          <el-input v-model="bubbleForm!.textColorForOthers" />
        </el-form-item>
        <el-form-item label="单聊中展示己方头像">
          <el-switch v-model="bubbleForm!.showMyProfileInPrivateConversation"></el-switch>
        </el-form-item>
        <el-form-item label="单聊中展示己方名称">
          <el-switch v-model="bubbleForm!.showMyNameInPrivateConversation"></el-switch>
        </el-form-item>
        <el-form-item label="群聊中展示己方名称">
          <el-switch v-model="bubbleForm!.showMyNameInGroupConversation"></el-switch>
        </el-form-item>
        <el-form-item label="单聊中展示对方头像">
          <el-switch v-model="bubbleForm!.showOthersProfileInPrivateConversation"></el-switch>
        </el-form-item>
        <el-form-item label="单聊中展示对方名称">
          <el-switch v-model="bubbleForm!.showOthersNameInPrivateConversation"></el-switch>
        </el-form-item>
        <el-form-item label="群聊中展示对方名称">
          <el-switch v-model="bubbleForm!.showOthersNameInGroupConversation"></el-switch>
        </el-form-item>
        <el-form-item label="群聊中展示己方头像">
          <el-switch v-model="bubbleForm!.showMyProfileInGroupConversation"></el-switch>
        </el-form-item>
        <el-form-item label="群聊中展示对方头像">
          <el-switch v-model="bubbleForm!.showOthersProfileInGroupConversation"></el-switch>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button type="primary" @click="dialogFormBubble = false">
            确认
          </el-button>
        </span>
      </template>
    </el-dialog>

  </el-main>
</template>

<script lang="ts" setup>
import { ConversationType, ErrorCode, electronExtension } from "@rongcloud/imlib-next";
import {
  RCKitApplication,
  RCKitCommand,
  RCKitInputMenumPosition,
  IRCKitMessageBubbleCfg,
  RCKitEvents,
} from "@rongcloud/global-im-uikit";
import { getApp, registerCustomMessages, useCustomElmentHandle } from "../services/imkit";
import { connectSocket } from "../services/imlib";
import { ElMessage } from "element-plus";
import router from "../router";
import { zhHK } from "../languages/zh_HK";
import { updateAuthHistories } from "../services/auth-history";
import { ref } from "vue";

const app = getApp();
app.setCommandSwitch(RCKitCommand.AT_ALL, true);

// 一期不上会话列表置顶和会话标签过滤，先注释掉demo开关入口
const commands = [
  {
    command: RCKitCommand.AT_ALL,
    desc: "@All 功能",
    active: "开启",
    inactive: "关闭",
  },
  {
    command: RCKitCommand.FOCUS_ON_LATEST_MESSAGE,
    desc: "进入会话时的消息显示",
    active: "显示最新消息",
    inactive: "显示已读消息(仅 Electron)",
  },
  {
    command: RCKitCommand.SHOW_CONNECTION_STATUS,
    desc: "会话界面 IM 连接状态",
    active: "显示",
    inactive: "隐藏",
  },
  {
    command: RCKitCommand.SHOW_MESSAGE_STATE,
    desc: "消息已读状态",
    active: "显示",
    inactive: "隐藏",
  },
  {
    command: RCKitCommand.SHOW_USER_ONLINE_STATE,
    desc: "用户在线状态",
    active: "显示",
    inactive: "隐藏",
  },
  {
    command: RCKitCommand.PROMPT_SENDER_WHEN_QUOTE_MESSAGE,
    desc: "回复消息时默认 @ 发送者",
    active: "开启",
    inactive: "关闭",
  },
  {
    command: RCKitCommand.DELETE_MESSAGES_WHILE_DELETE_CONVERSSATION,
    desc: "删除会话的同时清理消息",
    active: "开启",
    inactive: "关闭",
  }
].map(({ command, desc, active, inactive }) => ({
  command,
  desc,
  value: ref(app.getCommandSwitch(command)),
  active,
  inactive,
}));

const locked = ref(false);
const useHKLanguage = ref(false);
const useConvExtension = ref(false);
const useCustomInput = ref(false);
const useCustomEmoji = ref(false);
const useCustomElement = ref(false);

const dialogFormBubble = ref(false);
const bubbleForm = ref<IRCKitMessageBubbleCfg>();

const useCustonEmojiHandle = (app: RCKitApplication) => {
  const emojiPanel = app.cloneChatEmojiLibrary();
  emojiPanel.chats.push(
    "\u{1f650}",
    "\u{1f651}",
    "\u{1f652}",
    "\u{1f653}",
    "A",
    "B"
  );
  app.setChatEmojiLibrary(emojiPanel);

  const emojiLibraries = app.cloneImageEmojiLibraries();
  emojiLibraries.push({
    icon: "./icon/conversation-detail.svg",
    itemHeight: 64,
    itemWidth: 64,
    items: [
      {
        thumbnail: "./icon/conversation-detail.svg",
        url: "./icon/conversation-detail.svg",
      },
      {
        thumbnail: "./icon/conversation-histories.svg",
        url: "./icon/conversation-histories.svg",
      },
    ],
    id: "test",
    order: 0,
  });
  app.setImageEmojiLibraries(emojiLibraries);
};

const useConversationExtension = (app: RCKitApplication) => {
  app.setConversationExtension([
    {
      id: "NOT_SYSTEM",
      icon: "./icon/conversation-detail.svg",
      filter(conversation) {
        return conversation.conversationType !== ConversationType.SYSTEM;
      },
    },
    {
      id: "ALL",
      icon: "./icon/conversation-histories.svg",
    },
  ]);

  app.addEventListener(RCKitEvents.CONVERSATION_EXTENSION_CLICK, (evt) => {
    const { id } = evt.data;
    switch (id) {
      case "NOT_SYSTEM":
        ElMessage({
          message: `Demo 自定义功能 id: ${id}, 该功能仅对非系统会话可见`,
          type: "success",
        });
        break;
      case "ALL":
        ElMessage({ message: `Demo 自定义功能 id: ${id}`, type: "success" });
        break;
    }
  });
};

const useCustomInputMenu = (app: RCKitApplication) => {
  const menu = app.cloneInputMenu();
  menu.items.push(
    {
      id: "input.enum.item.custom01",
      icon: "./icon/conversation-detail.svg",
      position: RCKitInputMenumPosition.LEFT,
      order: 0,
    },
    {
      id: "input.enum.item.custom02",
      icon: "./icon/conversation-histories.svg",
      position: RCKitInputMenumPosition.SECONDARY_MENU,
      order: 0,
    }
  );
  app.setInputMenu(menu);
  app.addEventListener(RCKitEvents.INPUT_MENU_ITEM_CLICK, (evt) => {
    const { id } = evt.data;
    switch (id) {
      case "input.enum.item.custom01":
      case "input.enum.item.custom02":
        evt.preventDefault();
        ElMessage({ message: `Demo 自定义功能 id: ${id}`, type: "success" });
        break;
      default:
        // 其他不处理，由 SDK 继续处理
        break;
    }
  });
  const zh = app.cloneLanguageEntries("zh_CN")!;
  zh["input.enum.item.custom01"] = "自定义菜单01";
  zh["input.enum.item.custom02"] = "自定义菜单02";
  app.registerLanguagePack("zh_CN", zh);
  const en = app.cloneLanguageEntries("en_US")!;
  en["input.enum.item.custom01"] = "Custom Menu 01";
  en["input.enum.item.custom02"] = "Custom Menu 02";
  app.registerLanguagePack("en_US", en);
  const hk = app.cloneLanguageEntries("zh_HK");
  if (hk) {
    hk["input.enum.item.custom01"] = "自定義菜單01";
    hk["input.enum.item.custom02"] = "自定義菜單02";
    app.registerLanguagePack("zh_HK", hk);
  }
};

const useCustomMessageBubbleCfg = () => {
  dialogFormBubble.value = true;
  bubbleForm.value = app.cloneMessageBubbleCfg();
};

const start = async () => {
  if (useHKLanguage.value) {
    // 注册 zh_HK 语言包
    app.registerLanguagePack("zh_HK", zhHK);
  }
  if (useConvExtension.value) {
    useConversationExtension(app);
  }
  if (useCustomInput.value) {
    useCustomInputMenu(app);
  }
  if (useCustomEmoji.value) {
    useCustonEmojiHandle(app);
  }

  if (useCustomElement.value) {
    useCustomElmentHandle(app);
  }

  // 注册自定义消息
  registerCustomMessages(app);

  if (bubbleForm.value) {
    app.setMessageBubbleCfg(bubbleForm.value);
  }
  app.addEventListener(RCKitEvents.CONVERSATION_ICON_CLICK, (evt) => {
    const { conversationType } = evt.data.conversation;
    if (conversationType === ConversationType.GROUP) {
      app.openConversation({
        conversationType: ConversationType.PRIVATE,
        targetId: evt.data.profile.userId,
        channelId: ''
      });
      return
    }
    ElMessage({
      message: `用户 id: ${evt.data.profile.userId}`,
      type: "success",
    });
  });
  app.addEventListener(RCKitEvents.DOWNLOAD_LINK_EVENT, (evt) => {
    const url = evt.data.content?.sightUrl || evt.data.content?.imageUri || evt.data.content?.remoteUrl || evt.data.content.fileUrl;
    if(electronExtension.enable() && window && (window as any).__downloadFile__){
      (window as any).__downloadFile__(url);
      return
    }
    window.open(url);
  })
  app.addEventListener(RCKitEvents.CONVERSATION_NAVI_CLICK, (evt) => {
    const { targetId } = evt.data;
    ElMessage({ message: `当前会话 id: ${targetId}`, type: "success" });
  })

  // IMKit 配置完毕
  app.ready();

  // 连接 IM
  locked.value = true;
  // data 为 undefined 时增加默认值
  const { code, data = { userId : ''} } = await connectSocket();
  locked.value = false;
  if (code !== ErrorCode.SUCCESS) {
    ElMessage({ message: `IM 连接失败: ${code}`, type: "error" });
    return;
  }

  document.title = `User: ${data.userId}`;

  updateAuthHistories();
  router.push("/chat");
};
</script>

<style scoped>
.el-main {
  display: flex;
  flex-direction: column;
}

.container {
  flex: 1 auto;
  display: flex;
  flex-direction: row;
}

.el-form {
  text-align: center;
  margin: 0 auto;
}
</style>
