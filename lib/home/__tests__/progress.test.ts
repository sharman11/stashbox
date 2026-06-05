import type { Cell, LoanPayment, Moneybox, StudentLoan } from '../../types';
import { computeProgress } from '../progress';

const RATES = { USD: 1, EUR: 0.5 };

function box(over: Partial<Moneybox>): Moneybox {
  return {
    id: 'b1', userId: 'u1', name: 'Vacation', icon: '✈️', stashSpot: null,
    theme: 'emerald' as Moneybox['theme'], currency: 'USD', goalAmount: 1000, targetDays: 100,
    gridRows: 10, gridCols: 10, status: 'active', linkedLoanId: null, createdAt: '2026-05-02', completedAt: null,
    milestonesTriggered: [], ...over,
  };
}
function cell(amount: number): Cell {
  return { id: Math.random().toString(36).slice(2), moneyboxId: 'b1', row: 0, col: 0, amount, isFilled: true, filledAt: '2026-05-10' };
}
function loan(over: Partial<StudentLoan>): StudentLoan {
  return {
    id: 'l1', userId: 'u1', nickname: 'Loan', loanType: 'private', servicer: null,
    originalPrincipalCents: 200_000, currentBalanceCents: 500_000, aprBps: 1_200, aprType: 'fixed',
    termMonthsRemaining: 120, monthlyPaymentCents: 20_000, dueDayOfMonth: 1, autopayOn: false,
    repaymentPlan: 'standard', reminderEnabled: true, status: 'active', createdAt: '2026-01-01',
    updatedAt: '2026-01-01', paidOffAt: null, ...over,
  };
}
function payment(over: Partial<LoanPayment>): LoanPayment {
  return { id: 'p1', loanId: 'l1', paymentDate: '2026-05-01', amountCents: 10_000, principalCents: 50_000, interestCents: 0, isExtra: true, sourceMoneyboxId: null, note: null, createdAt: '2026-05-01', ...over };
}

describe('computeProgress', () => {
  it('is empty with no saving and no extra payments', () => {
    const r = computeProgress([], {}, [], {}, RATES, 'USD');
    expect(r.hasAny).toBe(false);
  });

  it('sums saved across goals and converts to the home currency', () => {
    // $200 saved in a USD box, shown in EUR (rate 0.5) → €100 = 10000 cents.
    const r = computeProgress([box({})], { b1: [cell(200)] }, [], {}, RATES, 'EUR');
    expect(r.savedCents).toBe(10_000);
    expect(r.hasAny).toBe(true);
  });

  it('includes interest avoided from extra principal', () => {
    const r = computeProgress([], {}, [loan({})], { l1: [payment({})] }, RATES, 'USD');
    expect(r.interestAvoidedCents).toBeGreaterThan(0);
    expect(r.hasAny).toBe(true);
  });
});
