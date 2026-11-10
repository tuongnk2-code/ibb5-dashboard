import { requireProfile } from './_supabaseAdmin.js';
import { canSeeReport, teamOf, reportDay, validDay } from '../js/dailyReportModel.js';
import { validateMarketReport, monthDays, canViewAllMarketReports } from '../js/marketReportModel.js';

const check = result => { if (result.error) throw result.error; return result.data; };
const fail = (res, status, error) => res.status(status).json({ error });
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await requireProfile(req);
    if (auth.error) return fail(res, auth.status, auth.error);
    const { admin, caller } = auth;
    if (!['GET', 'POST'].includes(req.method)) { res.setHeader('Allow', 'GET, POST'); return fail(res, 405, 'Phương thức không hỗ trợ.'); }
    const date = req.method === 'GET' ? req.query?.date : req.body?.date;
    if (!validDay(date) || date > reportDay()) return fail(res, 400, 'Ngày báo cáo không hợp lệ hoặc vượt quá hôm nay.');
    const days = monthDays(date.slice(0, 7));
    const profiles = check(await admin.from('profiles').select('id,full_name,acc,role,created_at').order('full_name'))
      .filter(p => p.role !== 'manager' && ((req.method === 'GET' && canViewAllMarketReports(caller)) || canSeeReport(caller, p)) && (!p.created_at || reportDay(new Date(p.created_at)) <= days.at(-1)))
      .map(p => ({ ...p, team: teamOf(p) }));
    const ids = profiles.map(p => p.id);
    if (req.method === 'GET') {
      const reports = [];
      if (ids.length) for (let from = 0; ; from += 1000) {
        const rows = check(await admin.from('market_reports').select('*').in('user_id', ids).gte('report_date', days[0]).lte('report_date', days.at(-1)).order('report_date').order('user_id').range(from, from + 999));
        reports.push(...rows); if (rows.length < 1000) break;
      }
      return res.status(200).json({ profiles, reports, serverTime: new Date().toISOString() });
    }
    const { action, revision } = req.body || {};
    if (!['draft', 'submit', 'exempt', 'unexempt'].includes(action) || !Number.isInteger(revision) || revision < 0) return fail(res, 400, 'Thao tác hoặc phiên bản không hợp lệ.');
    const exemptAction = ['exempt', 'unexempt'].includes(action);
    if (exemptAction && !['lead', 'manager'].includes(caller.role)) return fail(res, 403, 'Chỉ quản lý được đánh dấu nghỉ.');
    const subjectId = exemptAction ? req.body.user_id : caller.id;
    const subject = profiles.find(p => p.id === subjectId);
    if (!subject || (subject.created_at && reportDay(new Date(subject.created_at)) > date)) return fail(res, 403, 'Không có quyền báo cáo cho nhân sự/ngày này.');
    const existing = check(await admin.from('market_reports').select('*').eq('user_id', subjectId).eq('report_date', date).maybeSingle());
    if ((existing?.revision || 0) !== revision) return fail(res, 409, 'Báo cáo đã thay đổi trên thiết bị khác. Tải lại trước khi lưu.');
    let data, status;
    if (exemptAction) {
      if (existing?.status === 'submitted') return fail(res, 409, 'Đã gửi báo cáo; không thể đánh dấu nghỉ.');
      const reason = String(req.body.reason || '').trim().slice(0, 300);
      if (action === 'exempt' && !reason) return fail(res, 400, 'Cần nhập lý do nghỉ / miễn báo cáo.');
      data = { ...(existing?.data || {}), absenceReason: reason };
      status = action === 'exempt' ? 'exempt' : 'draft';
    } else {
      if (existing?.status === 'exempt') return fail(res, 409, 'Ngày này đã được miễn báo cáo. Quản lý cần bỏ đánh dấu nghỉ trước.');
      try { data = validateMarketReport(req.body.data); } catch (e) { return fail(res, 400, e.message); }
      status = action === 'submit' || existing?.status === 'submitted' ? 'submitted' : 'draft';
    }
    const now = new Date().toISOString();
    const record = { user_id: subjectId, report_date: date, data, status, submitted_at: existing?.submitted_at || (status === 'submitted' ? now : null), updated_at: now, updated_by: caller.id, revision: revision + 1 };
    const query = existing ? admin.from('market_reports').update(record).eq('user_id', subjectId).eq('report_date', date).eq('revision', revision) : admin.from('market_reports').insert(record);
    const saved = check(await query.select().maybeSingle());
    if (!saved) return fail(res, 409, 'Báo cáo vừa thay đổi. Tải lại để xem bản mới nhất.');
    return res.status(200).json({ report: saved });
  } catch (e) {
    if (['42P01', 'PGRST205'].includes(e.code)) return fail(res, 503, 'Báo cáo thị trường chưa được kích hoạt trên máy chủ.');
    if (e.code === '23505') return fail(res, 409, 'Báo cáo đã tồn tại. Tải lại trước khi lưu.');
    console.error('market-reports:', e.code || e.name || 'server-error');
    return fail(res, 500, 'Không thể tải hoặc lưu báo cáo thị trường. Vui lòng thử lại.');
  }
}
