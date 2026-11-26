-- CTV reads only its own login profile; operational data remains authenticated
-- and is additionally restricted to the three existing operational roles.
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('manager', 'lead', 'staff', 'ctv'));

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- No user argument: the identity always comes from the verified JWT. The
-- definer bypasses profiles RLS only to avoid recursion in its own read policy.
create function private.ibb5_has_operational_access()
returns boolean language sql stable security definer set search_path = ''
as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('manager', 'lead', 'staff')
  );
$$;
revoke all on function private.ibb5_has_operational_access() from public, anon;
grant execute on function private.ibb5_has_operational_access() to authenticated;

create policy "Operational profiles only" on public.profiles
as restrictive for select to authenticated
using (id = (select auth.uid()) or (select private.ibb5_has_operational_access()));

do $$
declare table_name text;
begin
  foreach table_name in array array['contacts','contracts','contract_cam_meta','contract_net_meta','contract_tv_meta','net_latest'] loop
    execute format('create policy "Operational roles only" on public.%I as restrictive for select to authenticated using ((select private.ibb5_has_operational_access()))', table_name);
  end loop;
end;
$$;

