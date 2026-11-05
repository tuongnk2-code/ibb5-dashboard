export const STATE_TABLE = 'dashboard_shared_state';
export function importAudit(previous, incoming, types, caller, now, rows) {
  if (!Array.isArray(types) || types.some(type => !['Internet','Camera','Truyền hình'].includes(type))) throw new Error('Nguồn nhập dữ liệu không hợp lệ.');
  const files = { ...previous?.files };
  for (const type of new Set(types)) {
    const file = incoming?.files?.[type] || {};
    files[type] = {
      name: String(file.name || files[type]?.name || '').slice(0,500),
      count: Number.isInteger(file.count) && file.count >= 0 && file.count <= 20000 ? file.count : rows.filter(row=>row.type===type).length,
      acc: caller.acc || caller.email || caller.id, updated: now, identityVerified: true,
    };
  }
  return { ...previous, ...incoming, files, updated: now, audit: { acc: caller.acc || caller.email || caller.id, identityVerified: true, updated: now, sources: [...new Set(types)] } };
}
export async function sharedRow(admin, key) {
  const { data, error } = await admin.from(STATE_TABLE).select('*').eq('key', key).maybeSingle();
  if (error) throw error;
  return data;
}
export async function sharedRows(admin, versionsOnly = false) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await admin.from(STATE_TABLE).select(versionsOnly ? 'key,revision' : '*').order('key').range(from, from + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
