import { useRouter } from 'expo-router';
import { ArrowRight, Landmark } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { computeBoosterImpact } from '@/lib/loans/booster';
import { formatCents, formatDuration } from '@/lib/loans/math';
import { useLoansStore } from '@/lib/stores/loans';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';
import type { Moneybox } from '@/lib/types';

interface PayoffBoosterCardProps {
  moneybox: Moneybox;
  /** Total saved in the vault, in the vault's currency (major units). */
  savedMajor: number;
}

/**
 * Shown on a completed vault that was linked to a loan ("Payoff Booster").
 * Suggests logging the saved amount as an extra principal payment — routes to
 * the pre-filled log-payment screen. Suggest-don't-automate: the user confirms;
 * nothing moves on its own. Renders nothing if the vault isn't loan-linked or
 * the loan is gone/paid off.
 */
export function PayoffBoosterCard({ moneybox, savedMajor }: PayoffBoosterCardProps) {
  const C = useAppTheme();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const loans = useLoansStore((s) => s.loans);
  const loadLoans = useLoansStore((s) => s.loadAll);

  useEffect(() => {
    if (userId) loadLoans(userId);
  }, [userId, loadLoans]);

  const loan = useMemo(
    () => loans.find((l) => l.id === moneybox.linkedLoanId && l.status === 'active'),
    [loans, moneybox.linkedLoanId],
  );

  // Student loans are USD-scoped. Only project/pre-fill an amount when the vault
  // is USD too; otherwise route without an amount and let the user enter it.
  const isUsd = moneybox.currency === 'USD';
  const savedCents = Math.round(savedMajor * 100);
  const impact = useMemo(
    () => (loan && isUsd && savedCents > 0 ? computeBoosterImpact(loan, savedCents) : null),
    [loan, isUsd, savedCents],
  );

  if (!moneybox.linkedLoanId || !loan) return null;

  const apply = () => {
    router.push({
      pathname: '/loans/log-payment',
      params: {
        loanId: loan.id,
        extra: '1',
        sourceMoneyboxId: moneybox.id,
        note: `From "${moneybox.name}" booster vault`,
        ...(isUsd && savedCents > 0 ? { amount: (savedCents / 100).toFixed(2) } : {}),
      },
    });
  };

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        marginBottom: 16,
        gap: 10,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Landmark size={16} color={C.accent} />
        <Text
          style={{ flex: 1, fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}
          numberOfLines={1}
        >
          Knock it off {loan.nickname}
        </Text>
      </View>

      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 13, color: C.textSecondary, lineHeight: 19 }}>
        {impact
          ? impact.paysOff
            ? `Apply this ${formatCents(savedCents)} and it clears ${loan.nickname} completely! 🎉`
            : `Apply this ${formatCents(savedCents)} as an extra payment and save ${formatCents(impact.interestSavedCents)} in interest — ${formatDuration(impact.monthsShaved)} sooner to debt-free.`
          : `This vault is a booster for ${loan.nickname}. Apply it as an extra payment to pay the loan off faster.`}
      </Text>

      <SpringPressable
        onPress={apply}
        haptic
        style={{
          backgroundColor: C.buttonPrimaryBg,
          borderRadius: 12,
          paddingVertical: 13,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
        }}
      >
        <Text
          style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 14, color: C.buttonPrimaryText }}
          numberOfLines={1}
        >
          Apply to {loan.nickname}
        </Text>
        <ArrowRight size={16} color={C.buttonPrimaryText} />
      </SpringPressable>

      <Text style={{ fontFamily: 'DMSans_400Regular', fontSize: 11, color: C.textMuted, textAlign: 'center' }}>
        We&apos;ll pre-fill the payment — you confirm it. Nothing moves on its own.
      </Text>
    </View>
  );
}
