import { useRouter } from 'expo-router';
import { Lock, Sparkles } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { computeInsights, type SpendingInsights } from '@/lib/expenses/insights';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

function useSpendingInsights(): SpendingInsights {
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const profile = useProfileStore((s) => s.profile);
  const [, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getFxRates().then(() => {
      if (alive) setTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);
  return useMemo(() => {
    const ccy = profile?.defaultCurrency ?? 'USD';
    const d = new Date();
    const current = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return computeInsights(transactions, getCachedRates(), ccy, current);
  }, [transactions, profile?.defaultCurrency]);
}

/**
 * Spending intelligence (Stashbox+): the top anomaly + recurring-charge total.
 * Only renders when there's something to surface, so we never sell an empty
 * feature. Free users see a locked teaser previewing the real signal.
 */
export function InsightsCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const C = useAppTheme();
  const router = useRouter();
  const isPro = useEntitlement();
  const insights = useSpendingInsights();
  const categories = useExpenseCategoriesStore((s) => s.categories);

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const topAnomaly = insights.anomalies[0];
  const recurringTotal = insights.recurring.totalCents;
  const hasContent = Boolean(topAnomaly) || recurringTotal > 0;

  if (!insights.available || !hasContent) return null;

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
        SPENDING INSIGHTS
      </Text>
    </View>
  );

  if (!isPro) {
    const preview =
      topAnomaly && catById.get(topAnomaly.categoryId)
        ? `${catById.get(topAnomaly.categoryId)!.name} is trending up this month`
        : `~${formatAmount(Math.round(recurringTotal / 100), insights.currency)}/mo in recurring charges`;
    return (
      <Animated.View entering={FadeInDown.duration(400)} style={style}>
        <SpringPressable
          onPress={() => {
            track('upsell_tapped', { source: 'expenses_insights' });
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
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>Unlock spending insights</Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                {preview} — see overspending and recurring charges with Stashbox+.
              </Text>
            </View>
          </View>
        </SpringPressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={[card, style]}>
      {eyebrow}
      {topAnomaly && catById.get(topAnomaly.categoryId) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>{catById.get(topAnomaly.categoryId)!.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
              {catById.get(topAnomaly.categoryId)!.name} {topAnomaly.pctOver}% above your 3-mo avg
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 1 }}>
              {formatAmount(Math.round(topAnomaly.currentCents / 100), insights.currency)} this month vs{' '}
              {formatAmount(Math.round(topAnomaly.avgCents / 100), insights.currency)} avg
            </Text>
          </View>
        </View>
      )}
      {recurringTotal > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 20 }}>🔁</Text>
          <Text style={{ flex: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.textPrimary }}>
            ~{formatAmount(Math.round(recurringTotal / 100), insights.currency)}/mo in recurring charges
            <Text style={{ fontFamily: 'DMSans_400Regular', color: C.textMuted }}>
              {`  ·  ${insights.recurring.items.length} item${insights.recurring.items.length === 1 ? '' : 's'}`}
            </Text>
          </Text>
        </View>
      )}
    </Animated.View>
  );
}
