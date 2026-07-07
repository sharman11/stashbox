import type { Cell, Moneybox } from '../../types';
import { computeProgress } from '../progress';

const RATES = { USD: 1, EUR: 0.5 };

function box(over: Partial<Moneybox>): Moneybox {
  return {
    id: 'b1', userId: 'u1', name: 'Vacation', icon: '✈️', stashSpot: null,
    theme: 'emerald' as Moneybox['theme'], currency: 'USD', goalAmount: 1000, targetDays: 100,
    gridRows: 10, gridCols: 10, status: 'active', createdAt: '2026-05-02', completedAt: null,
    milestonesTriggered: [], ...over,
  };
}
function cell(amount: number): Cell {
  return { id: Math.random().toString(36).slice(2), moneyboxId: 'b1', row: 0, col: 0, amount, isFilled: true, filledAt: '2026-05-10' };
}

describe('computeProgress', () => {
  it('is empty with no saving', () => {
    const r = computeProgress([], {}, RATES, 'USD');
    expect(r.hasAny).toBe(false);
  });

  it('sums saved across goals and converts to the home currency', () => {
    // $200 saved in a USD box, shown in EUR (rate 0.5) → €100 = 10000 cents.
    const r = computeProgress([box({})], { b1: [cell(200)] }, RATES, 'EUR');
    expect(r.savedCents).toBe(10_000);
    expect(r.hasAny).toBe(true);
  });
});
