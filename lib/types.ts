import type { CurrencyCode } from './currency';

export type { CurrencyCode } from './currency';

export type MoneyboxStatus = 'active' | 'completed' | 'abandoned';
export type ThemeId =
  | 'classic_gold'
  | 'candy_pop'
  | 'midnight'
  | 'ocean'
  | 'space'
  | 'dino'
  | 'gold'
  | 'silver';

export interface Profile {
  id: string;
  displayName: string | null;
  /** Primary currency. Always present and always the first entry of preferredCurrencies. */
  defaultCurrency: CurrencyCode;
  /** Ordered list of currencies the user has opted into (max MAX_CURRENCIES).
   *  Index 0 is the primary (mirrors defaultCurrency). */
  preferredCurrencies: CurrencyCode[];
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  onboardingDone: boolean;
  /** Currency allocated the +1 bonus slot (unlocked via rewarded ad). */
  bonusCurrency: CurrencyCode | null;
  /** Number of streak freezes the user can spend. DB-capped at 5. */
  streakFreezesAvailable: number;
  /** 'YYYY-MM' of the most recent monthly auto-grant. null = never granted. */
  streakFreezesGrantMonth: string | null;
  /** YYYY-MM-DD dates already covered by a freeze. Lets multi-box days share
   *  one freeze, and prevents double-charging on the same missed day. Pruned
   *  to the last 60 days so the array stays small. */
  streakFreezesUsedDates: string[];
  /** ISO date when the user filled their first cell. Drives the 7-day welcome
   *  arc on home. Null until first fill. */
  welcomeWeekStartedAt: string | null;
  /** Welcome-week banner hides once this is true (set when first 7-day streak
   *  hits, OR when 7 days have passed since welcomeWeekStartedAt). */
  welcomeWeekComplete: boolean;
  /** One-shot: true after the first time the user reaches a 7-day streak. */
  daySevenCelebrated: boolean;
  /** One-shot: true after the first time the user reaches a 10-day streak. */
  dayTenCelebrated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Moneybox {
  id: string;
  userId: string;
  name: string;
  /** Emoji shown next to the name on home/history/box detail. Always one
   *  graphical character. Defaults to 💰 for legacy rows. */
  icon: string;
  /** Where the user keeps the actual cash for this moneybox (id from
   *  lib/stash-spots.ts). Null for legacy rows that predate the picker. */
  stashSpot: string | null;
  theme: ThemeId;
  currency: CurrencyCode;
  goalAmount: number;
  targetDays: number;
  gridRows: number;
  gridCols: number;
  status: MoneyboxStatus;
  createdAt: string;
  completedAt: string | null;
  /** Milestone percentages (25/50/75/100) that have already fired for this vault.
   *  Persisted so each milestone celebrates exactly once per lifecycle and
   *  survives sessions/devices. Undo never removes entries. */
  milestonesTriggered: number[];
}

export interface Cell {
  id: string;
  moneyboxId: string;
  row: number;
  col: number;
  amount: number;
  isFilled: boolean;
  filledAt: string | null;
}

export interface Reminder {
  id: string;
  moneyboxId: string;
  timeOfDay: string;
  daysOfWeek: number[];
  enabled: boolean;
  createdAt: string;
}

export interface DailySuggestion {
  id: string;
  moneyboxId: string;
  date: string;
  suggestedCellId: string | null;
  accepted: boolean;
  createdAt: string;
}

export interface Streak {
  moneyboxId: string;
  currentDays: number;
  bestDays: number;
  lastFilledDate: string | null;
}
