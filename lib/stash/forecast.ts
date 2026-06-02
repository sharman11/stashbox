/**
 * Goal forecasting for the Stash tab (Stashbox+).
 *
 * Projects when each savings goal will finish, based on the actual contribution
 * pace so far, and compares that to the goal's target date (createdAt +
 * targetDays). Tells the user if they're on track and — if behind — how much
 * per week would get them back on target.
 *
 * Note: moneybox amounts are MAJOR units (dollars), not cents.
 * Pure + deterministic: callers pass `today` (YYYY-MM-DD).
 */

import type { CurrencyCode } from '@/lib/currency';
import type { Cell, Moneybox } from '@/lib/types';

const DAY_MS = 86_400_000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function toUTC(ymd: string): number {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}
function daysBetween(fromYmd: string, toYmd: string): number {
  return Math.round((toUTC(toYmd) - toUTC(fromYmd)) / DAY_MS);
}
function addDays(ymd: string, n: number): string {
  const t = new Date(toUTC(ymd));
  t.setUTCDate(t.getUTCDate() + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())}`;
}

/** "2026-08-14" → "Aug 14". */
export function shortDate(ymd: string): string {
  const [, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[(m || 1) - 1]} ${d}`;
}

export interface GoalForecast {
  boxId: string;
  name: string;
  emoji: string;
  currency: CurrencyCode;
  done: boolean;
  /** Remaining amount to the goal (major units). */
  remaining: number;
  /** Projected finish date at the current pace, or null if no saving yet. */
  projectedDate: string | null;
  targetDate: string;
  onTrack: boolean;
  /** Per-week amount needed to hit the target date (major units). */
  weeklyNeeded: number;
  /** Whether the user has filled any cells (enough to forecast). */
  hasData: boolean;
}

export function forecastGoal(box: Moneybox, cells: readonly Cell[], today: string): GoalForecast {
  const filled = cells.filter((c) => c.isFilled && c.filledAt);
  const saved = filled.reduce((s, c) => s + c.amount, 0);
  const remaining = Math.max(0, box.goalAmount - saved);
  const done = box.goalAmount > 0 && remaining <= 0;

  let firstFill = today;
  for (const c of filled) {
    const f = c.filledAt!.slice(0, 10);
    if (f < firstFill) firstFill = f;
  }
  const startYmd = filled.length > 0 ? firstFill : box.createdAt.slice(0, 10);
  const daysSaving = Math.max(1, daysBetween(startYmd, today));
  const dailyRate = saved > 0 ? saved / daysSaving : 0;

  const projectedDays = dailyRate > 0 ? Math.ceil(remaining / dailyRate) : null;
  const projectedDate = done ? today : projectedDays !== null ? addDays(today, projectedDays) : null;

  const targetDate = addDays(box.createdAt.slice(0, 10), box.targetDays);
  const daysToTarget = Math.max(0, daysBetween(today, targetDate));
  const onTrack = done || (projectedDate !== null && projectedDate <= targetDate);
  const weeklyNeeded = done ? 0 : daysToTarget > 0 ? (remaining / daysToTarget) * 7 : remaining;

  return {
    boxId: box.id,
    name: box.name,
    emoji: box.icon || '💰',
    currency: box.currency,
    done,
    remaining,
    projectedDate,
    targetDate,
    onTrack,
    weeklyNeeded,
    hasData: filled.length > 0,
  };
}
