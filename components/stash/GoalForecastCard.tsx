import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ImageBackground, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { forecastGoal, shortDate, type GoalForecast } from '@/lib/stash/forecast';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useAppTheme } from '@/lib/stores/theme';

const FORECAST_BG = {
  onTrack: require('@/assets/stash/forecast/on-track.webp'),
  behind: require('@/assets/stash/forecast/behind.webp'),
};

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

  const card = {
    // Matches the cream of the locked-card illustrations so all three forecast
    // states share one surface.
    backgroundColor: '#FEF0D5',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.borderLight,
    padding: 18,
    gap: 14,
  } as const;

  const eyebrow = (
    <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: C.textSecondary }}>
      GOAL FORECAST
    </Text>
  );

  const goPaywall = () => {
    track('upsell_tapped', { source: 'stash_forecast' });
    router.push('/paywall' as never);
  };

  // Locked teaser — the background illustration carries the on-track / behind
  // story, so the card keeps just the title on the calm left side (no icon, no
  // subtext).
  const renderLocked = (onTrack: boolean) => (
    <SpringPressable
      onPress={goPaywall}
      haptic
      style={{ borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: C.borderLight }}
    >
      <ImageBackground
        source={onTrack ? FORECAST_BG.onTrack : FORECAST_BG.behind}
        resizeMode="cover"
        style={{ minHeight: 92, padding: 18, justifyContent: 'center' }}
      >
        {eyebrow}
        <Text
          numberOfLines={1}
          style={{ fontFamily: 'DMSans_700Bold', fontSize: 16, color: C.textPrimary, marginTop: 6, maxWidth: '60%' }}
        >
          Unlock goal forecasts
        </Text>
      </ImageBackground>
    </SpringPressable>
  );

  // Preview-only: force the locked teaser in the requested state.
  if (forecasts.length === 0) return null;

  if (!isPro) {
    const anyBehind = forecasts.some((f) => !f.onTrack);
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        {renderLocked(!anyBehind)}
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={card}>
      {eyebrow}
      <View>
        {forecasts.map((f, i) => (
          <View key={f.boxId}>
            {i > 0 && <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.09)', 'rgba(0,0,0,0.09)', 'transparent']}
              locations={[0, 0.15, 0.85, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 1, marginVertical: 14 }}
            />}
            <ForecastRow f={f} C={C} />
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function ForecastRow({ f, C }: { f: GoalForecast; C: ReturnType<typeof useAppTheme> }) {
  const sub = f.onTrack
    ? `On track to finish ${f.projectedDate ? shortDate(f.projectedDate) : shortDate(f.targetDate)}`
    : `Save ${formatAmount(Math.ceil(f.weeklyNeeded), f.currency)}/wk to hit ${shortDate(f.targetDate)}`;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <Text style={{ fontSize: 20 }}>{f.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
          {f.name}
        </Text>
        <Text numberOfLines={1} style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
          {sub}
        </Text>
      </View>
      {/* Tag — vertically centered with the text block, premium metallic look. */}
      <StatusTag onTrack={f.onTrack} />
    </View>
  );
}

/** Glossy status tag — a gradient-filled pill (light-to-dark for an embossed
 *  sheen) with crisp white text. */
function StatusTag({ onTrack }: { onTrack: boolean }) {
  const grad = onTrack
    ? (['#4ADE80', '#16A34A'] as const)
    : (['#FB923C', '#EA580C'] as const);
  return (
    <LinearGradient
      colors={grad}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={{ borderRadius: 999, paddingHorizontal: 11, paddingVertical: 4 }}
    >
      <Text
        allowFontScaling={false}
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 10,
          letterSpacing: 0.3,
          color: '#FFFFFF',
          textShadowColor: 'rgba(0,0,0,0.22)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 1,
        }}
      >
        {onTrack ? 'On track' : 'Behind'}
      </Text>
    </LinearGradient>
  );
}
