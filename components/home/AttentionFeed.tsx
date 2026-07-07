import { useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Image, Pressable, Text, View, type ImageSourcePropType } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { useAttentionFeed, type AlertIcon, type AttentionTone } from '@/lib/home/attention';
import { useAppTheme } from '@/lib/stores/theme';

const TONE_COLOR: Record<AttentionTone, string> = {
  red: '#DC2626',
  amber: '#F59E0B',
  calm: '#16A34A',
};

// Darker shade per tone for the title text — legible on the soft tint.
const TONE_TEXT: Record<AttentionTone, string> = {
  red: '#B91C1C',
  amber: '#B45309',
  calm: '#15803D',
};

// Custom mascot-style alert icons.
const ALERT_ICONS: Record<AlertIcon, ImageSourcePropType> = {
  'over-budget': require('@/assets/home/alerts/over-budget.webp'),
  'near-budget': require('@/assets/home/alerts/near-budget.webp'),
  streak: require('@/assets/home/alerts/streak.webp'),
  save: require('@/assets/home/alerts/save.webp'),
};

/**
 * The home screen's attention zone: a severity-ranked stack of what needs the
 * user's attention. Each item is a compact strip with a soft severity-tinted
 * fill (red/amber/green) so it reads as an alert, not a card. No side stripe.
 * A custom icon sits on the left; an X on the right dismisses the alert for the
 * session. Collapses to a calm line when clear.
 */
export function AttentionFeed() {
  const router = useRouter();
  const C = useAppTheme();
  const items = useAttentionFeed();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());

  const visible = items.filter((it) => !dismissed.has(it.id));

  if (visible.length === 0) {
    return (
      <Animated.View
        entering={FadeInDown.duration(400).delay(40)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 }}
      >
        <Check size={16} color={C.textSecondary} />
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}>
          You're all caught up
        </Text>
      </Animated.View>
    );
  }

  const dismiss = (id: string) =>
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });

  return (
    <View style={{ gap: 8 }}>
      {visible.map((item, i) => {
        const tone = TONE_COLOR[item.tone];
        return (
          <Animated.View key={item.id} entering={FadeInDown.duration(400).delay(40 + i * 60)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: tone + '14',
                borderRadius: 14,
                paddingLeft: 10,
                paddingRight: 6,
                paddingVertical: 8,
              }}
            >
              {/* Tap the body to open the relevant screen. */}
              <SpringPressable
                onPress={() => router.push(item.href as never)}
                haptic
                style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    backgroundColor: tone + '33',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Image source={ALERT_ICONS[item.icon]} style={{ width: 30, height: 30 }} resizeMode="contain" />
                </View>
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 13, color: TONE_TEXT[item.tone], letterSpacing: -0.1 }}
                >
                  {item.title}
                </Text>
              </SpringPressable>

              {/* Dismiss for the session. */}
              <Pressable
                onPress={() => dismiss(item.id)}
                hitSlop={8}
                style={{ padding: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Dismiss alert"
              >
                <X size={16} color={C.textMuted} />
              </Pressable>
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}
