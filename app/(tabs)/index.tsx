import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { ScrollView, View } from 'react-native';

import { AttentionFeed } from '@/components/home/AttentionFeed';
import { DebtFreeCard } from '@/components/home/DebtFreeCard';
import { EmptyHero } from '@/components/home/EmptyHero';
import { HomeHero } from '@/components/home/HomeHero';
import { NetWorthCard } from '@/components/home/NetWorthCard';
import { ProgressCard } from '@/components/home/ProgressCard';
import { SafeToSpendCard } from '@/components/home/SafeToSpendCard';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useSessionStore } from '@/lib/stores/session';
import { useAppTheme } from '@/lib/stores/theme';

export default function HomeScreen() {
  const C = useAppTheme();
  const userId = useSessionStore((s) => s.userId);

  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const loadAllBoxes = useMoneyboxesStore((s) => s.loadAll);
  const loadCells = useMoneyboxesStore((s) => s.loadCells);
  const loans = useLoansStore((s) => s.loans);
  const loadAllLoans = useLoansStore((s) => s.loadAll);
  const loadPayments = useLoansStore((s) => s.loadPayments);
  const loadTransactions = useExpenseTransactionsStore((s) => s.loadAll);
  const loadBudgets = useExpenseBudgetsStore((s) => s.loadAll);
  const loadCategories = useExpenseCategoriesStore((s) => s.loadAll);

  // Hydrate the data sources the hero charts and home cards read from
  // (boxes/cells, loans/payments, expense transactions, budgets, categories).
  // Categories drive the safe-to-spend bar's segment colors. Every store is
  // TTL-cached internally, so re-running this is cheap.
  useEffect(() => {
    if (!userId) return;
    loadAllBoxes(userId);
    loadAllLoans(userId);
    loadTransactions(userId);
    loadBudgets(userId);
    loadCategories(userId);
  }, [userId, loadAllBoxes, loadAllLoans, loadTransactions, loadBudgets, loadCategories]);

  useEffect(() => {
    for (const box of moneyboxes) {
      if (box.status !== 'active') continue;
      loadCells(box.id);
    }
  }, [moneyboxes, loadCells]);

  useEffect(() => {
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      loadPayments(loan.id);
    }
  }, [loans, loadPayments]);

  const hasAnyActiveGoal = useMemo(
    () => moneyboxes.some((b) => b.status === 'active'),
    [moneyboxes],
  );
  // Only switch to the empty-state hero once the session is hydrated. Before
  // that we don't know whether the user has goals or not, so default to the
  // normal hero to avoid flashing the welcome card on every cold start.
  const showEmptyHero = Boolean(userId) && !hasAnyActiveGoal;

  return (
    <View style={{ flex: 1, backgroundColor: C.heroTop }}>
      {/* Status bar text is always light here — the top of the screen is the
       *  dark hero gradient regardless of system theme. */}
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          paddingBottom: 40,
          backgroundColor: C.pageBg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Full-bleed hero (safe-area top is owned by the gradient) ── */}
        {showEmptyHero ? <EmptyHero /> : <HomeHero />}

        {/* ── Below the hero:
         *  ① what needs attention → ② safe to spend (daily) → ③ debt-free optimizer */}
        {!showEmptyHero && (
          <View style={{ paddingHorizontal: 16, paddingTop: 30, gap: 20 }}>
            <AttentionFeed />
            <SafeToSpendCard />
            <DebtFreeCard />
            <NetWorthCard />
            <ProgressCard />
          </View>
        )}
      </ScrollView>
    </View>
  );
}
