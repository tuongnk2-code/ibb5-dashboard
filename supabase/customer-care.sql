-- CSKH is accessed through the authenticated, scoped /api/customer-care route.
create table public.care_contacts (
  contract_id text primary key,
  phone text not null default '' check (phone='' or phone ~ '^0[35789][0-9]{8}$'),
  consent boolean not null default false,
  note text not null default '' check (length(note)<=1000),
  revision integer not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  check (not consent or phone<>'')
);
create table public.care_campaigns (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  name text not null check (length(name) between 1 and 150),
  body text not null check (length(body) between 1 and 2000),
  first_at timestamptz not null,
  scheduled_at timestamptz not null,
  repeat_days integer not null default 0 check (repeat_days in (0,7,30)),
  contract_ids jsonb not null check (jsonb_typeof(contract_ids)='array' and jsonb_array_length(contract_ids) between 1 and 500),
  round integer not null default 1 check (round>0),
  status text not null default 'active' check (status in ('active','paused','done')),
  revision integer not null default 1 check (revision>0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index care_campaigns_owner_due on public.care_campaigns(owner_id,status,scheduled_at);
create index care_campaigns_created_by on public.care_campaigns(created_by);
create index care_contacts_updated_by on public.care_contacts(updated_by);
create table public.care_results (
  campaign_id uuid not null references public.care_campaigns(id) on delete cascade,
  round integer not null check (round>0),
  contract_id text not null,
  status text not null check (status in ('pending','sent','replied','interested','support','no_zalo','optout')),
  note text not null default '' check (length(note)<=1000),
  revision integer not null default 1 check (revision>0),
  updated_at timestamptz not null default now(),
  updated_by uuid not null references public.profiles(id),
  primary key(campaign_id,round,contract_id)
);
create index care_results_updated_by on public.care_results(updated_by);
alter table public.care_contacts enable row level security;
alter table public.care_campaigns enable row level security;
alter table public.care_results enable row level security;
revoke all on public.care_contacts,public.care_campaigns,public.care_results from public,anon,authenticated;
grant all on public.care_contacts,public.care_campaigns,public.care_results to service_role;
create policy care_contacts_api_only on public.care_contacts for all to authenticated using(false) with check(false);
create policy care_campaigns_api_only on public.care_campaigns for all to authenticated using(false) with check(false);
create policy care_results_api_only on public.care_results for all to authenticated using(false) with check(false);
