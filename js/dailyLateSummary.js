import { getSession } from './auth.js';
import { reportDay } from './dailyReportModel.js';
import { dailyLateSummary, LATE_REPORT_RATE, lateReportCalendarNote, latePaymentBalance } from './dailyLateModel.js';

const number = value => value.toLocaleString('vi-VN');
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dateTime = value => new Date(value).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
function duration(milliseconds) {
  let seconds = Math.ceil(milliseconds / 1000);
  const days = Math.floor(seconds / 86400); seconds %= 86400;
  const hours = Math.floor(seconds / 3600); seconds %= 3600;
  const minutes = Math.floor(seconds / 60); seconds %= 60;
  return [[days, 'ngày'], [hours, 'giờ'], [minutes, 'phút'], [seconds, 'giây']].filter(([n]) => n).map(([n, label]) => n + ' ' + label).join(' ') || '0 giây';
}

export function installDailyLateSummary(root, initialDate) {
  root.dataset.lateSummary = '';
  root.innerHTML = `<div class="dr-card-head"><div><h3>Báo cáo trễ × 20.000đ</h3><p data-late-total role="status">Đang tải…</p></div><div class="dr-late-tools"><label>Tháng thống kê<input type="month" data-late-month value="${initialDate.slice(0, 7)}" max="${reportDay().slice(0, 7)}"></label></div></div><details class="dr-late-rules"><summary>Quy tắc tính</summary><p class="dr-hint">Tính báo cáo gửi sau 22:00 và quá hạn chưa gửi; mỗi ngày tính một lần. Gửi đúng 22:00:00, nghỉ/miễn và CTV không tính.</p></details><div class="dr-table-scroll"><table class="dr-table dr-late-table"><thead><tr><th>Nhân sự</th><th>Đã gửi trễ</th><th>Quá hạn chưa gửi</th><th>Số lần tính</th><th>Thành tiền</th><th>Nộp phạt</th></tr></thead><tbody data-late-rows></tbody><tfoot data-late-footer></tfoot></table></div>`;
  const monthInput = root.querySelector('[data-late-month]'), status = root.querySelector('[data-late-total]');
  const body = root.querySelector('[data-late-rows]'), footer = root.querySelector('[data-late-footer]');
  const dialog = document.createElement('dialog');
  dialog.className = 'dr-dialog dr-late-dialog';
  dialog.setAttribute('aria-labelledby', 'drLateDetailTitle');
  dialog.innerHTML = '<div class="dr-card-head"><h3 id="drLateDetailTitle"></h3><button type="button" data-late-close>Đóng</button></div><p data-late-detail-note class="dr-hint"></p><div class="dr-table-scroll"><table class="dr-table"><thead><tr><th>Nhân sự</th><th>Ngày báo cáo</th><th>Trạng thái</th><th>Giờ gửi (Việt Nam)</th><th>Thời gian trễ</th></tr></thead><tbody data-late-detail-rows></tbody></table></div>';
  root.append(dialog);
  dialog.querySelector('[data-late-close]').onclick = () => dialog.close();
  let current = null, asOf = null, payments = [], canConfirm = false, saving = false;
  const paymentFor = row => payments.find(payment => payment.data?.userId === row.profile.id);
  root.addEventListener('click', async event => {
    const button = event.target.closest('[data-late-paid]');
    if (!button || !current || !canConfirm || saving) return;
    const row = current.rows[Number(button.dataset.latePaid)], month = loadedMonth;
    if (!row) return;
    saving = true;
    root.querySelectorAll('[data-late-paid]').forEach(control => control.disabled = true);
    try {
      const session = await getSession();
      if (!session?.access_token) throw Error('Vui lòng đăng nhập lại.');
      const response = await fetch('/api/daily-reports', { method: 'POST', headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'late-payment', month, user_id: row.profile.id, revision: paymentFor(row)?.revision || 0, dates: row.details.map(item => item.date) }), signal: AbortSignal.timeout(15000) });
      const result = await response.json();
      if (!response.ok) throw Error(result.error || 'Chưa lưu được xác nhận nộp phạt.');
      await load(true);
    } catch (error) { status.textContent = error.message; }
    finally { saving = false; root.querySelectorAll('[data-late-paid]').forEach(control => control.disabled = false); }
  });
  root.addEventListener('click', event => {
    const button = event.target.closest('[data-late-detail]');
    if (!button || !current) return;
    const row = button.dataset.latePerson === 'all' ? null : current.rows[Number(button.dataset.latePerson)];
    const kind = button.dataset.lateDetail;
    const details = (row ? row.details : current.rows.flatMap(item => item.details)).filter(item => kind === 'count' || item.state === kind).sort((a, b) => a.date.localeCompare(b.date));
    dialog.querySelector('h3').textContent = `${row ? row.profile.acc || row.profile.full_name : 'Tổng'} · ${kind === 'late' ? 'Đã gửi trễ' : kind === 'overdue' ? 'Quá hạn chưa gửi' : 'Số lần tính'}: ${details.length}`;
    dialog.querySelector('[data-late-detail-note]').textContent = `Hạn gửi: 22:00:00 ngày báo cáo. Báo cáo chưa gửi tính thời gian trễ đến ${dateTime(asOf)}. ${lateReportCalendarNote(loadedMonth)}`;
    dialog.querySelector('[data-late-detail-rows]').innerHTML = details.map(item => `<tr><td>${esc(item.profile.acc || item.profile.full_name || 'Chưa gán Acc')}</td><td>${item.date.split('-').reverse().join('/')}</td><td>${item.state === 'late' ? 'Đã gửi trễ' : 'Quá hạn chưa gửi'}</td><td>${item.submittedAt ? dateTime(item.submittedAt) : 'Chưa gửi'}</td><td>${duration(item.delayMs)}</td></tr>`).join('') || '<tr><td colspan="5">Không có ngày báo cáo thuộc mục này.</td></tr>';
    dialog.showModal();
  });
  let generation = 0, loadedMonth = '', loadingMonth = '';
  async function load(force = false) {
    const month = monthInput.value;
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month) || month > reportDay().slice(0, 7)) return;
    if (!force && (month === loadedMonth || month === loadingMonth)) return;
    const version = ++generation;
    let calendarNote = root.querySelector('[data-late-calendar]');
    if (!calendarNote) { calendarNote = document.createElement('p'); calendarNote.className = 'dr-hint'; calendarNote.dataset.lateCalendar = ''; root.querySelector('.dr-table-scroll').before(calendarNote); }
    calendarNote.textContent = lateReportCalendarNote(month);
    loadingMonth = month; body.replaceChildren(); footer.replaceChildren(); status.textContent = 'Đang tải…';
    const start = month === '2026-11' ? '2026-11-09' : month + '-01', last = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0)).toISOString().slice(0, 10);
    const end = last < reportDay() ? last : reportDay();
    try {
      const session = await getSession();
      if (!session?.access_token) throw Error('Vui lòng đăng nhập lại.');
      const response = await fetch('/api/daily-reports?summary=late&from=' + start + '&to=' + end, { headers: { Authorization: 'Bearer ' + session.access_token }, cache: 'no-store', signal: AbortSignal.timeout(15000) });
      const snapshot = await response.json();
      if (!response.ok) throw Error(snapshot.error || 'Chưa tải được thống kê.');
      if (!Array.isArray(snapshot.profiles) || !Array.isArray(snapshot.reports)) throw Error('Dữ liệu chưa hợp lệ.');
      if (version !== generation) return;
      asOf = snapshot.serverTime ? new Date(snapshot.serverTime) : new Date();
      const result = dailyLateSummary(snapshot, { start, end, now: asOf }); current = result;
      payments = snapshot.payments || []; canConfirm = snapshot.canConfirmPayment === true;
      const cells = (row, person) => ['late', 'overdue', 'count', 'amount'].map(key => `<td><button type="button" class="dr-late-number" data-late-detail="${key === 'amount' ? 'count' : key}" data-late-person="${person}" title="Xem ngày báo cáo và thời gian trễ">${number(row[key])}${key === 'amount' ? 'đ' : ''}</button></td>`).join('');
      const paymentCell = (row, index) => {
        const payment = paymentFor(row), balance = latePaymentBalance(row.details, payment);
        return `<td>${balance.paid ? `<b class="dr-paid-label" title="${esc(payment.data.confirmedBy)} · ${dateTime(payment.data.confirmedAt)}">Đã nộp ${number(balance.paid)}đ</b>` : ''}${balance.remaining ? `<small>Còn ${number(balance.remaining)}đ</small>${canConfirm ? `<button type="button" data-late-paid="${index}" ${saving ? 'disabled' : ''}>Đã nộp phạt</button>` : ''}` : row.count ? '<small>Đã nộp đủ</small>' : 'Không phát sinh'}</td>`;
      };
      body.innerHTML = result.rows.map((row, index) => `<tr><td>${esc(row.profile.acc || row.profile.full_name || 'Chưa gán Acc')}</td>${cells(row, index)}${paymentCell(row, index)}</tr>`).join('') || '<tr><td colspan="6">Không có nhân sự trong phạm vi được xem.</td></tr>';
      const paidTotal = result.rows.reduce((sum, row) => sum + latePaymentBalance(row.details, paymentFor(row)).paid, 0);
      footer.innerHTML = '<tr><th>TỔNG</th>' + cells(result.total, 'all') + `<td>Đã nộp ${number(paidTotal)}đ<small>Còn ${number(result.total.amount - paidTotal)}đ</small></td></tr>`;
      status.textContent = `Toàn phòng · ${number(result.total.count)} lần × ${number(LATE_REPORT_RATE)}đ = ${number(result.total.amount)}đ · ${start.split('-').reverse().join('/')} – ${end.split('-').reverse().join('/')}`;
      loadedMonth = month;
    } catch (error) { if (version === generation) { loadedMonth = ''; status.textContent = 'Chưa tải được thống kê: ' + error.message; } }
    finally { if (version === generation) loadingMonth = ''; }
  }
  monthInput.onchange = () => { dialog.close(); load(true); };
  document.addEventListener('ibb5-daily-report-updated', () => load(true));
  const refresh = () => { if (!document.hidden && root.closest('.panel')?.classList.contains('page-active') && !loadingMonth && !saving) load(true); };
  setInterval(refresh, 60000);
  window.addEventListener('focus', refresh);
  window.addEventListener('online', refresh);
  load();
  return { update(date, force = false) { monthInput.value = date.slice(0, 7); load(force); } };
}
