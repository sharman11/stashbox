import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

interface Props {
  /** 0 to 1 */
  progress: number;
  /** Primary fill color (theme.accent) */
  color: string;
  /** Lighter end-of-gradient color (lightens the fill) */
  colorHighlight?: string;
  /** Color used when fully complete (theme.success) */
  completeColor?: string;
  isComplete?: boolean;
  /** Height of the bar */
  height?: number;
  /** Whether to show the shine sweep animation (default true) */
  shine?: boolean;
}

/**
 * Chunky, animated progress bar with:
 *  - Gradient fill (dark → bright → white-ish highlight)
 *  - Smooth width animation on value change
 *  - Top-half glossy highlight for a "liquid pill" feel
 *  - Moving shine sweep across the filled portion (like water refilling)
 *  - Pill-shaped
 */
export function ProgressBar({
  progress,
  color,
  colorHighlight,
  completeColor,
  isComplete,
  height = 14,
  shine = true,
}: Props) {
  const width = useSharedValue(0);
  const shinePos = useSharedValue(-1);

  useEffect(() => {
    width.value = withTiming(Math.min(1, Math.max(0, progress)), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress, width]);

  useEffect(() => {
    if (!shine) return;
    shinePos.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 2200, easing: Easing.inOut(Easing.ease) }),
        withTiming(-0.3, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [shine, shinePos]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%`,
  }));

  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: `${shinePos.value * 100}%` }],
  }));

  const effectiveColor = isComplete && completeColor ? completeColor : color;
  // Bright, saturated version of the accent - must stand out clearly against
  // both the semi-transparent white track AND the hero gradient behind it.
  const fillStart = lightenHex(effectiveColor, 0.15);
  const fillEnd = lightenHex(effectiveColor, 0.35);

  return (
    <View
      style={{
        height,
        borderRadius: height / 2,
        backgroundColor: 'rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}
    >
      {/* Inner track shadow for depth */}
      <View
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: height / 2,
          borderWidth: 1,
          borderColor: 'rgba(0,0,0,0.08)',
        }}
        pointerEvents="none"
      />

      {/* Animated fill */}
      <Animated.View
        style={[
          {
            height: '100%',
            borderRadius: height / 2,
            overflow: 'hidden',
          },
          fillStyle,
        ]}
      >
        {/* Bright gradient fill - lightened accent for high contrast */}
        <LinearGradient
          colors={[fillStart, fillEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1 }}
        />

        {/* Shine sweep - moves left-to-right continuously */}
        {shine && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '25%',
              },
              shineStyle,
            ]}
            pointerEvents="none"
          >
            <LinearGradient
              colors={[
                'rgba(255,255,255,0)',
                'rgba(255,255,255,0.45)',
                'rgba(255,255,255,0)',
              ]}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        )}
      </Animated.View>
    </View>
  );
}

/** Quick hex lightener for gradient highlight end. */
function lightenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.min(255, Math.round(c + (255 - c) * amount));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}

/** Quick hex darkener for gradient dark-side start. */
function darkenHex(hex: string, amount: number): string {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const mix = (c: number) => Math.max(0, Math.round(c * (1 - amount)));
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`;
}
