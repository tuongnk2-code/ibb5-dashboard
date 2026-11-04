import { getSession } from './auth.js';
import { REPORT_SOURCES, STATE_LABEL, reportDay, reportState, validateReport, reportText, shiftDay, reportIdentity } from './dailyReportModel.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const number = n => Number(n || 0).toLocaleString('vi-VN');
const time = value => value ? new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : '—';

export function renderDailyReports(root, me, getMonthlyTarget) {
  let date = reportDay(), snapshot = null, dirty = false, busy = false, filter = 'all', generation = 0, serverOffset = 0, initialized = false;
  let history = [], historyGeneration = 0;
  const $ = sel => root.querySelector(sel);
  const supervisor = ['manager', 'lead'].includes(me.role);
  root.innerHTML = `<div class="dr-toolbar"><div><h2>Báo cáo ngày</h2><p>Kết quả hôm nay · Cam kết ngày mai <span class="dr-deadline">Chốt 22:00 · Giờ Việt Nam</span></p></div><div class="dr-controls"><label>Ngày báo cáo<input id="drDate" type="date" value="${date}" max="${date}"></label><button type="button" id="drReload">↻ Tải lại</button></div></div>
    <div id="drMessage" role="status" hidden></div>
    <div class="dr-summary" id="drSummary"></div><div id="drAlerts" class="dr-alerts" hidden></div>
    <div class="dr-layout"><article class="dr-card"><div class="dr-card-head"><div><h3>Báo cáo của tôi</h3><p>${esc(reportIdentity(me))}</p></div><span id="drOwnStatus" class="dr-badge"></span></div>
    <button type="button" id="drViewOwn" hidden>Xem báo cáo đã gửi ngày này</button>
    <form id="drForm"><fieldset id="drFields" disabled>
      <div class="dr-section-label">01 · KẾT QUẢ HÔM NAY</div><div class="dr-two"><label>PTTB thực hiện<input name="actual" type="number" min="0" max="100000" step="1" required></label><label>PTTB cam kết hôm nay<input name="commitment" type="number" min="0" max="100000" step="1" required></label></div>
      <p class="dr-hint" id="drPriorHint"></p><div class="dr-auto" id="drAuto"></div>
      <div class="dr-section-label">02 · KHÁCH HÀNG TIỀM NĂNG MỚI</div><div class="dr-source-head"><span>Nguồn</span><span>KHTN mới</span><span>Đã chốt</span><span></span></div><div id="drSources"></div>
      <div class="dr-source-footer"><button type="button" id="drAddSource">+ Thêm nguồn</button><strong id="drLeadTotal"></strong></div>
      <div class="dr-section-label" id="drTomorrowLabel">03 · CAM KẾT NGÀY MAI</div><div class="dr-two"><label>PTTB ngày mai<input name="tomorrowPttb" type="number" min="0" max="100000" step="1" required></label><label>HĐ Online ngày mai<input name="tomorrowOnline" type="number" min="0" max="100000" step="1" required></label></div>
      <label>Việc trọng tâm<textarea name="focus" maxlength="2000" rows="2" placeholder="Kế hoạch thực hiện ngày mai"></textarea></label>
      <div class="dr-section-label">04 · KHÓ KHĂN & HỖ TRỢ</div><label>Khó khăn gặp phải<textarea name="difficulty" maxlength="2000" rows="3" placeholder="Ví dụ: Khách chưa đồng ý phí hòa mạng…"></textarea></label><label>Đề nghị hỗ trợ<textarea name="support" maxlength="2000" rows="2" placeholder="Anh/chị cần Trưởng Bầy hoặc Trưởng phòng hỗ trợ gì?"></textarea></label>
      <div class="dr-actions"><button type="button" id="drDraft">Lưu nháp</button><button type="submit" class="primary" id="drSubmit">Gửi báo cáo</button><button type="button" id="drCopy">Sao chép nội dung</button></div><p class="dr-hint" id="drSaveHint">Bản nháp chưa được tính là đã gửi. Báo cáo lưu chung và cập nhật được trên các thiết bị.</p>
    </fieldset></form></article>
    <article class="dr-card dr-monitor"><div class="dr-card-head"><div><h3>${supervisor ? 'Theo dõi báo cáo' : 'Trạng thái báo cáo'}</h3><p>${me.role === 'manager' ? 'Toàn phòng' : me.role === 'lead' ? 'Nhân sự trong Bầy' : 'Báo cáo của bạn'}</p></div></div>
      <div class="dr-monitor-filters"><label>Trạng thái<select id="drFilter"><option value="all">Tất cả</option><option value="pending">Chưa gửi / Quá hạn</option><option value="sent">Đã gửi</option><option value="support">Cần hỗ trợ</option><option value="exempt">Nghỉ / Miễn báo cáo</option></select></label></div>
      <div class="dr-table-scroll"><table class="dr-table"><thead><tr><th>Nhân sự</th><th>PTTB<br>TH/CK</th><th>KHTN / Chốt</th><th>Online</th><th>Cam kết mai<br>PTTB / Online</th><th>Trạng thái</th><th>Giờ gửi</th><th></th></tr></thead><tbody id="drRows"><tr><td colspan="8">Đang tải…</td></tr></tbody></table></div><p class="dr-hint">Theo tài khoản đã được cấp quyền. Người lưu nháp vẫn thuộc danh sách chưa gửi; người được quản lý đánh dấu nghỉ không nhận cảnh báo.</p>
    </article></div><article class="dr-card dr-history"><div class="dr-card-head"><div><h3>Báo cáo đã gửi của tôi</h3><p>${esc(reportIdentity(me))} · Chọn ngày để xem lại nội dung đã gửi</p></div><label>Tháng báo cáo<input type="month" id="drHistoryMonth" value="${date.slice(0, 7)}"><button type="button" id="drHistoryReload">Tải lại danh sách</button></label></div><div class="dr-table-scroll"><table class="dr-table"><thead><tr><th>Ngày báo cáo</th><th>PTTB · TH/CK</th><th>HĐ Online</th><th>Giờ gửi</th><th></th></tr></thead><tbody id="drHistoryRows"><tr><td colspan="5">Đang tải…</td></tr></tbody></table></div></article>
    <dialog id="drDetail" class="dr-dialog"><div class="dr-card-head"><h3>Chi tiết báo cáo</h3><button type="button" id="drClose">Đóng</button></div><pre id="drDetailText"></pre><p id="drDetailAudit" class="dr-hint"></p></dialog>`;

  const message = (text, error = false) => { const el = $('#drMessage'); el.hidden = false; el.className = 'dr-message' + (error ? ' dr-error' : ''); el.textContent = text; };
  const own = () => snapshot?.reports.find(r => r.user_id === me.id);
  const state = r => reportState(r, date, new Date(Date.now() + serverOffset));
  const badge = r => `<span class="dr-badge dr-${state(r)}">${STATE_LABEL[state(r)]}</span>`;
  async function api(method, body, query) {
    const session = await getSession();
    if (!session) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    const response = await fetch('/api/daily-reports' + (method === 'GET' ? '?' + (query || 'date=' + date) : ''), {
      method, headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Không kết nối được máy chủ báo cáo.');
    return data;
  }
  function showDetail(profile, report, reportDate) {
    $('#drDetailText').textContent = report?.data.sources ? reportText(profile, reportDate, report.data) : reportIdentity(profile) + '\n' + (report?.status === 'exempt' ? 'Nghỉ: ' + report.data.absenceReason : 'Chưa gửi báo cáo.');
    $('#drDetailAudit').textContent = report ? STATE_LABEL[reportState(report, reportDate)] + ' · Cập nhật ' + new Date(report.updated_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' · Phiên bản ' + report.revision : 'Hạn gửi 22:00 giờ Việt Nam.';
    $('#drDetail').showModal();
  }
  async function loadHistory() {
    const version = ++historyGeneration;
    $('#drHistoryRows').innerHTML = '<tr><td colspan="5">Đang tải…</td></tr>';
    history = [];
    try {
      const result = await api('GET', null, 'history=mine&month=' + encodeURIComponent($('#drHistoryMonth').value));
      if (version !== historyGeneration) return;
      history = result.reports;
      $('#drHistoryRows').innerHTML = history.map(r => `<tr><td>${r.report_date.split('-').reverse().join('/')}</td><td>${number(r.data.actual)} / ${number(r.data.commitment)}</td><td>${number(r.data.online)}</td><td>${time(r.submitted_at)}</td><td><button type="button" data-dr-history="${esc(r.report_date)}">Xem báo cáo</button></td></tr>`).join('') || '<tr><td colspan="5">Bạn chưa gửi báo cáo nào trong tháng này.</td></tr>';
    } catch (err) { if (version === historyGeneration) $('#drHistoryRows').innerHTML = '<tr><td colspan="5">' + esc(err.message) + ' Bấm Tải lại danh sách để thử lại.</td></tr>'; }
  }
  function sourceRow(s) {
    return `<div class="dr-source-row"><input aria-label="Tên nguồn KHTN" class="dr-source-name" maxlength="60" required value="${esc(s.name)}"><input aria-label="Số KHTN ${esc(s.name)}" class="dr-leads" type="number" min="0" max="100000" step="1" required value="${s.leads}"><input aria-label="Số chốt ${esc(s.name)}" class="dr-closed" type="number" min="0" max="100000" step="1" required value="${s.closed}"><button type="button" class="dr-remove" aria-label="Xóa nguồn ${esc(s.name)}">×</button></div>`;
  }
  function totals() {
    const values = [...root.querySelectorAll('.dr-source-row')];
    const leads = values.reduce((n, row) => n + Number(row.querySelector('.dr-leads').value || 0), 0);
    const closed = values.reduce((n, row) => n + Number(row.querySelector('.dr-closed').value || 0), 0);
    $('#drLeadTotal').textContent = number(leads) + ' KHTN · ' + number(closed) + ' chốt';
  }
  function fillForm() {
    const report = own(), d = report?.data || {}, prior = snapshot.previous;
    for (const name of ['actual', 'commitment', 'tomorrowPttb', 'tomorrowOnline', 'focus', 'difficulty', 'support']) {
      const defaultValue = name === 'commitment' ? prior?.tomorrowPttb ?? 0 : ['focus', 'difficulty', 'support'].includes(name) ? '' : 0;
      $(`[name="${name}"]`).value = d[name] ?? defaultValue;
    }
    $('#drSources').innerHTML = (d.sources || REPORT_SOURCES.map(name => ({ name, leads: 0, closed: 0 }))).map(sourceRow).join('');
    $('#drPriorHint').textContent = prior ? 'Cam kết từ báo cáo hôm trước: ' + prior.tomorrowPttb + ' PTTB · ' + prior.tomorrowOnline + ' HĐ Online.' : 'Chưa có cam kết từ báo cáo hôm trước. Điền cam kết hôm nay để đối chiếu.';
    $('#drTomorrowLabel').textContent = '03 · CAM KẾT NGÀY ' + shiftDay(date, 1).split('-').reverse().join('/');
    const metric = snapshot.metrics[me.id] || { online: 0, monthlyOnline: 0 };
    const target = d.monthlyTarget ?? getMonthlyTarget(date.slice(0, 7), me.acc);
    $('#drAuto').innerHTML = `<div><span>HĐ Online hôm nay</span><b>${number(metric.online)}</b><small>Tự lấy theo ngày Online</small></div><div><span>Online lũy kế / Cam kết tháng</span><b>${number(metric.monthlyOnline)} / ${target == null ? '—' : number(target)}</b><small>${target == null ? 'Chưa có cam kết tháng đã duyệt trên thiết bị này' : 'Theo cam kết tháng đã duyệt'}</small></div>`;
    $('#drFields').disabled = !snapshot.profiles.some(p => p.id === me.id) || report?.status === 'exempt';
    $('#drDraft').hidden = report?.status === 'submitted';
    $('#drSubmit').textContent = report?.status === 'submitted' ? 'Cập nhật báo cáo' : 'Gửi báo cáo';
    dirty = false; totals();
  }
  function drawBoard() {
    if (!snapshot) return;
    const entries = snapshot.profiles.filter(p => p.role !== 'manager' || !supervisor).map(p => ({ p, r: snapshot.reports.find(r => r.user_id === p.id) }));
    const sent = entries.filter(({ r }) => r?.status === 'submitted'), pending = entries.filter(({ r }) => !['submitted', 'exempt'].includes(r?.status)), support = sent.filter(({ r }) => r.data.support?.trim());
    $('#drSummary').innerHTML = [{ key: 'sent', label: 'Đã gửi', count: sent.length }, { key: 'pending', label: 'Chưa gửi', count: pending.length }, { key: 'support', label: 'Cần hỗ trợ', count: support.length }, { key: 'all', label: 'KHTN mới', count: sent.reduce((n, { r }) => n + r.data.sources.reduce((v, s) => v + s.leads, 0), 0) }].map(s => `<button type="button" data-dr-filter="${s.key}" class="dr-stat dr-stat-${s.key}"><span>${s.label}</span><strong>${number(s.count)}</strong></button>`).join('');
    const late = pending.filter(({ r }) => state(r) === 'overdue');
    const alert = $('#drAlerts'); alert.hidden = !pending.length;
    alert.className = 'dr-alerts' + (late.length ? ' dr-overdue-alert' : '');
    alert.innerHTML = `<strong>${late.length ? late.length + ' nhân sự quá hạn chưa gửi' : pending.length + ' nhân sự chưa gửi báo cáo'} · ${date.split('-').reverse().join('/')}</strong><div>${pending.map(({ p, r }) => `<button type="button" class="dr-person-alert dr-${state(r)}" data-dr-view="${esc(p.id)}">${esc(reportIdentity(p))}${p.team ? ' · Bầy ' + p.team : ''}${r?.status === 'draft' ? ' · Nháp' : ''}</button>`).join('')}</div>`;
    const shown = entries.filter(({ r }) => filter === 'all' || (filter === 'pending' && !['submitted', 'exempt'].includes(r?.status)) || (filter === 'sent' && r?.status === 'submitted') || (filter === 'support' && r?.status === 'submitted' && r.data.support?.trim()) || (filter === 'exempt' && r?.status === 'exempt'));
    $('#drRows').innerHTML = shown.map(({ p, r }) => {
      const d = r?.data, submitted = r?.status === 'submitted', leads = d?.sources?.reduce((n, s) => n + s.leads, 0) || 0, closed = d?.sources?.reduce((n, s) => n + s.closed, 0) || 0;
      return `<tr class="dr-row-${state(r)}"><td><b>${esc(reportIdentity(p))}</b><small>${p.team ? ' · Bầy ' + p.team : ''}</small></td><td>${submitted ? d.actual + '/' + d.commitment : '—'}</td><td>${submitted ? leads + ' / ' + closed : '—'}</td><td>${submitted ? number(d.online) : '—'}</td><td>${submitted ? d.tomorrowPttb + ' / ' + d.tomorrowOnline : '—'}</td><td>${badge(r)}${submitted && d.support?.trim() ? '<small class="dr-support-flag">Cần hỗ trợ</small>' : ''}</td><td>${time(r?.submitted_at)}</td><td><button type="button" data-dr-view="${esc(p.id)}">Xem</button>${supervisor && !submitted ? `<button type="button" data-dr-exempt="${esc(p.id)}">${r?.status === 'exempt' ? 'Bỏ nghỉ' : 'Ngày nghỉ'}</button>` : ''}</td></tr>`;
    }).join('') || '<tr><td colspan="8">Không có nhân sự phù hợp.</td></tr>';
    const ownState = state(own()); $('#drOwnStatus').className = 'dr-badge dr-' + ownState; $('#drOwnStatus').textContent = STATE_LABEL[ownState];
    const report = own();
    $('#drViewOwn').hidden = report?.status !== 'submitted';
    if (report) $('#drSaveHint').textContent = (report.submitted_at ? 'Gửi lúc ' + time(report.submitted_at) + '. ' : '') + 'Cập nhật: ' + new Date(report.updated_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' · Phiên bản ' + report.revision + '. Lịch sử sửa được lưu trên máy chủ.';
  }
  async function load(fill = true) {
    const version = ++generation;
    try {
      const next = await api('GET');
      if (version !== generation) return;
      serverOffset = new Date(next.serverTime).getTime() - Date.now();
      // Keep the revision that the user is editing; the server detects conflicts.
      if (!fill && dirty && snapshot) {
        const editing = own(); next.reports = next.reports.filter(r => r.user_id !== me.id); if (editing) next.reports.push(editing);
      }
      snapshot = next; initialized = true;
      if (fill || !dirty) fillForm(); drawBoard();
    } catch (err) { message(err.message, true); if (fill) { $('#drFields').disabled = true; $('#drRows').innerHTML = '<tr><td colspan="8">Chưa tải được báo cáo. Bấm Tải lại để thử lại.</td></tr>'; } }
  }
  function formData() {
    const form = $('#drForm'), d = Object.fromEntries(new FormData(form));
    for (const name of ['actual', 'commitment', 'tomorrowPttb', 'tomorrowOnline']) d[name] = Number(d[name]);
    d.monthlyTarget = own()?.data.monthlyTarget ?? getMonthlyTarget(date.slice(0, 7), me.acc);
    d.sources = [...root.querySelectorAll('.dr-source-row')].map(row => ({ name: row.querySelector('.dr-source-name').value, leads: Number(row.querySelector('.dr-leads').value), closed: Number(row.querySelector('.dr-closed').value) }));
    return validateReport(d);
  }
  async function save(action) {
    if (busy || !$('#drForm').reportValidity()) return;
    try {
      const data = formData(); busy = true; $('#drFields').disabled = true;
      const saved = await api('POST', { date, action, revision: own()?.revision || 0, data });
      snapshot.reports = snapshot.reports.filter(r => r.user_id !== me.id);
      snapshot.reports.push(saved.report);
      drawBoard();
      dirty = false; await load();
      if (saved.report.status === 'submitted') { $('#drHistoryMonth').value = date.slice(0, 7); await loadHistory(); }
      message(action === 'draft' ? 'Đã lưu nháp trên hệ thống.' : 'Đã gửi báo cáo.');
    } catch (err) { message(err.message, true); }
    finally { busy = false; if (snapshot && own()?.status !== 'exempt') $('#drFields').disabled = false; }
  }
  $('#drForm').addEventListener('submit', e => { e.preventDefault(); save('submit'); });
  $('#drDraft').onclick = () => save('draft');
  $('#drForm').addEventListener('input', () => { dirty = true; totals(); });
  $('#drAddSource').onclick = () => { if (root.querySelectorAll('.dr-source-row').length >= 20) return message('Tối đa 20 nguồn.', true); $('#drSources').insertAdjacentHTML('beforeend', sourceRow({ name: '', leads: 0, closed: 0 })); dirty = true; };
  $('#drSources').onclick = e => { if (e.target.closest('.dr-remove')) { e.target.closest('.dr-source-row').remove(); dirty = true; totals(); } };
  $('#drDate').onchange = e => {
    if (busy || (dirty && !confirm('Báo cáo có thay đổi chưa lưu. Chuyển ngày và bỏ các thay đổi này?'))) { e.target.value = date; return; }
    date = e.target.value; snapshot = null; dirty = false; $('#drFields').disabled = true;
    $('#drSummary').innerHTML = ''; $('#drAlerts').hidden = true; $('#drOwnStatus').textContent = 'Đang tải…'; $('#drViewOwn').hidden = true;
    $('#drRows').innerHTML = '<tr><td colspan="8">Đang tải…</td></tr>'; load();
  };
  $('#drReload').onclick = () => { if (!busy && (!dirty || confirm('Tải lại sẽ bỏ thay đổi chưa lưu. Tiếp tục?'))) load(); };
  $('#drFilter').onchange = e => { filter = e.target.value; drawBoard(); };
  $('#drSummary').onclick = e => { const button = e.target.closest('[data-dr-filter]'); if (button) { filter = button.dataset.drFilter; $('#drFilter').value = filter; drawBoard(); } };
  $('#drCopy').onclick = async () => {
    try { if (!$('#drForm').reportValidity()) return; const d = formData(); Object.assign(d, snapshot.metrics[me.id]); await navigator.clipboard.writeText(reportText(me, date, d)); message('Đã sao chép nội dung báo cáo.'); }
    catch (err) { message(err.message || 'Không sao chép được. Vui lòng thử lại.', true); }
  };
  root.addEventListener('click', async e => {
    const view = e.target.closest('[data-dr-view]'), exempt = e.target.closest('[data-dr-exempt]');
    if (view && snapshot) {
      const p = snapshot.profiles.find(p => p.id === view.dataset.drView), r = snapshot.reports.find(r => r.user_id === p.id);
      showDetail(p, r, date);
    }
    if (exempt && snapshot && !busy) {
      const r = snapshot.reports.find(r => r.user_id === exempt.dataset.drExempt), undo = r?.status === 'exempt';
      const reason = undo ? '' : prompt('Lý do nghỉ / miễn báo cáo:'); if (!undo && !reason?.trim()) return;
      try { busy = true; await api('POST', { date, action: undo ? 'unexempt' : 'exempt', user_id: exempt.dataset.drExempt, revision: r?.revision || 0, reason }); await load(false); if (!dirty) fillForm(); message(undo ? 'Đã bỏ đánh dấu nghỉ.' : 'Đã đánh dấu nghỉ; nhân sự không còn bị cảnh báo.'); }
      catch (err) { message(err.message, true); } finally { busy = false; }
    }
  });
  $('#drClose').onclick = () => $('#drDetail').close();
  $('#drViewOwn').onclick = () => { if (own()?.status === 'submitted') showDetail(me, own(), date); };
  $('#drHistoryMonth').onchange = loadHistory;
  $('#drHistoryReload').onclick = loadHistory;
  $('#drHistoryRows').onclick = e => {
    const button = e.target.closest('[data-dr-history]');
    const report = button && history.find(r => r.report_date === button.dataset.drHistory);
    if (report) showDetail(me, report, report.report_date);
  };
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  // Refresh only this open tab. No external messages or background automation.
  setInterval(() => { if (!document.hidden && root.closest('.panel').classList.contains('page-active') && !busy && initialized) load(false); }, 60000);
  load();
  loadHistory();
}
