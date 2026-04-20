-- Run after schema.sql — adds push_tokens table for Expo Push

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  token text not null,
  platform text not null default 'android',
  updated_at timestamptz not null default now(),
  unique (user_id, token)
);

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_all_own" on public.push_tokens;
create policy "push_tokens_all_own" on public.push_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists push_tokens_user_id_idx on public.push_tokens (user_id);
