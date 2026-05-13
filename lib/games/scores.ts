import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { GameId, ScoreType } from './registry';
import { GAMES } from './registry';

/** Stable storage key for a game's best score. */
const scoreKey = (id: GameId) => `stashbox_score_${id}`;

/** Direction-aware "is this score better than the existing best?" */
export function isBetter(score: number, current: number | null, type: ScoreType): boolean {
  if (current == null) return true;
  return type === 'high' ? score > current : score < current;
}

interface ScoresState {
  /** Best score per game id, or null if never played. */
  best: Record<GameId, number | null>;
  /** Hydrate all best scores from AsyncStorage. Idempotent. */
  load: () => Promise<void>;
  /** Submit a finished-game score; persists if better than current best. Returns true on new record. */
  submit: (id: GameId, score: number) => Promise<boolean>;
  reset: () => void;
}

const emptyBest = (): Record<GameId, number | null> =>
  GAMES.reduce((acc, g) => {
    acc[g.id] = null;
    return acc;
  }, {} as Record<GameId, number | null>);

export const useScoresStore = create<ScoresState>((set, get) => ({
  best: emptyBest(),

  load: async () => {
    const entries = await Promise.all(
      GAMES.map(async (g) => {
        const raw = await AsyncStorage.getItem(scoreKey(g.id));
        const parsed = raw == null ? null : Number(raw);
        return [g.id, Number.isFinite(parsed) ? parsed : null] as const;
      }),
    );
    const next = emptyBest();
    for (const [id, score] of entries) next[id] = score;
    set({ best: next });
  },

  submit: async (id, score) => {
    const game = GAMES.find((g) => g.id === id);
    if (!game) return false;
    const current = get().best[id];
    if (!isBetter(score, current, game.scoreType)) return false;
    set((state) => ({ best: { ...state.best, [id]: score } }));
    await AsyncStorage.setItem(scoreKey(id), String(score));
    return true;
  },

  reset: () => {
    set({ best: emptyBest() });
  },
}));
