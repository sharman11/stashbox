import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import ConfettiCannon from 'react-native-confetti-cannon';

import { useAppTheme } from '@/lib/stores/theme';

type SmallMilestone = 25 | 50 | 75;

interface MilestoneToastProps {
  milestone: SmallMilestone | null;
  onDismiss: () => void;
  hapticsEnabled?: boolean;
}

const CONTENT: Record<SmallMilestone, { emoji: string; title: string }> = {
  25: { emoji: '🌱', title: 'Quarter way!' },
  50: { emoji: '🔥', title: 'Halfway there!' },
  75: { emoji: '🚀', title: 'Almost there!' },
};

const VISIBLE_MS = 2200;

/**
 * Non-blocking milestone feedback for 25/50/75.
 *
 * Auto-dismisses and does NOT steal interaction - the user can keep tapping
 * cells underneath. A small confetti burst plays alongside a subtle slide-in
 * banner near the bottom of the screen.
 */
export function MilestoneToast({ milestone, onDismiss, hapticsEnabled = true }: MilestoneToastProps) {
  const C = useAppTheme();
  // Pill is a high-z floating element. In light mode the very-dark navy
  // contrasts against light surfaces. In dark mode it must sit clearly
  // above the dark surface, so use a lighter zinc.
  const pillBg = C.mode === 'dark' ? '#3F3F46' : '#0F1419';
  const translateY = useSharedValue(60);
  const opacity = useSharedValue(0);
  const confettiRef = useRef<ConfettiCannon>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!milestone) return;

    if (hapticsEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    opacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) });
    translateY.value = withSequence(
      withTiming(0, { duration: 260, easing: Easing.out(Easing.cubic) }),
      withDelay(
        VISIBLE_MS,
        withTiming(60, { duration: 260, easing: Easing.in(Easing.cubic) }),
      ),
    );
    opacity.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withDelay(VISIBLE_MS, withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) })),
    );

    timerRef.current = setTimeout(() => onDismiss(), VISIBLE_MS + 260);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [milestone, onDismiss, opacity, translateY, hapticsEnabled]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!milestone) return null;
  const { emoji, title } = CONTENT[milestone];

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 32,
        alignItems: 'center',
      }}
    >
      <ConfettiCannon
        ref={confettiRef}
        count={50}
        origin={{ x: 0, y: 0 }}
        autoStart
        fadeOut
        explosionSpeed={320}
        fallSpeed={2600}
        colors={['#1DB954', '#4ADE80', '#86EFAC', '#FBBF24']}
      />
      <Animated.View style={[{ paddingHorizontal: 16 }, style]}>
        <Pressable
          onPress={onDismiss}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: pillBg,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 999,
            shadowColor: 'rgba(0,0,0,0.3)',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 1,
            shadowRadius: 20,
            elevation: 6,
          }}
        >
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: '#FFFFFF' }}
          >
            {title}
          </Text>
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            style={{ fontFamily: 'DMSans_700Bold', fontSize: 14, color: '#FBBF24' }}
          >
            {milestone}%
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}
