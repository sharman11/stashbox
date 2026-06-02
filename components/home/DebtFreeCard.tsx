import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Lock, Sparkles, TrendingDown } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { formatCents, formatDuration, formatApr } from '@/lib/loans/math';
import { applyExtra, buildDebtFreeSummary, formatMonthYear } from '@/lib/loans/payoff-summary';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useLoansStore } from '@/lib/stores/loans';

const TEXT = '#F2FBF7';
const DIM = 'rgba(242,251,247,0.62)';
const MINT = '#7DF3C2';

/** Extra-payment presets, in whole dollars. */
const EXTRA_OPTIONS = [25, 50, 100, 250] as const;

/**
 * Debt-free optimizer — the headline premium insight. Shows when the user's
 * whole loan portfolio hits $0 at current payments, then lets them feel the
 * payoff of paying a little extra (routed avalanche-style to the highest-APR
 * loan): a sooner date and real interest saved.
 *
 * The what-if section is the natural paywall line — gate `EXTRA_OPTIONS` /
 * the scenario result behind Stashbox+ when the paywall lands.
 */
export function DebtFreeCard() {
  const router = useRouter();
  const loans = useLoansStore((s) => s.loans);
  const isPro = useEntitlement();

  const summary = useMemo(() => buildDebtFreeSummary(loans), [loans]);
  const [extraDollars, setExtraDollars] = useState(0);

  const scenario = useMemo(
    () => applyExtra(loans, summary, extraDollars * 100),
    [loans, summary, extraDollars],
  );

  if (!summary.hasLoans) return null;

  const paidPct = summary.totalOriginalCents > 0
    ? Math.max(0, Math.min(1, 1 - summary.totalBalanceCents / summary.totalOriginalCents))
    : 0;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(120)}>
      <SpringPressable onPress={() => router.push('/(tabs)/loans' as never)} haptic style={{ borderRadius: 22, overflow: 'hidden' }}>
        <LinearGradient
          colors={['#0B2A22', '#103B30', '#0C2C25']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ padding: 20, gap: 16 }}
        >
          {/* Headline */}
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TrendingDown size={13} color={MINT} />
              <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.4, color: DIM }}>
                DEBT-FREE DATE
              </Text>
            </View>

            {summary.stalled ? (
              <>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 24, color: TEXT, marginTop: 6, letterSpacing: -0.6 }}>
                  Not on track
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: DIM, marginTop: 4, lineHeight: 18 }}>
                  A payment doesn't cover its interest yet — raise it to start shrinking the balance.
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 34, color: TEXT, marginTop: 4, letterSpacing: -1 }}>
                  {formatMonthYear(summary.payoffDate)}
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: DIM, marginTop: 2 }}>
                  {formatDuration(summary.baselineMonths)} to go · {formatCents(summary.totalBalanceCents)} left
                </Text>
              </>
            )}
          </View>

          {/* Paid-so-far track */}
          {!summary.stalled && (
            <View style={{ height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
              <View style={{ height: '100%', width: `${Math.round(paidPct * 100)}%`, backgroundColor: MINT, borderRadius: 3 }} />
            </View>
          )}

          {/* What-if extra payment — Stashbox+ gated */}
          {!summary.stalled && summary.targetLoan && !isPro && (
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
                backgroundColor: 'rgba(125,243,194,0.10)',
                borderRadius: 14,
                borderWidth: 1,
                borderColor: 'rgba(125,243,194,0.22)',
                padding: 14,
              }}
            >
              <Lock size={16} color={MINT} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 13, color: TEXT }}>
                  Unlock the payoff optimizer
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: DIM, marginTop: 1 }}>
                  See how paying extra cuts months and interest — Stashbox+
                </Text>
              </View>
            </SpringPressable>
          )}

          {!summary.stalled && summary.targetLoan && isPro && (
            <View style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Sparkles size={12} color={MINT} />
                <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: DIM }}>
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
                        backgroundColor: active ? MINT : 'rgba(255,255,255,0.08)',
                        borderWidth: 1,
                        borderColor: active ? MINT : 'rgba(255,255,255,0.14)',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_700Bold',
                          fontSize: 13,
                          color: active ? '#0B2A22' : TEXT,
                        }}
                      >
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
                    backgroundColor: 'rgba(125,243,194,0.10)',
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(125,243,194,0.22)',
                    padding: 12,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: TEXT, letterSpacing: -0.2 }}>
                    Debt-free {formatMonthYear(scenario.payoffDate)}
                    {scenario.monthsShaved > 0 ? `  ·  ${formatDuration(scenario.monthsShaved)} sooner` : ''}
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: MINT }}>
                    Save {formatCents(scenario.interestSavedCents)} in interest
                  </Text>
                  <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: DIM, marginTop: 2 }}>
                    Put it toward {summary.targetLoan.nickname} ({formatApr(summary.targetLoan.aprBps)}) — your highest rate
                  </Text>
                </Animated.View>
              )}
            </View>
          )}
        </LinearGradient>
      </SpringPressable>
    </Animated.View>
  );
}
