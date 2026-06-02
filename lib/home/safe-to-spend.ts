/**
 * "Safe to spend today" — true safe-to-spend (Model 2).
 *
 * The daily number is discretionary headroom, spread over the days left:
 *
 *   spentToDate   = this month's expenses up to and including today
 *   reserved      = unpaid loan payments still owed this month (known liabilities)
 *   remaining     = overall monthly cap − spentToDate
 *   discretionary = max(0, remaining − reserved)
 *   safeToday     = discretionary / daysLeft        (daysLeft today-inclusive, ≥ 1)
 *
 * Reserving liabilities is what makes the number trustworthy: a user told
 * "$120/day safe" while an $800 loan payment is due later this month is being
 * misled. Per-category budgets are surfaced as alerts (see attention.ts), not
 * folded into this single figure.
 *
 * Currency: all math is done in the budget's currency using a FROZEN month FX
 * snapshot (see fx.getMonthRates) so the daily figure is stable within a month.
 * Loan amounts are USD (loans are US-scoped) and converted to the budget ccy.
 */

import { useEffect, useMemo, useState } from 'react';

import type { CurrencyCode } from '@/lib/currency';
import { convertCents, getCachedMonthRates, getMonthRates } from '@/lib/expenses/fx';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useLoansStore } from '@/lib/stores/loans';

export type SpendPace = 'on' | 'fast' | 'over';

/** One colored slice of the spend bar (a category's share of this month's spend). */
export interface SpendSegment {
  color: string;
  cents: number;
}

export interface SafeToSpend {
  /** True when an overall budget exists for the current month. */
  available: boolean;
  currency: CurrencyCode;
  /** Per-day discretionary allowance for the rest of the month (cents, ≥ 0). */
  safeTodayCents: number;
  /** Month budget remaining = cap − spent (cents; negative if over). */
  remainingCents: number;
  /** Unpaid known liabilities still owed this month (cents, in budget ccy). */
  reservedCents: number;
  /** The overall monthly cap (cents). */
  capCents: number;
  /** Total spent this month to date (cents). */
  spentCents: number;
  /** Days left in the month, today inclusive. */
  daysLeft: number;
  /** Spend broken down by category (for the segmented bar). */
  segments: SpendSegment[];
  overBudget: boolean;
  pace: SpendPace;
}

const UNCATEGORIZED_COLOR = '#94A3B8';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const EMPTY: SafeToSpend = {
  available: false,
  currency: 'USD',
  safeTodayCents: 0,
  remainingCents: 0,
  reservedCents: 0,
  capCents: 0,
  spentCents: 0,
  daysLeft: 0,
  segments: [],
  overBudget: false,
  pace: 'on',
};

export function useSafeToSpend(): SafeToSpend {
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);
  const categories = useExpenseCategoriesStore((s) => s.categories);
  const loans = useLoansStore((s) => s.loans);
  const paymentsByLoan = useLoansStore((s) => s.paymentsByLoan);

  const now = new Date();
  const monthKey = ymd(now).slice(0, 7);

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

  return useMemo(() => {
    const overall = budgets.find(
      (b) => b.categoryId === null && b.periodMonth.slice(0, 7) === monthKey,
    );
    if (!overall || overall.limitCents <= 0) return EMPTY;

    const today = ymd(now);
    const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const elapsedDays = Math.min(now.getDate(), totalDays); // today inclusive
    const daysLeft = Math.max(1, totalDays - elapsedDays + 1); // today inclusive, never 0

    const ccy = overall.currency;

    // Spend per category, up to and including today (no future-dated leakage).
    const byCategory = new Map<string | null, number>();
    let spentCents = 0;
    for (const t of transactions) {
      if (t.type !== 'expense') continue;
      if (!t.occurredOn.startsWith(monthKey)) continue;
      if (t.occurredOn > today) continue; // skip future-dated (B2)
      const cents = convertCents(t.amountCents, t.currency, ccy, rates);
      spentCents += cents;
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + cents);
    }

    // Colored segments from the spend map (every cent represented; unknown
    // category → neutral). Biggest slices first.
    const colorById = new Map(categories.map((c) => [c.id, c.color]));
    const segments: SpendSegment[] = [];
    for (const [catId, cents] of byCategory) {
      if (cents <= 0) continue;
      const color = (catId && colorById.get(catId)) || UNCATEGORIZED_COLOR;
      segments.push({ color, cents });
    }
    segments.sort((a, b) => b.cents - a.cents);

    // Reserve unpaid loan payments still owed this month (converted USD → ccy).
    let reservedCents = 0;
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      const paid = (paymentsByLoan[loan.id] ?? []).some((p) => p.paymentDate.startsWith(monthKey));
      if (paid) continue;
      reservedCents += convertCents(loan.monthlyPaymentCents, 'USD', ccy, rates);
    }

    const remainingCents = overall.limitCents - spentCents;
    const overBudget = remainingCents <= 0;
    const discretionaryCents = Math.max(0, remainingCents - reservedCents);
    const safeTodayCents = overBudget ? 0 : Math.floor(discretionaryCents / daysLeft);

    const expectedByNow = overall.limitCents * (elapsedDays / totalDays);
    let pace: SpendPace = 'on';
    if (overBudget) pace = 'over';
    else if (expectedByNow > 0 && spentCents > expectedByNow * 1.1) pace = 'fast';

    return {
      available: true,
      currency: ccy,
      safeTodayCents,
      remainingCents,
      reservedCents,
      capCents: overall.limitCents,
      spentCents,
      daysLeft,
      segments,
      overBudget,
      pace,
    };
    // `now` is captured per-render; monthKey/rates drive recompute across days.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgets, transactions, categories, loans, paymentsByLoan, rates, monthKey]);
}
