import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { formatCents, todayYmd } from '@/lib/loans/math';
import { useLoansStore } from '@/lib/stores/loans';
import { useAppTheme } from '@/lib/stores/theme';

export default function LogPaymentScreen() {
  const C = useAppTheme();
  const router = useRouter();
  // `amount`, `extra`, `sourceMoneyboxId` and `note` let other features
  // (a completed Payoff Booster vault, an expense-surplus nudge, a loan
  // suggestion) route here pre-filled — "suggest, you log it". All optional.
  const { loanId, amount, extra, sourceMoneyboxId, note } = useLocalSearchParams<{
    loanId: string;
    amount?: string;
    extra?: string;
    sourceMoneyboxId?: string;
    note?: string;
  }>();
  const { loans, logPayment } = useLoansStore();

  const loan = useMemo(() => loans.find((l) => l.id === loanId), [loans, loanId]);

  const [amountText, setAmountText] = useState(
    amount ?? (loan ? (loan.monthlyPaymentCents / 100).toFixed(2) : ''),
  );
  const [date, setDate] = useState(todayYmd());
  const [isExtra, setIsExtra] = useState(extra === '1' || extra === 'true');
  const [submitting, setSubmitting] = useState(false);

  if (!loan) {
    return (
      <View style={{ flex: 1, backgroundColor: C.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }

  const handleSubmit = async () => {
    const trimmed = amountText.trim().replace(/[$,]/g, '');
    const amount = Number(trimmed);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Check the amount', 'Enter a dollar amount greater than $0.');
      return;
    }
    const amountCents = Math.round(amount * 100);
    if (amountCents > loan.currentBalanceCents && !isExtra) {
      Alert.alert(
        'More than the balance',
        'That’s more than your remaining balance. Mark it as an extra payment if you mean to pay off the loan.',
      );
      return;
    }

    setSubmitting(true);
    try {
      await logPayment({
        loanId: loan.id,
        paymentDate: date,
        amountCents,
        isExtra,
        sourceMoneyboxId: sourceMoneyboxId ?? null,
        note: note ?? null,
      });
      router.back();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not save the payment.';
      Alert.alert('Save failed', msg);
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.pageBg }}>
      <StatusBar style={C.mode === 'dark' ? 'light' : 'dark'} />

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
        <Pressable onPress={() => router.back()} hitSlop={8} style={{ padding: 4 }}>
          <ChevronLeft size={26} color={C.textPrimary} />
        </Pressable>
        <Text
          style={{
            fontFamily: 'DMSans_700Bold',
            fontSize: 20,
            color: C.textPrimary,
            marginLeft: 4,
            flex: 1,
          }}
          numberOfLines={1}
        >
          Log a payment
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 13,
              color: C.textMuted,
              marginBottom: 24,
            }}
          >
            {loan.nickname} · balance {formatCents(loan.currentBalanceCents)}
          </Text>

          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 12,
              color: C.textMuted,
              marginBottom: 6,
            }}
          >
            AMOUNT
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 18,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 12,
              backgroundColor: C.surface,
              paddingHorizontal: 14,
            }}
          >
            <Text
              style={{
                fontFamily: 'DMSans_600SemiBold',
                fontSize: 24,
                color: C.textSecondary,
              }}
            >
              $
            </Text>
            <TextInput
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="decimal-pad"
              style={{
                fontFamily: 'DMSans_700Bold',
                fontSize: 24,
                color: C.textPrimary,
                flex: 1,
                marginLeft: 6,
                paddingVertical: 12,
              }}
            />
          </View>

          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 12,
              color: C.textMuted,
              marginBottom: 6,
            }}
          >
            DATE
          </Text>
          <TextInput
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={C.textMuted}
            style={{
              fontFamily: 'DMSans_500Medium',
              fontSize: 16,
              color: C.textPrimary,
              borderWidth: 1,
              borderColor: C.border,
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 12,
              marginBottom: 18,
              backgroundColor: C.surface,
            }}
          />

          <Pressable
            onPress={() => setIsExtra((v) => !v)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 14,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: isExtra ? C.accent : C.border,
              backgroundColor: isExtra ? C.accentSoft : C.surface,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: isExtra ? C.accent : C.border,
                backgroundColor: isExtra ? C.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              {isExtra && (
                <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>✓</Text>
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  fontFamily: 'DMSans_600SemiBold',
                  fontSize: 14,
                  color: C.textPrimary,
                }}
              >
                Extra principal payment
              </Text>
              <Text
                style={{
                  fontFamily: 'DMSans_400Regular',
                  fontSize: 12,
                  color: C.textMuted,
                  marginTop: 2,
                }}
              >
                Goes entirely to principal — no interest split.
              </Text>
            </View>
          </Pressable>

          <SpringPressable
            onPress={handleSubmit}
            disabled={submitting}
            haptic
            style={{
              backgroundColor: C.buttonPrimaryBg,
              borderRadius: 16,
              paddingVertical: 16,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.12,
              shadowRadius: 8,
              elevation: 3,
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
                Save payment
              </Text>
            )}
          </SpringPressable>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => ({
              paddingVertical: 14,
              alignItems: 'center',
              marginTop: 8,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontFamily: 'DMSans_500Medium',
                fontSize: 14,
                color: C.textMuted,
              }}
            >
              Cancel
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
