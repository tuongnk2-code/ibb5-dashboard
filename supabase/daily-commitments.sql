create table public.daily_commitments(
 target_date date not null,acc text not null,sold integer not null check(sold between 0 and 100000),online integer not null check(online between 0 and 100000),revision integer not null check(revision>0),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),updated_by uuid not null references public.profiles(id),primary key(target_date,acc)
);
create index daily_commitments_updated_by on public.daily_commitments(updated_by);
alter table public.daily_commitments enable row level security;
revoke all on public.daily_commitments from public,anon,authenticated;
grant all on public.daily_commitments to service_role;
create policy daily_commitments_api_only on public.daily_commitments for all to authenticated using(false) with check(false);
