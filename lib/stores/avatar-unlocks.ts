import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = 'stashbox_avatar_ad_unlocks';

interface AvatarUnlocksState {
  /** Avatar ids the user has unlocked by watching a rewarded ad. */
  watched: Set<string>;
  load: () => Promise<void>;
  /** Mark an avatar as ad-unlocked and persist. */
  unlock: (id: string) => Promise<void>;
}

/**
 * Persists "I watched an ad to unlock <avatar id>" so the unlock survives
 * across app launches. Lives separately from the chosen-avatar store so
 * unlocks are independent of selection.
 */
export const useAvatarUnlocksStore = create<AvatarUnlocksState>((set, get) => ({
  watched: new Set<string>(),

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const ids = JSON.parse(raw) as string[];
      if (Array.isArray(ids)) set({ watched: new Set(ids) });
    } catch {
      // Corrupt cache - leave the empty set in place.
    }
  },

  unlock: async (id) => {
    const next = new Set(get().watched);
    if (next.has(id)) return;
    next.add(id);
    set({ watched: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(next)));
  },
}));
