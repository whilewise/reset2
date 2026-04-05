/**
 * sys_game 단위테스트
 */

import { GameManager, GameManagerDeps } from '../logic/GameManager';
import {
  Difficulty,
  GameEvent,
  RandomProvider,
  TimeProvider,
  ScoreStorage,
  DIFFICULTY_BEGINNER,
} from '../logic/types';

// ── 테스트 헬퍼 ──

function createNoShuffleRandom(): RandomProvider {
  return { nextInt: () => 0 };
}

function createMockTime(startMs = 0): TimeProvider & { advance(ms: number): void } {
  let current = startMs;
  return {
    now: () => current,
    advance(ms: number) { current += ms; },
  };
}

function createMemoryStorage(): ScoreStorage {
  const store = new Map<string, number>();
  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => { store.set(key, value); },
  };
}

function createDeps(timeStart = 0): GameManagerDeps & { time: ReturnType<typeof createMockTime> } {
  return {
    random: createNoShuffleRandom(),
    time: createMockTime(timeStart),
    storage: createMemoryStorage(),
  };
}

const TINY: Difficulty = { name: 'beginner', rows: 5, cols: 5, mines: 1 };

// ── 테스트 ──

describe('GameManager', () => {
  describe('상태 머신 (FSM)', () => {
    test('초기 상태는 idle', () => {
      const gm = new GameManager(createDeps());
      expect(gm.state).toBe('idle');
    });

    test('startGame → ready', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      expect(gm.state).toBe('ready');
    });

    test('첫 좌클릭 → playing', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);
      expect(gm.state).toBe('playing');
    });

    test('지뢰 밟으면 gameover', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0); // ready → playing

      // 지뢰 위치 찾기
      let mineR = -1, mineC = -1;
      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (gm.board.cells[r][c].isMine) { mineR = r; mineC = c; }
        }
      }

      if (mineR >= 0) {
        gm.handleLeftClick(mineR, mineC);
        expect(gm.state).toBe('gameover');
      }
    });

    test('모든 비지뢰 셀을 열면 victory', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0); // ready → playing, 보드 생성

      // 모든 비지뢰 셀 열기
      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (!gm.board.cells[r][c].isMine && gm.board.cells[r][c].state === 'closed') {
            gm.handleLeftClick(r, c);
          }
        }
      }

      expect(gm.state).toBe('victory');
    });

    test('restart → ready', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);

      // 지뢰 밟아서 gameover
      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (gm.board.cells[r][c].isMine) {
            gm.handleLeftClick(r, c);
            break;
          }
        }
        if (gm.state === 'gameover') break;
      }

      gm.restart();
      expect(gm.state).toBe('ready');
    });
  });

  describe('입력 제한', () => {
    test('idle 상태에서 좌클릭 무시', () => {
      const gm = new GameManager(createDeps());
      const result = gm.handleLeftClick(0, 0);
      expect(result.success).toBe(false);
      expect(gm.state).toBe('idle');
    });

    test('gameover 상태에서 모든 클릭 무시', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);

      // 지뢰 밟기
      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (gm.board.cells[r][c].isMine) {
            gm.handleLeftClick(r, c);
            break;
          }
        }
        if (gm.state === 'gameover') break;
      }

      expect(gm.state).toBe('gameover');
      const left = gm.handleLeftClick(0, 0);
      const right = gm.handleRightClick(0, 0);
      const chord = gm.handleChordClick(0, 0);
      expect(left.success).toBe(false);
      expect(right.success).toBe(false);
      expect(chord.success).toBe(false);
    });
  });

  describe('타이머 연동', () => {
    test('첫 클릭 시 타이머 시작', () => {
      const deps = createDeps();
      const gm = new GameManager(deps);
      gm.startGame(TINY);
      expect(gm.timer.isRunning).toBe(false);

      gm.handleLeftClick(0, 0);
      expect(gm.timer.isRunning).toBe(true);
    });

    test('게임 오버 시 타이머 정지', () => {
      const deps = createDeps();
      const gm = new GameManager(deps);
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);

      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (gm.board.cells[r][c].isMine) {
            gm.handleLeftClick(r, c);
            break;
          }
        }
        if (gm.state === 'gameover') break;
      }

      expect(gm.timer.isRunning).toBe(false);
    });

    test('restart 시 타이머 리셋', () => {
      const deps = createDeps();
      const gm = new GameManager(deps);
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);
      deps.time.advance(5000);
      gm.restart();
      expect(gm.timer.elapsed).toBe(0);
    });
  });

  describe('이벤트 발행', () => {
    test('game_started 이벤트', () => {
      const gm = new GameManager(createDeps());
      const events: GameEvent[] = [];
      gm.on((e) => events.push(e));

      gm.startGame(TINY);
      expect(events.some(e => e.type === 'game_started')).toBe(true);
    });

    test('cell_opened 이벤트', () => {
      const gm = new GameManager(createDeps());
      const events: GameEvent[] = [];
      gm.on((e) => events.push(e));

      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);
      expect(events.some(e => e.type === 'cell_opened')).toBe(true);
    });

    test('mine_hit + gameover 이벤트', () => {
      const gm = new GameManager(createDeps());
      const events: GameEvent[] = [];
      gm.on((e) => events.push(e));

      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);

      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (gm.board.cells[r][c].isMine) {
            gm.handleLeftClick(r, c);
            break;
          }
        }
        if (gm.state === 'gameover') break;
      }

      expect(events.some(e => e.type === 'mine_hit')).toBe(true);
      expect(events.some(e => e.type === 'gameover')).toBe(true);
    });

    test('victory 이벤트 + 점수 계산', () => {
      const deps = createDeps();
      const gm = new GameManager(deps);
      const events: GameEvent[] = [];
      gm.on((e) => events.push(e));

      gm.startGame(TINY);
      gm.handleLeftClick(0, 0);
      deps.time.advance(10000); // 10초

      for (let r = 0; r < gm.board.rows; r++) {
        for (let c = 0; c < gm.board.cols; c++) {
          if (!gm.board.cells[r][c].isMine && gm.board.cells[r][c].state === 'closed') {
            gm.handleLeftClick(r, c);
          }
        }
      }

      expect(events.some(e => e.type === 'victory')).toBe(true);
      expect(gm.lastScoreResult).not.toBeNull();
      expect(gm.lastScoreResult!.totalScore).toBeGreaterThan(0);
    });

    test('off로 리스너 제거', () => {
      const gm = new GameManager(createDeps());
      const events: GameEvent[] = [];
      const listener = (e: GameEvent) => events.push(e);
      gm.on(listener);
      gm.off(listener);

      gm.startGame(TINY);
      expect(events.length).toBe(0);
    });
  });

  describe('우클릭 (깃발)', () => {
    test('ready 상태에서 깃발 토글 가능', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      const result = gm.handleRightClick(0, 0);
      expect(result.success).toBe(true);
    });

    test('playing 상태에서 깃발 토글 가능', () => {
      const gm = new GameManager(createDeps());
      gm.startGame(TINY);
      gm.handleLeftClick(0, 0); // playing
      const result = gm.handleRightClick(4, 4);
      expect(result.success).toBe(true);
    });
  });
});
