import type { StudentLoan } from '../../types';
import { computeAvalanchePlan } from '../plan';
import { projectFromLoan } from '../math';

function makeLoan(over: Partial<StudentLoan>): StudentLoan {
  return {
    id: 'l1',
    userId: 'u1',
    nickname: 'Loan',
    loanType: 'private',
    servicer: null,
    originalPrincipalCents: 200_000,
    currentBalanceCents: 100_000,
    aprBps: 600,
    aprType: 'fixed',
    termMonthsRemaining: 120,
    monthlyPaymentCents: 10_000,
    dueDayOfMonth: 1,
    autopayOn: false,
    repaymentPlan: 'standard',
    reminderEnabled: true,
    status: 'active',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
    paidOffAt: null,
    ...over,
  };
}

describe('computeAvalanchePlan', () => {
  it('returns empty when there are no active loans', () => {
    expect(computeAvalanchePlan([makeLoan({ status: 'paid_off' })]).hasLoans).toBe(false);
  });

  it('matches the single-loan projection (no rollover benefit alone)', () => {
    const loan = makeLoan({ aprBps: 0, currentBalanceCents: 100_000, monthlyPaymentCents: 10_000 });
    const plan = computeAvalanchePlan([loan], 0);
    const solo = projectFromLoan(loan, 0);
    expect(plan.debtFreeMonths).toBe(solo.months); // 10
    expect(plan.steps).toHaveLength(1);
    expect(plan.monthsSaved).toBe(0);
  });

  it('rolls a cleared loan’s payment into the next even with $0 extra', () => {
    // Two 0% loans: 5-month and 10-month in isolation (baseline max = 10).
    const a = makeLoan({ id: 'a', aprBps: 0, currentBalanceCents: 50_000, monthlyPaymentCents: 10_000 });
    const b = makeLoan({ id: 'b', aprBps: 0, currentBalanceCents: 100_000, monthlyPaymentCents: 10_000 });
    const plan = computeAvalanchePlan([a, b], 0);
    // After 'a' clears, its $100 rolls into 'b' → whole portfolio clears in < 10 months.
    expect(plan.debtFreeMonths).toBeLessThan(10);
    expect(plan.monthsSaved).toBeGreaterThan(0);
  });

  it('attacks the highest-APR loan first', () => {
    const lo = makeLoan({ id: 'lo', aprBps: 300, currentBalanceCents: 80_000, monthlyPaymentCents: 8_000 });
    const hi = makeLoan({ id: 'hi', aprBps: 1_200, currentBalanceCents: 80_000, monthlyPaymentCents: 8_000 });
    const plan = computeAvalanchePlan([lo, hi], 20_000);
    expect(plan.steps[0].loanId).toBe('hi');
    expect(plan.interestSavedCents).toBeGreaterThan(0);
  });

  it('extra contribution clears the debt sooner', () => {
    const loans = [makeLoan({ aprBps: 1_200, currentBalanceCents: 1_200_000, monthlyPaymentCents: 20_000 })];
    const base = computeAvalanchePlan(loans, 0);
    const boosted = computeAvalanchePlan(loans, 30_000);
    expect(boosted.debtFreeMonths).toBeLessThan(base.debtFreeMonths);
  });

  it('flags a stalled plan when the budget cannot cover interest', () => {
    // 50% APR on $1,000, $10/mo EMI, no extra → interest dwarfs payment.
    const plan = computeAvalanchePlan(
      [makeLoan({ aprBps: 5_000, currentBalanceCents: 100_000, monthlyPaymentCents: 1_000 })],
      0,
    );
    expect(plan.stalled).toBe(true);
  });

  it('keeps total monthly outlay = sum of EMIs + extra', () => {
    const a = makeLoan({ id: 'a', monthlyPaymentCents: 10_000 });
    const b = makeLoan({ id: 'b', monthlyPaymentCents: 15_000 });
    expect(computeAvalanchePlan([a, b], 5_000).monthlyBudgetCents).toBe(30_000);
  });
});
