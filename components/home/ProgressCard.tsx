import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';

import { CardEyebrow, HomeCard } from '@/components/home/HomeCard';
import { formatAmount } from '@/lib/currency';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { computeProgress } from '@/lib/home/progress';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';
import { useAppTheme } from '@/lib/stores/theme';

/**
 * Proof-of-value: cumulative saved-toward-goals + loan interest avoided. The
 * "you're winning" summary that justifies the subscription. Shown to everyone
 * (it's the user's realized progress); renders nothing until there's something
 * to celebrate.
 */
export function ProgressCard() {
  const C = useAppTheme();
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
  const loans = useLoansStore((s) => s.loans);
  const paymentsByLoan = useLoansStore((s) => s.paymentsByLoan);
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
  const report = useMemo(
    () => computeProgress(moneyboxes, cellsByMoneybox, loans, paymentsByLoan, getCachedRates(), ccy),
    [moneyboxes, cellsByMoneybox, loans, paymentsByLoan, ccy],
  );

  if (!report.hasAny) return null;

  const tiles: { label: string; value: string }[] = [];
  if (report.savedCents > 0) {
    tiles.push({ label: 'Saved so far', value: formatAmount(Math.round(report.savedCents / 100), ccy) });
  }
  if (report.interestAvoidedCents > 0) {
    tiles.push({ label: 'Interest avoided', value: formatAmount(Math.round(report.interestAvoidedCents / 100), ccy) });
  }

  return (
    <HomeCard delay={160} padding={18} contentStyle={{ gap: 14 }}>
      <CardEyebrow label="YOU'RE MAKING PROGRESS" icon={<Sparkles size={13} color={C.accent} />} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {tiles.map((t) => (
          <View key={t.label} style={{ flex: 1 }}>
            <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 24, color: C.textPrimary, letterSpacing: -0.6 }}>
              {t.value}
            </Text>
            <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: C.textSecondary, marginTop: 2 }}>
              {t.label}
            </Text>
          </View>
        ))}
      </View>
    </HomeCard>
  );
}
