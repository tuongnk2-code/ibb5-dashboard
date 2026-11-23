-- Test-only synthetic data, invisible to other sessions; all changes are rolled back.
begin;
do $$
declare owner uuid; owner_acc text; d uuid:=gen_random_uuid(); t uuid:=gen_random_uuid();
 a text:='TESTCARE_'||replace(gen_random_uuid()::text,'-',''); b text:='TESTCARE_'||replace(gen_random_uuid()::text,'-','');
 today date:=(now() at time zone 'Asia/Ho_Chi_Minh')::date; r jsonb; again jsonb; snapshot_id text;
begin
 select id,acc into owner,owner_acc from public.profiles where acc is not null limit 1;
 perform 1 from public.dashboard_shared_state where key='snapshot' for update nowait;
 update public.dashboard_shared_state set data=jsonb_set(data,'{data}',jsonb_build_array(
   jsonb_build_object('id',a,'type','Internet','staff',owner_acc,'customer','Rollback test A','date',(today-3)::text,'status','Bình thường'),
   jsonb_build_object('id',b,'type','Internet','staff',owner_acc,'customer','Rollback test B','date',(today-8)::text,'status','Bình thường'))) where key='snapshot';
 insert into public.care_contacts(contract_id,phone,consent,updated_by) values(a,'0990000998',true,owner),(b,'0990000999',true,owner);
 insert into public.worker_devices(id,owner_id,name,token_hash,capabilities) values(d,owner,'ROLLBACK CARE',gen_random_uuid()::text,array['top_zalo','care_top_zalo']);
 insert into public.worker_tasks(id,owner_id,created_by,device_id,name,channel,config,enabled,next_run_at)
 values(t,owner,owner,d,'ROLLBACK CARE','top_zalo','{"content":"test","care_policy":{"kind":"online_3_7_10","time":"00:00","scripts":{"3":"Day 3 {ma_hd}","7":"Day 7 {ma_hd}","10":"Day 10 {ma_hd}"}}}',true,now());
 r:=public.enqueue_online_care(t,a,3,false,1);
 if r->>'status' is distinct from 'queued' or r->'task_snapshot'->'config'->>'content'<>('Day 3 '||a) then raise exception 'Wrong personalized day-3 job'; end if;
 again:=public.enqueue_online_care(t,a,3,false,1);if r->>'id'<>again->>'id' then raise exception 'Duplicate delivery'; end if;
 if public.enqueue_online_care(t,b,7,false,1) is not null then raise exception 'Past milestone was sent automatically'; end if;
 r:=public.claim_worker_run(d);if r->'task_snapshot'->'care'->>'contract_id'<>a then raise exception 'Wrong due customer'; end if;
 if public.claim_worker_run(d) is not null then raise exception 'Concurrent duplicate'; end if;
 update public.worker_runs set status='succeeded' where id=(r->>'id')::uuid;
 again:=public.enqueue_online_care(t,a,3,false,1);if again->>'status'<>'succeeded' then raise exception 'Successful milestone replayed'; end if;
 r:=public.enqueue_online_care(t,b,7,true,1);if r->>'status'<>'queued' or (r->'task_snapshot'->'care'->>'approved_late')::boolean is distinct from true then raise exception 'Explicit catchup failed'; end if;
 update public.care_contacts set consent=false where contract_id=b;
 if public.claim_worker_run(d) is not null then raise exception 'Opt-out customer claimed'; end if;
 if (select status from public.worker_runs where id=(r->>'id')::uuid)<>'cancelled' then raise exception 'Opt-out not cancelled'; end if;
end $$;
rollback;
