import { getSession } from './auth.js';
import { reportDay, reportState, STATE_LABEL, reportIdentity } from './dailyReportModel.js';
import { marketTotals, monthDays, validateMarketReport } from './marketReportModel.js';
import '../css/market.css';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dayLabel = day => day.split('-').reverse().join('/');
const rate = value => value === null ? '—' : Math.round(value * 100) + '%';
const time = value => value ? new Date(value).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }) : '—';
export function renderMarketReports(root, me) {
  const $ = s => root.querySelector(s), manager = me.role === 'manager', supervisor = ['manager', 'lead'].includes(me.role);
  let date = reportDay(), snapshot = null, dirty = false, busy = false, generation = 0, editRevision = 0, offset = 0;
  root.innerHTML = `<div class="mk-head"><div><small>IBB5 · TRIỂN KHAI THỊ TRƯỜNG</small><h2>Theo dõi thị trường của phòng</h2><p>Tham gia · Demo · PTTB <span class="mk-deadline">Chốt 22:00 · Giờ Việt Nam</span></p></div><div class="mk-tools"><label>Ngày báo cáo<input id="mkDate" type="date" value="${date}" max="${date}"></label><button id="mkReload" type="button">↻ Tải lại</button></div></div>
  <div id="mkMessage" role="status" hidden></div><div id="mkSummary" class="mk-summary"></div><div id="mkAlerts" class="mk-alert" hidden></div>
  <article class="mk-card" id="mkOwn" ${manager ? 'hidden' : ''}><div class="mk-head"><h3>Báo cáo của tôi · ${esc(reportIdentity(me))}</h3><span id="mkOwnStatus"></span></div><form id="mkForm"><fieldset id="mkFields"><div class="mk-fields"><label>Số buổi tham gia<input name="sessions" type="number" min="0" max="10000" step="1" value="0" required></label><label>Số Demo<input name="demos" type="number" min="0" max="10000" step="1" value="0" required></label><label>PTTB<input name="pttb" type="number" min="0" max="10000" step="1" value="0" required></label></div><label>Khu vực triển khai<input name="area" maxlength="2000" placeholder="Địa bàn, tuyến, điểm triển khai…"></label><label>Ghi chú / khó khăn<textarea name="note" maxlength="2000" rows="2" placeholder="Kết quả triển khai, đề nghị hỗ trợ…"></textarea></label><div class="mk-tools"><button id="mkDraft" type="button">Lưu nháp</button><button id="mkSubmit" type="submit" class="primary">Gửi báo cáo</button></div></fieldset></form><p id="mkSaveHint">Bản nháp chưa được tính vào kết quả. Báo cáo được lưu chung trên hệ thống.</p></article>
  <article class="mk-card"><div class="mk-head"><div><h3>Theo dõi gửi báo cáo ngày</h3><p id="mkScope"></p></div><div class="mk-tools"><label>Bầy<select id="mkTeam"><option value="">Tất cả Bầy</option><option value="1">Bầy 1</option><option value="2">Bầy 2</option><option value="3">Bầy 3</option></select></label><label>Tìm nhân sự<input id="mkSearch" type="search" placeholder="Nhập Acc…"></label><label>Trạng thái<select id="mkFilter"><option value="all">Tất cả</option><option value="pending">Chưa gửi</option><option value="overdue">Quá hạn</option><option value="sent">Đã gửi</option><option value="exempt">Nghỉ / Miễn báo cáo</option></select></label></div></div><div class="mk-scroll"><table class="mk-monitor"><thead><tr><th>Mã Acc</th><th>Bầy</th><th>Tham gia</th><th>Demo</th><th>PTTB</th><th>Trạng thái</th><th>Giờ gửi</th><th></th></tr></thead><tbody id="mkRows"></tbody></table></div></article>
  <article class="mk-card"><div class="mk-head"><div><h3>Kết quả triển khai thị trường</h3><p>Tỷ lệ Demo = Demo / số buổi · Tỷ lệ PTTB = PTTB / số buổi</p></div><div class="mk-tools"><label>Hiển thị<select id="mkView"><option value="day">Ngày chọn</option><option value="month">Cả tháng</option></select></label><button id="mkShot" class="ibb-shot-btn" type="button" data-shot="marketCapture" data-file="IBB5_Trien_Khai_Thi_Truong">📸 Chụp ảnh bảng</button><button id="mkExport" type="button">↓ Xuất CSV</button></div></div><div id="marketCapture"><h3>THEO DÕI THỊ TRƯỜNG CỦA PHÒNG</h3><p id="mkMatrixScope"></p><div class="mk-scroll mk-matrix-scroll"><table class="mk-matrix"><thead id="mkHead"></thead><tbody id="mkMatrix"></tbody></table></div></div><p class="mk-hint">Tổng tháng chỉ cộng báo cáo đã gửi, bao gồm gửi muộn. Bấm ô ngày để xem báo cáo. Ô đỏ: đã tham gia nhưng Demo hoặc PTTB bằng 0.</p></article>
  <dialog id="mkDetail"><div class="mk-head"><h3 id="mkDetailTitle"></h3><button type="button" id="mkClose">Đóng</button></div><div id="mkDetailBody"></div></dialog>`;
  const own = () => snapshot?.reports.find(r => r.user_id === me.id && r.report_date === date);
  const state = report => reportState(report, date, new Date(Date.now() + offset));
  const badge = report => `<span class="mk-badge mk-${state(report)}">${STATE_LABEL[state(report)]}</span>`;
  const eligible = (profile, day) => !profile.created_at || reportDay(new Date(profile.created_at)) <= day;
  const profiles = () => (snapshot?.profiles || []).filter(p => (!$('#mkTeam').value || String(p.team) === $('#mkTeam').value) && reportIdentity(p).toLowerCase().includes($('#mkSearch').value.trim().toLowerCase()));
  async function api(method = 'GET', body) {
    const session = await getSession(); if (!session) throw new Error('Phiên đăng nhập đã hết hạn.');
    const response = await fetch('/api/market-reports' + (method === 'GET' ? '?date=' + date : ''), { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify({ date, ...body }) : undefined });
    const value = await response.json().catch(() => ({})); if (!response.ok) throw new Error(value.error || 'Không kết nối được báo cáo thị trường.'); return value;
  }
  function message(text, error = false) { $('#mkMessage').hidden = !text; $('#mkMessage').textContent = text; $('#mkMessage').className = error ? 'mk-error' : 'mk-success'; }
  function fill() {
    const report = own(), data = report?.data || {};
    for (const control of $('#mkForm').querySelectorAll('[name]')) control.value = data[control.name] ?? (control.type === 'number' ? 0 : '');
    editRevision = report?.revision || 0; dirty = false;
  }
  function detail(userId, day) {
    const person = snapshot.profiles.find(p => p.id === userId); if (!person) return;
    const report = snapshot.reports.find(r => r.user_id === userId && r.report_date === day), data = report?.data;
    $('#mkDetailTitle').textContent = reportIdentity(person) + ' · ' + dayLabel(day);
    const s = reportState(report, day, new Date(Date.now() + offset));
    $('#mkDetailBody').innerHTML = `<p>${STATE_LABEL[s]}</p>` + (report?.status === 'exempt' ? `<p>Lý do: ${esc(data.absenceReason)}</p>` : data ? `<dl><dt>Số buổi tham gia</dt><dd>${data.sessions ?? 0}</dd><dt>Demo</dt><dd>${data.demos ?? 0}</dd><dt>PTTB</dt><dd>${data.pttb ?? 0}</dd><dt>Khu vực</dt><dd>${esc(data.area || '—')}</dd><dt>Ghi chú</dt><dd>${esc(data.note || '—')}</dd></dl><p>Gửi lúc: ${time(report.submitted_at)} · Phiên bản ${report.revision}</p>` : '<p>Chưa có báo cáo.</p>');
    $('#mkDetail').showModal();
  }
  function board() {
    if (!snapshot) return;
    const people = profiles(), todayPeople = people.filter(p => eligible(p, date));
    const entries = todayPeople.map(p => ({ p, r: snapshot.reports.find(r => r.user_id === p.id && r.report_date === date) }));
    const sent = entries.filter(({ r }) => r?.status === 'submitted'), pending = entries.filter(({ r }) => !['submitted', 'exempt'].includes(r?.status));
    const overdue = entries.filter(({ r }) => ['late', 'overdue'].includes(state(r))), totals = marketTotals(sent.map(({ r }) => r));
    $('#mkSummary').innerHTML = [['Đã gửi', sent.length, 'sent'], ['Chưa gửi', pending.length, 'pending'], ['Quá hạn / Gửi muộn', overdue.length, 'overdue'], ['Demo trong ngày', totals.demos, 'all'], ['PTTB trong ngày', totals.pttb, 'all']].map(([label, n, key]) => `<button type="button" data-mk-filter="${key}"><span>${label}</span><strong>${n}</strong></button>`).join('');
    $('#mkAlerts').hidden = !pending.length;
    $('#mkAlerts').textContent = 'Chưa gửi ngày ' + dayLabel(date) + ': ' + pending.map(({ p, r }) => reportIdentity(p) + (state(r) === 'overdue' ? ' (quá hạn)' : r?.status === 'draft' ? ' (nháp)' : '')).join(' · ');
    $('#mkScope').textContent = dayLabel(date) + ' · ' + (manager ? 'Toàn phòng' : me.role === 'lead' ? 'Phạm vi Bầy của bạn' : 'Báo cáo của bạn');
    const filter = $('#mkFilter').value;
    const shown = entries.filter(({ r }) => filter === 'all' || (filter === 'pending' && !['submitted', 'exempt'].includes(r?.status)) || (filter === 'overdue' && ['late', 'overdue'].includes(state(r))) || (filter === 'sent' && r?.status === 'submitted') || (filter === 'exempt' && r?.status === 'exempt'));
    $('#mkRows').innerHTML = shown.map(({ p, r }) => `<tr><td><b>${esc(reportIdentity(p))}</b></td><td>${p.team || '—'}</td><td>${r?.status === 'submitted' ? r.data.sessions : '—'}</td><td>${r?.status === 'submitted' ? r.data.demos : '—'}</td><td>${r?.status === 'submitted' ? r.data.pttb : '—'}</td><td>${badge(r)}</td><td>${time(r?.submitted_at)}</td><td><button type="button" data-mk-user="${esc(p.id)}" data-mk-day="${date}">Xem</button>${supervisor && r?.status !== 'submitted' ? `<button type="button" data-mk-exempt="${esc(p.id)}">${r?.status === 'exempt' ? 'Bỏ nghỉ' : 'Ngày nghỉ'}</button>` : ''}</td></tr>`).join('') || '<tr><td colspan="8">Không có nhân sự phù hợp.</td></tr>';
    $('#mkOwnStatus').innerHTML = badge(own());
    $('#mkDate').disabled = busy; $('#mkReload').disabled = busy;
    $('#mkFields').disabled = busy || !snapshot.profiles.some(p => p.id === me.id && eligible(p, date)) || own()?.status === 'exempt';
    $('#mkDraft').hidden = own()?.status === 'submitted'; $('#mkSubmit').textContent = own()?.status === 'submitted' ? 'Cập nhật báo cáo' : 'Gửi báo cáo';
    if (own()) $('#mkSaveHint').textContent = 'Gửi lúc ' + time(own().submitted_at) + ' · Phiên bản ' + own().revision + '. Lịch sử chỉnh sửa được lưu trên máy chủ.';
    matrix(people);
  }
  function matrix(people) {
    $('#marketCapture').classList.toggle('mk-month', $('#mkView').value === 'month');
    const days = $('#mkView').value === 'month' ? monthDays(date.slice(0, 7)) : [date];
    $('#mkMatrixScope').textContent = 'Tháng ' + date.slice(0, 7) + ' · Ngày theo dõi ' + dayLabel(date) + ' · ' + ($('#mkTeam').value ? 'Bầy ' + $('#mkTeam').value : manager ? 'Toàn phòng' : 'Theo quyền tài khoản');
    $('#mkHead').innerHTML = `<tr><th rowspan="2">Mã Acc / Bầy</th><th colspan="5">TỔNG THÁNG ${date.slice(0, 7)}</th>${days.map(day => `<th colspan="3">${dayLabel(day)}</th>`).join('')}</tr><tr><th>Số buổi</th><th>Demo</th><th>PTTB</th><th>Tỷ lệ Demo</th><th>Tỷ lệ PTTB</th>${days.map(() => '<th>Tham gia</th><th>Demo</th><th>PTTB</th>').join('')}</tr>`;
    const cells = (members, aggregate = false) => {
      const ids = new Set(members.map(p => p.id)), reports = snapshot.reports.filter(r => ids.has(r.user_id)), total = marketTotals(reports);
      return `<td>${total.sessions}</td><td>${total.demos}</td><td>${total.pttb}</td><td>${rate(total.demoRate)}</td><td>${rate(total.pttbRate)}</td>` + days.map(day => {
        const dayReports = reports.filter(r => r.report_date === day), sum = marketTotals(dayReports);
        if (aggregate) return ['sessions', 'demos', 'pttb'].map(key => `<td>${sum[key]}</td>`).join('');
        const report = dayReports[0], person = members[0], submitted = report?.status === 'submitted';
        return ['sessions', 'demos', 'pttb'].map(key => `<td class="${submitted && key !== 'sessions' && sum.sessions > 0 && !sum[key] ? 'mk-zero' : ''}">${eligible(person, day) && day <= reportDay(new Date(Date.now() + offset)) ? `<button type="button" data-mk-user="${esc(person.id)}" data-mk-day="${day}">${submitted ? sum[key] : report?.status === 'exempt' ? 'Nghỉ' : '—'}</button>` : '—'}</td>`).join('');
      }).join('');
    };
    let html = '';
    for (const team of [...new Set(people.map(p => p.team || 0))].sort((a, b) => a - b)) {
      const members = people.filter(p => (p.team || 0) === team);
      for (const p of members) html += `<tr><th>${esc(reportIdentity(p))}</th>${cells([p])}</tr>`;
      html += `<tr class="mk-team"><th>TỔNG ${team ? 'BẦY ' + team : 'CHƯA GÁN BẦY'}</th>${cells(members, true)}</tr>`;
    }
    html += `<tr class="mk-total"><th>${manager && !$('#mkTeam').value ? 'TỔNG PHÒNG' : 'TỔNG PHẠM VI'}</th>${cells(people, true)}</tr>`;
    $('#mkMatrix').innerHTML = html;
  }
  async function load(refreshForm = false) {
    const token = ++generation;
    try {
      const value = await api(); if (token !== generation) return;
      snapshot = value; offset = Date.parse(value.serverTime) - Date.now();
      if (refreshForm || !dirty) fill(); board();
    } catch (e) { if (token === generation) message(e.message, true); }
  }
  async function save(action, personId) {
    if (busy || !snapshot) return;
    if (!personId && manager) return;
    let data, reason;
    if (personId) { reason = action === 'exempt' ? prompt('Lý do nghỉ / miễn báo cáo:') : ''; if (reason === null) return; }
    else try {
      data = Object.fromEntries([...$('#mkForm').querySelectorAll('[name]')].map(c => [c.name, c.type === 'number' ? c.value === '' ? null : Number(c.value) : c.value]));
      data = validateMarketReport(data);
    } catch (e) { return message(e.message, true); }
    const previous = snapshot.reports.find(r => r.user_id === personId && r.report_date === date);
    busy = true; board();
    try {
      await api('POST', { action, user_id: personId, data, reason, revision: personId ? previous?.revision || 0 : editRevision });
      dirty = false; await load(true); message(action === 'draft' ? 'Đã lưu nháp. Chưa tính vào kết quả tháng.' : 'Đã lưu báo cáo thị trường trên hệ thống.');
    } catch (e) { message(e.message, true); }
    finally { busy = false; board(); }
  }
  $('#mkForm').onsubmit = e => { e.preventDefault(); save('submit'); };
  $('#mkForm').oninput = () => { dirty = true; message('Nội dung đang sửa chưa được lưu.'); };
  $('#mkDraft').onclick = () => save('draft');
  $('#mkReload').onclick = () => { if (!dirty || confirm('Tải lại sẽ thay nội dung chưa lưu. Tiếp tục?')) load(true); };
  $('#mkDate').onchange = () => {
    if (dirty && !confirm('Đổi ngày sẽ bỏ nội dung chưa lưu. Tiếp tục?')) { $('#mkDate').value = date; return; }
    if (!$('#mkDate').value || $('#mkDate').value > reportDay()) { $('#mkDate').value = date; return; }
    date = $('#mkDate').value; dirty = false; snapshot = null; $('#mkFields').disabled = true; message(''); load(true);
  };
  for (const id of ['mkTeam', 'mkFilter', 'mkView']) $('#' + id).onchange = board;
  $('#mkSearch').oninput = board;
  root.addEventListener('click', e => {
    const view = e.target.closest('[data-mk-user]'); if (view) detail(view.dataset.mkUser, view.dataset.mkDay);
    const filter = e.target.closest('[data-mk-filter]'); if (filter) { $('#mkFilter').value = filter.dataset.mkFilter; board(); }
    const exempt = e.target.closest('[data-mk-exempt]'); if (exempt) { const report = snapshot.reports.find(r => r.user_id === exempt.dataset.mkExempt && r.report_date === date); save(report?.status === 'exempt' ? 'unexempt' : 'exempt', exempt.dataset.mkExempt); }
  });
  $('#mkClose').onclick = () => $('#mkDetail').close();
  $('#mkExport').onclick = () => {
    const rows = [...$('#marketCapture table').rows].map(row => [...row.cells].map(cell => '"' + cell.textContent.replace(/"/g, '""') + '"').join(','));
    const url = URL.createObjectURL(new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'IBB5_Thi_Truong_' + date + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  let loading = false;
  async function sync() { if (loading || busy || document.hidden || !root.closest('.panel').classList.contains('page-active')) return; loading = true; try { await load(); } finally { loading = false; } }
  setInterval(sync, 5000); window.addEventListener('focus', sync); window.addEventListener('online', sync); document.addEventListener('visibilitychange', sync); window.addEventListener('hashchange', sync);
  load(true);
}
