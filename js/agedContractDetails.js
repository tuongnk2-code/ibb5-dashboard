const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const day = value => value ? value.split('-').reverse().join('/') : '—';

export function installAgedContractDetails({button, getRows, getAsOf, getNotes, canView, id='agedContractDialog', getTitle=()=> 'HĐ tồn từ 7 ngày', getDescription=asOf=>'Ngày theo dõi '+day(asOf)+' · Chưa Online tại ngày chốt, quá 7 ngày theo ngày tạo', showOnline=false}) {
  const dialog = document.createElement('dialog');
  dialog.id = id; dialog.className = 'aged-contract-dialog';
  dialog.setAttribute('aria-labelledby',id+'Title');
  dialog.innerHTML = '<div class="aged-contract-head"><h3 id="agedContractTitle">HĐ tồn từ 7 ngày</h3><button type="button" data-aged-close>Đóng</button></div><p data-aged-scope></p><div class="tablewrap"><table><thead><tr><th>Mã HĐ</th><th>Nhân viên bán</th><th>Khách hàng</th><th>Ngày tạo</th><th>Số ngày tồn</th><th>Ngày Online dự kiến</th><th>Nguyên nhân hẹn Online</th><th>Kết quả</th></tr></thead><tbody></tbody></table></div>';
  document.body.append(dialog);
  if(showOnline){dialog.querySelectorAll('thead th')[4].textContent='Số ngày từ lúc tạo';const header=document.createElement('th');header.textContent='Ngày Online thực tế';dialog.querySelector('thead tr').insertBefore(header,dialog.querySelectorAll('thead th')[5]);}
  dialog.querySelector('h3').id=id+'Title';
  function pinColumns() {
    if (!dialog.open) return;
    const headers = [...dialog.querySelectorAll('thead th')];
    let left = 0;
    for (let index = 0; index < 3; index++) {
      const width = headers[index].getBoundingClientRect().width;
      for (const row of dialog.querySelectorAll('tr')) {
        const cell = row.cells[index]; if (!cell || cell.colSpan > 1) continue;
        cell.classList.add('aged-pinned');cell.classList.toggle('aged-pin-edge', index === 2);cell.style.left = left + 'px';
      }
      left += width;
    }
  }
  function draw() {
    const all = getRows(), rows = all.filter(canView), asOf = getAsOf(), notes = getNotes();
    dialog.querySelector('h3').textContent = getTitle() + ' · ' + rows.length + ' HĐ';
    dialog.querySelector('[data-aged-scope]').textContent = getDescription(asOf) + (rows.length !== all.length ? ' · Hiển thị ' + rows.length + '/' + all.length + ' HĐ theo quyền tài khoản' : '');
    dialog.querySelector('tbody').innerHTML = rows.map(row => {
      const note = notes[row.id] || {}, age = Math.round((Date.parse(asOf+'T12:00:00Z')-Date.parse(row.created+'T12:00:00Z'))/86400000);
      return '<tr data-aged-id="'+esc(row.id)+'"><td><b>'+esc(row.id)+'</b></td><td>'+esc(row.staff || '—')+'</td><td>'+esc(row.customer || '—')+'</td><td>'+esc(day(row.created))+'</td><td>'+(Number.isFinite(age)?age:'—')+'</td>'+(showOnline?'<td>'+esc(day(row.date))+'</td>':'')+'<td>'+esc(day(note.expected))+'</td><td>'+esc(note.action || note.reason || 'Chưa cập nhật')+'</td><td>'+esc(note.result || row.status || 'Chưa cập nhật')+'</td></tr>';
    }).join('') || '<tr><td colspan="'+(showOnline?9:8)+'">Không có hợp đồng phù hợp trong phạm vi tài khoản.</td></tr>';
    pinColumns();
  }
  function open() { draw(); dialog.showModal(); pinColumns(); }
  button?.addEventListener('click', open);
  new ResizeObserver(pinColumns).observe(dialog.querySelector('table'));
  dialog.querySelector('[data-aged-close]').addEventListener('click', () => dialog.close());
  return {open, refresh: () => { if (dialog.open) draw(); }};
}
