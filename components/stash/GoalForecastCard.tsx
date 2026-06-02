import { useRouter } from 'expo-router';
import { Lock, Sparkles } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { forecastGoal, shortDate, type GoalForecast } from '@/lib/stash/forecast';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * Goal forecasting (Stashbox+): projected finish date + on-track/behind for each
 * active goal. Free users see a locked teaser. Renders nothing until at least
 * one goal has saving history to forecast from.
 */
export function GoalForecastCard() {
  const C = useAppTheme();
  const router = useRouter();
  const isPro = useEntitlement();
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);

  const forecasts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return moneyboxes
      .filter((b) => b.status === 'active' && b.goalAmount > 0)
      .map((b) => forecastGoal(b, cellsByMoneybox[b.id] ?? [], today))
      .filter((f) => f.hasData && !f.done);
  }, [moneyboxes, cellsByMoneybox]);

  if (forecasts.length === 0) return null;

  const card = {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 18,
    gap: 14,
  } as const;

  const eyebrow = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Sparkles size={13} color={C.accent} />
      <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: C.textSecondary }}>
        GOAL FORECAST
      </Text>
    </View>
  );

  if (!isPro) {
    const behind = forecasts.find((f) => !f.onTrack);
    const preview = behind
      ? `${behind.name} is behind its target`
      : `${forecasts[0].name} is on track for ${shortDate(forecasts[0].projectedDate ?? forecasts[0].targetDate)}`;
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <SpringPressable
          onPress={() => {
            track('upsell_tapped', { source: 'stash_forecast' });
            router.push('/paywall' as never);
          }}
          haptic
          style={card}
        >
          {eyebrow}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.accent + '1A', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={20} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>Unlock goal forecasts</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                {preview} — see finish dates and stay on target with Stashbox+.
              </Text>
            </View>
          </View>
        </SpringPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={card}>
      {eyebrow}
      {forecasts.map((f) => (
        <ForecastRow key={f.boxId} f={f} C={C} />
      ))}
    </Animated.View>
  );
}

function ForecastRow({ f, C }: { f: GoalForecast; C: ReturnType<typeof useAppTheme> }) {
  const chipColor = f.onTrack ? '#16A34A' : '#F59E0B';
  const sub = f.onTrack
    ? `On track to finish ${f.projectedDate ? shortDate(f.projectedDate) : shortDate(f.targetDate)}`
    : `Save ${formatAmount(Math.ceil(f.weeklyNeeded), f.currency)}/wk to hit ${shortDate(f.targetDate)}`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
            {f.name}
          </Text>
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: chipColor + '18' }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, color: chipColor }}>
              {f.onTrack ? 'On track' : 'Behind'}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
          {sub}
        </Text>
      </View>
    </View>
  );
}
