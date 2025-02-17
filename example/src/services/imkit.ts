import {
  BaseMessage,
  installPlugin,
} from '@rongcloud/imlib-next';
import {
  IRCKitGroupMemberProfile,
  IRCKitGroupProfile,
  IRCKitServiceHooks, IRCKitSystemProfile, IRCKitUserProfile, RCKitApplication, RCKitInstaller, RCKitOverrideAbleComponent,
} from '@rongcloud/global-im-uikit';

import { initData } from './cache';
import { getGroupMembers } from './imserver';
import { ElMessage } from 'element-plus';

let app!: RCKitApplication;

const hooks: IRCKitServiceHooks = {
  async reqGroupProfiles(groupIds: string[]): Promise<IRCKitGroupProfile[]> {
    const arr = await Promise.all(groupIds.map((groupId) => getGroupMembers(groupId)));
    return arr.map((item) => {
      const { users, groupId } = item;
      const profile: IRCKitGroupProfile = {
        groupId,
        name: `G<${groupId}>`,
        memberCount: users.length,
      };
      return profile;
    });
  },
  async reqGroupMembers(groupId: string): Promise<IRCKitGroupMemberProfile[]> {
    const { users } = await getGroupMembers(groupId);
    return users;
  },
  async reqUserProfiles(userIds): Promise<IRCKitUserProfile[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(userIds.map((userId) => ({
          userId,
          name: `U<${userId}>`,
        })));
      }, 3000 + Math.floor(Math.random() * 7000));
    });
  },
  async reqSystemProfiles(systemIds): Promise<IRCKitSystemProfile[]> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(systemIds.map((systemId) => ({
          systemId,
          name: `S<${systemId}>`,
        })));
      }, 3000 + Math.floor(Math.random() * 7000));
    });
  },
};

export const initIMKit = (): RCKitApplication | null => {
  const { imkitLogLevel, language, allowedToRecallTime, allowedToReEditTime } = initData.value;
  app = installPlugin(RCKitInstaller, {
    language, logLevel: imkitLogLevel, hooks, allowedToRecallTime, allowedToReEditTime,
  })!;
  return app;
};

export const getApp = (): RCKitApplication => app;

let TestGreyMessage: new (content: string) => BaseMessage<string>;

let TestBubbleMessage: new (content: { url: string, title: string }) => BaseMessage<{ url: string, title: string }>;

export const registerCustomMessages = (app: RCKitApplication) => {
  // 注册测试用灰条消息
  TestGreyMessage = app.registerMessageType('RCKItDemo:GreyMessage', {
    isCounted: true,
    isPersited: true,
    digest(message, language) {
      return language === 'en_US' ? `[GreyMessage: ${message.content}]` : `[灰条消息：${message.content}]`;
    },
  })

  // 注册测试用气泡消息
  TestBubbleMessage = app.registerMessageType('RCKItDemo:BubbleMessage', {
    isCounted: true,
    isPersited: true,
    digest(message, language) {
      return language === 'en_US' ? `[BubbleMessage: ${message.content.title}]` : `[气泡消息：${message.content.title}]`;
    },
    component: {
      tag: 'test-bubble-message',
      setup(props, ctx) {
        const { message } = props;
        // 消息内容获取
        const { url, title } = message.content;
        // 多语言测试
        const btnLabel = ctx.computed(() => ctx.getLanguage() === 'en_US' ? 'Open' : '打开');
        // 点击事件测试
        const handleClick = () => window.open(url);
        return { handleClick, title, url, btnLabel, userId: app.getCurrenUserId() };
      },
      template: `<div>userId: {{ userId }}<br/>title: {{ title }}<br/>url: {{ url }}<br><button @click="handleClick">{{ btnLabel }}</button></div>`,
      styles: [],
    },
  });
};

export const useCustomElmentHandle = (app: RCKitApplication) => {
  app.registerCustomElement(RCKitOverrideAbleComponent.HQVoiceMessageComponent, {
    setup(props, ctx) {
      const value = props.value;
      return { value }
    },
    template: `<button @click="value.toggle()">{{ value.playing ? '暂停' : '播放' }}</button><br/>
      playing: {{ value.playing }}<br/>
      progress: {{ value.progress }} / 100<br/>
      duration: {{ value.duration }}s<br/>`
  });
}

export const sendGreyMessage = () => {
  const conversation = app.getOpenedConversation();
  if (!conversation) {
    ElMessage({ message: '暂未打开会话', type: 'warning' });
    return;
  }
  app.sendMessage(conversation, new TestGreyMessage(Date.now().toString()));
};

export const sendBubbleMessage = () => {
  const conversation = app.getOpenedConversation();
  if (!conversation) {
    ElMessage({ message: '暂未打开会话', type: 'warning' });
    return;
  }
  app.sendMessage(conversation, new TestBubbleMessage({ url: 'https://www.rongcloud.cn', title: 'RongCloud' }));
};