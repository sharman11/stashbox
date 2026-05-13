-- Stashbox: where the user actually keeps the cash they're tracking.
-- Run in Supabase SQL Editor.
-- Stored as a string id (see lib/stash-spots.ts) — null is allowed for legacy rows.

alter table public.moneyboxes
  add column if not exists stash_spot text;
