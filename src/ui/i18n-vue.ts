import { ref, computed, ComputedRef } from 'vue';

import { RCKitContext } from '../core/RCKitContext';
import { IRCKitLanguageEntries, RCKitLanguageDirection, languagePacks } from '../languages';
import { InnerEvent } from '@lib/core/EventDefined';

/**
 * 当前语言行文方向
 */
export const direction = ref<RCKitLanguageDirection>('ltr');

/**
 * 当前使用的语言包
 */
export const lang = ref('en_US');

export function init(ctx: RCKitContext): void {
  ctx.addEventListener(InnerEvent.LANGUAGE_CHANGE, (event) => {
    lang.value = event.data.lang;
    direction.value = event.data.direction;
  });
}

/**
 * 多语言数据匹配，返回计算属性，当语言变更时，自动变更显示
 */
export function $t(key: keyof IRCKitLanguageEntries, ...args:  Array<string | number>): ComputedRef<string> {
  return computed(() => $tt(key, ...args));
}

/**
 * 获取当前语言环境下指定词条的字符串定义
 */
export function $tt(key: keyof IRCKitLanguageEntries, ...args: Array<string | number>): string {
  const entry = languagePacks[lang.value].entries[key as keyof IRCKitLanguageEntries];
  if (!entry) {
    return key as string;
  }
  if (args.length === 0) {
    return entry;
  }
  return entry.replace(/\{\d+\}/g, (match, index) => args[parseInt(match.substring(1, match.length - 1), 10)].toString());
}

/**
 * 查询指定词条在当前语言环境下是否有定义
 * @param key
 * @returns
 */
export function $has(key: keyof IRCKitLanguageEntries): boolean {
  return !!languagePacks[lang.value].entries[key as keyof IRCKitLanguageEntries];
}
