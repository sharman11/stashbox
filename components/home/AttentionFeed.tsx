import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { useAttentionFeed, type AttentionTone } from '@/lib/home/attention';
import { useAppTheme } from '@/lib/stores/theme';

const TINTS: Record<AttentionTone, { bg: string; border: string; accent: string }> = {
  red: { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.18)', accent: '#B91C1C' },
  amber: { bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.18)', accent: '#B45309' },
  calm: { bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.18)', accent: '#047857' },
};

/**
 * The home screen's attention zone: a severity-ranked stack of what needs the
 * user's attention right now. When nothing's urgent it collapses to a single
 * calm "all caught up" line — the quiet is the reward.
 */
export function AttentionFeed() {
  const router = useRouter();
  const C = useAppTheme();
  const items = useAttentionFeed();

  if (items.length === 0) {
    return (
      <Animated.View
        entering={FadeInDown.duration(400).delay(40)}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 }}
      >
        <Check size={16} color={C.textSecondary} />
        <Text
          style={{
            fontFamily: 'DMSans_500Medium',
            fontSize: 13,
            color: C.textSecondary,
          }}
        >
          You're all caught up
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => {
        const tint = TINTS[item.tone];
        return (
          <Animated.View key={item.id} entering={FadeInDown.duration(400).delay(40 + i * 60)}>
            <SpringPressable
              onPress={() => router.push(item.href as never)}
              haptic
              style={{
                backgroundColor: tint.bg,
                borderRadius: 18,
                borderWidth: 1,
                borderColor: tint.border,
                padding: 16,
                gap: 12,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  backgroundColor: '#FFFFFF',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 24 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 15,
                    color: tint.accent,
                    letterSpacing: -0.1,
                  }}
                >
                  {item.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 12,
                    color: tint.accent,
                    opacity: 0.85,
                    marginTop: 2,
                  }}
                >
                  {item.subtitle}
                </Text>
              </View>
              <ChevronRight size={18} color={tint.accent} />
            </SpringPressable>
          </Animated.View>
        );
      })}
    </View>
  );
}
