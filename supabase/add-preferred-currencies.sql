-- Stashbox: multi-currency preferences
-- Run in Supabase SQL Editor.
-- Adds an ordered list of currencies the user has opted into during onboarding.
-- The first entry mirrors profiles.default_currency (the "primary").

alter table public.profiles
  add column if not exists preferred_currencies text[] not null default array['INR']::text[];

-- Backfill existing rows so preferred_currencies starts with the user's current default.
update public.profiles
   set preferred_currencies = array[default_currency]
 where preferred_currencies = array['INR']::text[]
   and default_currency <> 'INR';
