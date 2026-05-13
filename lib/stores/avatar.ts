import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEFAULT_AVATAR, getAvatarById } from '../avatars';

interface AvatarState {
  /** Catalog id of the chosen avatar - emoji glyph for emoji avatars,
   *  slug for image avatars (e.g. `'adv-3'`). */
  id: string;
  load: () => Promise<void>;
  setAvatar: (id: string) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'stashbox_avatar';

export const useAvatarStore = create<AvatarState>((set) => ({
  id: DEFAULT_AVATAR.id,

  load: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    // Verify against the catalog so a stored value that has since been
    // removed from the app falls back to the default cleanly.
    if (stored && getAvatarById(stored)) set({ id: stored });
  },

  setAvatar: async (id) => {
    set({ id });
    await AsyncStorage.setItem(STORAGE_KEY, id);
  },

  reset: () => {
    set({ id: DEFAULT_AVATAR.id });
    AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
