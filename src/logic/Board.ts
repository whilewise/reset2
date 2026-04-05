/**
 * sys_board — 보드 생성/관리 시스템
 *
 * 책임:
 * - 2D 그리드 보드 생성 (첫 클릭 안전 보장)
 * - 셀 열기 (좌클릭) + 빈칸 연쇄(Flood Fill, BFS)
 * - 깃발 토글 (우클릭)
 * - 코드 열기 (양클릭/Chord)
 * - 승리 조건 판정
 *
 * 외부 의존: RandomProvider (생성자 주입)
 */

import {
  Cell,
  CellState,
  Difficulty,
  OpenResult,
  FlagResult,
  RandomProvider,
} from './types';

// 8방향 오프셋
const DIRECTIONS: readonly [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];

export class Board {
  readonly rows: number;
  readonly cols: number;
  readonly mineCount: number;

  private _cells: Cell[][] = [];
  private _generated = false;
  private _flagCount = 0;
  private _openedCount = 0;

  private readonly random: RandomProvider;

  constructor(difficulty: Difficulty, random: RandomProvider) {
    this.rows = difficulty.rows;
    this.cols = difficulty.cols;
    this.mineCount = difficulty.mines;
    this.random = random;
    this.initEmptyBoard();
  }

  // ── 접근자 ──

  get cells(): ReadonlyArray<ReadonlyArray<Cell>> {
    return this._cells;
  }

  get generated(): boolean {
    return this._generated;
  }

  get flagCount(): number {
    return this._flagCount;
  }

  get remainingMines(): number {
    return this.mineCount - this._flagCount;
  }

  get openedCount(): number {
    return this._openedCount;
  }

  // ── 보드 생성 ──

  /** 첫 클릭 위치를 기준으로 보드를 생성한다. 첫 클릭 3×3 영역에는 지뢰를 배치하지 않는다. */
  generate(firstClickRow: number, firstClickCol: number): void {
    if (this._generated) return;

    // 안전 영역 집합 (첫 클릭 + 8방향)
    const safeSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const r = firstClickRow + dr;
        const c = firstClickCol + dc;
        if (this.inBounds(r, c)) {
          safeSet.add(`${r},${c}`);
        }
      }
    }

    // 배치 가능 위치 수집
    const candidates: [number, number][] = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (!safeSet.has(`${r},${c}`)) {
          candidates.push([r, c]);
        }
      }
    }

    // Fisher-Yates 셔플 후 앞에서 mineCount개 선택
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = this.random.nextInt(i + 1);
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let i = 0; i < this.mineCount; i++) {
      const [r, c] = candidates[i];
      this._cells[r][c].isMine = true;
    }

    // adjacentMines 계산
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this._cells[r][c].isMine) continue;
        let count = 0;
        for (const [dr, dc] of DIRECTIONS) {
          const nr = r + dr;
          const nc = c + dc;
          if (this.inBounds(nr, nc) && this._cells[nr][nc].isMine) {
            count++;
          }
        }
        this._cells[r][c].adjacentMines = count;
      }
    }

    this._generated = true;
  }

  // ── 셀 열기 (좌클릭) ──

  openCell(row: number, col: number): OpenResult {
    if (!this.inBounds(row, col)) {
      return { success: false, openedCells: [], hitMine: false };
    }

    const cell = this._cells[row][col];

    // flagged, opened 셀은 무시
    if (cell.state === 'flagged' || cell.state === 'opened') {
      return { success: false, openedCells: [], hitMine: false };
    }

    // 지뢰 밟음
    if (cell.isMine) {
      cell.state = 'exploded';
      this.revealAllMines();
      return { success: true, openedCells: [{ row, col }], hitMine: true };
    }

    // 일반 셀 열기 (BFS flood fill)
    const opened = this.floodFill(row, col);
    return { success: true, openedCells: opened, hitMine: false };
  }

  // ── 깃발 토글 (우클릭) ──

  toggleFlag(row: number, col: number): FlagResult {
    if (!this.inBounds(row, col)) {
      return { success: false, newState: 'closed', remainingMines: this.remainingMines };
    }

    const cell = this._cells[row][col];

    if (cell.state === 'opened') {
      return { success: false, newState: 'closed', remainingMines: this.remainingMines };
    }

    if (cell.state === 'flagged') {
      cell.state = 'closed';
      this._flagCount--;
      return { success: true, newState: 'closed', remainingMines: this.remainingMines };
    }

    // closed → flagged
    cell.state = 'flagged';
    this._flagCount++;
    return { success: true, newState: 'flagged', remainingMines: this.remainingMines };
  }

  // ── 코드 열기 (양클릭 / Chord) ──

  chordOpen(row: number, col: number): OpenResult {
    if (!this.inBounds(row, col)) {
      return { success: false, openedCells: [], hitMine: false };
    }

    const cell = this._cells[row][col];

    // opened + adjacentMines > 0 인 셀에서만 가능
    if (cell.state !== 'opened' || cell.adjacentMines === 0) {
      return { success: false, openedCells: [], hitMine: false };
    }

    // 인접 깃발 수 확인
    let adjacentFlags = 0;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (this.inBounds(nr, nc) && this._cells[nr][nc].state === 'flagged') {
        adjacentFlags++;
      }
    }

    if (adjacentFlags !== cell.adjacentMines) {
      return { success: false, openedCells: [], hitMine: false };
    }

    // 인접 closed 셀 모두 열기
    const allOpened: { row: number; col: number }[] = [];
    let hitMine = false;

    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr;
      const nc = col + dc;
      if (!this.inBounds(nr, nc)) continue;
      const neighbor = this._cells[nr][nc];
      if (neighbor.state !== 'closed') continue;

      if (neighbor.isMine) {
        neighbor.state = 'exploded';
        hitMine = true;
        allOpened.push({ row: nr, col: nc });
      } else {
        const opened = this.floodFill(nr, nc);
        allOpened.push(...opened);
      }
    }

    if (hitMine) {
      this.revealAllMines();
    }

    return { success: allOpened.length > 0 || hitMine, openedCells: allOpened, hitMine };
  }

  // ── 승리 판정 ──

  isVictory(): boolean {
    return this._openedCount === this.rows * this.cols - this.mineCount;
  }

  // ── 내부 헬퍼 ──

  private initEmptyBoard(): void {
    this._cells = [];
    this._flagCount = 0;
    this._openedCount = 0;
    for (let r = 0; r < this.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < this.cols; c++) {
        row.push({ isMine: false, adjacentMines: 0, state: 'closed' });
      }
      this._cells.push(row);
    }
  }

  private inBounds(row: number, col: number): boolean {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  /** BFS 기반 Flood Fill — adjacentMines==0 이면 인접 셀까지 연쇄 열기 */
  private floodFill(startRow: number, startCol: number): { row: number; col: number }[] {
    const opened: { row: number; col: number }[] = [];
    const queue: [number, number][] = [[startRow, startCol]];

    const cell = this._cells[startRow][startCol];
    if (cell.state !== 'closed') return opened;

    cell.state = 'opened';
    this._openedCount++;
    opened.push({ row: startRow, col: startCol });

    // adjacentMines > 0 이면 숫자만 표시하고 멈춤
    if (cell.adjacentMines > 0) return opened;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      for (const [dr, dc] of DIRECTIONS) {
        const nr = r + dr;
        const nc = c + dc;
        if (!this.inBounds(nr, nc)) continue;
        const neighbor = this._cells[nr][nc];
        if (neighbor.state !== 'closed' || neighbor.isMine) continue;

        neighbor.state = 'opened';
        this._openedCount++;
        opened.push({ row: nr, col: nc });

        if (neighbor.adjacentMines === 0) {
          queue.push([nr, nc]);
        }
      }
    }

    return opened;
  }

  /** 게임 오버 시 모든 지뢰를 공개하고, 잘못 꽂힌 깃발을 표시한다 */
  private revealAllMines(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const cell = this._cells[r][c];
        if (cell.isMine && cell.state === 'closed') {
          cell.state = 'opened';
        }
        // 잘못 꽂힌 깃발은 그대로 두되, isMine이 false인 flagged 셀은 UI에서 wrong_flag으로 표시
        // 로직 레이어에서는 상태만 유지 (렌더링은 UI 담당)
      }
    }
  }
}
