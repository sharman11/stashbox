export type CurrencyCode =
  | 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD'
  | 'JPY' | 'AUD' | 'CAD' | 'SAR' | 'BRL' | 'THB'
  | 'PHP' | 'MYR' | 'KRW' | 'IDR' | 'NGN' | 'KES'
  | 'ZAR' | 'BDT' | 'PKR' | 'LKR' | 'NPR';

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  notes: readonly number[];
}

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  INR: { code: 'INR', symbol: '₹', label: 'Indian Rupee', flag: '🇮🇳', notes: [10, 20, 50, 100, 200, 500] },
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸', notes: [1, 2, 5, 10, 20, 50, 100] },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺', notes: [5, 10, 20, 50, 100, 200] },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧', notes: [5, 10, 20, 50] },
  AED: { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', flag: '🇦🇪', notes: [5, 10, 20, 50, 100, 200, 500, 1000] },
  SGD: { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', flag: '🇸🇬', notes: [2, 5, 10, 50, 100, 500, 1000] },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', flag: '🇯🇵', notes: [1000, 2000, 5000, 10000] },
  AUD: { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', flag: '🇦🇺', notes: [5, 10, 20, 50, 100] },
  CAD: { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', flag: '🇨🇦', notes: [5, 10, 20, 50, 100] },
  SAR: { code: 'SAR', symbol: '﷼', label: 'Saudi Riyal', flag: '🇸🇦', notes: [1, 5, 10, 20, 50, 100, 200, 500] },
  BRL: { code: 'BRL', symbol: 'R$', label: 'Brazilian Real', flag: '🇧🇷', notes: [2, 5, 10, 20, 50, 100, 200] },
  THB: { code: 'THB', symbol: '฿', label: 'Thai Baht', flag: '🇹🇭', notes: [20, 50, 100, 500, 1000] },
  PHP: { code: 'PHP', symbol: '₱', label: 'Philippine Peso', flag: '🇵🇭', notes: [20, 50, 100, 200, 500, 1000] },
  MYR: { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', flag: '🇲🇾', notes: [1, 5, 10, 20, 50, 100] },
  KRW: { code: 'KRW', symbol: '₩', label: 'South Korean Won', flag: '🇰🇷', notes: [1000, 5000, 10000, 50000] },
  IDR: { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', flag: '🇮🇩', notes: [1000, 2000, 5000, 10000, 20000, 50000, 100000] },
  NGN: { code: 'NGN', symbol: '₦', label: 'Nigerian Naira', flag: '🇳🇬', notes: [5, 10, 20, 50, 100, 200, 500] },
  KES: { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling', flag: '🇰🇪', notes: [50, 100, 200, 500, 1000] },
  ZAR: { code: 'ZAR', symbol: 'R', label: 'South African Rand', flag: '🇿🇦', notes: [10, 20, 50, 100, 200] },
  BDT: { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka', flag: '🇧🇩', notes: [2, 5, 10, 20, 50, 100, 200, 500, 1000] },
  PKR: { code: 'PKR', symbol: 'Rs', label: 'Pakistani Rupee', flag: '🇵🇰', notes: [10, 20, 50, 100, 500, 1000, 5000] },
  LKR: { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰', notes: [10, 20, 50, 100, 200, 500, 1000, 5000] },
  NPR: { code: 'NPR', symbol: 'Rs', label: 'Nepalese Rupee', flag: '🇳🇵', notes: [1, 2, 5, 10, 20, 50, 100, 500, 1000] },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export function formatAmount(amount: number, currency: CurrencyCode): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${CURRENCIES[currency].symbol}${amount.toLocaleString()}`;
  }
}

export function getNotes(currency: CurrencyCode): readonly number[] {
  return CURRENCIES[currency].notes;
}

export function getSmallestNote(currency: CurrencyCode): number {
  return CURRENCIES[currency].notes[0];
}

export function getLargestNote(currency: CurrencyCode): number {
  const notes = CURRENCIES[currency].notes;
  return notes[notes.length - 1];
}

export function calcMinDays(goal: number, currency: CurrencyCode): number {
  return Math.ceil(goal / getLargestNote(currency));
}

export function calcMaxDays(goal: number, currency: CurrencyCode): number {
  return Math.floor(goal / getSmallestNote(currency));
}

export function calcAvgPerDay(goal: number, days: number): number {
  return Math.round(goal / days);
}

export function validateGoalAndDays(
  goal: number,
  days: number,
  currency: CurrencyCode
): { valid: boolean; minDays: number; maxDays: number; avgPerDay: number; message?: string } {
  const minDays = calcMinDays(goal, currency);
  const maxDays = calcMaxDays(goal, currency);
  const avgPerDay = calcAvgPerDay(goal, days);

  if (days < minDays) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Too few days. You'd need to save ${formatAmount(getLargestNote(currency), currency)}/day, and the largest note is ${formatAmount(getLargestNote(currency), currency)}. Minimum ${minDays} days.`,
    };
  }

  if (days > maxDays) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Too many days. Even saving the smallest note (${formatAmount(getSmallestNote(currency), currency)}/day) only needs ${maxDays} days.`,
    };
  }

  return { valid: true, minDays, maxDays, avgPerDay };
}
