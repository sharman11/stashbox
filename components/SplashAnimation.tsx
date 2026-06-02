import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

/**
 * Stashbox cold-boot splash animation.
 *
 * Phases:
 *  1. Cheek fill — the squirrel mascot fills its cheeks from empty to
 *     bursting by playing through the 5 sequence frames once, then holding on
 *     the final bursting frame.
 *  2. Wordmark — letters of "Stashbox" fade up with a stagger once the first
 *     fill pass completes.
 *  3. Idle pulse — the whole composition does a gentle ±3% breathing loop.
 *  4. Exit — fade out + scale up; calls `onExitComplete` when done so the
 *     parent can swap to the real Stack.
 *
 * The 5 frames live in assets/sequence/. Frame 1 = flat cheeks (empty),
 * frame 5 = bursting cheeks (full) — the core "fill it up" metaphor.
 */

// All 5 frames are stacked and toggled by opacity so there is no decode
// flicker mid-animation. Order is the cheek-fill progression: empty -> full.
const SQUIRREL_FRAMES = [
  require('../assets/sequence/Image 1.webp'),
  require('../assets/sequence/Image 2.webp'),
  require('../assets/sequence/Image 3.webp'),
  require('../assets/sequence/Image 4.webp'),
  require('../assets/sequence/Image 5.webp'),
];

const FRAME_COUNT = SQUIRREL_FRAMES.length;
const FRAME_MS = 150;
const SQUIRREL_SIZE = 120;

// One full fill pass (frame 1 -> 5) before the wordmark appears.
const FILL_PASS_MS = FRAME_COUNT * FRAME_MS;

const WORDMARK = 'Stashbox';
const LETTER_STAGGER_MS = 40;
const LETTER_START_DELAY_MS = FILL_PASS_MS + 120;
const ASSEMBLE_DURATION_MS = LETTER_START_DELAY_MS + WORDMARK.length * LETTER_STAGGER_MS;

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

  // Idle pulse kicks in after the first fill pass + wordmark land. -1 = repeat
  // forever, true arg reverses the timing so 1 → 1.03 → 1 reads as a heartbeat.
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

  // Inner content (squirrel + wordmark) — scale + opacity for the assemble
  // pulse and exit zoom-out.
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
          {/* Squirrel mascot — cheeks fill from empty to bursting */}
          <SquirrelFill paused={exit} />

          {/* Wordmark */}
          <View style={{ flexDirection: 'row', marginTop: 14 }}>
            {WORDMARK.split('').map((char, i) => (
              <AnimatedLetter key={i} char={char} index={i} />
            ))}
          </View>
        </Animated.View>
      )}

      {/* From Optruvian — anchored bottom, fades in late so it doesn't
       *  compete with the squirrel animating above. */}
      <FadeInFooter />
    </LinearGradient>
    </Animated.View>
  );
}

interface SquirrelFillProps {
  /** When true the frame cycle stops (used during exit). */
  paused: boolean;
}

/**
 * Plays the 5 cheek-fill frames once (empty -> bursting), then holds on the
 * final frame. All frames are mounted and stacked; only the active one is
 * opaque, so there is zero decode flicker.
 */
function SquirrelFill({ paused }: SquirrelFillProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (paused) return;
    let index = 0;
    const id = setInterval(() => {
      index += 1;
      setFrame(index);
      // Stop once the bursting frame is reached — no loop, hold on full.
      if (index >= FRAME_COUNT - 1) clearInterval(id);
    }, FRAME_MS);
    return () => clearInterval(id);
  }, [paused]);

  return (
    <View style={{ width: SQUIRREL_SIZE, height: SQUIRREL_SIZE }}>
      {SQUIRREL_FRAMES.map((src, i) => (
        <Image
          key={i}
          source={src}
          resizeMode="contain"
          fadeDuration={0}
          style={{
            position: 'absolute',
            width: SQUIRREL_SIZE,
            height: SQUIRREL_SIZE,
            opacity: i === frame ? 1 : 0,
          }}
        />
      ))}
    </View>
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
          fontSize: 20,
          color: '#FFFFFF',
          letterSpacing: -0.3,
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
