-- Stashbox: per-moneybox emoji icon
-- Run in Supabase SQL Editor.
-- Adds an emoji shown next to the moneybox name on home / history / detail
-- screens. Legacy rows default to the piggy-bank emoji.

alter table public.moneyboxes
  add column if not exists icon text not null default '💰';
