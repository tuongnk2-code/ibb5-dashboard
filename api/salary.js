import { requireProfile } from './_supabaseAdmin.js';
import { sharedRow } from './_dashboardState.js';
import { STAFF_ROSTER } from '../js/staffRoster.js';
import { canSeeReport, reportDay, validDay } from '../js/dailyReportModel.js';
import { salaryCounts, salaryPeriod, calculateSalary } from '../js/salaryModel.js';

const check = result => { if (result.error) throw result.error; return result.data; };
const fail = (res, status, error) => res.status(status).json({ error });
const norm = value => String(value || '').trim().toLowerCase();
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await requireProfile(req);
    if (auth.error) return fail(res, auth.status, auth.error);
    const { caller, admin } = auth;
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return fail(res, 405, 'Phương thức không hỗ trợ.'); }
    const month = req.method === 'GET' ? req.query?.month : req.body?.month;
    if (typeof month !== 'string' || !validDay(month + '-01') || month > reportDay().slice(0, 7)) return fail(res, 400, 'Chọn tháng LCB hợp lệ, không vượt quá tháng hiện tại.');
    if (req.method === 'POST') {
      if (caller.role !== 'manager') return fail(res, 403, 'Chỉ Trưởng phòng được đánh dấu thử việc.');
      const { acc, probation, revision } = req.body || {};
      const person = STAFF_ROSTER.find(p => p.acc === acc);
      if (!person || typeof probation !== 'boolean' || !Number.isInteger(revision) || revision < 0) return fail(res, 400, 'Nhân sự hoặc phiên bản cập nhật không hợp lệ.');
      const existing = check(await admin.from('salary_settings').select('*').eq('month', month).eq('acc', person.acc).maybeSingle());
      if ((existing?.revision || 0) !== revision) return fail(res, 409, 'Trạng thái thử việc đã thay đổi trên thiết bị khác. Tải lại trước khi lưu.');
      const record = { month, acc: person.acc, probation, revision: revision + 1, updated_at: new Date().toISOString(), updated_by: caller.id };
      const query = existing ? admin.from('salary_settings').update(record).eq('month', month).eq('acc', person.acc).eq('revision', revision) : admin.from('salary_settings').insert(record);
      const saved = check(await query.select().maybeSingle());
      if (!saved) return fail(res, 409, 'Trạng thái vừa thay đổi. Tải lại trước khi lưu.');
      return res.status(200).json({ setting: saved });
    }
    const roster = STAFF_ROSTER.filter(p => canSeeReport(caller, { id: norm(p.acc) === norm(caller.acc) && caller.acc ? caller.id : null, acc: p.acc, role: 'staff' }));
    const settings = roster.length ? check(await admin.from('salary_settings').select('acc,probation,revision,updated_at').eq('month', month).in('acc', roster.map(p => p.acc))) : [];
    const snapshot = await sharedRow(admin, 'snapshot');
    if (!snapshot?.data?.data) return fail(res, 503, 'Chưa có dữ liệu nguồn đồng bộ để tính LCB. Cần cập nhật NET và Truyền hình tại Trung tâm dữ liệu.');
    const period = salaryPeriod(month);
    const rows = salaryCounts(snapshot.data.data, { month, asOf: period.asOf, roster }).map(row => {
      const setting = settings.find(s => s.acc === row.acc);
      const probation = setting?.probation || false;
      return { ...row, ...calculateSalary(row.net, row.vvip, probation), probation, revision: setting?.revision || 0 };
    });
    return res.status(200).json({ rows, month, ...period, sourceUpdated: snapshot.updated_at, serverTime: new Date().toISOString() });
  } catch (e) {
    if (['42P01', 'PGRST205'].includes(e.code)) return fail(res, 503, 'Tab LCB chưa được kích hoạt trên máy chủ.');
    if (e.code === '23505') return fail(res, 409, 'Trạng thái đã tồn tại. Tải lại trước khi lưu.');
    console.error('salary:', e.code || e.name || 'server-error');
    return fail(res, 500, 'Không tải hoặc lưu được dữ liệu LCB. Vui lòng thử lại.');
  }
}
