import { create } from 'zustand';

import { generateGrid } from '../grid';
import { supabase } from '../supabase';
import type { Cell, CurrencyCode, Moneybox, Streak, ThemeId } from '../types';

interface CreateMoneyboxInput {
  userId: string;
  name: string;
  theme: ThemeId;
  currency: CurrencyCode;
  goalAmount: number;
  targetDays: number;
  gridCols: number;
  notes: readonly number[];
}

interface FillResult {
  success: boolean;
  error?: string;
  completed?: boolean;
}

interface MoneyboxesState {
  moneyboxes: Moneybox[];
  cellsByMoneybox: Record<string, Cell[]>;
  streaks: Record<string, Streak>;
  loading: boolean;
  error: string | null;
  fillingCells: Set<string>;
  loadAll: (userId: string, force?: boolean) => Promise<void>;
  loadCells: (moneyboxId: string) => Promise<void>;
  loadStreak: (moneyboxId: string) => Promise<void>;
  create: (input: CreateMoneyboxInput) => Promise<Moneybox>;
  fillCell: (cellId: string, moneyboxId: string) => Promise<FillResult>;
  completeMoneybox: (moneyboxId: string) => Promise<void>;
  abandonMoneybox: (moneyboxId: string) => Promise<void>;
  reset: () => void;
}

const fillingCells = new Set<string>();
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
      theme: row.theme,
      currency: row.currency,
      goalAmount: Number(row.goal_amount),
      targetDays: row.target_days ?? row.grid_rows * row.grid_cols,
      gridRows: row.grid_rows,
      gridCols: row.grid_cols,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
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

    set((state) => ({
      cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: cells },
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
        theme: input.theme,
        currency: input.currency,
        goal_amount: input.goalAmount,
        target_days: input.targetDays,
        grid_rows: generated.rows,
        grid_cols: generated.cols,
      })
      .select()
      .single();

    if (mbError || !mbRow) {
      throw new Error(mbError?.message ?? 'Failed to create moneybox');
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
      theme: mbRow.theme,
      currency: mbRow.currency,
      goalAmount: Number(mbRow.goal_amount),
      targetDays: mbRow.target_days ?? input.targetDays,
      gridRows: mbRow.grid_rows ?? generated.rows,
      gridCols: mbRow.grid_cols ?? generated.cols,
      status: mbRow.status,
      createdAt: mbRow.created_at,
      completedAt: mbRow.completed_at,
    };

    set((state) => ({ moneyboxes: [newBox, ...state.moneyboxes] }));
    return newBox;
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
    const optimistic = previous.map((cell) =>
      cell.id === cellId
        ? { ...cell, isFilled: true, filledAt: new Date().toISOString() }
        : cell
    );
    set((state) => ({
      cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: optimistic },
    }));

    try {
      const { error } = await supabase
        .from('cells')
        .update({ is_filled: true, filled_at: new Date().toISOString() })
        .eq('id', cellId);

      if (error) {
        set((state) => ({
          cellsByMoneybox: { ...state.cellsByMoneybox, [moneyboxId]: previous },
        }));
        return { success: false, error: error.message };
      }

      // Update streak
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const previousStreak = get().streaks[moneyboxId];
      const wasYesterday = previousStreak?.lastFilledDate === yesterday;
      const wasToday = previousStreak?.lastFilledDate === today;

      const newCurrent = wasToday
        ? (previousStreak?.currentDays ?? 1)
        : wasYesterday
          ? (previousStreak?.currentDays ?? 0) + 1
          : 1;
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
      }

      // Auto-complete check
      const updatedCells = get().cellsByMoneybox[moneyboxId] ?? [];
      const allFilled = updatedCells.length > 0 && updatedCells.every((c) => c.isFilled);
      if (allFilled) {
        await get().completeMoneybox(moneyboxId);
        return { success: true, completed: true };
      }

      return { success: true };
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
    set((state) => ({
      moneyboxes: state.moneyboxes.map((b) =>
        b.id === moneyboxId ? { ...b, status: 'abandoned' as const } : b
      ),
    }));

    await supabase
      .from('moneyboxes')
      .update({ status: 'abandoned' })
      .eq('id', moneyboxId);
  },

  reset: () => {
    lastLoadAll = 0;
    Object.keys(lastLoadCells).forEach((k) => delete lastLoadCells[k]);
    fillingCells.clear();
    set({ moneyboxes: [], cellsByMoneybox: {}, streaks: {}, loading: false, error: null });
  },
}));
