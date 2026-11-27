-- Private bucket: clients receive scoped signed upload/read URLs from the
-- authenticated dashboard API. No anonymous/authenticated storage policy needed.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('sales-channel-documents', 'sales-channel-documents', false, 52428800,
  array['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
