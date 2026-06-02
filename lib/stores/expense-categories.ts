import { create } from 'zustand';

import { supabase } from '../supabase';
import type { ExpenseCategory, TransactionType } from '../types';

interface CreateCategoryInput {
  userId: string;
  name: string;
  emoji?: string;
  color?: string;
  type: TransactionType;
  isDefault?: boolean;
}

interface UpdateCategoryInput {
  name?: string;
  emoji?: string;
  color?: string;
}

interface CategoriesState {
  categories: ExpenseCategory[];
  loading: boolean;
  error: string | null;

  loadAll: (userId: string, force?: boolean) => Promise<void>;
  /** First-load helper: if the user has no categories yet, insert the
   *  starter pack so the picker is non-empty. Safe to call repeatedly. */
  seedDefaultsIfEmpty: (userId: string) => Promise<void>;
  create: (input: CreateCategoryInput) => Promise<ExpenseCategory>;
  update: (id: string, patch: UpdateCategoryInput) => Promise<void>;
  archive: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

const CACHE_TTL_MS = 15_000;
let lastLoad = 0;
const seedingForUser = new Set<string>();

const DEFAULT_SEED: ReadonlyArray<Omit<CreateCategoryInput, 'userId' | 'isDefault'>> = [
  { name: 'Food & Dining', emoji: '🍔', color: '#F59E0B', type: 'expense' },
  { name: 'Transport', emoji: '🚗', color: '#3B82F6', type: 'expense' },
  { name: 'Housing & Rent', emoji: '🏠', color: '#8B5CF6', type: 'expense' },
  { name: 'Entertainment', emoji: '🎬', color: '#EC4899', type: 'expense' },
  { name: 'Salary', emoji: '💼', color: '#10B981', type: 'income' },
];

function rowToCategory(row: Record<string, unknown>): ExpenseCategory {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    name: row.name as string,
    emoji: (row.emoji as string) ?? '💰',
    color: (row.color as string) ?? '#10B981',
    type: row.type as TransactionType,
    isDefault: Boolean(row.is_default),
    archivedAt: (row.archived_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useExpenseCategoriesStore = create<CategoriesState>((set, get) => ({
  categories: [],
  loading: false,
  error: null,

  loadAll: async (userId, force = false) => {
    if (!force && Date.now() - lastLoad < CACHE_TTL_MS && get().categories.length > 0) {
      return;
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('expense_categories')
      .select('*')
      .eq('user_id', userId)
      .is('archived_at', null)
      .order('type', { ascending: false }) // income (i) before expense (e) alphabetically false → e first; but doesn't matter much
      .order('name', { ascending: true });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    lastLoad = Date.now();
    set({
      categories: (data ?? []).map((r) => rowToCategory(r as Record<string, unknown>)),
      loading: false,
    });
  },

  seedDefaultsIfEmpty: async (userId) => {
    if (seedingForUser.has(userId)) return;
    seedingForUser.add(userId);
    try {
      await get().loadAll(userId, true);
      if (get().categories.length > 0) return;

      const rows = DEFAULT_SEED.map((seed) => ({
        user_id: userId,
        name: seed.name,
        emoji: seed.emoji ?? '💰',
        color: seed.color ?? '#10B981',
        type: seed.type,
        is_default: true,
      }));
      const { data, error } = await supabase
        .from('expense_categories')
        .insert(rows)
        .select('*');
      if (error) {
        set({ error: error.message });
        return;
      }
      set({
        categories: (data ?? []).map((r) => rowToCategory(r as Record<string, unknown>)),
      });
    } finally {
      seedingForUser.delete(userId);
    }
  },

  create: async (input) => {
    const { data, error } = await supabase
      .from('expense_categories')
      .insert({
        user_id: input.userId,
        name: input.name.trim(),
        emoji: input.emoji ?? '💰',
        color: input.color ?? '#10B981',
        type: input.type,
        is_default: Boolean(input.isDefault),
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create category');
    const category = rowToCategory(data as Record<string, unknown>);
    set({ categories: [...get().categories, category].sort(byNameAsc) });
    return category;
  },

  update: async (id, patch) => {
    const snake: Record<string, unknown> = {};
    if (patch.name !== undefined) snake.name = patch.name.trim();
    if (patch.emoji !== undefined) snake.emoji = patch.emoji;
    if (patch.color !== undefined) snake.color = patch.color;
    if (Object.keys(snake).length === 0) return;
    const { error } = await supabase.from('expense_categories').update(snake).eq('id', id);
    if (error) throw new Error(error.message);
    set({
      categories: get().categories.map((c) =>
        c.id === id
          ? {
              ...c,
              ...(patch.name !== undefined ? { name: patch.name.trim() } : {}),
              ...(patch.emoji !== undefined ? { emoji: patch.emoji } : {}),
              ...(patch.color !== undefined ? { color: patch.color } : {}),
            }
          : c,
      ),
    });
  },

  archive: async (id) => {
    // Soft delete: preserves historical transaction joins.
    const { error } = await supabase
      .from('expense_categories')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },

  remove: async (id) => {
    // Hard delete: transactions' category_id becomes NULL via ON DELETE SET NULL.
    const { error } = await supabase.from('expense_categories').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set({ categories: get().categories.filter((c) => c.id !== id) });
  },

  reset: () => {
    set({ categories: [], loading: false, error: null });
    lastLoad = 0;
  },
}));

function byNameAsc(a: ExpenseCategory, b: ExpenseCategory): number {
  return a.name.localeCompare(b.name);
}
