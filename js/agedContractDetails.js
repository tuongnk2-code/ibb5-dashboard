const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const day = value => value ? value.split('-').reverse().join('/') : '—';

export function installAgedContractDetails({button, getRows, getAsOf, getNotes, canView, id='agedContractDialog', getTitle=()=> 'HĐ tồn từ 7 ngày', getDescription=asOf=>'Ngày theo dõi '+day(asOf)+' · Chưa Online tại ngày chốt, quá 7 ngày theo ngày tạo', showOnline=false, sourceOnly=()=>false, getSourceLabel=()=>'', hideFollowup=()=>false}) {
  const dialog = document.createElement('dialog');
  dialog.id = id; dialog.className = 'aged-contract-dialog';
  dialog.setAttribute('aria-labelledby',id+'Title');
  dialog.innerHTML = '<div class="aged-contract-head"><h3 id="agedContractTitle">HĐ tồn từ 7 ngày</h3><button type="button" data-aged-close>Đóng</button></div><p data-aged-scope></p><div class="tablewrap"><table><thead><tr><th>Mã HĐ</th><th>Nhân viên bán</th><th>Khách hàng</th><th>Ngày tạo</th><th>Số ngày tồn</th><th>Ngày Online dự kiến</th><th>Nguyên nhân hẹn Online</th><th>Kết quả</th></tr></thead><tbody></tbody></table></div>';
  document.body.append(dialog);
  if(showOnline){
    dialog.querySelectorAll('thead th')[4].textContent='Số ngày từ lúc tạo';
    const row=dialog.querySelector('thead tr'),before=row.cells[5];
    for(const text of ['Ngày Online thực tế','Trạng thái Online theo nguồn']){const header=document.createElement('th');header.textContent=text;row.insertBefore(header,before);}
    row.cells[row.cells.length-1].textContent='Kết quả NV cập nhật (HĐ tồn)';
  }
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
    const all = getRows(), rows = all.filter(canView), asOf = getAsOf(), fileOnly=sourceOnly(), hideNotes=hideFollowup(), notes = fileOnly || hideNotes ? {} : getNotes();
    if(showOnline){const headers=dialog.querySelectorAll('thead th');headers[7].hidden=fileOnly||hideNotes;headers[8].hidden=fileOnly||hideNotes;headers[9].hidden=hideNotes&&!fileOnly;headers[9].textContent=fileOnly?'Tình trạng trong file '+getSourceLabel():'Kết quả NV cập nhật (HĐ tồn)';}
    dialog.querySelector('h3').textContent = getTitle() + ' · ' + rows.length + ' HĐ';
    dialog.querySelector('[data-aged-scope]').textContent = getDescription(asOf) + (rows.length !== all.length ? ' · Hiển thị ' + rows.length + '/' + all.length + ' HĐ theo quyền tài khoản' : '');
    dialog.querySelector('tbody').innerHTML = rows.map(row => {
      const note = notes[row.id] || {}, age = Math.round((Date.parse(asOf+'T12:00:00Z')-Date.parse(row.created+'T12:00:00Z'))/86400000);
      const isOnline=validDay(row.date)&&row.date<=asOf;
      const mismatch=isOnline&&note.result&&String(note.result).trim().toLocaleLowerCase('vi-VN')!=='đã online';
      const result=fileOnly?(row.status||'Chưa có tình trạng trong file'):showOnline?(note.result||'Chưa cập nhật'):(note.result||row.status||'Chưa cập nhật');
      return '<tr data-aged-id="'+esc(row.id)+'"><td><b>'+esc(row.id)+'</b></td><td>'+esc(row.staff || '—')+'</td><td>'+esc(row.customer || '—')+'</td><td>'+esc(day(row.created))+'</td><td>'+(Number.isFinite(age)?age:'—')+'</td>'+(showOnline?'<td>'+esc(day(row.date))+'</td><td class="aged-source-status '+(isOnline?'is-online':'is-pending')+'">'+(isOnline?'Đã Online':'Chưa Online tại ngày chốt')+'</td>':'')+'<td'+(fileOnly||hideNotes?' hidden':'')+'>'+esc(day(note.expected))+'</td><td'+(fileOnly||hideNotes?' hidden':'')+'>'+esc(note.action || note.reason || 'Chưa cập nhật')+'</td><td'+(hideNotes&&!fileOnly?' hidden':'')+'>'+esc(result)+(showOnline&&mismatch?'<small class="aged-source-mismatch">Khác dữ liệu Online nguồn</small>':'')+'</td></tr>';
    }).join('') || '<tr><td colspan="'+(showOnline?(fileOnly?8:hideNotes?7:10):8)+'">Không có hợp đồng phù hợp trong phạm vi tài khoản.</td></tr>';
    pinColumns();
  }
  function open() { draw(); dialog.showModal();document.body.classList.add('contract-details-open'); pinColumns(); }
  button?.addEventListener('click', open);
  const resize=new ResizeObserver(pinColumns);resize.observe(table);resize.observe(scroll);
  dialog.addEventListener('close',()=>{if(!document.querySelector('.aged-contract-dialog[open]'))document.body.classList.remove('contract-details-open');});
  dialog.querySelector('[data-aged-close]').addEventListener('click', () => dialog.close());
  return {open, refresh: () => { if (dialog.open) draw(); }};
}
import { validDay } from './dailyReportModel.js';
