import { View } from 'react-native';

import type { Cell } from '@/lib/types';

interface MiniGridProps {
  cells: Cell[];
  rows: number;
  cols: number;
  filledColor?: string;
  unfilledColor?: string;
  size?: number;
}

export function MiniGrid({
  cells,
  rows,
  cols,
  filledColor = '#1DB954',
  unfilledColor = '#E5E7EB',
  size = 80,
}: MiniGridProps) {
  const gap = 1.5;
  const dotSize = (size - gap * (cols - 1)) / cols;
  const actualHeight = dotSize * rows + gap * (rows - 1);

  const grid: (boolean | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );
  for (const cell of cells) {
    if (cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      grid[cell.row][cell.col] = cell.isFilled;
    }
  }

  return (
    <View style={{ width: size, height: actualHeight }}>
      {grid.map((row, rowIdx) => (
        <View key={rowIdx} style={{ flexDirection: 'row', gap, marginTop: rowIdx > 0 ? gap : 0 }}>
          {row.map((filled, colIdx) => (
            <View
              key={colIdx}
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize * 0.3,
                backgroundColor: filled === null ? 'transparent' : filled ? filledColor : unfilledColor,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
