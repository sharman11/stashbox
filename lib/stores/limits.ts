import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { supabase } from '../supabase';
import type { CurrencyCode } from '../types';

const STORAGE_KEY = 'stashbox_bonus_currency';

interface LimitsState {
  bonusCurrency: CurrencyCode | null;
  /** True while rewarded ad or server sync is in flight. */
  syncing: boolean;
  /** Load cached value from AsyncStorage (fast, runs at app start). */
  loadCache: () => Promise<void>;
  /** Called by profile-store hydration to sync in the authoritative value. */
  hydrateFromProfile: (value: CurrencyCode | null) => Promise<void>;
  /** Grant or switch the bonus slot to `currency`. Writes cache + Supabase. */
  grantBonus: (currency: CurrencyCode, userId: string) => Promise<void>;
  /** Clear the bonus slot. Writes cache + Supabase. */
  resetBonus: (userId: string) => Promise<void>;
  /** Optimistically set local state only (used while ad is playing). */
  setSyncing: (value: boolean) => void;
}

export const useLimitsStore = create<LimitsState>((set, get) => ({
  bonusCurrency: null,
  syncing: false,

  loadCache: async () => {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEY);
      if (cached) set({ bonusCurrency: cached as CurrencyCode });
    } catch {
      // Non-fatal.
    }
  },

  hydrateFromProfile: async (value) => {
    set({ bonusCurrency: value });
    try {
      if (value) {
        await AsyncStorage.setItem(STORAGE_KEY, value);
      } else {
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Non-fatal.
    }
  },

  grantBonus: async (currency, userId) => {
    // Optimistic local update
    set({ bonusCurrency: currency });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, currency);
    } catch {
      // Non-fatal.
    }
    try {
      await supabase.from('profiles').update({ bonus_currency: currency }).eq('id', userId);
    } catch {
      // Server sync failed - keep local state so user isn't blocked.
    }
  },

  resetBonus: async (userId) => {
    const previous = get().bonusCurrency;
    set({ bonusCurrency: null });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Non-fatal.
    }
    try {
      await supabase.from('profiles').update({ bonus_currency: null }).eq('id', userId);
    } catch {
      // Server sync failed - rollback local to keep consistency.
      if (previous) {
        set({ bonusCurrency: previous });
        try {
          await AsyncStorage.setItem(STORAGE_KEY, previous);
        } catch {
          // ignore
        }
      }
    }
  },

  setSyncing: (value) => set({ syncing: value }),
}));
