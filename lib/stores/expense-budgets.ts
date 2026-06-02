import { create } from 'zustand';

import { convertCents } from '../expenses/fx';
import { supabase } from '../supabase';
import type { CurrencyCode, ExpenseBudget, ExpenseTransaction } from '../types';

interface SetBudgetInput {
  userId: string;
  /** null = overall cap across all expense categories */
  categoryId: string | null;
  /** YYYY-MM-01 */
  periodMonth: string;
  limitCents: number;
  currency: CurrencyCode;
}

interface BudgetsState {
  budgets: ExpenseBudget[];
  loading: boolean;
  error: string | null;

  loadAll: (userId: string, force?: boolean) => Promise<void>;
  /** Upserts: one row per (user, category, period). */
  setBudget: (input: SetBudgetInput) => Promise<ExpenseBudget>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

const CACHE_TTL_MS = 15_000;
let lastLoad = 0;

function rowToBudget(row: Record<string, unknown>): ExpenseBudget {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    categoryId: (row.category_id as string | null) ?? null,
    periodMonth: row.period_month as string,
    limitCents: Number(row.limit_cents),
    currency: row.currency as CurrencyCode,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useExpenseBudgetsStore = create<BudgetsState>((set, get) => ({
  budgets: [],
  loading: false,
  error: null,

  loadAll: async (userId, force = false) => {
    if (!force && Date.now() - lastLoad < CACHE_TTL_MS && get().budgets.length > 0) {
      return;
    }
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('expense_budgets')
      .select('*')
      .eq('user_id', userId)
      .order('period_month', { ascending: false });

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    lastLoad = Date.now();
    set({
      budgets: (data ?? []).map((r) => rowToBudget(r as Record<string, unknown>)),
      loading: false,
    });
  },

  setBudget: async (input) => {
    // Manual upsert because Supabase's upsert requires a unique constraint name
    // and we have two partial uniques (one for category-null, one for category-set).
    // Lookup → update-or-insert is simpler and equivalent for our cardinality.
    const existing = get().budgets.find(
      (b) =>
        b.userId === input.userId &&
        b.categoryId === input.categoryId &&
        b.periodMonth === input.periodMonth,
    );

    if (existing) {
      const { data, error } = await supabase
        .from('expense_budgets')
        .update({
          limit_cents: input.limitCents,
          currency: input.currency,
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error || !data) throw new Error(error?.message ?? 'Failed to update budget');
      const budget = rowToBudget(data as Record<string, unknown>);
      set({ budgets: get().budgets.map((b) => (b.id === budget.id ? budget : b)) });
      return budget;
    }

    const { data, error } = await supabase
      .from('expense_budgets')
      .insert({
        user_id: input.userId,
        category_id: input.categoryId,
        period_month: input.periodMonth,
        limit_cents: input.limitCents,
        currency: input.currency,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create budget');
    const budget = rowToBudget(data as Record<string, unknown>);
    set({ budgets: [budget, ...get().budgets] });
    return budget;
  },

  remove: async (id) => {
    const { error } = await supabase.from('expense_budgets').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set({ budgets: get().budgets.filter((b) => b.id !== id) });
  },

  reset: () => {
    set({ budgets: [], loading: false, error: null });
    lastLoad = 0;
  },
}));

/* ──────────────────────────────────────────────────────────────────────
 * Budget progress
 * ──────────────────────────────────────────────────────────────────── */

export type BudgetStatus = 'ok' | 'warn' | 'exceeded';

export interface BudgetProgress {
  budget: ExpenseBudget;
  spentCents: number;
  /** 0..1+ (uncapped: 1.2 = 120% spent) */
  ratio: number;
  status: BudgetStatus;
}

/** ok < 80% of limit, warn 80-100%, exceeded > 100%. */
function statusFromRatio(ratio: number): BudgetStatus {
  if (ratio >= 1) return 'exceeded';
  if (ratio >= 0.8) return 'warn';
  return 'ok';
}

/** Computes progress for a single budget against the supplied transactions.
 *  Transactions outside the budget's period or wrong category are ignored. */
export function progressForBudget(
  budget: ExpenseBudget,
  transactions: readonly ExpenseTransaction[],
  rates: Record<string, number>,
): BudgetProgress {
  const monthPrefix = budget.periodMonth.slice(0, 7);
  let spent = 0;
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!t.occurredOn.startsWith(monthPrefix)) continue;
    if (budget.categoryId !== null && t.categoryId !== budget.categoryId) continue;
    spent += convertCents(t.amountCents, t.currency, budget.currency, rates);
  }
  const ratio = budget.limitCents > 0 ? spent / budget.limitCents : 0;
  return {
    budget,
    spentCents: spent,
    ratio,
    status: statusFromRatio(ratio),
  };
}
