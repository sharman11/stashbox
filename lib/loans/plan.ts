/**
 * Debt avalanche payoff plan with rollover.
 *
 * Simulates paying every loan its minimum (EMI) each month, then directing all
 * spare budget — the user's extra contribution PLUS the freed-up payments of
 * any loan already cleared (the "rollover") — at the highest-APR remaining
 * loan. This is the mathematically optimal interest-minimizing strategy.
 *
 * The comparison baseline is "minimum payments, no strategy": each loan paid
 * only its own EMI, in isolation, with freed payments NOT redirected. The gap
 * between the two is the value the plan delivers — and it's positive even when
 * the user adds $0 extra, purely from rolling freed payments forward.
 *
 * All cents, USD (loans are US-scoped). A "plan, not advice" estimate.
 */

import type { StudentLoan } from '../types';
import { addMonths, projectFromLoan, todayYmd } from './math';

const BPS_DIVISOR = 10_000;
const MONTHS_PER_YEAR = 12;
const MAX_MONTHS = 720;

export interface PlanStep {
  loanId: string;
  nickname: string;
  aprBps: number;
  /** Month index (1-based) this loan is projected to hit $0 under the plan. */
  payoffMonth: number;
}

export interface AvalanchePlan {
  hasLoans: boolean;
  /** True if the monthly budget can't cover interest — balances never clear. */
  stalled: boolean;
  /** Total monthly outlay the plan assumes (sum of EMIs + extra). */
  monthlyBudgetCents: number;
  debtFreeMonths: number;
  payoffDate: string;
  totalInterestCents: number;
  /** Interest under "minimum payments, no rollover" — the do-nothing baseline. */
  baselineInterestCents: number;
  interestSavedCents: number;
  monthsSaved: number;
  /** Loans in the order the plan clears them (the attack order). */
  steps: PlanStep[];
}

interface SimLoan {
  id: string;
  nickname: string;
  aprBps: number;
  emiCents: number;
  balance: number;
}

const EMPTY: AvalanchePlan = {
  hasLoans: false,
  stalled: false,
  monthlyBudgetCents: 0,
  debtFreeMonths: 0,
  payoffDate: todayYmd(),
  totalInterestCents: 0,
  baselineInterestCents: 0,
  interestSavedCents: 0,
  monthsSaved: 0,
  steps: [],
};

export function computeAvalanchePlan(
  loans: readonly StudentLoan[],
  extraMonthlyCents = 0,
): AvalanchePlan {
  const source = loans.filter((l) => l.status === 'active' && l.currentBalanceCents > 0);
  if (source.length === 0) return EMPTY;

  // Baseline: each loan on its own EMI, in isolation, no rollover.
  let baselineInterest = 0;
  let baselineMonths = 0;
  for (const l of source) {
    const p = projectFromLoan(l, 0);
    baselineInterest += p.totalInterestCents;
    baselineMonths = Math.max(baselineMonths, p.months);
  }

  // The plan keeps total monthly outlay constant and redirects it as loans clear.
  const monthlyBudget = source.reduce((s, l) => s + l.monthlyPaymentCents, 0) + Math.max(0, extraMonthlyCents);

  let active: SimLoan[] = source.map((l) => ({
    id: l.id,
    nickname: l.nickname,
    aprBps: l.aprBps,
    emiCents: l.monthlyPaymentCents,
    balance: l.currentBalanceCents,
  }));

  const steps: PlanStep[] = [];
  const recorded = new Set<string>();
  let months = 0;
  let totalInterest = 0;

  while (active.some((l) => l.balance > 0) && months < MAX_MONTHS) {
    months += 1;
    let budget = monthlyBudget;

    // 1. Accrue + service interest on every active loan (so balances don't grow).
    for (const l of active) {
      const interest = Math.round(l.balance * (l.aprBps / BPS_DIVISOR / MONTHS_PER_YEAR));
      totalInterest += interest;
      const pay = Math.min(budget, interest);
      budget -= pay;
      l.balance += interest - pay; // grows only if budget couldn't cover interest
    }

    // 2. Throw all remaining budget at principal, highest APR first (avalanche).
    const byApr = [...active].sort((a, b) => b.aprBps - a.aprBps);
    for (const l of byApr) {
      if (budget <= 0) break;
      const pay = Math.min(budget, l.balance);
      l.balance -= pay;
      budget -= pay;
    }

    for (const l of active) {
      if (l.balance <= 0 && !recorded.has(l.id)) {
        recorded.add(l.id);
        steps.push({ loanId: l.id, nickname: l.nickname, aprBps: l.aprBps, payoffMonth: months });
      }
    }
    active = active.filter((l) => l.balance > 0);
  }

  const stalled = months >= MAX_MONTHS && active.some((l) => l.balance > 0);
  steps.sort((a, b) => a.payoffMonth - b.payoffMonth);

  return {
    hasLoans: true,
    stalled,
    monthlyBudgetCents: monthlyBudget,
    debtFreeMonths: months,
    payoffDate: addMonths(todayYmd(), months),
    totalInterestCents: totalInterest,
    baselineInterestCents: baselineInterest,
    interestSavedCents: Math.max(0, baselineInterest - totalInterest),
    monthsSaved: Math.max(0, baselineMonths - months),
    steps,
  };
}
