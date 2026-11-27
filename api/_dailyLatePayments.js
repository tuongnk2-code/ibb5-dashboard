import { sharedRow, STATE_TABLE } from './_dashboardState.js';
import { dailyLateSummary, canConfirmLatePayment } from '../js/dailyLateModel.js';
import { reportDay, validDay } from '../js/dailyReportModel.js';

const check = result => { if (result.error) throw result.error; return result.data; };
const keyFor = (month, id) => `late-payment:${month}:${id}`;
export async function readLatePayments(admin, month, ids) {
  if (!ids.length) return [];
  return check(await admin.from(STATE_TABLE).select('key,data,revision,updated_at').in('key', ids.map(id => keyFor(month, id))));
}

export async function confirmLatePayment(admin, caller, input, res, now = new Date()) {
  const fail = (status, error) => res.status(status).json({ error });
  if (!canConfirmLatePayment(caller)) return fail(403, 'Chỉ DNG.HoaNTB6 được xác nhận đã nộp phạt.');
  const { month, user_id: userId, revision, dates } = input;
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '') || month > reportDay(now).slice(0, 7) || !/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(userId || '') || !Number.isInteger(revision) || revision < 0 || !Array.isArray(dates) || !dates.length || dates.length > 31 || dates.some(day => !validDay(day) || !day.startsWith(month))) return fail(400, 'Thông tin xác nhận nộp phạt không hợp lệ.');
  const start = month === '2026-11' ? '2026-11-09' : month + '-01';
  const last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
  const end = last < reportDay(now) ? last : reportDay(now);
  const profiles = check(await admin.from('profiles').select('id,acc,role,created_at')).filter(p => !['manager', 'ctv'].includes(p.role) && (!p.created_at || reportDay(new Date(p.created_at)) <= end));
  const subject = profiles.find(p => p.id === userId);
  if (!subject) return fail(400, 'Nhân sự không thuộc danh sách tính phạt.');
  const reports = check(await admin.from('daily_reports').select('user_id,report_date,status,submitted_at,revision').eq('user_id', userId).gte('report_date', start).lte('report_date', end).order('report_date'));
  const first = check(await admin.from('daily_reports').select('report_date').in('user_id', profiles.map(p => p.id)).order('report_date').limit(1));
  const summary = dailyLateSummary({ profiles: [subject], reports, trackingStart: first[0]?.report_date || null }, { start, end, now });
  const currentDates = summary.rows[0].details.map(item => item.date).sort();
  if (JSON.stringify(currentDates) !== JSON.stringify([...new Set(dates)].sort()) || dates.length !== currentDates.length) return fail(409, 'Số lần trễ đã thay đổi. Tải lại để kiểm tra trước khi xác nhận.');
  const key = keyFor(month, userId), previous = await sharedRow(admin, key);
  if ((previous?.revision || 0) !== revision) return fail(409, 'Thông tin nộp phạt đã thay đổi trên thiết bị khác. Vui lòng tải lại.');
  const settled = new Set(previous?.data?.dates || []), added = currentDates.filter(day => !settled.has(day));
  if (!added.length) return fail(409, 'Các ngày này đã được xác nhận nộp phạt.');
  const at = now.toISOString(), by = caller.acc;
  const data = { month, userId, dates: [...new Set([...settled, ...added])].sort(), confirmedAt: at, confirmedBy: by, confirmations: [...(previous?.data?.confirmations || []), { dates: added, at, by }] };
  const row = { key, data, revision: revision + 1, updated_at: at, updated_by: caller.id };
  const query = previous ? admin.from(STATE_TABLE).update(row).eq('key', key).eq('revision', revision) : admin.from(STATE_TABLE).insert(row);
  const saved = check(await query.select().maybeSingle());
  if (!saved) return fail(409, 'Thông tin nộp phạt vừa thay đổi. Vui lòng tải lại.');
  return res.status(200).json({ payment: saved });
}
