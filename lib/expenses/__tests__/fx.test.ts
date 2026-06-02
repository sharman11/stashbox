import type { CurrencyCode } from '../../currency';
import { convert, convertCents } from '../fx';

describe('convert', () => {
  it('returns the amount unchanged for same currency', () => {
    expect(convert(100, 'USD', 'USD', { USD: 1, EUR: 0.5 })).toBe(100);
  });

  it('converts through the USD-based triangle', () => {
    const rates = { USD: 1, EUR: 0.5 };
    expect(convert(100, 'USD', 'EUR', rates)).toBe(50);
    expect(convert(100, 'EUR', 'USD', rates)).toBe(200);
  });

  it('falls back to baseline rates when a code is missing from the live set', () => {
    // Empty live rates → FALLBACK_RATES (EUR ≈ 0.92) is used.
    expect(convert(100, 'USD', 'EUR', {})).toBeCloseTo(92, 5);
  });

  it('skips conversion (returns amount) when a rate is truly unknown', () => {
    const unknown = 'ZZZ' as CurrencyCode;
    expect(convert(100, 'USD', unknown, {})).toBe(100);
  });
});

describe('convertCents', () => {
  it('rounds to the nearest cent', () => {
    // 101 * 0.5 = 50.5 → 51
    expect(convertCents(101, 'USD', 'EUR', { USD: 1, EUR: 0.5 })).toBe(51);
  });
});
