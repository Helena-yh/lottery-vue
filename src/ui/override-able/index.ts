import HQVoiceMessageComponent from './hq-voice-message/hq-voice-message.ce.vue'
import { IRCKitHQVoiceMessageComponentProps } from './hq-voice-message/IRCKitHQVoiceMessageComponentProps';

export type { IRCKitHQVoiceMessageComponentProps };

export interface IRCKitComponentContext {
  /**
   * 代理 vue 的 computed 方法，以便于业务使用计算属性
   */
  computed: <T>(fn: () => T) => T;
  /**
   * 代理 vue 的 ref 方法，以便于业务使用 ref 做响应式监听
   */
  ref: <T = number | boolean | string | null>(value?: T) => { value?: T };
  /**
   * 代理 vue 的 reactive 方法，以便于在模版中使用响应式数据
   */
  reactive: (obj: object) => any;
  /**
   * 获取当前语言
   */
  getLanguage(): string;
  /**
   * 获取当前用户 ID
   */
  getCurrentUserId(): string,
}

export interface IRCKitDefineCustomElementOptions<T> {
  setup: (
    props: T,
    ctx: IRCKitComponentContext,
  ) => any;
  template: string;
  styles?: string[];
}

/**
 * 内部定义，不导出
 */
export enum OverrideAbleComponentTagInner {
  HQVoiceMessageComponent = 'rc-hq-voice-message'
}

/** 可被复写的组件集合 */
export const overrideAbleComponents = {
  [OverrideAbleComponentTagInner.HQVoiceMessageComponent]: HQVoiceMessageComponent,
}

/**
 * 可重写组件枚举定义
 */
export enum RCKitOverrideAbleComponent {
  /**
   * 语音消息组件
   */
  HQVoiceMessageComponent = 'HQVoiceMessageComponent',
}

/**
 * 定义可重写组件 Props 类型定义
 */
export interface IRCKitOverrideAbleComponentProps {
  HQVoiceMessageComponent: IRCKitHQVoiceMessageComponentProps,
}
