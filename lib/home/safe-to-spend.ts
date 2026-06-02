/**
 * "Safe to spend today" for the home screen.
 *
 * Grounded in the user's own overall monthly budget — we don't have a bank
 * balance, so this is budget headroom, not cashflow:
 *
 *   remaining = overall monthly cap − spent so far this month
 *   safeToday = remaining / days left in the month (today inclusive)
 *
 * The daily figure self-corrects: overspend early and tomorrow's number drops;
 * underspend and it rises. A pace flag compares actual burn to an even pace so
 * the user knows if they're trending hot.
 */

import { useEffect, useMemo, useState } from 'react';

import type { CurrencyCode } from '@/lib/currency';
import { convertCents, getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';

export type SpendPace = 'on' | 'fast' | 'over';

export interface SafeToSpend {
  /** True when an overall budget exists for the current month. */
  available: boolean;
  currency: CurrencyCode;
  /** Per-day allowance for the rest of the month (cents, ≥ 0). */
  safeTodayCents: number;
  /** Month budget remaining (cents; negative if over). */
  remainingCents: number;
  /** Days left in the month, today inclusive. */
  daysLeft: number;
  overBudget: boolean;
  pace: SpendPace;
}

function currentMonthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const EMPTY: SafeToSpend = {
  available: false,
  currency: 'USD',
  safeTodayCents: 0,
  remainingCents: 0,
  daysLeft: 0,
  overBudget: false,
  pace: 'on',
};

export function useSafeToSpend(): SafeToSpend {
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);

  const [, setFxTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getFxRates().then(() => {
      if (alive) setFxTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const monthPrefix = currentMonthPrefix();
    const overall = budgets.find(
      (b) => b.categoryId === null && b.periodMonth.slice(0, 7) === monthPrefix,
    );
    if (!overall || overall.limitCents <= 0) return EMPTY;

    const rates = getCachedRates();
    let spentCents = 0;
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (!t.occurredOn.startsWith(monthPrefix)) continue;
      spentCents += convertCents(t.amountCents, t.currency, overall.currency, rates);
    }

    const now = new Date();
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = now.getDate(); // today inclusive
    const daysLeft = totalDays - elapsedDays + 1; // today inclusive

    const remainingCents = overall.limitCents - spentCents;
    const overBudget = remainingCents <= 0;
    const safeTodayCents = overBudget ? 0 : Math.floor(remainingCents / daysLeft);

    // Pace: how does spend-so-far compare to an even burn through today?
    const expectedByNow = overall.limitCents * (elapsedDays / totalDays);
    let pace: SpendPace = 'on';
    if (overBudget) pace = 'over';
    else if (expectedByNow > 0 && spentCents > expectedByNow * 1.1) pace = 'fast';

    return {
      available: true,
      currency: overall.currency,
      safeTodayCents,
      remainingCents,
      daysLeft,
      overBudget,
      pace,
    };
  }, [budgets, transactions]);
}
