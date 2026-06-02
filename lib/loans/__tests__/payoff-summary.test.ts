import type { LoanPayment, StudentLoan } from '../../types';
import { applyExtra, buildDebtFreeSummary, formatMonthYear, interestAvoidedSoFar } from '../payoff-summary';

function makeLoan(over: Partial<StudentLoan>): StudentLoan {
  return {
    id: 'l1',
    userId: 'u1',
    nickname: 'Test loan',
    loanType: 'private',
    servicer: null,
    originalPrincipalCents: 200_000,
    currentBalanceCents: 100_000,
    aprBps: 0,
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

describe('buildDebtFreeSummary', () => {
  it('reports no loans when none are active', () => {
    const s = buildDebtFreeSummary([makeLoan({ status: 'paid_off' })]);
    expect(s.hasLoans).toBe(false);
  });

  it('aggregates a single 0% loan', () => {
    const s = buildDebtFreeSummary([makeLoan({})]);
    expect(s.hasLoans).toBe(true);
    expect(s.stalled).toBe(false);
    expect(s.baselineMonths).toBe(10); // 100000 / 10000
    expect(s.totalBalanceCents).toBe(100_000);
    expect(s.baselineInterestCents).toBe(0);
    expect(s.targetLoan?.id).toBe('l1');
  });

  it('flags a stalled loan whose payment cannot cover interest', () => {
    const s = buildDebtFreeSummary([makeLoan({ aprBps: 5_000, monthlyPaymentCents: 1_000 })]);
    expect(s.stalled).toBe(true);
  });

  it('targets the highest-APR loan for the avalanche', () => {
    const lo = makeLoan({ id: 'lo', aprBps: 400 });
    const hi = makeLoan({ id: 'hi', aprBps: 900 });
    const s = buildDebtFreeSummary([lo, hi]);
    expect(s.targetLoan?.id).toBe('hi');
  });

  it("debt-free date is the last loan's payoff (parallel EMIs)", () => {
    const short = makeLoan({ id: 's', currentBalanceCents: 50_000, monthlyPaymentCents: 10_000 }); // 5 mo
    const long = makeLoan({ id: 'l', currentBalanceCents: 100_000, monthlyPaymentCents: 10_000 }); // 10 mo
    const s = buildDebtFreeSummary([short, long]);
    expect(s.baselineMonths).toBe(10);
  });
});

describe('applyExtra', () => {
  it('shortens payoff when extra is routed to the target loan', () => {
    const loans = [makeLoan({})];
    const summary = buildDebtFreeSummary(loans);
    const scenario = applyExtra(loans, summary, 10_000); // doubles principal on 0% loan
    expect(scenario.payoffDate).not.toBe(summary.payoffDate);
    expect(scenario.monthsShaved).toBe(5); // 10 mo → 5 mo
  });

  it('is a no-op with zero extra', () => {
    const loans = [makeLoan({})];
    const summary = buildDebtFreeSummary(loans);
    const scenario = applyExtra(loans, summary, 0);
    expect(scenario.monthsShaved).toBe(0);
    expect(scenario.interestSavedCents).toBe(0);
  });

  it('saves interest on an interest-bearing loan', () => {
    const loans = [makeLoan({ aprBps: 1_200, currentBalanceCents: 1_200_000, monthlyPaymentCents: 20_000 })];
    const summary = buildDebtFreeSummary(loans);
    const scenario = applyExtra(loans, summary, 20_000);
    expect(scenario.interestSavedCents).toBeGreaterThan(0);
    expect(scenario.monthsShaved).toBeGreaterThan(0);
  });
});

function makePayment(over: Partial<LoanPayment>): LoanPayment {
  return {
    id: 'p1',
    loanId: 'l1',
    paymentDate: '2026-05-01',
    amountCents: 10_000,
    principalCents: 5_000,
    interestCents: 5_000,
    isExtra: false,
    sourceMoneyboxId: null,
    note: null,
    createdAt: '2026-05-01',
    ...over,
  };
}

describe('interestAvoidedSoFar', () => {
  it('is zero with no extra payments', () => {
    const loan = makeLoan({ aprBps: 1_200 });
    const r = interestAvoidedSoFar([loan], { l1: [makePayment({ isExtra: false, principalCents: 5_000 })] });
    expect(r.extraPaidCents).toBe(0);
    expect(r.avoidedCents).toBe(0);
  });

  it('counts extra principal and estimates interest avoided on an interest-bearing loan', () => {
    const loan = makeLoan({ aprBps: 1_200, currentBalanceCents: 500_000, monthlyPaymentCents: 20_000 });
    const r = interestAvoidedSoFar([loan], {
      l1: [makePayment({ isExtra: true, principalCents: 50_000 })],
    });
    expect(r.extraPaidCents).toBe(50_000);
    expect(r.avoidedCents).toBeGreaterThan(0);
  });

  it('avoids nothing on a 0% loan (no interest to save)', () => {
    const loan = makeLoan({ aprBps: 0, currentBalanceCents: 500_000, monthlyPaymentCents: 20_000 });
    const r = interestAvoidedSoFar([loan], { l1: [makePayment({ isExtra: true, principalCents: 50_000 })] });
    expect(r.extraPaidCents).toBe(50_000);
    expect(r.avoidedCents).toBe(0);
  });
});

describe('formatMonthYear', () => {
  it('formats an ISO date as Mon YYYY', () => {
    expect(formatMonthYear('2029-03-14')).toBe('Mar 2029');
    expect(formatMonthYear('2026-12-01')).toBe('Dec 2026');
  });
});
