begin;
create table if not exists public.salary_settings (
  month text not null check (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  acc text not null,
  probation boolean not null default false,
  revision integer not null check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null,
  primary key (month, acc)
);
create table if not exists public.salary_setting_history (
  id bigint generated always as identity primary key,
  month text not null,
  acc text not null,
  snapshot jsonb not null,
  changed_at timestamptz not null default now()
);
alter table public.salary_settings enable row level security;
alter table public.salary_setting_history enable row level security;
revoke all on public.salary_settings, public.salary_setting_history from anon, authenticated;
grant all on public.salary_settings, public.salary_setting_history to service_role;
grant usage, select on sequence public.salary_setting_history_id_seq to service_role;
create or replace function public.archive_salary_setting() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  insert into public.salary_setting_history(month, acc, snapshot) values(old.month, old.acc, to_jsonb(old));
  return new;
end;
$$;
revoke all on function public.archive_salary_setting() from public, anon, authenticated;
do $$ begin
  if not exists(select 1 from pg_trigger where tgrelid='public.salary_settings'::regclass and tgname='salary_setting_archive') then
    create trigger salary_setting_archive before update on public.salary_settings
    for each row execute function public.archive_salary_setting();
  end if;
end $$;
commit;
