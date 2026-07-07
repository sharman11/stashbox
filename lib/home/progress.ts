/**
 * Proof-of-value: the cumulative good the app has helped the user do. This is
 * the renewal driver — a returning, growing tally that makes the subscription
 * obviously worth it. Pure + testable; everything normalized to the home
 * currency (goals are multi-currency major units).
 */

import type { CurrencyCode } from '@/lib/currency';
import { convertCents } from '@/lib/expenses/fx';
import type { Cell, Moneybox } from '@/lib/types';

export interface ProgressReport {
  /** Total saved across all moneyboxes (home-currency cents). */
  savedCents: number;
  hasAny: boolean;
}

export function computeProgress(
  moneyboxes: readonly Moneybox[],
  cellsByMoneybox: Record<string, readonly Cell[]>,
  rates: Record<string, number>,
  ccy: CurrencyCode,
): ProgressReport {
  let savedCents = 0;
  for (const box of moneyboxes) {
    const cells = cellsByMoneybox[box.id] ?? [];
    const savedMajor = cells.filter((c) => c.isFilled).reduce((s, c) => s + c.amount, 0);
    if (savedMajor > 0) {
      savedCents += convertCents(Math.round(savedMajor * 100), box.currency, ccy, rates);
    }
  }

  return {
    savedCents,
    hasAny: savedCents > 0,
  };
}
