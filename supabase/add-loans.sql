-- Run after schema.sql — adds the student-loan tracker (Phase 1).
--
-- Two tables:
--   loans          : one row per loan a user is paying down
--   loan_payments  : ledger of payments made against a loan (including extras
--                    sourced from completed moneyboxes)
--
-- RLS: same `user owns rows where user_id = auth.uid()` pattern used by
-- moneyboxes, plus the parent-row pattern for loan_payments.

-- ============================================================================
-- loans
-- ============================================================================
create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  nickname text not null,                          -- "Sallie Mae undergrad"
  loan_type text not null check (loan_type in (
    'federal_subsidized',
    'federal_unsubsidized',
    'federal_plus',
    'perkins',
    'private',
    'refinanced'
  )),
  servicer text,                                   -- "MOHELA", "Nelnet", ...

  -- All monetary fields stored in cents-of-USD as integers to avoid float drift.
  -- Display layer divides by 100.
  original_principal_cents bigint not null check (original_principal_cents > 0),
  current_balance_cents    bigint not null check (current_balance_cents >= 0),

  -- APR stored as basis points (650 = 6.50%). Avoids float rounding for
  -- a value we'll repeatedly multiply into balance calculations.
  apr_bps int not null check (apr_bps >= 0 and apr_bps <= 5000),
  apr_type text not null default 'fixed' check (apr_type in ('fixed', 'variable')),

  term_months_remaining int not null check (term_months_remaining > 0 and term_months_remaining <= 600),
  monthly_payment_cents bigint not null check (monthly_payment_cents > 0),

  -- Day of month payment is due (1-28 to dodge the Feb-29 problem;
  -- anyone with a day-31 due date will see their reminder fire on the 28th,
  -- which is fine for nudge purposes).
  due_day_of_month int not null check (due_day_of_month between 1 and 28),

  autopay_on boolean not null default false,
  repayment_plan text not null default 'standard' check (repayment_plan in (
    'standard',
    'graduated',
    'extended',
    'idr',
    'pslf',
    'other'
  )),

  reminder_enabled boolean not null default true,

  status text not null default 'active' check (status in (
    'active',
    'paid_off',
    'in_deferment'
  )),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_off_at timestamptz
);

create index if not exists loans_user_id_idx on public.loans (user_id);
create index if not exists loans_status_idx on public.loans (status);
create index if not exists loans_due_day_idx on public.loans (due_day_of_month) where status = 'active' and reminder_enabled = true;

drop trigger if exists loans_set_updated_at on public.loans;
create trigger loans_set_updated_at
before update on public.loans
for each row execute function public.set_updated_at();

-- ============================================================================
-- loan_payments
-- ============================================================================
create table if not exists public.loan_payments (
  id uuid primary key default gen_random_uuid(),
  loan_id uuid not null references public.loans on delete cascade,

  -- YYYY-MM-DD of the payment. Stored as date because we never care about
  -- hour-of-day for amortization.
  payment_date date not null,

  amount_cents bigint not null check (amount_cents > 0),
  principal_cents bigint not null check (principal_cents >= 0),
  interest_cents bigint not null check (interest_cents >= 0),

  -- True when this row represents an extra principal payment outside the
  -- regular EMI (e.g. from a completed moneybox earmarked to this loan).
  is_extra boolean not null default false,
  source_moneybox_id uuid references public.moneyboxes on delete set null,

  note text,

  created_at timestamptz not null default now()
);

create index if not exists loan_payments_loan_id_idx on public.loan_payments (loan_id);
create index if not exists loan_payments_date_idx on public.loan_payments (loan_id, payment_date desc);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.loans enable row level security;
alter table public.loan_payments enable row level security;

drop policy if exists "loans_all_own" on public.loans;
create policy "loans_all_own" on public.loans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "loan_payments_all_own" on public.loan_payments;
create policy "loan_payments_all_own" on public.loan_payments
  for all using (
    exists (
      select 1 from public.loans l
      where l.id = loan_payments.loan_id and l.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.loans l
      where l.id = loan_payments.loan_id and l.user_id = auth.uid()
    )
  );
