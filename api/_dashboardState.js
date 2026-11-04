export const STATE_TABLE = 'dashboard_shared_state';
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
