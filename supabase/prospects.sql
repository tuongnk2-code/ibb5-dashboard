create table public.prospect_members(user_id uuid primary key references public.profiles(id),kind text not null check(kind in('manager','handler')),active boolean not null default true);
do $$ begin
 if (select count(*) from public.profiles where role='manager')<>1 then raise exception 'Xác định đúng tài khoản Trưởng phòng trước khi cấp quyền.'; end if;
 insert into public.prospect_members(user_id,kind) select id,'manager' from public.profiles where role='manager';
 insert into public.prospect_members(user_id,kind) select id,'handler' from public.profiles where lower(acc) in('dng.dathx4','dng.hoantb6');
 if (select count(*) from public.prospect_members)<>3 then raise exception 'Cần đúng ba tài khoản được chỉ định.'; end if;
end $$;
create table public.prospects(
 id uuid primary key, name text not null check(length(name) between 1 and 150),phone text not null unique check(phone ~ '^0[35789][0-9]{8}$'),
 source text not null default '',need text not null default '',address text not null default '',description text not null default '',
 assignee_id uuid references public.prospect_members(user_id),stage text not null default 'new' check(stage in('new','received','contacted','appointment','qualified','won','lost')),
 next_followup_at timestamptz,last_note text not null default '',revision integer not null default 1,
 created_by uuid not null references public.profiles(id),updated_by uuid not null references public.profiles(id),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create index prospects_assignee on public.prospects(assignee_id,stage);
create index prospects_followup on public.prospects(next_followup_at) where stage not in('won','lost');
create index prospects_created_by on public.prospects(created_by);
create index prospects_updated_by on public.prospects(updated_by);
create table public.prospect_history(id uuid primary key default gen_random_uuid(),prospect_id uuid not null references public.prospects(id),actor_id uuid not null references public.profiles(id),action text not null,stage text not null,assignee_id uuid references public.prospect_members(user_id),note text not null,next_followup_at timestamptz,created_at timestamptz not null default now());
create index prospect_history_lead on public.prospect_history(prospect_id,created_at);
create index prospect_history_actor on public.prospect_history(actor_id);
create index prospect_history_assignee on public.prospect_history(assignee_id);
alter table public.prospect_members enable row level security;
alter table public.prospects enable row level security;
alter table public.prospect_history enable row level security;
revoke all on public.prospect_members,public.prospects,public.prospect_history from public,anon,authenticated;
grant all on public.prospect_members,public.prospects,public.prospect_history to service_role;
create policy prospect_members_api_only on public.prospect_members for all to authenticated using(false) with check(false);
create policy prospects_api_only on public.prospects for all to authenticated using(false) with check(false);
create policy prospect_history_api_only on public.prospect_history for all to authenticated using(false) with check(false);

create or replace function public.save_prospect(p_actor uuid,p_action text,p_id uuid,p_revision integer,p_value jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare member public.prospect_members%rowtype; r public.prospects%rowtype; target uuid; stage text; note text;
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
     r.name:=p_value->>'name';r.phone:=p_value->>'phone';r.source:=p_value->>'source';r.need:=p_value->>'need';r.address:=p_value->>'address';r.description:=p_value->>'description';note:='Sửa thông tin gốc';
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
     r.last_note:=note;
   else raise exception 'Thao tác không hợp lệ.'; end if;
   update public.prospects set name=r.name,phone=r.phone,source=r.source,need=r.need,address=r.address,description=r.description,assignee_id=r.assignee_id,stage=r.stage,next_followup_at=r.next_followup_at,last_note=r.last_note,revision=revision+1,updated_by=p_actor,updated_at=now() where id=r.id returning * into r;
 end if;
 insert into public.prospect_history(prospect_id,actor_id,action,stage,assignee_id,note,next_followup_at) values(r.id,p_actor,p_action,r.stage,r.assignee_id,note,r.next_followup_at);
 return to_jsonb(r);
end $$;
revoke all on function public.save_prospect(uuid,text,uuid,integer,jsonb) from public,anon,authenticated;
grant execute on function public.save_prospect(uuid,text,uuid,integer,jsonb) to service_role;
