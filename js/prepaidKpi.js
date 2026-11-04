// CLBH contains policy descriptions such as "Tra truoc 3T 615k/3T".
// Read the first month term, not a price, fee, or promotional duration.
export function clbhMonths(value) {
  const text = String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const match = text.match(/\b(\d+)\s*(?:t\b|thang\b)/);
  return match ? Number(match[1]) : null;
}

export function prepaidShare(onlineNetRows) {
  const rows = [...new Map(onlineNetRows.map(row => [row.id, row])).values()];
  const count = rows.filter(row => clbhMonths(row.netClbh) >= 3).length;
  return { count, total: rows.length, percent: rows.length ? count / rows.length * 100 : null };
}
