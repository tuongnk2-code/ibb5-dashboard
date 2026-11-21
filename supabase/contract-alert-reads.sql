begin;
create table public.contract_alert_reads (
 user_id uuid not null references public.profiles(id) on delete cascade,
 contract_id text not null check(length(contract_id) between 1 and 100),
 signature text not null check(length(signature) between 1 and 6000),
 viewed_at timestamptz not null default now(),
 primary key(user_id,contract_id)
);
alter table public.contract_alert_reads enable row level security;
revoke all on public.contract_alert_reads from public,anon,authenticated;
grant select,insert,update on public.contract_alert_reads to service_role;
commit;
