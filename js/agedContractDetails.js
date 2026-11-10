const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const day = value => value ? value.split('-').reverse().join('/') : '—';

export function installAgedContractDetails({button, getRows, getAsOf, canView, id='agedContractDialog', getTitle=()=> 'HĐ tồn từ 7 ngày', getDescription=asOf=>'Ngày theo dõi '+day(asOf)+' · Chưa Online tại ngày chốt, quá 7 ngày theo ngày tạo'}) {
  const dialog = document.createElement('dialog');
  dialog.id = id; dialog.className = 'aged-contract-dialog';
  dialog.setAttribute('aria-labelledby',id+'Title');
  dialog.innerHTML = '<div class="aged-contract-head"><h3>Danh sách hợp đồng</h3><button type="button" data-aged-close>Đóng</button></div><p data-aged-scope></p><div class="tablewrap"><table><thead><tr><th>Mã HĐ</th><th>Acc</th><th>Khách hàng</th><th>Ngày tạo</th><th>Ngày Online thực tế</th></tr></thead><tbody></tbody></table></div>';
  document.body.append(dialog);
  dialog.querySelector('h3').id=id+'Title';
  const table=dialog.querySelector('table'),scroll=dialog.querySelector('.tablewrap'),columns=document.createElement('colgroup');
  table.prepend(columns);let layoutKey='';
  function sizeMobileColumns() {
    const headers=[...dialog.querySelectorAll('thead th')].filter(header=>!header.hidden),mobile=window.innerWidth<=600;
    const key=mobile?scroll.clientWidth+':'+headers.map(header=>header.textContent).join('|'):'desktop';
    if(layoutKey===key)return;layoutKey=key;
    table.classList.toggle('aged-mobile-table',mobile);
    if(!mobile){columns.replaceChildren();table.style.removeProperty('width');return;}
    const width=scroll.clientWidth;
    const sizes=headers.map((header,index)=>index<3?Math.round(width*[.18,.22,.26][index]):Math.floor(width*.32));
    columns.replaceChildren(...sizes.map(size=>{const col=document.createElement('col');col.style.width=size+'px';return col;}));
    table.style.width=sizes.reduce((total,size)=>total+size,0)+'px';
  }
  function pinColumns() {
    if (!dialog.open) return;
    sizeMobileColumns();
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
    const all = getRows(), rows = all.filter(canView), asOf = getAsOf();
    dialog.querySelector('h3').textContent = getTitle() + ' · ' + rows.length + ' HĐ';
    dialog.querySelector('[data-aged-scope]').textContent = getDescription(asOf) + (rows.length !== all.length ? ' · Hiển thị ' + rows.length + '/' + all.length + ' HĐ theo quyền tài khoản' : '');
    dialog.querySelector('tbody').innerHTML = rows.map(row =>
      '<tr data-aged-id="'+esc(row.id)+'"><td><b>'+esc(row.id)+'</b></td><td>'+esc(row.staff || '—')+'</td><td>'+esc(row.customer || '—')+'</td><td>'+esc(day(row.created))+'</td><td>'+esc(day(row.date))+'</td></tr>'
    ).join('') || '<tr><td colspan="5">Không có hợp đồng phù hợp trong phạm vi tài khoản.</td></tr>';
    pinColumns();
  }
  function open() { draw(); dialog.showModal();document.body.classList.add('contract-details-open'); pinColumns(); }
  button?.addEventListener('click', open);
  const resize=new ResizeObserver(pinColumns);resize.observe(table);resize.observe(scroll);
  dialog.addEventListener('close',()=>{if(!document.querySelector('.aged-contract-dialog[open]'))document.body.classList.remove('contract-details-open');});
  dialog.querySelector('[data-aged-close]').addEventListener('click', () => dialog.close());
  return {open, refresh: () => { if (dialog.open) draw(); }};
}
