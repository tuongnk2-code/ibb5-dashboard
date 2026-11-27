import { dailyReportRollup } from './dailyReportRollupModel.js';

export const LATE_REPORT_RATE = 20000;

export function dailyLateSummary(snapshot, options) {
  const rollup = dailyReportRollup(snapshot, options);
  const rows = rollup.rows.map(row => ({
    profile: row.profile,
    late: row.late,
    overdue: row.overdue,
    count: row.late + row.overdue,
    amount: (row.late + row.overdue) * LATE_REPORT_RATE,
  }));
  const total = Object.fromEntries(['late', 'overdue', 'count', 'amount'].map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)]));
  return { rows, total };
}
