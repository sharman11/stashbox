/**
 * Portfolio-level debt-free projection for the home screen.
 *
 * Builds on the per-loan engine in math.ts to answer the headline questions:
 *   - "When am I debt-free?"  (all active loans paid at their own EMIs in
 *      parallel → the last one to finish sets the date)
 *   - "What if I paid $X extra?"  (avalanche: route the extra to the highest-
 *      APR loan, the mathematically optimal target, and re-project)
 *
 * Loans are USD-scoped in the MVP (see math.ts / formatCents), so no FX here.
 */

import type { StudentLoan } from '../types';
import { addMonths, projectFromLoan, todayYmd } from './math';

const BPS_DIVISOR = 10_000;
const MONTHS_PER_YEAR = 12;

export interface DebtFreeSummary {
  hasLoans: boolean;
  /** True if any active loan's payment doesn't cover its interest — the
   *  debt-free date is then meaningless and the UI shows a warning instead. */
  stalled: boolean;
  totalBalanceCents: number;
  totalOriginalCents: number;
  /** Months until the last active loan is paid off (parallel EMIs). */
  baselineMonths: number;
  baselineInterestCents: number;
  /** YYYY-MM-DD the whole portfolio reaches $0. */
  payoffDate: string;
  /** Highest-APR active loan — where an extra dollar does the most work. */
  targetLoan: StudentLoan | null;
}

export interface ExtraScenario {
  extraMonthlyCents: number;
  payoffDate: string;
  monthsShaved: number;
  interestSavedCents: number;
}

function firstMonthInterestCents(loan: StudentLoan): number {
  const periodic = loan.aprBps / BPS_DIVISOR / MONTHS_PER_YEAR;
  return loan.currentBalanceCents * periodic;
}

function activeLoans(loans: readonly StudentLoan[]): StudentLoan[] {
  return loans.filter((l) => l.status === 'active' && l.currentBalanceCents > 0);
}

export function buildDebtFreeSummary(loans: readonly StudentLoan[]): DebtFreeSummary {
  const active = activeLoans(loans);
  if (active.length === 0) {
    return {
      hasLoans: false,
      stalled: false,
      totalBalanceCents: 0,
      totalOriginalCents: 0,
      baselineMonths: 0,
      baselineInterestCents: 0,
      payoffDate: todayYmd(),
      targetLoan: null,
    };
  }

  const stalled = active.some((l) => l.monthlyPaymentCents <= firstMonthInterestCents(l));

  let baselineMonths = 0;
  let baselineInterestCents = 0;
  let totalBalanceCents = 0;
  let totalOriginalCents = 0;
  let targetLoan = active[0];

  for (const loan of active) {
    const proj = projectFromLoan(loan, 0);
    baselineMonths = Math.max(baselineMonths, proj.months);
    baselineInterestCents += proj.totalInterestCents;
    totalBalanceCents += loan.currentBalanceCents;
    totalOriginalCents += loan.originalPrincipalCents;
    if (loan.aprBps > targetLoan.aprBps) targetLoan = loan;
  }

  return {
    hasLoans: true,
    stalled,
    totalBalanceCents,
    totalOriginalCents,
    baselineMonths,
    baselineInterestCents,
    payoffDate: addMonths(todayYmd(), baselineMonths),
    targetLoan,
  };
}

/**
 * Re-project the portfolio with `extraMonthlyCents` routed to the highest-APR
 * loan (avalanche). Other loans keep their baseline EMIs. Returns the new
 * debt-free date plus the headline savings vs. baseline.
 *
 * Note: this is a single-target approximation — it does not yet "roll over"
 * the freed-up payment to the next loan once the target is cleared, so the
 * real-world savings are at least this good. Good enough for the home teaser.
 */
export function applyExtra(
  loans: readonly StudentLoan[],
  summary: DebtFreeSummary,
  extraMonthlyCents: number,
): ExtraScenario {
  const active = activeLoans(loans);
  const target = summary.targetLoan;
  if (!target || extraMonthlyCents <= 0) {
    return {
      extraMonthlyCents,
      payoffDate: summary.payoffDate,
      monthsShaved: 0,
      interestSavedCents: 0,
    };
  }

  let newMaxMonths = 0;
  let newInterestCents = 0;
  for (const loan of active) {
    const extra = loan.id === target.id ? extraMonthlyCents : 0;
    const proj = projectFromLoan(loan, extra);
    newMaxMonths = Math.max(newMaxMonths, proj.months);
    newInterestCents += proj.totalInterestCents;
  }

  return {
    extraMonthlyCents,
    payoffDate: addMonths(todayYmd(), newMaxMonths),
    monthsShaved: Math.max(0, summary.baselineMonths - newMaxMonths),
    interestSavedCents: Math.max(0, summary.baselineInterestCents - newInterestCents),
  };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2029-03-14" → "Mar 2029". */
export function formatMonthYear(ymd: string): string {
  const [y, m] = ymd.split('-').map(Number);
  if (!y || !m) return ymd;
  return `${MONTHS[m - 1] ?? ''} ${y}`;
}
