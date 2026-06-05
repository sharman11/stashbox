import type { Cell, Moneybox, StudentLoan } from '../../types';
import { computeNetWorth } from '../net-worth';

const RATES = { USD: 1 };
const NOW = new Date(2026, 5, 15, 12, 0, 0);

function box(over: Partial<Moneybox>): Moneybox {
  return {
    id: 'b1', userId: 'u1', name: 'Vacation', icon: '✈️', stashSpot: null,
    theme: 'emerald' as Moneybox['theme'], currency: 'USD', goalAmount: 1000, targetDays: 100,
    gridRows: 10, gridCols: 10, status: 'active', linkedLoanId: null, createdAt: '2026-05-02', completedAt: null,
    milestonesTriggered: [], ...over,
  };
}
function cell(amount: number, filledAt: string): Cell {
  return { id: Math.random().toString(36).slice(2), moneyboxId: 'b1', row: 0, col: 0, amount, isFilled: true, filledAt };
}
function loan(over: Partial<StudentLoan>): StudentLoan {
  return {
    id: 'l1', userId: 'u1', nickname: 'Loan', loanType: 'private', servicer: null,
    originalPrincipalCents: 1_000_000, currentBalanceCents: 1_000_000, aprBps: 600, aprType: 'fixed',
    termMonthsRemaining: 120, monthlyPaymentCents: 20_000, dueDayOfMonth: 1, autopayOn: false,
    repaymentPlan: 'standard', reminderEnabled: true, status: 'active', createdAt: '2026-01-01',
    updatedAt: '2026-01-01', paidOffAt: null, ...over,
  };
}

describe('computeNetWorth', () => {
  it('is unavailable with no savings and no debt', () => {
    expect(computeNetWorth([], {}, [], RATES, 'USD', NOW).available).toBe(false);
  });

  it('nets savings against debt', () => {
    // $500 saved, $1000 debt → net -$500 (−50000 cents).
    const r = computeNetWorth([box({})], { b1: [cell(500, '2026-06-10')] }, [loan({})], RATES, 'USD', NOW);
    expect(r.savingsCents).toBe(50_000);
    expect(r.debtCents).toBe(1_000_000);
    expect(r.netCents).toBe(-950_000);
  });

  it('estimates months to net-positive when improving', () => {
    // Saved $9000 recently (this counts as the monthly rate), debt $1000.
    const r = computeNetWorth([box({})], { b1: [cell(9000, '2026-06-10')] }, [loan({})], RATES, 'USD', NOW);
    expect(r.monthsToPositive).not.toBeNull();
    expect(r.positiveDate).not.toBeNull();
  });

  it('reports 0 months when already net-positive', () => {
    const r = computeNetWorth([box({})], { b1: [cell(2000, '2026-06-10')] }, [], RATES, 'USD', NOW);
    expect(r.netCents).toBeGreaterThan(0);
    expect(r.monthsToPositive).toBe(0);
    expect(r.positiveDate).toBeNull();
  });
});
