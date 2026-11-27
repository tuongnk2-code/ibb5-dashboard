import { getSession } from './auth.js';
import { reportDay } from './dailyReportModel.js';
import { dailyLateSummary, LATE_REPORT_RATE } from './dailyLateModel.js';

const number = value => value.toLocaleString('vi-VN');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function installDailyLateSummary(root, initialDate) {
  root.innerHTML = `<div class="dr-card-head"><div><h3>Báo cáo trễ × 20.000đ</h3><p data-late-total role="status">Đang tải…</p></div><label>Tháng thống kê<input type="month" data-late-month value="${initialDate.slice(0, 7)}" max="${reportDay().slice(0, 7)}"></label></div><p class="dr-hint">Tính báo cáo gửi sau 22:00 và quá hạn chưa gửi; mỗi ngày tính một lần. Gửi đúng 22:00:00, nghỉ/miễn và CTV không tính.</p><div class="dr-table-scroll"><table class="dr-table dr-late-table"><thead><tr><th>Nhân sự</th><th>Đã gửi trễ</th><th>Quá hạn chưa gửi</th><th>Số lần tính</th><th>Thành tiền</th></tr></thead><tbody data-late-rows></tbody><tfoot data-late-footer></tfoot></table></div>`;
  const monthInput = root.querySelector('[data-late-month]'), status = root.querySelector('[data-late-total]');
  const body = root.querySelector('[data-late-rows]'), footer = root.querySelector('[data-late-footer]');
  let generation = 0, loadedMonth = '', loadingMonth = '';
  async function load(force = false) {
    const month = monthInput.value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > reportDay().slice(0, 7)) return;
    if (!force && (month === loadedMonth || month === loadingMonth)) return;
    const version = ++generation;
    loadingMonth = month; body.replaceChildren(); footer.replaceChildren(); status.textContent = 'Đang tải…';
    const start = month + '-01', last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
    const end = last < reportDay() ? last : reportDay();
    try {
      const session = await getSession();
      if (!session?.access_token) throw Error('Vui lòng đăng nhập lại.');
      const response = await fetch('/api/daily-reports?from=' + start + '&to=' + end, { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const snapshot = await response.json();
      if (!response.ok) throw Error(snapshot.error || 'Chưa tải được thống kê.');
      if (!Array.isArray(snapshot.profiles) || !Array.isArray(snapshot.reports)) throw Error('Dữ liệu chưa hợp lệ.');
      if (version !== generation) return;
      const result = dailyLateSummary(snapshot, { start, end, now: snapshot.serverTime ? new Date(snapshot.serverTime) : new Date() });
      const cells = row => `<td>${number(row.late)}</td><td>${number(row.overdue)}</td><td><b>${number(row.count)}</b></td><td><b>${number(row.amount)}đ</b></td>`;
      body.innerHTML = result.rows.map(row => `<tr><td>${esc(row.profile.acc || row.profile.full_name || 'Chưa gán Acc')}</td>${cells(row)}</tr>`).join('') || '<tr><td colspan="5">Không có nhân sự trong phạm vi được xem.</td></tr>';
      footer.innerHTML = '<tr><th>TỔNG</th>' + cells(result.total) + '</tr>';
      status.textContent = `${number(result.total.count)} lần × ${number(LATE_REPORT_RATE)}đ = ${number(result.total.amount)}đ · ${start.split('-').reverse().join('/')} – ${end.split('-').reverse().join('/')}`;
      loadedMonth = month;
    } catch (error) { if (version === generation) { loadedMonth = ''; status.textContent = 'Chưa tải được thống kê: ' + error.message; } }
    finally { if (version === generation) loadingMonth = ''; }
  }
  monthInput.onchange = () => load(true);
  document.addEventListener('ibb5-daily-report-updated', () => load(true));
  const refresh = () => { if (!document.hidden && root.closest('.panel')?.classList.contains('page-active') && !loadingMonth) load(true); };
  setInterval(refresh, 60000);
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  load();
  return { update(date, force = false) { monthInput.value = date.slice(0, 7); load(force); } };
}
