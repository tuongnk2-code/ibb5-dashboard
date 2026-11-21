begin;
create table public.report_comments (
 id uuid primary key default gen_random_uuid(),
 kind text not null check (kind in ('daily','market')),
 subject_id uuid not null references public.profiles(id) on delete cascade,
 report_date date not null,
 author_id uuid not null references public.profiles(id) on delete cascade,
 body text not null check (char_length(btrim(body)) between 1 and 2000),
 request_id uuid not null,
 created_at timestamptz not null default now(),
 unique(author_id,request_id)
);
create index report_comments_thread_idx on public.report_comments(kind,subject_id,report_date,created_at desc,id desc);
create table public.report_notifications (
 id uuid primary key default gen_random_uuid(),
 comment_id uuid not null references public.report_comments(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 read_at timestamptz,
 unique(comment_id,recipient_id)
);
create index report_notifications_inbox_idx on public.report_notifications(recipient_id,read_at desc nulls first,created_at desc);
alter table public.report_comments enable row level security;
alter table public.report_notifications enable row level security;
revoke all on public.report_comments,public.report_notifications from public,anon,authenticated;
grant select,insert on public.report_comments to service_role;
grant select,insert,update on public.report_notifications to service_role;
-- A comment and its notification are committed together, using the same server-only access model as reports.
create function public.notify_report_comment() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 insert into public.report_notifications(comment_id,recipient_id)
 select new.id, recipients.id from (
  select new.subject_id as id
  union
  select c.author_id from public.report_comments c
  where c.kind=new.kind and c.subject_id=new.subject_id and c.report_date=new.report_date
 ) recipients where recipients.id<>new.author_id
 on conflict(comment_id,recipient_id) do nothing;
 return new;
end;
$$;
revoke all on function public.notify_report_comment() from public,anon,authenticated;
grant execute on function public.notify_report_comment() to service_role;
create trigger report_comment_notify after insert on public.report_comments
for each row execute function public.notify_report_comment();
commit;
