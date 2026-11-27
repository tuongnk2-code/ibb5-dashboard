import { dailyReportRollup } from './dailyReportRollupModel.js';

export const LATE_REPORT_RATE = 20000;
export const canConfirmLatePayment = profile => ['manager', 'lead', 'staff'].includes(profile?.role) && String(profile?.acc || '').trim().toLowerCase() === 'dng.hoantb6';

export function latePaymentBalance(details, payment) {
  const paidDates = new Set(payment?.data?.dates || []);
  const paid = details.filter(item => paidDates.has(item.date)).length * LATE_REPORT_RATE;
  return { paid, remaining: details.length * LATE_REPORT_RATE - paid };
}

export function isLateReportChargeDay(day) {
  const weekday = new Date(day + 'T12:00:00Z').getUTCDay();
  if (day.slice(0, 7) === '2026-11') return day >= '2026-11-09' && weekday !== 6 && weekday !== 0;
  if (day >= '2026-12-01') return weekday !== 0;
  return true;
}

export const lateReportCalendarNote = month => month === '2026-11'
  ? 'Tháng 11/2026: tính từ 09/11; không tính thứ Bảy và Chủ nhật.'
  : month >= '2026-12' ? 'Không tính Chủ nhật; thứ Bảy vẫn tính.' : '';

export function dailyLateSummary(snapshot, options) {
  const rollup = dailyReportRollup(snapshot, options);
  const now = options?.now || new Date();
  const rows = rollup.rows.map(row => {
    const entries = row.entries.filter(entry => isLateReportChargeDay(entry.date));
    const late = entries.filter(entry => entry.state === 'late').length;
    const overdue = entries.filter(entry => entry.state === 'overdue').length;
    const details = entries.filter(entry => ['late', 'overdue'].includes(entry.state)).map(entry => {
      const deadline = entry.date + 'T22:00:00+07:00';
      const submittedAt = entry.state === 'late' ? entry.report.submitted_at : null;
      return { profile: row.profile, date: entry.date, state: entry.state, deadline, submittedAt, delayMs: Math.max(0, new Date(submittedAt || now) - new Date(deadline)) };
    });
    return { profile: row.profile, late, overdue, count: late + overdue, amount: (late + overdue) * LATE_REPORT_RATE, details };
  });
  const total = Object.fromEntries(['late', 'overdue', 'count', 'amount'].map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)]));
  return { rows, total };
}
