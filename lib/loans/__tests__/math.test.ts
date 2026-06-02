import {
  addMonths,
  calcMonthlyPayment,
  compareExtraPayment,
  formatApr,
  formatCents,
  formatDuration,
  projectPayoff,
  splitPayment,
} from '../math';

describe('calcMonthlyPayment', () => {
  it('matches the standard amortization formula', () => {
    // $10,000 at 6% APR over 120 months ≈ $111.02/mo.
    const m = calcMonthlyPayment(1_000_000, 600, 120);
    expect(Math.abs(m - 11_102)).toBeLessThanOrEqual(2);
  });

  it('handles 0% APR as straight division', () => {
    expect(calcMonthlyPayment(120_000, 0, 12)).toBe(10_000);
  });

  it('returns 0 for non-positive principal or term', () => {
    expect(calcMonthlyPayment(0, 600, 120)).toBe(0);
    expect(calcMonthlyPayment(1_000_000, 600, 0)).toBe(0);
  });
});

describe('splitPayment', () => {
  it('splits a payment into interest + principal', () => {
    // 12% APR → 1%/mo. Interest on $1,000 = $10.
    const r = splitPayment(100_000, 1_200, 5_000);
    expect(r.interestCents).toBe(1_000);
    expect(r.principalCents).toBe(4_000);
    expect(r.newBalanceCents).toBe(96_000);
  });

  it('caps principal at the remaining balance on the final payment', () => {
    const r = splitPayment(3_000, 1_200, 5_000);
    expect(r.principalCents).toBe(3_000);
    expect(r.newBalanceCents).toBe(0);
  });
});

describe('projectPayoff', () => {
  it('pays off in exactly N months with no interest', () => {
    const p = projectPayoff({ balanceCents: 100_000, aprBps: 0, monthlyPaymentCents: 10_000 });
    expect(p.months).toBe(10);
    expect(p.totalInterestCents).toBe(0);
    expect(p.totalPaidCents).toBe(100_000);
  });

  it('extra principal shortens the payoff', () => {
    const p = projectPayoff({ balanceCents: 100_000, aprBps: 0, monthlyPaymentCents: 10_000, extraMonthlyCents: 10_000 });
    expect(p.months).toBe(5);
  });

  it('bails at maxMonths when the payment cannot cover interest', () => {
    // 50% APR on $1,000 → ~$41.67/mo interest; $10 payment never reduces it.
    const p = projectPayoff({ balanceCents: 100_000, aprBps: 5_000, monthlyPaymentCents: 1_000 });
    expect(p.months).toBe(600);
  });

  it('returns today and zero for an already-paid loan', () => {
    const p = projectPayoff({ balanceCents: 0, aprBps: 600, monthlyPaymentCents: 10_000 });
    expect(p.months).toBe(0);
    expect(p.totalInterestCents).toBe(0);
  });
});

describe('compareExtraPayment', () => {
  it('reports months shaved and interest saved from paying extra', () => {
    const loan = { currentBalanceCents: 1_200_000, aprBps: 1_200, monthlyPaymentCents: 20_000 };
    const c = compareExtraPayment(loan, 10_000);
    expect(c.accelerated.months).toBeLessThan(c.baseline.months);
    expect(c.monthsShaved).toBeGreaterThan(0);
    expect(c.interestSavedCents).toBeGreaterThan(0);
  });

  it('saves nothing with zero extra', () => {
    const loan = { currentBalanceCents: 1_200_000, aprBps: 1_200, monthlyPaymentCents: 20_000 };
    const c = compareExtraPayment(loan, 0);
    expect(c.monthsShaved).toBe(0);
    expect(c.interestSavedCents).toBe(0);
  });
});

describe('addMonths', () => {
  it('adds whole months', () => {
    expect(addMonths('2026-06-02', 0)).toBe('2026-06-02');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-15');
  });

  it('clamps to the last day of a shorter target month', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('formatters', () => {
  it('formatDuration', () => {
    expect(formatDuration(0)).toBe('0 mos');
    expect(formatDuration(11)).toBe('11 mos');
    expect(formatDuration(12)).toBe('1 yr');
    expect(formatDuration(13)).toBe('1 yr 1 mo');
    expect(formatDuration(26)).toBe('2 yrs 2 mos');
  });

  it('formatApr', () => {
    expect(formatApr(650)).toBe('6.50%');
  });

  it('formatCents', () => {
    expect(formatCents(123_456)).toBe('$1,234.56');
  });
});
