import { create } from 'zustand';

import { supabase } from '../supabase';
import type { CurrencyCode, Profile } from '../types';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  load: (userId: string) => Promise<void>;
  update: (patch: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  completeOnboarding: (defaults: { defaultCurrency: CurrencyCode }) => Promise<void>;
  reset: () => void;
}

function mapRow(row: Record<string, unknown>): Profile {
  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? null,
    defaultCurrency: row.default_currency as CurrencyCode,
    soundEnabled: row.sound_enabled as boolean,
    hapticsEnabled: row.haptics_enabled as boolean,
    onboardingDone: row.onboarding_done as boolean,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,
  error: null,

  load: async (userId) => {
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    if (!data) {
      const { data: created, error: createError } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single();
      if (createError || !created) {
        set({ error: createError?.message ?? 'Failed to create profile', loading: false });
        return;
      }
      set({ profile: mapRow(created), loading: false });
      return;
    }

    set({ profile: mapRow(data), loading: false });
  },

  update: async (patch) => {
    const current = get().profile;
    if (!current) return;

    const snake: Record<string, unknown> = {};
    if (patch.displayName !== undefined) snake.display_name = patch.displayName;
    if (patch.defaultCurrency !== undefined) snake.default_currency = patch.defaultCurrency;
    if (patch.soundEnabled !== undefined) snake.sound_enabled = patch.soundEnabled;
    if (patch.hapticsEnabled !== undefined) snake.haptics_enabled = patch.hapticsEnabled;
    if (patch.onboardingDone !== undefined) snake.onboarding_done = patch.onboardingDone;

    const optimistic: Profile = { ...current, ...patch };
    set({ profile: optimistic });

    const { error } = await supabase.from('profiles').update(snake).eq('id', current.id);
    if (error) {
      set({ profile: current, error: error.message });
    }
  },

  completeOnboarding: async ({ defaultCurrency }) => {
    await get().update({ defaultCurrency, onboardingDone: true });
  },

  reset: () => {
    set({ profile: null, loading: false, error: null });
  },
}));
