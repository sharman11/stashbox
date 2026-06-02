import { useRouter } from 'expo-router';
import { Lock, Sparkles } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { SpringPressable } from '@/components/SpringPressable';
import { addMonths, formatApr, formatCents, formatDuration, todayYmd } from '@/lib/loans/math';
import { computeAvalanchePlan } from '@/lib/loans/plan';
import { formatMonthYear } from '@/lib/loans/payoff-summary';
import { track } from '@/lib/observability';
import { useEntitlement } from '@/lib/stores/entitlement';
import { useLoansStore } from '@/lib/stores/loans';
import { useAppTheme } from '@/lib/stores/theme';

const EXTRA_OPTIONS = [0, 50, 100, 250] as const;

/**
 * The Loans-tab payoff plan (Stashbox+). Computes the optimal avalanche +
 * rollover plan. Free users see a locked teaser with the real $0-extra savings
 * as the hook; subscribers get the interactive plan (extra-budget chips,
 * debt-free date, savings vs minimum payments, and the attack order).
 */
export function PayoffPlanCard() {
  const C = useAppTheme();
  const router = useRouter();
  const loans = useLoansStore((s) => s.loans);
  const isPro = useEntitlement();

  const [extra, setExtra] = useState(0);
  const teaser = useMemo(() => computeAvalanchePlan(loans, 0), [loans]);
  const plan = useMemo(() => computeAvalanchePlan(loans, extra * 100), [loans, extra]);

  if (!teaser.hasLoans) return null;

  const cardStyle = {
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
        YOUR PAYOFF PLAN
      </Text>
    </View>
  );

  /* ── Free: locked teaser ── */
  if (!isPro) {
    const hook =
      teaser.interestSavedCents > 0
        ? `Pay off in ${formatDuration(teaser.debtFreeMonths)} and save ${formatCents(teaser.interestSavedCents)} in interest — just by paying in the smartest order.`
        : 'See the fastest way to clear your loans and how much extra payments would save.';
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <SpringPressable
          onPress={() => {
            track('upsell_tapped', { source: 'loans_plan' });
            router.push('/paywall' as never);
          }}
          haptic
          style={cardStyle}
        >
          {eyebrow}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: C.accent + '1A',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={20} color={C.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>
                Unlock your fastest payoff plan
              </Text>
              <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 2, lineHeight: 17 }}>
                {hook}
              </Text>
            </View>
          </View>
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: C.accent }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 12, color: '#FFFFFF' }}>Unlock with Stashbox+</Text>
          </View>
        </SpringPressable>
      </Animated.View>
    );
  }

  /* ── Paid: interactive plan ── */
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={cardStyle}>
      {eyebrow}

      {plan.stalled ? (
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary, lineHeight: 18 }}>
          Your payments don’t cover the interest yet — raise a payment to start making progress.
        </Text>
      ) : (
        <>
          <View>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 28, color: C.textPrimary, letterSpacing: -0.8 }}>
              Debt-free {formatMonthYear(plan.payoffDate)}
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
              {plan.monthsSaved > 0 || plan.interestSavedCents > 0
                ? `${formatDuration(plan.monthsSaved)} sooner · save ${formatCents(plan.interestSavedCents)} vs. minimums`
                : 'Add extra below to finish sooner'}
            </Text>
          </View>

          {/* Extra-per-month chips */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {EXTRA_OPTIONS.map((amt) => {
              const active = extra === amt;
              return (
                <SpringPressable
                  key={amt}
                  onPress={() => setExtra(amt)}
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
                    {amt === 0 ? 'Min' : `+$${amt}`}
                  </Text>
                </SpringPressable>
              );
            })}
          </View>

          {/* Attack order */}
          <Animated.View entering={FadeIn.duration(220)} style={{ gap: 10, marginTop: 2 }}>
            {plan.steps.map((step, i) => (
              <View key={step.loanId} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 11,
                    backgroundColor: C.accent + '1A',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 11, color: C.accent }}>{i + 1}</Text>
                </View>
                <Text numberOfLines={1} style={{ flex: 1, fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.textPrimary }}>
                  {step.nickname}{' '}
                  <Text style={{ fontFamily: 'DMSans_400Regular', color: C.textMuted }}>{formatApr(step.aprBps)}</Text>
                </Text>
                <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary }}>
                  gone {formatMonthYear(addMonths(todayYmd(), step.payoffMonth))}
                </Text>
              </View>
            ))}
          </Animated.View>

          <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted, lineHeight: 15 }}>
            Estimate, not financial advice. Tell your servicer to apply extra to principal.
          </Text>
        </>
      )}
    </Animated.View>
  );
}
