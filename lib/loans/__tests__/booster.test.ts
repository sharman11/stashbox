import type { StudentLoan } from '../../types';
import { computeBoosterImpact } from '../booster';

// Minimal loan shape the helper actually reads.
function loan(over: Partial<Pick<StudentLoan, 'currentBalanceCents' | 'aprBps' | 'monthlyPaymentCents'>> = {}) {
  return {
    currentBalanceCents: 1_000_000, // $10,000
    aprBps: 600, // 6%
    monthlyPaymentCents: 20_000, // $200/mo
    ...over,
  };
}

describe('computeBoosterImpact', () => {
  it('a lump payment saves interest and shaves months', () => {
    const impact = computeBoosterImpact(loan(), 200_000); // $2,000 lump
    expect(impact.interestSavedCents).toBeGreaterThan(0);
    expect(impact.monthsShaved).toBeGreaterThan(0);
    expect(impact.paysOff).toBe(false);
  });

  it('a larger lump saves at least as much as a smaller one', () => {
    const small = computeBoosterImpact(loan(), 100_000);
    const big = computeBoosterImpact(loan(), 400_000);
    expect(big.interestSavedCents).toBeGreaterThanOrEqual(small.interestSavedCents);
    expect(big.monthsShaved).toBeGreaterThanOrEqual(small.monthsShaved);
  });

  it('flags when the lump clears the whole balance', () => {
    const impact = computeBoosterImpact(loan({ currentBalanceCents: 150_000 }), 200_000);
    expect(impact.paysOff).toBe(true);
  });

  it('a zero lump has no impact', () => {
    const impact = computeBoosterImpact(loan(), 0);
    expect(impact.interestSavedCents).toBe(0);
    expect(impact.monthsShaved).toBe(0);
    expect(impact.paysOff).toBe(false);
  });

  it('clamps a lump larger than the balance (no negative projection)', () => {
    const impact = computeBoosterImpact(loan({ currentBalanceCents: 500_000 }), 9_999_999);
    expect(impact.paysOff).toBe(true);
    expect(impact.interestSavedCents).toBeGreaterThanOrEqual(0);
    expect(impact.monthsShaved).toBeGreaterThanOrEqual(0);
  });
});
