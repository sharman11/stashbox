import type { ExpenseTransaction } from '../../types';
import { detectAnomalies, detectRecurring, priorMonthKeys } from '../insights';

const RATES = { USD: 1 };

function tx(over: Partial<ExpenseTransaction>): ExpenseTransaction {
  return {
    id: Math.random().toString(36).slice(2),
    userId: 'u1',
    categoryId: 'food',
    amountCents: 1_000,
    currency: 'USD',
    type: 'expense',
    occurredOn: '2026-06-01',
    note: null,
    createdAt: '2026-06-01',
    updatedAt: '2026-06-01',
    ...over,
  };
}

describe('priorMonthKeys', () => {
  it('walks back across a year boundary', () => {
    expect(priorMonthKeys('2026-06', 3)).toEqual(['2026-05', '2026-04', '2026-03']);
    expect(priorMonthKeys('2026-01', 2)).toEqual(['2025-12', '2025-11']);
  });
});

describe('detectAnomalies', () => {
  it('flags a category trending above its trailing average', () => {
    const txns = [
      // prior 3 months: ~$50/mo in food
      tx({ occurredOn: '2026-05-10', amountCents: 5_000 }),
      tx({ occurredOn: '2026-04-10', amountCents: 5_000 }),
      tx({ occurredOn: '2026-03-10', amountCents: 5_000 }),
      // current month: $90 → 80% over the $50 average
      tx({ occurredOn: '2026-06-05', amountCents: 9_000 }),
    ];
    const out = detectAnomalies(txns, RATES, 'USD', '2026-06', ['2026-05', '2026-04', '2026-03']);
    expect(out).toHaveLength(1);
    expect(out[0].categoryId).toBe('food');
    expect(out[0].pctOver).toBe(80);
  });

  it('ignores categories near or below the trailing average', () => {
    const txns = [
      tx({ occurredOn: '2026-05-10', amountCents: 5_000 }),
      tx({ occurredOn: '2026-04-10', amountCents: 5_000 }),
      tx({ occurredOn: '2026-03-10', amountCents: 5_000 }),
      tx({ occurredOn: '2026-06-05', amountCents: 5_000 }),
    ];
    expect(detectAnomalies(txns, RATES, 'USD', '2026-06', ['2026-05', '2026-04', '2026-03'])).toHaveLength(0);
  });
});

describe('detectRecurring', () => {
  it('detects a same-amount monthly charge across 3+ months', () => {
    const months = ['2026-06', '2026-05', '2026-04', '2026-03'];
    const txns = months.map((m) => tx({ categoryId: 'subs', amountCents: 1_549, occurredOn: `${m}-12` }));
    const { items, totalCents } = detectRecurring(txns, RATES, 'USD', months);
    expect(items).toHaveLength(1);
    expect(items[0].categoryId).toBe('subs');
    expect(totalCents).toBe(1_500); // $15.49 → $15 (whole-dollar grouping)
  });

  it('does not flag one-off purchases', () => {
    const months = ['2026-06', '2026-05', '2026-04'];
    const txns = [tx({ amountCents: 9_999, occurredOn: '2026-06-12' })];
    expect(detectRecurring(txns, RATES, 'USD', months).items).toHaveLength(0);
  });
});
