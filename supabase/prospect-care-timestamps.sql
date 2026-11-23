alter table public.prospects add column care_1_at timestamptz, add column care_2_at timestamptz, add column result_at timestamptz;
create or replace function public.save_prospect(p_actor uuid,p_action text,p_id uuid,p_revision integer,p_value jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare member public.prospect_members%rowtype; r public.prospects%rowtype; target uuid; stage text; note text; previous_result text;
begin
 select m.* into member from public.prospect_members m join public.profiles p on p.id=m.user_id where m.user_id=p_actor and m.active and (m.kind<>'manager' or p.role='manager');
 if not found then raise exception using errcode='42501',message='Không có quyền truy cập nguồn KHTN riêng.'; end if;
 if p_action='create' then
   select * into r from public.prospects where id=p_id;
   if found then
     if r.phone is distinct from p_value->>'phone' or r.name is distinct from p_value->>'name' then raise exception using errcode='40001',message='Yêu cầu này đã được lưu. Kiểm tra hồ sơ trước khi sửa thông tin mới.'; end if;
     return to_jsonb(r);
   end if;
   target:=case when member.kind='handler' then p_actor else nullif(p_value->>'assignee_id','')::uuid end;
   if target is not null and not exists(select 1 from public.prospect_members where user_id=target and active and kind='handler') then raise exception 'Người phụ trách không hợp lệ.'; end if;
   insert into public.prospects(id,name,phone,source,need,address,description,assignee_id,stage,created_by,updated_by)
    values(p_id,p_value->>'name',p_value->>'phone',p_value->>'source',p_value->>'need',p_value->>'address',p_value->>'description',target,case when target is null then 'new' else 'received' end,p_actor,p_actor) returning * into r;
   note:='Thêm khách tiềm năng';
 else
   select * into r from public.prospects where id=p_id for update;
   if not found then raise exception 'Không tìm thấy khách.'; end if;
   if r.revision is distinct from p_revision then raise exception using errcode='40001',message='Hồ sơ vừa được cập nhật. Tải lại để đối chiếu; nội dung đang nhập được giữ.'; end if;
   if p_action='edit' then
     if member.kind<>'manager' then raise exception using errcode='42501',message='Chỉ Trưởng phòng được sửa thông tin gốc.'; end if;
     r.name:=p_value->>'name';r.phone:=p_value->>'phone';r.source:=coalesce(p_value->>'source',r.source);r.need:=p_value->>'need';r.address:=p_value->>'address';r.description:=p_value->>'description';note:='Sửa thông tin gốc';
   elsif p_action='claim' then
     if member.kind<>'handler' then raise exception 'Trưởng phòng dùng Giao khách để phân công.'; end if;
     if r.assignee_id is not null then raise exception using errcode='40001',message='Khách đã có người tiếp nhận.'; end if;
     r.assignee_id:=p_actor;r.stage:='received';note:='Tiếp nhận xử lý';
   elsif p_action='assign' then
     if member.kind<>'manager' then raise exception using errcode='42501',message='Chỉ Trưởng phòng được giao hoặc đổi người phụ trách.'; end if;
     target:=nullif(p_value->>'assignee_id','')::uuid;
     if target is not null and not exists(select 1 from public.prospect_members where user_id=target and active and kind='handler') then raise exception 'Người phụ trách không hợp lệ.'; end if;
     if r.stage in('won','lost') then raise exception 'Khách đã kết thúc xử lý; cập nhật tình trạng trước khi phân công lại.'; end if;
     r.assignee_id:=target;r.stage:=case when target is null then 'new' else 'received' end;r.next_followup_at:=null;note:=coalesce(nullif(p_value->>'note',''),'Phân công người phụ trách');
   elsif p_action='update' then
     if member.kind<>'manager' and r.assignee_id is distinct from p_actor then raise exception using errcode='42501',message='Chỉ cập nhật khách do mình phụ trách.'; end if;
     if r.assignee_id is null then raise exception 'Tiếp nhận hoặc giao khách trước khi cập nhật xử lý.'; end if;
     stage:=p_value->>'stage';if stage not in('received','contacted','appointment','qualified','won','lost') then raise exception 'Tình trạng không hợp lệ.'; end if;
     note:=trim(p_value->>'note');if coalesce(length(note),0) not between 1 and 3000 then raise exception 'Cần nhập nội dung xử lý.'; end if;
     r.stage:=stage;r.next_followup_at:=case when stage in('won','lost') then null else nullif(p_value->>'next_followup_at','')::timestamptz end;
     if stage='appointment' and r.next_followup_at is null then raise exception 'Chọn thời gian hẹn lại.'; end if;
     previous_result:=r.result;
     if p_value ? 'care_1' then if r.care_1 is distinct from trim(p_value->>'care_1') then r.care_1_at:=now(); end if;r.care_1:=trim(p_value->>'care_1'); end if;
     if p_value ? 'care_2' then if r.care_2 is distinct from trim(p_value->>'care_2') then r.care_2_at:=now(); end if;r.care_2:=trim(p_value->>'care_2'); end if;
     if p_value ? 'result' then r.result:=p_value->>'result';
     elsif stage='won' then r.result:='signed'; elsif stage='lost' then r.result:='other'; elsif r.result in('signed','other_provider') then r.result:='following'; end if;
     if previous_result is distinct from r.result then r.result_at:=now(); end if;
     if r.result not in('unsigned','signed','following','other_provider','other') or r.result is null or r.care_1 is null or r.care_2 is null or length(r.care_1)>3000 or length(r.care_2)>3000 then raise exception 'Care hoặc kết quả không hợp lệ.'; end if;
     if r.result='signed' then r.stage:='won';r.next_followup_at:=null; elsif r.result='other_provider' then r.stage:='lost';r.next_followup_at:=null; end if;
     note:=note||case when p_value ? 'care_1' then E'\nCare lần 1: '||r.care_1 else '' end||case when p_value ? 'care_2' then E'\nCare lần 2: '||r.care_2 else '' end||case when p_value ? 'result' then E'\nKết quả: '||case r.result when 'unsigned' then 'Chưa ký' when 'signed' then 'Đã ký' when 'following' then 'Đang theo' when 'other_provider' then 'Đã lắp bên khác' else 'Khác' end else '' end;
     r.last_note:=p_value->>'note';
   else raise exception 'Thao tác không hợp lệ.'; end if;
   update public.prospects set name=r.name,phone=r.phone,source=r.source,need=r.need,address=r.address,description=r.description,assignee_id=r.assignee_id,stage=r.stage,next_followup_at=r.next_followup_at,last_note=r.last_note,care_1=r.care_1,care_2=r.care_2,result=r.result,care_1_at=r.care_1_at,care_2_at=r.care_2_at,result_at=r.result_at,revision=revision+1,updated_by=p_actor,updated_at=now() where id=r.id returning * into r;
 end if;
 insert into public.prospect_history(prospect_id,actor_id,action,stage,assignee_id,note,next_followup_at) values(r.id,p_actor,p_action,r.stage,r.assignee_id,note,r.next_followup_at);
 return to_jsonb(r);
end $$;
revoke all on function public.save_prospect(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_prospect(uuid,text,uuid,integer,jsonb) to service_role;
