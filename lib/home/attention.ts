/**
 * Attention engine for the home screen.
 *
 * The home screen's job is to surface what needs attention, so this hook scans
 * every domain (budgets, savings streaks) and returns a single list of
 * AttentionItems sorted by severity — lowest score first (most urgent on top).
 *
 * It absorbs the logic that used to live, duplicated, across SmartCards and
 * TodaysNudge. The card UI lives in components/home/AttentionFeed.tsx; this
 * file is data only.
 *
 * Severity ladder (lower = higher on screen):
 *   20  budget blown        — month spend > overall cap
 *   25  category over       — a category budget exceeded
 *   40  budget near cap     — ≥85% of the overall cap used
 *   42  category near cap   — a category budget ≥85% used
 *   50  streak at risk      — active streak ≥1 and nothing filled today
 *   60  today's save        — nothing filled today, no streak yet
 */

import { useEffect, useMemo, useState } from 'react';

import { formatAmount } from '@/lib/currency';
import { convertCents, getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseCategoriesStore } from '@/lib/stores/expense-categories';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';

export type AttentionTone = 'red' | 'amber' | 'calm';

/** Stable icon key per alert kind. Maps to a custom image in AttentionFeed. */
export type AlertIcon = 'over-budget' | 'near-budget' | 'streak' | 'save';

export interface AttentionItem {
  id: string;
  /** Lower = more urgent; drives sort order. */
  score: number;
  tone: AttentionTone;
  icon: AlertIcon;
  title: string;
  subtitle: string;
  href: string;
}

/** Most cards we'll ever stack — past this, "attention" becomes wallpaper. */
const MAX_ITEMS = 3;

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function currentMonthPrefix(): string {
  return todayYmd().slice(0, 7);
}

function daysLeftInMonth(): number {
  // Today-inclusive, to match the safe-to-spend card's denominator.
  const t = new Date();
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return last - t.getDate() + 1;
}

/**
 * Returns the severity-ranked attention feed (max 3 items). Also kicks off the
 * side-loads the feed depends on (per-box streaks, FX rates) so the home screen
 * doesn't have to know about them.
 */
export function useAttentionFeed(): AttentionItem[] {
  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const streaks = useMoneyboxesStore((s) => s.streaks);
  const loadStreak = useMoneyboxesStore((s) => s.loadStreak);
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
  const categories = useExpenseCategoriesStore((s) => s.categories);
  const transactions = useExpenseTransactionsStore((s) => s.transactions);

  // Streaks are fetched per-box and aren't bulk-loaded elsewhere now that the
  // old components are gone — load one per active box.
  useEffect(() => {
    for (const box of moneyboxes) {
      if (box.status !== 'active') continue;
      if (streaks[box.id]) continue;
      loadStreak(box.id);
    }
  }, [moneyboxes, streaks, loadStreak]);

  // Re-render once FX rates land so cross-currency budget math is accurate.
  const [, setFxTick] = useState(0);
  useEffect(() => {
    let alive = true;
    getFxRates().then(() => {
      if (alive) setFxTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, []);

  return useMemo(() => {
    const today = todayYmd();
    const monthPrefix = currentMonthPrefix();
    const rates = getCachedRates();
    const items: AttentionItem[] = [];

    // ── Overall budget: blown (20) or near cap ≥85% (40) ──
    const overall = budgets.find(
      (b) => b.categoryId === null && b.periodMonth.slice(0, 7) === monthPrefix,
    );
    const left = daysLeftInMonth();
    const leftLabel = `${left} day${left === 1 ? '' : 's'} left`;
    if (overall && overall.limitCents > 0) {
      let spentCents = 0;
      for (const t of transactions) {
        if (t.type !== 'expense') continue;
        if (!t.occurredOn.startsWith(monthPrefix)) continue;
        if (t.occurredOn > today) continue; // skip future-dated (B2)
        spentCents += convertCents(t.amountCents, t.currency, overall.currency, rates);
      }
      const ratio = spentCents / overall.limitCents;
      if (ratio >= 1) {
        const overBy = formatAmount(Math.round((spentCents - overall.limitCents) / 100), overall.currency);
        items.push({
          id: 'budget-blown',
          score: 20,
          tone: 'red',
          icon: 'over-budget',
          title: "You're over budget",
          subtitle: `${overBy} over with ${leftLabel}`,
          href: '/expenses/budgets',
        });
      } else if (ratio >= 0.85) {
        items.push({
          id: 'budget-near',
          score: 40,
          tone: 'amber',
          icon: 'near-budget',
          title: `Budget ${Math.round(ratio * 100)}% used`,
          subtitle: `${leftLabel} this month`,
          href: '/expenses/budgets',
        });
      }
    }

    // ── Per-category budgets: over (25) or near cap ≥85% (42) ──
    // Caps are constraints surfaced as alerts (they don't fold into the daily
    // safe-to-spend figure). Sits just below the overall-budget tiers.
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    for (const b of budgets) {
      if (b.categoryId === null) continue;
      if (b.periodMonth.slice(0, 7) !== monthPrefix) continue;
      if (b.limitCents <= 0) continue;
      let spent = 0;
      for (const t of transactions) {
        if (t.type !== 'expense') continue;
        if (t.categoryId !== b.categoryId) continue;
        if (!t.occurredOn.startsWith(monthPrefix)) continue;
        if (t.occurredOn > today) continue;
        spent += convertCents(t.amountCents, t.currency, b.currency, rates);
      }
      const ratio = spent / b.limitCents;
      const name = categoryName.get(b.categoryId) ?? 'A category';
      if (ratio >= 1) {
        const overBy = formatAmount(Math.round((spent - b.limitCents) / 100), b.currency);
        items.push({
          id: `cat-over-${b.id}`,
          score: 25,
          tone: 'red',
          icon: 'over-budget',
          title: `${name} over budget`,
          subtitle: `${overBy} over with ${leftLabel}`,
          href: '/expenses/budgets',
        });
      } else if (ratio >= 0.85) {
        items.push({
          id: `cat-near-${b.id}`,
          score: 42,
          tone: 'amber',
          icon: 'near-budget',
          title: `${name} ${Math.round(ratio * 100)}% used`,
          subtitle: `${leftLabel} this month`,
          href: '/expenses/budgets',
        });
      }
    }

    // ── Savings: streak at risk (50) or today's save not done (60) ──
    const activeBoxes = moneyboxes.filter((b) => b.status === 'active');
    const filledToday = activeBoxes.some((b) => streaks[b.id]?.lastFilledDate === today);
    if (activeBoxes.length > 0 && !filledToday) {
      // Pick the box with the most to lose (highest current streak).
      let top = activeBoxes[0];
      let topStreak = streaks[top.id]?.currentDays ?? 0;
      for (const b of activeBoxes) {
        const c = streaks[b.id]?.currentDays ?? 0;
        if (c > topStreak) {
          top = b;
          topStreak = c;
        }
      }
      if (topStreak >= 1) {
        items.push({
          id: 'streak-at-risk',
          score: 50,
          tone: 'amber',
          icon: 'streak',
          title: `Keep your ${topStreak}-day streak alive`,
          subtitle: `Fill a cell on ${top.name} today`,
          href: `/box/${top.id}`,
        });
      } else {
        items.push({
          id: 'todays-save',
          score: 60,
          tone: 'calm',
          icon: 'save',
          title: 'Save something today',
          subtitle: `Add to ${top.name} to start a streak`,
          href: `/box/${top.id}`,
        });
      }
    }

    items.sort((a, b) => a.score - b.score);
    return items.slice(0, MAX_ITEMS);
  }, [moneyboxes, streaks, budgets, categories, transactions]);
}
