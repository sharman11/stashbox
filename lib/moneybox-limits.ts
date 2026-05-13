import type { CurrencyCode, Moneybox } from './types';

export const MAX_CURRENCIES = 3;
export const DEFAULT_PER_CURRENCY = 1;
export const BONUS_CAPACITY = 2;

export interface Limits {
  /** Distinct currencies currently in use (active moneyboxes only). */
  distinctCurrencies: Set<CurrencyCode>;
  /** Count of active moneyboxes per currency. */
  countPerCurrency: Map<CurrencyCode, number>;
  /** Currency that owns the +1 bonus slot (null = user hasn't unlocked). */
  bonusCurrency: CurrencyCode | null;
}

export type CanCreateResult =
  | { allowed: true }
  | { allowed: false; reason: 'MAX_CURRENCIES' }
  | { allowed: false; reason: 'NEED_UNLOCK'; canUnlock: true }
  | {
      allowed: false;
      reason: 'OTHER_CURRENCY_HAS_BONUS';
      canSwitch: true;
      currentBonus: CurrencyCode;
    }
  | { allowed: false; reason: 'CURRENCY_FULL' };

export function computeLimits(
  moneyboxes: Moneybox[],
  bonusCurrency: CurrencyCode | null,
): Limits {
  const active = moneyboxes.filter((m) => m.status === 'active');
  const countPerCurrency = new Map<CurrencyCode, number>();
  for (const m of active) {
    countPerCurrency.set(m.currency, (countPerCurrency.get(m.currency) ?? 0) + 1);
  }
  return {
    distinctCurrencies: new Set(countPerCurrency.keys()),
    countPerCurrency,
    bonusCurrency,
  };
}

/** Max allowed moneyboxes for a given currency under current rules. */
export function maxForCurrency(limits: Limits, currency: CurrencyCode): number {
  return limits.bonusCurrency === currency ? BONUS_CAPACITY : DEFAULT_PER_CURRENCY;
}

/** Is this currency at or over its max capacity? */
export function isCurrencyFull(limits: Limits, currency: CurrencyCode): boolean {
  const count = limits.countPerCurrency.get(currency) ?? 0;
  return count >= maxForCurrency(limits, currency);
}

/**
 * Decide whether a new moneybox in `targetCurrency` can be created, and if not,
 * what the user can do about it (watch an ad to unlock, switch bonus, etc.).
 */
export function canCreate(limits: Limits, targetCurrency: CurrencyCode): CanCreateResult {
  const currentCount = limits.countPerCurrency.get(targetCurrency) ?? 0;
  const isNewCurrency = currentCount === 0;

  // Blocking the 4th distinct currency
  if (isNewCurrency && limits.distinctCurrencies.size >= MAX_CURRENCIES) {
    return { allowed: false, reason: 'MAX_CURRENCIES' };
  }

  // First moneybox for this currency - always OK under the 3-currency cap
  if (currentCount === 0) {
    return { allowed: true };
  }

  // Currency already has 1 moneybox
  if (currentCount === 1) {
    if (limits.bonusCurrency === targetCurrency) {
      return { allowed: true }; // using the bonus slot
    }
    if (limits.bonusCurrency === null) {
      return { allowed: false, reason: 'NEED_UNLOCK', canUnlock: true };
    }
    // Another currency holds the unused bonus token.
    // Per new spec: bonus is consumed on use, so it's always safely switchable
    // (if we reach this branch, bonus hasn't been consumed yet).
    return {
      allowed: false,
      reason: 'OTHER_CURRENCY_HAS_BONUS',
      canSwitch: true,
      currentBonus: limits.bonusCurrency,
    };
  }

  // Currency is at 2 already (bonus used)
  return { allowed: false, reason: 'CURRENCY_FULL' };
}

