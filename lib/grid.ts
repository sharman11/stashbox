export const MIN_COLS = 3;
export const MAX_COLS = 10;

export function suggestCols(days: number): number {
  if (days <= 5) return Math.max(MIN_COLS, days);
  if (days <= 10) return 5;
  if (days <= 30) return 6;
  if (days <= 60) return 7;
  if (days <= 100) return 8;
  return 10;
}

interface GridInput {
  goal: number;
  days: number;
  cols: number;
  notes: readonly number[];
}

export interface GeneratedCell {
  row: number;
  col: number;
  amount: number;
}

export interface GenerateGridResult {
  cells: GeneratedCell[];
  rows: number;
  cols: number;
  total: number;
}

export function generateGrid(input: GridInput): GenerateGridResult {
  const { goal, days, notes } = input;

  if (goal <= 0) throw new Error('Goal must be > 0');
  if (days <= 0) throw new Error('Days must be > 0');
  if (notes.length === 0) throw new Error('Notes required');

  const sorted = [...notes].sort((a, b) => a - b);
  const smallest = sorted[0];
  const largest = sorted[sorted.length - 1];

  if (goal < smallest * days) {
    throw new Error(`Goal ${goal} too small for ${days} days at minimum note ${smallest}`);
  }
  if (goal > largest * days) {
    throw new Error(`Goal ${goal} too large for ${days} days at maximum note ${largest}`);
  }

  const cols = Math.max(MIN_COLS, Math.min(MAX_COLS, input.cols));
  const rows = Math.ceil(days / cols);
  const totalCells = days;

  const amounts: number[] = new Array(totalCells).fill(smallest);
  let remaining = goal - smallest * totalCells;

  // Phase 1: randomly upgrade cells
  const maxIterations = totalCells * 150;
  let iteration = 0;

  while (remaining > 0 && iteration < maxIterations) {
    iteration++;
    const idx = Math.floor(Math.random() * totalCells);
    const current = amounts[idx];

    const upgrades = sorted.filter((n) => n > current && n - current <= remaining);
    if (upgrades.length === 0) continue;

    const next = upgrades[Math.floor(Math.random() * upgrades.length)];
    amounts[idx] = next;
    remaining -= next - current;
  }

  // Phase 2: greedy sweep for stragglers
  if (remaining > 0) {
    for (let i = 0; i < totalCells && remaining > 0; i++) {
      const current = amounts[i];
      for (let j = sorted.length - 1; j >= 0; j--) {
        const target = sorted[j];
        if (target > current && target - current <= remaining) {
          remaining -= target - current;
          amounts[i] = target;
          break;
        }
      }
    }
  }

  // Phase 3: absorb any fractional remainder into last cell
  if (remaining > 0) {
    amounts[totalCells - 1] += remaining;
    remaining = 0;
  }

  // Shuffle for variety
  for (let i = amounts.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [amounts[i], amounts[j]] = [amounts[j], amounts[i]];
  }

  const cells: GeneratedCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / cols);
    const col = i % cols;
    cells.push({ row, col, amount: amounts[i] });
  }

  const total = cells.reduce((sum, c) => sum + c.amount, 0);
  if (total !== goal) {
    throw new Error(`Grid generation failed: total ${total} !== goal ${goal}`);
  }

  return { cells, rows, cols, total };
}
