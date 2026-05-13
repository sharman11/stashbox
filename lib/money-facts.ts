import { CURRENCIES, type CurrencyCode, formatAmount } from './currency';

export type FactType =
  | 'hack'
  | 'myth'
  | 'challenge'
  | 'mind'
  | 'stat'
  | 'story'
  | 'quote';

export interface Fact {
  type: FactType;
  emoji: string;
  /** May contain placeholders like {daily}, {wealth}, {weekTotal}.
   *  Resolved against the user's primary-currency tokens at render time. */
  headline: string;
  body: string;
}

/** Per-currency anchor values used to derive every monetary token in the
 *  tips. Picked to *feel* native in each locale (₹100 daily save in INR vs.
 *  $1 daily save in USD) rather than to be precise USD-equivalents — these
 *  are aspirational tip values, not exchange-rate quotes. */
interface CurrencyBase {
  /** Daily small save unit ("save X every day"). */
  daily: number;
  /** Round-up granularity ("round every spend up to the nearest X"). */
  roundUnit: number;
  /** Monthly SIP example ("X/month at 12%..."). Pre-tuned so monthly × ~1880
   *  ≈ wealth (the standard 25y, 12% SIP factor). */
  monthly: number;
  /** Long-term wealth target. */
  wealth: number;
  /** Override for the wealth display string when the locale has a punchier
   *  word for it (₹1 crore beats ₹1,00,00,000; ¥100 million beats ¥100,000,000). */
  wealthLabel?: string;
  /** Years from monthly SIP to wealth at 12% — kept at 25 for almost all
   *  currencies since the math is the same, decoupled in case a locale
   *  needs a different framing. */
  yearsToWealth: number;
}

const BASE: Record<CurrencyCode, CurrencyBase> = {
  USD: { daily: 1,        roundUnit: 1,    monthly: 500,        wealth: 1_000_000,       wealthLabel: '$1 million',     yearsToWealth: 25 },
  EUR: { daily: 1,        roundUnit: 1,    monthly: 500,        wealth: 1_000_000,       wealthLabel: '€1 million',     yearsToWealth: 25 },
  GBP: { daily: 1,        roundUnit: 1,    monthly: 500,        wealth: 1_000_000,       wealthLabel: '£1 million',     yearsToWealth: 25 },
  INR: { daily: 100,      roundUnit: 10,   monthly: 5_000,      wealth: 10_000_000,      wealthLabel: '₹1 crore',       yearsToWealth: 25 },
  AED: { daily: 5,        roundUnit: 1,    monthly: 2_000,      wealth: 1_000_000,       wealthLabel: 'AED 1 million',  yearsToWealth: 25 },
  SGD: { daily: 2,        roundUnit: 1,    monthly: 700,        wealth: 1_000_000,       wealthLabel: 'S$1 million',    yearsToWealth: 25 },
  JPY: { daily: 150,      roundUnit: 100,  monthly: 50_000,     wealth: 100_000_000,     wealthLabel: '¥100 million',   yearsToWealth: 25 },
  AUD: { daily: 2,        roundUnit: 1,    monthly: 700,        wealth: 1_000_000,       wealthLabel: 'A$1 million',    yearsToWealth: 25 },
  CAD: { daily: 2,        roundUnit: 1,    monthly: 700,        wealth: 1_000_000,       wealthLabel: 'C$1 million',    yearsToWealth: 25 },
  SAR: { daily: 5,        roundUnit: 1,    monthly: 2_000,      wealth: 1_000_000,       wealthLabel: 'SAR 1 million',  yearsToWealth: 25 },
  BRL: { daily: 5,        roundUnit: 1,    monthly: 2_500,      wealth: 1_000_000,       wealthLabel: 'R$1 million',    yearsToWealth: 25 },
  THB: { daily: 50,       roundUnit: 10,   monthly: 15_000,     wealth: 10_000_000,      wealthLabel: '฿10 million',    yearsToWealth: 25 },
  PHP: { daily: 50,       roundUnit: 10,   monthly: 25_000,     wealth: 10_000_000,      wealthLabel: '₱10 million',    yearsToWealth: 25 },
  MYR: { daily: 5,        roundUnit: 1,    monthly: 2_000,      wealth: 1_000_000,       wealthLabel: 'RM1 million',    yearsToWealth: 25 },
  KRW: { daily: 1_500,    roundUnit: 1_000, monthly: 500_000,   wealth: 1_000_000_000,   wealthLabel: '₩1 billion',     yearsToWealth: 25 },
  IDR: { daily: 15_000,   roundUnit: 1_000, monthly: 5_000_000, wealth: 10_000_000_000,  wealthLabel: 'Rp 10 billion',  yearsToWealth: 25 },
  NGN: { daily: 1_500,    roundUnit: 100,  monthly: 500_000,    wealth: 100_000_000,     wealthLabel: '₦100 million',   yearsToWealth: 25 },
  KES: { daily: 100,      roundUnit: 10,   monthly: 50_000,     wealth: 10_000_000,      wealthLabel: 'KSh 10 million', yearsToWealth: 25 },
  ZAR: { daily: 20,       roundUnit: 5,    monthly: 7_000,      wealth: 10_000_000,      wealthLabel: 'R10 million',    yearsToWealth: 25 },
  BDT: { daily: 100,      roundUnit: 10,   monthly: 50_000,     wealth: 10_000_000,      wealthLabel: '৳1 crore',       yearsToWealth: 25 },
  PKR: { daily: 300,      roundUnit: 50,   monthly: 150_000,    wealth: 10_000_000,      wealthLabel: 'Rs 1 crore',     yearsToWealth: 25 },
  LKR: { daily: 300,      roundUnit: 50,   monthly: 150_000,    wealth: 10_000_000,      wealthLabel: 'Rs 1 crore',     yearsToWealth: 25 },
  NPR: { daily: 150,      roundUnit: 10,   monthly: 75_000,     wealth: 10_000_000,      wealthLabel: 'Rs 1 crore',     yearsToWealth: 25 },
};

interface FactTokens {
  /** Symbol + small daily amount, e.g. "₹100" / "$1" / "¥150". */
  daily: string;
  /** Daily × 365, e.g. "₹36,500" / "$365". */
  dailyYearly: string;
  /** ~5× daily — the 24-hour-rule threshold, e.g. "₹500" / "$20". */
  impulse: string;
  /** Monthly SIP example, e.g. "₹5,000" / "$500". */
  monthly: string;
  /** Long-term wealth target — uses wealthLabel when set, e.g. "₹1 crore". */
  wealth: string;
  /** Years from monthly SIP to wealth, formatted as a short number. */
  yearsToWealth: string;
  /** Daily × 30 — the "tiny daily save → ~30× in 30 years at 12%" framing. */
  futureValue: string;
  /** Round-up granularity, e.g. "₹10" / "$1". */
  roundUnit: string;
  /** Lower end of monthly round-up accumulation. */
  roundLow: string;
  /** Upper end of monthly round-up accumulation. */
  roundHigh: string;
  /** 52-week challenge: week-1 amount = `daily`. */
  weekOne: string;
  /** 52-week challenge: week-52 amount = 52 × daily. */
  weekFiftyTwo: string;
  /** 52-week challenge total = 1,378 × daily. */
  weekTotal: string;
}

function buildTokens(code: CurrencyCode): FactTokens {
  const base = BASE[code] ?? BASE.USD;
  const fmt = (n: number) => formatAmount(Math.round(n), code);
  return {
    daily: fmt(base.daily),
    dailyYearly: fmt(base.daily * 365),
    impulse: fmt(base.daily * 5),
    monthly: fmt(base.monthly),
    wealth: base.wealthLabel ?? fmt(base.wealth),
    yearsToWealth: String(base.yearsToWealth),
    futureValue: fmt(base.daily * 30),
    roundUnit: fmt(base.roundUnit),
    roundLow: fmt(base.daily * 5),
    roundHigh: fmt(base.daily * 20),
    weekOne: fmt(base.daily),
    weekFiftyTwo: fmt(base.daily * 52),
    weekTotal: fmt(base.daily * 1378),
  };
}

const TOKEN_CACHE = new Map<CurrencyCode, FactTokens>();
function getTokens(code: CurrencyCode): FactTokens {
  // Cache because formatAmount → Intl.NumberFormat is non-trivial and the
  // carousel rebuilds these on every render.
  let cached = TOKEN_CACHE.get(code);
  if (!cached) {
    cached = buildTokens(code);
    TOKEN_CACHE.set(code, cached);
  }
  return cached;
}

function applyTokens(text: string, tokens: FactTokens): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => {
    const value = (tokens as unknown as Record<string, string>)[key];
    return value ?? `{${key}}`;
  });
}

const FACTS: Fact[] = [
  // ── Hacks: actionable, short, save-on-Monday energy ──────────────────
  {
    type: 'hack',
    emoji: '🪄',
    headline: 'Pay yourself first',
    body: 'Auto-transfer to savings the second your salary lands. What you don\'t see, you don\'t spend.',
  },
  {
    type: 'hack',
    emoji: '⏳',
    headline: 'The 24-hour rule',
    body: 'For any non-essential buy over {impulse}, sleep on it for a day. Most cravings die overnight.',
  },
  {
    type: 'hack',
    emoji: '🪙',
    headline: 'Round up every spend',
    body: 'Round every transaction up to the nearest {roundUnit} and stash the difference. {roundLow}–{roundHigh} a month, painless.',
  },
  {
    type: 'hack',
    emoji: '📈',
    headline: 'Bump it 1%',
    body: 'Every salary hike, raise your savings rate by 1%. You won\'t feel it. Compounding sure will.',
  },
  {
    type: 'hack',
    emoji: '🛟',
    headline: 'Build the cushion first',
    body: '3–6 months of expenses in an emergency fund. Sleep better, take bigger swings.',
  },

  // ── Myths: contrarian framing, "FALSE" energy ────────────────────────
  {
    type: 'myth',
    emoji: '💥',
    headline: 'You need a fortune to start',
    body: 'Wrong. SIPs begin with pocket change. The clock matters more than the amount — start tiny, but start today.',
  },
  {
    type: 'myth',
    emoji: '☕',
    headline: 'Coffee is killing your wealth',
    body: 'Mostly false. Big calls — rent, car, lifestyle — move the needle 100× more than skipping a coffee.',
  },
  {
    type: 'myth',
    emoji: '⏰',
    headline: '"I\'ll save more later"',
    body: '{daily} saved today is worth ~{futureValue} in 30 years at 12%. "Later" is the most expensive word in finance.',
  },

  // ── Challenges: pick one, do it this week ───────────────────────────
  {
    type: 'challenge',
    emoji: '📅',
    headline: '52-week challenge',
    body: '{weekOne} in week 1, double it each week to {weekFiftyTwo} in week 52. End of the year: {weekTotal} you didn\'t have.',
  },
  {
    type: 'challenge',
    emoji: '🚫',
    headline: 'One no-spend weekend',
    body: 'Pick a weekend this month — zero discretionary spending. Cook, walk, sleep in. Bank what you would\'ve burned.',
  },
  {
    type: 'challenge',
    emoji: '👛',
    headline: 'Wallet-free day',
    body: 'One day a week, leave the wallet at home. You\'ll be amazed how much you don\'t actually need.',
  },

  // ── Mind tricks: behavioural hacks ──────────────────────────────────
  {
    type: 'mind',
    emoji: '🧊',
    headline: 'Freeze your credit card',
    body: 'Literally. In a glass of water, in the freezer. Impulse buys melt before the ice does.',
  },
  {
    type: 'mind',
    emoji: '🏷️',
    headline: 'Name your savings',
    body: '"Goa 2026" saves more than "Misc". Specifically-named goals see 42% better follow-through.',
  },
  {
    type: 'mind',
    emoji: '🤝',
    headline: 'Tell three friends',
    body: 'Public commitment roughly doubles your odds. Announce the goal — accountability is free fuel.',
  },
  {
    type: 'mind',
    emoji: '🔁',
    headline: '66 days to a habit',
    body: 'Research says it takes ~66 days for a new behaviour to feel automatic. Stash daily and ride it out.',
  },

  // ── Stats: numbers that hit ──────────────────────────────────────────
  {
    type: 'stat',
    emoji: '💯',
    headline: '{daily}/day = {dailyYearly}/year',
    body: 'Skip one snack. Stash the difference. By next December, you have a flight to somewhere good.',
  },
  {
    type: 'stat',
    emoji: '🏆',
    headline: 'Millionaires run 7 income streams',
    body: 'On average. Most are passive — dividends, rent, royalties, side projects. Salary is just stream one.',
  },
  {
    type: 'stat',
    emoji: '📱',
    headline: '2–3× more with an app',
    body: 'People who track savings on an app stash 2–3× more than people who track manually. You\'re already ahead.',
  },
  {
    type: 'stat',
    emoji: '🌍',
    headline: '180+ currencies, one habit',
    body: 'There are over 180 currencies in use today. The thing that grows wealth in every single one is consistency.',
  },

  // ── Stories: micro-anecdotes ────────────────────────────────────────
  {
    type: 'story',
    emoji: '🐷',
    headline: 'Pygg clay → piggy bank',
    body: 'In the 1400s, people stored coins in cheap "pygg" clay jars. Centuries later, a potter shaped one like a pig — the name stuck.',
  },
  {
    type: 'story',
    emoji: '🏛️',
    headline: 'The first coin, 600 BC',
    body: 'King Alyattes of Lydia stamped value into metal so nobody had to weigh it. One stamp changed commerce forever.',
  },
  {
    type: 'story',
    emoji: '👶',
    headline: 'Buffett at 11',
    body: 'Warren Buffett bought his first stock — 3 shares of Cities Service Preferred — at age 11. He still says he started too late.',
  },
  {
    type: 'story',
    emoji: '🪑',
    headline: 'Bank means "bench"',
    body: 'The word "bank" comes from Italian banca — the bench where money-changers worked in medieval markets. Old idea, new tools.',
  },

  // ── Quotes: words to save by ────────────────────────────────────────
  {
    type: 'quote',
    emoji: '💬',
    headline: '"Spend what is left after saving."',
    body: '— Warren Buffett. Reverse the order most people use, and the math takes care of the rest.',
  },
  {
    type: 'quote',
    emoji: '🧮',
    headline: 'The 8th wonder',
    body: 'Compound interest, said Einstein. {monthly}/month at 12% becomes {wealth} in roughly {yearsToWealth} years.',
  },
  {
    type: 'quote',
    emoji: '✍️',
    headline: '"It\'s not your salary..."',
    body: '"…that makes you rich. It\'s your spending habits." — Charles A. Jaffe.',
  },
];

const dayOfYear = (): number =>
  Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000,
  );

function resolveFact(template: Fact, currency: CurrencyCode): Fact {
  const tokens = getTokens(currency);
  return {
    ...template,
    headline: applyTokens(template.headline, tokens),
    body: applyTokens(template.body, tokens),
  };
}

/** Returns a single fact with all currency tokens resolved. Defaults to the
 *  USD token set if `currency` isn't passed — useful before the profile is
 *  loaded so callers don't have to handle nulls. */
export function getDailyFact(currency: CurrencyCode = 'USD'): Fact {
  return resolveFact(FACTS[dayOfYear() % FACTS.length], currency);
}

/** Returns `count` facts, rotating daily and prioritising one per category
 *  for variety. Pass the user's `defaultCurrency` so amounts read in their
 *  primary currency. Falls back to USD if not supplied. */
export function getDailyFacts(
  count: number,
  currency: CurrencyCode = 'USD',
): Fact[] {
  const start = dayOfYear();
  const result: Fact[] = [];
  const usedTypes = new Set<FactType>();

  // First pass: variety — one fact per category before any repeats.
  for (let i = 0; i < FACTS.length && result.length < count; i++) {
    const fact = FACTS[(start + i) % FACTS.length];
    if (!usedTypes.has(fact.type)) {
      result.push(fact);
      usedTypes.add(fact.type);
    }
  }

  // Second pass: fill remaining slots in original order if we ran out of
  // categories (e.g. count > number of FactTypes).
  for (let i = 0; i < FACTS.length && result.length < count; i++) {
    const fact = FACTS[(start + i) % FACTS.length];
    if (!result.includes(fact)) result.push(fact);
  }

  return result.slice(0, count).map((f) => resolveFact(f, currency));
}

/** Exposed mainly for tests / debug — returns the list of currencies for
 *  which we've hand-tuned anchor values. Every code in this list has its
 *  own daily/monthly/wealth tuned to feel native to the locale. */
export const SUPPORTED_TIP_CURRENCIES: readonly CurrencyCode[] = Object.keys(
  BASE,
) as CurrencyCode[];

// Defensive: log once at module load if a CurrencyCode is missing from BASE.
// Catches the case where someone adds a new code to CURRENCIES but forgets
// to add anchor amounts here.
const __missing = (Object.keys(CURRENCIES) as CurrencyCode[]).filter(
  (c) => !(c in BASE),
);
if (__missing.length > 0 && __DEV__) {
  // eslint-disable-next-line no-console
  console.warn(
    `[money-facts] Missing tip currency anchors for: ${__missing.join(', ')}`,
  );
}
