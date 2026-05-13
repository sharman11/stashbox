import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { BADGES } from './catalog';
import type { BadgeSnapshot } from './rules';
import { detectUnlocked, diffNew } from './rules';

const STORAGE_KEY = 'stashbox_badges_v1';

export interface EarnedBadge {
  unlockedAt: string; // ISO date
}

interface BadgesState {
  /** id → unlock metadata for each earned badge. */
  earned: Record<string, EarnedBadge>;
  /** Queue of badges that have unlocked but haven't been celebrated yet. */
  celebrationQueue: string[];
  load: () => Promise<void>;
  /** Compute newly-earned ids from a snapshot, persist, and queue celebrations. */
  evaluate: (snap: BadgeSnapshot) => Promise<string[]>;
  /** Acknowledge the front-of-queue celebration. */
  acknowledgeCelebration: () => void;
  reset: () => void;
}

const KNOWN_IDS = new Set(BADGES.map((b) => b.id));

async function persist(earned: Record<string, EarnedBadge>) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(earned));
}

export const useBadgesStore = create<BadgesState>((set, get) => ({
  earned: {},
  celebrationQueue: [],

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, EarnedBadge>;
      // Drop any ids we no longer ship (defensive against catalog changes).
      const filtered: Record<string, EarnedBadge> = {};
      for (const [id, meta] of Object.entries(parsed)) {
        if (KNOWN_IDS.has(id) && meta?.unlockedAt) filtered[id] = meta;
      }
      set({ earned: filtered });
    } catch {
      // Corrupt cache - ignore.
    }
  },

  evaluate: async (snap) => {
    const previouslyEarned = new Set(Object.keys(get().earned));
    const nowUnlocked = detectUnlocked(snap);
    const fresh = diffNew(nowUnlocked, previouslyEarned);
    if (fresh.length === 0) return [];

    const now = new Date().toISOString();
    const next = { ...get().earned };
    for (const id of fresh) next[id] = { unlockedAt: now };

    set({
      earned: next,
      celebrationQueue: [...get().celebrationQueue, ...fresh],
    });
    await persist(next);
    return fresh;
  },

  acknowledgeCelebration: () => {
    const [, ...rest] = get().celebrationQueue;
    set({ celebrationQueue: rest });
  },

  reset: () => {
    set({ earned: {}, celebrationQueue: [] });
  },
}));
