import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronRight, GraduationCap, Plus, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { PayoffPlanCard } from '@/components/loans/PayoffPlanCard';
import { SpringPressable } from '@/components/SpringPressable';
import { formatApr, formatCents, formatDuration, projectFromLoan } from '@/lib/loans/math';
import { LOAN_TYPES } from '@/lib/loans/types-meta';
import { useLoansStore } from '@/lib/stores/loans';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { StudentLoan } from '@/lib/types';

export default function LoansScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { userId } = useSessionStore();
  const { loans, loadAll, loading } = useLoansStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) loadAll(userId);
  }, [userId, loadAll]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await loadAll(userId, true);
    setRefreshing(false);
  }, [userId, loadAll]);

  const activeLoans = loans.filter((l) => l.status !== 'paid_off');
  const paidOffLoans = loans.filter((l) => l.status === 'paid_off');

  const totals = useMemo(() => {
    const balance = activeLoans.reduce((sum, l) => sum + l.currentBalanceCents, 0);
    const monthly = activeLoans.reduce((sum, l) => sum + l.monthlyPaymentCents, 0);
    return { balance, monthly };
  }, [activeLoans]);

  const hasLoans = loans.length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FFF"
            colors={[C.accent]}
          />
        }
      >
        {/* Hero header */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: hasLoans ? 56 : 40 }}
        >
          <Animated.View
            entering={FadeInDown.duration(400)}
            style={{ paddingHorizontal: 20, paddingTop: 56 }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 15,
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              Freedom Plan
            </Text>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 34,
                color: '#FFFFFF',
                marginTop: 4,
              }}
            >
              {hasLoans ? 'Your loans' : 'Track student loans'}
            </Text>

            {hasLoans && (
              <View style={{ marginTop: 24 }}>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                  }}
                >
                  Total balance
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_700Bold',
                    fontSize: 38,
                    color: '#FFFFFF',
                    marginTop: 2,
                  }}
                >
                  {formatCents(totals.balance)}
                </Text>
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.7)',
                    marginTop: 10,
                  }}
                >
                  {formatCents(totals.monthly)} / month across {activeLoans.length}{' '}
                  active loan{activeLoans.length === 1 ? '' : 's'}
                </Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        {/* Add-loan CTA */}
        <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
          <SpringPressable
            onPress={() => router.push('/loans/create')}
            style={{
              backgroundColor: C.buttonPrimaryBg,
              borderRadius: 16,
              paddingVertical: 16,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 3,
            }}
          >
            <Plus size={20} color={C.buttonPrimaryText} />
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 16,
                color: C.buttonPrimaryText,
                marginLeft: 8,
              }}
            >
              Add a loan
            </Text>
          </SpringPressable>
        </View>

        {/* Empty state */}
        {!hasLoans && !loading && (
          <View style={{ paddingHorizontal: 20, marginTop: 32 }}>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 20,
                padding: 24,
                borderWidth: 1,
                borderColor: C.borderLight,
              }}
            >
              <GraduationCap size={32} color={C.accent} />
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 18,
                  color: C.textPrimary,
                  marginTop: 12,
                }}
              >
                Get out of student debt faster
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 14,
                  color: C.textSecondary,
                  marginTop: 8,
                  lineHeight: 20,
                }}
              >
                {"Add each of your student loans — federal or private. We’ll show your payoff date and tell you exactly how much sooner you’d be free if you paid extra."}
              </Text>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 16,
                  paddingTop: 16,
                  borderTopWidth: 1,
                  borderTopColor: C.borderLight,
                }}
              >
                <ShieldCheck size={16} color={C.textMuted} />
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: C.textMuted,
                    marginLeft: 6,
                    flex: 1,
                  }}
                >
                  Tip: completed moneyboxes can be applied as extra principal — pay off
                  loans faster while you save.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Payoff plan (Stashbox+) */}
        {activeLoans.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <PayoffPlanCard />
          </View>
        )}

        {/* Active loan cards */}
        {activeLoans.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            {activeLoans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                onPress={() => router.push(`/loans/${loan.id}`)}
              />
            ))}
          </View>
        )}

        {/* Paid-off section */}
        {paidOffLoans.length > 0 && (
          <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: C.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                marginBottom: 10,
              }}
            >
              Paid off 🎉
            </Text>
            {paidOffLoans.map((loan) => (
              <LoanRow
                key={loan.id}
                loan={loan}
                onPress={() => router.push(`/loans/${loan.id}`)}
                isPaidOff
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

interface LoanRowProps {
  loan: StudentLoan;
  onPress: () => void;
  isPaidOff?: boolean;
}

function LoanRow({ loan, onPress, isPaidOff }: LoanRowProps) {
  const C = useAppTheme();
  const meta = LOAN_TYPES[loan.loanType];
  const projection = isPaidOff
    ? null
    : projectFromLoan({
        currentBalanceCents: loan.currentBalanceCents,
        aprBps: loan.aprBps,
        monthlyPaymentCents: loan.monthlyPaymentCents,
      });

  const progressPct =
    loan.originalPrincipalCents > 0
      ? Math.max(
          0,
          Math.min(
            1,
            1 - loan.currentBalanceCents / loan.originalPrincipalCents,
          ),
        )
      : 0;

  return (
    <Pressable
      onPress={onPress}
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.borderLight,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 16,
                color: C.textPrimary,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {loan.nickname}
            </Text>
            <ChevronRight size={18} color={C.textMuted} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textMuted,
              }}
            >
              {meta.shortLabel}
            </Text>
            {meta.isFederal && (
              <View
                style={{
                  marginLeft: 6,
                  backgroundColor: C.accentSoft,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  borderRadius: 4,
                }}
              >
                <Text
                  style={{
                    fontFamily: 'DMSans_500Medium',
                    fontSize: 10,
                    color: C.accentDark,
                  }}
                >
                  FEDERAL
                </Text>
              </View>
            )}
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 12,
                color: C.textMuted,
                marginLeft: 6,
              }}
            >
              · {formatApr(loan.aprBps)}
            </Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: 14 }}>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 22,
            color: C.textPrimary,
          }}
        >
          {formatCents(loan.currentBalanceCents)}
        </Text>
        {!isPaidOff && (
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              marginTop: 2,
            }}
          >
            {formatCents(loan.monthlyPaymentCents)} / mo · due day {loan.dueDayOfMonth}
          </Text>
        )}
      </View>

      {/* Progress bar */}
      <View
        style={{
          height: 6,
          backgroundColor: C.borderLight,
          borderRadius: 3,
          marginTop: 12,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            width: `${Math.round(progressPct * 100)}%`,
            height: '100%',
            backgroundColor: isPaidOff ? C.accent : C.accentDark,
            borderRadius: 3,
          }}
        />
      </View>

      {!isPaidOff && projection && (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: C.textMuted,
            marginTop: 8,
          }}
        >
          {projection.months >= 600
            ? 'Payment doesn\'t cover interest — increase to make progress.'
            : `Payoff in ${formatDuration(projection.months)} at current payment`}
        </Text>
      )}
    </Pressable>
  );
}
