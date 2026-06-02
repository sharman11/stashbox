import type { ExpenseBudget, ExpenseTransaction, StudentLoan } from '../../types';
import { computeSafeToSpend } from '../safe-to-spend-core';

const RATES = { USD: 1 };
// Fixed reference date: 15 June 2026 (30-day month → 16 days left inclusive).
const NOW = new Date(2026, 5, 15, 12, 0, 0);

function budget(over: Partial<ExpenseBudget>): ExpenseBudget {
  return {
    id: 'bud', userId: 'u1', categoryId: null, periodMonth: '2026-06-01',
    limitCents: 300_000, currency: 'USD', createdAt: '2026-06-01', updatedAt: '2026-06-01', ...over,
  };
}
function tx(over: Partial<ExpenseTransaction>): ExpenseTransaction {
  return {
    id: Math.random().toString(36).slice(2), userId: 'u1', categoryId: 'food', amountCents: 1_000,
    currency: 'USD', type: 'expense', occurredOn: '2026-06-05', note: null,
    createdAt: '2026-06-05', updatedAt: '2026-06-05', ...over,
  };
}
function loan(over: Partial<StudentLoan>): StudentLoan {
  return {
    id: 'l1', userId: 'u1', nickname: 'Loan', loanType: 'private', servicer: null,
    originalPrincipalCents: 200_000, currentBalanceCents: 500_000, aprBps: 600, aprType: 'fixed',
    termMonthsRemaining: 120, monthlyPaymentCents: 20_000, dueDayOfMonth: 1, autopayOn: false,
    repaymentPlan: 'standard', reminderEnabled: true, status: 'active', createdAt: '2026-01-01',
    updatedAt: '2026-01-01', paidOffAt: null, ...over,
  };
}

describe('computeSafeToSpend', () => {
  it('is unavailable without an overall budget', () => {
    expect(computeSafeToSpend([], [], [], [], {}, RATES, NOW).available).toBe(false);
  });

  it('spreads remaining over the days left (today inclusive)', () => {
    // cap $3000, spent $600 → $2400 remaining / 16 days = $150/day = 15000c.
    const r = computeSafeToSpend([budget({})], [tx({ amountCents: 60_000 })], [], [], {}, RATES, NOW);
    expect(r.remainingCents).toBe(240_000);
    expect(r.daysLeft).toBe(16);
    expect(r.safeTodayCents).toBe(15_000);
  });

  it('reserves an unpaid loan payment from the daily allowance', () => {
    // cap $3000, spent $600, reserve $200 loan → $2200 / 16 = 13750c.
    const r = computeSafeToSpend([budget({})], [tx({ amountCents: 60_000 })], [], [loan({})], {}, RATES, NOW);
    expect(r.reservedCents).toBe(20_000);
    expect(r.safeTodayCents).toBe(13_750);
  });

  it('skips future-dated transactions', () => {
    const r = computeSafeToSpend(
      [budget({})],
      [tx({ amountCents: 60_000, occurredOn: '2026-06-05' }), tx({ amountCents: 99_000, occurredOn: '2026-06-28' })],
      [], [], {}, RATES, NOW,
    );
    expect(r.spentCents).toBe(60_000); // the 28th is in the future relative to the 15th
  });

  it('reports over budget and zero safe-to-spend', () => {
    const r = computeSafeToSpend([budget({ limitCents: 50_000 })], [tx({ amountCents: 60_000 })], [], [], {}, RATES, NOW);
    expect(r.overBudget).toBe(true);
    expect(r.safeTodayCents).toBe(0);
    expect(r.pace).toBe('over');
  });
});
