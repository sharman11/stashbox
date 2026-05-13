import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
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
  /** Id of the cell eligible for single-level undo; if set, tapping that
   *  filled cell re-fires `onTap`. All other filled cells stay inert. */
  undoableCellId?: string | null;
}

interface GridCellProps {
  cell: Cell;
  size: number;
  theme: ThemePalette;
  hapticsEnabled: boolean;
  onTap: (cell: Cell) => void;
  undoable: boolean;
}

/**
 * Full-on treasure unlock animation:
 *  - Two shine sweeps (white then gold-tinted, staggered)
 *  - Radial sparkle burst - 6 particles flying outward + fading
 *  - Outer glow halo that blooms and dissolves
 *  - Inner flash on the cell face (brief brightness peak)
 * All gated behind a `shining` state flag so the effect only mounts while
 * animating - no idle cost when grid is full of already-filled cells.
 */
function GridCell({ cell, size, theme, hapticsEnabled, onTap, undoable }: GridCellProps) {
  const wasFilled = useRef(cell.isFilled);
  const [shining, setShining] = useState(false);

  // Primary shine (white)
  const shine1 = useSharedValue(0);
  // Secondary shine (gold tint), staggered
  const shine2 = useSharedValue(0);
  // Sparkle burst progress
  const sparkle = useSharedValue(0);

  useEffect(() => {
    if (cell.isFilled && !wasFilled.current) {
      setShining(true);
      shine1.value = 0;
      shine2.value = 0;
      sparkle.value = 0;

      // White shine sweeps first
      shine1.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
      // Gold shine trails slightly behind, a bit slower
      shine2.value = withDelay(
        150,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) }),
      );
      // Sparkles radiate outward
      sparkle.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.quad) });

      const t = setTimeout(() => setShining(false), 950);
      wasFilled.current = cell.isFilled;
      return () => clearTimeout(t);
    }
    wasFilled.current = cell.isFilled;
  }, [cell.isFilled, shine1, shine2, sparkle]);

  // Shine sweep #1 (bright white, steeper angle)
  const shineStyle1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: (shine1.value * 2 - 0.5) * size },
      { rotate: '18deg' },
    ],
  }));

  // Shine sweep #2 (gold, opposite-ish angle)
  const shineStyle2 = useAnimatedStyle(() => ({
    transform: [
      { translateX: (shine2.value * 2 - 0.5) * size },
      { rotate: '-12deg' },
    ],
    opacity: shine2.value < 0.1 || shine2.value > 0.95 ? 0 : 1,
  }));

  const pressable = !cell.isFilled || undoable;
  const handlePress = useCallback(() => {
    if (!pressable) return;
    if (hapticsEnabled) {
      Haptics.impactAsync(
        cell.isFilled ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium,
      );
    }
    onTap(cell);
  }, [cell, hapticsEnabled, onTap, pressable]);

  const fontSize = Math.max(8, size * 0.26);
  const radius = size * (theme.cellRadius ?? 0.22);

  // Pre-compute sparkle burst - 14 particles with varied shapes, sizes, colors,
  // distances, and delays for a richer treasure-chest feel.
  const sparkleConfigs = useMemo(() => {
    const palette = [theme.accent, '#FDE047', '#FFFFFF', '#FCD34D'];
    // Base angles spread around the full circle, slightly jittered per run.
    return Array.from({ length: 14 }, (_, i) => {
      const angle = (i / 14) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.18);
      const distanceMultiplier = 0.55 + (i % 3) * 0.22; // 0.55 / 0.77 / 0.99
      const delay = (i % 4) * 40; // 0 / 40 / 80 / 120 ms
      const particleSize = i % 3 === 0 ? 6 : i % 3 === 1 ? 4 : 3;
      const color = palette[i % palette.length];
      const isStar = i % 4 === 0;
      return {
        key: `spk-${i}`,
        offset: { x: Math.cos(angle), y: Math.sin(angle) },
        distanceMultiplier,
        delay,
        particleSize,
        color,
        isStar,
      };
    });
  }, [theme.accent]);

  return (
    <View style={{ position: 'relative' }}>
      <Pressable onPress={handlePress} disabled={!pressable}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: cell.isFilled ? theme.cellFilled : theme.cellDefault,
            overflow: 'hidden',
          }}
        >
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            allowFontScaling={false}
            style={{
              color: cell.isFilled ? theme.cellTextFilled : theme.cellText,
              fontSize,
              fontFamily: 'DMSans_600SemiBold',
              paddingHorizontal: 2,
            }}
          >
            {cell.amount}
          </Text>

          {shining && (
            <>
              {/* Shine sweep #1 - bright white, steeper */}
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: -size * 0.5,
                    bottom: -size * 0.5,
                    left: 0,
                    width: size * 0.35,
                  },
                  shineStyle1,
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(255,255,255,0)',
                    'rgba(255,255,255,0.9)',
                    'rgba(255,255,255,0)',
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>

              {/* Shine sweep #2 - gold-tinted, trailing, counter angle */}
              <Animated.View
                pointerEvents="none"
                style={[
                  {
                    position: 'absolute',
                    top: -size * 0.5,
                    bottom: -size * 0.5,
                    left: 0,
                    width: size * 0.25,
                  },
                  shineStyle2,
                ]}
              >
                <LinearGradient
                  colors={[
                    'rgba(253, 224, 71, 0)',
                    'rgba(253, 224, 71, 0.75)',
                    'rgba(253, 224, 71, 0)',
                  ]}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{ flex: 1 }}
                />
              </Animated.View>
            </>
          )}
        </View>
      </Pressable>

      {/* Sparkle burst - 6 particles radiating outward, sit above cell */}
      {shining && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {sparkleConfigs.map((s) => (
            <SparkleParticle
              key={s.key}
              offset={s.offset}
              progress={sparkle}
              size={size}
              color={s.color}
              particleSize={s.particleSize}
              distanceMultiplier={s.distanceMultiplier}
              delay={s.delay}
              isStar={s.isStar}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function SparkleParticle({
  offset,
  progress,
  size,
  color,
  particleSize,
  distanceMultiplier,
  delay,
  isStar,
}: {
  offset: { x: number; y: number };
  progress: { value: number };
  size: number;
  color: string;
  particleSize: number;
  distanceMultiplier: number;
  delay: number;
  isStar: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Offset the global progress by this particle's delay (as a fraction).
    // The total animation runs 850ms, so delay/850 is how far the progress
    // must travel before THIS particle starts.
    const startAt = delay / 850;
    const raw = progress.value;
    const t = raw < startAt ? 0 : Math.min(1, (raw - startAt) / (1 - startAt));

    const distance = t * size * distanceMultiplier;
    // Quick pop in (0 → 0.15), slow fade out (0.15 → 1)
    const intensity = t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85;

    return {
      opacity: Math.max(0, intensity),
      transform: [
        { translateX: offset.x * distance },
        { translateY: offset.y * distance },
        { scale: 0.3 + t * 1.1 },
        { rotate: `${t * 180 * (isStar ? 1 : 0)}deg` },
      ],
    };
  });

  if (isStar) {
    return (
      <Animated.View
        style={[
          { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
          style,
        ]}
      >
        <Text style={{ fontSize: particleSize + 4, color }}>✦</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: particleSize,
          height: particleSize,
          borderRadius: particleSize / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

export function MoneyboxGrid({ cells, rows, cols, theme, hapticsEnabled, onTap, onRowComplete, undoableCellId }: MoneyboxGridProps) {
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

  // Track completed rows for celebration callback
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
              return (
                <GridCell
                  key={cell.id}
                  cell={cell}
                  size={cellSize}
                  theme={theme}
                  hapticsEnabled={hapticsEnabled}
                  onTap={onTap}
                  undoable={cell.id === undoableCellId}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
