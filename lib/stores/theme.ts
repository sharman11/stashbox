import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import { create } from 'zustand';

import { getPalette } from '../theme/palette';
import type { AppMode, AppPalette, ColorMode, ResolvedMode } from '../theme/tokens';

const STORAGE_KEY_MODE = 'stashbox_app_mode';
const STORAGE_KEY_COLOR = 'stashbox_color_mode';

interface ThemeState {
  /** User's pick - System / Light / Dark. */
  mode: AppMode;
  /** Standard / Colorblind. (Colorblind palette ships in Phase 2.) */
  colorMode: ColorMode;
  /** Live OS color scheme - drives 'system' mode and updates on OS change. */
  systemScheme: ResolvedMode;
  /** Hydrate from AsyncStorage + start the OS appearance listener. */
  load: () => Promise<void>;
  setMode: (m: AppMode) => Promise<void>;
  setColorMode: (c: ColorMode) => Promise<void>;
  reset: () => void;
}

function readInitialSystem(): ResolvedMode {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'system',
  colorMode: 'standard',
  systemScheme: readInitialSystem(),

  load: async () => {
    try {
      const [storedMode, storedColor] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_MODE),
        AsyncStorage.getItem(STORAGE_KEY_COLOR),
      ]);
      const next: Partial<ThemeState> = {};
      if (storedMode === 'light' || storedMode === 'dark' || storedMode === 'system') {
        next.mode = storedMode;
      }
      if (storedColor === 'standard' || storedColor === 'colorblind') {
        next.colorMode = storedColor;
      }
      next.systemScheme = readInitialSystem();
      set(next);
    } catch {
      // Corrupt cache - keep defaults.
    }

    // Subscribe to OS appearance changes so 'system' mode auto-updates.
    Appearance.addChangeListener(({ colorScheme }) => {
      const next: ResolvedMode = colorScheme === 'dark' ? 'dark' : 'light';
      if (get().systemScheme !== next) set({ systemScheme: next });
    });
  },

  setMode: async (m) => {
    set({ mode: m });
    await AsyncStorage.setItem(STORAGE_KEY_MODE, m);
  },

  setColorMode: async (c) => {
    set({ colorMode: c });
    await AsyncStorage.setItem(STORAGE_KEY_COLOR, c);
  },

  reset: () => {
    set({ mode: 'system', colorMode: 'standard' });
  },
}));

/** Resolves user pick + OS into the actual mode currently being rendered. */
export function resolveMode(state: { mode: AppMode; systemScheme: ResolvedMode }): ResolvedMode {
  return state.mode === 'system' ? state.systemScheme : state.mode;
}

/** The hook every screen uses. Returns a palette object identical in shape to
 *  the local `const C = { ... }` blocks - so migrating a screen is a one-line
 *  change with zero downstream edits. */
export function useAppTheme(): AppPalette {
  const mode = useThemeStore((s) => s.mode);
  const systemScheme = useThemeStore((s) => s.systemScheme);
  const resolved = resolveMode({ mode, systemScheme });
  return getPalette(resolved);
}
