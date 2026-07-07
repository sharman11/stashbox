import type { ExpenseBudget, ExpenseTransaction } from '../../types';
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

describe('computeSafeToSpend', () => {
  it('is unavailable without an overall budget', () => {
    expect(computeSafeToSpend([], [], [], RATES, NOW).available).toBe(false);
  });

  it('spreads remaining over the days left (today inclusive)', () => {
    // cap $3000, spent $600 → $2400 remaining / 16 days = $150/day = 15000c.
    const r = computeSafeToSpend([budget({})], [tx({ amountCents: 60_000 })], [], RATES, NOW);
    expect(r.remainingCents).toBe(240_000);
    expect(r.daysLeft).toBe(16);
    expect(r.safeTodayCents).toBe(15_000);
  });

  it('skips future-dated transactions', () => {
    const r = computeSafeToSpend(
      [budget({})],
      [tx({ amountCents: 60_000, occurredOn: '2026-06-05' }), tx({ amountCents: 99_000, occurredOn: '2026-06-28' })],
      [], RATES, NOW,
    );
    expect(r.spentCents).toBe(60_000); // the 28th is in the future relative to the 15th
  });

  it('reserves a recurring bill that has not hit yet this month', () => {
    // A $50 subscription in the 3 prior months but not yet in June → reserved.
    const subs = ['2026-05', '2026-04', '2026-03'].map((m) =>
      tx({ categoryId: 'subs', amountCents: 5_000, occurredOn: `${m}-09` }),
    );
    const r = computeSafeToSpend([budget({})], subs, [], RATES, NOW);
    expect(r.reservedCents).toBe(5_000);
  });

  it('does not reserve a recurring bill already paid this month', () => {
    const subs = ['2026-06', '2026-05', '2026-04', '2026-03'].map((m) =>
      tx({ categoryId: 'subs', amountCents: 5_000, occurredOn: `${m}-09` }),
    );
    const r = computeSafeToSpend([budget({})], subs, [], RATES, NOW);
    expect(r.reservedCents).toBe(0); // June's charge already counted in spend
  });

  it('reports over budget and zero safe-to-spend', () => {
    const r = computeSafeToSpend([budget({ limitCents: 50_000 })], [tx({ amountCents: 60_000 })], [], RATES, NOW);
    expect(r.overBudget).toBe(true);
    expect(r.safeTodayCents).toBe(0);
    expect(r.pace).toBe('over');
  });
});
