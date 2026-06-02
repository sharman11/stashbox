-- Run after schema.sql — account self-deletion RPC.
--
-- Called from the app via `supabase.rpc('delete_user')` (see lib/auth.ts).
--
-- SECURITY DEFINER so it can reach auth.users, but it ONLY ever deletes the
-- *calling* user (auth.uid()) — the function takes no argument, so a caller
-- can never pass someone else's id. Cascading FKs on auth.users remove all
-- owned rows (profiles, moneyboxes, cells, streaks, push_tokens, loans,
-- loan_payments, expense_categories, expense_transactions, expense_budgets).
--
-- `set search_path = ''` pins the resolution path so the elevated function
-- can't be hijacked by a malicious object in a caller-controlled schema;
-- every table below is therefore fully qualified.

create or replace function public.delete_user()
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
  delete from auth.users where id = uid;
end;
$$;

-- Only signed-in users may invoke it; never anon or the public role.
revoke all on function public.delete_user() from public, anon;
grant execute on function public.delete_user() to authenticated;
