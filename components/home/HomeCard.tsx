import { ReactNode } from 'react';
import { Text, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { useAppTheme } from '@/lib/stores/theme';

export const HOME_CARD_RADIUS = 18;

interface HomeCardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Optional thin status stripe down the left edge (severity color). */
  accentEdge?: string;
  /** Entrance stagger, ms. */
  delay?: number;
  padding?: number;
  contentStyle?: ViewStyle;
}

/**
 * Shared surface for every home card below the hero. One radius, one border,
 * one soft shadow, one entrance — so the cards read as a single family. Status
 * color is expressed only as a thin left edge (or by children), never a full
 * tinted background.
 */
export function HomeCard({ children, onPress, accentEdge, delay = 0, padding = 16, contentStyle }: HomeCardProps) {
  const C = useAppTheme();

  const inner = (
    <View
      style={{
        borderRadius: HOME_CARD_RADIUS,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: C.border,
        flexDirection: 'row',
      }}
    >
      {accentEdge ? <View style={{ width: 3, backgroundColor: accentEdge }} /> : null}
      <View style={{ flex: 1, padding, gap: 12, ...contentStyle }}>{children}</View>
    </View>
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(400).delay(delay)}
      style={{
        borderRadius: HOME_CARD_RADIUS,
        backgroundColor: C.surfaceElevated,
        shadowColor: '#0F1419',
        shadowOpacity: 0.04,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 2 },
        elevation: 1,
      }}
    >
      {onPress ? (
        <SpringPressable onPress={onPress} haptic>
          {inner}
        </SpringPressable>
      ) : (
        inner
      )}
    </Animated.View>
  );
}

interface CardEyebrowProps {
  label: string;
  icon?: ReactNode;
  right?: ReactNode;
}

/** The consistent small uppercase label row at the top of a home card. */
export function CardEyebrow({ label, icon, right }: CardEyebrowProps) {
  const C = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        {icon}
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: C.textSecondary }}>
          {label}
        </Text>
      </View>
      {right}
    </View>
  );
}
