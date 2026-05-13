import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { GameId } from './registry';

/** Tracks which games the user has ever started - used by the "Game Explorer" badge. */
const STORAGE_KEY = 'stashbox_played_games';

interface PlayedState {
  played: Set<GameId>;
  load: () => Promise<void>;
  markPlayed: (id: GameId) => Promise<void>;
  reset: () => void;
}

export const usePlayedStore = create<PlayedState>((set, get) => ({
  played: new Set(),

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const arr = JSON.parse(raw) as GameId[];
      set({ played: new Set(arr) });
    } catch {
      // Corrupt cache - start fresh.
    }
  },

  markPlayed: async (id) => {
    if (get().played.has(id)) return;
    const next = new Set(get().played);
    next.add(id);
    set({ played: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  },

  reset: () => {
    set({ played: new Set() });
  },
}));
