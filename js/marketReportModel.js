import { validDay } from './dailyReportModel.js';

export function validateMarketReport(input) {
  if (!input || typeof input !== 'object') throw new Error('Nội dung báo cáo không hợp lệ.');
  const data = {};
  for (const [key, label] of Object.entries({ sessions: 'Số buổi tham gia', demos: 'Số Demo', pttb: 'PTTB' })) {
    if (!Number.isInteger(input[key]) || input[key] < 0 || input[key] > 10000) throw new Error(label + ' phải là số nguyên từ 0 đến 10.000.');
    data[key] = input[key];
  }
  for (const key of ['area', 'note']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Nội dung ghi chú không hợp lệ.');
    if ((input[key] || '').length > 2000) throw new Error('Nội dung tối đa 2.000 ký tự.');
    data[key] = (input[key] || '').trim();
  }
  return data;
}
export function monthDays(month) {
  if (!validDay(month + '-01')) throw new Error('Tháng không hợp lệ.');
  const count = new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
  return Array.from({ length: count }, (_, i) => month + '-' + String(i + 1).padStart(2, '0'));
}
export function marketTotals(reports) {
  const sum = { sessions: 0, demos: 0, pttb: 0 };
  for (const report of reports) if (report.status === 'submitted') {
    for (const key of Object.keys(sum)) sum[key] += report.data[key];
  }
  return { ...sum, demoRate: sum.sessions ? sum.demos / sum.sessions : null, pttbRate: sum.sessions ? sum.pttb / sum.sessions : null };
}
// Read-only department access is specific to the market deployment module.
export const canViewAllMarketReports = profile => profile?.role === 'manager' || String(profile?.acc || '').trim().toLowerCase() === 'dng.dathx4';
