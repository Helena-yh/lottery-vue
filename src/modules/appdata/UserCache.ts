import { LogTag } from "@lib/enums/LogTag";
import { BasicCache } from "./BasicCache";
import { DEFAULT_USER_PORTRAIT_SVG } from "@lib/assets";
import { RCKitEvent } from "@lib/core/RCKitEvent";
import { InnerEvent } from "@lib/core/EventDefined";
import { RCKitCommand } from "@lib/enums/RCKitCommand";
import { RCKitContext } from "@lib/core/RCKitContext";

export interface IRCKitUserProfile {
  /**
   * 用户 ID
   */
  userId: string;
  /**
   * 用户名
   */
  name: string;
  /**
   * 头像 url
   */
  portraitUri?: string;
}

/**
 * 缓存的用户数据
 */
export interface ICacheUserProfile extends IRCKitUserProfile {
  /**
   * 标识用户数据为默认数据，必要时需要从业务获取更新数据
   */
  usingDefault: boolean;
  /**
   * 头像 url
   */
  portraitUri: string;
  /**
   * 在线状态
   */
  online: boolean;
}

export interface IRCKitUserOnlineStatus {
  /**
   * 用户 ID
   */
  userId: string;
  /**
   * 在线状态
   */
  online: boolean;
}

/**
 * 用户数据缓存模块
 */
export class UserCache extends BasicCache<ICacheUserProfile, IRCKitUserProfile> {
  protected readonly GetDefaultTag: string = LogTag.L_GET_DEFAULT_USER_PROFILE_HOOK_O;
  
  protected readonly GetDefaultErrorTag: string = LogTag.L_GET_DEFAULT_USER_PROFILE_HOOK_E;

  protected readonly ReqStartTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_T;

  protected readonly ReqFailedTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_E;

  protected readonly ReqSuccessTag: string = LogTag.L_REQ_USER_PROFILE_HOOK_R;

  constructor(
    ctx: RCKitContext,
    hook: (ids: string[]) => Promise<IRCKitUserProfile[]>,
    defaultHook?: (id: string) => IRCKitUserProfile,
    private _reqUserOnlineStatus?: (ids: string[]) => Promise<IRCKitUserOnlineStatus[]>,
  ) {
    super(ctx, hook, defaultHook);
  }

  private _isSameUserProfile(a: IRCKitUserProfile, b: IRCKitUserProfile): boolean {
    return a.name === b.name && a.userId === b.userId && a.portraitUri === b.portraitUri;
  }

  private _updateCacheUserProfile(cache: ICacheUserProfile, profile: IRCKitUserProfile): void {
    cache.name = profile.name;
    cache.portraitUri = profile.portraitUri || cache.portraitUri;
    cache.usingDefault = false;
  }

  protected _checkAndUpdateCacheData(profile: IRCKitUserProfile): { cached: ICacheUserProfile; changed: boolean; } {
    const { name, userId, portraitUri } = profile;

    let cacheProfile = this._cache.get(userId);
    let changed = false;

    if (cacheProfile) {
      if (!this._isSameUserProfile(cacheProfile, profile)) {
        // 更新缓存数据
        this._updateCacheUserProfile(cacheProfile, profile);
        changed = true;
      }
    } else {
      changed = true;
      cacheProfile = {
        name,
        userId,
        portraitUri: portraitUri || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: false,
        online: false,
      };
      this._cache.set(userId, cacheProfile);
    }

    return { changed, cached: cacheProfile };
  }

  protected _isInvalid(profile: IRCKitUserProfile): boolean {
    return (
      typeof profile !== "object" ||
      !profile.userId ||
      typeof profile.userId !== "string" ||
      !profile.name ||
      typeof profile.name !== "string" ||
      (!!profile.portraitUri && typeof profile.portraitUri !== "string")
    );
  }

  protected _dispatchUpdateEvent(datas: ICacheUserProfile[]): void {
    if (datas.length === 0) {
      return;
    }

    this._ctx.dispatchEvent(new RCKitEvent(InnerEvent.USER_PROFILES_UPDATE, datas));
  }

  protected _createDefaultCache(userId: string, defaultProfile: IRCKitUserProfile): ICacheUserProfile {
    const result: ICacheUserProfile = defaultProfile
      ? {
        ...defaultProfile,
        portraitUri: defaultProfile.portraitUri || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: true,
        online: false,
      }
      : {
        userId,
        name: `User<${userId}>`,
        portraitUri: DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: true,
        online: false,
      };
    return result
  }

  /**
   * @param profiles 
   */
  public updateUserProfile(profile: IRCKitUserProfile): void {
    const traceId = this.logger.createTraceId();
    this.logger.warn(LogTag.A_UPDATE_USER_PROFILE_T, undefined, traceId);

    // 合法性校验
    if (this._isInvalid(profile)) {
      this.logger.error(
        LogTag.A_UPDATE_USER_PROFILE_E,
        "invalid user profile",
        traceId
      );
      return;
    }

    const { userId, name, portraitUri } = profile;

    let cacheProfile = this._cache.get(userId);
    if (cacheProfile && this._isSameUserProfile(cacheProfile, profile)) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_PROFILE_R,
        `user profile not changed: ${userId}`,
        traceId
      );
      return;
    }

    if (!cacheProfile) {
      cacheProfile = {
        userId,
        name,
        portraitUri: portraitUri || DEFAULT_USER_PORTRAIT_SVG,
        usingDefault: false,
        online: false,
      };
      this._cache.set(userId, cacheProfile);
    } else {
      this._updateCacheUserProfile(cacheProfile, profile);
    }

    this.logger.info(
      LogTag.A_UPDATE_USER_PROFILE_R,
      `userId: ${userId}, name: ${name}, portraitUri: ${portraitUri}`,
      traceId
    );

    // 派发事件
    this._dispatchUpdateEvent([cacheProfile]);
  }

  updateUserOnlineStatus(userId: string, online: boolean): void {
    const traceId = this.logger.createTraceId();
    this.logger.info(
      LogTag.A_UPDATE_USER_ONLINE_STATE_T,
      `userId: ${userId}, online: ${online}`,
      traceId
    );
    if (!this.store.getCommandSwitch(RCKitCommand.SHOW_USER_ONLINE_STATE)) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_ONLINE_STATE_R,
        "command switch is off",
        traceId
      );
      return;
    }
    const profile = this._cache.get(userId);
    if (!profile) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_ONLINE_STATE_R,
        `user profile not found: ${userId}`,
        traceId
      );
      return;
    }

    if (profile.online === online) {
      this.logger.warn(
        LogTag.A_UPDATE_USER_ONLINE_STATE_R,
        `user online state not changed: ${userId}`,
        traceId
      );
      return;
    }

    profile.online = online;
    this.logger.info(
      LogTag.A_UPDATE_USER_ONLINE_STATE_R,
      `userId: ${userId}, online: ${online}`,
      traceId
    );

    // 派发事件
    this._dispatchUpdateEvent([profile]);
  }

  /**
   * 异步请求用户在线状态，在在线状态发生变更时，将对外派发用户信息更新通知。
   * @param userIds - 用户 ID 列表
   */
  public async reqUserOnlineStatus(userIds: string[]): Promise<void> {
    const traceId = this.logger.createTraceId();

    // 开关状态检查
    if (!this.store.getCommandSwitch(RCKitCommand.SHOW_USER_ONLINE_STATE)) {
      return;
    }

    this.logger.info(
      LogTag.L_REQ_USER_ONLINE_HOOK_T,
      `userIds: ${userIds.join(",")}`,
      traceId
    );

    if (typeof this._reqUserOnlineStatus !== "function") {
      this.logger.error(
        LogTag.L_REQ_USER_ONLINE_HOOK_E,
        "'reqUserOnlineStatus' is not a function",
        traceId
      );
      return;
    }

    let result: IRCKitUserOnlineStatus[];
    try {
      result = await this._reqUserOnlineStatus(userIds);
    } catch (error: any) {
      this.logger.error(
        LogTag.L_REQ_USER_ONLINE_HOOK_E,
        error.message,
        traceId
      );
      return;
    }

    // 结果校验
    if (!Array.isArray(result)) {
      this.logger.error(
        LogTag.L_REQ_USER_ONLINE_HOOK_E,
        "invalid result, must be a Array",
        traceId
      );
      console.error("invalid result: ", result);
      return;
    }

    const changed: ICacheUserProfile[] = [];
    result.forEach((item, index) => {
      // 校验结果
      if (
        typeof item !== "object" ||
        typeof item.userId !== "string" ||
        typeof item.online !== "boolean"
      ) {
        this.logger.warn(
          LogTag.L_REQ_USER_ONLINE_HOOK_E,
          `invalid item index: ${index}`,
          traceId
        );
        console.error(`invalid item in position ${index}: `, item);
        return;
      }

      const { userId, online } = item;
      const profile = this._cache.get(userId);
      if (!profile) {
        this.logger.warn(
          LogTag.L_REQ_USER_ONLINE_HOOK_E,
          `user profile not found: ${userId}`,
          traceId
        );
        return;
      }

      // 与当前状态相同，无需变更
      if (profile.online === online) {
        return;
      }

      profile.online = online;
      changed.push(profile);
    });

    this.logger.info(LogTag.L_REQ_USER_ONLINE_HOOK_R, "", traceId);

    this._dispatchUpdateEvent(changed);
  }
}