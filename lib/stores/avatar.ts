import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import { DEFAULT_AVATAR } from '../avatars';

interface AvatarState {
  emoji: string;
  load: () => Promise<void>;
  setAvatar: (emoji: string) => Promise<void>;
  reset: () => void;
}

const STORAGE_KEY = 'stashbox_avatar';

export const useAvatarStore = create<AvatarState>((set) => ({
  emoji: DEFAULT_AVATAR.emoji,

  load: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) set({ emoji: stored });
  },

  setAvatar: async (emoji) => {
    set({ emoji });
    await AsyncStorage.setItem(STORAGE_KEY, emoji);
  },

  reset: () => {
    set({ emoji: DEFAULT_AVATAR.emoji });
    AsyncStorage.removeItem(STORAGE_KEY);
  },
}));
