import { InnerEvent, AudioPlayState } from "../core/EventDefined";
import { RCKitEvent } from "../core/RCKitEvent";
import { RCKitModule } from "./RCKitModule";

/**
 * 音频管理模块，记录当前播放进度，提供播放、暂停、停止等方法
 * @description 同一时刻仅允许播放一条音频
 */
export class AudioPlayer extends RCKitModule {
  private _audio: HTMLAudioElement = new Audio();

  private _status: 'playing' | 'stopped' = 'stopped';
  private _progress: number = 0;
  private _messageUId: string = '';
  private _transactionId: number = 0;

  protected _onInitUserCache(): void {
    this._audio.addEventListener('ended', this._onEnded);
    this._audio.addEventListener('timeupdate', this._onTimeUpdate);
    this._audio.addEventListener('error', this._onError);
  }

  protected _onDestroyUserCache(): void {
    this._audio.removeEventListener('ended', this._onEnded);
    this._audio.removeEventListener('timeupdate', this._onTimeUpdate);
    this._audio.addEventListener('error', this._onError);
  }

  public destroy(): void {
    throw new Error("Method not implemented.");
  }

  private _onError = () => {
    this._progress = 0;
    this._status = 'stopped';
    this._dispatch();
  }

  private _onTimeUpdate = () => {
    const { currentTime, duration } = this._audio;
    this._progress = Math.floor(currentTime / duration * 100);
    if (this._status === 'stopped') {
      // 停止播放后，audio 会继续触发 timeupdate 事件，需要进行屏蔽
      return;
    }
    this._dispatch();
  }

  private _onEnded = () => {
    this._progress = 100;
    this._status = 'stopped';
    this._dispatch();
  }

  /**
   * 获取当前播放状态
   */
  public getCurrentState(): AudioPlayState {
    return {
      progress: this._progress,
      status: this._status,
      messageUId: this._messageUId,
      transactionId: this._transactionId,
    }
  }

  private _dispatch() {
    this.ctx.dispatchEvent(new RCKitEvent(InnerEvent.AUDIO_PLAY_EVENT, this.getCurrentState()), false);
  }

  /**
   * 播放音频
   * @param url 音频地址
   * @param messageUId 音频资源所属的消息 uid，本地上行消息可能为 ''
   * @param transactionId 本地上行消息的 transactionId，上行消息无 uid，因此需要传递 transactionId 以标识唯一消息
   */
  play(url: string, messageUId: string, transactionId?: number): void {
    if ((this._messageUId && this._messageUId === messageUId) || (this._transactionId && this._transactionId === transactionId)) {
      // 继续播放
      if (this._status === 'stopped') {
        this._audio.play();
        this._status = "playing";
        this._onTimeUpdate();
      }
      return;
    }

    this._status = 'playing';
    this._messageUId = messageUId;
    this._transactionId = 0;
    this._progress = 0;

    this._audio.src = url;
    this._audio.play();
    this._dispatch();
  }

  /**
   * 停止播放，并清空播放进度
   */
  stop() {
    this._status = 'stopped';
    this._messageUId = '';
    this._transactionId = 0;
    this._progress = 0;

    if (this._audio.src) {
      this._audio.pause();
      this._audio.src = '';
    }
    this._dispatch();
  }

  /**
   * 暂停播放，进行中的播放进度
   */
  pause() {
    if (this._status === 'stopped') {
      return;
    }
    this._status = 'stopped';
    this._audio.pause();
    this._dispatch();
  }
}