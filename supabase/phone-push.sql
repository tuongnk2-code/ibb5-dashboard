begin;
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create table public.push_settings (
 singleton boolean primary key default true check(singleton),
 public_key text not null,
 private_key text not null,
 worker_secret text not null default encode(extensions.gen_random_bytes(32),'hex'),
 worker_url text not null default 'https://qqmhcjoqubimhmggbtme.supabase.co/functions/v1/ibb5-phone-push',
 lease_id uuid,
 lease_until timestamptz not null default '-infinity',
 alert_version text not null default ''
);
create table public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.profiles(id) on delete cascade,
 endpoint text not null unique check(length(endpoint)<=2048),
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 last_comment_at timestamptz not null default now(),
 last_alert_signature text not null default '',
 last_alert_day date,
 last_alert_sent_at timestamptz,
 alert_count integer not null default 0,
 test_requested_at timestamptz,
 test_delivered_at timestamptz,
 last_sent_at timestamptz,
 failures integer not null default 0,
 next_attempt_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_settings enable row level security;
alter table public.push_subscriptions enable row level security;
revoke all on public.push_settings,public.push_subscriptions from public,anon,authenticated;
grant select,insert,update,delete on public.push_settings,public.push_subscriptions to service_role;
create function public.claim_push_worker(worker_id uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
 update public.push_settings set lease_id=worker_id,lease_until=now()+interval '2 minutes'
 where singleton and lease_until<now();
 return found;
end;
$$;
create function public.push_contract_state() returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
 'rows',coalesce((select jsonb_agg(jsonb_build_object('id',r->'id','type','Internet','staff',r->'staff','created',r->'created','date',r->'date','status',r->'status')) from public.dashboard_shared_state s cross join lateral jsonb_array_elements(s.data->'data') r where s.key='snapshot' and r->>'type'='Internet'),'[]'::jsonb),
 'notes',coalesce((select jsonb_object_agg(substr(s.key,9),jsonb_build_object('result',s.data->'result','expected',s.data->'expected','action',s.data->'action','timeSlot',s.data->'timeSlot','source',s.data->'source','updated',s.data->'updated','cancellationApproved',s.data->'cancellationApproved','processingRequestedAt',s.data->'processingRequestedAt','cancelReason',case when length(btrim(coalesce(s.data->>'cancelReason','')))>0 then 'provided' else '' end)) from public.dashboard_shared_state s where s.key like 'pending:%'),'{}'::jsonb),
 'netUpdatedAt',coalesce((select s.data#>>'{meta,files,Internet,updated}' from public.dashboard_shared_state s where s.key='snapshot'),''));
$$;
create function public.push_unread_state() returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (
  select n.recipient_id,c.subject_id,count(*)::integer as unread,max(n.created_at) as latest
  from public.report_notifications n join public.report_comments c on c.id=n.comment_id
  where n.read_at is null and exists(select 1 from public.push_subscriptions p where p.user_id=n.recipient_id)
  group by n.recipient_id,c.subject_id
 ) t;
$$;
create function public.push_state_version() returns text
language sql stable security invoker set search_path='' as $$
 select md5(coalesce(string_agg(key||':'||revision::text,'|' order by key),'')) from public.dashboard_shared_state where key='snapshot' or key like 'pending:%';
$$;
create function public.request_phone_push() returns trigger
language plpgsql security invoker set search_path='' as $$
declare config public.push_settings%rowtype;
begin
 if exists(select 1 from public.push_subscriptions) then
  select * into config from public.push_settings where singleton;
  if found then
   perform net.http_post(url:=config.worker_url,headers:=jsonb_build_object('Content-Type','application/json','x-ibb5-push-secret',config.worker_secret),body:='{}'::jsonb,timeout_milliseconds:=10000);
  end if;
 end if;
 return new;
exception when others then
 -- A transient queue failure must not prevent staff from saving their report/comment.
 return new;
end;
$$;
revoke all on function public.claim_push_worker(uuid),public.push_contract_state(),public.push_unread_state(),public.push_state_version(),public.request_phone_push() from public,anon,authenticated;
grant execute on function public.claim_push_worker(uuid),public.push_contract_state(),public.push_unread_state(),public.push_state_version(),public.request_phone_push() to service_role;
create trigger phone_push_on_comment after insert on public.report_notifications for each row execute function public.request_phone_push();
create trigger phone_push_on_subscribe after insert or update of test_requested_at on public.push_subscriptions for each row execute function public.request_phone_push();
-- Only contacts opted in on a device are processed. The scheduled job also retries transient delivery failures.
select cron.schedule('ibb5-phone-push','*/2 * * * *',$job$
 select net.http_post(url:=s.worker_url,headers:=jsonb_build_object('Content-Type','application/json','x-ibb5-push-secret',s.worker_secret),body:='{}'::jsonb,timeout_milliseconds:=10000)
 from public.push_settings s where s.singleton and exists(select 1 from public.push_subscriptions)
$job$);
commit;
