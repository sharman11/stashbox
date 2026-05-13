import * as Localization from 'expo-localization';

import { getCurrencyForCountry, isCurrencyCode } from './currency';
import type { CurrencyCode } from './currency';

const FALLBACK: CurrencyCode = 'USD';

/**
 * Detect the user's most likely currency from device locale + region.
 * Order of preference:
 *   1. Device locale's `currencyCode` (most accurate - set by the OS).
 *   2. Country/region code mapped to a known currency.
 *   3. USD fallback.
 *
 * Always returns a value supported by the app.
 */
export function detectLocaleCurrency(): CurrencyCode {
  try {
    const locales = Localization.getLocales();
    for (const locale of locales) {
      const direct = locale.currencyCode;
      if (direct && isCurrencyCode(direct)) {
        return direct;
      }
      const fromRegion = getCurrencyForCountry(locale.regionCode);
      if (fromRegion) return fromRegion;
    }
  } catch {
    // Localization can throw on unusual platforms; fall through.
  }
  return FALLBACK;
}
