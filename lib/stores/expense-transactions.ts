import { create } from 'zustand';

import { convertCents } from '../expenses/fx';
import { supabase } from '../supabase';
import type { CurrencyCode, ExpenseTransaction, TransactionType } from '../types';

interface CreateTransactionInput {
  userId: string;
  categoryId: string | null;
  amountCents: number;
  currency: CurrencyCode;
  type: TransactionType;
  /** YYYY-MM-DD. Defaults to today server-side if omitted. */
  occurredOn?: string;
  note?: string | null;
}

interface UpdateTransactionInput {
  categoryId?: string | null;
  amountCents?: number;
  currency?: CurrencyCode;
  type?: TransactionType;
  occurredOn?: string;
  note?: string | null;
}

interface TransactionsState {
  transactions: ExpenseTransaction[];
  loading: boolean;
  error: string | null;

  loadAll: (userId: string, force?: boolean) => Promise<void>;
  create: (input: CreateTransactionInput) => Promise<ExpenseTransaction>;
  update: (id: string, patch: UpdateTransactionInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

const CACHE_TTL_MS = 15_000;
let lastLoad = 0;

function rowToTransaction(row: Record<string, unknown>): ExpenseTransaction {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    categoryId: (row.category_id as string | null) ?? null,
    amountCents: Number(row.amount_cents),
    currency: row.currency as CurrencyCode,
    type: row.type as TransactionType,
    occurredOn: row.occurred_on as string,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export const useExpenseTransactionsStore = create<TransactionsState>((set, get) => ({
  transactions: [],
  loading: false,
  error: null,

  loadAll: async (userId, force = false) => {
    if (!force && Date.now() - lastLoad < CACHE_TTL_MS && get().transactions.length > 0) {
      return;
    }
    set({ loading: true, error: null });
    // Cap at 1000 to keep memory reasonable. Heavy users with > 1000 entries
    // would still see correct monthly aggregates because the dashboard scopes
    // to current month — but historical scrolling stops at 1000. Plenty for v1.
    const { data, error } = await supabase
      .from('expense_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('occurred_on', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error) {
      set({ loading: false, error: error.message });
      return;
    }
    lastLoad = Date.now();
    set({
      transactions: (data ?? []).map((r) => rowToTransaction(r as Record<string, unknown>)),
      loading: false,
    });
  },

  create: async (input) => {
    const { data, error } = await supabase
      .from('expense_transactions')
      .insert({
        user_id: input.userId,
        category_id: input.categoryId,
        amount_cents: input.amountCents,
        currency: input.currency,
        type: input.type,
        occurred_on: input.occurredOn ?? todayDate(),
        note: input.note ?? null,
      })
      .select('*')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create transaction');
    const txn = rowToTransaction(data as Record<string, unknown>);
    set({ transactions: [txn, ...get().transactions] });
    return txn;
  },

  update: async (id, patch) => {
    const snake: Record<string, unknown> = {};
    if (patch.categoryId !== undefined) snake.category_id = patch.categoryId;
    if (patch.amountCents !== undefined) snake.amount_cents = patch.amountCents;
    if (patch.currency !== undefined) snake.currency = patch.currency;
    if (patch.type !== undefined) snake.type = patch.type;
    if (patch.occurredOn !== undefined) snake.occurred_on = patch.occurredOn;
    if (patch.note !== undefined) snake.note = patch.note;
    if (Object.keys(snake).length === 0) return;
    const { error } = await supabase.from('expense_transactions').update(snake).eq('id', id);
    if (error) throw new Error(error.message);
    set({
      transactions: get().transactions.map((t) =>
        t.id === id
          ? {
              ...t,
              ...(patch.categoryId !== undefined ? { categoryId: patch.categoryId } : {}),
              ...(patch.amountCents !== undefined ? { amountCents: patch.amountCents } : {}),
              ...(patch.currency !== undefined ? { currency: patch.currency } : {}),
              ...(patch.type !== undefined ? { type: patch.type } : {}),
              ...(patch.occurredOn !== undefined ? { occurredOn: patch.occurredOn } : {}),
              ...(patch.note !== undefined ? { note: patch.note } : {}),
            }
          : t,
      ),
    });
  },

  remove: async (id) => {
    const { error } = await supabase.from('expense_transactions').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set({ transactions: get().transactions.filter((t) => t.id !== id) });
  },

  reset: () => {
    set({ transactions: [], loading: false, error: null });
    lastLoad = 0;
  },
}));

/* ──────────────────────────────────────────────────────────────────────
 * Aggregation helpers — pure functions, suitable for useMemo on the screen
 * ──────────────────────────────────────────────────────────────────── */

/** Returns the first-of-month YYYY-MM-01 for any YYYY-MM-DD. */
export function monthAnchorFor(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function todayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function currentMonthAnchor(): string {
  return monthAnchorFor(todayDate());
}

export interface MonthlyTotals {
  incomeCents: number;
  expenseCents: number;
  balanceCents: number;
}

/** Sums all transactions in a given YYYY-MM, converted to `homeCurrency`. */
export function totalsForMonth(
  transactions: readonly ExpenseTransaction[],
  monthAnchor: string,
  homeCurrency: CurrencyCode,
  rates: Record<string, number>,
): MonthlyTotals {
  let incomeCents = 0;
  let expenseCents = 0;
  const monthPrefix = monthAnchor.slice(0, 7);
  for (const t of transactions) {
    if (!t.occurredOn.startsWith(monthPrefix)) continue;
    const converted = convertCents(t.amountCents, t.currency, homeCurrency, rates);
    if (t.type === 'income') incomeCents += converted;
    else expenseCents += converted;
  }
  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
  };
}

export interface CategoryTotal {
  categoryId: string | null;
  amountCents: number;
}

/** Expense-only breakdown by category for a given month, in home currency. */
export function expensesByCategory(
  transactions: readonly ExpenseTransaction[],
  monthAnchor: string,
  homeCurrency: CurrencyCode,
  rates: Record<string, number>,
): CategoryTotal[] {
  const monthPrefix = monthAnchor.slice(0, 7);
  const bucket = new Map<string | null, number>();
  for (const t of transactions) {
    if (t.type !== 'expense') continue;
    if (!t.occurredOn.startsWith(monthPrefix)) continue;
    const cents = convertCents(t.amountCents, t.currency, homeCurrency, rates);
    bucket.set(t.categoryId, (bucket.get(t.categoryId) ?? 0) + cents);
  }
  return Array.from(bucket.entries())
    .map(([categoryId, amountCents]) => ({ categoryId, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);
}

/** Month-over-month expense totals for the last `n` months (oldest first).
 *  Returns [{ monthAnchor, expenseCents, incomeCents }] suitable for a bar chart. */
export interface MonthBucket {
  monthAnchor: string;
  expenseCents: number;
  incomeCents: number;
}

export function monthlyTrend(
  transactions: readonly ExpenseTransaction[],
  homeCurrency: CurrencyCode,
  rates: Record<string, number>,
  months = 6,
): MonthBucket[] {
  const today = new Date();
  const anchors: string[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    anchors.push(`${yyyy}-${mm}-01`);
  }
  return anchors.map((anchor) => {
    const totals = totalsForMonth(transactions, anchor, homeCurrency, rates);
    return {
      monthAnchor: anchor,
      expenseCents: totals.expenseCents,
      incomeCents: totals.incomeCents,
    };
  });
}
