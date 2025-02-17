import { getCurrentUserId } from '@rongcloud/imlib-next';

import { initData } from './cache';

export interface IAuthHistoryData {
  appkey: string,
  token: string,
  navi: string,
  userId: string,
  label: string,
  timestamp?: number,
}

/**
 * 登录记录
 */
export const histories: IAuthHistoryData[] = JSON.parse(localStorage.getItem('RC-KIT-DEMO-LOGIN-HISTORY') || '[]').map((item: IAuthHistoryData) => {
  item.timestamp = item.timestamp || Date.now();
  return item;
}).sort((a: IAuthHistoryData, b: IAuthHistoryData) => b.timestamp! - a.timestamp!);

export const updateAuthHistories = () => {
  const { appkey, token, navi } = initData.value;
  const userId = getCurrentUserId();
  const history: IAuthHistoryData = {
    appkey, token, navi, userId, label: `${appkey} - ${userId}`, timestamp: Date.now(),
  };
  const index = histories.findIndex((item) => item.appkey === history.appkey && item.userId === history.userId);
  if (index > -1) {
    histories.splice(index, 1);
  }
  histories.unshift(history);
  localStorage.setItem('RC-KIT-DEMO-LOGIN-HISTORY', JSON.stringify(histories));
};
