// Input is the same month-to-date NET Online set used by the overview KPI.
export function managedShare(onlineRows) {
  const total = new Set(onlineRows.map(row => row.id)).size;
  const count = new Set(onlineRows.filter(row =>
    ['DNG_01', 'DNG_02'].includes(String(row.branch ?? '').trim().toUpperCase())
  ).map(row => row.id)).size;
  return { count, total, percent: total ? count / total * 100 : null };
}
