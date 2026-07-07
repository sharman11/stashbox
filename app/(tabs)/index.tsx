import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';

import { AttentionFeed } from '@/components/home/AttentionFeed';
import { EmptyHero } from '@/components/home/EmptyHero';
import { HomeHero } from '@/components/home/HomeHero';
import { ProgressCard } from '@/components/home/ProgressCard';
import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

export default function HomeScreen() {
  const C = useAppTheme();
  const userId = useSessionStore((s) => s.userId);
  const { width: screenWidth } = useWindowDimensions();
  // Same 3:4 box all three hero states (shell / empty / populated) share.
  const heroHeight = Math.round(screenWidth * (4 / 3));

  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const loadAllBoxes = useMoneyboxesStore((s) => s.loadAll);
  const loadCells = useMoneyboxesStore((s) => s.loadCells);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const loadTransactions = useExpenseTransactionsStore((s) => s.loadAll);
  const loadBudgets = useExpenseBudgetsStore((s) => s.loadAll);
  const loadCategories = useExpenseCategoriesStore((s) => s.loadAll);

  // Hydrate the data sources the hero charts and home cards read from
  // (boxes/cells, expense transactions, budgets, categories). Categories drive
  // the safe-to-spend bar's segment colors. Every store is TTL-cached
  // internally, so re-running this is cheap. `hydrated` flips once the first
  // pass settles — before that we don't know empty vs populated, and guessing
  // is what caused the empty-hero → data-hero flash on account creation.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    if (!userId) return;
    Promise.allSettled([
      loadAllBoxes(userId),
      loadTransactions(userId),
      loadBudgets(userId),
      loadCategories(userId),
    ]).then(() => {
      setHydrated(true);
      // Roll last month's budgets forward so safe-to-spend doesn't go blank
      // on the 1st. Idempotent, guarded per month inside the store.
      useExpenseBudgetsStore.getState().ensureCurrentMonth(userId);
    });
  }, [userId, loadAllBoxes, loadTransactions, loadBudgets, loadCategories]);

  useEffect(() => {
    for (const box of moneyboxes) {
      if (box.status !== 'active') continue;
      loadCells(box.id);
    }
  }, [moneyboxes, loadCells]);

  const hasAnyActiveGoal = useMemo(
    () => moneyboxes.some((b) => b.status === 'active'),
    [moneyboxes],
  );
  // "Activity" = the user DID something: created a stash or logged a
  // transaction themselves. The single income transaction seeded by the
  // signup money picture doesn't count — a brand-new user should still get
  // the welcome hero, not a $0 chart.
  const hasLoggedTransaction = useMemo(
    () => transactions.some((t) => !(t.type === 'income' && t.note === 'Monthly income')),
    [transactions],
  );
  const showEmptyHero = Boolean(userId) && !hasAnyActiveGoal && !hasLoggedTransaction;

  return (
    <View style={{ flex: 1, backgroundColor: C.heroTop }}>
      {/* Status bar text is always light here — the top of the screen is the
       *  dark hero gradient regardless of system theme. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          backgroundColor: C.pageBg,
          // Stretch to fill the viewport: the root View behind is heroTop
          // green (for the pull-down bounce behind the hero), and short
          // content (empty state) would otherwise expose it as a green band
          // under the last card.
          flexGrow: 1,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full-bleed hero (safe-area top is owned by the gradient).
         *  All three states share the same 3:4 box, so transitions are
         *  content swaps, not layout jumps. Until the stores settle we show
         *  a neutral shell — committing to empty OR populated early is what
         *  caused the flash on account creation. */}
        {!hydrated ? (
          <View style={{ height: heroHeight, backgroundColor: C.heroTop }} />
        ) : showEmptyHero ? (
          <EmptyHero />
        ) : (
          <HomeHero />
        )}

        {/* ── Below the hero, ordered by usefulness/urgency:
         *  ① what needs attention → ② safe to spend (daily) → ③ progress.
         *  The empty state keeps safe-to-spend visible: an onboarding-set
         *  budget shows its numbers (or the set-a-budget CTA) before the
         *  first goal or transaction exists. */}
        {hydrated && (
          <View style={{ paddingHorizontal: 16, paddingTop: 38, gap: 12 }}>
            {!showEmptyHero && <AttentionFeed />}
            <SafeToSpendCard />
            {!showEmptyHero && <ProgressCard />}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
