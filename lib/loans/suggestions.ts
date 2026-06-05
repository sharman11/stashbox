/**
 * Hard-coded "smart" suggestions for paying off loans faster. Not AI — just
 * honest heuristics over the user's real loan data, each with a concrete
 * projected saving and a route into an existing flow ("suggest, you log it").
 *
 * Pure + testable: the caller supplies the loans, which loans already have a
 * booster vault, and (optionally) this month's budget surplus.
 */

import type { StudentLoan } from '@/lib/types';
import { computeBoosterImpact } from './booster';
import { compareExtraPayment, formatApr, formatCents, formatDuration } from './math';

export type LoanSuggestionKind = 'surplus' | 'booster' | 'roundup';

export interface LoanSuggestion {
  id: string;
  kind: LoanSuggestionKind;
  emoji: string;
  title: string;
  detail: string;
  ctaLabel: string;
  /** Where the CTA routes — an existing create/log flow, pre-filled. */
  route: { pathname: string; params: Record<string, string> };
}

export interface LoanSuggestionInput {
  loans: readonly StudentLoan[];
  /** Loan ids that already have an active "Payoff Booster" vault. */
  boostedLoanIds?: ReadonlySet<string>;
  /** This month's leftover budget in USD cents (>= 0), if known. */
  surplusCents?: number;
  /** Max suggestions to return. Default 3. */
  limit?: number;
}

/** Round a monthly payment up to the next $50 so the extra goes to principal. */
const ROUNDUP_STEP_CENTS = 5_000;
/** Don't pester the user with a surplus nudge under $20. */
const MIN_SURPLUS_CENTS = 2_000;
/** A sensible default goal for a booster vault: $500 (or the balance if less). */
const DEFAULT_BOOSTER_GOAL_CENTS = 50_000;

function highestApr(loans: readonly StudentLoan[]): StudentLoan | null {
  let best: StudentLoan | null = null;
  for (const l of loans) {
    if (l.status !== 'active') continue;
    if (!best || l.aprBps > best.aprBps) best = l;
  }
  return best;
}

export function computeLoanSuggestions(input: LoanSuggestionInput): LoanSuggestion[] {
  const { loans, boostedLoanIds = new Set(), surplusCents = 0, limit = 3 } = input;
  const active = loans.filter((l) => l.status === 'active');
  if (active.length === 0) return [];

  const target = highestApr(active);
  if (!target) return [];

  const out: LoanSuggestion[] = [];

  // 1. Apply this month's budget surplus as a one-time extra payment.
  if (surplusCents >= MIN_SURPLUS_CENTS) {
    const impact = computeBoosterImpact(target, surplusCents);
    out.push({
      id: `surplus-${target.id}`,
      kind: 'surplus',
      emoji: '💸',
      title: `Put this month's ${formatCents(surplusCents)} toward ${target.nickname}`,
      detail: impact.paysOff
        ? `It would clear ${target.nickname} outright.`
        : `You're under budget — one extra payment saves ${formatCents(impact.interestSavedCents)} in interest, ${formatDuration(impact.monthsShaved)} sooner.`,
      ctaLabel: `Apply ${formatCents(surplusCents)}`,
      route: {
        pathname: '/loans/log-payment',
        params: {
          loanId: target.id,
          amount: (surplusCents / 100).toFixed(2),
          extra: '1',
          note: 'This month’s budget surplus',
        },
      },
    });
  }

  // 2. Start a Payoff Booster vault for the highest-APR loan without one.
  const needsBooster = active.find((l) => !boostedLoanIds.has(l.id));
  if (needsBooster) {
    const sample = computeBoosterImpact(
      needsBooster,
      Math.min(DEFAULT_BOOSTER_GOAL_CENTS, needsBooster.currentBalanceCents),
    );
    const goalCents = Math.min(DEFAULT_BOOSTER_GOAL_CENTS, needsBooster.currentBalanceCents);
    out.push({
      id: `booster-${needsBooster.id}`,
      kind: 'booster',
      emoji: '🎯',
      title: `Start a Payoff Booster for ${needsBooster.nickname}`,
      detail: `Save a lump in a vault, then knock it off your ${formatApr(needsBooster.aprBps)} loan. A ${formatCents(goalCents)} booster alone saves ${formatCents(sample.interestSavedCents)} in interest.`,
      ctaLabel: 'Create booster vault',
      route: {
        pathname: '/create',
        params: {
          linkedLoanId: needsBooster.id,
          name: `${needsBooster.nickname} Booster`,
          goal: String(Math.round(goalCents / 100)),
        },
      },
    });
  }

  // 3. Round this month's payment up to the next $50; the extra hits principal.
  const monthly = target.monthlyPaymentCents;
  const rounded = Math.ceil((monthly + 1) / ROUNDUP_STEP_CENTS) * ROUNDUP_STEP_CENTS;
  const diff = rounded - monthly;
  if (diff > 0) {
    const cmp = compareExtraPayment(target, diff);
    out.push({
      id: `roundup-${target.id}`,
      kind: 'roundup',
      emoji: '⏫',
      title: `Round ${target.nickname} up to ${formatCents(rounded)}/mo`,
      detail: `Just ${formatCents(diff)} more a month → save ${formatCents(cmp.interestSavedCents)} and finish ${formatDuration(cmp.monthsShaved)} sooner.`,
      ctaLabel: `Pay ${formatCents(diff)} extra now`,
      route: {
        pathname: '/loans/log-payment',
        params: {
          loanId: target.id,
          amount: (diff / 100).toFixed(2),
          extra: '1',
          note: 'Round-up to principal',
        },
      },
    });
  }

  return out.slice(0, limit);
}
