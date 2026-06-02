import { Scale } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { CardEyebrow, HomeCard } from '@/components/home/HomeCard';
import { formatAmount } from '@/lib/currency';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { computeNetWorth } from '@/lib/home/net-worth';
import { formatMonthYear } from '@/lib/loans/payoff-summary';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

const SAVINGS_COLOR = '#16A34A';
const DEBT_COLOR = '#DC2626';

/**
 * Net-worth trajectory: savings − debt as one number, with a savings-vs-debt
 * split bar and a projection to net-positive. Shown to all (it's the user's
 * own position); renders only when there's savings or debt to show.
 */
export function NetWorthCard() {
  const C = useAppTheme();
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
  const loans = useLoansStore((s) => s.loans);
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

  const ccy = profile?.defaultCurrency ?? 'USD';
  const nw = useMemo(
    () => computeNetWorth(moneyboxes, cellsByMoneybox, loans, getCachedRates(), ccy, new Date()),
    [moneyboxes, cellsByMoneybox, loans, ccy],
  );

  if (!nw.available) return null;

  const total = Math.max(1, nw.savingsCents + nw.debtCents);
  const savingsPct = (nw.savingsCents / total) * 100;
  const negative = nw.netCents < 0;

  const sub = negative
    ? nw.positiveDate
      ? `Net-positive by ${formatMonthYear(nw.positiveDate)}`
      : 'Keep saving and paying down to turn this around'
    : nw.monthlyDeltaCents > 0
      ? `Growing ~${formatAmount(Math.round(nw.monthlyDeltaCents / 100), ccy)}/mo`
      : 'Your savings now cover your debt';

  return (
    <HomeCard delay={140} padding={18} contentStyle={{ gap: 14 }}>
      <CardEyebrow label="NET WORTH" icon={<Scale size={13} color={C.accent} />} />

      <View>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 32, color: negative ? DEBT_COLOR : C.textPrimary, letterSpacing: -1 }}>
          {negative ? '−' : ''}
          {formatAmount(Math.round(Math.abs(nw.netCents) / 100), ccy)}
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 13, color: C.textSecondary, marginTop: 2 }}>{sub}</Text>
      </View>

      {/* Savings vs debt split */}
      <View style={{ height: 10, borderRadius: 5, backgroundColor: DEBT_COLOR, overflow: 'hidden', flexDirection: 'row' }}>
        <View style={{ width: `${savingsPct}%`, backgroundColor: SAVINGS_COLOR }} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: SAVINGS_COLOR }}>
          {formatAmount(Math.round(nw.savingsCents / 100), ccy)} saved
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 11, color: DEBT_COLOR }}>
          {formatAmount(Math.round(nw.debtCents / 100), ccy)} debt
        </Text>
      </View>
    </HomeCard>
  );
}
