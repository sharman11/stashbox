import { ReactNode } from 'react';
import { Image, Text, View, ViewStyle, type ImageSourcePropType } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { useAppTheme } from '@/lib/stores/theme';

export const HOME_CARD_RADIUS = 18;

interface HomeCardProps {
  children: ReactNode;
  onPress?: () => void;
  /** Optional thin status stripe down the left edge (severity color). */
  accentEdge?: string;
  /** Optional full-bleed background image behind the content (clipped to the
   *  card). Keep card content left-aligned so it stays legible. */
  backgroundSource?: ImageSourcePropType;
  /** Entrance stagger, ms. */
  delay?: number;
  padding?: number;
  contentStyle?: ViewStyle;
}

/**
 * Shared surface for every home card below the hero. One radius, one border,
 * one entrance — so the cards read as a single family. Status color is
 * expressed by children, never a side edge. An optional background image can
 * sit behind the content for feature cards.
 */
export function HomeCard({ children, onPress, accentEdge, backgroundSource, delay = 0, padding = 16, contentStyle }: HomeCardProps) {
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
      {backgroundSource ? (
        <Image
          source={backgroundSource}
          resizeMode="cover"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }}
        />
      ) : null}
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
