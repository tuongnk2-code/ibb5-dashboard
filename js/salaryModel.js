import { validDay, reportDay } from './dailyReportModel.js';
import { lookupSalary } from './salaryBands.js';

const norm = value => String(value || '').trim().toLowerCase();
const contractId = value => String(value || '').trim().toUpperCase();

export function previousSalaryMonth(month) {
  if (!validDay(month + '-01')) throw new Error('Tháng LCB không hợp lệ.');
  const date = new Date(month + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() - 1);
  return date.toISOString().slice(0, 7);
}

// Counting is separate from conversion and salary lookup so that the original
// NET/V.VIP source figures stay visible and auditable.
export function salaryPeriod(month, today = reportDay()) {
  if (!validDay(month + '-01') || !validDay(today) || month + '-01' > today) throw new Error('Tháng/ngày tính LCB không hợp lệ.');
  const next = new Date(month + '-01T12:00:00Z'); next.setUTCMonth(next.getUTCMonth() + 1);
  const start = month + '-01', end = next.toISOString().slice(0, 7) + '-04';
  return { start, end, asOf: today < end ? today : end, provisional: today <= end };
}

export function calculateSalary(net, vvip, probation = false) {
  if (![net, vvip].every(n => Number.isInteger(n) && n >= 0)) throw new Error('Số NET/V.VIP không hợp lệ.');
  const tenths = net * 8 + vvip * 17;
  const total = tenths / 10, compared = Math.floor((tenths + 5) / 10), band = lookupSalary(compared, probation);
  return { total, compared, band, salary: band?.salary ?? null };
}

export function salaryCounts(data, { month, asOf, roster }) {
  const period = salaryPeriod(month, asOf);
  const people = new Map(roster.map(p => [norm(p.acc), { ...p, net: 0, vvip: 0 }]));
  const distinct = new Map();
  for (const row of data) {
    const id = contractId(row.id);
    if (id && ['Internet', 'Truyền hình'].includes(row.type)) distinct.set(row.type + ':' + id, row);
  }
  for (const row of distinct.values()) {
    const date = row.date, person = people.get(norm(row.staff));
    if (!person || !validDay(row.created) || !validDay(date) || date < period.start || date > period.asOf) continue;
    const createdMonth = row.created.slice(0, 7);
    // Old contracts Online on days 1–4 belong to the preceding payroll period.
    // Current-month creations retain the full day-1 through next-month-day-4 window.
    if (createdMonth > month || (createdMonth < month && date < month + '-05')) continue;
    if (row.type === 'Internet') person.net++;
    else if (row.vvip === true) person.vvip++;
  }
  return [...people.values()];
}
