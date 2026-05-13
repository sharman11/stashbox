import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Stashbox cold-boot splash animation.
 *
 * Phases:
 *  1. Cells assemble — 16-cell moneybox grid pops in one-by-one in reading
 *     order (50ms stagger), each spring-scaling 0→1 with a tiny overshoot.
 *  2. Wordmark — letters of "Stashbox" fade up with their own stagger after
 *     the last cell lands.
 *  3. Idle pulse — once the assemble finishes, the whole composition does a
 *     gentle ±3% breathing loop until `exit` flips.
 *  4. Exit — fade out + scale up; calls `onExitComplete` when done so the
 *     parent can swap to the real Stack.
 *
 * The grid pattern matches stashbox-splash.svg (stair-step fill, 10 filled /
 * 6 empty), so the splash visually previews the core mechanic — filling cells.
 */

const CELL_SIZE = 28;
const CELL_GAP = 6;
const CELL_STAGGER_MS = 50;
const TOTAL_CELLS = 16;
const ASSEMBLE_DURATION_MS = TOTAL_CELLS * CELL_STAGGER_MS + 400;

const FILLED: readonly boolean[] = [
  true, true, true, true,
  true, true, true, false,
  true, true, false, false,
  true, false, false, false,
];

const WORDMARK = 'Stashbox';
const LETTER_STAGGER_MS = 40;
const LETTER_START_DELAY_MS = TOTAL_CELLS * CELL_STAGGER_MS + 80;

interface SplashAnimationProps {
  /** Flip to true when the app is ready — triggers the exit animation. */
  exit: boolean;
  /** Fires after the exit animation completes. Parent should unmount the
   *  splash here. */
  onExitComplete?: () => void;
  /** When set, the cell/wordmark animation is skipped and the message renders
   *  in its place. */
  error?: string | null;
  /** Optional retry handler. When provided alongside `error`, a Try again
   *  button renders below the message so the user isn't stuck on a dead
   *  splash. */
  onRetry?: () => void;
}

export function SplashAnimation({ exit, onExitComplete, error, onRetry }: SplashAnimationProps) {
  const containerScale = useSharedValue(1);
  const containerOpacity = useSharedValue(1);

  // Idle pulse kicks in after assemble completes. -1 = repeat forever, true
  // arg makes the timing reverse so 1 → 1.03 → 1 reads as one heartbeat.
  useEffect(() => {
    const id = setTimeout(() => {
      containerScale.value = withRepeat(
        withTiming(1.03, { duration: 1300, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
    }, ASSEMBLE_DURATION_MS);
    return () => clearTimeout(id);
  }, [containerScale]);

  // Exit. Cancel the pulse, fade out, and notify parent.
  useEffect(() => {
    if (!exit) return;
    containerScale.value = withTiming(1.1, { duration: 280, easing: Easing.in(Easing.cubic) });
    containerOpacity.value = withTiming(0, { duration: 280, easing: Easing.in(Easing.cubic) }, (finished) => {
      if (finished && onExitComplete) runOnJS(onExitComplete)();
    });
  }, [exit, containerScale, containerOpacity, onExitComplete]);

  // Inner content (cells + wordmark) — scale + opacity for the assemble pulse
  // and exit zoom-out.
  const innerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: containerScale.value }],
    opacity: containerOpacity.value,
  }));

  // Outer gradient — fades to 0 on exit so the underlying Stack reveals.
  const outerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View
      pointerEvents={exit ? 'none' : 'auto'}
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        },
        outerStyle,
      ]}
    >
    <LinearGradient
      colors={['#0B3D2E', '#145A42', '#1E7A5C']}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {error ? (
        <View style={{ alignItems: 'center', paddingHorizontal: 32 }}>
          <Text
            numberOfLines={6}
            style={{
              textAlign: 'center',
              color: '#FCA5A5',
              fontSize: 14,
              lineHeight: 20,
            }}
          >
            {error}
          </Text>
          {onRetry && (
            <Pressable
              onPress={onRetry}
              style={{
                marginTop: 20,
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 12,
                backgroundColor: 'rgba(255,255,255,0.18)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.32)',
              }}
            >
              <Text
                allowFontScaling={false}
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: '#FFFFFF',
                  letterSpacing: 0.4,
                }}
              >
                Try again
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <Animated.View style={[{ alignItems: 'center' }, innerStyle]}>
          {/* 4x4 grid */}
          <View
            style={{
              width: CELL_SIZE * 4 + CELL_GAP * 3,
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: CELL_GAP,
            }}
          >
            {FILLED.map((isFilled, i) => (
              <AnimatedCell key={i} index={i} filled={isFilled} />
            ))}
          </View>

          {/* Wordmark */}
          <View style={{ flexDirection: 'row', marginTop: 26 }}>
            {WORDMARK.split('').map((char, i) => (
              <AnimatedLetter key={i} char={char} index={i} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* From Optruvian — anchored bottom, fades in late so it doesn't
       *  compete with the cells assembling above. */}
      <FadeInFooter />
    </LinearGradient>
    </Animated.View>
  );
}

interface CellProps {
  index: number;
  filled: boolean;
}

function AnimatedCell({ index, filled }: CellProps) {
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    const delay = index * CELL_STAGGER_MS;
    // Spring with mild overshoot — feels like a coin clinking into place.
    scale.value = withDelay(delay, withSpring(1, { damping: 9, stiffness: 160, mass: 0.6 }));
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
  }, [index, scale, opacity]);

  const cellStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: CELL_SIZE,
          height: CELL_SIZE,
          borderRadius: CELL_SIZE * 0.26,
          backgroundColor: filled ? '#1DB954' : 'rgba(255,255,255,0)',
          borderWidth: filled ? 0 : 1.5,
          borderColor: 'rgba(255,255,255,0.32)',
        },
        cellStyle,
      ]}
    />
  );
}

interface LetterProps {
  char: string;
  index: number;
}

function AnimatedLetter({ char, index }: LetterProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(10);

  useEffect(() => {
    const delay = LETTER_START_DELAY_MS + index * LETTER_STAGGER_MS;
    opacity.value = withDelay(delay, withTiming(1, { duration: 220 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 14, stiffness: 220, mass: 0.7 }));
  }, [index, opacity, translateY]);

  const letterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.Text
      style={[
        {
          fontFamily: 'DMSans_700Bold',
          fontSize: 30,
          color: '#FFFFFF',
          letterSpacing: -0.5,
        },
        letterStyle,
      ]}
    >
      {char}
    </Animated.Text>
  );
}

function FadeInFooter() {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      LETTER_START_DELAY_MS + WORDMARK.length * LETTER_STAGGER_MS + 200,
      withTiming(1, { duration: 600 }),
    );
  }, [opacity]);

  const footerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          bottom: 40,
          alignItems: 'center',
          gap: 2,
        },
        footerStyle,
      ]}
    >
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 10,
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: 1,
        }}
      >
        FROM
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 13,
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: 0.5,
        }}
      >
        Optruvian
      </Text>
    </Animated.View>
  );
}
