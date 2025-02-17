import { defineCustomElement, computed, ref, reactive } from 'vue';

import { ILogger } from '@rongcloud/engine';

import { RCKitContext } from '../core/RCKitContext';
import { LogTag } from '../enums/LogTag';

import { components } from './component';
import { providers } from './provider';
import {
  IRCKitOverrideAbleComponentProps, OverrideAbleComponentTagInner,
  IRCKitDefineCustomElementOptions, IRCKitComponentContext, overrideAbleComponents,
} from './override-able'

import { init, lang } from './i18n-vue';
import {
  initProviderContext, setCustomMessageDigestHandler, regMessageTypeComponentTag,
  destroyUserCache,
} from './provider/context';
import { IRCKitCachedMessage } from '../modules/MessageDataModule';
import { BaseMessage, registerMessageType } from '@rongcloud/imlib-next';
import { IRCKitMessageComponentProps } from './interface';

export interface IRCKitCustomMessageComponentOpts extends IRCKitDefineCustomElementOptions<IRCKitMessageComponentProps> {
  /**
   * 消息组件标签
   */
  tag: string
}

/**
 * 自定义消息注册配置
 */
export interface IRCKitRegisterMessageTypeOpts {
  /** 是否计数 */
  isCounted?: boolean
  /**
   * 消息是否存储
   * @description
   * - `true`: 消息将进入数据库存储，并将在消息列表中显示，开发者必须提供 `digest` 摘要函数，同时可定义 `component` 组件来声明其在消息列表中的展示方式。
   * - `false`: 消息不会进入数据库存储，也不会在消息列表中显示。SDK 会将消息通过 `RCKitEvents.UNSCHEDULED_MESSAGES` 事件抛给开发者自行处理。
   */
  isPersited?: boolean
  /** 是否为状态消息：状态消息不计数不存储，且不进入离线补偿，仅限在线时收取 */
  isStatusMessage?: boolean
  /** 检索消息 key，用于消息搜索匹配 */
  searchProps?: string[]
  /**
   * 消息摘要计算函数，用于自定义消息在会话列表和消息列表中的展示。
   * 在同时定义了 `component` 与 `digest` 属性的情况下，SDK 会优先使用 `component` 组件进行消息渲染。
   */
  digest?: (message: IRCKitCachedMessage, language: string) => string
  /**
   * 当 `isPersited` 为 `true` 时，可通过赋值 `component` 属性来定义相应的气泡 UI 渲染组件。
   * 当该值为空时，SDK 将通过 `digest` 摘要计算函数，渲染消息为灰条消息进行展示。
   */
  component?: IRCKitCustomMessageComponentOpts,
}

export class UIModule {
  private readonly logger: ILogger;

  /**
   * 业务层注册的自定义消息组件
   */
  private readonly _customMessageComponents: Record<string, any> = {};

  /**
   * 可重写组件
   */
  private readonly _overrideAbleComponents: Record<string, any> = { ...overrideAbleComponents };

  private readonly _overrideCtx: IRCKitComponentContext;

  constructor(private readonly ctx: RCKitContext) {
    this.logger = ctx.logger;

    this._overrideCtx = {
      computed,
      ref,
      reactive,
      getLanguage: () => lang.value,
      getCurrentUserId: () => this.ctx.userId
    }

    // 初始化 i18n
    init(ctx);
    // 初始化 provider context
    initProviderContext(ctx);
  }

  public registerCustomElement<T extends keyof IRCKitOverrideAbleComponentProps>(tag: T, opt: IRCKitDefineCustomElementOptions<{ value: IRCKitOverrideAbleComponentProps[T] }>): void {
    const originTag = OverrideAbleComponentTagInner[tag];

    if (!originTag) {
      this.logger.error(LogTag.A_REGISTER_CUSTOM_ELEMENT_O, `Tag is either illegal or cannot be rewritten: OverrideAbleComponentTag[${tag}]`);
      return;
    }

    this.logger.info(LogTag.A_REGISTER_CUSTOM_ELEMENT_O, `tag: ${originTag}`);

    // 埋点记录
    this.ctx.statistic(`Override_${tag}`);

    // 获取原始组件定义，重命名组件标签
    const component = overrideAbleComponents[originTag];
    const newTag = originTag.replace(/^rc-/, 'rc-override-')
    this._overrideAbleComponents[newTag] = component;

    const ctx = this._overrideCtx;
    // 替换组件标签定义
    this._overrideAbleComponents[originTag] = {
      // 保留原始组件 props 定义
      props: { ...component.props },
      setup(props: { value: IRCKitOverrideAbleComponentProps[T] }) {
        return opt.setup(props, ctx);
      },
      // 检测 rc-origin 标签，若存在替换为被重写的原始组件标签
      template: opt.template.replace(/rc-origin/g, newTag),
      styles: opt.styles,
    };
  }

  /**
   * 向浏览器注册自定义组件
   */
  public registerDOMElements(): void {
    this.logger.info(LogTag.L_REGISTER_DOM_ELEMENTS_O);

    // 可复写组件注册
    Object.entries(this._overrideAbleComponents).forEach(([tag, component]) => {
      if (!customElements.get(tag)) {
        customElements.define(tag, defineCustomElement(component));
      }
    });

    // 注册其他 Component 组件
    Object.entries(components).forEach(([tag, component]) => {
      if (!customElements.get(tag)) {
        customElements.define(tag, defineCustomElement(component));
      }
    });

    // 自定义消息组件注册
    Object.entries(this._customMessageComponents).forEach(([tag, component]) => {
      if (!customElements.get(tag)) {
        customElements.define(tag, component);
      }
    });

    // 注册 Provider 容器组件
    Object.entries(providers).forEach(([tag, provider]) => {
      if (!customElements.get(tag)) {
        customElements.define(tag, defineCustomElement(provider));
      }
    });
  }

  /**
   * 注册自定义消息
   * @param messageType
   * @param options
   */
  registerMessageType<T = any>(messageType: string, options: IRCKitRegisterMessageTypeOpts): new (content: T) => BaseMessage<T> {
    // IMLib 自定义消息注册
    const define = registerMessageType<T>(messageType, !!options.isPersited, !!options.isCounted, options.searchProps, !!options.isStatusMessage);

    // 注册消息摘要计算函数
    if (options.digest) {
      setCustomMessageDigestHandler(messageType, options.digest);
    }
    // 注册消息组件
    if (options.component) {
      const { component } = options;

      // 注册气泡消息组件，追加 `rc-custom-` 前缀，以统一业务 demo 配置时的 Web Component 标签检测
      const tag = `rc-custom-${component.tag}`
      regMessageTypeComponentTag(messageType, tag);

      const context = this._overrideCtx;

      const { setup, styles, template } = component;
      // this.registerCustomElement(tag, options.component, true);
      // 记录消息类型与组件 tag 的映射关系
      this._customMessageComponents[tag] = defineCustomElement({
        props: ['message'],
        setup(props) {
          return setup(props, context);
        },
        styles,
        template
      })
    }
    return define;
  }

  public destroy(): void {
    destroyUserCache();
    // 重置默认语言
    lang.value = 'en_US'
  }
}
