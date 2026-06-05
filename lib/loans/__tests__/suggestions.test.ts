import type { StudentLoan } from '../../types';
import { computeLoanSuggestions } from '../suggestions';

function loan(over: Partial<StudentLoan> = {}): StudentLoan {
  return {
    id: 'l1',
    userId: 'u1',
    nickname: 'MOHELA',
    loanType: 'federal_unsubsidized',
    servicer: null,
    originalPrincipalCents: 1_000_000,
    currentBalanceCents: 1_000_000,
    aprBps: 650,
    aprType: 'fixed',
    termMonthsRemaining: 120,
    monthlyPaymentCents: 31_200, // $312
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

describe('computeLoanSuggestions', () => {
  it('returns nothing without active loans', () => {
    expect(computeLoanSuggestions({ loans: [] })).toEqual([]);
    expect(computeLoanSuggestions({ loans: [loan({ status: 'paid_off' })] })).toEqual([]);
  });

  it('suggests a booster for a loan that has none, and a round-up', () => {
    const out = computeLoanSuggestions({ loans: [loan()] });
    const kinds = out.map((s) => s.kind);
    expect(kinds).toContain('booster');
    expect(kinds).toContain('roundup');
    expect(kinds).not.toContain('surplus'); // no surplus passed
  });

  it('omits the booster suggestion when the loan already has a booster vault', () => {
    const out = computeLoanSuggestions({
      loans: [loan()],
      boostedLoanIds: new Set(['l1']),
    });
    expect(out.map((s) => s.kind)).not.toContain('booster');
  });

  it('rounds $312 up to $350 (next $50)', () => {
    const out = computeLoanSuggestions({ loans: [loan()] });
    const roundup = out.find((s) => s.kind === 'roundup');
    expect(roundup?.title).toContain('$350.00');
    // CTA logs the $38 difference as an extra payment.
    expect(roundup?.route.params.amount).toBe('38.00');
    expect(roundup?.route.params.extra).toBe('1');
  });

  it('surfaces a surplus suggestion above the threshold, targeting the highest APR', () => {
    const lowApr = loan({ id: 'a', nickname: 'Low', aprBps: 300 });
    const highApr = loan({ id: 'b', nickname: 'High', aprBps: 900 });
    const out = computeLoanSuggestions({
      loans: [lowApr, highApr],
      surplusCents: 20_000, // $200
    });
    const surplus = out.find((s) => s.kind === 'surplus');
    expect(surplus).toBeDefined();
    expect(surplus?.route.params.loanId).toBe('b'); // highest APR
    expect(surplus?.route.params.amount).toBe('200.00');
  });

  it('ignores a tiny surplus under the threshold', () => {
    const out = computeLoanSuggestions({ loans: [loan()], surplusCents: 500 });
    expect(out.map((s) => s.kind)).not.toContain('surplus');
  });

  it('respects the limit', () => {
    const out = computeLoanSuggestions({ loans: [loan()], surplusCents: 50_000, limit: 2 });
    expect(out.length).toBeLessThanOrEqual(2);
  });
});
