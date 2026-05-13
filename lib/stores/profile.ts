import { create } from 'zustand';

import {
  FREEZE_CAP,
  currentMonthString,
  pruneUsedDates,
  todayDateString,
} from '../streak-freeze';
import { supabase } from '../supabase';
import type { CurrencyCode, Profile } from '../types';

interface ProfileState {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  load: (userId: string) => Promise<void>;
  update: (patch: Partial<Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>>) => Promise<void>;
  completeOnboarding: (defaults: {
    defaultCurrency: CurrencyCode;
    preferredCurrencies: CurrencyCode[];
  }) => Promise<void>;
  /**
   * Auto-grant the monthly streak freeze the first time the user opens the
   * app in a new calendar month. No-op if already granted this month or if
   * the user is already at the cap. Idempotent — safe to call on every home
   * tab focus.
   */
  grantMonthlyFreezeIfDue: () => Promise<void>;
  /**
   * Atomically consume freezes for the given missed dates and append them to
   * usedDates (with pruning). Skips dates already in usedDates so multi-box
   * fills on the same day don't double-charge.
   */
  consumeFreezes: (missedDates: string[]) => Promise<void>;
  /** +1 freeze, capped at FREEZE_CAP. Used by the rewarded-ad bonus and the
   *  day-7 grant. Returns true if a freeze was actually added (false when at
   *  cap so the caller can show "you're full" UI). */
  grantBonusFreeze: () => Promise<boolean>;
  /** One-shot setters for the welcome-arc celebration flags. */
  markDaySevenCelebrated: () => Promise<void>;
  markDayTenCelebrated: () => Promise<void>;
  /** Sets welcomeWeekStartedAt on the user's first cell fill. No-op if
   *  already set. */
  ensureWelcomeWeekStarted: () => Promise<void>;
  /** Marks the welcome week complete (after day-7 hit OR 7 days elapsed). */
  completeWelcomeWeek: () => Promise<void>;
  reset: () => void;
}

function mapRow(row: Record<string, unknown>): Profile {
  const defaultCurrency = row.default_currency as CurrencyCode;
  const rawPreferred = row.preferred_currencies as CurrencyCode[] | null | undefined;
  const preferredCurrencies = normalizePreferred(rawPreferred ?? null, defaultCurrency);
  return {
    id: row.id as string,
    displayName: (row.display_name as string | null) ?? null,
    defaultCurrency,
    preferredCurrencies,
    soundEnabled: row.sound_enabled as boolean,
    hapticsEnabled: row.haptics_enabled as boolean,
    onboardingDone: row.onboarding_done as boolean,
    bonusCurrency: (row.bonus_currency as CurrencyCode | null) ?? null,
    streakFreezesAvailable: (row.streak_freezes_available as number | null) ?? 0,
    streakFreezesGrantMonth: (row.streak_freezes_grant_month as string | null) ?? null,
    streakFreezesUsedDates: (row.streak_freezes_used_dates as string[] | null) ?? [],
    welcomeWeekStartedAt: (row.welcome_week_started_at as string | null) ?? null,
    welcomeWeekComplete: (row.welcome_week_complete as boolean | null) ?? false,
    daySevenCelebrated: (row.day_seven_celebrated as boolean | null) ?? false,
    dayTenCelebrated: (row.day_ten_celebrated as boolean | null) ?? false,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/** Ensure preferredCurrencies is non-empty, deduped, primary-first. */
function normalizePreferred(
  list: readonly CurrencyCode[] | null,
  primary: CurrencyCode,
): CurrencyCode[] {
  const seen = new Set<CurrencyCode>();
  const out: CurrencyCode[] = [primary];
  seen.add(primary);
  if (list) {
    for (const c of list) {
      if (!seen.has(c)) {
        out.push(c);
        seen.add(c);
      }
    }
  }
  return out;
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

    const merged: Profile = { ...current, ...patch };
    // Keep primary in sync with preferredCurrencies[0] regardless of which the caller updated.
    if (patch.defaultCurrency !== undefined || patch.preferredCurrencies !== undefined) {
      merged.preferredCurrencies = normalizePreferred(
        patch.preferredCurrencies ?? current.preferredCurrencies,
        patch.defaultCurrency ?? current.defaultCurrency,
      );
      merged.defaultCurrency = merged.preferredCurrencies[0];
    }

    const snake: Record<string, unknown> = {};
    if (patch.displayName !== undefined) snake.display_name = patch.displayName;
    if (patch.defaultCurrency !== undefined || patch.preferredCurrencies !== undefined) {
      snake.default_currency = merged.defaultCurrency;
      snake.preferred_currencies = merged.preferredCurrencies;
    }
    if (patch.soundEnabled !== undefined) snake.sound_enabled = patch.soundEnabled;
    if (patch.hapticsEnabled !== undefined) snake.haptics_enabled = patch.hapticsEnabled;
    if (patch.onboardingDone !== undefined) snake.onboarding_done = patch.onboardingDone;
    if (patch.bonusCurrency !== undefined) snake.bonus_currency = patch.bonusCurrency;
    if (patch.streakFreezesAvailable !== undefined) snake.streak_freezes_available = patch.streakFreezesAvailable;
    if (patch.streakFreezesGrantMonth !== undefined) snake.streak_freezes_grant_month = patch.streakFreezesGrantMonth;
    if (patch.streakFreezesUsedDates !== undefined) snake.streak_freezes_used_dates = patch.streakFreezesUsedDates;
    if (patch.welcomeWeekStartedAt !== undefined) snake.welcome_week_started_at = patch.welcomeWeekStartedAt;
    if (patch.welcomeWeekComplete !== undefined) snake.welcome_week_complete = patch.welcomeWeekComplete;
    if (patch.daySevenCelebrated !== undefined) snake.day_seven_celebrated = patch.daySevenCelebrated;
    if (patch.dayTenCelebrated !== undefined) snake.day_ten_celebrated = patch.dayTenCelebrated;

    set({ profile: merged });

    if (Object.keys(snake).length === 0) return;

    const { error } = await supabase.from('profiles').update(snake).eq('id', current.id);
    if (error) {
      set({ profile: current, error: error.message });
    }
  },

  completeOnboarding: async ({ defaultCurrency, preferredCurrencies }) => {
    await get().update({ defaultCurrency, preferredCurrencies, onboardingDone: true });
  },

  grantMonthlyFreezeIfDue: async () => {
    const profile = get().profile;
    if (!profile) return;
    const month = currentMonthString();
    if (profile.streakFreezesGrantMonth === month) return;
    if (profile.streakFreezesAvailable >= FREEZE_CAP) {
      // At cap - still record the grant month so we don't keep checking.
      await get().update({ streakFreezesGrantMonth: month });
      return;
    }
    await get().update({
      streakFreezesAvailable: profile.streakFreezesAvailable + 1,
      streakFreezesGrantMonth: month,
    });
  },

  consumeFreezes: async (missedDates) => {
    const profile = get().profile;
    if (!profile) return;
    const already = new Set(profile.streakFreezesUsedDates);
    const toAdd = missedDates.filter((d) => !already.has(d));
    if (toAdd.length === 0) return;
    const newAvailable = Math.max(0, profile.streakFreezesAvailable - toAdd.length);
    const newUsed = pruneUsedDates([...profile.streakFreezesUsedDates, ...toAdd]);
    await get().update({
      streakFreezesAvailable: newAvailable,
      streakFreezesUsedDates: newUsed,
    });
  },

  grantBonusFreeze: async () => {
    const profile = get().profile;
    if (!profile) return false;
    if (profile.streakFreezesAvailable >= FREEZE_CAP) return false;
    await get().update({
      streakFreezesAvailable: profile.streakFreezesAvailable + 1,
    });
    return true;
  },

  markDaySevenCelebrated: async () => {
    const profile = get().profile;
    if (!profile || profile.daySevenCelebrated) return;
    await get().update({ daySevenCelebrated: true });
  },

  markDayTenCelebrated: async () => {
    const profile = get().profile;
    if (!profile || profile.dayTenCelebrated) return;
    await get().update({ dayTenCelebrated: true });
  },

  ensureWelcomeWeekStarted: async () => {
    const profile = get().profile;
    if (!profile || profile.welcomeWeekStartedAt) return;
    await get().update({ welcomeWeekStartedAt: todayDateString() });
  },

  completeWelcomeWeek: async () => {
    const profile = get().profile;
    if (!profile || profile.welcomeWeekComplete) return;
    await get().update({ welcomeWeekComplete: true });
  },

  reset: () => {
    set({ profile: null, loading: false, error: null });
  },
}));
