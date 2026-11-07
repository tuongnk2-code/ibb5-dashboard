-- Run once in the existing project's Supabase SQL Editor.
begin;
create table if not exists public.market_reports (
  user_id uuid not null references public.profiles(id) on delete cascade,
  report_date date not null,
  status text not null check (status in ('draft','submitted','exempt')),
  data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  revision integer not null default 1,
  primary key (user_id, report_date)
);
create table if not exists public.market_report_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  report_date date not null,
  snapshot jsonb not null,
  changed_at timestamptz not null default now()
);
alter table public.market_reports enable row level security;
alter table public.market_report_history enable row level security;
-- All report access goes through the authenticated, scoped server API.
revoke all on public.market_reports, public.market_report_history from anon, authenticated;
grant all on public.market_reports, public.market_report_history to service_role;
grant usage, select on sequence public.market_report_history_id_seq to service_role;
create or replace function public.archive_market_report() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.market_report_history(user_id, report_date, snapshot)
  values (old.user_id, old.report_date, to_jsonb(old));
  return new;
end;
$$;
revoke all on function public.archive_market_report() from public, anon, authenticated;
drop trigger if exists market_report_archive on public.market_reports;
create trigger market_report_archive before update on public.market_reports
for each row execute function public.archive_market_report();
commit;
