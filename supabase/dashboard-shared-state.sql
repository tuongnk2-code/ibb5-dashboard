create table public.dashboard_shared_state (
  key text primary key,
  data jsonb not null,
  revision integer not null default 1 check (revision > 0),
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.dashboard_shared_state enable row level security;
revoke all on public.dashboard_shared_state from anon, authenticated;
grant all on public.dashboard_shared_state to service_role;
