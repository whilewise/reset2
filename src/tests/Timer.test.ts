/**
 * sys_timer 단위테스트
 */

import { Timer } from '../logic/Timer';
import { TimeProvider } from '../logic/types';

// ── 테스트 헬퍼 ──

function createMockTime(startMs: number = 0): TimeProvider & { advance(ms: number): void; setNow(ms: number): void } {
  let current = startMs;
  return {
    now: () => current,
    advance(ms: number) { current += ms; },
    setNow(ms: number) { current = ms; },
  };
}

// ── 테스트 ──

describe('Timer', () => {
  test('초기 상태: 정지, 경과 0', () => {
    const time = createMockTime();
    const timer = new Timer(time);
    expect(timer.isRunning).toBe(false);
    expect(timer.elapsed).toBe(0);
  });

  test('start 후 시간이 흐르면 elapsed 증가', () => {
    const time = createMockTime(1000);
    const timer = new Timer(time);
    timer.start();
    time.advance(3500); // 3.5초 경과
    expect(timer.elapsed).toBe(3);
    expect(timer.isRunning).toBe(true);
  });

  test('stop 후 elapsed 고정', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);
    timer.start();
    time.advance(5000);
    timer.stop();
    time.advance(10000); // 정지 후 시간 경과
    expect(timer.elapsed).toBe(5);
    expect(timer.isRunning).toBe(false);
  });

  test('reset 후 0으로 초기화', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);
    timer.start();
    time.advance(5000);
    timer.reset();
    expect(timer.elapsed).toBe(0);
    expect(timer.isRunning).toBe(false);
  });

  test('start/stop/start 누적 시간', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);

    timer.start();
    time.advance(2000); // 2초
    timer.stop();

    time.advance(5000); // 정지 상태에서 5초

    timer.start();
    time.advance(3000); // 추가 3초

    expect(timer.elapsed).toBe(5); // 2 + 3
  });

  test('999초 클램프', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);
    timer.start();
    time.advance(1_500_000); // 1500초
    expect(timer.elapsed).toBe(999);
  });

  test('이미 running인 상태에서 start 재호출 무시', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);
    timer.start();
    time.advance(1000);
    timer.start(); // 무시
    time.advance(1000);
    expect(timer.elapsed).toBe(2);
  });

  test('이미 stopped인 상태에서 stop 재호출 무시', () => {
    const time = createMockTime(0);
    const timer = new Timer(time);
    timer.stop(); // 이미 정지 상태
    expect(timer.elapsed).toBe(0);
  });
});
