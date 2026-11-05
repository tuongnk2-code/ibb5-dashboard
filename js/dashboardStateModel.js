import { validDay } from './dailyReportModel.js';
export const LEGACY_KEYS = { snapshot: 'ibb5_three_source_snapshot_v1', commitments: 'fpt_ibb_monthly_commitments_v2', notes: 'ibb5_pending_followup_v1' };
export const normAcc = v => String(v || '').trim().toLowerCase();
export const monthKey = (month, room = '__ALL__') => {
  if (!validDay(month + '-01') || typeof room !== 'string' || room.length > 100) throw new Error('Tháng / phòng cam kết không hợp lệ.');
  return 'commit:' + month + ':' + room;
};
export const stateSignature = rows => rows.map(r => r.key + ':' + r.revision).sort().join('|');
export function stateRows(state) {
  return Object.entries(state.revisions).map(([key, revision]) => ({ key, revision, data: key === 'snapshot' ? state.snapshot : key.startsWith('pending:') ? state.notes[key.slice(8)] : state.commitments[key.slice(7, 14)]?.[key.slice(15)] }));
}
export function mergeStateRows(state, incoming, removed = {}) {
  const rows = new Map(stateRows(state).map(row => [row.key, row]));
  const changed = [];
  for (const row of incoming) if (row.revision > (rows.get(row.key)?.revision || 0)) { rows.set(row.key, row); changed.push(row.key); }
  for (const [key, revision] of Object.entries(removed)) if (rows.get(key)?.revision === revision) { rows.delete(key); changed.push(key); }
  return { state: unpackState([...rows.values()]), changed };
}
export function unpackState(rows) {
  const state = { snapshot: null, commitments: {}, notes: {}, revisions: {}, signature: stateSignature(rows) };
  for (const row of rows) {
    state.revisions[row.key] = row.revision;
    if (row.key === 'snapshot') state.snapshot = row.data;
    if (row.key.startsWith('pending:')) state.notes[row.key.slice(8)] = row.data;
    if (row.key.startsWith('commit:')) {
      const month = row.key.slice(7, 14), room = row.key.slice(15);
      (state.commitments[month] ||= {})[room] = row.data;
    }
  }
  return state;
}
export function validateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.data) || !snapshot.data.length || snapshot.data.length > 20000 || JSON.stringify(snapshot).length > 3000000) throw new Error('Dữ liệu nhập không hợp lệ hoặc vượt quá giới hạn 3 MB.');
  const types = ['Internet', 'Camera', 'Truyền hình'];
  const rows = snapshot.data.map(row => {
    const id = typeof row.id === 'string' ? row.id.trim().toUpperCase() : '';
    if (!types.includes(row.type) || !/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(id)) throw new Error('Mã hoặc loại hợp đồng không hợp lệ.');
    const result = { type: row.type, id };
    for (const field of ['date', 'created']) {
      const value = row[field] || '';
      if (value && !validDay(value)) throw new Error('Ngày hợp đồng không hợp lệ.');
      result[field] = value;
    }
    for (const field of ['room', 'staff', 'status', 'package', 'branch', 'customer', 'sourceExcel']) result[field] = String(row[field] || '').slice(0, 500);
    result.prepaid = Number(row.prepaid) || 0;
    if (row.type === 'Internet' && typeof row.netClbh === 'string') result.netClbh = row.netClbh.slice(0, 500);
    if (row.vvip != null) result.vvip = row.vvip === true;
    return result;
  });
  return { data: [...new Map(rows.map(r => [r.type + ':' + r.id, r])).values()], meta: snapshot.meta || {} };
}
// NET files can cover a narrower period than the current tracking register.
// Refresh matching source records and retain omitted NET IDs; notes stay in their own rows.
export function mergeNetSnapshot(previous, incoming) {
  const next = validateSnapshot(incoming);
  const retained = (previous?.data || []).filter(row => row.type === 'Internet');
  const merged = new Map(retained.map(row => ['Internet:' + String(row.id).trim().toUpperCase(), row]));
  for (const row of next.data) merged.set(row.type + ':' + row.id, row);
  return validateSnapshot({ data: [...merged.values()], meta: next.meta });
}
export const isCancellationResult = value => ['hủy', 'huỷ'].includes(String(value || '').trim().toLocaleLowerCase('vi-VN'));
export function validateNote(value) {
  if (!value || !validDay(value.expected)) throw new Error('Cần chọn ngày Online dự kiến hợp lệ.');
  const result = { expected: value.expected };
  for (const field of ['timeSlot', 'action', 'result', 'source']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 300) throw new Error('Cần điền đủ mốc hẹn, nguyên nhân, kết quả và nguồn.');
    result[field] = value[field].trim();
  }
  if (value.cancelReason != null && (typeof value.cancelReason !== 'string' || value.cancelReason.length > 1000)) throw new Error('Lý do hủy tối đa 1.000 ký tự.');
  result.cancelReason = String(value.cancelReason || '').trim();
  if (isCancellationResult(result.result) && !result.cancelReason) throw new Error('Vui lòng nhập lý do hủy hợp đồng.');
  return result;
}
