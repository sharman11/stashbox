export type CurrencyCode =
  | 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED' | 'SGD'
  | 'JPY' | 'AUD' | 'CAD' | 'SAR' | 'BRL' | 'THB'
  | 'PHP' | 'MYR' | 'KRW' | 'IDR' | 'NGN' | 'KES'
  | 'ZAR' | 'BDT' | 'PKR' | 'LKR' | 'NPR';

export type CurrencyRegion = 'Americas' | 'Europe' | 'Asia' | 'Middle East' | 'Africa' | 'Oceania';

interface CurrencyMeta {
  code: CurrencyCode;
  symbol: string;
  label: string;
  flag: string;
  notes: readonly number[];
  /** Largest denomination people commonly carry day-to-day. Used as the cap
   *  for cell amounts in the grid and as the basis for "min days" math, so
   *  users aren't told they need ₹2000 / ¥10000 / $100 notes when most folks
   *  don't keep them on hand. */
  practicalMax: number;
  /** Smallest goal that produces a usable grid. Below this, the app feels silly. */
  minGoal: number;
  /** Hard cap on goal amount. The grid maxes out around 365 cells (one year),
   *  so anything beyond practicalMax × 365 is unrenderable. Cleanly rounded. */
  maxGoal: number;
  region: CurrencyRegion;
  /** Lowercase keywords for search (e.g. "rupee", "dollar"). */
  aliases: readonly string[];
}

/** Hard cap on saving days (one calendar year - 365 cells max in the grid). */
export const MAX_DAYS = 365;
/** Floor on saving days - anything shorter isn't really a habit-builder. */
export const MIN_DAYS = 7;

export const CURRENCIES: Record<CurrencyCode, CurrencyMeta> = {
  USD: { code: 'USD', symbol: '$', label: 'US Dollar', flag: '🇺🇸', notes: [1, 2, 5, 10, 20, 50, 100], practicalMax: 20, minGoal: 50, maxGoal: 10000, region: 'Americas', aliases: ['usd', 'us dollar', 'dollar', 'america', 'united states'] },
  EUR: { code: 'EUR', symbol: '€', label: 'Euro', flag: '🇪🇺', notes: [5, 10, 20, 50, 100, 200], practicalMax: 50, minGoal: 100, maxGoal: 15000, region: 'Europe', aliases: ['eur', 'euro', 'europe'] },
  GBP: { code: 'GBP', symbol: '£', label: 'British Pound', flag: '🇬🇧', notes: [5, 10, 20, 50], practicalMax: 20, minGoal: 50, maxGoal: 7000, region: 'Europe', aliases: ['gbp', 'pound', 'sterling', 'uk', 'britain', 'england'] },
  INR: { code: 'INR', symbol: '₹', label: 'Indian Rupee', flag: '🇮🇳', notes: [10, 20, 50, 100, 200, 500], practicalMax: 500, minGoal: 500, maxGoal: 200000, region: 'Asia', aliases: ['inr', 'rupee', 'india', 'rupees'] },
  AED: { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham', flag: '🇦🇪', notes: [5, 10, 20, 50, 100, 200, 500, 1000], practicalMax: 100, minGoal: 200, maxGoal: 40000, region: 'Middle East', aliases: ['aed', 'dirham', 'uae', 'emirates', 'dubai'] },
  SGD: { code: 'SGD', symbol: 'S$', label: 'Singapore Dollar', flag: '🇸🇬', notes: [2, 5, 10, 50, 100, 500, 1000], practicalMax: 50, minGoal: 100, maxGoal: 20000, region: 'Asia', aliases: ['sgd', 'singapore', 'sing dollar'] },
  JPY: { code: 'JPY', symbol: '¥', label: 'Japanese Yen', flag: '🇯🇵', notes: [1000, 2000, 5000, 10000], practicalMax: 5000, minGoal: 10000, maxGoal: 1500000, region: 'Asia', aliases: ['jpy', 'yen', 'japan'] },
  AUD: { code: 'AUD', symbol: 'A$', label: 'Australian Dollar', flag: '🇦🇺', notes: [5, 10, 20, 50, 100], practicalMax: 50, minGoal: 100, maxGoal: 18000, region: 'Oceania', aliases: ['aud', 'australia', 'aussie'] },
  CAD: { code: 'CAD', symbol: 'C$', label: 'Canadian Dollar', flag: '🇨🇦', notes: [5, 10, 20, 50, 100], practicalMax: 50, minGoal: 100, maxGoal: 18000, region: 'Americas', aliases: ['cad', 'canada', 'canadian'] },
  SAR: { code: 'SAR', symbol: '﷼', label: 'Saudi Riyal', flag: '🇸🇦', notes: [1, 5, 10, 20, 50, 100, 200, 500], practicalMax: 100, minGoal: 200, maxGoal: 35000, region: 'Middle East', aliases: ['sar', 'riyal', 'saudi', 'arabia'] },
  BRL: { code: 'BRL', symbol: 'R$', label: 'Brazilian Real', flag: '🇧🇷', notes: [2, 5, 10, 20, 50, 100, 200], practicalMax: 100, minGoal: 200, maxGoal: 35000, region: 'Americas', aliases: ['brl', 'real', 'brazil'] },
  THB: { code: 'THB', symbol: '฿', label: 'Thai Baht', flag: '🇹🇭', notes: [20, 50, 100, 500, 1000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['thb', 'baht', 'thailand', 'thai'] },
  PHP: { code: 'PHP', symbol: '₱', label: 'Philippine Peso', flag: '🇵🇭', notes: [20, 50, 100, 200, 500, 1000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['php', 'peso', 'philippines', 'filipino'] },
  MYR: { code: 'MYR', symbol: 'RM', label: 'Malaysian Ringgit', flag: '🇲🇾', notes: [1, 5, 10, 20, 50, 100], practicalMax: 100, minGoal: 200, maxGoal: 35000, region: 'Asia', aliases: ['myr', 'ringgit', 'malaysia'] },
  KRW: { code: 'KRW', symbol: '₩', label: 'South Korean Won', flag: '🇰🇷', notes: [1000, 5000, 10000, 50000], practicalMax: 50000, minGoal: 100000, maxGoal: 18000000, region: 'Asia', aliases: ['krw', 'won', 'korea', 'korean'] },
  IDR: { code: 'IDR', symbol: 'Rp', label: 'Indonesian Rupiah', flag: '🇮🇩', notes: [1000, 2000, 5000, 10000, 20000, 50000, 100000], practicalMax: 100000, minGoal: 200000, maxGoal: 35000000, region: 'Asia', aliases: ['idr', 'rupiah', 'indonesia'] },
  NGN: { code: 'NGN', symbol: '₦', label: 'Nigerian Naira', flag: '🇳🇬', notes: [5, 10, 20, 50, 100, 200, 500], practicalMax: 500, minGoal: 1000, maxGoal: 180000, region: 'Africa', aliases: ['ngn', 'naira', 'nigeria'] },
  KES: { code: 'KES', symbol: 'KSh', label: 'Kenyan Shilling', flag: '🇰🇪', notes: [50, 100, 200, 500, 1000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Africa', aliases: ['kes', 'shilling', 'kenya'] },
  ZAR: { code: 'ZAR', symbol: 'R', label: 'South African Rand', flag: '🇿🇦', notes: [10, 20, 50, 100, 200], practicalMax: 200, minGoal: 500, maxGoal: 70000, region: 'Africa', aliases: ['zar', 'rand', 'south africa'] },
  BDT: { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka', flag: '🇧🇩', notes: [2, 5, 10, 20, 50, 100, 200, 500, 1000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['bdt', 'taka', 'bangladesh'] },
  PKR: { code: 'PKR', symbol: 'Rs', label: 'Pakistani Rupee', flag: '🇵🇰', notes: [10, 20, 50, 100, 500, 1000, 5000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['pkr', 'pakistan', 'pakistani rupee'] },
  LKR: { code: 'LKR', symbol: 'Rs', label: 'Sri Lankan Rupee', flag: '🇱🇰', notes: [10, 20, 50, 100, 200, 500, 1000, 5000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['lkr', 'sri lanka', 'lankan rupee'] },
  NPR: { code: 'NPR', symbol: 'Rs', label: 'Nepalese Rupee', flag: '🇳🇵', notes: [1, 2, 5, 10, 20, 50, 100, 500, 1000], practicalMax: 1000, minGoal: 2000, maxGoal: 350000, region: 'Asia', aliases: ['npr', 'nepal', 'nepalese rupee'] },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

export const REGION_ORDER: readonly CurrencyRegion[] = [
  'Americas',
  'Europe',
  'Asia',
  'Middle East',
  'Africa',
  'Oceania',
];

/** Country code (ISO 3166-1 alpha-2) → preferred currency in that country. */
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD', CA: 'CAD', BR: 'BRL',
  GB: 'GBP', IE: 'EUR', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', PT: 'EUR', BE: 'EUR', AT: 'EUR', GR: 'EUR', FI: 'EUR',
  IN: 'INR', BD: 'BDT', PK: 'PKR', LK: 'LKR', NP: 'NPR',
  SG: 'SGD', MY: 'MYR', TH: 'THB', PH: 'PHP', ID: 'IDR',
  JP: 'JPY', KR: 'KRW',
  AE: 'AED', SA: 'SAR',
  NG: 'NGN', KE: 'KES', ZA: 'ZAR',
  AU: 'AUD', NZ: 'AUD',
};

/** Currencies that pair well with a given primary (shown as "Suggested"). */
const COMMON_PAIRS: Partial<Record<CurrencyCode, readonly CurrencyCode[]>> = {
  INR: ['USD', 'AED', 'GBP'],
  AED: ['INR', 'USD', 'SAR'],
  SAR: ['AED', 'USD', 'INR'],
  GBP: ['EUR', 'USD'],
  EUR: ['GBP', 'USD'],
  USD: ['EUR', 'GBP'],
  SGD: ['USD', 'INR', 'MYR'],
  MYR: ['SGD', 'USD'],
  PHP: ['USD', 'AED'],
  IDR: ['USD', 'SGD'],
  CAD: ['USD', 'EUR'],
  AUD: ['USD', 'NZD' as CurrencyCode], // NZD not supported; filtered out by isCurrencyCode
  JPY: ['USD', 'KRW'],
  KRW: ['USD', 'JPY'],
  THB: ['USD', 'SGD'],
  BRL: ['USD', 'EUR'],
  NGN: ['USD', 'GBP'],
  KES: ['USD', 'GBP'],
  ZAR: ['USD', 'GBP'],
  BDT: ['USD', 'INR'],
  PKR: ['USD', 'AED'],
  LKR: ['USD', 'INR'],
  NPR: ['INR', 'USD'],
};

export function isCurrencyCode(value: string): value is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

export function getCurrencyForCountry(countryCode: string | null | undefined): CurrencyCode | null {
  if (!countryCode) return null;
  const upper = countryCode.toUpperCase();
  return COUNTRY_TO_CURRENCY[upper] ?? null;
}

/** Suggest 2-3 secondary currencies that commonly pair with the primary. */
export function getSuggestedPairs(primary: CurrencyCode): CurrencyCode[] {
  const raw = COMMON_PAIRS[primary] ?? [];
  return raw.filter(isCurrencyCode);
}

export function getRegionGroups(): { region: CurrencyRegion; currencies: CurrencyCode[] }[] {
  return REGION_ORDER.map((region) => ({
    region,
    currencies: CURRENCY_LIST.filter((c) => c.region === region).map((c) => c.code),
  })).filter((g) => g.currencies.length > 0);
}

/** Match a free-text query against a currency's code, label, or aliases. */
export function matchesQuery(code: CurrencyCode, query: string): boolean {
  if (!query) return true;
  const meta = CURRENCIES[code];
  const q = query.trim().toLowerCase();
  if (meta.code.toLowerCase().includes(q)) return true;
  if (meta.label.toLowerCase().includes(q)) return true;
  return meta.aliases.some((a) => a.includes(q));
}

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

/**
 * Group the digits of a raw numeric-input string with the device-locale
 * thousands separators — the same grouping `formatAmount` uses for display,
 * so a typed amount reads identically to the amounts shown elsewhere
 * (e.g. "10,000", or "1,00,000" on an Indian-locale device).
 *
 * Keep state raw (digits + at most one dot) and pass it through this only for
 * the TextInput `value`. A trailing/partial decimal the user is mid-typing is
 * preserved verbatim ("12." stays "12.", "12.5" stays "12.5").
 */
export function groupDigits(raw: string | number): string {
  const cleaned = String(raw ?? '').replace(/[^0-9.]/g, '');
  if (cleaned === '') return '';
  const dot = cleaned.indexOf('.');
  const intRaw = dot === -1 ? cleaned : cleaned.slice(0, dot);
  const decRaw = dot === -1 ? null : cleaned.slice(dot + 1).replace(/\./g, '');

  let intGrouped = '';
  if (intRaw !== '') {
    try {
      intGrouped = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
        Number(intRaw),
      );
    } catch {
      intGrouped = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }
  if (decRaw === null) return intGrouped;
  return `${intGrouped === '' ? '0' : intGrouped}.${decRaw}`;
}

export function getNotes(currency: CurrencyCode): readonly number[] {
  return CURRENCIES[currency].notes;
}

export function getSmallestNote(currency: CurrencyCode): number {
  return CURRENCIES[currency].notes[0];
}

/** Smallest allowed denomination unit - all amounts must be a multiple of this. */
export function getMinUnit(currency: CurrencyCode): number {
  return CURRENCIES[currency].notes[0];
}

export function isValidAmount(amount: number, currency: CurrencyCode): boolean {
  if (!Number.isFinite(amount) || amount <= 0) return false;
  return amount % getMinUnit(currency) === 0;
}

/** Round to the nearest valid multiple of the currency's min unit. */
export function roundToValidAmount(amount: number, currency: CurrencyCode): number {
  const unit = getMinUnit(currency);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  const rounded = Math.round(amount / unit) * unit;
  return rounded < unit ? unit : rounded;
}

export function getLargestNote(currency: CurrencyCode): number {
  const notes = CURRENCIES[currency].notes;
  return notes[notes.length - 1];
}

/** Largest note people commonly carry - used as the realistic per-cell cap. */
export function getPracticalMaxNote(currency: CurrencyCode): number {
  return CURRENCIES[currency].practicalMax;
}

/** Notes filtered to only those at or below the practical-max threshold.
 *  Used by grid generation so cells never demand a ₹2000 / ¥10000 / $100 bill. */
export function getPracticalNotes(currency: CurrencyCode): readonly number[] {
  const max = getPracticalMaxNote(currency);
  return CURRENCIES[currency].notes.filter((n) => n <= max);
}

export function getMinGoal(currency: CurrencyCode): number {
  return CURRENCIES[currency].minGoal;
}

export function getMaxGoal(currency: CurrencyCode): number {
  return CURRENCIES[currency].maxGoal;
}

export function calcMinDays(goal: number, currency: CurrencyCode): number {
  // Use the practical max so the "minimum days" math reflects notes the user
  // actually has on hand, not the theoretical largest denomination.
  return Math.ceil(goal / getPracticalMaxNote(currency));
}

export function calcMaxDays(goal: number, currency: CurrencyCode): number {
  return Math.min(MAX_DAYS, Math.floor(goal / getSmallestNote(currency)));
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
  const practicalMax = getPracticalMaxNote(currency);
  const maxGoal = getMaxGoal(currency);
  const minGoal = getMinGoal(currency);

  // Hard upper bound on days first - no 2000-day grids.
  if (days > MAX_DAYS) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Max ${MAX_DAYS} days (one year). Want longer? Make another moneybox when this one finishes.`,
    };
  }

  if (days < MIN_DAYS) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Give yourself at least ${MIN_DAYS} days - savings need a beat to feel real.`,
    };
  }

  // Goal range
  if (goal > maxGoal) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Stashbox tops out at ${formatAmount(maxGoal, currency)} per moneybox. For bigger goals, use a bank account or split into multiple moneyboxes.`,
    };
  }

  if (goal < minGoal) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Aim for at least ${formatAmount(minGoal, currency)} - anything smaller isn't worth tracking.`,
    };
  }

  // Day vs goal feasibility (using practical-max note, not theoretical largest)
  if (days < minDays) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Too few days. With ${formatAmount(practicalMax, currency)} max per cell, you need at least ${minDays} days.`,
    };
  }

  if (days > maxDays) {
    return {
      valid: false,
      minDays,
      maxDays,
      avgPerDay,
      message: `Too many days for this goal. Even at ${formatAmount(getSmallestNote(currency), currency)}/day you'd finish in ${maxDays} days.`,
    };
  }

  return { valid: true, minDays, maxDays, avgPerDay };
}
