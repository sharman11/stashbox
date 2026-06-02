/**
 * Foreign-exchange rates for the expense tracker.
 *
 * Strategy: fetch from exchangerate.host (no API key, free) on demand,
 * cache in AsyncStorage with a 6h TTL, and fall back to a hardcoded
 * baseline if the network is unreachable on a fresh install.
 *
 * Rates are always expressed relative to USD (1 USD = N units of X). The
 * convert() helper composes a from→USD→to triangle so any pair works.
 *
 * Historical accuracy note: we apply current rates at *display* time, not
 * at write time. That means a €10 dinner logged six months ago will show
 * a different home-currency value today as EUR/INR drifts. This is the
 * "Spending Tracker"-style behavior — it's simple and the alternative
 * (storing a frozen rate per transaction) becomes confusing fast when
 * the user changes home currency.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CurrencyCode } from '../currency';

const CACHE_KEY = 'stashbox_fx_rates_v1';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

/** Frozen 2026-01 baseline for every CurrencyCode the app supports.
 *  Refresh when the live API hasn't been reachable for a long stretch —
 *  accuracy isn't critical, "in the ballpark" is. */
const FALLBACK_RATES: Readonly<Record<CurrencyCode, number>> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.79,
  INR: 83.2,
  AED: 3.67,
  SGD: 1.34,
  JPY: 150.0,
  AUD: 1.51,
  CAD: 1.36,
  SAR: 3.75,
  BRL: 5.0,
  THB: 35.5,
  PHP: 56.0,
  MYR: 4.7,
  KRW: 1350,
  IDR: 15750,
  NGN: 850,
  KES: 130,
  ZAR: 18.5,
  BDT: 110,
  PKR: 280,
  LKR: 300,
  NPR: 133,
};

interface CachedRates {
  fetchedAt: number;
  rates: Record<string, number>;
}

let memoryCache: CachedRates | null = null;
let inFlight: Promise<CachedRates> | null = null;

async function readDiskCache(): Promise<CachedRates | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedRates;
    if (typeof parsed?.fetchedAt !== 'number' || !parsed?.rates) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDiskCache(cache: CachedRates): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* best-effort */
  }
}

async function fetchLiveRates(): Promise<CachedRates> {
  // exchangerate.host: free, no key, returns USD-based rates by default.
  // We hit /latest?base=USD, then validate the payload — never trust an
  // external response blindly. A non-numeric, zero, or negative rate would
  // corrupt displayed totals, so we keep only finite positive values.
  const res = await fetch('https://api.exchangerate.host/latest?base=USD');
  if (!res.ok) throw new Error(`FX fetch failed: HTTP ${res.status}`);
  const json = (await res.json()) as { rates?: Record<string, unknown> };
  if (!json?.rates || typeof json.rates !== 'object') {
    throw new Error('FX response missing rates');
  }
  const clean: Record<string, number> = {};
  for (const [code, rate] of Object.entries(json.rates)) {
    if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
      clean[code] = rate;
    }
  }
  if (Object.keys(clean).length === 0) {
    throw new Error('FX response contained no valid rates');
  }
  return { fetchedAt: Date.now(), rates: clean };
}

/**
 * Returns a fresh-enough rate set. Order of preference:
 *   1. In-memory cache (current session, valid)
 *   2. Disk cache (AsyncStorage, valid for 6h)
 *   3. Live fetch
 *   4. Stale disk cache (if network fails)
 *   5. Hardcoded fallback (cold install + offline)
 */
export async function getFxRates(): Promise<Record<string, number>> {
  const now = Date.now();

  if (memoryCache && now - memoryCache.fetchedAt < CACHE_TTL_MS) {
    return memoryCache.rates;
  }

  if (inFlight) {
    const cached = await inFlight;
    return cached.rates;
  }

  inFlight = (async () => {
    const disk = await readDiskCache();
    if (disk && now - disk.fetchedAt < CACHE_TTL_MS) {
      memoryCache = disk;
      return disk;
    }
    try {
      const live = await fetchLiveRates();
      memoryCache = live;
      await writeDiskCache(live);
      return live;
    } catch {
      // Network failed — prefer stale disk cache over baseline.
      if (disk) {
        memoryCache = disk;
        return disk;
      }
      const baseline: CachedRates = { fetchedAt: now, rates: { ...FALLBACK_RATES } };
      memoryCache = baseline;
      return baseline;
    }
  })();

  try {
    const cached = await inFlight;
    return cached.rates;
  } finally {
    inFlight = null;
  }
}

/** Synchronous accessor that uses whatever cache is currently warm.
 *  Returns FALLBACK_RATES when nothing has been loaded yet. UI should
 *  always kick off getFxRates() on mount so this stays fresh. */
export function getCachedRates(): Record<string, number> {
  return memoryCache?.rates ?? (FALLBACK_RATES as unknown as Record<string, number>);
}

/**
 * Convert `amount` from `from` currency to `to` currency.
 * Rates are USD-based: amountInUSD = amount / rates[from]; out = amountInUSD * rates[to].
 * Returns `amount` unchanged when from === to, or when either rate is missing
 * (defensive: skip conversion rather than emit garbage).
 */
export function convert(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  if (from === to) return amount;
  const fromRate = rates[from] ?? FALLBACK_RATES[from];
  const toRate = rates[to] ?? FALLBACK_RATES[to];
  if (!fromRate || !toRate) return amount;
  return (amount / fromRate) * toRate;
}

/** Convenience: convert cents → cents. Rounds to nearest cent. */
export function convertCents(
  cents: number,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: Record<string, number>,
): number {
  return Math.round(convert(cents, from, to, rates));
}
