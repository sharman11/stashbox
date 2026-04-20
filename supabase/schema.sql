-- Stashbox schema v1
-- Run this in Supabase SQL editor: Dashboard → SQL Editor → New query → paste → Run
-- Assumes Supabase project with auth enabled and anonymous sign-ins allowed.

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles
-- ============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  default_currency text not null default 'INR',
  sound_enabled boolean not null default true,
  haptics_enabled boolean not null default true,
  onboarding_done boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================================
-- moneyboxes
-- ============================================================================
create table if not exists public.moneyboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  theme text not null default 'classic_gold',
  currency text not null default 'INR',
  goal_amount numeric(14, 2) not null check (goal_amount > 0),
  target_days int,
  grid_rows int not null check (grid_rows between 1 and 500),
  grid_cols int not null check (grid_cols between 3 and 10),
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists moneyboxes_user_id_idx on public.moneyboxes (user_id);
create index if not exists moneyboxes_status_idx on public.moneyboxes (status);

-- ============================================================================
-- cells
-- ============================================================================
create table if not exists public.cells (
  id uuid primary key default gen_random_uuid(),
  moneybox_id uuid not null references public.moneyboxes on delete cascade,
  row int not null,
  col int not null,
  amount numeric(14, 2) not null check (amount > 0),
  is_filled boolean not null default false,
  filled_at timestamptz,
  unique (moneybox_id, row, col)
);

create index if not exists cells_moneybox_id_idx on public.cells (moneybox_id);
create index if not exists cells_moneybox_filled_idx on public.cells (moneybox_id, is_filled);

-- ============================================================================
-- reminders
-- ============================================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  moneybox_id uuid not null references public.moneyboxes on delete cascade,
  time_of_day time not null,
  days_of_week smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[],
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reminders_moneybox_id_idx on public.reminders (moneybox_id);

-- ============================================================================
-- daily_suggestions
-- ============================================================================
create table if not exists public.daily_suggestions (
  id uuid primary key default gen_random_uuid(),
  moneybox_id uuid not null references public.moneyboxes on delete cascade,
  date date not null,
  suggested_cell_id uuid references public.cells on delete set null,
  accepted boolean not null default false,
  created_at timestamptz not null default now(),
  unique (moneybox_id, date)
);

-- ============================================================================
-- streaks
-- ============================================================================
create table if not exists public.streaks (
  moneybox_id uuid primary key references public.moneyboxes on delete cascade,
  current_days int not null default 0,
  best_days int not null default 0,
  last_filled_date date
);

-- ============================================================================
-- Helper: keep profiles.updated_at fresh
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- ============================================================================
-- Auto-create profile on new auth.users row (including anonymous sign-ins)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.moneyboxes enable row level security;
alter table public.cells enable row level security;
alter table public.reminders enable row level security;
alter table public.daily_suggestions enable row level security;
alter table public.streaks enable row level security;

-- profiles: user owns their own row
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

-- moneyboxes: user owns rows where user_id = auth.uid()
drop policy if exists "moneyboxes_all_own" on public.moneyboxes;
create policy "moneyboxes_all_own" on public.moneyboxes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- cells: user owns via parent moneybox
drop policy if exists "cells_all_own" on public.cells;
create policy "cells_all_own" on public.cells
  for all using (
    exists (
      select 1 from public.moneyboxes m
      where m.id = cells.moneybox_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.moneyboxes m
      where m.id = cells.moneybox_id and m.user_id = auth.uid()
    )
  );

-- reminders: same pattern
drop policy if exists "reminders_all_own" on public.reminders;
create policy "reminders_all_own" on public.reminders
  for all using (
    exists (
      select 1 from public.moneyboxes m
      where m.id = reminders.moneybox_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.moneyboxes m
      where m.id = reminders.moneybox_id and m.user_id = auth.uid()
    )
  );

-- daily_suggestions: same
drop policy if exists "daily_suggestions_all_own" on public.daily_suggestions;
create policy "daily_suggestions_all_own" on public.daily_suggestions
  for all using (
    exists (
      select 1 from public.moneyboxes m
      where m.id = daily_suggestions.moneybox_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.moneyboxes m
      where m.id = daily_suggestions.moneybox_id and m.user_id = auth.uid()
    )
  );

-- streaks: same
drop policy if exists "streaks_all_own" on public.streaks;
create policy "streaks_all_own" on public.streaks
  for all using (
    exists (
      select 1 from public.moneyboxes m
      where m.id = streaks.moneybox_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.moneyboxes m
      where m.id = streaks.moneybox_id and m.user_id = auth.uid()
    )
  );
