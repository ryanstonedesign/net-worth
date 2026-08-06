-- Run once in your Supabase project (SQL Editor → New query → paste → run).
-- The server holds only ciphertext. Even with full DB access, balances are unreadable.

create table if not exists public.vaults (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  ciphertext text not null,
  iv         text not null,
  salt       text not null,
  version    int  not null default 0,
  -- DEK (data encryption key) wrapped by the password-derived KEK. NULL for
  -- legacy rows; auto-migrated on next unlock.
  wrapped_dek      text,
  wrapped_dek_iv   text,
  -- DEK wrapped by a recovery-phrase-derived KEK. NULL until the user
  -- generates a recovery phrase.
  wrapped_dek_recovery     text,
  wrapped_dek_recovery_iv  text,
  recovery_salt            text,
  updated_at timestamptz not null default now()
);

-- Migration for existing tables (idempotent — safe to re-run).
alter table public.vaults add column if not exists wrapped_dek text;
alter table public.vaults add column if not exists wrapped_dek_iv text;
alter table public.vaults add column if not exists wrapped_dek_recovery text;
alter table public.vaults add column if not exists wrapped_dek_recovery_iv text;
alter table public.vaults add column if not exists recovery_salt text;
-- Small avatar image (base64 data URL, ~128px JPEG). Plaintext like the
-- display name, but deliberately NOT in auth user metadata: metadata is
-- embedded in every access token, and a photo there bloats the JWT past
-- gateway header limits, hanging fresh sign-ins.
alter table public.vaults add column if not exists avatar text;

alter table public.vaults enable row level security;

-- A user can only see and modify their own row. Defense in depth on top of E2E.
create policy "vault: select own"
  on public.vaults for select
  using (auth.uid() = user_id);

create policy "vault: insert own"
  on public.vaults for insert
  with check (auth.uid() = user_id);

create policy "vault: update own"
  on public.vaults for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "vault: delete own"
  on public.vaults for delete
  using (auth.uid() = user_id);

-- Keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists vaults_updated_at on public.vaults;
create trigger vaults_updated_at
  before update on public.vaults
  for each row execute function public.set_updated_at();

-- Broadcast row changes over Supabase Realtime so other devices live-update.
alter publication supabase_realtime add table public.vaults;

-- ── Ask Worthfolio usage quotas ──
-- Stores request counts and no financial content. Only the Edge Function's
-- service-role client can read or mutate this table.
create table if not exists public.ask_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  request_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.ask_usage enable row level security;

create or replace function public.consume_ask_quota(
  p_user_id uuid,
  p_daily_limit int
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  next_count int;
begin
  insert into public.ask_usage (user_id, usage_date, request_count)
  values (p_user_id, current_date, 1)
  on conflict (user_id, usage_date) do update
    set request_count = public.ask_usage.request_count + 1,
        updated_at = now()
    where public.ask_usage.request_count < p_daily_limit
  returning request_count into next_count;

  return next_count is not null and next_count <= p_daily_limit;
end;
$$;

revoke all on function public.consume_ask_quota(uuid, int) from public, anon, authenticated;
grant execute on function public.consume_ask_quota(uuid, int) to service_role;
