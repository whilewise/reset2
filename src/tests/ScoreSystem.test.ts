/**
 * sys_score 단위테스트
 */

import { ScoreSystem } from '../logic/ScoreSystem';
import { Difficulty, ScoreStorage } from '../logic/types';

// ── 테스트 헬퍼 ──

function createMemoryStorage(): ScoreStorage {
  const store = new Map<string, number>();
  return {
    get: (key: string) => store.get(key) ?? null,
    set: (key: string, value: number) => { store.set(key, value); },
  };
}

const BEGINNER: Difficulty = { name: 'beginner', rows: 9, cols: 9, mines: 10 };
const INTERMEDIATE: Difficulty = { name: 'intermediate', rows: 16, cols: 16, mines: 40 };
const EXPERT: Difficulty = { name: 'expert', rows: 16, cols: 30, mines: 99 };
const CUSTOM: Difficulty = { name: 'custom', rows: 10, cols: 10, mines: 15 };

// ── 테스트 ──

describe('ScoreSystem', () => {
  describe('calculate', () => {
    test('초급 — 30초 클리어', () => {
      const score = new ScoreSystem(createMemoryStorage());
      const result = score.calculate(BEGINNER, 30);

      // baseScore = (9*9 - 10) * 10 = 710
      expect(result.baseScore).toBe(710);
      // timeBonus = max(0, (60 - 30)) * 5 = 150
      expect(result.timeBonus).toBe(150);
      expect(result.totalScore).toBe(860);
    });

    test('중급 — 200초 클리어 (시간 보너스 없음)', () => {
      const score = new ScoreSystem(createMemoryStorage());
      const result = score.calculate(INTERMEDIATE, 200);

      // baseScore = (16*16 - 40) * 10 = 2160
      expect(result.baseScore).toBe(2160);
      // timeBonus = max(0, (180 - 200)) * 5 = 0
      expect(result.timeBonus).toBe(0);
      expect(result.totalScore).toBe(2160);
    });

    test('고급 — 300초 클리어', () => {
      const score = new ScoreSystem(createMemoryStorage());
      const result = score.calculate(EXPERT, 300);

      // baseScore = (16*30 - 99) * 10 = 3810
      expect(result.baseScore).toBe(3810);
      // timeBonus = max(0, (480 - 300)) * 5 = 900
      expect(result.timeBonus).toBe(900);
      expect(result.totalScore).toBe(4710);
    });

    test('커스텀 난이도 — 기본 기준시간 300초 적용', () => {
      const score = new ScoreSystem(createMemoryStorage());
      const result = score.calculate(CUSTOM, 100);

      // baseScore = (10*10 - 15) * 10 = 850
      expect(result.baseScore).toBe(850);
      // timeBonus = max(0, (300 - 100)) * 5 = 1000
      expect(result.timeBonus).toBe(1000);
      expect(result.totalScore).toBe(1850);
    });

    test('시간이 기준보다 오래 걸리면 timeBonus는 0', () => {
      const score = new ScoreSystem(createMemoryStorage());
      const result = score.calculate(BEGINNER, 999);
      expect(result.timeBonus).toBe(0);
    });
  });

  describe('bestScore 관리', () => {
    test('처음 조회 시 null', () => {
      const score = new ScoreSystem(createMemoryStorage());
      expect(score.getBestScore('beginner')).toBeNull();
    });

    test('점수 저장 후 조회', () => {
      const score = new ScoreSystem(createMemoryStorage());
      score.saveBestScore('beginner', 500);
      expect(score.getBestScore('beginner')).toBe(500);
    });

    test('더 높은 점수만 갱신된다', () => {
      const score = new ScoreSystem(createMemoryStorage());
      score.saveBestScore('beginner', 500);
      score.saveBestScore('beginner', 300); // 무시됨
      expect(score.getBestScore('beginner')).toBe(500);

      score.saveBestScore('beginner', 800); // 갱신됨
      expect(score.getBestScore('beginner')).toBe(800);
    });

    test('난이도별 독립 저장', () => {
      const score = new ScoreSystem(createMemoryStorage());
      score.saveBestScore('beginner', 100);
      score.saveBestScore('expert', 200);
      expect(score.getBestScore('beginner')).toBe(100);
      expect(score.getBestScore('expert')).toBe(200);
    });
  });
});
