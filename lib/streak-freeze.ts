/**
 * Streak-freeze + date math utilities.
 *
 * Dates are YYYY-MM-DD strings throughout, computed in UTC to match the
 * existing `lib/stores/moneyboxes.ts` streak code (`new Date().toISOString().split('T')[0]`).
 * Don't mix timezone bases here or streak gaps will be off-by-one for users
 * near midnight.
 */

export const FREEZE_CAP = 5;

/** Today's date as YYYY-MM-DD (UTC, matching moneyboxes streak code). */
export function todayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

/** Yesterday's date as YYYY-MM-DD (UTC). */
export function yesterdayDateString(): string {
  return new Date(Date.now() - 86400000).toISOString().split('T')[0];
}

/** Current calendar month as 'YYYY-MM' (UTC). Used for monthly freeze grants. */
export function currentMonthString(): string {
  return todayDateString().slice(0, 7);
}

/** Whole days between two YYYY-MM-DD strings. Always positive when d2 >= d1. */
export function daysBetween(d1: string, d2: string): number {
  const ms1 = Date.UTC(
    Number(d1.slice(0, 4)),
    Number(d1.slice(5, 7)) - 1,
    Number(d1.slice(8, 10)),
  );
  const ms2 = Date.UTC(
    Number(d2.slice(0, 4)),
    Number(d2.slice(5, 7)) - 1,
    Number(d2.slice(8, 10)),
  );
  return Math.round((ms2 - ms1) / 86400000);
}

/**
 * Dates strictly between `start` and `end` (both exclusive), in chronological
 * order. Eg. ('2026-04-25', '2026-04-28') → ['2026-04-26', '2026-04-27'].
 * Returns [] when there's no gap.
 */
export function datesBetween(start: string, end: string): string[] {
  const out: string[] = [];
  const totalGap = daysBetween(start, end);
  for (let i = 1; i < totalGap; i++) {
    const ms = Date.UTC(
      Number(start.slice(0, 4)),
      Number(start.slice(5, 7)) - 1,
      Number(start.slice(8, 10)) + i,
    );
    out.push(new Date(ms).toISOString().split('T')[0]);
  }
  return out;
}

/** Drop any used-date entries older than 60 days so the array stays tight. */
export function pruneUsedDates(dates: readonly string[]): string[] {
  const cutoff = todayDateString();
  return dates.filter((d) => daysBetween(d, cutoff) <= 60);
}

export interface FreezeDecision {
  /** New currentDays value to write to the streak row. */
  newCurrent: number;
  /** Dates that need to be added to the user's usedDates (already deduped). */
  newlyConsumedDates: string[];
  /** Convenience: how many freezes were just spent. */
  freezesSpent: number;
  /** True when the gap exceeded what freezes could cover and the streak reset. */
  streakReset: boolean;
}

/**
 * Pure decision function: given the previous streak state, today's date, the
 * user's freeze pool, and the dates already covered by past freezes, decide
 * the new currentDays and how many freezes to consume.
 *
 * Caller is responsible for persisting the result.
 */
export function decideFreezeApplication(args: {
  /** Previous streak's lastFilledDate, or null if the user has never filled. */
  lastFilled: string | null;
  /** Previous streak's currentDays. */
  previousCurrent: number;
  /** Today's YYYY-MM-DD (caller passes for testability). */
  today: string;
  /** Freezes the user has available right now. */
  freezesAvailable: number;
  /** Dates already covered by previous freeze applications. */
  usedDates: readonly string[];
}): FreezeDecision {
  const { lastFilled, previousCurrent, today, freezesAvailable, usedDates } = args;

  // Edge: first ever fill.
  if (!lastFilled) {
    return { newCurrent: 1, newlyConsumedDates: [], freezesSpent: 0, streakReset: false };
  }

  // Edge: same-day fill (already counted today).
  if (lastFilled === today) {
    return {
      newCurrent: previousCurrent || 1,
      newlyConsumedDates: [],
      freezesSpent: 0,
      streakReset: false,
    };
  }

  const gap = daysBetween(lastFilled, today);

  // Normal continuation (saved yesterday).
  if (gap === 1) {
    return {
      newCurrent: previousCurrent + 1,
      newlyConsumedDates: [],
      freezesSpent: 0,
      streakReset: false,
    };
  }

  // Future-dated lastFilled (clock skew / device time changed). Treat as
  // same-day to avoid breaking the streak from bad data.
  if (gap <= 0) {
    return {
      newCurrent: previousCurrent || 1,
      newlyConsumedDates: [],
      freezesSpent: 0,
      streakReset: false,
    };
  }

  // Gap > 1 day. Check whether freezes can bridge it.
  const missedDates = datesBetween(lastFilled, today);
  const alreadyCovered = new Set(usedDates);
  const newlyNeeded = missedDates.filter((d) => !alreadyCovered.has(d));

  if (newlyNeeded.length <= freezesAvailable) {
    return {
      newCurrent: previousCurrent + 1,
      newlyConsumedDates: newlyNeeded,
      freezesSpent: newlyNeeded.length,
      streakReset: false,
    };
  }

  // Not enough freezes - streak resets to 1 (today's fill counts as day 1).
  return {
    newCurrent: 1,
    newlyConsumedDates: [],
    freezesSpent: 0,
    streakReset: true,
  };
}
