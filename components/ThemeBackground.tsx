import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import type { ThemeDecoration } from '@/lib/theme';

interface Item {
  emoji: string;
  left: number;
  top: number;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  baseOpacity: number;
}

/** Deterministic PRNG so positions don't jitter between re-renders. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function generateItems(decoration: ThemeDecoration, seed: number): Item[] {
  const rand = seeded(seed);
  return Array.from({ length: decoration.count }, (_, i) => {
    const emoji = decoration.emojis[i % decoration.emojis.length];
    return {
      emoji,
      left: rand() * 95, // percent
      top: rand() * 95,
      size: 16 + rand() * 22,
      rotation: rand() * 40 - 20,
      delay: Math.floor(rand() * 3000),
      duration: 2500 + Math.floor(rand() * 2500),
      baseOpacity: 0.35 + rand() * 0.35,
    };
  });
}

/**
 * Twinkle: opacity + scale pulse. Used for stars/sparkles.
 */
function TwinkleItem({ item }: { item: Item }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      item.delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: item.duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: item.duration, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      ),
    );
  }, [item.delay, item.duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: item.baseOpacity * (0.4 + progress.value * 0.6),
    transform: [
      { rotate: `${item.rotation}deg` },
      { scale: 0.85 + progress.value * 0.3 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${item.left}%`,
          top: `${item.top}%`,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: item.size }}>{item.emoji}</Text>
    </Animated.View>
  );
}

/**
 * Float: drifts upward and loops. Used for bubbles/fish.
 */
function FloatItem({ item }: { item: Item }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      item.delay,
      withRepeat(
        withTiming(1, {
          duration: item.duration * 2,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
      ),
    );
  }, [item.delay, item.duration, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: item.baseOpacity * (progress.value < 0.1
      ? progress.value * 10
      : progress.value > 0.9
        ? (1 - progress.value) * 10
        : 1),
    transform: [
      { translateY: -progress.value * 60 },
      { translateX: Math.sin(progress.value * Math.PI * 2) * 12 },
      { rotate: `${item.rotation}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: `${item.left}%`,
          top: `${item.top}%`,
        },
        style,
      ]}
    >
      <Text style={{ fontSize: item.size }}>{item.emoji}</Text>
    </Animated.View>
  );
}

interface Props {
  decoration: ThemeDecoration | undefined;
  /** Stable seed so positions stay consistent for the same moneybox. */
  seed?: number;
}

export function ThemeBackground({ decoration, seed = 42 }: Props) {
  const items = useMemo(
    () => (decoration ? generateItems(decoration, seed) : []),
    [decoration, seed],
  );

  if (!decoration) return null;

  const ItemComponent = decoration.animation === 'float' ? FloatItem : TwinkleItem;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {items.map((item, i) => (
        <ItemComponent key={i} item={item} />
      ))}
    </View>
  );
}
