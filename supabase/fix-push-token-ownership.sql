-- Run after push-tokens.sql — fixes cross-account push-notification leakage.
--
-- Problem: push_tokens is unique on (user_id, token), so a single physical
-- device token can be registered to multiple accounts at once. When a user
-- switches accounts on one device, the old account's row survives (RLS forbids
-- the new account from deleting it), so the cron sends that device push
-- notifications for EVERY account ever signed in on it — leaking one account's
-- moneybox names onto another account's lock screen.
--
-- Fix: a device token belongs to exactly ONE user at a time. This SECURITY
-- DEFINER function claims the token for the calling user and removes it from
-- everyone else. Because it runs with definer rights it can clean up rows owned
-- by other users (which RLS would otherwise block) — so it also self-heals the
-- duplicate rows already in the table the next time each device registers.

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  -- One active token per user: drop this user's other (stale) device tokens,
  -- e.g. after a reinstall or an Expo Go <-> standalone build switch.
  delete from public.push_tokens
   where user_id = uid and token <> p_token;

  -- Claim this device token away from any OTHER user that still holds it.
  delete from public.push_tokens
   where token = p_token and user_id <> uid;

  -- Register (or refresh) the token for the calling user.
  insert into public.push_tokens (user_id, token, platform, updated_at)
  values (uid, p_token, p_platform, now())
  on conflict (user_id, token)
  do update set platform = excluded.platform, updated_at = now();
end;
$$;

revoke all on function public.register_push_token(text, text) from public, anon;
grant execute on function public.register_push_token(text, text) to authenticated;
