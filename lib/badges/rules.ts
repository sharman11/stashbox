import type { GameId } from '../games/registry';
import { GAMES } from '../games/registry';
import { BADGES, GAME_MASTER_THRESHOLDS } from './catalog';

/**
 * Pure detector - given a snapshot of the user's relevant state, returns the
 * full set of badge ids that *should* be unlocked. The store diffs against
 * what's already earned to decide which celebrations to fire.
 */

export interface BadgeSnapshot {
  /** Total cells filled across all moneyboxes (active + completed). */
  totalCellsFilled: number;
  /** Highest progress percentage (0-1) on any single moneybox. */
  highestProgress: number;
  /** Whether at least one moneybox has been fully completed. */
  anyBoxCompleted: boolean;
  /** Best current streak across moneyboxes. */
  bestCurrentStreak: number;
  /** Best ever streak (`bestDays`) across moneyboxes. */
  bestEverStreak: number;
  /** Best score per game (null if never played). */
  bestScores: Record<GameId, number | null>;
  /** Game ids the user has ever started. */
  played: ReadonlySet<GameId>;
}

export function detectUnlocked(snap: BadgeSnapshot): Set<string> {
  const unlocked = new Set<string>();

  for (const badge of BADGES) {
    switch (badge.group) {
      case 'box': {
        if (badge.id === 'box_first_slot' && snap.totalCellsFilled >= 1) unlocked.add(badge.id);
        else if (badge.id === 'box_ten_slots' && snap.totalCellsFilled >= 10) unlocked.add(badge.id);
        else if (badge.id === 'box_half' && snap.highestProgress >= 0.5) unlocked.add(badge.id);
        else if (badge.id === 'box_complete' && snap.anyBoxCompleted) unlocked.add(badge.id);
        else if (badge.id === 'box_streak_3' && snap.bestEverStreak >= 3) unlocked.add(badge.id);
        else if (badge.id === 'box_streak_7' && snap.bestEverStreak >= 7) unlocked.add(badge.id);
        else if (badge.id === 'box_streak_30' && snap.bestEverStreak >= 30) unlocked.add(badge.id);
        break;
      }
      case 'coin-merge':
      case 'snake':
      case 'whack-a-coin': {
        if (badge.gameId && badge.threshold != null) {
          const score = snap.bestScores[badge.gameId];
          if (score != null && score >= badge.threshold) unlocked.add(badge.id);
        }
        break;
      }
      case 'memory-match': {
        if (badge.gameId && badge.threshold != null) {
          const score = snap.bestScores[badge.gameId];
          // Memory match: lower is better. Score must be set AND below the threshold.
          if (score != null && score < badge.threshold) unlocked.add(badge.id);
        }
        break;
      }
      case 'cross': {
        if (badge.id === 'cross_explorer') {
          if (GAMES.every((g) => snap.played.has(g.id))) unlocked.add(badge.id);
        } else if (badge.id === 'cross_master') {
          const all = GAMES.every((g) => {
            const score = snap.bestScores[g.id];
            const target = GAME_MASTER_THRESHOLDS[g.id];
            if (score == null) return false;
            return target.type === 'high' ? score >= target.score : score < target.score;
          });
          if (all) unlocked.add(badge.id);
        }
        break;
      }
    }
  }

  // bestCurrentStreak isn't currently a unique badge metric; kept on the
  // snapshot so future "active streak" badges can use it without changing
  // the detector contract.
  void snap.bestCurrentStreak;

  return unlocked;
}

/** Diff helper - newly-unlocked ids since `previouslyEarned`. */
export function diffNew(now: ReadonlySet<string>, previouslyEarned: ReadonlySet<string>): string[] {
  const out: string[] = [];
  now.forEach((id) => {
    if (!previouslyEarned.has(id)) out.push(id);
  });
  return out;
}
