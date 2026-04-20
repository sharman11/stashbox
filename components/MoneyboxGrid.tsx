import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

import type { ThemePalette } from '@/lib/theme';
import type { Cell } from '@/lib/types';

interface MoneyboxGridProps {
  cells: Cell[];
  rows: number;
  cols: number;
  theme: ThemePalette;
  hapticsEnabled: boolean;
  onTap: (cell: Cell) => void;
  onRowComplete?: (rowIdx: number) => void;
}

interface GridCellProps {
  cell: Cell;
  size: number;
  theme: ThemePalette;
  hapticsEnabled: boolean;
  entranceDelay: number;
  onTap: (cell: Cell) => void;
}

function Sparkles({ size, color, visible }: { size: number; color: string; visible: boolean }) {
  if (!visible) return null;
  const dots = [
    { x: -size * 0.4, y: -size * 0.4 },
    { x: size * 0.4, y: -size * 0.3 },
    { x: -size * 0.3, y: size * 0.4 },
    { x: size * 0.35, y: size * 0.35 },
    { x: 0, y: -size * 0.5 },
    { x: -size * 0.5, y: 0 },
  ];
  return (
    <>
      {dots.map((d, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 30).duration(150)}
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: color,
            left: size / 2 + d.x - 2,
            top: size / 2 + d.y - 2,
            opacity: 0.7,
          }}
        />
      ))}
    </>
  );
}

function GridCell({ cell, size, theme, hapticsEnabled, entranceDelay, onTap }: GridCellProps) {
  const scale = useSharedValue(1);
  const wasFilled = useRef(cell.isFilled);
  const [showSparkle, setShowSparkle] = useState(false);

  useEffect(() => {
    if (cell.isFilled && !wasFilled.current) {
      scale.value = withSequence(
        withSpring(0.85, { damping: 8, stiffness: 400 }),
        withSpring(1.12, { damping: 6, stiffness: 300 }),
        withSpring(1, { damping: 10, stiffness: 200 })
      );
      setShowSparkle(true);
      setTimeout(() => setShowSparkle(false), 500);
    }
    wasFilled.current = cell.isFilled;
  }, [cell.isFilled, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    if (cell.isFilled) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onTap(cell);
  }, [cell, hapticsEnabled, onTap]);

  const fontSize = Math.max(8, size * 0.26);

  return (
    <Animated.View entering={FadeIn.delay(entranceDelay).duration(200)} style={{ position: 'relative' }}>
      <Pressable onPress={handlePress} disabled={cell.isFilled}>
        <Animated.View
          style={[
            animatedStyle,
            {
              width: size,
              height: size,
              borderRadius: size * 0.22,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: cell.isFilled ? theme.cellFilled : theme.cellDefault,
            },
          ]}
        >
          <Text
            style={{
              color: cell.isFilled ? theme.cellTextFilled : theme.cellText,
              fontSize,
              fontFamily: 'Inter_600SemiBold',
            }}
          >
            {cell.amount}
          </Text>
        </Animated.View>
      </Pressable>
      <Sparkles size={size} color={theme.accent} visible={showSparkle} />
    </Animated.View>
  );
}

export function MoneyboxGrid({ cells, rows, cols, theme, hapticsEnabled, onTap, onRowComplete }: MoneyboxGridProps) {
  const { width } = useWindowDimensions();
  const horizontalPadding = 48;
  const gap = 6;
  const available = width - horizontalPadding;
  const cellSize = Math.max(28, (available - gap * (cols - 1)) / cols);

  const grid: (Cell | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  );
  for (const cell of cells) {
    if (cell.row >= 0 && cell.row < rows && cell.col >= 0 && cell.col < cols) {
      grid[cell.row][cell.col] = cell;
    }
  }

  // Track completed rows for celebration
  const completedRows = useRef(new Set<number>());
  useEffect(() => {
    grid.forEach((row, rowIdx) => {
      const rowCells = row.filter((c): c is Cell => c !== null);
      if (rowCells.length > 0 && rowCells.every((c) => c.isFilled)) {
        if (!completedRows.current.has(rowIdx)) {
          completedRows.current.add(rowIdx);
          onRowComplete?.(rowIdx);
        }
      }
    });
  }, [cells]);

  return (
    <View
      style={{
        backgroundColor: theme.surface,
        borderRadius: 20,
        padding: 14,
        shadowColor: theme.shadowColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      <View style={{ alignItems: 'center', gap }}>
        {grid.map((row, rowIdx) => (
          <View key={rowIdx} style={{ flexDirection: 'row', gap }}>
            {row.map((cell, colIdx) => {
              if (!cell) {
                return <View key={`empty-${rowIdx}-${colIdx}`} style={{ width: cellSize, height: cellSize }} />;
              }
              const entranceDelay = Math.min((rowIdx * cols + colIdx) * 15, 1500);
              return (
                <GridCell
                  key={cell.id}
                  cell={cell}
                  size={cellSize}
                  theme={theme}
                  hapticsEnabled={hapticsEnabled}
                  entranceDelay={entranceDelay}
                  onTap={onTap}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
