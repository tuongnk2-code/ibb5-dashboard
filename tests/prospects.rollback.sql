begin;
do $$
declare manager_id uuid; dat_id uuid; hoa_id uuid; customer uuid:=gen_random_uuid(); r jsonb; total integer;
begin
 select user_id into manager_id from public.prospect_members where kind='manager';
 select id into dat_id from public.profiles where lower(acc)='dng.dathx4';
 select id into hoa_id from public.profiles where lower(acc)='dng.hoantb6';
 begin perform public.save_prospect('00000000-0000-0000-0000-000000000001','create',customer,0,'{}');raise exception using errcode='XX000',message='Unauthorized user accepted';exception when insufficient_privilege then null;end;
 r:=public.save_prospect(manager_id,'create',customer,0,'{"name":"ROLLBACK_PROSPECT","phone":"0990000888","source":"test","need":"test","address":"","description":"","assignee_id":null}');
 if r->>'stage'<>'new' then raise exception 'New lead wrongly assigned';end if;
 r:=public.save_prospect(dat_id,'claim',customer,1,'{}');
 if r->>'assignee_id'<>dat_id::text then raise exception 'Claim failed';end if;
 begin perform public.save_prospect(hoa_id,'claim',customer,1,'{}');raise exception using errcode='XX000',message='Stale second claim accepted';exception when serialization_failure then null;end;
 begin perform public.save_prospect(hoa_id,'update',customer,2,'{"stage":"contacted","note":"not owner"}');raise exception using errcode='XX000',message='Other owner edited';exception when insufficient_privilege then null;end;
 r:=public.save_prospect(dat_id,'update',customer,2,'{"stage":"appointment","note":"Customer callback","next_followup_at":"2026-11-25T09:00:00+07:00"}');
 if r->>'stage'<>'appointment' then raise exception 'Update failed';end if;
 select count(*) into total from public.prospect_history where prospect_id=customer;if total<>3 then raise exception 'History not atomic';end if;
 r:=public.save_prospect(manager_id,'assign',customer,3,jsonb_build_object('assignee_id',hoa_id,'note','Reassign'));
 if r->>'assignee_id'<>hoa_id::text then raise exception 'Reassignment failed';end if;
 begin perform public.save_prospect(dat_id,'update',customer,4,'{"stage":"won","note":"previous owner"}');raise exception using errcode='XX000',message='Old owner edited';exception when insufficient_privilege then null;end;
end $$;
rollback;
