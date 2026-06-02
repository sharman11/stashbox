/**
 * Attention engine for the home screen.
 *
 * The home screen's job is to surface what needs attention, so this hook scans
 * every domain (loans, budgets, savings streaks) and returns a single list of
 * AttentionItems sorted by severity — lowest score first (most urgent on top).
 *
 * It absorbs the logic that used to live, duplicated, across SmartCards and
 * TodaysNudge. The card UI lives in components/home/AttentionFeed.tsx; this
 * file is data only.
 *
 * Severity ladder (lower = higher on screen):
 *   10  loan overdue        — due day passed this month, unpaid
 *   20  budget blown        — month spend > overall cap
 *   30  payment due soon    — active loan due in ≤3 days, unpaid
 *   40  budget near cap     — ≥85% of the overall cap used
 *   50  streak at risk      — active streak ≥1 and nothing filled today
 *   60  today's save        — nothing filled today, no streak yet
 */

import { useEffect, useMemo, useState } from 'react';

import { formatAmount } from '@/lib/currency';
import { convertCents, getCachedRates, getFxRates } from '@/lib/expenses/fx';
import { useExpenseBudgetsStore } from '@/lib/stores/expense-budgets';
import { useExpenseTransactionsStore } from '@/lib/stores/expense-transactions';
import { useLoansStore } from '@/lib/stores/loans';
import { useMoneyboxesStore } from '@/lib/stores/moneyboxes';
import { useProfileStore } from '@/lib/stores/profile';

export type AttentionTone = 'red' | 'amber' | 'calm';

export interface AttentionItem {
  id: string;
  /** Lower = more urgent; drives sort order. */
  score: number;
  tone: AttentionTone;
  emoji: string;
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

function daysBetween(fromYmd: string, toYmd: string): number {
  const a = new Date(`${fromYmd}T00:00:00.000Z`).getTime();
  const b = new Date(`${toYmd}T00:00:00.000Z`).getTime();
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

/** The clamped due date *this* calendar month (handles short months). */
function dueDateThisMonth(dueDay: number): string {
  const t = new Date();
  const y = t.getFullYear();
  const m = t.getMonth();
  const lastOfThis = new Date(y, m + 1, 0).getDate();
  const day = Math.min(dueDay, lastOfThis);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function daysLeftInMonth(): number {
  const t = new Date();
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  return last - t.getDate();
}

function dueSuffix(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

/**
 * Returns the severity-ranked attention feed (max 3 items). Also kicks off the
 * side-loads the feed depends on (per-box streaks, FX rates) so the home screen
 * doesn't have to know about them.
 */
export function useAttentionFeed(): AttentionItem[] {
  const { profile } = useProfileStore();

  const moneyboxes = useMoneyboxesStore((s) => s.moneyboxes);
  const streaks = useMoneyboxesStore((s) => s.streaks);
  const loadStreak = useMoneyboxesStore((s) => s.loadStreak);
  const loans = useLoansStore((s) => s.loans);
  const paymentsByLoan = useLoansStore((s) => s.paymentsByLoan);
  const budgets = useExpenseBudgetsStore((s) => s.budgets);
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
    const displayCcy = profile?.defaultCurrency ?? 'USD';
    const items: AttentionItem[] = [];

    // ── Loans: overdue (10) or due soon ≤3 days (30) ──
    for (const loan of loans) {
      if (loan.status !== 'active') continue;
      const ps = paymentsByLoan[loan.id] ?? [];
      if (ps.some((p) => p.paymentDate.startsWith(monthPrefix))) continue; // paid this month
      const days = daysBetween(today, dueDateThisMonth(loan.dueDayOfMonth));
      const amount = formatAmount(Math.round(loan.monthlyPaymentCents / 100), displayCcy);
      if (days < 0) {
        items.push({
          id: `loan-overdue-${loan.id}`,
          score: 10,
          tone: 'red',
          emoji: '💳',
          title: `${loan.nickname} payment overdue`,
          subtitle: `${amount} was due ${dueSuffix(-days).replace('in ', '')} ago`,
          href: `/loans/${loan.id}`,
        });
      } else if (days <= 3) {
        items.push({
          id: `loan-due-${loan.id}`,
          score: 30,
          tone: 'amber',
          emoji: '💳',
          title: `Pay ${loan.nickname}`,
          subtitle: `${amount} due ${dueSuffix(days)}`,
          href: `/loans/${loan.id}`,
        });
      }
    }

    // ── Overall budget: blown (20) or near cap ≥85% (40) ──
    const overall = budgets.find(
      (b) => b.categoryId === null && b.periodMonth.slice(0, 7) === monthPrefix,
    );
    if (overall && overall.limitCents > 0) {
      let spentCents = 0;
      for (const t of transactions) {
        if (t.type !== 'expense') continue;
        if (!t.occurredOn.startsWith(monthPrefix)) continue;
        spentCents += convertCents(t.amountCents, t.currency, overall.currency, rates);
      }
      const ratio = spentCents / overall.limitCents;
      const left = daysLeftInMonth();
      const leftLabel = `${left} day${left === 1 ? '' : 's'} left`;
      if (ratio >= 1) {
        const overBy = formatAmount(Math.round((spentCents - overall.limitCents) / 100), overall.currency);
        items.push({
          id: 'budget-blown',
          score: 20,
          tone: 'red',
          emoji: '⚠️',
          title: "You're over budget",
          subtitle: `${overBy} over with ${leftLabel}`,
          href: '/expenses/budgets',
        });
      } else if (ratio >= 0.85) {
        items.push({
          id: 'budget-near',
          score: 40,
          tone: 'amber',
          emoji: '⚠️',
          title: `Budget ${Math.round(ratio * 100)}% used`,
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
          emoji: '🔥',
          title: `Keep your ${topStreak}-day streak alive`,
          subtitle: `Fill a cell on ${top.name} today`,
          href: `/box/${top.id}`,
        });
      } else {
        items.push({
          id: 'todays-save',
          score: 60,
          tone: 'calm',
          emoji: '🪙',
          title: 'Save something today',
          subtitle: `Add to ${top.name} to start a streak`,
          href: `/box/${top.id}`,
        });
      }
    }

    items.sort((a, b) => a.score - b.score);
    return items.slice(0, MAX_ITEMS);
  }, [moneyboxes, streaks, loans, paymentsByLoan, budgets, transactions, profile?.defaultCurrency]);
}
