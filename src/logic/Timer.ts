/**
 * sys_timer — 타이머 시스템
 *
 * 책임:
 * - 경과 시간 추적 (초 단위)
 * - start / stop / reset
 * - 최대 999초
 *
 * 외부 의존: TimeProvider (생성자 주입)
 */

import { TimeProvider } from './types';

export class Timer {
  private _isRunning = false;
  private _startTime = 0;
  private _accumulated = 0; // 정지 전까지 누적된 밀리초

  private readonly time: TimeProvider;

  constructor(time: TimeProvider) {
    this.time = time;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  /** 현재 경과 시간 (초 단위, 0~999 클램프) */
  get elapsed(): number {
    return this.getElapsed();
  }

  start(): void {
    if (this._isRunning) return;
    this._isRunning = true;
    this._startTime = this.time.now();
  }

  stop(): void {
    if (!this._isRunning) return;
    this._accumulated += this.time.now() - this._startTime;
    this._isRunning = false;
  }

  reset(): void {
    this._isRunning = false;
    this._startTime = 0;
    this._accumulated = 0;
  }

  /** 경과 초를 반환 (소수점 버림, 0~999 클램프) */
  getElapsed(): number {
    let totalMs = this._accumulated;
    if (this._isRunning) {
      totalMs += this.time.now() - this._startTime;
    }
    const seconds = Math.floor(totalMs / 1000);
    return Math.min(seconds, 999);
  }
}
