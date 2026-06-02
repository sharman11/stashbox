import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  ChevronLeft,
  Info,
  Plus,
  ShieldCheck,
  Trash2,
  TrendingDown,
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { CustomAlert } from '@/components/CustomAlert';
import { SpringPressable } from '@/components/SpringPressable';
import {
  compareExtraPayment,
  formatApr,
  formatCents,
  formatDuration,
  projectFromLoan,
} from '@/lib/loans/math';
import { LOAN_TYPES, REPAYMENT_PLANS } from '@/lib/loans/types-meta';
import { useLoansStore } from '@/lib/stores/loans';
import { useAppTheme } from '@/lib/stores/theme';
import type { LoanPayment } from '@/lib/types';
import { useAlert } from '@/lib/use-alert';

const EXTRA_PRESETS_CENTS = [5000, 10000, 20000, 50000]; // $50, $100, $200, $500

export default function LoanDetailScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { loans, paymentsByLoan, loadPayments, remove } = useLoansStore();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const loan = useMemo(() => loans.find((l) => l.id === id), [loans, id]);
  const payments = id ? paymentsByLoan[id] ?? [] : [];

  const [extraIdx, setExtraIdx] = useState<number | null>(null);

  useEffect(() => {
    if (id) loadPayments(id);
  }, [id, loadPayments]);

  const baseline = useMemo(
    () => (loan ? projectFromLoan(loan, 0) : null),
    [loan],
  );

  const accelerated = useMemo(() => {
    if (!loan || extraIdx === null) return null;
    return compareExtraPayment(loan, EXTRA_PRESETS_CENTS[extraIdx]);
  }, [loan, extraIdx]);

  const handleDelete = useCallback(() => {
    if (!loan) return;
    showAlert(
      'Remove this loan?',
      'This deletes the loan and all payment history. You can re-add it any time.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove(loan.id);
              router.back();
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : 'Could not remove the loan.';
              showAlert('Remove failed', msg);
            }
          },
        },
      ],
      '⚠️',
    );
  }, [loan, remove, router, showAlert]);

  if (!loan) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const meta = LOAN_TYPES[loan.loanType];
  const paid = loan.originalPrincipalCents - loan.currentBalanceCents;
  const progressPct =
    loan.originalPrincipalCents > 0
      ? Math.max(0, Math.min(1, paid / loan.originalPrincipalCents))
      : 0;
  const willNeverPayOff = baseline ? baseline.months >= 600 : false;

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style="light" />

      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient
          colors={[C.heroTop, C.heroMid, C.heroBot]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ paddingBottom: 56 }}
        >
          <View
            style={{
              paddingTop: 56,
              paddingHorizontal: 16,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 4 }}>
              <ChevronLeft size={26} color="#FFFFFF" />
            </Pressable>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 16,
                color: 'rgba(255,255,255,0.85)',
                marginLeft: 4,
                flex: 1,
              }}
              numberOfLines={1}
            >
              {meta.shortLabel}
            </Text>
            <Pressable onPress={handleDelete} hitSlop={8} style={{ padding: 6 }}>
              <Trash2 size={20} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: 20, marginTop: 16 }}>
            <Text
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 26,
                color: '#FFFFFF',
              }}
            >
              {loan.nickname}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap' }}>
              {meta.isFederal && (
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  }}
                >
                  <ShieldCheck size={12} color="#FFFFFF" />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 11,
                      color: '#FFFFFF',
                      marginLeft: 4,
                    }}
                  >
                    Federal protections
                  </Text>
                </View>
              )}
              {loan.servicer && (
                <Text
                  style={{
                    fontFamily: 'DMSans_400Regular',
                    fontSize: 12,
                    color: 'rgba(255,255,255,0.7)',
                    marginLeft: meta.isFederal ? 8 : 0,
                  }}
                >
                  {loan.servicer}
                </Text>
              )}
            </View>

            <View style={{ marginTop: 28 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_500Medium',
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                Balance remaining
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_700Bold',
                  fontSize: 42,
                  color: '#FFFFFF',
                  marginTop: 2,
                }}
              >
                {formatCents(loan.currentBalanceCents)}
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                  marginTop: 4,
                }}
              >
                {formatCents(paid)} paid off · {Math.round(progressPct * 100)}% complete
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Quick stats */}
        <View style={{ paddingHorizontal: 20, marginTop: -28 }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 16,
              flexDirection: 'row',
              borderWidth: 1,
              borderColor: C.borderLight,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.06,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <Stat label="APR" value={formatApr(loan.aprBps)} C={C} />
            <Divider C={C} />
            <Stat
              label="Monthly"
              value={formatCents(loan.monthlyPaymentCents)}
              C={C}
            />
            <Divider C={C} />
            <Stat label="Due day" value={String(loan.dueDayOfMonth)} C={C} />
          </View>
        </View>

        {/* Payoff projection */}
        {baseline && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
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
              Payoff plan
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C.borderLight,
              }}
            >
              {willNeverPayOff ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <Info size={18} color={C.warnText} style={{ marginTop: 2 }} />
                  <Text
                    style={{
                      fontFamily: 'DMSans_500Medium',
                      fontSize: 13,
                      color: C.warnText,
                      marginLeft: 8,
                      flex: 1,
                      lineHeight: 18,
                    }}
                  >
                    {"Your monthly payment doesn’t cover the interest on this balance. The loan will keep growing until you increase the payment."}
                  </Text>
                </View>
              ) : (
                <>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: C.textSecondary,
                    }}
                  >
                    {`At ${formatCents(loan.monthlyPaymentCents)} / month you’ll be debt-free in`}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_700Bold',
                      fontSize: 22,
                      color: C.textPrimary,
                      marginTop: 4,
                    }}
                  >
                    {formatDuration(baseline.months)}
                  </Text>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 12,
                      color: C.textMuted,
                      marginTop: 4,
                    }}
                  >
                    Total interest: {formatCents(baseline.totalInterestCents)}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* What if you paid extra */}
        {!willNeverPayOff && baseline && (
          <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
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
              What if you paid extra
            </Text>
            <View
              style={{
                backgroundColor: C.surface,
                borderRadius: 16,
                padding: 16,
                borderWidth: 1,
                borderColor: C.borderLight,
              }}
            >
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EXTRA_PRESETS_CENTS.map((cents, idx) => {
                  const selected = idx === extraIdx;
                  return (
                    <Pressable
                      key={cents}
                      onPress={() => setExtraIdx(selected ? null : idx)}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: selected ? C.accent : C.border,
                        backgroundColor: selected ? C.accentSoft : 'transparent',
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: 'DMSans_600SemiBold',
                          fontSize: 13,
                          color: selected ? C.accentDark : C.textSecondary,
                        }}
                      >
                        +{formatCents(cents)}/mo
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {accelerated && (
                <View style={{ marginTop: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TrendingDown size={18} color={C.accent} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: C.accentDark,
                        marginLeft: 6,
                      }}
                    >
                      Free {formatDuration(accelerated.monthsShaved)} sooner
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontFamily: 'DMSans_400Regular',
                      fontSize: 13,
                      color: C.textSecondary,
                      marginTop: 6,
                      lineHeight: 18,
                    }}
                  >
                    {`You’d save ${formatCents(accelerated.interestSavedCents)} in interest and pay off on ${accelerated.accelerated.payoffDate}.`}
                  </Text>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'flex-start',
                      backgroundColor: C.accentSoft,
                      borderRadius: 10,
                      padding: 10,
                      marginTop: 12,
                    }}
                  >
                    <Info size={14} color={C.accentDark} style={{ marginTop: 2 }} />
                    <Text
                      style={{
                        fontFamily: 'DMSans_400Regular',
                        fontSize: 11,
                        color: C.accentDark,
                        marginLeft: 6,
                        flex: 1,
                        lineHeight: 15,
                      }}
                    >
                      {"Tell your servicer to apply extra payments to principal — otherwise they’ll advance your due date instead."}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Repayment plan / autopay info */}
        <View style={{ paddingHorizontal: 20, marginTop: 20 }}>
          <View
            style={{
              backgroundColor: C.surface,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: C.borderLight,
            }}
          >
            <InfoRow label="Repayment plan" value={REPAYMENT_PLANS[loan.repaymentPlan].label} C={C} />
            <InfoRow label="Autopay" value={loan.autopayOn ? 'On' : 'Off'} C={C} />
            <InfoRow label="APR type" value={loan.aprType === 'fixed' ? 'Fixed' : 'Variable'} C={C} last />
          </View>
        </View>

        {/* Payment history */}
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 13,
                color: C.textMuted,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                flex: 1,
              }}
            >
              Payments ({payments.length})
            </Text>
          </View>

          {payments.length === 0 ? (
            <Text
              style={{
                fontFamily: 'DMSans_400Regular',
                fontSize: 13,
                color: C.textMuted,
                paddingVertical: 12,
                textAlign: 'center',
              }}
            >
              {"No payments logged yet. Tap “Log a payment” below."}
            </Text>
          ) : (
            payments.map((p) => <PaymentRow key={p.id} payment={p} C={C} />)
          )}
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: Platform.OS === 'ios' ? 32 : 16,
          backgroundColor: C.pageBg,
          borderTopWidth: 1,
          borderTopColor: C.borderLight,
        }}
      >
        <SpringPressable
          onPress={() => router.push({ pathname: '/loans/log-payment', params: { loanId: loan.id } })}
          style={{
            backgroundColor: C.buttonPrimaryBg,
            borderRadius: 14,
            paddingVertical: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={18} color={C.buttonPrimaryText} />
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 16,
              color: C.buttonPrimaryText,
              marginLeft: 6,
            }}
          >
            Log a payment
          </Text>
        </SpringPressable>
      </View>

      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

/* ── Sub-components ───────────────────────────────────────────────── */

function Stat({ label, value, C }: { label: string; value: string; C: ReturnType<typeof useAppTheme> }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 11,
          color: C.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_700Bold',
          fontSize: 16,
          color: C.textPrimary,
          marginTop: 4,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function Divider({ C }: { C: ReturnType<typeof useAppTheme> }) {
  return <View style={{ width: 1, backgroundColor: C.borderLight, marginHorizontal: 4 }} />;
}

function InfoRow({
  label,
  value,
  C,
  last,
}: {
  label: string;
  value: string;
  C: ReturnType<typeof useAppTheme>;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: C.borderLight,
      }}
    >
      <Text
        style={{
          fontFamily: 'DMSans_400Regular',
          fontSize: 13,
          color: C.textMuted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans_500Medium',
          fontSize: 13,
          color: C.textPrimary,
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function PaymentRow({ payment, C }: { payment: LoanPayment; C: ReturnType<typeof useAppTheme> }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: C.borderLight,
        alignItems: 'center',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 14,
              color: C.textPrimary,
            }}
          >
            {formatCents(payment.amountCents)}
          </Text>
          {payment.isExtra && (
            <View
              style={{
                marginLeft: 8,
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
                EXTRA
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: C.textMuted,
            marginTop: 2,
          }}
        >
          {payment.paymentDate} · {formatCents(payment.principalCents)} principal ·{' '}
          {formatCents(payment.interestCents)} interest
        </Text>
      </View>
    </View>
  );
}

