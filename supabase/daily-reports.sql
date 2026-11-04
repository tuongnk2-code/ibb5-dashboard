-- Run once in the existing project's Supabase SQL Editor.
begin;
create table if not exists public.daily_reports (
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
create table if not exists public.daily_report_history (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  report_date date not null,
  snapshot jsonb not null,
  changed_at timestamptz not null default now()
);
alter table public.daily_reports enable row level security;
alter table public.daily_report_history enable row level security;
-- All report access goes through the authenticated, scoped server API.
revoke all on public.daily_reports, public.daily_report_history from anon, authenticated;
grant all on public.daily_reports, public.daily_report_history to service_role;
grant usage, select on sequence public.daily_report_history_id_seq to service_role;
create or replace function public.archive_daily_report() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.daily_report_history(user_id, report_date, snapshot)
  values (old.user_id, old.report_date, to_jsonb(old));
  return new;
end;
$$;
revoke all on function public.archive_daily_report() from public, anon, authenticated;
drop trigger if exists daily_report_archive on public.daily_reports;
create trigger daily_report_archive before update on public.daily_reports
for each row execute function public.archive_daily_report();
commit;
