/**
 * "Safe to spend today" hook — wires the stores + frozen-month FX snapshot and
 * delegates the math to computeSafeToSpend (pure, tested in safe-to-spend-core).
 */

import { useEffect, useMemo, useState } from 'react';

import { getCachedMonthRates, getMonthRates } from '@/lib/expenses/fx';
import { computeSafeToSpend } from '@/lib/home/safe-to-spend-core';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';

export type { SafeToSpend, SpendSegment, SpendPace } from '@/lib/home/safe-to-spend-core';

export function useSafeToSpend() {
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const categories = useExpenseCategoriesStore((s) => s.categories);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Frozen month FX snapshot → stable in-month math.
  const [rates, setRates] = useState<Record<string, number>>(() => getCachedMonthRates(monthKey));
  useEffect(() => {
    let alive = true;
    getMonthRates(monthKey).then((r) => {
      if (alive) setRates(r);
    });
    return () => {
      alive = false;
    };
  }, [monthKey]);

  return useMemo(
    () => computeSafeToSpend(budgets, transactions, categories, rates, new Date()),
    [budgets, transactions, categories, rates],
  );
}
