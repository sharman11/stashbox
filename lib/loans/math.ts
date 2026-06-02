/** Amortization + payoff projection for student loans.
 *
 *  All monetary inputs and outputs are in cents (integer) to avoid the
 *  float-drift you'd otherwise get from compounding many small numbers
 *  across hundreds of months. The single conversion to/from dollars
 *  happens at the display boundary (see formatCents below).
 *
 *  APR is in basis points (650 = 6.50%). The formula uses APR/12 as the
 *  periodic rate. Federal loans technically accrue simple daily interest
 *  (balance * APR/365 per day) — for the purpose of computing a *monthly
 *  payment estimate* the difference is on the order of cents, immaterial
 *  to user-facing UX. For payoff *projections* with extra payments we
 *  keep the same monthly model because the projection itself is a
 *  rough plan, not a contractual schedule.
 */

import type { StudentLoan } from '../types';

const MONTHS_PER_YEAR = 12;
const BPS_DIVISOR = 10_000;
const CENTS_DIVISOR = 100;

/** Round to nearest cent, then return as integer cents. */
function toCents(amountCents: number): number {
  return Math.round(amountCents);
}

/** Standard amortization: monthly payment for a fully-amortizing loan.
 *
 *    M = P * (r * (1+r)^n) / ((1+r)^n - 1)
 *
 *  where P = principal, r = APR/12 (decimal), n = months.
 *  Handles the r=0 edge case (interest-free → straight division).
 */
export function calcMonthlyPayment(
  principalCents: number,
  aprBps: number,
  termMonths: number,
): number {
  if (principalCents <= 0 || termMonths <= 0) return 0;
  const r = aprBps / BPS_DIVISOR / MONTHS_PER_YEAR;
  if (r === 0) return toCents(principalCents / termMonths);
  const pow = Math.pow(1 + r, termMonths);
  const m = (principalCents * r * pow) / (pow - 1);
  return toCents(m);
}

/** One step of amortization: split a payment into interest + principal,
 *  using the periodic rate. */
export function splitPayment(
  balanceCents: number,
  aprBps: number,
  paymentCents: number,
): { interestCents: number; principalCents: number; newBalanceCents: number } {
  const r = aprBps / BPS_DIVISOR / MONTHS_PER_YEAR;
  const interestCents = toCents(balanceCents * r);
  // Cap principal at the remaining balance — final payment is often smaller.
  const principalCents = Math.min(
    Math.max(0, paymentCents - interestCents),
    balanceCents,
  );
  const newBalanceCents = Math.max(0, balanceCents - principalCents);
  return { interestCents, principalCents, newBalanceCents };
}

export interface PayoffProjection {
  /** Months until balance reaches zero under the projection. */
  months: number;
  /** Total dollars-in-cents paid over the life of the loan from today. */
  totalPaidCents: number;
  /** Total interest paid from today to payoff. */
  totalInterestCents: number;
  /** ISO date (YYYY-MM-DD) when the loan is projected to hit $0. */
  payoffDate: string;
}

interface ProjectInput {
  balanceCents: number;
  aprBps: number;
  monthlyPaymentCents: number;
  /** Extra principal added each month on top of the EMI. Default 0. */
  extraMonthlyCents?: number;
  /** Safety cap so a pathological case (payment <= interest) doesn't loop. */
  maxMonths?: number;
}

/** Project months-to-payoff for a fixed monthly payment, optionally with
 *  an extra-principal add-on each month. Returns the payoff date relative
 *  to today.
 *
 *  Pathological case: if monthlyPayment + extra <= monthly interest, the
 *  balance grows. We bail at maxMonths and return that as the result —
 *  caller surfaces a "this loan will never pay off at the current
 *  payment" warning. */
export function projectPayoff(input: ProjectInput): PayoffProjection {
  const {
    balanceCents,
    aprBps,
    monthlyPaymentCents,
    extraMonthlyCents = 0,
    maxMonths = 600,
  } = input;

  if (balanceCents <= 0) {
    return {
      months: 0,
      totalPaidCents: 0,
      totalInterestCents: 0,
      payoffDate: todayYmd(),
    };
  }

  let balance = balanceCents;
  let totalPaid = 0;
  let totalInterest = 0;
  let months = 0;

  const periodic = aprBps / BPS_DIVISOR / MONTHS_PER_YEAR;

  while (balance > 0 && months < maxMonths) {
    const interest = toCents(balance * periodic);
    const principalCap = balance;
    const wantedPrincipal = monthlyPaymentCents - interest + extraMonthlyCents;

    if (wantedPrincipal <= 0) {
      // Payment doesn't cover interest. Bail — caller treats this as a
      // "will not pay off" signal.
      months = maxMonths;
      break;
    }

    const principal = Math.min(wantedPrincipal, principalCap);
    const paid = interest + principal;

    balance -= principal;
    totalPaid += paid;
    totalInterest += interest;
    months += 1;
  }

  return {
    months,
    totalPaidCents: totalPaid,
    totalInterestCents: totalInterest,
    payoffDate: addMonths(todayYmd(), months),
  };
}

/** Convenience: project against a `StudentLoan` row. */
export function projectFromLoan(
  loan: Pick<StudentLoan, 'currentBalanceCents' | 'aprBps' | 'monthlyPaymentCents'>,
  extraMonthlyCents = 0,
): PayoffProjection {
  return projectPayoff({
    balanceCents: loan.currentBalanceCents,
    aprBps: loan.aprBps,
    monthlyPaymentCents: loan.monthlyPaymentCents,
    extraMonthlyCents,
  });
}

/** Side-by-side comparison: minimum payment vs. with an extra add-on.
 *  Returned `interestSavedCents` is the headline number the UI shows. */
export interface ExtraPaymentComparison {
  baseline: PayoffProjection;
  accelerated: PayoffProjection;
  monthsShaved: number;
  interestSavedCents: number;
}

export function compareExtraPayment(
  loan: Pick<StudentLoan, 'currentBalanceCents' | 'aprBps' | 'monthlyPaymentCents'>,
  extraMonthlyCents: number,
): ExtraPaymentComparison {
  const baseline = projectFromLoan(loan, 0);
  const accelerated = projectFromLoan(loan, extraMonthlyCents);
  return {
    baseline,
    accelerated,
    monthsShaved: Math.max(0, baseline.months - accelerated.months),
    interestSavedCents: Math.max(
      0,
      baseline.totalInterestCents - accelerated.totalInterestCents,
    ),
  };
}

/* ── Date helpers (UTC-safe, no dependency on user timezone) ──────── */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Add `months` whole months to a YYYY-MM-DD date. Day-of-month is
 *  clamped to the last day of the target month (handles Jan 31 → Feb 28). */
export function addMonths(ymd: string, months: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  if (!y || !m || !d) return ymd;
  const date = new Date(Date.UTC(y, m - 1, 1));
  date.setUTCMonth(date.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, lastDay));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

/* ── Display helpers ──────────────────────────────────────────────── */

/** Cents → "$1,234.56" (USD only — student loans are US-scoped in MVP). */
export function formatCents(cents: number): string {
  const dollars = cents / CENTS_DIVISOR;
  return dollars.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

/** APR basis points → "6.50%". */
export function formatApr(aprBps: number): string {
  return `${(aprBps / 100).toFixed(2)}%`;
}

/** Months → "3 yrs 4 mos" / "11 mos" / "1 yr". */
export function formatDuration(months: number): string {
  if (months <= 0) return '0 mos';
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y === 0) return `${m} mo${m === 1 ? '' : 's'}`;
  if (m === 0) return `${y} yr${y === 1 ? '' : 's'}`;
  return `${y} yr${y === 1 ? '' : 's'} ${m} mo${m === 1 ? '' : 's'}`;
}
