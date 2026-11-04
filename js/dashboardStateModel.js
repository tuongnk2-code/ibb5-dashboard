import { validDay } from './dailyReportModel.js';
export const LEGACY_KEYS = { snapshot: 'ibb5_three_source_snapshot_v1', commitments: 'fpt_ibb_monthly_commitments_v2', notes: 'ibb5_pending_followup_v1' };
export const normAcc = v => String(v || '').trim().toLowerCase();
export const monthKey = (month, room = '__ALL__') => {
  if (!validDay(month + '-01') || typeof room !== 'string' || room.length > 100) throw new Error('Tháng / phòng cam kết không hợp lệ.');
  return 'commit:' + month + ':' + room;
};
export const stateSignature = rows => rows.map(r => r.key + ':' + r.revision).sort().join('|');
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
    if (!types.includes(row.type) || typeof row.id !== 'string' || !/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(row.id)) throw new Error('Mã hoặc loại hợp đồng không hợp lệ.');
    const result = { type: row.type, id: row.id };
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
export function validateNote(value) {
  if (!value || !validDay(value.expected)) throw new Error('Cần chọn ngày Online dự kiến hợp lệ.');
  const result = { expected: value.expected };
  for (const field of ['timeSlot', 'action', 'result', 'source']) {
    if (typeof value[field] !== 'string' || !value[field].trim() || value[field].length > 300) throw new Error('Cần điền đủ mốc hẹn, nguyên nhân, kết quả và nguồn.');
    result[field] = value[field].trim();
  }
  return result;
}
