import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AlertTriangle, Calculator, ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CustomAlert } from '@/components/CustomAlert';
import { SpringPressable } from '@/components/SpringPressable';
import { calcMonthlyPayment, formatCents } from '@/lib/loans/math';
import { LOAN_TYPES, LOAN_TYPE_ORDER, REPAYMENT_PLANS, REPAYMENT_PLAN_ORDER } from '@/lib/loans/types-meta';
import { useLoansStore } from '@/lib/stores/loans';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { AprType, LoanType, RepaymentPlan } from '@/lib/types';
import { useAlert } from '@/lib/use-alert';

/** Parse a user-typed dollar string into integer cents. Returns null on
 *  invalid input (empty, NaN, negative, > $10M). */
function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim().replace(/[$,]/g, '');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return null;
  if (n > 10_000_000) return null;
  return Math.round(n * 100);
}

/** Parse "6.5" or "6.50" → 650 basis points. */
function parsePercentToBps(input: string): number | null {
  const trimmed = input.trim().replace(/%/g, '');
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0 || n > 50) return null;
  return Math.round(n * 100);
}

function parseInteger(input: string, min: number, max: number): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export default function LoanCreateScreen() {
  const C = useAppTheme();
  const router = useRouter();
  const { userId } = useSessionStore();
  const { create } = useLoansStore();
  const { alertConfig, showAlert, dismissAlert } = useAlert();

  const [nickname, setNickname] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('federal_unsubsidized');
  const [servicer, setServicer] = useState('');
  const [balanceText, setBalanceText] = useState('');
  const [aprText, setAprText] = useState('');
  const [aprType, setAprType] = useState<AprType>('fixed');
  const [termText, setTermText] = useState('120');
  const [paymentText, setPaymentText] = useState('');
  const [dueDayText, setDueDayText] = useState('15');
  const [autopayOn, setAutopayOn] = useState(false);
  const [repaymentPlan, setRepaymentPlan] = useState<RepaymentPlan>('standard');
  const [submitting, setSubmitting] = useState(false);

  const meta = LOAN_TYPES[loanType];

  /** Auto-compute monthly payment from balance + APR + term. Surfaces a
   *  one-line preview under the field. Re-runs only when the user taps
   *  the calculator button; we don't auto-fill because they may have a
   *  servicer-blessed number that differs slightly. */
  const computedMonthly = useMemo(() => {
    const balanceCents = parseDollarsToCents(balanceText);
    const aprBps = parsePercentToBps(aprText);
    const months = parseInteger(termText, 1, 600);
    if (!balanceCents || aprBps === null || !months) return null;
    return calcMonthlyPayment(balanceCents, aprBps, months);
  }, [balanceText, aprText, termText]);

  const handleAutoFill = () => {
    if (computedMonthly === null) {
      showAlert(
        'Need balance, APR, and term',
        'Enter the loan balance, APR, and term first — we\'ll calculate the standard monthly payment.',
      );
      return;
    }
    setPaymentText((computedMonthly / 100).toFixed(2));
  };

  const handleSubmit = async () => {
    if (!userId) return;

    const nick = nickname.trim();
    if (!nick) {
      showAlert('Add a nickname', 'Give this loan a name so you can recognize it on the home screen.');
      return;
    }
    if (nick.length > 60) {
      showAlert('Name too long', 'Keep the nickname under 60 characters.');
      return;
    }

    const balanceCents = parseDollarsToCents(balanceText);
    if (!balanceCents || balanceCents <= 0) {
      showAlert('Check the balance', 'Enter a dollar amount greater than $0.');
      return;
    }

    const aprBps = parsePercentToBps(aprText);
    if (aprBps === null) {
      showAlert('Check the APR', 'APR must be a percentage between 0% and 50%.');
      return;
    }

    const termMonths = parseInteger(termText, 1, 600);
    if (!termMonths) {
      showAlert('Check the term', 'Term must be between 1 and 600 months.');
      return;
    }

    const paymentCents = parseDollarsToCents(paymentText);
    if (!paymentCents || paymentCents <= 0) {
      showAlert(
        'Add a monthly payment',
        'Enter what you pay each month, or tap the calculator icon to auto-fill the standard amortized amount.',
      );
      return;
    }

    const dueDay = parseInteger(dueDayText, 1, 28);
    if (!dueDay) {
      showAlert('Check the due day', 'Pick a day between 1 and 28. (We cap at 28 to avoid month-end gotchas.)');
      return;
    }

    setSubmitting(true);
    try {
      const loan = await create({
        userId,
        nickname: nick,
        loanType,
        servicer: servicer.trim() || null,
        originalPrincipalCents: balanceCents,
        currentBalanceCents: balanceCents,
        aprBps,
        aprType,
        termMonthsRemaining: termMonths,
        monthlyPaymentCents: paymentCents,
        dueDayOfMonth: dueDay,
        autopayOn,
        repaymentPlan,
      });
      router.replace(`/loans/${loan.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not save the loan.';
      showAlert('Save failed', message);
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={{
          paddingTop: 56,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: C.pageBg,
          borderBottomWidth: 1,
          borderBottomColor: C.borderLight,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={{ padding: 4 }}
        >
          <ChevronLeft size={26} color={C.textPrimary} />
        </Pressable>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 20,
            color: C.textPrimary,
            marginLeft: 4,
          }}
        >
          Add a loan
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Nickname */}
          <Field label="Nickname" hint="Something like 'Sallie Mae undergrad' or 'Grad school'.">
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="My student loan"
              placeholderTextColor={C.textMuted}
              maxLength={60}
              style={inputStyle(C)}
            />
          </Field>

          {/* Loan type */}
          <Field label="Loan type" hint={meta.description}>
            <View style={{ gap: 8 }}>
              {LOAN_TYPE_ORDER.map((id) => {
                const t = LOAN_TYPES[id];
                const selected = id === loanType;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setLoanType(id)}
                    style={{
                      borderWidth: 1,
                      borderColor: selected ? C.accent : C.border,
                      backgroundColor: selected ? C.accentSoft : C.surface,
                      borderRadius: 12,
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_600SemiBold',
                        fontSize: 14,
                        color: selected ? C.accentDark : C.textPrimary,
                        flex: 1,
                      }}
                    >
                      {t.label}
                    </Text>
                    {t.isFederal && (
                      <View
                        style={{
                          backgroundColor: C.accent,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 4,
                          marginLeft: 8,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'DMSans_500Medium',
                            fontSize: 10,
                            color: '#FFFFFF',
                          }}
                        >
                          FEDERAL
                        </Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {!meta.isFederal && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                backgroundColor: C.warnBg,
                borderRadius: 10,
                padding: 10,
                marginBottom: 16,
              }}
            >
              <AlertTriangle size={16} color={C.warnText} style={{ marginTop: 2 }} />
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: C.warnText,
                  marginLeft: 8,
                  flex: 1,
                  lineHeight: 17,
                }}
              >
                {"Private/refinanced loans don’t qualify for federal protections like IDR, PSLF, or forbearance."}
              </Text>
            </View>
          )}

          {/* Servicer */}
          <Field label="Servicer (optional)" hint="MOHELA, Nelnet, Aidvantage, etc.">
            <TextInput
              value={servicer}
              onChangeText={setServicer}
              placeholder="Servicer name"
              placeholderTextColor={C.textMuted}
              maxLength={60}
              style={inputStyle(C)}
            />
          </Field>

          {/* Balance */}
          <Field label="Current balance" hint="What you owe right now in USD.">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ ...inputPrefixStyle(C) }}>$</Text>
              <TextInput
                value={balanceText}
                onChangeText={setBalanceText}
                placeholder="25000.00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                style={[inputStyle(C), { flex: 1, marginLeft: 4 }]}
              />
            </View>
          </Field>

          {/* APR */}
          <Field label="APR" hint="Annual interest rate. Federal Direct loans this year run ~6–9%.">
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={aprText}
                onChangeText={setAprText}
                placeholder="6.50"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                style={[inputStyle(C), { flex: 1 }]}
              />
              <Text style={{ ...inputPrefixStyle(C), marginLeft: 6 }}>%</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {(['fixed', 'variable'] as const).map((t) => {
                const selected = aprType === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => setAprType(t)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: selected ? C.accent : C.border,
                      backgroundColor: selected ? C.accentSoft : 'transparent',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: selected ? C.accentDark : C.textSecondary,
                        textTransform: 'capitalize',
                      }}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* Term */}
          <Field label="Term remaining (months)" hint="120 = 10 years. 240 = 20. Most federal Standard plans are 120.">
            <TextInput
              value={termText}
              onChangeText={setTermText}
              placeholder="120"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={3}
              style={inputStyle(C)}
            />
          </Field>

          {/* Monthly payment */}
          <Field
            label="Monthly payment"
            hint={
              computedMonthly !== null
                ? `Standard amortization works out to ${formatCents(computedMonthly)} / month.`
                : 'What you actually pay each month.'
            }
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ ...inputPrefixStyle(C) }}>$</Text>
              <TextInput
                value={paymentText}
                onChangeText={setPaymentText}
                placeholder="280.00"
                placeholderTextColor={C.textMuted}
                keyboardType="decimal-pad"
                style={[inputStyle(C), { flex: 1, marginLeft: 4, marginRight: 8 }]}
              />
              <Pressable
                onPress={handleAutoFill}
                hitSlop={6}
                style={{
                  borderWidth: 1,
                  borderColor: C.border,
                  borderRadius: 10,
                  padding: 10,
                }}
                accessibilityLabel="Auto-fill standard monthly payment"
              >
                <Calculator size={18} color={C.textSecondary} />
              </Pressable>
            </View>
          </Field>

          {/* Due day */}
          <Field label="Payment due day" hint="Day of the month it's due (1–28).">
            <TextInput
              value={dueDayText}
              onChangeText={setDueDayText}
              placeholder="15"
              placeholderTextColor={C.textMuted}
              keyboardType="number-pad"
              maxLength={2}
              style={inputStyle(C)}
            />
          </Field>

          {/* Repayment plan */}
          <Field label="Repayment plan" hint={REPAYMENT_PLANS[repaymentPlan].description}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {REPAYMENT_PLAN_ORDER.map((id) => {
                const p = REPAYMENT_PLANS[id];
                const selected = id === repaymentPlan;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setRepaymentPlan(id)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: selected ? C.accent : C.border,
                      backgroundColor: selected ? C.accentSoft : C.surface,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'DMSans_500Medium',
                        fontSize: 12,
                        color: selected ? C.accentDark : C.textSecondary,
                      }}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Field>

          {/* Toggles */}
          <ToggleRow
            label="Autopay enabled"
            sub="Federal Direct loans get a 0.25% APR discount with autopay."
            value={autopayOn}
            onChange={setAutopayOn}
          />

          <SpringPressable
            onPress={handleSubmit}
            disabled={submitting}
            style={{
              backgroundColor: C.buttonPrimaryBg,
              borderRadius: 14,
              paddingVertical: 16,
              marginTop: 16,
              alignItems: 'center',
            }}
          >
            {submitting ? (
              <ActivityIndicator color={C.buttonPrimaryText} />
            ) : (
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 16,
                  color: C.buttonPrimaryText,
                }}
              >
                Save loan
              </Text>
            )}
          </SpringPressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomAlert config={alertConfig} onDismiss={dismissAlert} />
    </View>
  );
}

/* ── Form primitives ───────────────────────────────────────────────── */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const C = useAppTheme();
  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontFamily: 'DMSans_600SemiBold',
          fontSize: 13,
          color: C.textPrimary,
          marginBottom: 6,
        }}
      >
        {label}
      </Text>
      {children}
      {hint && (
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 11,
            color: C.textMuted,
            marginTop: 6,
            lineHeight: 15,
          }}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

function ToggleRow({
  label,
  sub,
  value,
  onChange,
}: {
  label: string;
  sub: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const C = useAppTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.surface,
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: C.borderLight,
      }}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          style={{
            fontFamily: 'DMSans_600SemiBold',
            fontSize: 14,
            color: C.textPrimary,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans_400Regular',
            fontSize: 12,
            color: C.textMuted,
            marginTop: 2,
            lineHeight: 16,
          }}
        >
          {sub}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: C.border, true: C.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function inputStyle(C: ReturnType<typeof useAppTheme>) {
  return {
    fontFamily: 'DMSans_500Medium' as const,
    fontSize: 16,
    color: C.textPrimary,
    backgroundColor: C.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
  };
}

function inputPrefixStyle(C: ReturnType<typeof useAppTheme>) {
  return {
    fontFamily: 'DMSans_600SemiBold' as const,
    fontSize: 16,
    color: C.textSecondary,
  };
}
