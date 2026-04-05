/**
 * sys_score — 점수/기록 시스템
 *
 * 책임:
 * - 점수 계산: 기본 점수 + 시간 보너스
 * - 최고 점수 조회/저장
 *
 * 외부 의존: ScoreStorage (생성자 주입)
 */

import { Difficulty, ScoreResult, ScoreStorage } from './types';

/** 난이도별 시간 보너스 기준(초) */
const TIME_BASELINES: Record<string, number> = {
  beginner: 60,
  intermediate: 180,
  expert: 480,
};

/** 커스텀 난이도의 기본 기준시간 */
const DEFAULT_BASELINE = 300;

export class ScoreSystem {
  private readonly storage: ScoreStorage;

  constructor(storage: ScoreStorage) {
    this.storage = storage;
  }

  /** 점수 계산 */
  calculate(difficulty: Difficulty, elapsedSeconds: number): ScoreResult {
    const baseScore = (difficulty.rows * difficulty.cols - difficulty.mines) * 10;
    const baseline = TIME_BASELINES[difficulty.name] ?? DEFAULT_BASELINE;
    const timeBonus = Math.max(0, (baseline - elapsedSeconds)) * 5;
    const totalScore = baseScore + timeBonus;

    return { baseScore, timeBonus, totalScore };
  }

  /** 난이도별 최고 점수 조회 */
  getBestScore(difficultyName: string): number | null {
    return this.storage.get(`best_${difficultyName}`);
  }

  /** 최고 점수 저장 (기존보다 높을 때만) */
  saveBestScore(difficultyName: string, score: number): void {
    const current = this.getBestScore(difficultyName);
    if (current === null || score > current) {
      this.storage.set(`best_${difficultyName}`, score);
    }
  }
}
