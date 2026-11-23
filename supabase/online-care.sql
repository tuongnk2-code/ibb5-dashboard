-- One delivery per contract/milestone and per phone/milestone, even across tasks.
create unique index worker_care_contract_once on public.worker_runs((task_snapshot->'care'->>'contract_id'),(task_snapshot->'care'->>'offset')) where task_snapshot->'care'->>'kind'='online_3_7_10';
create unique index worker_care_phone_once on public.worker_runs((md5(task_snapshot->'care'->>'phone')),(task_snapshot->'care'->>'offset')) where task_snapshot->'care'->>'kind'='online_3_7_10';
create or replace function public.worker_online_date(p_value text) returns date
language plpgsql immutable security invoker set search_path='' as $$
begin if p_value !~ '^\d{4}-\d{2}-\d{2}$' then return null; end if; return p_value::date; exception when others then return null; end $$;
revoke all on function public.worker_online_date(text) from public,anon,authenticated;
grant execute on function public.worker_online_date(text) to service_role;

create or replace function public.enqueue_online_care(p_task uuid,p_contract text,p_offset integer,p_late boolean,p_revision integer default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare t public.worker_tasks%rowtype; d public.worker_devices%rowtype; r public.worker_runs%rowtype;
 row_data jsonb; c public.care_contacts%rowtype; owner_acc text; owner_name text; online_day date; due_day date;
 local_now timestamp := now() at time zone 'Asia/Ho_Chi_Minh'; message text; snapshot jsonb;
begin
 select * into strict t from public.worker_tasks where id=p_task for update;
 if t.config->'care_policy'->>'kind' is distinct from 'online_3_7_10' or p_offset not in(3,7,10) then raise exception 'Lịch CSKH không hợp lệ.'; end if;
 if p_revision is not null and p_revision<>t.revision then raise exception 'Kịch bản đã thay đổi. Tải lại trước khi duyệt.'; end if;
 if not p_late and not t.enabled then return null; end if;
 select * into d from public.worker_devices where id=t.device_id;
 if not found or d.revoked or d.owner_id<>t.owner_id or not(t.channel=any(d.capabilities)) or not(('care_'||t.channel)=any(d.capabilities)) then raise exception 'Tool chưa kết nối lịch CSKH theo từng khách.'; end if;
 select acc,coalesce(nullif(full_name,''),acc) into owner_acc,owner_name from public.profiles where id=t.owner_id;
 select value into row_data from public.dashboard_shared_state s cross join lateral jsonb_array_elements(s.data->'data') where s.key='snapshot' and value->>'type'='Internet' and value->>'id'=p_contract limit 1;
 select * into c from public.care_contacts where contract_id=p_contract;
 online_day:=public.worker_online_date(row_data->>'date');
 if row_data is null or lower(trim(row_data->>'staff'))<>lower(trim(owner_acc)) or online_day is null or online_day>local_now::date or lower(regexp_replace(trim(coalesce(row_data->>'status','')),'\s+',' ','g'))='đã chấm dứt hợp đồng' or not coalesce(c.consent,false) or coalesce(c.phone,'')='' then return jsonb_build_object('ineligible',true); end if;
 due_day:=online_day+p_offset;
 if p_late then if due_day>=local_now::date then raise exception 'Mốc này chưa quá hạn để duyệt chăm bù.'; end if;
 else if due_day<>local_now::date or local_now::time<(t.config->'care_policy'->>'time')::time then return null; end if; end if;
 message:=t.config->'care_policy'->'scripts'->>p_offset::text;
 if coalesce(length(trim(message)),0)=0 then raise exception 'Thiếu kịch bản cho mốc chăm sóc.'; end if;
 message:=replace(replace(replace(message,'{ten_kh}',coalesce(nullif(row_data->>'customer',''),'anh/chị')),'{ma_hd}',p_contract),'{nhan_su}',coalesce(owner_name,''));
 snapshot:=jsonb_build_object('name',t.name||' · '||p_contract||' · Ngày +'||p_offset,'channel',t.channel,'config',(t.config-'care_policy')||jsonb_build_object('content',message,'sources','NET · '||p_contract),
   'care',jsonb_build_object('kind','online_3_7_10','contract_id',p_contract,'customer',row_data->>'customer','phone',c.phone,'online_date',online_day,'due_date',due_day,'offset',p_offset,'approved_late',p_late));
 select * into r from public.worker_runs where task_snapshot->'care'->>'kind'='online_3_7_10' and (task_snapshot->'care'->>'contract_id'=p_contract or task_snapshot->'care'->>'phone'=c.phone) and task_snapshot->'care'->>'offset'=p_offset::text limit 1 for update;
 if found then
   if r.owner_id<>t.owner_id then return jsonb_build_object('already_recorded',true); end if;
   if p_late and r.started_at is null and r.status in('queued','cancelled') then
     update public.worker_runs set task_id=t.id,device_id=d.id,task_snapshot=snapshot,status='queued',cancel_requested=false,summary='',finished_at=null where id=r.id returning * into r;
   end if;
   return to_jsonb(r);
 end if;
 insert into public.worker_runs(task_id,device_id,owner_id,request_id,task_snapshot) values(t.id,d.id,t.owner_id,'care:'||p_contract||':'||p_offset,snapshot) on conflict do nothing returning * into r;
 return case when r.id is null then jsonb_build_object('already_recorded',true) else to_jsonb(r) end;
end $$;
revoke all on function public.enqueue_online_care(uuid,text,integer,boolean,integer) from public,anon,authenticated;
grant execute on function public.enqueue_online_care(uuid,text,integer,boolean,integer) to service_role;

create or replace function public.worker_care_still_eligible(p_owner uuid,p_snapshot jsonb) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.care_contacts c join public.profiles p on p.id=p_owner
 cross join public.dashboard_shared_state s cross join lateral jsonb_array_elements(s.data->'data') row_data
 where s.key='snapshot' and c.contract_id=p_snapshot->'care'->>'contract_id' and c.consent and c.phone=p_snapshot->'care'->>'phone'
 and row_data->>'type'='Internet' and row_data->>'id'=c.contract_id and lower(trim(row_data->>'staff'))=lower(trim(p.acc))
 and row_data->>'date'=p_snapshot->'care'->>'online_date'
 and lower(regexp_replace(trim(coalesce(row_data->>'status','')),'\s+',' ','g'))<>'đã chấm dứt hợp đồng');
$$;
revoke all on function public.worker_care_still_eligible(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.worker_care_still_eligible(uuid,jsonb) to service_role;
