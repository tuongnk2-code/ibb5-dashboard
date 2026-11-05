import { requireProfile } from './_supabaseAdmin.js';
import { STATE_TABLE, sharedRow, sharedRows } from './_dashboardState.js';
import { unpackState, stateSignature, validateSnapshot, validateNote, monthKey, normAcc } from '../js/dashboardStateModel.js';
import { canSeeReport, validDay } from '../js/dailyReportModel.js';

const bad = (res, status, error) => res.status(status).json({ error });
const int = v => { if (!Number.isInteger(v) || v < 0 || v > 100000) throw new Error('Cam kết phải là số nguyên từ 0 đến 100.000.'); return v; };
function cleanCommit(value) {
  const result = { manager: null, staff: {} };
  if (value?.manager?.status === 'signed') result.manager = { value: int(value.manager.value), status: 'signed', signedAt: value.manager.signedAt || null };
  for (const [acc, v] of Object.entries(value?.staff || {})) if (acc.length <= 100 && ['pending', 'approved', 'rejected'].includes(v.status)) result.staff[acc] = { value: int(v.value), status: v.status, plan: String(v.plan || '').slice(0, 2000), submittedAt: v.submittedAt || null, reviewedAt: v.reviewedAt || null };
  return result;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await requireProfile(req);
    if (auth.error) return bad(res, auth.status, auth.error);
    const { admin, caller } = auth;
    if (req.method === 'GET') {
      if (req.query?.keys) {
        let keys; try { keys = JSON.parse(req.query.keys); } catch { return bad(res, 400, 'Danh sách mục đồng bộ không hợp lệ.'); }
        if (!Array.isArray(keys) || !keys.length || keys.length > 100 || keys.some(key => typeof key !== 'string' || !key || key.length > 200)) return bad(res, 400, 'Danh sách mục đồng bộ không hợp lệ.');
        const result = await admin.from(STATE_TABLE).select('*').in('key', [...new Set(keys)]);
        if (result.error) throw result.error;
        return res.status(200).json({ rows: result.data });
      }
      const versionsOnly = req.query?.versions === '1', rows = await sharedRows(admin, versionsOnly);
      return res.status(200).json(versionsOnly ? { signature: stateSignature(rows), revisions: Object.fromEntries(rows.map(row => [row.key, row.revision])) } : unpackState(rows));
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return bad(res, 405, 'Phương thức không hỗ trợ.'); }
    const body = req.body || {}, now = new Date().toISOString();
    if (body.kind === 'migrate') {
      if (caller.role !== 'manager') return bad(res, 403, 'Chỉ Trưởng phòng được chuyển dữ liệu cũ lên hệ thống.');
      const rows = [];
      if (body.snapshot?.data?.length) rows.push({ key: 'snapshot', data: validateSnapshot(body.snapshot) });
      for (const [month, rooms] of Object.entries(body.commitments || {})) for (const [room, value] of Object.entries(rooms || {})) rows.push({ key: monthKey(month, room), data: cleanCommit(value) });
      for (const [id, value] of Object.entries(body.notes || {})) {
        if (!/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(id)) continue;
        if(value&&typeof value==='object'){const note={};for(const field of ['expected','timeSlot','action','reason','result','source','updated'])if(typeof value[field]==='string')note[field]=value[field].slice(0,300);if(note.expected&&!validDay(note.expected))delete note.expected;if(!note.action&&note.reason)note.action=note.reason;rows.push({key:'pending:'+id,data:note});}
      }
      if (rows.length > 10000) return bad(res, 400, 'Dữ liệu chuyển lên quá lớn.');
      // Insert missing keys only: an old device cannot overwrite a cloud record.
      if (rows.length) {
        const { error } = await admin.from(STATE_TABLE).upsert(rows.map(row => ({ ...row, revision: 1, updated_at: now, updated_by: caller.id })), { onConflict: 'key', ignoreDuplicates: true });
        if (error) throw error;
      }
      return res.status(200).json({ ok: true });
    }
    let key, data;
    if (body.kind === 'snapshot') {
      if (caller.role !== 'manager') return bad(res, 403, 'Chỉ Trưởng phòng được nhập dữ liệu hợp đồng.');
      key = 'snapshot'; data = validateSnapshot(body.snapshot);
      data.meta = { ...data.meta, updated: now, audit: { acc: caller.acc || caller.email, identityVerified: true, updated: now, sources: body.types || [] } };
    } else if (body.kind === 'pending' || body.kind === 'cancelPending') {
      if (body.kind === 'cancelPending' && caller.role !== 'manager') return bad(res, 403, 'Chỉ Trưởng phòng được duyệt hủy hợp đồng.');
      if (typeof body.id !== 'string' || !/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(body.id)) return bad(res, 400, 'Mã hợp đồng không hợp lệ.');
      const snapshot = await sharedRow(admin, 'snapshot');
      let contracts = snapshot?.data.data.filter(r => r.type === 'Internet' && r.id === body.id);
      if (!contracts) { const result = await admin.from('contracts').select('id,staff').eq('type', 'Internet').eq('id', body.id); if (result.error) throw result.error; contracts = result.data; }
      if (!contracts.some(r => canSeeReport(caller, { id: normAcc(r.staff)===normAcc(caller.acc)&&caller.acc?caller.id:null, acc: r.staff, role: 'staff' }))) return bad(res, 403, 'Không có quyền cập nhật hợp đồng này.');
      key = 'pending:' + body.id;
      const existing = await sharedRow(admin, key);
      if (existing?.data.cancellationApproved) return bad(res, 409, 'Hợp đồng đã được Trưởng phòng duyệt hủy. Bấm Đồng bộ để cập nhật danh sách.');
      data = body.kind === 'cancelPending'
        ? { ...existing?.data, cancellationApproved: true, cancellationApprovedAt: now, cancellationApprovedBy: caller.id }
        : { ...validateNote(body.value), updated: now, updatedBy: caller.acc || caller.id };
    } else if (body.kind === 'commit') {
      key = monthKey(body.month, body.room || '__ALL__');
      const manager = caller.role === 'manager';
      if (!manager && (body.action !== 'submit' || !caller.acc || normAcc(body.acc) !== normAcc(caller.acc))) return bad(res, 403, 'Không có quyền duyệt hoặc sửa cam kết của nhân sự khác.');
      if (!['submit', 'approve', 'reject', 'revise', 'sign', 'import'].includes(body.action)) return bad(res, 400, 'Thao tác cam kết không hợp lệ.');
      const current = await sharedRow(admin, key);
      if ((current?.revision || 0) !== body.revision) return bad(res, 409, 'Cam kết đã thay đổi trên thiết bị khác. Bấm Đồng bộ để tải lại.');
      data = cleanCommit(current?.data || {});
      if (body.action === 'import') data = cleanCommit(body.value);
      else if (body.action === 'sign') data.manager = { value: int(body.value), status: 'signed', signedAt: now };
      else {
        if (typeof body.acc !== 'string' || !body.acc || body.acc.length > 100) return bad(res, 400, 'Mã Acc không hợp lệ.');
        if (body.action === 'submit') data.staff[body.acc] = { value: int(body.value), plan: String(body.plan || '').slice(0, 2000), status: 'pending', submittedAt: now };
        else {
          const value = data.staff[body.acc]; if (!value) return bad(res, 400, 'Nhân sự chưa gửi đề xuất.');
          value.status = body.action === 'approve' ? 'approved' : 'rejected'; value.reviewedAt = now;
        }
      }
    } else return bad(res, 400, 'Loại dữ liệu không hợp lệ.');
    if (!Number.isInteger(body.revision) || body.revision < 0) return bad(res, 400, 'Phiên bản dữ liệu không hợp lệ.');
    const current = await sharedRow(admin, key);
    if ((current?.revision || 0) !== body.revision) return bad(res, 409, 'Dữ liệu đã thay đổi trên thiết bị khác. Bấm Đồng bộ để tải lại trước khi lưu.');
    const row = { key, data, revision: body.revision + 1, updated_at: now, updated_by: caller.id };
    const query = current ? admin.from(STATE_TABLE).update(row).eq('key', key).eq('revision', body.revision) : admin.from(STATE_TABLE).insert(row);
    const saved = await query.select().maybeSingle(); if (saved.error) throw saved.error;
    if (!saved.data) return bad(res, 409, 'Dữ liệu vừa thay đổi. Bấm Đồng bộ để tải lại.');
    return res.status(200).json({ row: saved.data });
  } catch (err) {
    if (['42P01', 'PGRST205'].includes(err.code)) return bad(res, 503, 'Đồng bộ chưa được kích hoạt trên máy chủ.');
    if (err.code === '23505') return bad(res, 409, 'Dữ liệu vừa thay đổi. Bấm Đồng bộ để tải lại.');
    if (!err.code && err instanceof Error && !err.message.includes('fetch')) return bad(res, 400, err.message);
    console.error('dashboard-sync:', err.code || 'server-error');
    return bad(res, 500, 'Không đồng bộ được dữ liệu. Vui lòng thử lại.');
  }
}
