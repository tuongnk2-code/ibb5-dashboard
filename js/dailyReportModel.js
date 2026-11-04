import { STAFF_ROSTER } from './staffRoster.js';

export const REPORT_SOURCES = ['Zalo', 'Thị trường', 'Facebook', 'Đại lý', 'Khách hàng cũ', 'Web', 'Telesale', 'Khác'];
export const reportIdentity = profile => profile.acc || (profile.role === 'manager' ? 'Trưởng phòng' : 'Chưa gán Acc');
export const reportDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export const shiftDay = (date, n) => new Date(Date.parse(date + 'T12:00:00Z') + n * 86400000).toISOString().slice(0, 10);
export const validDay = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) === date;
const norm = s => String(s || '').trim().toLowerCase();
export const teamOf = profile => STAFF_ROSTER.find(p => norm(p.acc) === norm(profile.acc))?.team || null;
export function canSeeReport(caller, subject) {
  if (caller.id === subject.id || caller.role === 'manager') return true;
  return caller.role === 'lead' && subject.role !== 'manager' && teamOf(caller) !== null && teamOf(caller) === teamOf(subject);
}
export function reportState(report, date, now = new Date()) {
  if (report?.status === 'exempt') return 'exempt';
  if (report?.status === 'submitted') return new Date(report.submitted_at) > new Date(date + 'T22:00:00+07:00') ? 'late' : 'submitted';
  if (now >= new Date(date + 'T22:00:00+07:00')) return 'overdue';
  return report?.status === 'draft' ? 'draft' : 'missing';
}
export const STATE_LABEL = { exempt: 'Nghỉ / Miễn báo cáo', submitted: 'Đã gửi', late: 'Đã gửi muộn', overdue: 'Quá hạn chưa gửi', draft: 'Bản nháp', missing: 'Chưa gửi' };
export function validateReport(input) {
  const number = (v, label) => {
    if (!Number.isInteger(v) || v < 0 || v > 100000) throw new Error(label + ' phải là số nguyên từ 0 đến 100.000.');
    return v;
  };
  const text = (v, label, max = 2000) => {
    if (typeof v !== 'string' || v.length > max) throw new Error(label + ' không hợp lệ hoặc quá dài.');
    return v.trim();
  };
  if (!input || !Array.isArray(input.sources) || input.sources.length > 20) throw new Error('Danh sách nguồn KHTN không hợp lệ.');
  const sources = input.sources.map(s => {
    const name = text(s.name, 'Tên nguồn', 60);
    if (!name) throw new Error('Cần nhập tên nguồn.');
    const leads = number(s.leads, 'Số KHTN'), closed = number(s.closed, 'Số chốt');
    if (closed > leads) throw new Error('Số chốt không được lớn hơn số KHTN của nguồn ' + name + '.');
    return { name, leads, closed };
  });
  return {
    actual: number(input.actual, 'PTTB thực hiện'), commitment: number(input.commitment, 'PTTB cam kết'),
    tomorrowPttb: number(input.tomorrowPttb, 'Cam kết PTTB ngày mai'), tomorrowOnline: number(input.tomorrowOnline, 'Cam kết Online ngày mai'),
    monthlyTarget: input.monthlyTarget == null ? null : number(input.monthlyTarget, 'Cam kết tháng'),
    sources, difficulty: text(input.difficulty, 'Khó khăn'), support: text(input.support, 'Đề nghị hỗ trợ'), focus: text(input.focus, 'Việc trọng tâm'),
  };
}
export function reportText(profile, date, data) {
  const total = data.sources.reduce((n, s) => n + s.leads, 0);
  return [reportIdentity(profile) + ' báo cáo ngày ' + date.split('-').reverse().join('/'),
    '1. PTTB trong ngày: ' + data.actual + '/' + data.commitment,
    '2. KHTN mới trong ngày: ' + total,
    ...data.sources.filter(s => s.leads || s.closed).map(s => '- ' + s.leads + ' ' + s.name + (s.closed ? ' (chốt ' + s.closed + ')' : '')),
    '3. HĐ Online: ' + (data.online ?? '—'),
    '4. Cam kết tháng: ' + (data.monthlyOnline ?? '—') + '/' + (data.monthlyTarget ?? 'Chưa có cam kết'),
    '5. Cam kết ngày ' + shiftDay(date, 1).split('-').reverse().join('/') + ': ' + data.tomorrowPttb + ' PTTB - ' + data.tomorrowOnline + ' HĐ Online',
    '6. Khó khăn: ' + (data.difficulty || 'Không'), 'Đề nghị hỗ trợ: ' + (data.support || 'Không'), 'Việc trọng tâm: ' + (data.focus || '—')].join('\n');
}
