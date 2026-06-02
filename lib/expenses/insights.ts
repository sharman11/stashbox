/**
 * Spending intelligence for the Expenses tab (Stashbox+).
 *
 * Two insights derived from the transaction history:
 *   - Anomalies: a category whose current-month spend is well above its own
 *     trailing average (you're trending hot in Dining).
 *   - Recurring: same-amount, same-category charges that repeat most months —
 *     a heuristic for subscriptions/bills ("~$52/mo in recurring charges").
 *
 * These are PURE functions (no store imports) so they stay unit-testable; the
 * hook that wires stores + FX lives in components/expenses/InsightsCard.tsx.
 */

import type { CurrencyCode } from '@/lib/currency';
import { convertCents } from '@/lib/expenses/fx';
import type { ExpenseTransaction } from '@/lib/types';

export interface Anomaly {
  categoryId: string;
  currentCents: number;
  avgCents: number;
  /** How far above the trailing average, as a whole-number percent. */
  pctOver: number;
}

export interface RecurringItem {
  categoryId: string | null;
  monthlyCents: number;
  /** Number of distinct months this charge appeared. */
  months: number;
}

export interface SpendingInsights {
  available: boolean;
  currency: CurrencyCode;
  anomalies: Anomaly[];
  recurring: { items: RecurringItem[]; totalCents: number };
}

/** "2026-06" → ["2026-05","2026-04","2026-03"] for n = 3. */
export function priorMonthKeys(current: string, n: number): string[] {
  const [y, m] = current.split('-').map(Number);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) {
    const d = new Date(Date.UTC(y, m - 1 - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

export function detectAnomalies(
  txns: readonly ExpenseTransaction[],
  rates: Record<string, number>,
  ccy: CurrencyCode,
  current: string,
  prior: readonly string[],
  floorCents = 2_000,
): Anomaly[] {
  const cur = new Map<string, number>();
  const priorSum = new Map<string, number>();
  const priorSet = new Set(prior);

  for (const t of txns) {
    if (t.type !== 'expense' || !t.categoryId) continue;
    const mk = t.occurredOn.slice(0, 7);
    const cents = convertCents(t.amountCents, t.currency, ccy, rates);
    if (mk === current) cur.set(t.categoryId, (cur.get(t.categoryId) ?? 0) + cents);
    else if (priorSet.has(mk)) priorSum.set(t.categoryId, (priorSum.get(t.categoryId) ?? 0) + cents);
  }

  const out: Anomaly[] = [];
  for (const [categoryId, currentCents] of cur) {
    const avg = (priorSum.get(categoryId) ?? 0) / Math.max(1, prior.length);
    if (avg < floorCents) continue; // ignore noise on tiny categories
    if (currentCents > avg * 1.25) {
      out.push({ categoryId, currentCents, avgCents: Math.round(avg), pctOver: Math.round((currentCents / avg - 1) * 100) });
    }
  }
  out.sort((a, b) => b.pctOver - a.pctOver);
  return out;
}

export function detectRecurring(
  txns: readonly ExpenseTransaction[],
  rates: Record<string, number>,
  ccy: CurrencyCode,
  recentMonths: readonly string[],
  minMonths = 3,
): { items: RecurringItem[]; totalCents: number } {
  const recent = new Set(recentMonths);
  const groups = new Map<string, { categoryId: string | null; dollar: number; months: Set<string> }>();

  for (const t of txns) {
    if (t.type !== 'expense') continue;
    const mk = t.occurredOn.slice(0, 7);
    if (!recent.has(mk)) continue;
    const dollar = Math.round(convertCents(t.amountCents, t.currency, ccy, rates) / 100);
    if (dollar <= 0) continue;
    const key = `${t.categoryId ?? 'none'}|${dollar}`;
    let g = groups.get(key);
    if (!g) {
      g = { categoryId: t.categoryId, dollar, months: new Set() };
      groups.set(key, g);
    }
    g.months.add(mk);
  }

  const items: RecurringItem[] = [];
  let totalCents = 0;
  for (const g of groups.values()) {
    if (g.months.size < minMonths) continue;
    const monthlyCents = g.dollar * 100;
    items.push({ categoryId: g.categoryId, monthlyCents, months: g.months.size });
    totalCents += monthlyCents;
  }
  items.sort((a, b) => b.monthlyCents - a.monthlyCents);
  return { items, totalCents };
}

/**
 * Compose the full insights from a transaction list + rates + month windows.
 * Pure; the hook (in the card) supplies `current`/`prior3`/`recent4`.
 */
export function computeInsights(
  transactions: readonly ExpenseTransaction[],
  rates: Record<string, number>,
  ccy: CurrencyCode,
  current: string,
): SpendingInsights {
  const prior3 = priorMonthKeys(current, 3);
  const recent4 = [current, ...prior3];
  const monthsWithData = new Set(
    transactions.filter((t) => t.type === 'expense').map((t) => t.occurredOn.slice(0, 7)),
  );
  return {
    available: monthsWithData.size >= 2,
    currency: ccy,
    anomalies: detectAnomalies(transactions, rates, ccy, current, prior3),
    recurring: detectRecurring(transactions, rates, ccy, recent4),
  };
}
