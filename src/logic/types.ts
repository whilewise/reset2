/**
 * 지뢰찾기 게임 공통 타입 정의
 * 모든 시스템 로직에서 공유하는 인터페이스와 타입
 */

// ── 셀 ──

export type CellState = 'closed' | 'opened' | 'flagged' | 'exploded';

export interface Cell {
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
}

// ── 결과 타입 ──

export interface OpenResult {
  success: boolean;
  openedCells: { row: number; col: number }[];
  hitMine: boolean;
}

export interface FlagResult {
  success: boolean;
  newState: 'flagged' | 'closed';
  remainingMines: number;
}

// ── 난이도 ──

export interface Difficulty {
  name: string;
  rows: number;
  cols: number;
  mines: number;
}

export const DIFFICULTY_BEGINNER: Difficulty = {
  name: 'beginner',
  rows: 9,
  cols: 9,
  mines: 10,
};

export const DIFFICULTY_INTERMEDIATE: Difficulty = {
  name: 'intermediate',
  rows: 16,
  cols: 16,
  mines: 40,
};

export const DIFFICULTY_EXPERT: Difficulty = {
  name: 'expert',
  rows: 16,
  cols: 30,
  mines: 99,
};

// ── 점수 ──

export interface ScoreResult {
  baseScore: number;
  timeBonus: number;
  totalScore: number;
}

// ── 게임 상태 ──

export type GameState = 'idle' | 'ready' | 'playing' | 'gameover' | 'victory';

// ── 이벤트 ──

export type GameEventType =
  | 'cell_opened'
  | 'flag_toggled'
  | 'mine_hit'
  | 'victory'
  | 'gameover'
  | 'timer_tick'
  | 'game_started'
  | 'game_restarted';

export interface GameEvent {
  type: GameEventType;
  data?: unknown;
}

export type GameEventListener = (event: GameEvent) => void;

// ── 외부 의존성 인터페이스 (DI) ──

export interface RandomProvider {
  /** 0 이상 max 미만의 정수를 반환 */
  nextInt(max: number): number;
}

export interface TimeProvider {
  /** 현재 시각을 밀리초로 반환 */
  now(): number;
}

// ── 저장소 인터페이스 (DI) ──

export interface ScoreStorage {
  get(key: string): number | null;
  set(key: string, value: number): void;
}
