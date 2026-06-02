import { useRouter } from 'expo-router';
import { Lock, Sparkles, TrendingDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CardEyebrow, HomeCard } from '@/components/home/HomeCard';
import { SpringPressable } from '@/components/SpringPressable';
import { formatApr, formatCents, formatDuration } from '@/lib/loans/math';
import { applyExtra, buildDebtFreeSummary, formatMonthYear } from '@/lib/loans/payoff-summary';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useLoansStore } from '@/lib/stores/loans';
import { useAppTheme } from '@/lib/stores/theme';

const EXTRA_OPTIONS = [25, 50, 100, 250] as const;

/**
 * Debt-free optimizer — the headline premium insight, now on the shared light
 * HomeCard surface. Shows the portfolio debt-free date; the extra-payment
 * what-if is gated behind Stashbox+ (the locked teaser opens the paywall).
 */
export function DebtFreeCard() {
  const router = useRouter();
  const C = useAppTheme();
  const loans = useLoansStore((s) => s.loans);
  const isPro = useEntitlement();

  const summary = useMemo(() => buildDebtFreeSummary(loans), [loans]);
  const [extraDollars, setExtraDollars] = useState(0);

  const scenario = useMemo(() => applyExtra(loans, summary, extraDollars * 100), [loans, summary, extraDollars]);

  if (!summary.hasLoans) return null;

  const dim = C.textSecondary;
  const paidPct =
    summary.totalOriginalCents > 0
      ? Math.max(0, Math.min(1, 1 - summary.totalBalanceCents / summary.totalOriginalCents))
      : 0;

  return (
    <HomeCard onPress={() => router.push('/(tabs)/loans' as never)} delay={120} padding={18} contentStyle={{ gap: 16 }}>
      <CardEyebrow label="DEBT-FREE DATE" icon={<TrendingDown size={13} color={C.accent} />} />

      {summary.stalled ? (
        <View>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 22, color: C.textPrimary, letterSpacing: -0.6 }}>
            Not on track
          </Text>
          <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: dim, marginTop: 4, lineHeight: 18 }}>
            A payment doesn't cover its interest yet — raise it to start shrinking the balance.
          </Text>
        </View>
      ) : (
        <>
          <View>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, color: C.textPrimary, letterSpacing: -1 }}>
              {formatMonthYear(summary.payoffDate)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: dim, marginTop: 2 }}>
              {formatDuration(summary.baselineMonths)} to go · {formatCents(summary.totalBalanceCents)} left
            </Text>
          </View>

          {/* Paid-so-far track */}
          <View style={{ height: 6, borderRadius: 3, backgroundColor: C.borderLight, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round(paidPct * 100)}%`, backgroundColor: C.accent, borderRadius: 3 }} />
          </View>

          {/* What-if — Stashbox+ gated */}
          {summary.targetLoan && !isPro && (
            <SpringPressable
              onPress={() => {
                track('upsell_tapped', { source: 'debt_optimizer' });
                router.push('/paywall' as never);
              }}
              haptic
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: C.accent + '12',
                borderRadius: 12,
                borderWidth: 1,
                borderColor: C.accent + '2E',
                padding: 12,
              }}
            >
              <Lock size={16} color={C.accent} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: C.textPrimary }}>
                  Unlock the payoff optimizer
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: dim, marginTop: 1 }}>
                  See how paying extra cuts months and interest — Stashbox+
                </Text>
              </View>
            </SpringPressable>
          )}

          {summary.targetLoan && isPro && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color={C.accent} />
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: dim }}>
                  WHAT IF YOU PAID EXTRA / MONTH?
                </Text>
              </View>

              <View style={{ flexDirection: 'row', gap: 8 }}>
                {EXTRA_OPTIONS.map((amt) => {
                  const active = extraDollars === amt;
                  return (
                    <SpringPressable
                      key={amt}
                      onPress={() => setExtraDollars(active ? 0 : amt)}
                      haptic
                      style={{
                        flex: 1,
                        paddingVertical: 9,
                        borderRadius: 12,
                        alignItems: 'center',
                        backgroundColor: active ? C.accent : 'transparent',
                        borderWidth: 1,
                        borderColor: active ? C.accent : C.border,
                      }}
                    >
                      <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: active ? '#FFFFFF' : C.textPrimary }}>
                        +${amt}
                      </Text>
                    </SpringPressable>
                  );
                })}
              </View>

              {extraDollars > 0 && scenario.interestSavedCents > 0 && (
                <Animated.View
                  entering={FadeIn.duration(220)}
                  style={{
                    backgroundColor: C.accent + '12',
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: C.accent + '2E',
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary, letterSpacing: -0.2 }}>
                    Debt-free {formatMonthYear(scenario.payoffDate)}
                    {scenario.monthsShaved > 0 ? `  ·  ${formatDuration(scenario.monthsShaved)} sooner` : ''}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.accent }}>
                    Save {formatCents(scenario.interestSavedCents)} in interest
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: dim, marginTop: 2 }}>
                    Put it toward {summary.targetLoan.nickname} ({formatApr(summary.targetLoan.aprBps)}) — your highest rate
                  </Text>
                </Animated.View>
              )}
            </View>
          )}
        </>
      )}
    </HomeCard>
  );
}
