import { ref } from 'vue';
import {
  init, addEventListener, Events, connect, ErrorCode,
} from '@rongcloud/imlib-next';
import { initData } from './cache';

/**
 * 是否已登录
 */
export const authed = ref(false);

export const userId = ref('');

export const initIMLib = () => {
  const { appkey, navi, imlibLogLevel } = initData.value;

  init({
    appkey,
    navigators: navi ? [navi] : undefined,
    logOutputLevel: imlibLogLevel,
  });

  // 监听 IMLib 事件
  addEventListener(Events.CONNECTED, () => { });
  addEventListener(Events.DISCONNECT, () => { });
  addEventListener(Events.SUSPEND, () => { });
  addEventListener(Events.CONNECTING, () => { });
  addEventListener(Events.MESSAGES, (evt) => { });
};

export const connectSocket = async () => {
  const { token } = initData.value;
  const { code, data } = await connect(token);
  if (code === ErrorCode.SUCCESS) {
    authed.value = true;
    if (data) {
      userId.value = data.userId;
    }
  }
  return connect(token);
};
