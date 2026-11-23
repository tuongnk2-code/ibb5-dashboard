begin;
do $$
declare manager_id uuid; dat_id uuid; customer uuid:=gen_random_uuid(); r jsonb; kept timestamptz; history_note text;
begin
 select user_id into manager_id from public.prospect_members where kind='manager';
 select id into dat_id from public.profiles where lower(acc)='dng.dathx4';
 r:=public.save_prospect(manager_id,'create',customer,0,jsonb_build_object('name','ROLLBACK_CARE_REPORT','phone','0990000777','source','','need','','address','','description','','assignee_id',dat_id));
 r:=public.save_prospect(dat_id,'update',customer,1,'{"stage":"contacted","note":"Lần 1","care_1":"Đã tư vấn","care_2":"","result":"following"}');
 if r->>'care_1'<>'Đã tư vấn' or r->>'care_1_at' is null or r->>'result_at' is null or r->>'care_2_at' is not null then raise exception 'Care/time missing or fabricated';end if;
 update public.prospects set care_1_at=now()-interval '1 day' where id=customer returning care_1_at into kept;
 r:=public.save_prospect(dat_id,'update',customer,2,'{"stage":"won","note":"Lần 2","care_1":"Đã tư vấn","care_2":"KH đã ký","result":"signed"}');
 if (r->>'care_1_at')::timestamptz is distinct from kept or r->>'care_2_at' is null or r->>'result'<>'signed' or r->>'stage'<>'won' then raise exception 'Care timestamps reset or closing failed';end if;
 select note into history_note from public.prospect_history where prospect_id=customer and action='update' and note like 'Lần 2%';
 if history_note not like '%Care lần 2: KH đã ký%' or history_note not like '%Kết quả: Đã ký%' then raise exception 'Care history missing';end if;
 if (select count(*) from public.prospect_history where prospect_id=customer)<>3 then raise exception 'History count wrong';end if;
end $$;
rollback;
