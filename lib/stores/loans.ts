import { create } from 'zustand';

import { splitPayment } from '../loans/math';
import { supabase } from '../supabase';
import type {
  AprType,
  LoanPayment,
  LoanStatus,
  LoanType,
  RepaymentPlan,
  StudentLoan,
} from '../types';

/** All monetary values throughout this store are in cents to match the
 *  Supabase column types. UI components convert at the display edge via
 *  formatCents() from lib/loans/math.ts. */

interface CreateLoanInput {
  userId: string;
  nickname: string;
  loanType: LoanType;
  servicer?: string | null;
  originalPrincipalCents: number;
  currentBalanceCents: number;
  aprBps: number;
  aprType?: AprType;
  termMonthsRemaining: number;
  monthlyPaymentCents: number;
  dueDayOfMonth: number;
  autopayOn?: boolean;
  repaymentPlan?: RepaymentPlan;
  reminderEnabled?: boolean;
}

interface LogPaymentInput {
  loanId: string;
  /** YYYY-MM-DD */
  paymentDate: string;
  amountCents: number;
  isExtra?: boolean;
  sourceMoneyboxId?: string | null;
  note?: string | null;
}

interface LoansState {
  loans: StudentLoan[];
  paymentsByLoan: Record<string, LoanPayment[]>;
  loading: boolean;
  error: string | null;

  loadAll: (userId: string, force?: boolean) => Promise<void>;
  loadPayments: (loanId: string) => Promise<void>;
  create: (input: CreateLoanInput) => Promise<StudentLoan>;
  update: (loanId: string, patch: Partial<CreateLoanInput>) => Promise<void>;
  remove: (loanId: string) => Promise<void>;
  setReminder: (loanId: string, enabled: boolean) => Promise<void>;
  logPayment: (input: LogPaymentInput) => Promise<LoanPayment>;
  deletePayment: (paymentId: string, loanId: string) => Promise<void>;
  reset: () => void;
}

const CACHE_TTL_MS = 30_000;
let lastLoadAll = 0;
const lastLoadPayments: Record<string, number> = {};
const creatingForUser = new Set<string>();

function rowToLoan(row: Record<string, unknown>): StudentLoan {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    nickname: row.nickname as string,
    loanType: row.loan_type as LoanType,
    servicer: (row.servicer as string | null) ?? null,
    originalPrincipalCents: Number(row.original_principal_cents),
    currentBalanceCents: Number(row.current_balance_cents),
    aprBps: Number(row.apr_bps),
    aprType: row.apr_type as AprType,
    termMonthsRemaining: Number(row.term_months_remaining),
    monthlyPaymentCents: Number(row.monthly_payment_cents),
    dueDayOfMonth: Number(row.due_day_of_month),
    autopayOn: Boolean(row.autopay_on),
    repaymentPlan: row.repayment_plan as RepaymentPlan,
    reminderEnabled: Boolean(row.reminder_enabled),
    status: row.status as LoanStatus,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    paidOffAt: (row.paid_off_at as string | null) ?? null,
  };
}

function rowToPayment(row: Record<string, unknown>): LoanPayment {
  return {
    id: row.id as string,
    loanId: row.loan_id as string,
    paymentDate: row.payment_date as string,
    amountCents: Number(row.amount_cents),
    principalCents: Number(row.principal_cents),
    interestCents: Number(row.interest_cents),
    isExtra: Boolean(row.is_extra),
    sourceMoneyboxId: (row.source_moneybox_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  paymentsByLoan: {},
  loading: false,
  error: null,

  loadAll: async (userId, force) => {
    const now = Date.now();
    if (!force && now - lastLoadAll < CACHE_TTL_MS && get().loans.length > 0) return;
    lastLoadAll = now;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      set({ error: error.message, loading: false });
      return;
    }

    set({ loans: (data ?? []).map(rowToLoan), loading: false });
  },

  loadPayments: async (loanId) => {
    const now = Date.now();
    if (
      lastLoadPayments[loanId] &&
      now - lastLoadPayments[loanId] < CACHE_TTL_MS &&
      get().paymentsByLoan[loanId]
    ) {
      return;
    }
    lastLoadPayments[loanId] = now;
    const { data, error } = await supabase
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    if (error) {
      set({ error: error.message });
      return;
    }

    set((state) => ({
      paymentsByLoan: {
        ...state.paymentsByLoan,
        [loanId]: (data ?? []).map(rowToPayment),
      },
    }));
  },

  create: async (input) => {
    if (creatingForUser.has(input.userId)) {
      throw new Error('Already creating a loan — please wait.');
    }
    creatingForUser.add(input.userId);

    try {
      const { data, error } = await supabase
        .from('loans')
        .insert({
          user_id: input.userId,
          nickname: input.nickname,
          loan_type: input.loanType,
          servicer: input.servicer ?? null,
          original_principal_cents: input.originalPrincipalCents,
          current_balance_cents: input.currentBalanceCents,
          apr_bps: input.aprBps,
          apr_type: input.aprType ?? 'fixed',
          term_months_remaining: input.termMonthsRemaining,
          monthly_payment_cents: input.monthlyPaymentCents,
          due_day_of_month: input.dueDayOfMonth,
          autopay_on: input.autopayOn ?? false,
          repayment_plan: input.repaymentPlan ?? 'standard',
          reminder_enabled: input.reminderEnabled ?? true,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? 'Failed to create loan');
      }

      const loan = rowToLoan(data);
      set((state) => ({ loans: [loan, ...state.loans] }));
      return loan;
    } finally {
      creatingForUser.delete(input.userId);
    }
  },

  update: async (loanId, patch) => {
    const previous = get().loans;
    const optimistic = previous.map((l) =>
      l.id === loanId
        ? {
            ...l,
            ...(patch.nickname !== undefined && { nickname: patch.nickname }),
            ...(patch.servicer !== undefined && { servicer: patch.servicer ?? null }),
            ...(patch.currentBalanceCents !== undefined && {
              currentBalanceCents: patch.currentBalanceCents,
            }),
            ...(patch.aprBps !== undefined && { aprBps: patch.aprBps }),
            ...(patch.termMonthsRemaining !== undefined && {
              termMonthsRemaining: patch.termMonthsRemaining,
            }),
            ...(patch.monthlyPaymentCents !== undefined && {
              monthlyPaymentCents: patch.monthlyPaymentCents,
            }),
            ...(patch.dueDayOfMonth !== undefined && { dueDayOfMonth: patch.dueDayOfMonth }),
            ...(patch.autopayOn !== undefined && { autopayOn: patch.autopayOn }),
            ...(patch.repaymentPlan !== undefined && { repaymentPlan: patch.repaymentPlan }),
            ...(patch.reminderEnabled !== undefined && {
              reminderEnabled: patch.reminderEnabled,
            }),
          }
        : l,
    );
    set({ loans: optimistic });

    const dbPatch: Record<string, unknown> = {};
    if (patch.nickname !== undefined) dbPatch.nickname = patch.nickname;
    if (patch.servicer !== undefined) dbPatch.servicer = patch.servicer ?? null;
    if (patch.currentBalanceCents !== undefined)
      dbPatch.current_balance_cents = patch.currentBalanceCents;
    if (patch.aprBps !== undefined) dbPatch.apr_bps = patch.aprBps;
    if (patch.termMonthsRemaining !== undefined)
      dbPatch.term_months_remaining = patch.termMonthsRemaining;
    if (patch.monthlyPaymentCents !== undefined)
      dbPatch.monthly_payment_cents = patch.monthlyPaymentCents;
    if (patch.dueDayOfMonth !== undefined) dbPatch.due_day_of_month = patch.dueDayOfMonth;
    if (patch.autopayOn !== undefined) dbPatch.autopay_on = patch.autopayOn;
    if (patch.repaymentPlan !== undefined) dbPatch.repayment_plan = patch.repaymentPlan;
    if (patch.reminderEnabled !== undefined) dbPatch.reminder_enabled = patch.reminderEnabled;

    const { error } = await supabase.from('loans').update(dbPatch).eq('id', loanId);
    if (error) {
      set({ loans: previous });
      throw new Error(error.message);
    }
  },

  remove: async (loanId) => {
    const previous = get().loans;
    set({ loans: previous.filter((l) => l.id !== loanId) });
    const { error } = await supabase.from('loans').delete().eq('id', loanId);
    if (error) {
      set({ loans: previous });
      throw new Error(error.message);
    }
  },

  setReminder: async (loanId, enabled) => {
    await get().update(loanId, { reminderEnabled: enabled });
  },

  logPayment: async (input) => {
    const loan = get().loans.find((l) => l.id === input.loanId);
    if (!loan) throw new Error('Loan not found');

    // Split the payment into interest + principal using the *current*
    // balance and APR. For an extra-principal payment we still compute
    // the implied interest portion as zero — the regular EMI has already
    // covered the month's interest. The UI should pass `isExtra=true` in
    // that case; the user can also override by passing a custom split.
    let interestCents: number;
    let principalCents: number;

    if (input.isExtra) {
      interestCents = 0;
      principalCents = Math.min(input.amountCents, loan.currentBalanceCents);
    } else {
      const split = splitPayment(loan.currentBalanceCents, loan.aprBps, input.amountCents);
      interestCents = split.interestCents;
      principalCents = split.principalCents;
    }

    const newBalance = Math.max(0, loan.currentBalanceCents - principalCents);

    const { data, error } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: input.loanId,
        payment_date: input.paymentDate,
        amount_cents: input.amountCents,
        principal_cents: principalCents,
        interest_cents: interestCents,
        is_extra: input.isExtra ?? false,
        source_moneybox_id: input.sourceMoneyboxId ?? null,
        note: input.note ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to log payment');
    }

    const payment = rowToPayment(data);

    // Update the parent loan: new balance, paid-off status if applicable.
    const updates: Record<string, unknown> = {
      current_balance_cents: newBalance,
    };
    if (newBalance === 0 && loan.status === 'active') {
      updates.status = 'paid_off';
      updates.paid_off_at = new Date().toISOString();
    }

    const { error: loanError } = await supabase
      .from('loans')
      .update(updates)
      .eq('id', input.loanId);

    if (loanError) {
      throw new Error(loanError.message);
    }

    set((state) => ({
      loans: state.loans.map((l) =>
        l.id === input.loanId
          ? {
              ...l,
              currentBalanceCents: newBalance,
              status: newBalance === 0 ? ('paid_off' as const) : l.status,
              paidOffAt:
                newBalance === 0 && !l.paidOffAt ? new Date().toISOString() : l.paidOffAt,
            }
          : l,
      ),
      paymentsByLoan: {
        ...state.paymentsByLoan,
        [input.loanId]: [payment, ...(state.paymentsByLoan[input.loanId] ?? [])],
      },
    }));

    return payment;
  },

  deletePayment: async (paymentId, loanId) => {
    const payments = get().paymentsByLoan[loanId] ?? [];
    const target = payments.find((p) => p.id === paymentId);
    if (!target) return;

    const loan = get().loans.find((l) => l.id === loanId);
    if (!loan) return;

    const previousPayments = payments;
    const previousLoans = get().loans;
    const restoredBalance = loan.currentBalanceCents + target.principalCents;

    set((state) => ({
      paymentsByLoan: {
        ...state.paymentsByLoan,
        [loanId]: payments.filter((p) => p.id !== paymentId),
      },
      loans: state.loans.map((l) =>
        l.id === loanId
          ? {
              ...l,
              currentBalanceCents: restoredBalance,
              status: restoredBalance > 0 && l.status === 'paid_off' ? 'active' : l.status,
              paidOffAt: restoredBalance > 0 ? null : l.paidOffAt,
            }
          : l,
      ),
    }));

    const { error } = await supabase.from('loan_payments').delete().eq('id', paymentId);
    if (error) {
      set({ paymentsByLoan: { ...get().paymentsByLoan, [loanId]: previousPayments }, loans: previousLoans });
      throw new Error(error.message);
    }

    const updates: Record<string, unknown> = {
      current_balance_cents: restoredBalance,
    };
    if (restoredBalance > 0 && loan.status === 'paid_off') {
      updates.status = 'active';
      updates.paid_off_at = null;
    }
    await supabase.from('loans').update(updates).eq('id', loanId);
  },

  reset: () => {
    lastLoadAll = 0;
    Object.keys(lastLoadPayments).forEach((k) => delete lastLoadPayments[k]);
    creatingForUser.clear();
    set({ loans: [], paymentsByLoan: {}, loading: false, error: null });
  },
}));
