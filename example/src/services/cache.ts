import { EnableLogL, LogL } from '@rongcloud/imlib-next';
import { Ref, ref } from 'vue';
import { histories } from './auth-history';

export interface IInitData {
  appkey: string;
  token: string;
  navi: string;
  imlibLogLevel: EnableLogL;
  imkitLogLevel: EnableLogL;
  allowedToRecallTime: number;
  allowedToReEditTime: number;
  language: string;
}

const latest = histories[0] || {};

export const initData: Ref<IInitData> = ref({
  appkey: latest.appkey || '',
  token: latest.token || '',
  navi: latest.navi || '',
  imkitLogLevel: LogL.INFO,
  imlibLogLevel: LogL.WARN,
  allowedToRecallTime: 120,
  allowedToReEditTime: 60,
  language: 'en_US',
});
