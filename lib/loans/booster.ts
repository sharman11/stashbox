/**
 * "Payoff Booster" math: the effect of a ONE-TIME extra principal payment
 * (a completed savings vault applied to a loan) — distinct from
 * `compareExtraPayment`, which models a recurring monthly extra.
 *
 * We hold the monthly payment constant and compare the payoff projection with
 * vs. without the lump knocked off the balance today. Lump and balance are USD
 * cents (student loans are US-scoped in the MVP).
 */

import type { StudentLoan } from '@/lib/types';
import { projectPayoff } from './math';

export interface BoosterImpact {
  /** Future interest avoided by applying the lump now (USD cents). */
  interestSavedCents: number;
  /** Whole months knocked off the payoff date. */
  monthsShaved: number;
  /** True if the lump fully clears the remaining balance. */
  paysOff: boolean;
}

export function computeBoosterImpact(
  loan: Pick<StudentLoan, 'currentBalanceCents' | 'aprBps' | 'monthlyPaymentCents'>,
  lumpCents: number,
): BoosterImpact {
  const lump = Math.max(0, Math.min(lumpCents, loan.currentBalanceCents));

  const baseline = projectPayoff({
    balanceCents: loan.currentBalanceCents,
    aprBps: loan.aprBps,
    monthlyPaymentCents: loan.monthlyPaymentCents,
  });
  const afterLump = projectPayoff({
    balanceCents: loan.currentBalanceCents - lump,
    aprBps: loan.aprBps,
    monthlyPaymentCents: loan.monthlyPaymentCents,
  });

  return {
    interestSavedCents: Math.max(0, baseline.totalInterestCents - afterLump.totalInterestCents),
    monthsShaved: Math.max(0, baseline.months - afterLump.months),
    paysOff: lump >= loan.currentBalanceCents,
  };
}
