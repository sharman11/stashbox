/**
 * Net-worth trajectory: savings − debt as one number, projected forward.
 *
 * Net improves each month by (recent savings rate) + (loan principal paid),
 * so for someone underwater we can estimate when they cross to net-positive.
 * Pure + testable; the hook supplies `now` and `rates`. Savings are
 * multi-currency major units; loan balances are USD cents — all normalized to
 * the home currency.
 */

import type { CurrencyCode } from '@/lib/currency';
import { convertCents } from '@/lib/expenses/fx';
import { addMonths } from '@/lib/loans/math';
import type { Cell, Moneybox, StudentLoan } from '@/lib/types';

const BPS_DIVISOR = 10_000;
const MONTHS_PER_YEAR = 12;

export interface NetWorth {
  available: boolean;
  netCents: number;
  savingsCents: number;
  debtCents: number;
  /** Estimated net improvement per month (home-currency cents). */
  monthlyDeltaCents: number;
  /** Months until net-positive (0 if already; null if not improving). */
  monthsToPositive: number | null;
  positiveDate: string | null;
  projected12moCents: number;
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function addDaysYmd(today: string, n: number): string {
  const [y, m, d] = today.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d));
  t.setUTCDate(t.getUTCDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

export function computeNetWorth(
  moneyboxes: readonly Moneybox[],
  cellsByMoneybox: Record<string, readonly Cell[]>,
  loans: readonly StudentLoan[],
  rates: Record<string, number>,
  ccy: CurrencyCode,
  now: Date,
): NetWorth {
  const today = ymd(now);
  const cutoff = addDaysYmd(today, -30); // trailing ~1 month for the savings rate

  let savingsCents = 0;
  let recentSavingsCents = 0;
  for (const box of moneyboxes) {
    const cells = cellsByMoneybox[box.id] ?? [];
    let saved = 0;
    let recent = 0;
    for (const c of cells) {
      if (!c.isFilled) continue;
      saved += c.amount;
      if (c.filledAt && c.filledAt.slice(0, 10) >= cutoff) recent += c.amount;
    }
    if (saved > 0) savingsCents += convertCents(Math.round(saved * 100), box.currency, ccy, rates);
    if (recent > 0) recentSavingsCents += convertCents(Math.round(recent * 100), box.currency, ccy, rates);
  }

  let debtCents = 0;
  let monthlyPrincipalCents = 0;
  for (const loan of loans) {
    if (loan.status !== 'active') continue;
    debtCents += convertCents(loan.currentBalanceCents, 'USD', ccy, rates);
    const interest = Math.round(loan.currentBalanceCents * (loan.aprBps / BPS_DIVISOR / MONTHS_PER_YEAR));
    const principal = Math.max(0, loan.monthlyPaymentCents - interest);
    monthlyPrincipalCents += convertCents(principal, 'USD', ccy, rates);
  }

  const netCents = savingsCents - debtCents;
  const monthlyDeltaCents = recentSavingsCents + monthlyPrincipalCents;
  const monthsToPositive = netCents >= 0 ? 0 : monthlyDeltaCents > 0 ? Math.ceil(-netCents / monthlyDeltaCents) : null;
  const positiveDate = monthsToPositive !== null && monthsToPositive > 0 ? addMonths(today, monthsToPositive) : null;

  return {
    available: savingsCents > 0 || debtCents > 0,
    netCents,
    savingsCents,
    debtCents,
    monthlyDeltaCents,
    monthsToPositive,
    positiveDate,
    projected12moCents: netCents + 12 * monthlyDeltaCents,
  };
}
