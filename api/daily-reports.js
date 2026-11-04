import { requireProfile } from './_supabaseAdmin.js';
import { canSeeReport, teamOf, reportDay, shiftDay, validDay, validateReport } from '../js/dailyReportModel.js';

const fail = (res, status, error) => res.status(status).json({ error });
const check = result => { if (result.error) throw result.error; return result.data; };
async function metrics(admin, date, profiles) {
  const counts = Object.fromEntries(profiles.map(p => [p.id, { online: 0, monthlyOnline: 0 }]));
  const byAcc = new Map(profiles.filter(p => p.acc).map(p => [p.acc.trim().toLowerCase(), p.id]));
  const seen = new Set();
  for (let from = 0; ; from += 1000) {
    const rows = check(await admin.from('contracts').select('id,staff,date').eq('type', 'Internet').gte('date', date.slice(0, 7) + '-01').lte('date', date).order('id').range(from, from + 999));
    for (const row of rows) {
      const id = byAcc.get(String(row.staff || '').trim().toLowerCase()), key = id + ':' + row.id;
      if (!id || seen.has(key)) continue;
      seen.add(key); counts[id].monthlyOnline++;
      if (row.date === date) counts[id].online++;
    }
    if (rows.length < 1000) break;
  }
  return counts;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const auth = await requireProfile(req);
    if (auth.error) return fail(res, auth.status, auth.error);
    const { caller, admin } = auth;
    if (req.method === 'GET' && req.query?.history === 'mine') {
      const month = req.query.month;
      if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || !validDay(month + '-01')) return fail(res, 400, 'Chọn tháng báo cáo hợp lệ.');
      const last = month + '-' + new Date(Number(month.slice(0, 4)), Number(month.slice(5)), 0).getDate();
      const reports = check(await admin.from('daily_reports').select('*').eq('user_id', caller.id).eq('status', 'submitted').gte('report_date', month + '-01').lte('report_date', last).order('report_date', { ascending: false }));
      return res.status(200).json({ reports });
    }
    const date = req.method === 'GET' ? req.query?.date : req.body?.date;
    if (!validDay(date) || date > reportDay()) return fail(res, 400, 'Chọn ngày báo cáo hợp lệ, không vượt quá hôm nay.');
    const profiles = check(await admin.from('profiles').select('id,full_name,acc,role,created_at').order('full_name'))
      .filter(p => canSeeReport(caller, p) && (!p.created_at || reportDay(new Date(p.created_at)) <= date))
      .map(p => ({ ...p, team: teamOf(p) }));
    const ids = profiles.map(p => p.id);
    if (req.method === 'GET') {
      const reports = ids.length ? check(await admin.from('daily_reports').select('*').eq('report_date', date).in('user_id', ids)) : [];
      const prior = check(await admin.from('daily_reports').select('data,status').eq('report_date', shiftDay(date, -1)).eq('user_id', caller.id).eq('status', 'submitted').maybeSingle());
      return res.status(200).json({ profiles, reports, metrics: await metrics(admin, date, profiles), previous: prior?.data || null, serverTime: new Date().toISOString() });
    }
    if (req.method !== 'POST') { res.setHeader('Allow', 'GET, POST'); return fail(res, 405, 'Phương thức không hỗ trợ.'); }
    const { action, revision } = req.body || {};
    const subjectId = action === 'exempt' || action === 'unexempt' ? req.body.user_id : caller.id;
    if (!ids.includes(subjectId)) return fail(res, 403, 'Không có quyền báo cáo cho nhân sự này.');
    if (['exempt', 'unexempt'].includes(action) && !['manager', 'lead'].includes(caller.role)) return fail(res, 403, 'Chỉ quản lý được đánh dấu ngày nghỉ.');
    if (!['draft', 'submit', 'exempt', 'unexempt'].includes(action)) return fail(res, 400, 'Thao tác không hợp lệ.');
    const existing = check(await admin.from('daily_reports').select('*').eq('report_date', date).eq('user_id', subjectId).maybeSingle());
    if ((existing?.revision || 0) !== revision) return fail(res, 409, 'Báo cáo đã thay đổi trên thiết bị khác. Hãy tải lại trước khi lưu.');
    let data, status;
    if (action === 'exempt' || action === 'unexempt') {
      if (existing?.status === 'submitted') return fail(res, 409, 'Nhân sự đã gửi báo cáo; không thể đánh dấu nghỉ.');
      data = { ...(existing?.data || {}), absenceReason: String(req.body.reason || '').trim().slice(0, 300) };
      if (action === 'exempt' && !data.absenceReason) return fail(res, 400, 'Cần nhập lý do nghỉ / miễn báo cáo.');
      status = action === 'exempt' ? 'exempt' : 'draft';
    } else {
      if (existing?.status === 'exempt') return fail(res, 409, 'Ngày này đã được miễn báo cáo. Quản lý cần bỏ đánh dấu nghỉ trước.');
      try { data = validateReport(req.body.data); } catch (err) { return fail(res, 400, err.message); }
      Object.assign(data, (await metrics(admin, date, [caller]))[caller.id]);
      status = action === 'submit' || existing?.status === 'submitted' ? 'submitted' : 'draft';
    }
    const now = new Date().toISOString();
    const record = { user_id: subjectId, report_date: date, data, status, submitted_at: existing?.submitted_at || (status === 'submitted' ? now : null), updated_at: now, updated_by: caller.id, revision: revision + 1 };
    const query = existing ? admin.from('daily_reports').update(record).eq('user_id', subjectId).eq('report_date', date).eq('revision', revision) : admin.from('daily_reports').insert(record);
    const saved = check(await query.select().maybeSingle());
    if (!saved) return fail(res, 409, 'Báo cáo vừa được thay đổi. Hãy tải lại để xem bản mới nhất.');
    return res.status(200).json({ report: saved });
  } catch (err) {
    if (['42P01', 'PGRST205'].includes(err.code)) return fail(res, 503, 'Báo cáo ngày chưa được kích hoạt trên máy chủ. Vui lòng liên hệ Trưởng phòng.');
    if (err.code === '23505') return fail(res, 409, 'Báo cáo đã tồn tại. Hãy tải lại trước khi lưu.');
    console.error('daily-reports:', err.code || err.name || 'server-error');
    return fail(res, 500, 'Không thể tải hoặc lưu báo cáo. Vui lòng thử lại.');
  }
}
