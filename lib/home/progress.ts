/**
 * Proof-of-value: the cumulative good the app has helped the user do. This is
 * the renewal driver — a returning, growing tally that makes the subscription
 * obviously worth it. Pure + testable; everything normalized to the home
 * currency (goals are multi-currency major units; loan interest is USD cents).
 */

import type { CurrencyCode } from '@/lib/currency';
import { convertCents } from '@/lib/expenses/fx';
import { interestAvoidedSoFar } from '@/lib/loans/payoff-summary';
import type { Cell, LoanPayment, Moneybox, StudentLoan } from '@/lib/types';

export interface ProgressReport {
  /** Total saved across all moneyboxes (home-currency cents). */
  savedCents: number;
  /** Estimated loan interest avoided by extra principal (home-currency cents). */
  interestAvoidedCents: number;
  hasAny: boolean;
}

export function computeProgress(
  moneyboxes: readonly Moneybox[],
  cellsByMoneybox: Record<string, readonly Cell[]>,
  loans: readonly StudentLoan[],
  paymentsByLoan: Record<string, readonly LoanPayment[]>,
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

  const { avoidedCents } = interestAvoidedSoFar(loans, paymentsByLoan); // USD cents
  const interestAvoidedCents = avoidedCents > 0 ? convertCents(avoidedCents, 'USD', ccy, rates) : 0;

  return {
    savedCents,
    interestAvoidedCents,
    hasAny: savedCents > 0 || interestAvoidedCents > 0,
  };
}
