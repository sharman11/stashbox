import * as Haptics from 'expo-haptics';
import { type ReactNode } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface SpringPressableProps {
  onPress: () => void;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  haptic?: boolean;
  scaleDown?: number;
  /** Extends the tap area beyond the view bounds (all sides). */
  hitSlop?: number;
  /** Screen-reader label; also marks the view as a button. */
  accessibilityLabel?: string;
}

const SPRING_CONFIG = { damping: 15, stiffness: 400, mass: 0.8 };

export function SpringPressable({
  onPress,
  children,
  style,
  disabled = false,
  haptic = false,
  scaleDown = 0.97,
  hitSlop,
  accessibilityLabel,
}: SpringPressableProps) {
  const scale = useSharedValue(1);

  const doPress = () => {
    if (haptic) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onBegin(() => {
      scale.value = withSpring(scaleDown, SPRING_CONFIG);
    })
    .onFinalize((_, success) => {
      scale.value = withSpring(1, SPRING_CONFIG);
      if (success) runOnJS(doPress)();
    });
  if (hitSlop !== undefined) tap.hitSlop(hitSlop);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={tap}>
      <Animated.View
        style={[style, animatedStyle, disabled && { opacity: 0.5 }]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityLabel ? 'button' : undefined}
        accessibilityState={accessibilityLabel ? { disabled } : undefined}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
}
