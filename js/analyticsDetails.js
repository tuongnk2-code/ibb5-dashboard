import { validDay } from './dailyReportModel.js';

const unique = rows => [...new Map(rows.filter(row => row.id).map(row => [row.id, row])).values()];

export function overdueContracts(rows, asOf) {
  if (!validDay(asOf)) return [];
  return unique(rows).filter(row => validDay(row.created) && row.created <= asOf && (!row.date || row.date > asOf))
    .map(row => ({ ...row, age: Math.floor((Date.parse(asOf+'T00:00:00Z')-Date.parse(row.created+'T00:00:00Z'))/86400000) }))
    .filter(row => row.age > 5).sort((a,b) => b.age-a.age || a.id.localeCompare(b.id));
}

// Use creation date and the same source priority as the existing channel chart.
export function yearlyStaffChannels(rows, notes, year, staff = '') {
  const sourceRows = unique(rows).filter(row => validDay(row.created) && row.created.slice(0,4) === String(year));
  const available = Array.from({length:12},(_,i) => sourceRows.some(row => Number(row.created.slice(5,7)) === i+1));
  const groups = new Map(), totals = Array(12).fill(0);
  let missing = 0;
  for (const row of sourceRows.filter(row => !staff || row.staff === staff)) {
    const source = String(notes[row.id]?.source || row.sourceExcel || '').trim();
    if (!source) { missing++; continue; }
    const acc = row.staff || 'Chưa gán', key = JSON.stringify([acc,source]), month = Number(row.created.slice(5,7))-1;
    if (!groups.has(key)) groups.set(key,{acc,source,months:Array(12).fill(0),total:0});
    const group = groups.get(key); group.months[month]++; group.total++; totals[month]++;
  }
  return { rows:[...groups.values()].sort((a,b) => a.acc.localeCompare(b.acc,'vi') || a.source.localeCompare(b.source,'vi')),
    available, totals, total:totals.reduce((a,b)=>a+b,0), missing };
}
