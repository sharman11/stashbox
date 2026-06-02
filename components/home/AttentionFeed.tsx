import { useRouter } from 'expo-router';
import { Check, ChevronRight } from 'lucide-react-native';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { HomeCard } from '@/components/home/HomeCard';
import { useAttentionFeed, type AttentionTone } from '@/lib/home/attention';
import { useAppTheme } from '@/lib/stores/theme';

const TONE_COLOR: Record<AttentionTone, string> = {
  red: '#DC2626',
  amber: '#F59E0B',
  calm: '#16A34A',
};

/**
 * The home screen's attention zone: a severity-ranked stack of what needs the
 * user's attention. Each item is a shared HomeCard; severity shows only as a
 * soft-tinted icon tile (no left stripe, no full tint). Collapses to a calm
 * line when clear.
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
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary }}>
          You're all caught up
        </Text>
      </Animated.View>
    );
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, i) => (
        <HomeCard
          key={item.id}
          onPress={() => router.push(item.href as never)}
          delay={40 + i * 60}
          contentStyle={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              backgroundColor: TONE_COLOR[item.tone] + '1A',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 20 }}>{item.emoji}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary, letterSpacing: -0.1 }}
            >
              {item.title}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 2 }}
            >
              {item.subtitle}
            </Text>
          </View>
          <ChevronRight size={18} color={C.textMuted} />
        </HomeCard>
      ))}
    </View>
  );
}
