-- Apply this migration to an existing Worthfolio Supabase project before
-- deploying the ask-worthfolio Edge Function. It stores request counts only;
-- no prompts, account names, balances, tool results, or model responses.

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
