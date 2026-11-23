-- All access passes through scoped server endpoints; device keys are hashed.
create table public.worker_devices (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null references public.profiles(id),
 name text not null check(length(name) between 1 and 100), token_hash text not null unique,
 capabilities text[] not null default '{}', last_seen_at timestamptz, revoked boolean not null default false,
 created_at timestamptz not null default now()
);
create index worker_devices_owner on public.worker_devices(owner_id);
create table public.worker_tasks (
 id uuid primary key, owner_id uuid not null references public.profiles(id), created_by uuid not null references public.profiles(id),
 device_id uuid references public.worker_devices(id), name text not null check(length(name) between 1 and 120),
 channel text not null check(channel in ('meta_facebook','top_zalo','chot_care','sms_akabiz','fbnumber','fb_akabiz','facebook_search','zalo_campaign','facebook_post','email_campaign','other')),
 config jsonb not null check(jsonb_typeof(config)='object'),
 scheduled_at timestamptz, next_run_at timestamptz, repeat_days integer not null default 0 check(repeat_days in(0,1,7)),
 enabled boolean not null default false, revision integer not null default 1, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index worker_tasks_owner on public.worker_tasks(owner_id);
create index worker_tasks_creator on public.worker_tasks(created_by);
create index worker_tasks_due on public.worker_tasks(device_id,next_run_at) where enabled;
create table public.worker_runs (
 id uuid primary key default gen_random_uuid(), task_id uuid not null references public.worker_tasks(id),
 device_id uuid not null references public.worker_devices(id), owner_id uuid not null references public.profiles(id),
 request_id text not null, task_snapshot jsonb not null,
 status text not null default 'queued' check(status in('queued','running','succeeded','failed','cancelled')),
 cancel_requested boolean not null default false, summary text not null default '',
 created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
 unique(task_id,request_id)
);
create index worker_runs_owner on public.worker_runs(owner_id,created_at desc);
create index worker_runs_device_queue on public.worker_runs(device_id,created_at) where status in('queued','running');
alter table public.worker_devices enable row level security;
alter table public.worker_tasks enable row level security;
alter table public.worker_runs enable row level security;
revoke all on public.worker_devices,public.worker_tasks,public.worker_runs from public,anon,authenticated;
grant all on public.worker_devices,public.worker_tasks,public.worker_runs to service_role;
create policy worker_devices_api_only on public.worker_devices for all to authenticated using(false) with check(false);
create policy worker_tasks_api_only on public.worker_tasks for all to authenticated using(false) with check(false);
create policy worker_runs_api_only on public.worker_runs for all to authenticated using(false) with check(false);

-- The device poll is also the scheduler: schedules work when the PC is available,
-- without a paid scheduler and without replaying every missed daily occurrence.
create function public.claim_worker_run(p_device uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare d public.worker_devices%rowtype; t public.worker_tasks%rowtype; r public.worker_runs%rowtype;
begin
 select * into d from public.worker_devices where id=p_device for update;
 if not found or d.revoked then raise exception 'Device unavailable'; end if;
 update public.worker_devices set last_seen_at=now() where id=d.id;
 if exists(select 1 from public.worker_runs where device_id=d.id and status='running') then return null; end if;
 for t in select * from public.worker_tasks where device_id=d.id and owner_id=d.owner_id and enabled and next_run_at<=now() and channel=any(d.capabilities) for update loop
   if not exists(select 1 from public.worker_runs where task_id=t.id and status in('queued','running')) then
     insert into public.worker_runs(task_id,device_id,owner_id,request_id,task_snapshot)
       values(t.id,d.id,t.owner_id,'schedule:'||t.next_run_at::text,jsonb_build_object('name',t.name,'channel',t.channel,'config',t.config)) on conflict(task_id,request_id) do nothing;
     update public.worker_tasks set next_run_at=case when t.repeat_days=0 then null else t.next_run_at + (floor(extract(epoch from(now()-t.next_run_at))/(86400*t.repeat_days))+1)*t.repeat_days*interval '1 day' end,
       enabled=t.repeat_days<>0,revision=revision+1,updated_at=now() where id=t.id;
   end if;
 end loop;
 select * into r from public.worker_runs where device_id=d.id and status='queued' and not cancel_requested
   and task_snapshot->>'channel'=any(d.capabilities) order by created_at,id limit 1 for update skip locked;
 if not found then return null; end if;
 update public.worker_runs set status='running',started_at=now() where id=r.id returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.claim_worker_run(uuid) from public,anon,authenticated;
grant execute on function public.claim_worker_run(uuid) to service_role;

-- Task locking serializes manual runs, pause and schedule claims.
create function public.enqueue_worker_run(p_task uuid,p_request text,p_revision integer) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.worker_tasks%rowtype; d public.worker_devices%rowtype; r public.worker_runs%rowtype;
begin
 select * into strict t from public.worker_tasks where id=p_task for update;
 select * into d from public.worker_devices where id=t.device_id;
 if not found or d.revoked or d.owner_id<>t.owner_id or not(t.channel=any(d.capabilities)) then raise exception 'Tool chưa kết nối cho kênh này.'; end if;
 select * into r from public.worker_runs where task_id=t.id and request_id=p_request;
 if found then return to_jsonb(r); end if;
 if p_revision is distinct from t.revision then raise exception 'Tác vụ đã thay đổi sau khi xem trước. Tải lại và xác nhận lại.'; end if;
 if exists(select 1 from public.worker_runs where task_id=t.id and status in('queued','running')) then raise exception 'Tác vụ đã có lượt đang chờ hoặc đang chạy.'; end if;
 insert into public.worker_runs(task_id,device_id,owner_id,request_id,task_snapshot)
   values(t.id,t.device_id,t.owner_id,p_request,jsonb_build_object('name',t.name,'channel',t.channel,'config',t.config)) returning * into r;
 return to_jsonb(r);
end $$;
revoke all on function public.enqueue_worker_run(uuid,text,integer) from public,anon,authenticated;
grant execute on function public.enqueue_worker_run(uuid,text,integer) to service_role;
