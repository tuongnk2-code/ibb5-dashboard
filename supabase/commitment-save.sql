-- Called only by the authenticated server API after checking profile permissions.
-- Lock the month once, compare only the edited target, and preserve other staff.
create or replace function public.save_dashboard_commitment(
  p_key text, p_action text, p_acc text, p_value integer, p_plan text,
  p_expected jsonb, p_actor uuid
) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare
  saved public.dashboard_shared_state%rowtype;
  current_target jsonb;
  target jsonb;
  stamp text := to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
begin
  if p_key !~ '^commit:[0-9]{4}-(0[1-9]|1[0-2]):.{1,100}$'
    or p_action not in ('submit','approve','reject','revise','sign')
    or p_actor is null then raise exception 'Invalid commitment operation'; end if;
  if p_action in ('submit','sign') and (p_value is null or p_value < 0 or p_value > 100000)
    then raise exception 'Invalid commitment value'; end if;
  if p_action <> 'sign' and (p_acc is null or length(p_acc) not between 1 and 100)
    then raise exception 'Invalid commitment account'; end if;
  insert into public.dashboard_shared_state(key,data,revision,updated_by)
    values(p_key,'{"manager":null,"staff":{}}',1,p_actor) on conflict(key) do nothing;
  select * into strict saved from public.dashboard_shared_state where key=p_key for update;
  current_target := case when p_action='sign' then saved.data->'manager' else saved.data->'staff'->p_acc end;
  if current_target is not null and current_target <> 'null'::jsonb then
    current_target := case when p_action='sign' then jsonb_build_object(
      'value',current_target->'value','status',current_target->'status','signedAt',current_target->'signedAt')
    else jsonb_build_object('value',current_target->'value','status',current_target->'status',
      'plan',coalesce(current_target->>'plan',''),'submittedAt',current_target->'submittedAt','reviewedAt',current_target->'reviewedAt') end;
  else current_target := 'null'::jsonb; end if;
  if current_target is distinct from coalesce(p_expected,'null'::jsonb) then
    return jsonb_build_object('conflict',true,'row',to_jsonb(saved));
  end if;
  if p_action='sign' then
    target := jsonb_build_object('value',p_value,'status','signed','signedAt',stamp);
    saved.data := jsonb_set(saved.data,'{manager}',target);
  else
    if p_action='submit' then
      target := jsonb_build_object('value',p_value,'plan',left(coalesce(p_plan,''),2000),'status','pending','submittedAt',stamp);
    else
      if current_target='null'::jsonb then raise exception 'No staff proposal'; end if;
      target := current_target || jsonb_build_object('status',case when p_action='approve' then 'approved' else 'rejected' end,'reviewedAt',stamp);
    end if;
    saved.data := jsonb_set(saved.data,'{staff}',coalesce(nullif(saved.data->'staff','null'::jsonb),'{}'::jsonb) || jsonb_build_object(p_acc,target));
  end if;
  update public.dashboard_shared_state set data=saved.data,revision=revision+1,updated_at=clock_timestamp(),updated_by=p_actor
    where key=p_key returning * into saved;
  return jsonb_build_object('row',to_jsonb(saved));
end $$;
revoke all on function public.save_dashboard_commitment(text,text,text,integer,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.save_dashboard_commitment(text,text,text,integer,text,jsonb,uuid) to service_role;
