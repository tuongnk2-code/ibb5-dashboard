import { weeklyReport, weeklyPeriod } from './weeklyReportModel.js';
import { reportDay, shiftDay } from './dailyReportModel.js';
import { installAgedContractDetails } from './agedContractDetails.js';
import './weeklyReports.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value.split('-').reverse().join('/');
const signed=value=>(value>0?'+':'')+value;
const labels={sold:'NET bán mới',online:'NET Online',previous:'NET Online tuần trước',vvip:'V.VIP Online',camera:'Camera Online',pending:'HĐ tồn tại ngày chốt',aged:'HĐ tồn trên 7 ngày',overdue:'HĐ quá ngày hẹn Online',missing:'HĐ chưa có ngày hẹn'};
export function renderWeeklyReports(root,{getData,getNotes,canView}) {
  root.innerHTML=`<div class="wr-head"><div><div class="wr-eyebrow">IBB5 · GÓC NHÌN QUẢN LÝ</div><h2>Báo cáo tuần</h2><p data-week-scope></p></div><div class="wr-tools"><label>Ngày trong tuần<input data-week-date type="date" value="${reportDay()}"></label><label>Bầy<select data-week-team><option value="">Tất cả Bầy</option><option value="1">Bầy 1</option><option value="2">Bầy 2</option><option value="3">Bầy 3</option></select></label><button type="button" data-week-today>Tuần này</button><button type="button" data-week-export>↓ Xuất CSV</button></div></div><div class="wr-period-nav"><button type="button" data-week-move="-7">← Tuần trước</button><span data-week-range></span><button type="button" data-week-move="7">Tuần sau →</button></div><div class="wr-summary" data-week-summary></div><div class="wr-kpis" data-week-kpis></div><div class="wr-section"><div class="wr-section-head"><h3>01 · Nhân sự & kết quả</h3><span data-week-people></span></div><div class="wr-tablewrap"><table><thead><tr><th>Acc / Bầy</th><th>NET bán mới</th><th>NET Online</th><th>Online tuần trước</th><th>Tăng / giảm</th><th>V.VIP Online</th><th>Camera Online</th><th>HĐ tồn</th><th>Tồn &gt;7 ngày</th></tr></thead><tbody data-week-rows></tbody><tfoot data-week-total></tfoot></table></div></div><div class="wr-bottom"><section class="wr-section"><h3>02 · Diễn biến trong tuần</h3><p>Ngày tạo NET / Ngày Online thực tế · Gồm Chủ nhật</p><div data-week-days></div></section><section class="wr-section"><h3>03 · Việc cần ưu tiên</h3><div data-week-alerts></div></section></div><p class="wr-footnote">Tuần từ Thứ Hai đến Chủ nhật. So sánh cùng số ngày tuần trước. HĐ tồn tính tại cuối kỳ; số liệu theo nguồn hiện có và phạm vi tài khoản. Bấm số để xem danh sách.</p>`;
  const find=selector=>root.querySelector(selector),anchor=find('[data-week-date]'),team=find('[data-week-team]');
  let current,selection={kind:'online',acc:''};
  const details=installAgedContractDetails({id:'weeklyContractDialog',button:null,getRows:()=>current.groups[selection.kind].filter(row=>!selection.acc||String(row.staff||'').trim().toLowerCase()===(selection.acc==='__unassigned__'?'':selection.acc.trim().toLowerCase())),getAsOf:()=>selection.kind==='previous'?current.period.previousEnd:current.period.asOf,canView,getTitle:()=>labels[selection.kind]+(selection.acc?' · '+(selection.acc==='__unassigned__'?'Chưa gán Acc':selection.acc):''),getDescription:()=>selection.kind==='previous'?date(current.period.previousStart)+' – '+date(current.period.previousEnd):date(current.period.start)+' – '+date(current.period.future?current.period.end:current.period.asOf)});
  const number=(kind,value,acc='')=>`<button class="wr-number" type="button" data-week-kind="${kind}" data-week-acc="${esc(acc)}" aria-label="Xem ${esc(labels[kind])}${acc?' của '+esc(acc):''}: ${value} HĐ">${value}</button>`;
  function render(){
    current=weeklyReport(getData(),{anchor:anchor.value,team:team.value,canView,notes:getNotes()});
    const {period,groups,rows,hasPrevious}=current;
    find('[data-week-scope]').textContent='Kết quả kinh doanh · '+(team.value?'Bầy '+team.value:'Theo phạm vi tài khoản')+' · '+(period.future?'Tuần chưa bắt đầu':'Chốt '+date(period.asOf));
    find('[data-week-range]').textContent=date(period.start)+' – '+date(period.end);
    const ratio=hasPrevious&&groups.previous.length?Math.round(current.change/groups.previous.length*100):null;
    find('[data-week-summary]').innerHTML=`<div><small>NET ONLINE TRONG TUẦN</small><strong>${number('online',groups.online.length)} <span>HĐ</span></strong><p>${current.onlineStaff}/${current.staffCount} nhân sự có Online</p></div><div><small>SO VỚI CÙNG KỲ TUẦN TRƯỚC</small><strong class="${hasPrevious&&current.change<0?'wr-negative':''}">${hasPrevious?signed(current.change)+' HĐ':'—'}${ratio!==null?'<span> · '+signed(ratio)+'%</span>':''}</strong><p>${period.future?'Tuần chưa bắt đầu':hasPrevious?date(period.previousStart)+' – '+date(period.previousEnd)+' · '+groups.previous.length+' HĐ':'Chưa có dữ liệu Online trước kỳ này trong nguồn hiện có'}</p></div>`;
    find('[data-week-kpis]').innerHTML=['sold','vvip','camera','pending'].map(kind=>`<div class="wr-kpi"><small>${labels[kind]}</small><strong>${number(kind,groups[kind].length)}</strong></div>`).join('');
    const rowCells=person=>['sold','online','previous'].map(kind=>'<td>'+number(kind,person[kind],person.acc)+'</td>').join('')+`<td class="${hasPrevious&&person.change<0?'wr-negative':''}">${hasPrevious?signed(person.change)+' HĐ':'—'}</td>`+['vvip','camera','pending','aged'].map(kind=>'<td>'+number(kind,person[kind],person.acc)+'</td>').join('');
    find('[data-week-rows]').innerHTML=rows.map((person,index)=>{
      let html=`<tr><td><b>${esc(person.acc||'Chưa gán Acc')}</b><small>${person.team?'Bầy '+person.team:'Chưa phân Bầy'}</small></td>${rowCells({...person,acc:person.acc||'__unassigned__'})}</tr>`;
      if(rows[index+1]?.team!==person.team){const members=rows.filter(row=>row.team===person.team),sum=Object.fromEntries(Object.keys(groups).map(key=>[key,members.reduce((total,row)=>total+row[key],0)]));html+=`<tr class="wr-team-total"><td>TỔNG ${person.team?'BẦY '+person.team:'CHƯA PHÂN BẦY'}</td>`+['sold','online','previous'].map(key=>'<td>'+sum[key]+'</td>').join('')+`<td>${hasPrevious?signed(sum.online-sum.previous)+' HĐ':'—'}</td>`+['vvip','camera','pending','aged'].map(key=>'<td>'+sum[key]+'</td>').join('')+'</tr>';}
      return html;
    }).join('')||'<tr><td colspan="9">Không có nhân sự trong phạm vi đang chọn.</td></tr>';
    find('[data-week-total]').innerHTML=`<tr><th>TỔNG · ${rows.length} NS</th>${rowCells({...Object.fromEntries(Object.entries(groups).map(([key,value])=>[key,value.length])),change:current.change})}</tr>`;
    find('[data-week-people]').textContent='Tăng/giảm = NET Online tuần này − cùng kỳ tuần trước';
    const maximum=Math.max(1,...current.days.map(day=>Math.max(day.sold,day.online)));
    find('[data-week-days]').innerHTML=current.days.map((day,i)=>`<div class="wr-day"><b>${i===6?'CN':'T'+(i+2)}<small>${date(day.date).slice(0,5)}</small></b><div><div class="wr-day-bar wr-sold" style="width:${day.sold/maximum*100}%"></div><div class="wr-day-bar wr-online" style="width:${day.online/maximum*100}%"></div></div><span>${day.future?'Chưa đến':day.sold+' / '+day.online}</span></div>`).join('')+'<p>🟠 Bán mới / 🔵 Online</p>';
    find('[data-week-alerts]').innerHTML=['aged','overdue','missing'].map(kind=>`<div class="wr-alert"><span>${labels[kind]}</span>${number(kind,groups[kind].length)}</div>`).join('')+`<p>${rows.filter(row=>!row.online).length} nhân sự chưa có NET Online trong kỳ · ${hasPrevious?rows.filter(row=>row.change<0).length+' nhân sự giảm Online':'Chưa đủ dữ liệu so sánh trước kỳ'}</p><p>Ưu tiên rà soát ngày hẹn và nguyên nhân của các HĐ tồn. Các nhóm cảnh báo có thể trùng hợp đồng.</p>`;
    details.refresh();
  }
  anchor.addEventListener('change',render);team.addEventListener('change',render);
  find('[data-week-today]').onclick=()=>{anchor.value=reportDay();render();};
  root.addEventListener('click',event=>{const move=event.target.closest('[data-week-move]');if(move){anchor.value=shiftDay(weeklyPeriod(anchor.value).start,Number(move.dataset.weekMove));render();}const button=event.target.closest('[data-week-kind]');if(button){selection={kind:button.dataset.weekKind,acc:button.dataset.weekAcc};details.open();}});
  find('[data-week-export]').onclick=()=>{
    const table=[['Bao cao tuan',current.period.start,current.period.asOf],['Acc','Bay','NET ban moi','NET Online','Online tuan truoc','Tang/giam','VVIP Online','Camera Online','HD ton','Ton >7 ngay'],...current.rows.map(row=>[row.acc,row.team,row.sold,row.online,row.previous,current.hasPrevious?row.change:'',row.vvip,row.camera,row.pending,row.aged])];
    const blob=new Blob(['\ufeff'+table.map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='bao_cao_tuan_'+current.period.start+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  find('.wr-footnote').textContent+=' Tình trạng hủy và ngày hẹn dùng cập nhật mới nhất đã lưu.';
  document.addEventListener('ibb5-shared-updated',()=>queueMicrotask(render));
  document.addEventListener('ibb5-snapshot-updated',()=>queueMicrotask(render));
  render();
}
