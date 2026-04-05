/**
 * sys_board 단위테스트
 */

import { Board } from '../logic/Board';
import { Difficulty, RandomProvider } from '../logic/types';

// ── 테스트 헬퍼 ──

/** 순차적으로 값을 반환하는 가짜 RandomProvider */
function createSeqRandom(values: number[]): RandomProvider {
  let idx = 0;
  return {
    nextInt(max: number): number {
      const v = values[idx % values.length] % max;
      idx++;
      return v;
    },
  };
}

/** 항상 0을 반환 → 셔플 없음 (순서 유지) */
function createNoShuffleRandom(): RandomProvider {
  return { nextInt: (_max: number) => 0 };
}

const BEGINNER: Difficulty = { name: 'beginner', rows: 9, cols: 9, mines: 10 };
const SMALL: Difficulty = { name: 'small', rows: 5, cols: 5, mines: 3 };

// ── 테스트 ──

describe('Board', () => {
  describe('초기 상태', () => {
    test('모든 셀이 closed 상태로 시작', () => {
      const board = new Board(BEGINNER, createNoShuffleRandom());
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          expect(board.cells[r][c].state).toBe('closed');
          expect(board.cells[r][c].isMine).toBe(false);
        }
      }
    });

    test('generated는 false', () => {
      const board = new Board(BEGINNER, createNoShuffleRandom());
      expect(board.generated).toBe(false);
    });
  });

  describe('generate — 보드 생성', () => {
    test('첫 클릭 3×3 안전 영역에는 지뢰가 없다', () => {
      const board = new Board(BEGINNER, createNoShuffleRandom());
      board.generate(4, 4);
      expect(board.generated).toBe(true);

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          expect(board.cells[4 + dr][4 + dc].isMine).toBe(false);
        }
      }
    });

    test('정확히 mineCount개의 지뢰가 배치된다', () => {
      const board = new Board(BEGINNER, createNoShuffleRandom());
      board.generate(0, 0);

      let count = 0;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (board.cells[r][c].isMine) count++;
        }
      }
      expect(count).toBe(BEGINNER.mines);
    });

    test('adjacentMines가 올바르게 계산된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);

      // 모든 비지뢰 셀의 adjacentMines를 수동 검증
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (board.cells[r][c].isMine) continue;
          let expected = 0;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < board.rows && nc >= 0 && nc < board.cols) {
                if (board.cells[nr][nc].isMine) expected++;
              }
            }
          }
          expect(board.cells[r][c].adjacentMines).toBe(expected);
        }
      }
    });

    test('두 번 generate 해도 한 번만 실행된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      const snapshot = JSON.stringify(board.cells);
      board.generate(2, 2); // 무시됨
      expect(JSON.stringify(board.cells)).toBe(snapshot);
    });
  });

  describe('openCell — 셀 열기', () => {
    test('closed 비지뢰 셀을 열면 opened 상태가 된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);

      // 첫 클릭 안전영역 내 비지뢰 셀
      const result = board.openCell(0, 0);
      expect(result.success).toBe(true);
      expect(result.hitMine).toBe(false);
      expect(result.openedCells.length).toBeGreaterThan(0);
      expect(board.cells[0][0].state).toBe('opened');
    });

    test('flagged 셀 클릭은 무시된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      board.toggleFlag(0, 0);
      const result = board.openCell(0, 0);
      expect(result.success).toBe(false);
      expect(board.cells[0][0].state).toBe('flagged');
    });

    test('이미 opened 셀 클릭은 무시된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      board.openCell(0, 0);
      const result = board.openCell(0, 0);
      expect(result.success).toBe(false);
    });

    test('지뢰 셀 클릭 시 hitMine=true, exploded 상태', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);

      // 지뢰 위치 찾기
      let mineRow = -1, mineCol = -1;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (board.cells[r][c].isMine) {
            mineRow = r;
            mineCol = c;
            break;
          }
        }
        if (mineRow >= 0) break;
      }

      const result = board.openCell(mineRow, mineCol);
      expect(result.hitMine).toBe(true);
      expect(board.cells[mineRow][mineCol].state).toBe('exploded');
    });

    test('빈칸(adjacentMines==0) 연쇄 열기가 동작한다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);

      // 빈칸 셀 찾기
      let emptyRow = -1, emptyCol = -1;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (!board.cells[r][c].isMine && board.cells[r][c].adjacentMines === 0) {
            emptyRow = r;
            emptyCol = c;
            break;
          }
        }
        if (emptyRow >= 0) break;
      }

      if (emptyRow >= 0) {
        const result = board.openCell(emptyRow, emptyCol);
        expect(result.openedCells.length).toBeGreaterThan(1);
      }
    });

    test('범위 밖 좌표는 무시된다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      const result = board.openCell(-1, -1);
      expect(result.success).toBe(false);
    });
  });

  describe('toggleFlag — 깃발 토글', () => {
    test('closed → flagged 변환', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      const result = board.toggleFlag(0, 0);
      expect(result.success).toBe(true);
      expect(result.newState).toBe('flagged');
      expect(board.cells[0][0].state).toBe('flagged');
      expect(board.flagCount).toBe(1);
    });

    test('flagged → closed 변환', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.toggleFlag(0, 0);
      const result = board.toggleFlag(0, 0);
      expect(result.success).toBe(true);
      expect(result.newState).toBe('closed');
      expect(board.flagCount).toBe(0);
    });

    test('opened 셀에는 깃발을 놓을 수 없다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      board.openCell(0, 0);
      const result = board.toggleFlag(0, 0);
      expect(result.success).toBe(false);
    });

    test('remainingMines가 올바르게 감소한다', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      expect(board.remainingMines).toBe(SMALL.mines);
      board.toggleFlag(0, 0);
      expect(board.remainingMines).toBe(SMALL.mines - 1);
    });
  });

  describe('chordOpen — 코드 열기', () => {
    test('조건이 맞으면 인접 closed 셀이 열린다', () => {
      // 5x5, 지뢰 1개로 코드 열기 테스트
      const tiny: Difficulty = { name: 'tiny', rows: 5, cols: 5, mines: 1 };
      const board = new Board(tiny, createNoShuffleRandom());
      board.generate(0, 0);

      // 지뢰 위치와 인접한 숫자 셀 찾기
      let mineR = -1, mineC = -1;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (board.cells[r][c].isMine) { mineR = r; mineC = c; break; }
        }
        if (mineR >= 0) break;
      }

      // 지뢰에 깃발 설치
      board.toggleFlag(mineR, mineC);

      // 인접 숫자 셀 찾기
      let numR = -1, numC = -1;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = mineR + dr, c = mineC + dc;
          if (r >= 0 && r < board.rows && c >= 0 && c < board.cols) {
            if (!board.cells[r][c].isMine && board.cells[r][c].adjacentMines > 0) {
              numR = r; numC = c; break;
            }
          }
        }
        if (numR >= 0) break;
      }

      if (numR >= 0) {
        // 숫자 셀 먼저 열기
        board.openCell(numR, numC);
        expect(board.cells[numR][numC].state).toBe('opened');

        // 코드 열기 시도
        const result = board.chordOpen(numR, numC);
        // adjacentMines==1이고 깃발 1개이므로 성공해야 함
        expect(result.success).toBe(true);
        expect(result.hitMine).toBe(false);
      }
    });

    test('깃발 수가 맞지 않으면 실패한다', () => {
      const tiny: Difficulty = { name: 'tiny', rows: 5, cols: 5, mines: 1 };
      const board = new Board(tiny, createNoShuffleRandom());
      board.generate(0, 0);

      // 숫자 셀 찾아서 열기
      let numR = -1, numC = -1;
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (!board.cells[r][c].isMine && board.cells[r][c].adjacentMines > 0) {
            numR = r; numC = c; break;
          }
        }
        if (numR >= 0) break;
      }

      if (numR >= 0) {
        board.openCell(numR, numC);
        const result = board.chordOpen(numR, numC);
        expect(result.success).toBe(false); // 깃발 0개, 필요 1개
      }
    });
  });

  describe('isVictory — 승리 판정', () => {
    test('모든 비지뢰 셀이 열리면 승리', () => {
      const tiny: Difficulty = { name: 'tiny', rows: 3, cols: 3, mines: 1 };
      const board = new Board(tiny, createNoShuffleRandom());
      board.generate(0, 0);

      // 비지뢰 셀 모두 열기
      for (let r = 0; r < board.rows; r++) {
        for (let c = 0; c < board.cols; c++) {
          if (!board.cells[r][c].isMine) {
            board.openCell(r, c);
          }
        }
      }

      expect(board.isVictory()).toBe(true);
    });

    test('비지뢰 셀이 남아있으면 승리 아님', () => {
      const board = new Board(SMALL, createNoShuffleRandom());
      board.generate(0, 0);
      expect(board.isVictory()).toBe(false);
    });
  });
});
