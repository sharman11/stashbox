import { useRouter } from 'expo-router';
import { Landmark, PiggyBank, TrendingUp } from 'lucide-react-native';
import { useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

import { SpringPressable } from '@/components/SpringPressable';
import { formatAmount } from '@/lib/currency';
import type { CurrencyCode } from '@/lib/currency';
import { useLoansStore } from '@/lib/stores/loans';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

/** Don't nudge for trivial amounts (~10 units of the home currency). */
const MIN_SURPLUS_CENTS = 1_000;

interface SurplusRouterCardProps {
  /** This month's income − expenses, in home-currency cents. */
  surplusCents: number;
  currency: CurrencyCode;
}

/**
 * Expenses → Loans/Stash bridge. When the user spent less than they earned this
 * month, offer to route the leftover toward a loan (pay off faster) or a goal
 * (e.g. save for a nice date). Suggest-don't-automate: both CTAs open an
 * existing flow pre-filled. Reuses the expenses-tab card styling.
 */
export function SurplusRouterCard({ surplusCents, currency }: SurplusRouterCardProps) {
  const C = useAppTheme();
  const router = useRouter();
  const userId = useSessionStore((s) => s.userId);
  const loans = useLoansStore((s) => s.loans);
  const loadLoans = useLoansStore((s) => s.loadAll);

  useEffect(() => {
    if (userId) loadLoans(userId);
  }, [userId, loadLoans]);

  const activeLoans = useMemo(() => loans.filter((l) => l.status === 'active'), [loans]);

  if (surplusCents < MIN_SURPLUS_CENTS) return null;

  const payLoan = () => {
    // Loans are USD; only pre-fill an amount when the home currency matches and
    // there's a single obvious target. Otherwise send them to the loans tab.
    if (activeLoans.length === 1 && currency === 'USD') {
      router.push({
        pathname: '/loans/log-payment',
        params: {
          loanId: activeLoans[0].id,
          amount: (surplusCents / 100).toFixed(2),
          extra: '1',
          note: 'This month’s surplus',
        },
      } as never);
    } else {
      router.push('/(tabs)/loans' as never);
    }
  };

  const fundGoal = () => router.push('/create' as never);

  const hasLoans = activeLoans.length > 0;

  return (
    <View
      style={{
        backgroundColor: C.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: C.border,
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: C.accentLight,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <TrendingUp size={18} color={C.accentDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 15, color: C.textPrimary }}>
            You&apos;re {formatAmount(surplusCents / 100, currency)} ahead this month
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans_400Regular',
              fontSize: 12,
              color: C.textMuted,
              marginTop: 2,
              lineHeight: 17,
            }}
          >
            Money in beat money out. Put it to work before it slips away.
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {hasLoans && (
          <SpringPressable
            haptic
            onPress={payLoan}
            style={{
              flex: 1,
              backgroundColor: C.buttonPrimaryBg,
              borderRadius: 12,
              paddingVertical: 12,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Landmark size={15} color={C.buttonPrimaryText} />
            <Text
              style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: C.buttonPrimaryText }}
              numberOfLines={1}
            >
              Pay down a loan
            </Text>
          </SpringPressable>
        )}
        <SpringPressable
          haptic
          onPress={fundGoal}
          style={{
            flex: 1,
            backgroundColor: hasLoans ? C.surface : C.buttonPrimaryBg,
            borderRadius: 12,
            paddingVertical: 12,
            borderWidth: hasLoans ? 1 : 0,
            borderColor: C.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <PiggyBank size={15} color={hasLoans ? C.textPrimary : C.buttonPrimaryText} />
          <Text
            style={{
              fontFamily: 'DMSans_600SemiBold',
              fontSize: 13,
              color: hasLoans ? C.textPrimary : C.buttonPrimaryText,
            }}
            numberOfLines={1}
          >
            {hasLoans ? 'Save for a goal' : 'Save toward a goal'}
          </Text>
        </SpringPressable>
      </View>
    </View>
  );
}
