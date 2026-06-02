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
