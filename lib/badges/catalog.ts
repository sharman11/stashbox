import type { GameId } from '../games/registry';

export type BadgeGroup = 'box' | 'coin-merge' | 'snake' | 'memory-match' | 'whack-a-coin' | 'cross';

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Single emoji shown on the badge tile + celebration. */
  icon: string;
  group: BadgeGroup;
  /** When this badge cares about a game's best score. */
  gameId?: GameId;
  /** Threshold the relevant metric must cross. Direction is implicit per group. */
  threshold?: number;
}

/**
 * Catalog of all unlockable badges.
 *
 * Adding a new badge:
 *   1. Append entry here.
 *   2. If it depends on a new metric, extend lib/badges/rules.ts.
 *
 * The Profile screen renders this list; locked badges show as grayed-out tiles.
 */
export const BADGES: readonly Badge[] = [
  // ── Money box milestones ──────────────────────────────────────────
  { id: 'box_first_slot', name: 'First Slot', description: 'Filled your very first cell.', icon: '🌱', group: 'box', threshold: 1 },
  { id: 'box_ten_slots', name: 'Ten Slots Filled', description: 'Saved 10 cells. Momentum mode.', icon: '🔟', group: 'box', threshold: 10 },
  { id: 'box_half', name: 'Halfway Hero', description: 'Reached 50% on any moneybox.', icon: '⏳', group: 'box' },
  { id: 'box_complete', name: 'Box Complete', description: 'Finished a whole moneybox. Smash!', icon: '🏆', group: 'box' },
  { id: 'box_streak_3', name: 'First Streak', description: 'Saved 3 days in a row.', icon: '🔥', group: 'box', threshold: 3 },
  { id: 'box_streak_7', name: 'Week Warrior', description: 'Saved 7 days in a row.', icon: '⚔️', group: 'box', threshold: 7 },
  { id: 'box_streak_30', name: 'Month Master', description: 'Saved 30 days in a row. Legendary.', icon: '👑', group: 'box', threshold: 30 },

  // ── Coin Merge ────────────────────────────────────────────────────
  { id: 'merge_50', name: 'Coin Collector', description: 'Reached 50 in Coin Merge.', icon: '🪙', group: 'coin-merge', gameId: 'coin-merge', threshold: 50 },
  { id: 'merge_200', name: 'Money Mover', description: 'Reached 200 in Coin Merge.', icon: '💸', group: 'coin-merge', gameId: 'coin-merge', threshold: 200 },
  { id: 'merge_500', name: 'Cash King', description: 'Reached 500 in Coin Merge.', icon: '💵', group: 'coin-merge', gameId: 'coin-merge', threshold: 500 },
  { id: 'merge_1000', name: 'Wealth Wizard', description: 'Reached 1,000 in Coin Merge.', icon: '🧙', group: 'coin-merge', gameId: 'coin-merge', threshold: 1000 },
  { id: 'merge_2000', name: 'Merge Master', description: 'Reached 2,000 in Coin Merge.', icon: '🎯', group: 'coin-merge', gameId: 'coin-merge', threshold: 2000 },
  { id: 'merge_5000', name: 'Savings Legend', description: 'Reached 5,000 in Coin Merge.', icon: '💎', group: 'coin-merge', gameId: 'coin-merge', threshold: 5000 },

  // ── Snake ─────────────────────────────────────────────────────────
  { id: 'snake_100', name: 'Slithering Saver', description: 'Scored 100 in Snake.', icon: '🐍', group: 'snake', gameId: 'snake', threshold: 100 },
  { id: 'snake_500', name: 'Coiled Up', description: 'Scored 500 in Snake.', icon: '🪺', group: 'snake', gameId: 'snake', threshold: 500 },
  { id: 'snake_1000', name: 'Big Boa', description: 'Scored 1,000 in Snake.', icon: '🟢', group: 'snake', gameId: 'snake', threshold: 1000 },
  { id: 'snake_2500', name: 'Apex Saver', description: 'Scored 2,500 in Snake.', icon: '🐉', group: 'snake', gameId: 'snake', threshold: 2500 },

  // ── Memory Match (lower is better - fewest moves) ─────────────────
  { id: 'memory_30', name: 'Sharp Eyes', description: 'Cleared the board in under 30 moves.', icon: '👀', group: 'memory-match', gameId: 'memory-match', threshold: 30 },
  { id: 'memory_20', name: 'Photographic', description: 'Cleared the board in under 20 moves.', icon: '📸', group: 'memory-match', gameId: 'memory-match', threshold: 20 },
  { id: 'memory_15', name: 'Mind Palace', description: 'Cleared the board in under 15 moves.', icon: '🧠', group: 'memory-match', gameId: 'memory-match', threshold: 15 },

  // ── Whack-a-Coin ──────────────────────────────────────────────────
  { id: 'whack_500', name: 'Quick Hands', description: 'Scored 500 in Whack-a-Coin.', icon: '✋', group: 'whack-a-coin', gameId: 'whack-a-coin', threshold: 500 },
  { id: 'whack_1000', name: 'Hammer Time', description: 'Scored 1,000 in Whack-a-Coin.', icon: '🔨', group: 'whack-a-coin', gameId: 'whack-a-coin', threshold: 1000 },
  { id: 'whack_2500', name: 'Whack Wizard', description: 'Scored 2,500 in Whack-a-Coin.', icon: '🪄', group: 'whack-a-coin', gameId: 'whack-a-coin', threshold: 2500 },
  { id: 'whack_5000', name: 'Coin Crusher', description: 'Scored 5,000 in Whack-a-Coin.', icon: '💥', group: 'whack-a-coin', gameId: 'whack-a-coin', threshold: 5000 },

  // ── Cross-game ────────────────────────────────────────────────────
  { id: 'cross_explorer', name: 'Game Explorer', description: 'Tried all 4 mini-games.', icon: '🧭', group: 'cross' },
  { id: 'cross_master', name: 'Game Master', description: 'Hit a top-tier badge in every game.', icon: '🌟', group: 'cross' },
];

export function getBadge(id: string): Badge | undefined {
  return BADGES.find((b) => b.id === id);
}

/** Used to power the "Game Master" badge - top-tier per game. */
export const GAME_MASTER_THRESHOLDS: Record<GameId, { score: number; type: 'high' | 'low' }> = {
  'coin-merge': { score: 1000, type: 'high' },
  snake: { score: 500, type: 'high' },
  'memory-match': { score: 20, type: 'low' },
  'whack-a-coin': { score: 1000, type: 'high' },
};
