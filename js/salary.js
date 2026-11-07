import { getSession } from './auth.js';
import { reportDay } from './dailyReportModel.js';
import { SALARY_BANDS, PROBATION_SALARY } from './salaryBands.js';
import { calculateSalary, salaryChange } from './salaryModel.js';
import '../css/salary.css';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = value => value === null ? '—' : value.toLocaleString('vi-VN');
const number = value => value.toLocaleString('vi-VN', { maximumFractionDigits: 1 });
const changeCell = (current, previous) => {
  const change = salaryChange(current, previous);
  return `<td class="sal-change${change < 0 ? ' is-negative' : change > 0 ? ' is-positive' : ''}">${change === null ? '—' : (change > 0 ? '+' : '') + money(change)}</td>`;
};

export function renderSalary(root, me) {
  const $ = selector => root.querySelector(selector), manager = me.role === 'manager';
  let payload = null, month = reportDay().slice(0, 7), generation = 0, busy = false;
  root.innerHTML = `<div class="sal-head"><div><small>IBB5 · LƯƠNG CƠ BẢN</small><h2>LCB theo kết quả dịch vụ</h2><p id="salFormula"></p></div><div class="sal-controls"><label>Tháng tính LCB<input id="salMonth" type="month" value="${month}" max="${month}"></label><button id="salReload" type="button">↻ Tải lại</button></div></div><div id="salMessage" role="status" hidden></div><div class="sal-summary" id="salSummary"></div><div class="sal-card"><div class="sal-head"><div><h3>Chi tiết theo nhân sự</h3><p id="salScope"></p></div><div class="sal-controls"><label>Bầy<select id="salTeam"><option value="">Tất cả Bầy</option><option value="1">Bầy 1</option><option value="2">Bầy 2</option><option value="3">Bầy 3</option></select></label><label>Tìm Acc<input id="salSearch" type="search" placeholder="Nhập mã Acc…"></label><button id="salExport" type="button">↓ Xuất CSV</button></div></div><div class="sal-scroll"><table id="salTable"><thead><tr><th>Mã Acc</th><th>Số NET</th><th>Số V.VIP</th><th id="salTotalHeader">Tổng DV Tháng T</th><th>Mốc đối chiếu</th><th id="salCurrentHeader">LCB Tháng T</th><th id="salPrevHeader">LCB T-1</th><th>LCB tăng/giảm</th><th>Thử việc</th></tr></thead><tbody id="salRows"><tr><td colspan="9">Đang tải…</td></tr></tbody></table></div><p class="sal-note" id="salNote"></p><p class="sal-note" id="salUpdated"></p></div><details class="sal-card"><summary>Bảng mốc LCB áp dụng</summary><div class="sal-scroll"><table><thead><tr><th>INT từ</th><th>INT đến</th><th>Lương cứng (đồng)</th></tr></thead><tbody><tr><td colspan="2">Thử việc</td><td>${money(PROBATION_SALARY)}</td></tr>${SALARY_BANDS.map(b => `<tr><td>${b.from}</td><td>${b.to === Infinity ? 'Trở lên' : b.to}</td><td>${money(b.salary)}</td></tr>`).join('')}</tbody></table></div></details>`;
  $('#salFormula').textContent = 'Tổng DV = NET × 0,8 + V.VIP × 1,7 · HĐ tạo tháng T: Online từ 01/T đến 04/T+1. HĐ tồn tháng cũ: Online từ 05/T đến 04/T+1.';
  $('#salNote').textContent = 'Tổng DV được làm tròn theo toán học trước khi đối chiếu LCB (phần lẻ ≥ 0,5 làm tròn lên).' + (manager ? ' TP đánh dấu thử việc theo từng tháng; không tự thay đổi trạng thái thử việc các tháng khác.' : ' Trạng thái thử việc do Trưởng phòng cập nhật.') + ' Tổng LCB là tổng mức lương từng người trong phạm vi đang xem.';
  function message(text, error = false) { $('#salMessage').hidden = !text; $('#salMessage').textContent = text; $('#salMessage').className = error ? 'sal-error' : 'sal-success'; }
  function rows() {
    return (payload?.rows || []).filter(p => (!$('#salTeam').value || String(p.team) === $('#salTeam').value) && p.acc.toLowerCase().includes($('#salSearch').value.trim().toLowerCase())).map(p => {
      return { ...p, ...calculateSalary(p.net, p.vvip, p.probation) };
    });
  }
  function draw() {
    if (!payload) return;
    const visible = rows();
    const sum = members => members.reduce((s, p) => ({ net: s.net + p.net, vvip: s.vvip + p.vvip, total: s.total + p.total, salary: s.salary === null || p.salary === null ? null : s.salary + p.salary, previousSalary: s.previousSalary === null || p.previousSalary == null ? null : s.previousSalary + p.previousSalary }), { net: 0, vvip: 0, total: 0, salary: 0, previousSalary: 0 });
    const totals = sum(visible);
    const allPeople = payload.rows.map(p => ({...p,...calculateSalary(p.net,p.vvip,p.probation)}));
    const allTotals = sum(allPeople), average = allPeople.length && allTotals.salary !== null ? Math.round(allTotals.salary / allPeople.length) : null;
    const cards = [['Số NET', totals.net], ['Số V.VIP', totals.vvip], ['Tổng DV', number(totals.total)], ['Tổng LCB trong phạm vi', money(totals.salary) + ' ₫']];
    cards.push(['Lương trung bình của phòng', money(average) + ' ₫']);
    $('#salSummary').innerHTML = cards.map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`).join('');
    $('#salSummary').lastElementChild.insertAdjacentHTML('beforeend', `<small>Tổng LCB / ${allPeople.length} nhân sự · Tháng ${month.split('-').reverse().join('/')}</small>`);
    $('#salTotalHeader').textContent = 'Tổng DV Tháng ' + Number(month.slice(5));
    $('#salCurrentHeader').textContent = 'LCB Tháng ' + Number(month.slice(5));
    $('#salPrevHeader').textContent = payload.previousMonth ? 'LCB T' + Number(payload.previousMonth.slice(5)) : 'LCB T-1';
    $('#salPrevHeader').title = payload.previousMonth || '';
    const day = value => value.split('-').reverse().join('/');
    $('#salScope').textContent = 'Kỳ ' + day(payload.start) + '–' + day(payload.end) + (payload.provisional ? ' · Tạm tính đến ' + day(payload.asOf) : ' · Đã đủ thời gian kỳ') + ' · Toàn phòng';
    $('#salUpdated').textContent = payload.sourceUpdated ? 'Nguồn dữ liệu cập nhật: ' + new Date(payload.sourceUpdated).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';
    const totalRow = (label, members, className) => { const s = sum(members); return `<tr class="${className}"><th>${label}</th><td>${s.net}</td><td>${s.vvip}</td><td>${number(s.total)}</td><td>—</td><td>${money(s.salary)}</td><td>${money(s.previousSalary)}</td>${changeCell(s.salary,s.previousSalary)}<td>—</td></tr>`; };
    let html = '';
    for (const team of [...new Set(visible.map(p => p.team))].sort((a, b) => a - b)) {
      const members = visible.filter(p => p.team === team);
      for (const p of members) html += `<tr data-salary-acc="${esc(p.acc)}"><th>${esc(p.acc)}</th><td>${p.net}</td><td>${p.vvip}</td><td>${number(p.total)}</td><td>${esc(p.band?.label || 'Chưa có mốc phù hợp')}${!p.probation && p.compared !== p.total ? `<small>Đối chiếu ${p.compared} DV</small>` : ''}</td><td class="sal-amount">${money(p.salary)}</td><td class="sal-previous">${money(p.previousSalary ?? null)}</td>${changeCell(p.salary,p.previousSalary)}<td>${manager ? `<label class="sal-probation"><input type="checkbox" data-sal-probation="${esc(p.acc)}" ${p.probation ? 'checked' : ''} ${busy ? 'disabled' : ''}>Thử việc</label>` : p.probation ? 'Thử việc' : 'Chính thức'}</td></tr>`;
      html += totalRow('TỔNG BẦY ' + team, members, 'sal-team');
    }
    if (visible.length) html += totalRow('TỔNG PHẠM VI', visible, 'sal-total');
    $('#salRows').innerHTML = html || '<tr><td colspan="9">Không có nhân sự phù hợp.</td></tr>';
    $('#salMonth').disabled = busy;
  }
  async function api(method = 'GET', body) {
    const requestedMonth = month, session = await getSession(); if (!session) throw new Error('Phiên đăng nhập đã hết hạn.');
    const response = await fetch('/api/salary' + (method === 'GET' ? '?month=' + requestedMonth : ''), { method, cache: 'no-store', signal: AbortSignal.timeout(15000), headers: { Authorization: 'Bearer ' + session.access_token, 'Content-Type': 'application/json' }, body: method === 'POST' ? JSON.stringify({ month: requestedMonth, ...body }) : undefined });
    const value = await response.json().catch(() => ({})); if (!response.ok) throw new Error(value.error || 'Không tải được LCB.'); return value;
  }
  async function load() {
    const token = ++generation;
    try { const next = await api(); if (token !== generation) return; payload = next; draw(); }
    catch (e) { if (token === generation) message(e.message, true); }
  }
  root.addEventListener('change', async e => {
    const checkbox = e.target.closest('[data-sal-probation]'); if (!checkbox || !manager || busy) return;
    const row = payload?.rows.find(p => p.acc === checkbox.dataset.salProbation); if (!row) return;
    const probation = checkbox.checked; busy = true; generation++; draw();
    try {
      const result = await api('POST', { acc: row.acc, probation, revision: row.revision });
      Object.assign(row, { probation: result.setting.probation, revision: result.setting.revision });
      message('Đã cập nhật thử việc cho ' + row.acc + ' · Tháng ' + month + '.');
    } catch (e) { message(e.message, true); }
    finally { busy = false; draw(); }
  });
  $('#salMonth').onchange = () => {
    const next = $('#salMonth').value; if (!next || next > reportDay().slice(0, 7)) { $('#salMonth').value = month; return; }
    month = next; payload = null; message(''); $('#salRows').innerHTML = '<tr><td colspan="9">Đang tải…</td></tr>'; $('#salSummary').innerHTML = ''; load();
  };
  $('#salTeam').onchange = draw; $('#salSearch').oninput = draw;
  $('#salReload').onclick = () => { if (!busy) { message(''); load(); } };
  $('#salExport').onclick = () => {
    if (!payload) return;
    const table = [['Mã Acc', 'Số NET', 'Số V.VIP', $('#salTotalHeader').textContent, 'DV đối chiếu', 'Mốc LCB', $('#salCurrentHeader').textContent, $('#salPrevHeader').textContent, 'LCB tăng/giảm', 'Thử việc'], ...rows().map(p => [p.acc, p.net, p.vvip, p.total, p.compared, p.band?.label || '', p.salary ?? '', p.previousSalary ?? '', salaryChange(p.salary,p.previousSalary) ?? '', p.probation ? 'Có' : 'Không'])];
    const url = URL.createObjectURL(new Blob(['\ufeff' + table.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'IBB5_LCB_' + month + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  let refreshing = false;
  async function sync() { if (refreshing || busy || document.hidden || !root.closest('.panel').classList.contains('page-active')) return; refreshing = true; try { await load(); } finally { refreshing = false; } }
  setInterval(sync, 5000); document.addEventListener('ibb5-shared-updated', sync); window.addEventListener('focus', sync); window.addEventListener('hashchange', sync);
  load();
}
