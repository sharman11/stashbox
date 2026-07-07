import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

/** The hero background the user has chosen for the home tab.
 *  `default` = brand gradient + texture + mascot peek (current look).
 *  `painted-frame` = the painted edge-frame illustration.
 *  `meadow` = full squirrel-meadow scene illustration.
 *  `leaf-frame` = soft green leaf vignette frame.
 *  `forest-peek` = forest leaf frame with a peeking squirrel. */
export type HeroBackground =
  | 'default'
  | 'painted-frame'
  | 'meadow'
  | 'leaf-frame'
  | 'forest-peek';

/** The Stash tab hero background.
 *  `gradient` = the default brand gradient (current look).
 *  the rest are wide illustrated scenes (cozy / moneybox / mascot / minimal). */
export type StashHero =
  | 'gradient'
  | 'cozy'
  | 'moneybox'
  | 'mascot'
  | 'minimal';

/** The Expenses tab hero background.
 *  `gradient` = the default brand gradient.
 *  the rest are wide illustrated scenes (market / balance / receipt / acorns). */
export type ExpenseHero =
  | 'gradient'
  | 'market'
  | 'balance'
  | 'receipt'
  | 'acorns';

const STORAGE_KEY = 'stashbox_personalization_v1';

interface Persisted {
  heroBackground: HeroBackground;
  stashHero: StashHero;
  expenseHero: ExpenseHero;
}

interface PersonalizationState extends Persisted {
  hydrated: boolean;
  /** Pull saved choices off disk into the store. Safe to call multiple times. */
  hydrate: () => Promise<void>;
  setHeroBackground: (bg: HeroBackground) => Promise<void>;
  setStashHero: (bg: StashHero) => Promise<void>;
  setExpenseHero: (bg: ExpenseHero) => Promise<void>;
}

const DEFAULTS: Persisted = {
  heroBackground: 'default',
  stashHero: 'gradient',
  expenseHero: 'gradient',
};

async function readDisk(): Promise<Partial<Persisted>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Persisted>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

async function writeDisk(value: Persisted): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* best-effort */
  }
}

let hydrating: Promise<void> | null = null;

export const usePersonalizationStore = create<PersonalizationState>((set, get) => ({
  ...DEFAULTS,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return;
    if (hydrating) {
      await hydrating;
      return;
    }
    hydrating = (async () => {
      const disk = await readDisk();
      set({
        ...DEFAULTS,
        ...disk,
        hydrated: true,
      });
    })();
    try {
      await hydrating;
    } finally {
      hydrating = null;
    }
  },

  setHeroBackground: async (bg) => {
    set({ heroBackground: bg });
    const { heroBackground, stashHero, expenseHero } = get();
    await writeDisk({ heroBackground, stashHero, expenseHero });
  },

  setStashHero: async (bg) => {
    set({ stashHero: bg });
    const { heroBackground, stashHero, expenseHero } = get();
    await writeDisk({ heroBackground, stashHero, expenseHero });
  },

  setExpenseHero: async (bg) => {
    set({ expenseHero: bg });
    const { heroBackground, stashHero, expenseHero } = get();
    await writeDisk({ heroBackground, stashHero, expenseHero });
  },
}));
