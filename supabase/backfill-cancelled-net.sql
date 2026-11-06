-- Add historical cancellation records to the existing shared snapshot.
-- Idempotent; keeps source rows, file audit, pending notes and access policies unchanged.
WITH locked AS (
  SELECT key, data FROM public.dashboard_shared_state WHERE key = 'snapshot' FOR UPDATE
), candidates AS (
  SELECT upper(btrim(record->>'id')) AS id, record, ord
  FROM locked, jsonb_array_elements(
    coalesce(data->'cancelledNet', '[]'::jsonb) || coalesce(data->'data', '[]'::jsonb)
  ) WITH ORDINALITY AS entries(record, ord)
  WHERE record->>'type' = 'Internet'
    AND lower(regexp_replace(btrim(normalize(record->>'status', NFC)), '\s+', ' ', 'g')) = 'đã chấm dứt hợp đồng'
    AND upper(btrim(record->>'id')) ~ '^[A-Z0-9][A-Z0-9._/-]{0,99}$'
), unique_records AS (
  SELECT DISTINCT ON (id) id, record, ord FROM candidates ORDER BY id, ord
), archive AS (
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'type', 'Internet', 'id', id, 'status', 'Đã chấm dứt hợp đồng',
    'created', coalesce(record->>'created', ''),
    'staff', coalesce(record->>'staff', ''), 'room', coalesce(record->>'room', '')
  ) ORDER BY ord), '[]'::jsonb) AS records FROM unique_records
)
UPDATE public.dashboard_shared_state AS snapshot
SET data = jsonb_set(snapshot.data, '{cancelledNet}', archive.records, true),
    revision = snapshot.revision + 1,
    updated_at = now()
FROM archive, locked
WHERE snapshot.key = locked.key
  AND snapshot.data->'cancelledNet' IS DISTINCT FROM archive.records
RETURNING snapshot.revision, jsonb_array_length(snapshot.data->'cancelledNet') AS archived_cancellations;
