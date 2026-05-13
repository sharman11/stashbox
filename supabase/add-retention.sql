-- Stashbox retention features migration
-- Run AFTER schema.sql in the Supabase SQL editor.
-- Adds: streak-freeze pool + day-7/day-10/welcome-week celebration flags.

-- ============================================================================
-- profiles: retention columns
-- ============================================================================
alter table public.profiles
  add column if not exists streak_freezes_available int not null default 0,
  add column if not exists streak_freezes_grant_month text,
  add column if not exists streak_freezes_used_dates text[] not null default '{}',
  add column if not exists welcome_week_started_at date,
  add column if not exists welcome_week_complete boolean not null default false,
  add column if not exists day_seven_celebrated boolean not null default false,
  add column if not exists day_ten_celebrated boolean not null default false;

-- Cap freezes_available to 5 at the DB level so client bugs can't farm them.
alter table public.profiles drop constraint if exists profiles_freezes_cap;
alter table public.profiles
  add constraint profiles_freezes_cap check (streak_freezes_available between 0 and 5);

-- ============================================================================
-- One-shot data migration for existing installs:
-- prevents retroactive celebrations on users who are already past the threshold.
-- Safe to re-run (idempotent: bestDays >= N stays true forever).
-- ============================================================================

-- Mark users with any 7+ day best-streak as already-celebrated for day-7.
update public.profiles p
set day_seven_celebrated = true
where day_seven_celebrated = false
  and exists (
    select 1
    from public.streaks s
    join public.moneyboxes m on m.id = s.moneybox_id
    where m.user_id = p.id and s.best_days >= 7
  );

-- Same for day-10.
update public.profiles p
set day_ten_celebrated = true
where day_ten_celebrated = false
  and exists (
    select 1
    from public.streaks s
    join public.moneyboxes m on m.id = s.moneybox_id
    where m.user_id = p.id and s.best_days >= 10
  );

-- Any user who has already filled a cell is past the welcome-week phase.
-- Mark them complete so they don't see the banner. New signups get the default false.
update public.profiles p
set welcome_week_complete = true
where welcome_week_complete = false
  and exists (
    select 1
    from public.cells c
    join public.moneyboxes m on m.id = c.moneybox_id
    where m.user_id = p.id and c.is_filled = true
  );
