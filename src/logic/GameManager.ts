/**
 * sys_game — 게임 상태 관리 (FSM)
 *
 * 책임:
 * - 게임 상태 머신: idle → ready → playing → gameover | victory
 * - 사용자 입력(좌/우/양클릭) 디스패치
 * - Board, Timer, ScoreSystem 연결
 * - 이벤트 발행
 *
 * 외부 의존: RandomProvider, TimeProvider, ScoreStorage (생성자 주입)
 */

import {
  Difficulty,
  GameState,
  GameEvent,
  GameEventListener,
  RandomProvider,
  TimeProvider,
  ScoreStorage,
  OpenResult,
  FlagResult,
  ScoreResult,
  DIFFICULTY_BEGINNER,
} from './types';
import { Board } from './Board';
import { Timer } from './Timer';
import { ScoreSystem } from './ScoreSystem';

export interface GameManagerDeps {
  random: RandomProvider;
  time: TimeProvider;
  storage: ScoreStorage;
}

export class GameManager {
  private _state: GameState = 'idle';
  private _difficulty: Difficulty = DIFFICULTY_BEGINNER;
  private _board!: Board;
  private _timer: Timer;
  private _score: ScoreSystem;
  private _lastScoreResult: ScoreResult | null = null;

  private readonly deps: GameManagerDeps;
  private readonly listeners: GameEventListener[] = [];

  constructor(deps: GameManagerDeps) {
    this.deps = deps;
    this._timer = new Timer(deps.time);
    this._score = new ScoreSystem(deps.storage);
    this._board = new Board(this._difficulty, deps.random);
  }

  // ── 접근자 ──

  get state(): GameState {
    return this._state;
  }

  get difficulty(): Difficulty {
    return this._difficulty;
  }

  get board(): Board {
    return this._board;
  }

  get timer(): Timer {
    return this._timer;
  }

  get scoreSystem(): ScoreSystem {
    return this._score;
  }

  get lastScoreResult(): ScoreResult | null {
    return this._lastScoreResult;
  }

  // ── 이벤트 ──

  on(listener: GameEventListener): void {
    this.listeners.push(listener);
  }

  off(listener: GameEventListener): void {
    const idx = this.listeners.indexOf(listener);
    if (idx !== -1) this.listeners.splice(idx, 1);
  }

  private emit(event: GameEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  // ── 게임 흐름 ──

  /** idle → ready: 난이도를 설정하고 빈 보드를 준비한다 */
  startGame(difficulty: Difficulty): void {
    this._difficulty = difficulty;
    this._board = new Board(difficulty, this.deps.random);
    this._timer.reset();
    this._lastScoreResult = null;
    this._state = 'ready';
    this.emit({ type: 'game_started', data: { difficulty } });
  }

  /** gameover|victory → ready: 같은 난이도로 재시작 */
  restart(): void {
    this._board = new Board(this._difficulty, this.deps.random);
    this._timer.reset();
    this._lastScoreResult = null;
    this._state = 'ready';
    this.emit({ type: 'game_restarted' });
  }

  // ── 입력 핸들러 ──

  handleLeftClick(row: number, col: number): OpenResult {
    const noop: OpenResult = { success: false, openedCells: [], hitMine: false };

    if (this._state === 'gameover' || this._state === 'victory' || this._state === 'idle') {
      return noop;
    }

    // ready 상태에서 첫 클릭 → 보드 생성 + playing 전환
    if (this._state === 'ready') {
      this._board.generate(row, col);
      this._timer.start();
      this._state = 'playing';
    }

    const result = this._board.openCell(row, col);

    if (result.hitMine) {
      this._timer.stop();
      this._state = 'gameover';
      this.emit({ type: 'mine_hit', data: { row, col } });
      this.emit({ type: 'gameover' });
      return result;
    }

    if (result.success) {
      this.emit({ type: 'cell_opened', data: { cells: result.openedCells } });
      this.checkVictory();
    }

    return result;
  }

  handleRightClick(row: number, col: number): FlagResult {
    const noop: FlagResult = { success: false, newState: 'closed', remainingMines: this._board.remainingMines };

    if (this._state !== 'ready' && this._state !== 'playing') {
      return noop;
    }

    const result = this._board.toggleFlag(row, col);

    if (result.success) {
      this.emit({ type: 'flag_toggled', data: { row, col, newState: result.newState } });
    }

    return result;
  }

  handleChordClick(row: number, col: number): OpenResult {
    const noop: OpenResult = { success: false, openedCells: [], hitMine: false };

    if (this._state !== 'playing') {
      return noop;
    }

    const result = this._board.chordOpen(row, col);

    if (result.hitMine) {
      this._timer.stop();
      this._state = 'gameover';
      this.emit({ type: 'mine_hit', data: { row, col } });
      this.emit({ type: 'gameover' });
      return result;
    }

    if (result.success) {
      this.emit({ type: 'cell_opened', data: { cells: result.openedCells } });
      this.checkVictory();
    }

    return result;
  }

  // ── 내부 ──

  private checkVictory(): void {
    if (this._board.isVictory()) {
      this._timer.stop();
      this._state = 'victory';

      const scoreResult = this._score.calculate(this._difficulty, this._timer.getElapsed());
      this._lastScoreResult = scoreResult;
      this._score.saveBestScore(this._difficulty.name, scoreResult.totalScore);

      this.emit({ type: 'victory', data: { score: scoreResult } });
    }
  }
}
