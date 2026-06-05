import { create } from 'zustand';

import { generateGrid } from '../grid';
import { decideFreezeApplication, todayDateString } from '../streak-freeze';
import { supabase } from '../supabase';
import type { Cell, CurrencyCode, Moneybox, Streak, ThemeId } from '../types';
import { useProfileStore } from './profile';

interface CreateMoneyboxInput {
  userId: string;
  name: string;
  /** Emoji shown next to the name. Falls back to 💰 if omitted. */
  icon?: string;
  /** Real-world spot where the user keeps the cash (id from lib/stash-spots.ts). */
  stashSpot?: string | null;
  theme: ThemeId;
  currency: CurrencyCode;
  goalAmount: number;
  targetDays: number;
  gridCols: number;
  notes: readonly number[];
  /** Optional: link this vault to a student loan ("Payoff Booster"). */
  linkedLoanId?: string | null;
}

interface FillResult {
  success: boolean;
  error?: string;
  completed?: boolean;
  /** Number of streak freezes consumed by this fill (covers missed days). */
  freezesSpent?: number;
  /** True when the streak reset because the gap couldn't be covered. */
  streakReset?: boolean;
  /** True the FIRST time this user reaches a 7-day streak. Triggers the
   *  welcome-arc celebration. */
  unlockedDaySeven?: boolean;
  /** True the FIRST time this user reaches a 10-day streak. */
  unlockedDayTen?: boolean;
}

interface UnfillResult {
  success: boolean;
  error?: string;
}

interface MoneyboxesState {
  moneyboxes: Moneybox[];
  cellsByMoneybox: Record<string, Cell[]>;
  streaks: Record<string, Streak>;
  loading: boolean;
  error: string | null;
  fillingCells: Set<string>;
  /** Per-moneybox stack of cell ids in fill order (oldest → newest).
   *  Top of stack is the next undo target. Rebuilt from filledAt on loadCells
   *  so undo works after restarting the app. */
  fillHistory: Record<string, string[]>;
  loadAll: (userId: string, force?: boolean) => Promise<void>;
  loadCells: (moneyboxId: string) => Promise<void>;
  loadStreak: (moneyboxId: string) => Promise<void>;
  create: (input: CreateMoneyboxInput) => Promise<Moneybox>;
  fillCell: (cellId: string, moneyboxId: string) => Promise<FillResult>;
  unfillLastCell: (moneyboxId: string) => Promise<UnfillResult>;
  completeMoneybox: (moneyboxId: string) => Promise<void>;
  abandonMoneybox: (moneyboxId: string) => Promise<void>;
  renameMoneybox: (moneyboxId: string, name: string) => Promise<void>;
  setTheme: (moneyboxId: string, theme: ThemeId) => Promise<void>;
  setIcon: (moneyboxId: string, icon: string) => Promise<void>;
  setStashSpot: (moneyboxId: string, stashSpot: string | null) => Promise<void>;
  persistMilestones: (moneyboxId: string, triggered: number[]) => Promise<void>;
  reset: () => void;
}

const fillingCells = new Set<string>();
const creatingForUser = new Set<string>();
const CACHE_TTL_MS = 30_000; // 30 seconds
let lastLoadAll = 0;
const lastLoadCells: Record<string, number> = {};

export const useMoneyboxesStore = create<MoneyboxesState>((set, get) => ({
  moneyboxes: [],
  cellsByMoneybox: {},
  streaks: {},
  loading: false,
  error: null,
  fillingCells,
  fillHistory: {},

  loadAll: async (userId, force) => {
    const now = Date.now();
    if (!force && now - lastLoadAll < CACHE_TTL_MS && get().moneyboxes.length > 0) return;
    lastLoadAll = now;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('moneyboxes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    const mapped: Moneybox[] = (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      icon: (row.icon as string | null) ?? '💰',
      stashSpot: (row.stash_spot as string | null) ?? null,
      theme: row.theme,
      currency: row.currency,
      goalAmount: Number(row.goal_amount),
      targetDays: row.target_days ?? row.grid_rows * row.grid_cols,
      gridRows: row.grid_rows,
      gridCols: row.grid_cols,
      status: row.status,
      linkedLoanId: (row.linked_loan_id as string | null) ?? null,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      milestonesTriggered: Array.isArray(row.milestones_triggered)
        ? row.milestones_triggered.map(Number)
        : [],
    }));
    set({ moneyboxes: mapped, loading: false });
  },

  loadCells: async (moneyboxId) => {
    const now = Date.now();
    if (lastLoadCells[moneyboxId] && now - lastLoadCells[moneyboxId] < CACHE_TTL_MS && get().cellsByMoneybox[moneyboxId]) return;
    lastLoadCells[moneyboxId] = now;
    const { data, error } = await supabase
      .from('cells')
      .select('*')
      .eq('moneybox_id', moneyboxId)
      .order('row', { ascending: true })
      .order('col', { ascending: true });

    if (error) {
      set({ error: error.message });
      return;
    }

    const cells: Cell[] = (data ?? []).map((row) => ({
      id: row.id,
      moneyboxId: row.moneybox_id,
      row: row.row,
      col: row.col,
      amount: Number(row.amount),
      isFilled: row.is_filled,
      filledAt: row.filled_at,
    }));

    // Rebuild the undo stack from server state so undo survives a fresh
    // session: filled cells sorted oldest → newest, top-of-stack last.
    const filled = cells
      .filter((c) => c.isFilled && c.filledAt)
      .sort((a, b) => (a.filledAt ?? '').localeCompare(b.filledAt ?? ''))
      .map((c) => c.id);

    set((state) => ({
      cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: cells },
      fillHistory: { ...state.fillHistory, [moneyboxId]: filled },
    }));
  },

  loadStreak: async (moneyboxId) => {
    const { data, error } = await supabase
      .from('streaks')
      .select('*')
      .eq('moneybox_id', moneyboxId)
      .maybeSingle();

    if (error || !data) return;

    const streak: Streak = {
      moneyboxId: data.moneybox_id,
      currentDays: data.current_days,
      bestDays: data.best_days,
      lastFilledDate: data.last_filled_date,
    };
    set((state) => ({ streaks: { ...state.streaks, [moneyboxId]: streak } }));
  },

  create: async (input) => {
    // Race-condition guard - block concurrent creates for the same user.
    // Without this, rapid double-taps could submit two inserts before the DB
    // trigger lock engages (network jitter). The trigger is still the source
    // of truth, but this prevents confusing optimistic UI.
    if (creatingForUser.has(input.userId)) {
      throw new Error('Already creating a moneybox - please wait.');
    }
    creatingForUser.add(input.userId);

    try {
      // Client-side pre-check: fail fast with a clean message if limits are
      // already exhausted. Backend trigger is the source of truth - this is
      // purely for better UX.
      const { useLimitsStore } = await import('./limits');
      const { computeLimits, canCreate } = await import('../moneybox-limits');
      const bonusCurrency = useLimitsStore.getState().bonusCurrency;
      const limits = computeLimits(get().moneyboxes, bonusCurrency);
      const check = canCreate(limits, input.currency);
      if (!check.allowed) {
        throw new Error(
          check.reason === 'MAX_CURRENCIES'
            ? 'You can only use up to 3 currencies.'
            : check.reason === 'CURRENCY_FULL'
              ? `${input.currency} already has its maximum moneyboxes.`
              : check.reason === 'NEED_UNLOCK'
                ? `Watch an ad to unlock a 2nd ${input.currency} moneybox.`
                : `Bonus slot is on another currency. Switch it first.`,
        );
      }

      const generated = generateGrid({
        goal: input.goalAmount,
        days: input.targetDays,
        cols: input.gridCols,
        notes: input.notes,
      });

      const { data: mbRow, error: mbError } = await supabase
        .from('moneyboxes')
        .insert({
          user_id: input.userId,
          name: input.name,
          icon: input.icon ?? '💰',
          stash_spot: input.stashSpot ?? null,
          theme: input.theme,
          currency: input.currency,
          goal_amount: input.goalAmount,
          target_days: input.targetDays,
          grid_rows: generated.rows,
          grid_cols: generated.cols,
          // Only reference the column when actually linking, so ordinary vault
          // creation keeps working even before the migration has been run.
          ...(input.linkedLoanId ? { linked_loan_id: input.linkedLoanId } : {}),
        })
        .select()
        .single();

      if (mbError || !mbRow) {
        // Surface backend-trigger errors cleanly
        const msg = mbError?.message ?? 'Failed to create moneybox';
        throw new Error(msg);
      }

      const cellRows = generated.cells.map((cell) => ({
        moneybox_id: mbRow.id,
        row: cell.row,
        col: cell.col,
        amount: cell.amount,
      }));

      const { error: cellError } = await supabase.from('cells').insert(cellRows);
      if (cellError) {
        throw new Error(cellError.message);
      }

      const newBox: Moneybox = {
        id: mbRow.id,
        userId: mbRow.user_id,
        name: mbRow.name,
        icon: (mbRow.icon as string | null) ?? input.icon ?? '💰',
        stashSpot: (mbRow.stash_spot as string | null) ?? input.stashSpot ?? null,
        theme: mbRow.theme,
        currency: mbRow.currency,
        goalAmount: Number(mbRow.goal_amount),
        targetDays: mbRow.target_days ?? input.targetDays,
        gridRows: mbRow.grid_rows ?? generated.rows,
        gridCols: mbRow.grid_cols ?? generated.cols,
        status: mbRow.status,
        linkedLoanId: (mbRow.linked_loan_id as string | null) ?? input.linkedLoanId ?? null,
        createdAt: mbRow.created_at,
        completedAt: mbRow.completed_at,
        milestonesTriggered: Array.isArray(mbRow.milestones_triggered)
          ? mbRow.milestones_triggered.map(Number)
          : [],
      };

      set((state) => ({ moneyboxes: [newBox, ...state.moneyboxes] }));

      // If this insert consumed the bonus token (it was the 2nd active
      // moneybox in the bonus currency), sync the client-side state - the DB
      // trigger already nulled profiles.bonus_currency atomically.
      const limitsStoreState = useLimitsStore.getState();
      if (limitsStoreState.bonusCurrency === newBox.currency) {
        const activeCount = get().moneyboxes.filter(
          (m) => m.status === 'active' && m.currency === newBox.currency,
        ).length;
        if (activeCount >= 2) {
          await limitsStoreState.hydrateFromProfile(null);
        }
      }

      return newBox;
    } finally {
      creatingForUser.delete(input.userId);
    }
  },

  fillCell: async (cellId, moneyboxId): Promise<FillResult> => {
    // Lock: prevent concurrent fills on the same cell
    if (fillingCells.has(cellId)) {
      return { success: false, error: 'Already filling this cell' };
    }

    // Check if already filled locally
    const currentCells = get().cellsByMoneybox[moneyboxId] ?? [];
    const targetCell = currentCells.find((c) => c.id === cellId);
    if (!targetCell || targetCell.isFilled) {
      return { success: false, error: 'Cell already filled' };
    }

    fillingCells.add(cellId);

    const previous = currentCells;
    const previousHistory = get().fillHistory[moneyboxId] ?? [];
    const optimistic = previous.map((cell) =>
      cell.id === cellId
        ? { ...cell, isFilled: true, filledAt: new Date().toISOString() }
        : cell
    );
    set((state) => ({
      cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: optimistic },
      fillHistory: {
        ...state.fillHistory,
        [moneyboxId]: [...previousHistory, cellId],
      },
    }));

    try {
      const { error } = await supabase
        .from('cells')
        .update({ is_filled: true, filled_at: new Date().toISOString() })
        .eq('id', cellId);

      if (error) {
        set((state) => ({
          cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: previous },
          fillHistory: { ...state.fillHistory, [moneyboxId]: previousHistory },
        }));
        return { success: false, error: error.message };
      }

      // Update streak (with freeze application).
      // Read the user's freeze pool fresh from the profile store so we use
      // up-to-date counts even if a previous fill in this same session
      // already consumed some.
      const today = todayDateString();
      const previousStreak = get().streaks[moneyboxId];
      const profile = useProfileStore.getState().profile;

      const decision = decideFreezeApplication({
        lastFilled: previousStreak?.lastFilledDate ?? null,
        previousCurrent: previousStreak?.currentDays ?? 0,
        today,
        freezesAvailable: profile?.streakFreezesAvailable ?? 0,
        usedDates: profile?.streakFreezesUsedDates ?? [],
      });

      const newCurrent = decision.newCurrent;
      const newBest = Math.max(newCurrent, previousStreak?.bestDays ?? 0);

      const { error: streakError } = await supabase.from('streaks').upsert(
        {
          moneybox_id: moneyboxId,
          current_days: newCurrent,
          best_days: newBest,
          last_filled_date: today,
        },
        { onConflict: 'moneybox_id' }
      );

      if (!streakError) {
        set((state) => ({
          streaks: {
            ...state.streaks,
            [moneyboxId]: {
              moneyboxId,
              currentDays: newCurrent,
              bestDays: newBest,
              lastFilledDate: today,
            },
          },
        }));

        // Persist the freeze consumption AFTER the streak row has been
        // updated successfully - we don't want to debit the user's pool if
        // the streak write failed.
        if (decision.newlyConsumedDates.length > 0) {
          await useProfileStore.getState().consumeFreezes(decision.newlyConsumedDates);
        }
      }

      // Welcome-arc celebrations + side-effects. These fire at most once per
      // user (one-shot flags on the profile).
      let unlockedDaySeven = false;
      let unlockedDayTen = false;
      const profileNow = useProfileStore.getState().profile;
      if (profileNow) {
        // Mark welcome week start on the very first fill.
        if (!profileNow.welcomeWeekStartedAt) {
          await useProfileStore.getState().ensureWelcomeWeekStarted();
        }
        if (newCurrent >= 7 && !profileNow.daySevenCelebrated) {
          unlockedDaySeven = true;
          await useProfileStore.getState().markDaySevenCelebrated();
          // Day-7 reward: bonus freeze on the house. Capped, so this is a
          // no-op if the user is already full.
          await useProfileStore.getState().grantBonusFreeze();
          // Welcome week ends here regardless of how long it took.
          await useProfileStore.getState().completeWelcomeWeek();
        }
        if (newCurrent >= 10 && !profileNow.dayTenCelebrated) {
          unlockedDayTen = true;
          await useProfileStore.getState().markDayTenCelebrated();
        }
      }

      // Auto-complete check
      const updatedCells = get().cellsByMoneybox[moneyboxId] ?? [];
      const allFilled = updatedCells.length > 0 && updatedCells.every((c) => c.isFilled);
      if (allFilled) {
        await get().completeMoneybox(moneyboxId);
        return {
          success: true,
          completed: true,
          freezesSpent: decision.freezesSpent,
          streakReset: decision.streakReset,
          unlockedDaySeven,
          unlockedDayTen,
        };
      }

      return {
        success: true,
        freezesSpent: decision.freezesSpent,
        streakReset: decision.streakReset,
        unlockedDaySeven,
        unlockedDayTen,
      };
    } finally {
      fillingCells.delete(cellId);
    }
  },

  completeMoneybox: async (moneyboxId) => {
    const now = new Date().toISOString();
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, status: 'completed' as const, completedAt: now } : b
      ),
    }));

    await supabase
      .from('moneyboxes')
      .update({ status: 'completed', completed_at: now })
      .eq('id', moneyboxId);
  },

  abandonMoneybox: async (moneyboxId) => {
    const previous = get().moneyboxes;
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, status: 'abandoned' as const } : b
      ),
    }));

    // Never throw from this call: callers fire-and-forget so an unhandled
    // rejection (e.g. transient network failure) would crash the app on
    // Android. Roll back the optimistic update on failure instead.
    const { error } = await supabase
      .from('moneyboxes')
      .update({ status: 'abandoned' })
      .eq('id', moneyboxId);
    if (error) {
      set({ moneyboxes: previous });
    }

    // Note: bonus is no longer reset on abandon. Per the new spec, the ad
    // unlock is a one-shot token consumed on the 2nd-create. Abandonment
    // just frees up an active slot - user must re-watch an ad if they want
    // to exceed the default limit again.
  },

  unfillLastCell: async (moneyboxId) => {
    const previousHistory = get().fillHistory[moneyboxId] ?? [];
    const lastId = previousHistory.at(-1) ?? null;
    if (!lastId) {
      return { success: false, error: 'Nothing to undo' };
    }
    if (fillingCells.has(lastId)) {
      return { success: false, error: 'Busy' };
    }
    const cells = get().cellsByMoneybox[moneyboxId] ?? [];
    const target = cells.find((c) => c.id === lastId);
    if (!target || !target.isFilled) {
      // State drifted - drop the stale top so the UI re-syncs to reality.
      set((state) => ({
        fillHistory: {
          ...state.fillHistory,
          [moneyboxId]: previousHistory.slice(0, -1),
        },
      }));
      return { success: false, error: 'Nothing to undo' };
    }

    fillingCells.add(lastId);
    const previous = cells;
    const optimistic = previous.map((cell) =>
      cell.id === lastId ? { ...cell, isFilled: false, filledAt: null } : cell,
    );
    set((state) => ({
      cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: optimistic },
      fillHistory: {
        ...state.fillHistory,
        [moneyboxId]: previousHistory.slice(0, -1),
      },
      // If undoing the fill that completed the box, flip status back to active.
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId && b.status === 'completed'
          ? { ...b, status: 'active' as const, completedAt: null }
          : b,
      ),
    }));

    try {
      const { error } = await supabase
        .from('cells')
        .update({ is_filled: false, filled_at: null })
        .eq('id', lastId);

      if (error) {
        set((state) => ({
          cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: previous },
          fillHistory: { ...state.fillHistory, [moneyboxId]: previousHistory },
        }));
        return { success: false, error: error.message };
      }

      // Reactivate moneybox on backend if we just undid the completing fill.
      const stillAllFilled = optimistic.every((c) => c.isFilled);
      if (!stillAllFilled) {
        await supabase
          .from('moneyboxes')
          .update({ status: 'active', completed_at: null })
          .eq('id', moneyboxId)
          .eq('status', 'completed');
      }

      return { success: true };
    } finally {
      fillingCells.delete(lastId);
    }
  },

  renameMoneybox: async (moneyboxId, name) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Name cannot be empty');
    if (trimmed.length > 40) throw new Error('Name must be 40 characters or less');

    const previous = get().moneyboxes;
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, name: trimmed } : b,
      ),
    }));

    // Request the updated row back so we can detect RLS / filter mismatches
    // that would otherwise return `error = null, data = []` silently.
    const { data, error } = await supabase
      .from('moneyboxes')
      .update({ name: trimmed })
      .eq('id', moneyboxId)
      .select('id');

    if (error || !data || data.length === 0) {
      set({ moneyboxes: previous });
      throw new Error(error?.message ?? 'Could not save the name - try again.');
    }
  },

  setTheme: async (moneyboxId, theme) => {
    const previous = get().moneyboxes;
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, theme } : b,
      ),
    }));

    const { data, error } = await supabase
      .from('moneyboxes')
      .update({ theme })
      .eq('id', moneyboxId)
      .select('id');

    if (error || !data || data.length === 0) {
      set({ moneyboxes: previous });
      throw new Error(error?.message ?? 'Could not save the theme - try again.');
    }
  },

  setIcon: async (moneyboxId, icon) => {
    const trimmed = icon.trim();
    if (!trimmed) throw new Error('Pick an emoji');
    const previous = get().moneyboxes;
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, icon: trimmed } : b,
      ),
    }));

    const { data, error } = await supabase
      .from('moneyboxes')
      .update({ icon: trimmed })
      .eq('id', moneyboxId)
      .select('id');

    if (error || !data || data.length === 0) {
      set({ moneyboxes: previous });
      throw new Error(error?.message ?? 'Could not save the icon - try again.');
    }
  },

  setStashSpot: async (moneyboxId, stashSpot) => {
    const previous = get().moneyboxes;
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, stashSpot } : b,
      ),
    }));

    const { data, error } = await supabase
      .from('moneyboxes')
      .update({ stash_spot: stashSpot })
      .eq('id', moneyboxId)
      .select('id');

    if (error || !data || data.length === 0) {
      set({ moneyboxes: previous });
      throw new Error(error?.message ?? 'Could not save the stash spot - try again.');
    }
  },

  persistMilestones: async (moneyboxId, triggered) => {
    const unique = Array.from(new Set(triggered.map(Number))).sort((a, b) => a - b);
    const previous = get().moneyboxes;
    const current = previous.find((b) => b.id === moneyboxId);
    // No-op if nothing changed - milestones are append-only.
    const same =
      current &&
      current.milestonesTriggered.length === unique.length &&
      current.milestonesTriggered.every((m, i) => m === unique[i]);
    if (same) return;

    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, milestonesTriggered: unique } : b,
      ),
    }));

    const { error } = await supabase
      .from('moneyboxes')
      .update({ milestones_triggered: unique })
      .eq('id', moneyboxId);

    if (error) {
      // Revert optimistic update; the caller can re-try on the next fill.
      set({ moneyboxes: previous });
    }
  },

  reset: () => {
    lastLoadAll = 0;
    Object.keys(lastLoadCells).forEach((k) => delete lastLoadCells[k]);
    fillingCells.clear();
    creatingForUser.clear();
    set({ moneyboxes: [], cellsByMoneybox: {}, streaks: {}, loading: false, error: null, fillHistory: {} });
  },
}));
