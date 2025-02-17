/**
 * Global IM UIKit 构建版本代码 Commit ID
 */
export const RCKIT_COMMIT_VERSION = __COMMIT_ID__;
/**
 * Global IM UIKit 版本号
 */
export const RCKIT_VERSION = __VERSION__;

/**
 * Global IM UIKit 组件的环境变量定义，在组件内可通过 `inject` 函数获取
 */
export enum RCKIT_ENV_KEYS {
  /**
   * 当前语言标识，该值为 `Ref<string>` 值，支持响应式处理
   */
  LANGUAGE = 'GLOBAL_IM_UIKIT_ENV.LANGUAGE',
  /**
   * 当前登录用户 ID
   */
  CURRENT_USER_ID = 'GLOBAL_IM_UIKIT_ENV.CURRENT_USER_ID'
};
