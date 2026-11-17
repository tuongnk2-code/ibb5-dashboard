import { remainingOnlineSchedule } from './remainingScheduleModel.js';
import { reportDay } from './dailyReportModel.js';
import { installAgedContractDetails } from './agedContractDetails.js';
import './remainingSchedule.css';
const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const date=day=>day.split('-').reverse().join('/');
export function installRemainingSchedule({after,getData,getNotes,canView}){
 if(!after||document.getElementById('remainingOnlineSchedule'))return;
 const root=document.createElement('section');root.id='remainingOnlineSchedule';root.className='pending-box remaining-calendar';
 root.innerHTML=`<div class="rc-heading"><div><h3>Lịch Online dự kiến các ngày còn lại của tháng</h3><p class="rc-summary" role="status"></p></div><div class="rc-filters"><label>Bầy<select aria-label="Bầy trong lịch các ngày tới"><option value="">Tất cả Bầy</option><option value="1">Bầy 1</option><option value="2">Bầy 2</option><option value="3">Bầy 3</option><option value="0">Chưa gán bầy</option></select></label><label>Tìm nhân sự<input type="search" placeholder="Tên hoặc mã Acc…" aria-label="Tìm nhân sự trong lịch các ngày tới"></label><label class="rc-only-scheduled"><input type="checkbox" data-rc-only-scheduled checked>Chỉ NS có lịch</label><button type="button" data-rc-reset>Bỏ lọc</button></div></div><div class="tablewrap rc-scroll"><table class="rc-table"><thead></thead><tbody></tbody><tfoot></tfoot></table></div><p class="rc-note">Bấm số để xem mã HĐ và khách hàng. Lịch hẹn đã lưu, từ ngày sau ngày chốt đến cuối tháng; không phải kết quả Online thực tế. Chỉ tính NET còn chờ Online; loại Hủy, Dự kiến hủy, TP duyệt hủy và chấm dứt từ nguồn NET. Cột Tổng kỳ tính cho toàn bộ khoảng ngày đang xem.</p>`;
 after.after(root);let current,selection=null,queued=false;
 const $=selector=>root.querySelector(selector),team=$('select'),query=$('input[type="search"]'),onlyScheduled=$('[data-rc-only-scheduled]'),scroll=$('.rc-scroll');
 const selectedRows=()=>{if(!current||!selection)return [];return current.rows.filter(row=>(!selection.accs||selection.accs.some(acc=>String(acc).trim().toLowerCase()===String(row.staff||'Chưa gán Acc').trim().toLowerCase()))&&(!selection.day||row.expected===selection.day));};
 const details=installAgedContractDetails({button:null,id:'remainingScheduleDialog',showAppointment:true,getRows:selectedRows,getAsOf:()=>document.getElementById('pendAsOf').value||reportDay(),canView,getTitle:()=>selection?.title||'HĐ Online dự kiến',getDescription:()=>selection?.day?'Ngày hẹn Online dự kiến '+date(selection.day):'Ngày hẹn Online dự kiến từ '+date(current.start)+' đến '+date(current.end)});
 function count(rows,attributes,title){return rows.length?'<button type="button" class="rc-count" '+attributes+' aria-label="'+esc(title+' · '+rows.length+' HĐ')+'" title="'+esc(rows.slice(0,5).map(row=>row.id).join(', ')+(rows.length>5?'…':'')+' · Bấm để xem danh sách')+'">'+rows.length+'</button>':'<span class="rc-zero">—</span>';}
 function render(){
  current=remainingOnlineSchedule(getData(),{cutoff:document.getElementById('pendAsOf').value||reportDay(),notes:getNotes(),canView,team:team.value,query:query.value.trim()});
  const {days,groups}=current;
  $('.rc-summary').textContent=days.length?date(current.start)+' – '+date(current.end)+' · '+current.total+' HĐ đã có lịch hẹn · '+(team.value?'Bầy '+team.value:'Toàn phòng'):'Tháng đang chọn không còn ngày sau ngày chốt. Anh chọn lại ngày chốt để xem lịch.';
  const styles=getComputedStyle(root),width=root.clientWidth-parseFloat(styles.paddingLeft||0)-parseFloat(styles.paddingRight||0),fixed=window.innerWidth<=600?173:221;
  const capacity=Math.max(1,Math.floor(((width>0?width:window.innerWidth-60)-fixed)/44));
  const chunks=[];for(let i=0;i<days.length;i+=capacity)chunks.push(days.slice(i,i+capacity));if(!chunks.length)chunks.push([]);
  scroll.innerHTML=chunks.map(visibleDays=>{
  const head='<tr><th scope="col">Nhân sự / Bầy</th><th scope="col" title="Tổng lịch hẹn cả kỳ đang chọn">Tổng kỳ</th>'+visibleDays.map(day=>'<th scope="col" data-rc-col-day="'+day+'" title="'+date(day)+'">'+date(day).slice(0,5)+'</th>').join('')+'</tr>';
  let html='';
  for(const group of groups){
   if(onlyScheduled.checked&&!group.total)continue;
   for(const person of group.people.filter(person=>!onlyScheduled.checked||person.rows.length)){
    const attrs='data-rc-acc="'+esc(person.acc)+'"';
    html+='<tr data-rc-person="'+esc(person.acc)+'"><th scope="row" title="'+esc(person.name||person.acc)+'">'+esc(person.acc)+'</th><td>'+count(person.rows,attrs,'Tổng lịch hẹn '+person.acc)+'</td>'+visibleDays.map(day=>'<td>'+count(person.rows.filter(row=>row.expected===day),attrs+' data-rc-day="'+day+'"',person.acc+' · '+date(day))+'</td>').join('')+'</tr>';
   }
   html+='<tr class="rc-team"><th scope="row">'+(group.team?'TỔNG BẦY '+group.team:'CHƯA GÁN BẦY')+'</th><td>'+count(group.rows,'data-rc-team="'+group.team+'"','Tổng lịch hẹn bầy '+group.team)+'</td>'+visibleDays.map(day=>'<td>'+count(group.rows.filter(row=>row.expected===day),'data-rc-team="'+group.team+'" data-rc-day="'+day+'"','Bầy '+group.team+' · '+date(day))+'</td>').join('')+'</tr>';
  }
  const body=days.length?(html||'<tr><td colspan="'+(visibleDays.length+2)+'">'+(onlyScheduled.checked?'Chưa có lịch hẹn trong phạm vi đang lọc.':'Không có nhân sự trong phạm vi đang lọc.')+'</td></tr>'):'<tr><td colspan="2">Không có ngày còn lại trong tháng.</td></tr>';
  const foot='<tr><th scope="row">TỔNG PHÒNG</th><td>'+count(current.rows,'data-rc-all','Tổng lịch hẹn trong phạm vi đang lọc')+'</td>'+visibleDays.map(day=>'<td>'+count(current.rows.filter(row=>row.expected===day),'data-rc-day="'+day+'"','Tổng lịch hẹn '+date(day))+'</td>').join('')+'</tr>';
  return '<div class="rc-block">'+(chunks.length>1&&visibleDays.length?'<h4>'+(visibleDays.length===1?date(visibleDays[0]):date(visibleDays[0])+' – '+date(visibleDays.at(-1)))+'</h4>':'')+'<table class="rc-table"><thead>'+head+'</thead><tbody>'+body+'</tbody><tfoot>'+foot+'</tfoot></table></div>';
  }).join('');details.refresh();
 }
 root.addEventListener('click',event=>{
  const button=event.target.closest('.rc-count');if(!button)return;
  const group=button.dataset.rcTeam!==undefined?current.groups.find(group=>String(group.team)===button.dataset.rcTeam):null;
  selection={accs:button.dataset.rcAcc?[button.dataset.rcAcc]:group?.people.map(person=>person.acc),day:button.dataset.rcDay||'',title:button.dataset.rcAcc?'Lịch Online dự kiến · '+button.dataset.rcAcc:group?'Lịch Online dự kiến · Bầy '+group.team:'Lịch Online dự kiến · Trong phạm vi đang lọc'};
  details.open();
 });
 const queue=()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;render();});};
 team.addEventListener('change',render);query.addEventListener('input',render);onlyScheduled.addEventListener('change',render);$('[data-rc-reset]').onclick=()=>{team.value='';query.value='';onlyScheduled.checked=true;render();};
 document.getElementById('pendAsOf').addEventListener('change',queue);
 for(const event of ['ibb5-shared-updated','ibb5-snapshot-updated','ibb5-role-change'])document.addEventListener(event,queue);
 let lastWidth=0;new ResizeObserver(()=>{const width=Math.round(root.getBoundingClientRect().width);if(width>0&&width!==lastWidth){lastWidth=width;queue();}}).observe(root);
 window.addEventListener('storage',queue);render();
}
