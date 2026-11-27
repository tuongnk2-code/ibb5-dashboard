import { randomUUID } from 'node:crypto';
import { sharedRow, STATE_TABLE } from './_dashboardState.js';
import { CHANNEL_BUCKET, CHANNEL_FILE_LIMIT, canUploadChannelDocument, validateChannelDocument, matchesDocumentHeader } from '../js/channelDocumentModel.js';

const check = result => { if (result.error) throw result.error; return result.data; };
const uuid = value => typeof value === 'string' && /^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const key = id => 'channel-document:' + id;
const publicDocument = data => { const { path, ownerId, status, ...doc } = data; return doc; };

export async function handleChannelDocuments(req, res, { admin, caller }) {
  const fail = (status, error) => res.status(status).json({ error });
  if (req.method === 'GET') {
    if (req.query.id) {
      if (!uuid(req.query.id)) return fail(400, 'Tài liệu không hợp lệ.');
      const row = await sharedRow(admin, key(req.query.id));
      if (!row || row.data.status !== 'ready') return fail(404, 'Không tìm thấy tài liệu.');
      const signed = check(await admin.storage.from(CHANNEL_BUCKET).createSignedUrl(row.data.path, 3600, req.query.download === '1' ? { download: row.data.fileName } : {}));
      return res.status(200).json({ url: signed.signedUrl });
    }
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const batch = check(await admin.from(STATE_TABLE).select('key,data').like('key','channel-document:%').order('key').range(offset,offset+999));
      rows.push(...batch); if (batch.length < 1000) break;
    }
    return res.status(200).json({ documents: rows.filter(row => row.data.status === 'ready').map(row => publicDocument(row.data)).sort((a,b)=>b.uploadedAt.localeCompare(a.uploadedAt)), canUpload: canUploadChannelDocument(caller), maxFileSize: CHANNEL_FILE_LIMIT });
  }
  if (req.method !== 'POST') return fail(405, 'Phương thức không hỗ trợ.');
  if (!canUploadChannelDocument(caller)) return fail(403, 'CTV chỉ được xem và tải tài liệu.');
  const body = req.body || {}, action = body.action;
  if (action === 'prepare') {
    let input; try { input = validateChannelDocument(body); } catch (error) { return fail(400,error.message); }
    const id = randomUUID(), path = `${caller.id}/${id}/document.${input.extension}`;
    const upload = check(await admin.storage.from(CHANNEL_BUCKET).createSignedUploadUrl(path, { upsert:false }));
    const data = { ...input, id, path, ownerId:caller.id, uploadedBy:caller.acc || caller.full_name || 'Trưởng phòng', status:'uploading', uploadedAt:new Date().toISOString() };
    check(await admin.from(STATE_TABLE).insert({ key:key(id), data, revision:1, updated_by:caller.id, updated_at:data.uploadedAt }));
    return res.status(200).json({ id, path, token:upload.token, bucket:CHANNEL_BUCKET, mime:input.mime });
  }
  if (action !== 'complete' || !uuid(body.id)) return fail(400,'Thao tác không hợp lệ.');
  const row = await sharedRow(admin,key(body.id));
  if (!row || row.data.ownerId !== caller.id) return fail(403,'Chỉ người tải file được hoàn tất tài liệu này.');
  if (row.data.status === 'ready') return res.status(200).json({ document:publicDocument(row.data) });
  const info = check(await admin.storage.from(CHANNEL_BUCKET).info(row.data.path));
  if (Number(info.size ?? info.metadata?.size) !== row.data.size || Number(info.size) > CHANNEL_FILE_LIMIT) return fail(400,'Dung lượng file không khớp. Vui lòng tải lại.');
  const signed = check(await admin.storage.from(CHANNEL_BUCKET).createSignedUrl(row.data.path,60));
  const response = await fetch(signed.signedUrl, { headers:{ Range:'bytes=0-31' }, signal:AbortSignal.timeout(10000) });
  if (!response.ok || !response.body) return fail(503,'Chưa kiểm tra được file vừa tải. Anh/chị thử lại.');
  const reader = response.body.getReader(), bytes = [];
  try { while (bytes.length < 12) { const chunk = await reader.read(); if (chunk.done) break; bytes.push(...chunk.value.slice(0,32-bytes.length)); } } finally { await reader.cancel(); }
  if (!matchesDocumentHeader(row.data.extension,bytes)) return fail(400,'Nội dung file không đúng định dạng đã chọn.');
  const now = new Date().toISOString(), data = { ...row.data, status:'ready', uploadedAt:now };
  const saved = check(await admin.from(STATE_TABLE).update({ data, revision:row.revision+1, updated_at:now, updated_by:caller.id }).eq('key',row.key).eq('revision',row.revision).select().maybeSingle());
  if (!saved) return fail(409,'Tài liệu vừa thay đổi. Tải lại danh sách để kiểm tra.');
  return res.status(200).json({ document:publicDocument(saved.data) });
}
