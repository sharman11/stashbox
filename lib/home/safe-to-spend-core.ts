/**
 * Pure core of "safe to spend today" (Model 2). No store imports, so it's
 * unit-testable; the hook in safe-to-spend.ts wires the stores + frozen-month
 * FX and calls this with `now` and `rates`.
 *
 *   spentToDate   = this month's expenses up to and including today
 *   reserved      = detected recurring charges not yet seen this month
 *   remaining     = overall monthly cap − spentToDate
 *   discretionary = max(0, remaining − reserved)
 *   safeToday     = discretionary / daysLeft   (today-inclusive, ≥ 1)
 */

import type { CurrencyCode } from '@/lib/currency';
import { convertCents } from '@/lib/expenses/fx';
import { detectRecurring, priorMonthKeys } from '@/lib/expenses/insights';
import type { ExpenseBudget, ExpenseCategory, ExpenseTransaction } from '@/lib/types';

export type SpendPace = 'on' | 'fast' | 'over';

export interface SpendSegment {
  color: string;
  cents: number;
}

export interface SafeToSpend {
  available: boolean;
  currency: CurrencyCode;
  safeTodayCents: number;
  remainingCents: number;
  reservedCents: number;
  capCents: number;
  spentCents: number;
  daysLeft: number;
  segments: SpendSegment[];
  overBudget: boolean;
  pace: SpendPace;
}

const UNCATEGORIZED_COLOR = '#94A3B8';

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const EMPTY_SAFE_TO_SPEND: SafeToSpend = {
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

export function computeSafeToSpend(
  budgets: readonly ExpenseBudget[],
  transactions: readonly ExpenseTransaction[],
  categories: readonly ExpenseCategory[],
  rates: Record<string, number>,
  now: Date,
): SafeToSpend {
  const monthKey = ymd(now).slice(0, 7);
  const overall = budgets.find((b) => b.categoryId === null && b.periodMonth.slice(0, 7) === monthKey);
  if (!overall || overall.limitCents <= 0) return EMPTY_SAFE_TO_SPEND;

  const today = ymd(now);
  const totalDays = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const elapsedDays = Math.min(now.getDate(), totalDays);
  const daysLeft = Math.max(1, totalDays - elapsedDays + 1);

  const ccy = overall.currency;

  const byCategory = new Map<string | null, number>();
  let spentCents = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!t.occurredOn.startsWith(monthKey)) continue;
    if (t.occurredOn > today) continue; // skip future-dated
    const cents = convertCents(t.amountCents, t.currency, ccy, rates);
    spentCents += cents;
    byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + cents);
  }

  const colorById = new Map(categories.map((c) => [c.id, c.color]));
  const segments: SpendSegment[] = [];
  for (const [catId, cents] of byCategory) {
    if (cents <= 0) continue;
    const color = (catId && colorById.get(catId)) || UNCATEGORIZED_COLOR;
    segments.push({ color, cents });
  }
  segments.sort((a, b) => b.cents - a.cents);

  let reservedCents = 0;
  // Detected recurring charges (subscriptions/bills) that haven't hit yet
  // this month — reserve so they don't blow the daily allowance later.
  const recentMonths = [monthKey, ...priorMonthKeys(monthKey, 3)];
  const recurring = detectRecurring(transactions, rates, ccy, recentMonths);
  const seenThisMonth = new Set<string>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!t.occurredOn.startsWith(monthKey) || t.occurredOn > today) continue;
    const dollar = Math.round(convertCents(t.amountCents, t.currency, ccy, rates) / 100);
    seenThisMonth.add(`${t.categoryId ?? 'none'}|${dollar}`);
  }
  for (const item of recurring.items) {
    const key = `${item.categoryId ?? 'none'}|${Math.round(item.monthlyCents / 100)}`;
    if (!seenThisMonth.has(key)) reservedCents += item.monthlyCents;
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
}
