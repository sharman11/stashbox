-- Run after schema.sql — adds the Personal Expense Tracker module.
--
-- Three tables:
--   expense_categories   : user-scoped categories (Food, Transport, …) with
--                          a 'type' (income/expense). Defaults are seeded
--                          client-side on first load so users can delete them.
--   expense_transactions : the ledger. Multi-currency, with the home-currency
--                          conversion applied at the display layer (not stored)
--                          so historical entries don't drift when FX rates move.
--   expense_budgets      : monthly caps. category_id NULL = overall cap.
--                          One row per (user, category, period_month) tuple.
--
-- RLS: same `user owns rows where user_id = auth.uid()` pattern used by
-- moneyboxes and loans.
--
-- All monetary values stored as int8 cents (multiply UI input by 100 on write,
-- divide by 100 on read). Currency stored as ISO 4217 code (e.g. 'USD').

-- ============================================================================
-- expense_categories
-- ============================================================================
create table if not exists public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  name text not null check (char_length(name) between 1 and 40),
  emoji text not null default '💰' check (char_length(emoji) <= 8),
  color text not null default '#10B981' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  -- 'expense' = money out, 'income' = money in. Drives both filter UX and
  -- which type-toggle bucket a new transaction lands in by default.
  type text not null check (type in ('expense', 'income')),
  -- Tracks whether this row came from the default-seed list. Used to render
  -- a subtle "default" badge — not enforced (user can delete defaults).
  is_default boolean not null default false,
  -- Soft-delete: marking archived hides the category from the picker without
  -- breaking historical transactions that reference it.
  archived_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_categories_user_idx
  on public.expense_categories (user_id, archived_at)
  where archived_at is null;

alter table public.expense_categories enable row level security;

drop policy if exists "categories owner select" on public.expense_categories;
create policy "categories owner select" on public.expense_categories
  for select using (auth.uid() = user_id);

drop policy if exists "categories owner insert" on public.expense_categories;
create policy "categories owner insert" on public.expense_categories
  for insert with check (auth.uid() = user_id);

drop policy if exists "categories owner update" on public.expense_categories;
create policy "categories owner update" on public.expense_categories
  for update using (auth.uid() = user_id);

drop policy if exists "categories owner delete" on public.expense_categories;
create policy "categories owner delete" on public.expense_categories
  for delete using (auth.uid() = user_id);


-- ============================================================================
-- expense_transactions
-- ============================================================================
create table if not exists public.expense_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  category_id uuid references public.expense_categories on delete set null,

  -- Cents-of-original-currency. Always positive — direction is encoded in
  -- the type column so income / expense aggregations are SUM-friendly.
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (char_length(currency) = 3),
  type text not null check (type in ('expense', 'income')),

  -- The user-visible date the money moved. YYYY-MM-DD; defaults to today.
  occurred_on date not null default current_date,
  note text check (char_length(note) <= 280),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expense_transactions_user_date_idx
  on public.expense_transactions (user_id, occurred_on desc);

create index if not exists expense_transactions_user_category_idx
  on public.expense_transactions (user_id, category_id);

alter table public.expense_transactions enable row level security;

drop policy if exists "txn owner select" on public.expense_transactions;
create policy "txn owner select" on public.expense_transactions
  for select using (auth.uid() = user_id);

drop policy if exists "txn owner insert" on public.expense_transactions;
create policy "txn owner insert" on public.expense_transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "txn owner update" on public.expense_transactions;
create policy "txn owner update" on public.expense_transactions
  for update using (auth.uid() = user_id);

drop policy if exists "txn owner delete" on public.expense_transactions;
create policy "txn owner delete" on public.expense_transactions
  for delete using (auth.uid() = user_id);


-- ============================================================================
-- expense_budgets
-- ============================================================================
create table if not exists public.expense_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,

  -- NULL category_id = overall monthly cap (across all categories).
  -- Non-null = per-category cap.
  category_id uuid references public.expense_categories on delete cascade,

  -- First-of-month anchor (YYYY-MM-01). Lets users set different caps per
  -- month and keep historical state.
  period_month date not null,

  limit_cents bigint not null check (limit_cents > 0),
  -- The currency the cap is denominated in. Compared against the user's
  -- home-currency-converted total at read time.
  currency text not null check (char_length(currency) = 3),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One overall cap and one per-category cap per month per user.
-- NULL category_id allowed once; non-null category_id unique per (user, period).
create unique index if not exists expense_budgets_overall_uniq
  on public.expense_budgets (user_id, period_month)
  where category_id is null;

create unique index if not exists expense_budgets_per_category_uniq
  on public.expense_budgets (user_id, category_id, period_month)
  where category_id is not null;

create index if not exists expense_budgets_user_period_idx
  on public.expense_budgets (user_id, period_month);

alter table public.expense_budgets enable row level security;

drop policy if exists "budget owner select" on public.expense_budgets;
create policy "budget owner select" on public.expense_budgets
  for select using (auth.uid() = user_id);

drop policy if exists "budget owner insert" on public.expense_budgets;
create policy "budget owner insert" on public.expense_budgets
  for insert with check (auth.uid() = user_id);

drop policy if exists "budget owner update" on public.expense_budgets;
create policy "budget owner update" on public.expense_budgets
  for update using (auth.uid() = user_id);

drop policy if exists "budget owner delete" on public.expense_budgets;
create policy "budget owner delete" on public.expense_budgets
  for delete using (auth.uid() = user_id);


-- ============================================================================
-- updated_at triggers
-- ============================================================================
-- Reuses the set_updated_at() function defined in schema.sql.
drop trigger if exists expense_categories_set_updated_at on public.expense_categories;
create trigger expense_categories_set_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

drop trigger if exists expense_transactions_set_updated_at on public.expense_transactions;
create trigger expense_transactions_set_updated_at
  before update on public.expense_transactions
  for each row execute function public.set_updated_at();

drop trigger if exists expense_budgets_set_updated_at on public.expense_budgets;
create trigger expense_budgets_set_updated_at
  before update on public.expense_budgets
  for each row execute function public.set_updated_at();
