import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { HomeCard } from '@/components/home/HomeCard';
import { formatAmount } from '@/lib/currency';
import { getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { computeProgress } from '@/lib/home/progress';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';

// The mascot background is a fixed warm/cream illustration, so this card's text
// uses fixed warm-brown tones (not theme colors) to stay legible in both light
// and dark mode.
const PROGRESS_EYEBROW = '#A07C4B';
const PROGRESS_VALUE = '#3A2A1A';
const PROGRESS_LABEL = '#86715A';

/** Shared compute hook — exposed so the home layout can check presence too. */
export function useProgress() {
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const cellsByMoneybox = useMoneyboxesStore((s) => s.cellsByMoneybox);
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
  return useMemo(
    () => ({
      ...computeProgress(moneyboxes, cellsByMoneybox, getCachedRates(), ccy),
      ccy,
    }),
    [moneyboxes, cellsByMoneybox, ccy],
  );
}

/**
 * Proof-of-value: cumulative saved-toward-goals. The "you're winning" summary
 * that justifies the subscription. Shown to everyone (it's the user's realized
 * progress); renders nothing until there's something to celebrate.
 */
export function ProgressCard() {
  const report = useProgress();
  const ccy = report.ccy;

  if (!report.hasAny) return null;

  return (
    <HomeCard
      delay={160}
      padding={18}
      backgroundSource={require('@/assets/home/progress-bg.webp')}
      contentStyle={{ gap: 10, minHeight: 88 }}
    >
      {/* Keep text on the left half — the mascot art lives on the right. */}
      <View style={{ maxWidth: '62%' }}>
        <Text style={{ fontFamily: 'DMSans_600SemiBold', fontSize: 10, letterSpacing: 1.2, color: PROGRESS_EYEBROW }}>
          YOU'RE MAKING PROGRESS
        </Text>
        <Text style={{ fontFamily: 'DMSans_700Bold', fontSize: 26, color: PROGRESS_VALUE, letterSpacing: -0.6, marginTop: 8 }}>
          {formatAmount(Math.round(report.savedCents / 100), ccy)}
        </Text>
        <Text style={{ fontFamily: 'DMSans_500Medium', fontSize: 12, color: PROGRESS_LABEL, marginTop: 2 }}>
          Saved so far
        </Text>
      </View>
    </HomeCard>
  );
}
