const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const day = value => value ? value.split('-').reverse().join('/') : '—';

export function installAgedContractDetails({button, getRows, getAsOf, getNotes, canView}) {
  const dialog = document.createElement('dialog');
  dialog.id = 'agedContractDialog'; dialog.className = 'aged-contract-dialog';
  dialog.setAttribute('aria-labelledby','agedContractTitle');
  dialog.innerHTML = '<div class="aged-contract-head"><h3 id="agedContractTitle">HĐ tồn từ 7 ngày</h3><button type="button" data-aged-close>Đóng</button></div><p data-aged-scope></p><div class="tablewrap"><table><thead><tr><th>Mã HĐ</th><th>Nhân viên bán</th><th>Khách hàng</th><th>Ngày tạo</th><th>Số ngày tồn</th><th>Ngày Online dự kiến</th><th>Nguyên nhân hẹn Online</th><th>Kết quả</th></tr></thead><tbody></tbody></table></div>';
  document.body.append(dialog);
  function draw() {
    const all = getRows(), rows = all.filter(canView), asOf = getAsOf(), notes = getNotes();
    dialog.querySelector('h3').textContent = 'HĐ tồn từ 7 ngày · ' + rows.length + ' HĐ';
    dialog.querySelector('[data-aged-scope]').textContent = 'Ngày theo dõi ' + day(asOf) + ' · Chưa Online tại ngày chốt, quá 7 ngày theo ngày tạo' + (rows.length !== all.length ? ' · Hiển thị ' + rows.length + '/' + all.length + ' HĐ theo quyền tài khoản' : '');
    dialog.querySelector('tbody').innerHTML = rows.map(row => {
      const note = notes[row.id] || {}, age = Math.round((Date.parse(asOf+'T12:00:00Z')-Date.parse(row.created+'T12:00:00Z'))/86400000);
      return '<tr data-aged-id="'+esc(row.id)+'"><td><b>'+esc(row.id)+'</b></td><td>'+esc(row.staff || '—')+'</td><td>'+esc(row.customer || '—')+'</td><td>'+esc(day(row.created))+'</td><td>'+age+'</td><td>'+esc(day(note.expected))+'</td><td>'+esc(note.action || note.reason || 'Chưa cập nhật')+'</td><td>'+esc(note.result || row.status || 'Chưa cập nhật')+'</td></tr>';
    }).join('') || '<tr><td colspan="8">Không có hợp đồng phù hợp trong phạm vi tài khoản.</td></tr>';
  }
  button.addEventListener('click', () => { draw(); dialog.showModal(); });
  dialog.querySelector('[data-aged-close]').addEventListener('click', () => dialog.close());
  return {refresh: () => { if (dialog.open) draw(); }};
}
