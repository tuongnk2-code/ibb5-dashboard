import { fetchDashboardData } from './api.js';
import './responsive.js';
import './performanceView.js';
import { STAFF_ROSTER } from './staffRoster.js';
import { managedShare } from './managedKpi.js';
import { dailyPace } from './dailyPace.js';
import { periodGrowth } from './periodGrowth.js';
import { reportDay } from './dailyReportModel.js';
import { onlineCameraContracts, netWithOnlineCamera } from './cameraKpi.js';
import { prepaidShare } from './prepaidKpi.js';
import { overdueContracts, yearlyStaffChannels } from './analyticsDetails.js';

const formatPercent = value => Number.isFinite(value) ? value.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + '%' : '—';

const { mockDATA, mockIBB_NET_META, mockIBB_CAM_META, mockIBB_TV_META, mockNET_LATEST, CONTACT_DATA } = await fetchDashboardData();


// ---- Original script 1  ----

(function(){if(window.IBB5_SHARED_STATE)return;try{const s=localStorage.getItem('ibb5_three_source_snapshot_v1');if(s){const v=JSON.parse(s);if(Array.isArray(v.data)&&v.data.length)window.IBB5_IMPORTED_DATA=v.data;window.IBB5_IMPORT_META=v.meta||{};}}catch(e){console.warn('Không đọc được bản dữ liệu lưu cục bộ',e)}})();


// ---- Original script 2  ----
const DATA=window.IBB5_IMPORTED_DATA||mockDATA;
const IBB_NET_META=mockIBB_NET_META;
const IBB_CAM_META=mockIBB_CAM_META;
const IBB_TV_META=mockIBB_TV_META;
DATA.forEach(x=>{if(window.IBB5_IMPORTED_DATA)return; if(x.type==='Internet'){const v=IBB_NET_META[x.id];if(v){x.created=v.created||x.created;x.date=v.date||'';x.staff=v.staff||x.staff;x.customer=v.customer||x.customer;x.prepaid=v.prepaid;x.sourceExcel=v.source||'';}}else if(x.type==='Camera'){const v=IBB_CAM_META[x.id];if(v){x.date=v.date||'';x.created=v.created||x.created;}}else if(x.type==='Truyền hình'){const v=IBB_TV_META[x.id];if(v)x.date=v.date||'';}});
const IBB_CALC={
 calendarDays:(a,b)=>!a||!b||a>b?0:Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000)+1,
 next:d=>{const t=new Date(d+'T12:00:00');t.setDate(t.getDate()+1);return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');},
 monthEnd:m=>{const y=+m.slice(0,4),mo=+m.slice(5);return m+'-'+String(new Date(y,mo,0).getDate()).padStart(2,'0');},
 prior:(m,day)=>{let t=new Date(m+'-01T12:00:00');t.setMonth(t.getMonth()-1);const pm=t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0');return pm+'-'+String(Math.min(day,new Date(t.getFullYear(),t.getMonth()+1,0).getDate())).padStart(2,'0');},
 unique:arr=>new Set(arr.map(x=>x.id)).size,
 pending:(x,d)=>x.created&&x.created<=d&&(!x.date||x.date>d),
 validPrev:(rows,pm)=>rows.some(x=>x.date&&x.date.slice(0,7)===pm),
 notes:()=>{if(window.IBB5_PENDING_NOTES)return window.IBB5_PENDING_NOTES;try{return JSON.parse(localStorage.getItem('ibb5_pending_followup_v1')||'{}')}catch(e){return {}}},
 source:x=>IBB_CALC.notes()[x.id]?.source||x.sourceExcel||'',
 camOnline:(rows,asof)=>netWithOnlineCamera(rows,DATA,asof),
};
const $=id=>document.getElementById(id);const colors=['#1684e6','#f47b20','#21b58b'],types=['Internet','Camera','Truyền hình'];let filtered=[],page=0;const fmt=n=>n.toLocaleString('vi-VN',{maximumFractionDigits:0});const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const count=(a,k)=>a.filter(x=>x.type===k).length;const online=x=>!!x.date;const day=x=>x.date||x.created;const rooms=[...new Set(DATA.map(x=>x.room).filter(Boolean))].sort();rooms.forEach(r=>$('room').insertAdjacentHTML('beforeend','<option>'+esc(r)+'</option>'));const dates=DATA.map(day).filter(Boolean).sort();$('from').value=reportDay().slice(0,7)+'-01';$('to').value=reportDay();function base(){return DATA.filter(x=>(!$('from').value||day(x)>=$('from').value)&&(!$('to').value||day(x)<=$('to').value)&&(!$('room').value||x.room===$('room').value))}function update(){
 filtered=base();page=0;
 const month=($('to').value||reportDay()).slice(0,7),asOf=$('to').value||month+'-30',start=month+'-01',last=IBB_CALC.monthEnd(month),room=$('room').value;
 const netRows=DATA.filter(x=>x.type==='Internet'&&(!room||x.room===room));const onlineRows=netRows.filter(x=>x.id&&/^[A-Z0-9]+$/.test(x.id)&&typeof x.date==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x.date)&&x.date>=start&&x.date<=asOf);
 const totalOnline=IBB_CALC.unique(onlineRows),target=getCommit(month,room||'__ALL__').manager;
 const staffCount=new Set(PERSONNEL.filter(person=>!room||person.room===room).map(person=>person.acc.trim().toLowerCase())).size;
 $('staffProductivity').textContent=staffCount?fmt(totalOnline/staffCount):'—';$('staffProductivity').setAttribute('aria-label',$('staffProductivity').textContent+' HĐ/NS');
 $('staffProductivityNote').textContent=staffCount?fmt(totalOnline)+' HĐ NET Online / '+staffCount+' nhân sự · Gồm cả NS chưa có Online':'Chưa có danh sách nhân sự của phòng đang chọn';
 const elapsed=IBB_CALC.calendarDays(start,asOf),remaining=IBB_CALC.calendarDays(IBB_CALC.next(asOf),last),allDays=elapsed+remaining;
 // Cửa sổ 7 ngày lịch gần nhất (bao gồm ngày chốt), tính cả Chủ nhật.
 const windowDate=new Date(asOf+'T12:00:00');windowDate.setDate(windowDate.getDate()-6);
 const windowStart=windowDate.getFullYear()+'-'+String(windowDate.getMonth()+1).padStart(2,'0')+'-'+String(windowDate.getDate()).padStart(2,'0');
 const calendarDays7=IBB_CALC.calendarDays(windowStart,asOf);
 const online7=IBB_CALC.unique(netRows.filter(x=>x.date&&x.date>=windowStart&&x.date<=asOf));
 const pace7=calendarDays7?online7/calendarDays7:null;
 const pace=elapsed?totalOnline/elapsed:null,forecast=pace7===null?null:totalOnline+Math.round(pace7*remaining),gap=target===null?null:Math.max(0,target-totalOnline);
 const show=n=>n===null?'—':fmt(n);const number=n=>n===null?'—':fmt(n);
 $('online').textContent=fmt(totalOnline);$('online').title='Mã HĐ NET duy nhất có Ngày Online từ '+start+' đến '+asOf+'; nguồn NET được nhập mới nhất có ưu tiên tuyệt đối.';$('target').textContent=target===null?'Chưa ký cam kết':fmt(target);
 $('rate').textContent=target===null?'Chưa có target đã ký':target===0?'Mục tiêu bằng 0':formatPercent(totalOnline/target*100)+' mục tiêu';$('targetBar').style.width=target>0?Math.min(100,totalOnline/target*100)+'%':'0%';
 $('forecast').textContent=forecast===null?'—':fmt(forecast)+' HĐ';$('forecastNote').textContent=target===null?'Chưa có cam kết để đối chiếu':forecast===null?'Chưa có ngày lịch':forecast<target?'Dự kiến thiếu '+fmt(target-forecast)+' HĐ':'Dự kiến đạt/vượt '+fmt(forecast-target)+' HĐ';$('forecastBar').style.width=target>0&&forecast!==null?Math.min(100,forecast/target*100)+'%':'0%';
 $('forecastRatio').textContent=target===null?'Tỷ lệ dự phóng: chưa ký cam kết':target===0?'Cam kết tháng bằng 0 — không tính tỷ lệ':forecast===null?'—':('Dự phóng đạt '+formatPercent(forecast/target*100)+' / '+fmt(target)+' HĐ cam kết');
 $('forecastPace7').textContent='Pace 7 ngày ('+windowStart.split('-').reverse().join('/')+' – '+asOf.split('-').reverse().join('/')+'): '+fmt(online7)+' HĐ / '+calendarDays7+' ngày lịch = '+show(pace7)+' HĐ/ngày · còn '+remaining+' ngày';
 const pend=netRows.filter(x=>IBB_CALC.pending(x,asOf));$('pending').textContent=fmt(IBB_CALC.unique(pend));$('aged').textContent=fmt(IBB_CALC.unique(pend.filter(x=>(Date.parse(asOf+'T12:00:00')-Date.parse(x.created+'T12:00:00'))/86400000>7)));
 const tvOnline=DATA.filter(x=>x.type==='Truyền hình'&&(!room||x.room===room)&&x.id&&/^[A-Z0-9]+$/.test(x.id)&&/^\d{4}-\d{2}-\d{2}$/.test(x.date||'')&&x.date>=start&&x.date<=asOf);
 const tvVvipOnline=tvOnline.filter(x=>x.vvip===true||(x.vvip==null&&IBB_TV_META[x.id]?.vvip===true));
 const vvipCount=IBB_CALC.unique(tvVvipOnline);
 const payCount=IBB_CALC.unique(tvOnline);
 $('vvip').textContent=fmt(vvipCount);$('vvip').title='V.VIP: '+vvipCount+' mã HĐ duy nhất; gói ở cột H, Ngày Online ở cột P của nguồn Truyền hình mới nhất.';
 const prepaid=prepaidShare(onlineRows),p=prepaid.count;
 const cameraOnline=IBB_CALC.camOnline(onlineRows,asOf);
 $('cameraKpi').textContent=fmt(onlineCameraContracts(DATA,start,asOf,room).length);$('cameraKpi').title='Mã HĐ Camera duy nhất có Ngày Online từ '+start+' đến '+asOf+'; nguồn Camera mới nhất, không yêu cầu NET Online cùng tháng.';
 $('gap').textContent=number(gap);$('pace').textContent=show(pace7);$('pnRate').textContent=totalOnline?(formatPercent(payCount/totalOnline*100)):'—';$('pnRate').title=fmt(payCount)+' HĐ Pay Online / '+fmt(totalOnline)+' HĐ NET Online';
 const managed=managedShare(onlineRows);$('managed').textContent=managed.percent===null?'—':formatPercent(managed.percent);$('managed').title=fmt(managed.count)+' / '+fmt(managed.total)+' HĐ NET Online · CNQL DNG_01 hoặc DNG_02 · từ '+start+' đến '+asOf;
 $('managedNote').textContent=fmt(managed.count)+' / '+fmt(managed.total)+' HĐ NET Online · CNQL DNG_01, DNG_02';
 const priorCut=IBB_CALC.prior(month,+asOf.slice(-2)),priorMonth=priorCut.slice(0,7),priorRows=netRows.filter(x=>x.date&&x.date.slice(0,7)===priorMonth);
 const previous=IBB_CALC.validPrev(netRows,priorMonth)?IBB_CALC.unique(priorRows.filter(x=>x.date<=priorCut)):null;
 $('growth').textContent=previous===null?'—':(previous===0?'—':formatPercent((totalOnline-previous)/previous*100));$('growth').title=previous===null?'Chưa có dữ liệu NET tháng trước':('Tháng trước cùng kỳ '+previous+' HĐ; tăng/giảm '+(totalOnline-previous)+' HĐ');
 const growthChange=previous===null?null:totalOnline-previous,priorRange=('01/'+priorMonth.slice(5))+'–'+priorCut.slice(8)+'/'+priorMonth.slice(5);
 $('growthNote').textContent=previous===null?'Chưa có dữ liệu NET tháng '+priorMonth+' để đối chiếu.':'Cùng kỳ '+priorRange+': '+fmt(previous)+' HĐ · '+(growthChange===0?'Không đổi':(growthChange>0?'Tăng ':'Giảm ')+fmt(Math.abs(growthChange))+' HĐ')+(previous===0?' · Chưa tính tỷ lệ vì kỳ trước bằng 0.':'');
 $('dailyTitle').textContent='Kết quả kinh doanh ngày '+asOf.split('-').reverse().join('/');const sold=IBB_CALC.unique(netRows.filter(x=>x.created===asOf)),today=IBB_CALC.unique(onlineRows.filter(x=>x.date===asOf)),paceDays=dailyPace(gap,asOf),dailyBenchmark=paceDays.pace,progress=dailyBenchmark===null?null:(dailyBenchmark===0?(target!==null&&totalOnline>=target?100:null):today/dailyBenchmark*100);
 $('soldToday').textContent=fmt(sold)+' HĐ';$('todayOnlineCount').textContent=fmt(today)+' HĐ';$('todayOnline').textContent=fmt(today)+' / '+(dailyBenchmark===null?'—':fmt(dailyBenchmark))+' HĐ';$('dailyProgress').textContent=progress===null?'—':formatPercent(progress);$('todayOnline').title='Pace = HĐ còn thiếu / số ngày còn lại trong tháng, gồm Chủ nhật. Còn '+paceDays.remaining+' ngày; mẫu số '+paceDays.days+' ngày.';$('dailyProgress').title=$('todayOnline').title;$('todayPaceDescription').textContent='Online NET / Pace (ngày còn lại, gồm CN)';$('dailyPaceDescription').textContent='Online ngày / Pace (ngày còn lại, gồm CN)';$('todayBar').style.width=(progress===null?0:Math.min(100,progress))+'%';$('dailyBar').style.width=(progress===null?0:Math.min(100,progress))+'%';
 // Additional display positions reuse the existing calculated values.
 const [paceActual,paceNeeded]=$('todayOnline').textContent.split(' / ');$('priorityOnlinePace').innerHTML='<span class="pace-actual">'+esc(paceActual)+'</span><span class="pace-needed"> / '+esc(paceNeeded)+'</span>';$('priorityOnlinePace').title=$('todayOnline').title;
 $('priorityPaceDescription').textContent=$('todayPaceDescription').textContent;$('priorityPaceBar').style.width=$('todayBar').style.width;
 $('paceEfficiency').textContent=$('pace').textContent;
 $('remainingDailyOnline').textContent=show(dailyBenchmark);$('remainingDailyOnline').title=$('todayOnline').title;
 $('remainingDailyOnlineNote').textContent=gap===null?'Chưa có target tháng đã ký':paceDays.days===0?'Tháng đã hết ngày còn lại':fmt(gap)+' HĐ / '+paceDays.days+' ngày còn lại, gồm Chủ nhật';
 $('rangeLabel').textContent='Tháng '+month+' · đến '+asOf+' · '+(room||'Toàn phòng')+' · Pace gồm Chủ nhật';
 let el=document.getElementById('ibbQualitySummary');if(el){el.querySelector('[data-k="prepaid"]').textContent=prepaid.percent===null?'—':formatPercent(prepaid.percent);el.querySelector('[data-k="prepaid"]').title=p+' / '+prepaid.total+' HĐ NET Online có CLBH từ 3T trở lên';el.querySelector('[data-k="camera"]').textContent=fmt(IBB_CALC.unique(cameraOnline))+' / '+fmt(totalOnline);el.querySelector('[data-k="coverage"]').textContent=totalOnline?formatPercent(cameraOnline.length/totalOnline*100):'—';}
 renderRooms();renderCharts();renderDetails();window.refreshCommitUI?.();if(typeof perfRender==='function')perfRender();}
function renderRooms(){let r=[...new Set(filtered.map(x=>x.room))].sort();$('roomRows').innerHTML=r.length?r.map(k=>{let a=filtered.filter(x=>x.room===k);return '<tr><td><b>'+esc(k||'Chưa phân loại')+'</b></td>'+types.map(t=>'<td class="num">'+fmt(count(a,t))+'</td>').join('')+'<td class="num"><b>'+fmt(a.length)+'</b></td><td class="num">'+fmt(a.filter(online).length)+'</td></tr>'}).join(''):'<tr><td colspan="6" class="empty">Không có dữ liệu</td></tr>'}function setup(id){let c=$(id),dpr=window.devicePixelRatio||1,w=c.clientWidth,h=c.clientHeight;c.width=w*dpr;c.height=h*dpr;let g=c.getContext('2d');g.scale(dpr,dpr);return {g,w,h}}function renderCharts(){if(!$("line")||!$("donut")||!$("mixlegend"))return;let {g,w,h}=setup('line');let a=filtered.filter(online),days=[...new Set(a.map(x=>x.date))].sort(),max=Math.max(1,...days.flatMap(d=>types.map(t=>a.filter(x=>x.date===d&&x.type===t).length)));let l=40,r=12,t=18,b=35;g.font='11px Segoe UI';g.strokeStyle='#e9eef4';g.fillStyle='#8b9bad';for(let i=0;i<=4;i++){let y=t+(h-t-b)*i/4;g.beginPath();g.moveTo(l,y);g.lineTo(w-r,y);g.stroke();g.fillText(String(Math.round(max*(4-i)/4)),6,y+4)}types.forEach((typ,j)=>{g.strokeStyle=colors[j];g.lineWidth=2.5;g.beginPath();days.forEach((d,i)=>{let v=a.filter(x=>x.date===d&&x.type===typ).length,x=l+(w-l-r)*(days.length===1?.5:i/(days.length-1)),y=t+(h-t-b)*(1-v/max);i?g.lineTo(x,y):g.moveTo(x,y)});g.stroke()});g.fillStyle='#8b9bad';days.forEach((d,i)=>{if(i%Math.max(1,Math.ceil(days.length/7))===0){let x=l+(w-l-r)*(days.length===1?.5:i/(days.length-1));g.fillText(d.slice(5),x-12,h-10)}});if(!days.length){g.fillText('Không có bản ghi Online trong khoảng lọc',l+15,h/2)}let d=setup('donut'),ctx=d.g,vals=types.map(t=>count(filtered,t)),sum=vals.reduce((a,b)=>a+b,0),cx=d.w/2,cy=d.h/2,R=Math.min(d.w,d.h)*.33,start=-Math.PI/2;vals.forEach((v,i)=>{if(!sum)return;ctx.beginPath();ctx.strokeStyle=colors[i];ctx.lineWidth=27;ctx.arc(cx,cy,R,start,start+2*Math.PI*v/sum);ctx.stroke();start+=2*Math.PI*v/sum});ctx.fillStyle='#20344a';ctx.textAlign='center';ctx.font='bold 28px Segoe UI';ctx.fillText(fmt(sum),cx,cy+5);ctx.font='12px Segoe UI';ctx.fillStyle='#91a0ae';ctx.fillText('Bản ghi',cx,cy+25);$('mixlegend').innerHTML=types.map((t,i)=>'<span><i class="dot" style="background:'+colors[i]+'"></i>'+t+': <b>'+fmt(vals[i])+'</b></span>').join('')}function detailBase(){let q=$('search').value.toLowerCase(),t=$('type').value;return filtered.filter(x=>(!t||x.type===t)&&(!q||[x.id,x.package,x.staff,x.room].some(v=>v.toLowerCase().includes(q))))}function renderDetails(){let a=detailBase(),pages=Math.max(1,Math.ceil(a.length/100));page=Math.min(Math.max(0,page),pages-1);$('page').textContent=(page+1)+' / '+pages+' · '+fmt(a.length)+' dòng';$('prev').disabled=page===0;$('next').disabled=page>=pages-1;$('detailRows').innerHTML=a.slice(page*100,page*100+100).map(x=>'<tr><td><b>'+esc(x.id)+'</b></td><td>'+esc(x.type)+'</td><td>'+esc(x.room)+'</td><td>'+esc(x.staff||'—')+'</td><td>'+esc(x.package)+'</td><td>'+esc(x.created||'—')+'</td><td>'+esc(x.date||'—')+'</td><td><span class="pill">'+esc(x.status||'Không rõ')+'</span></td></tr>').join('')||'<tr><td colspan="8" class="empty">Không có dữ liệu phù hợp</td></tr>'}['from','to','room'].forEach(id=>$(id).addEventListener('change',update));['type','search'].forEach(id=>$(id).addEventListener(id==='search'?'input':'change',()=>{page=0;renderDetails()}));$('prev').onclick=()=>{page--;renderDetails()};$('next').onclick=()=>{page++;renderDetails()};$('reset').onclick=()=>{$('from').value=dates[0]||'';$('to').value=dates.at(-1)||'';$('room').value='';$('type').value='';$('search').value='';update()};$('export').onclick=()=>{let cols=['id','type','room','staff','package','created','date','status'],csv='\ufeff'+cols.join(',')+'\r\n'+detailBase().map(x=>cols.map(k=>'"'+String(x[k]||'').replace(/"/g,'""')+'"').join(',')).join('\r\n');let url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='bao_cao_dashboard.csv';a.click();URL.revokeObjectURL(url)};window.addEventListener('resize',renderCharts);
const PERSONNEL=[{"name": "Nguyễn Thị Bích Hòa", "acc": "DNG.HoaNTB6", "room": "IBB5", "tenure": "13+ tháng", "team": "3", "role": "Trưởng Bầy"}, {"name": "Nguyễn Thị Thanh Hoa", "acc": "DNG.Hoantt", "room": "IBB5", "tenure": "13+ tháng", "team": "2", "role": ""}, {"name": "Ngô Hoài Nam", "acc": "DNG.Namnh170", "room": "IBB5", "tenure": "13+ tháng", "team": "2", "role": ""}, {"name": "Nguyễn Anh Tiến", "acc": "DNG.Tienna2", "room": "IBB5", "tenure": "13+ tháng", "team": "3", "role": ""}, {"name": "Phan Văn Vĩ", "acc": "DNG.Vypv", "room": "IBB5", "tenure": "13+ tháng", "team": "1", "role": "Trưởng Bầy"}, {"name": "Nguyễn Thành Nhân", "acc": "DNG.Nhannt137", "room": "IBB5", "tenure": "13+ tháng", "team": "2", "role": ""}, {"name": "Nguyễn Phước Trí", "acc": "DNG.TriNP", "room": "IBB5", "tenure": "7-12 tháng", "team": "1", "role": ""}, {"name": "Lê Thị Hoàng Oanh", "acc": "DNG.OanhLTH3", "room": "IBB5", "tenure": "13+ tháng", "team": "1", "role": ""}, {"name": "Hạ Minh Chương", "acc": "DNG.ChuongHM", "room": "IBB5", "tenure": "13+ tháng", "team": "1", "role": ""}, {"name": "Hồ Xuân Đạt", "acc": "DNG.DatHX4", "room": "IBB5", "tenure": "13+ tháng", "team": "1", "role": ""}, {"name": "Mai Hoàng Lân", "acc": "DNG.LanMH2", "room": "IBB5", "tenure": "13+ tháng", "team": "3", "role": ""}, {"name": "Lê Minh Mẫn", "acc": "DNG.ManLM3", "room": "IBB5", "tenure": "13+ tháng", "team": "3", "role": ""}, {"name": "Nguyễn Vũ Ngọc Hân", "acc": "DNG.HanNVN", "room": "IBB5", "tenure": "7-12 tháng", "team": "3", "role": ""}, {"name": "Lê Trần Doãn", "acc": "DNG.DoanLT4", "room": "IBB5", "tenure": "2 tháng", "team": "3", "role": ""}, {"name": "Trần Phước Nguyên", "acc": "DNG.NguyenTP10", "room": "IBB5", "tenure": "1 tháng", "team": "1", "role": ""}, {"name": "Nguyễn Đình Bách", "acc": "DNG.BachND7", "room": "IBB5", "tenure": "5 tháng", "team": "3", "role": ""}, {"name": "DNG.DatBTH", "acc": "DNG.DatBTH", "room": "IBB5", "tenure": "Chưa có", "team": "3", "role": ""}];
const COMMIT_KEY='fpt_ibb_monthly_commitments_v2';
let commitDB=window.IBB5_SHARED_STATE?.commitments||{};if(!window.IBB5_SHARED_STATE)try{commitDB=JSON.parse(localStorage.getItem(COMMIT_KEY)||'{}')||{}}catch(e){}
function getCommit(month,room){let r=commitDB[month]?.[room]||{};let staff={};for(const [acc,v] of Object.entries(r.staff||{})){if(v.status==='approved'&&Number.isInteger(v.value))staff[acc]=v.value}return {manager:r.manager?.status==='signed'?r.manager.value:null,staff}}
async function persist(action,options={}){try{if(window.IBB5_SYNC)commitDB=await window.IBB5_SYNC.commit({action,month:document.getElementById('ckMonth').value,room:'__ALL__',...options});else localStorage.setItem(COMMIT_KEY,JSON.stringify(commitDB));refreshCommitUI();perfRender();update();}catch(err){alert('Chưa lưu được cam kết: '+err.message)}}
function record(){let month=document.getElementById('ckMonth').value;commitDB[month]??={};commitDB[month].__ALL__??={manager:null,staff:{}};return commitDB[month].__ALL__}
function ckEscape(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function refreshCommitUI(){
 const m=document.getElementById('ckMonth');if(!m)return;
 const profile=window.IBB5_CURRENT_PROFILE;if(profile){document.getElementById('ckRole').value=profile.role==='manager'?'manager':'staff';document.getElementById('ckRole').disabled=true;if(profile.role!=='manager'){document.getElementById('ckActor').value=profile.acc||'';document.getElementById('ckActor').disabled=true;}document.getElementById('ckImport').disabled=profile.role!=='manager';}
 const r=record(),role=document.getElementById('ckRole').value,actor=document.getElementById('ckActor').value;
 let approved=0,waiting=0,sum=0;
 for(const p of PERSONNEL){const v=r.staff[p.acc];if(v?.status==='approved'){approved++;sum+=v.value}if(v?.status==='pending')waiting++}
 document.getElementById('ckRoomGoal').textContent=r.manager?.status==='signed'?r.manager.value+' HĐ':'Chưa ký';
 document.getElementById('ckApproved').textContent=sum+' HĐ';document.getElementById('ckWaiting').textContent=waiting+' đề xuất';
 document.getElementById('ckDifference').textContent=r.manager?.status==='signed'?(sum-r.manager.value)+' HĐ':'—';
 document.getElementById('ckManagerGoal').value=r.manager?.value??'';
 document.getElementById('ckManagerGoal').disabled=role!=='manager';document.getElementById('ckSign').disabled=role!=='manager';
 document.getElementById('ckCount').textContent=PERSONNEL.length;
 document.getElementById('ckRows').innerHTML=PERSONNEL.slice().sort((a,b)=>Number(a.team)-Number(b.team)).map(p=>{
  const v=r.staff[p.acc],canSubmit=role==='manager'||actor===p.acc,canApprove=role==='manager';
  const status=v?.status==='approved'?'Đã duyệt':v?.status==='pending'?'Chờ duyệt':v?.status==='rejected'?'Từ chối':'Chưa đăng ký';
  const goal=v?.value??'',approvedGoal=v?.status==='approved'?v.value+' HĐ':'—';
  return `<tr><td class="ck-person"><b>${ckEscape(p.name)}</b><small>${ckEscape(p.acc)}</small></td><td>Bầy ${p.team}</td><td class="ck-commit-val"><b>${approvedGoal}</b><small>${v?.status==='pending'?'Đề xuất: '+v.value:' '}</small></td><td><span class="ck-state ${v?.status||''}">${status}</span></td><td class="ck-plan">${ckEscape(v?.plan||'—')}</td><td><div class="ck-edit-grid"><label>Mục tiêu HĐ<input type="number" min="0" step="1" data-goal="${ckEscape(p.acc)}" value="${goal}" ${canSubmit?'':'disabled'}></label><label>Ghi chú / Kế hoạch<input type="text" data-plan="${ckEscape(p.acc)}" value="${ckEscape(v?.plan||'')}" placeholder="Kế hoạch / lý do sửa" ${canSubmit?'':'disabled'}></label><div class="ck-actions"><button class="primary" data-submit="${ckEscape(p.acc)}" ${canSubmit?'':'disabled'}>Lưu đề xuất</button>${canApprove&&v?.status==='pending'?`<button class="ck-approve" data-approve="${ckEscape(p.acc)}">Duyệt</button><button class="ck-reject" data-reject="${ckEscape(p.acc)}">Từ chối</button>`:''}${canApprove&&v?.status==='approved'?`<button class="ck-reject" data-revise="${ckEscape(p.acc)}">Yêu cầu điều chỉnh</button>`:''}</div></div></td></tr>`;
 }).join('');
 document.querySelectorAll('[data-submit]').forEach(b=>b.onclick=()=>{const acc=b.dataset.submit,v=document.querySelector('[data-goal="'+acc+'"]').value,plan=document.querySelector('[data-plan="'+acc+'"]').value;if(v.trim()===''||!Number.isInteger(+v)||+v<0)return alert('Nhập mục tiêu nguyên không âm');if(r.staff[acc]?.status==='approved'&&!confirm('Thay đổi mục tiêu đã duyệt sẽ chuyển về Chờ duyệt. Tiếp tục?'))return;if(!window.IBB5_SYNC)r.staff[acc]={value:+v,plan,status:'pending',submittedAt:new Date().toISOString()};persist('submit',{acc,value:+v,plan})});
 document.querySelectorAll('[data-approve]').forEach(b=>b.onclick=()=>{const v=r.staff[b.dataset.approve];if(v){if(!window.IBB5_SYNC){v.status='approved';v.reviewedAt=new Date().toISOString();}persist('approve',{acc:b.dataset.approve})}});
 document.querySelectorAll('[data-reject]').forEach(b=>b.onclick=()=>{const v=r.staff[b.dataset.reject];if(v){if(!window.IBB5_SYNC)v.status='rejected';persist('reject',{acc:b.dataset.reject})}});
 document.querySelectorAll('[data-revise]').forEach(b=>b.onclick=()=>{const v=r.staff[b.dataset.revise];if(v&&confirm('Yêu cầu nhân sự điều chỉnh cam kết đã duyệt?')){if(!window.IBB5_SYNC)v.status='rejected';persist('revise',{acc:b.dataset.revise})}});
}
window.refreshCommitUI=refreshCommitUI;
document.getElementById('ckActor').innerHTML=PERSONNEL.map(p=>`<option value="${ckEscape(p.acc)}">${ckEscape(p.name)} · ${ckEscape(p.acc)}</option>`).join('');document.getElementById('ckMonth').value=(document.getElementById('to').value||reportDay()).slice(0,7);
['ckMonth','ckRole','ckActor'].forEach(id=>document.getElementById(id).addEventListener('change',refreshCommitUI));document.getElementById('ckSign').onclick=()=>{let v=document.getElementById('ckManagerGoal').value;if(v.trim()===''||!Number.isInteger(+v)||+v<0)return alert('Nhập target nguyên không âm');let r=record();if(!confirm('Xác nhận ký target '+v+' HĐ cho tháng '+document.getElementById('ckMonth').value+'?'))return;if(!window.IBB5_SYNC)r.manager={value:+v,status:'signed',signedAt:new Date().toISOString()};persist('sign',{value:+v})};document.getElementById('ckExport').onclick=()=>{let a=document.createElement('a'),u=URL.createObjectURL(new Blob([JSON.stringify({version:2,commitments:commitDB},null,2)],{type:'application/json'}));a.href=u;a.download='cam_ket_thang_ibb5.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};document.getElementById('ckImport').onchange=async e=>{let f=e.target.files[0];if(!f)return;try{let x=JSON.parse(await f.text());if(x.version!==2||!x.commitments)throw Error('File không đúng định dạng');if(confirm('Thay thế dữ liệu cam kết hiện tại?')){if(window.IBB5_SYNC){for(const [month,rooms] of Object.entries(x.commitments))for(const [room,value] of Object.entries(rooms))commitDB=await window.IBB5_SYNC.commit({action:'import',month,room,value});refreshCommitUI();perfRender();update();}else{commitDB=x.commitments;await persist('import');}}}catch(err){alert(err.message)}e.target.value=''};refreshCommitUI();update();


// ---- Original script 3  ----
function perfRender(){
 const $=id=>document.getElementById(id);if(!$('perfRows'))return;
 const month=($('to').value||reportDay()).slice(0,7),asof=$('to').value||reportDay(),start=month+'-01',last=IBB_CALC.monthEnd(month),elapsed=IBB_CALC.calendarDays(start,asof),remaining=IBB_CALC.calendarDays(IBB_CALC.next(asof),last),allDays=elapsed+remaining,calendarRemaining=Number(last.slice(-2))-Number(asof.slice(-2));
 const team=$('perfTeam').value,q=$('perfSearch').value.toLowerCase(),room=$('room').value;
 const ORDER=['DNG.Vypv','DNG.OanhLTH3','DNG.ChuongHM','DNG.NguyenTP10','DNG.TriNP','DNG.DatHX4','DNG.Hoantt','DNG.Nhannt137','DNG.Namnh170','DNG.HoaNTB6','DNG.ManLM3','DNG.Tienna2','DNG.HanNVN','DNG.BachND7','DNG.DoanLT4','DNG.LanMH2','DNG.DatBTH'];
 const list=PERSONNEL.filter(p=>(!team||p.team===team)&&(!q||(p.name+' '+p.acc).toLowerCase().includes(q))).sort((a,b)=>ORDER.findIndex(x=>x.toLowerCase()===a.acc.toLowerCase())-ORDER.findIndex(x=>x.toLowerCase()===b.acc.toLowerCase()));
 const all=DATA.filter(x=>x.type==='Internet'&&(!room||x.room===room)),cm=getCommit(month,room||'__ALL__').staff,prevCut=IBB_CALC.prior(month,+asof.slice(-2)),pm=prevCut.slice(0,7),havePrev=IBB_CALC.validPrev(all,pm);
 document.querySelectorAll('#perfPrevOnlineTitle').forEach(title=>{title.textContent='Online Tháng '+Number(pm.slice(5));title.title='Online từ '+pm+'-01 đến '+prevCut;});
 const unique=IBB_CALC.unique,fmt=n=>n===null?'—':n.toLocaleString('vi-VN',{maximumFractionDigits:0}),num=n=>n===null?'—':n;
 const zero=()=>({sold:0,online:0,prev:0,pending:0,aged:0,goal:0,approved:0,missing:0});let overall=zero(),group=zero(),groupId='',out=[];
 const summary=(label,t,isGrand)=>{const eligible=t.approved>0&&t.goal>0;const pct=eligible?formatPercent(t.online/t.goal*100):'—',proj=eligible&&elapsed?formatPercent((t.online/elapsed*allDays)/t.goal*100):'—';const growth=periodGrowth(t.online,havePrev?t.prev:null);const missing=eligible?Math.max(0,t.goal-t.online):null,need=eligible&&calendarRemaining?fmt(missing/calendarRemaining):'—';return '<tr class="'+(isGrand?'perf-grand-total':'perf-team-total')+'"><td>'+label+'</td><td>—</td><td>'+(t.approved?t.goal:'—')+'</td><td>'+t.sold+'</td><td>'+t.online+'</td><td>'+(havePrev?t.prev:'—')+'</td><td>'+growth+'</td><td>'+pct+'</td><td>'+proj+'</td><td>'+num(missing)+'</td><td>'+need+'</td><td>'+t.pending+'</td><td>'+t.aged+'</td></tr>'};
 for(const p of list){if(groupId!==p.team){if(groupId)out.push(summary('TỔNG BẦY '+groupId,group,false));groupId=p.team;group=zero();}
  const a=all.filter(x=>String(x.staff||'').trim().toLowerCase()===p.acc.trim().toLowerCase());const sold=unique(a.filter(x=>x.created>=start&&x.created<=asof)),online=unique(a.filter(x=>x.date>=start&&x.date<=asof)),prev=havePrev?unique(a.filter(x=>x.date?.slice(0,7)===pm&&x.date<=prevCut)):0;
  const pend=a.filter(x=>IBB_CALC.pending(x,asof)),pending=unique(pend),aged=unique(pend.filter(x=>(Date.parse(asof+'T12:00:00')-Date.parse(x.created+'T12:00:00'))/86400000>7));const goal=Number.isInteger(cm[p.acc])?cm[p.acc]:null;
  for(const s of [overall,group]){s.sold+=sold;s.online+=online;s.prev+=prev;s.pending+=pending;s.aged+=aged;if(goal!==null){s.goal+=goal;s.approved++;}}
  const growth=periodGrowth(online,havePrev?prev:null),pct=goal>0?formatPercent(online/goal*100):'—',projected=goal>0&&elapsed?formatPercent((online/elapsed*allDays)/goal*100):'—';const missing=goal===null?null:Math.max(0,goal-online),need=missing!==null&&calendarRemaining?fmt(missing/calendarRemaining):'—';
  out.push('<tr><td class="perf-person-cell"><div class="person">'+esc(p.name)+'</div><div class="acc">'+esc(p.acc)+(p.role?' · '+esc(p.role):'')+'</div></td><td>'+esc(p.tenure)+'</td><td>'+num(goal)+'</td><td>'+sold+'</td><td><b>'+online+'</b></td><td>'+(havePrev?prev:'—')+'</td><td'+(havePrev&&online<prev?' class="perf-growth-negative" title="Cảnh báo: Online giảm so với cùng kỳ tháng trước"':'')+'>'+growth+'</td><td>'+pct+'</td><td>'+projected+'</td><td>'+num(missing)+'</td><td>'+need+'</td><td>'+pending+'</td><td>'+aged+'</td></tr>');
 }if(groupId)out.push(summary('TỔNG BẦY '+groupId,group,false));$('perfRows').innerHTML=out.join('')||'<tr><td colspan="13">Không có nhân sự phù hợp</td></tr>';$('perfFoot').innerHTML=summary('TỔNG PHÒNG ('+list.length+' NS)',overall,true);
}
['to','from','room','perfTeam'].forEach(id=>document.getElementById(id)?.addEventListener('change',perfRender));document.getElementById('perfSearch')?.addEventListener('input',perfRender);
document.getElementById('perfExport')?.addEventListener('click',()=>{const rows=[...document.querySelectorAll('#performance table tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(td=>'"'+td.innerText.replace(/"/g,'""').replace(/\n/g,' ')+'"').join(','));const u=URL.createObjectURL(new Blob(['\ufeff'+rows.join('\r\n')],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=u;a.download='hieu_suat_nhan_su.csv';a.click();URL.revokeObjectURL(u)});
try{perfRender()}catch(e){console.error('perfRender',e)}


// ---- Original script 4  ----
document.querySelectorAll('.sidebar .nav a').forEach(a=>a.addEventListener('click',()=>{document.querySelectorAll('.sidebar .nav a').forEach(x=>x.classList.remove('active'));a.classList.add('active')}));

// ---- Original script 5 id="single-page-navigation-script" ----
(function(){
const links=[...document.querySelectorAll('.sidebar .nav a[href^="#"]')];
const sections=[...document.querySelectorAll('.content > section.panel[id]')];
const title=document.querySelector('header.top h1');
const names={overview:'Tổng quan kinh doanh',performance:'Hiệu suất nhân sự',commitments:'Cam kết tháng',details:'Chi tiết hợp đồng',dispatch:'Điều phối Online',tasks:'Việc hôm nay',pendingContracts:'Hợp đồng tồn',cancelled:'Hợp đồng hủy',channels:'Kênh khai thác',mail:'Form mail',contacts:'Danh bạ hỗ trợ',scripts:'Kịch bản gợi ý',pricing:'Tạo bảng giá',lookup:'Tra cứu giá FPT',datahub:'Trung tâm dữ liệu',dailyReports:'Báo cáo ngày',account:'Tài khoản'};
function activate(id){if(!sections.some(s=>s.id===id))id='overview';sections.forEach(s=>s.classList.toggle('page-active',s.id===id));links.forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+id));if(title)title.textContent=names[id]||'Tổng quan kinh doanh';window.scrollTo(0,0);}
links.forEach(a=>a.addEventListener('click',function(e){e.preventDefault();const id=this.getAttribute('href').slice(1);if(location.hash!=='#'+id)history.pushState(null,'','#'+id);activate(id)}));
window.addEventListener('popstate',()=>activate(location.hash.slice(1)));
window.addEventListener('hashchange',()=>activate(location.hash.slice(1)));
activate(location.hash.slice(1)||'overview');
})();

// ---- Original script 6 id="net-latest-source" ----
const NET_LATEST=mockNET_LATEST;if(!window.IBB5_IMPORTED_DATA && typeof DATA!=="undefined")DATA.forEach(x=>{if(x.type==="Internet"&&NET_LATEST[x.id]){const v=NET_LATEST[x.id];x.customer=v.customer||"";if(v.staff)x.staff=v.staff;if(v.created)x.created=v.created;}});

// ---- Original script 7  ----

(function(){
 const staff=STAFF_ROSTER;
 const norm=v=>String(v||'').trim().toLowerCase();
 const me=window.IBB5_CURRENT_PROFILE||{role:'staff',acc:'',full_name:'',email:''};
 function current(){const person=staff.find(s=>norm(s.acc)===norm(me.acc));return {role:me.role,acc:person?.acc||me.acc||'',team:person?.team||0};}
 window.IBB5_ROLE={current,canView:(x)=>{const p=current();if(p.role==='manager')return true;if(!p.acc)return false;if(p.role==='staff')return norm(x.staff)===norm(p.acc);return staff.some(s=>s.team===p.team&&norm(s.acc)===norm(x.staff));}};
 const p=current(),scope=me.role==='manager'?'Toàn phòng':me.role==='lead'?'Bầy '+p.team+' · '+p.acc:'Chỉ '+p.acc;
 const summaryEl=document.getElementById('ibbRoleSummary');if(summaryEl)summaryEl.textContent=(me.role==='manager'?'Trưởng phòng':me.role==='lead'?'Trưởng Bầy':'Nhân viên')+' — '+scope;
 const scopeEl=document.getElementById('ibbRoleScope');if(scopeEl)scopeEl.textContent=me.role==='manager'?'Xem và xuất toàn bộ hồ sơ NET.':me.role==='lead'?'Chỉ xem và xuất hồ sơ của nhân viên thuộc Bầy '+p.team+'. KPI và lịch hẹn toàn phòng vẫn hiển thị đầy đủ.':'Chỉ xem và xuất hồ sơ do tài khoản '+p.acc+' bán.';
 const hint=document.getElementById('ibbPendingScope');if(hint)hint.textContent='Phạm vi hồ sơ hợp đồng: '+scope+'. Tìm kiếm, bộ lọc và xuất CSV tuân theo phạm vi này.';
})();


// ---- Original script 8 id="pending-module-js" ----
(function(){
const el=id=>document.getElementById(id),key='ibb5_pending_followup_v1';let notes=window.IBB5_PENDING_NOTES||{};if(!window.IBB5_PENDING_NOTES)try{notes=JSON.parse(localStorage.getItem(key)||'{}')}catch(e){};
const teamMap={'DNG.Vypv':'1','DNG.OanhLTH3':'1','DNG.ChuongHM':'1','DNG.NguyenTP10':'1','DNG.TriNP':'1','DNG.Hoantt':'2','DNG.Nhannt137':'2','DNG.Namnh170':'2','DNG.DatHX4':'1','DNG.HoaNTB6':'3','DNG.ManLM3':'3','DNG.Tienna2':'3','DNG.HanNVN':'3','DNG.BachND7':'3','DNG.DoanLT4':'3','DNG.LanMH2':'3','DNG.DatBTH':'3'};
const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const net=typeof DATA==='undefined'?[]:DATA.filter(x=>x.type==='Internet');
const distinct=[...new Map(net.filter(x=>x.id).map(x=>[x.id,x])).values()];

function isFilled(id){const n=notes[id]||{};return ['expected','timeSlot','action','result','source'].every(k=>String(n[k]||'').trim())}
function unresolved(){const asof=el('pendAsOf').value;return distinct.filter(x=>x.created&&x.created<=asof&&(!x.date||x.date>asof))}
function pending(){const asof=el('pendAsOf').value;return distinct.filter(x=>x.created&&x.created<=asof&&((!x.date||x.date>asof)||!isFilled(x.id)))}
function status(x){const d=(notes[x.id]||{}).expected,asof=el('pendAsOf').value;if(!d)return 'missing';return d<=asof?'due':'waiting'}
const RESULTS=['Chưa Online','Đã Online','Dự Kiến Hủy','Hủy'];
const REASONS=['chưa thống nhất với người nhà','Nhà KH đang xây dựng chưa xong','Kh muốn hẹn ngày đó','Đang còn cước đối thủ','Kh chưa chuyển vào ở','Không có lịch tích hẹn sớm hơn','Not hạ tầng','Chờ đầu tư hạ tầng','KH chưa đồng ý PHM','KH chưa đồng ý cước','Khác'];
const TIME_SLOTS=['8h - 10h','10h - 12h','13h30 - 15h30','15h30 - 17h30'];
const SOURCES=['FaceBook ADS','FaceBook Free','Web','Thị Trường','Tờ Dán','KH Cũ','Đại Lý','Telesale','Top ZaLo','SMS','Khác'];
const fields=['id','staff','customer','created','expected','timeSlot','action','result','source'];
const fieldLabels=['Mã HĐ','Nhân viên bán','Tên Khách Hàng','Ngày Tạo HĐ','Ngày Online dự kiến','Mốc Hẹn Online','Nguyên Nhân Hẹn Online','Kết Quả','Nguồn thông tin'];
let columnSortField='',columnSortDirection='';
const header=el('pendRows').closest('table').querySelector('thead');
header.innerHTML='<tr>'+fieldLabels.map((v,i)=>'<th><div class="ph-label">'+escapeHTML(v)+'</div>'+(fields[i]==='created'?'<select class="ph-created-month" id="pendCreatedMonth" aria-label="Lọc tháng tạo HĐ"><option value="">Tất cả tháng</option></select>':'')+'<select class="ph-filter" data-field="'+fields[i]+'" aria-label="Lọc '+escapeHTML(v)+'"><option value="">Tất cả</option></select></th>').join('')+'<th>Cập nhật</th></tr>';
const opts=(arr,selected)=>'<option value="">Chọn...</option>'+arr.map(v=>'<option value="'+escapeHTML(v)+'"'+(selected===v?' selected':'')+'>'+escapeHTML(v)+'</option>').join('');
const customer=x=>x.customer||x.customerName||x.customer_name||x.tenKhachHang||x.ten_khach_hang||'';
function cellValue(x,f){const n=notes[x.id]||{};return f==='customer'?customer(x):f==='expected'?n.expected||'':f==='timeSlot'?n.timeSlot||'':f==='status'?status(x)==='due'?'Đến hạn / quá hạn':status(x)==='missing'?'Thiếu ngày dự kiến':'Chờ đến hạn':f==='action'?n.action||'':f==='result'?n.result||'Chưa Online':f==='source'?n.source||'':x[f]||''}
function filtered(){let q=el('pendQuery').value.trim().toLocaleLowerCase('vi'),a=(q?distinct.slice():pending()).filter(x=>window.IBB5_ROLE?.canView(x)??true),mode=el('pendStatus').value,asof=el('pendAsOf').value;
a=a.filter(x=>!q||[x.id,customer(x),x.staff,x.created,x.date,x.package,teamMap[x.staff],notes[x.id]?.expected,notes[x.id]?.timeSlot,notes[x.id]?.reason,notes[x.id]?.result,notes[x.id]?.source,...fields.map(f=>cellValue(x,f))].some(v=>String(v??'').toLocaleLowerCase('vi').includes(q)));
const createdMonth=el('pendCreatedMonth').value;if(createdMonth)a=a.filter(x=>String(x.created||'').slice(0,7)===createdMonth);
header.querySelectorAll('.ph-filter').forEach(sel=>{if(sel.value && !sel.value.startsWith('__SORT_'))a=a.filter(x=>String(cellValue(x,sel.dataset.field))===sel.value)});
a.sort((x,y)=>(notes[x.id]?.expected||'9999-12-31').localeCompare(notes[y.id]?.expected||'9999-12-31'));if(columnSortField){const dir=columnSortDirection==='az'?1:-1;a.sort((x,y)=>String(cellValue(x,columnSortField)).localeCompare(String(cellValue(y,columnSortField)),'vi',{numeric:true,sensitivity:'base'})*dir)}return a}
function populateFilters(){const all=(el('pendQuery').value.trim()?distinct:pending()).filter(x=>window.IBB5_ROLE?.canView(x)??true);
const monthSelect=el('pendCreatedMonth'),selectedMonth=monthSelect.value,months=[...new Set([...all.map(x=>String(x.created||'').slice(0,7)),selectedMonth].filter(m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m)))].sort().reverse();
monthSelect.innerHTML='<option value="">Tất cả tháng</option>'+months.map(m=>'<option value="'+m+'">'+m.slice(5)+'/'+m.slice(0,4)+'</option>').join('');monthSelect.value=selectedMonth;
header.querySelectorAll('.ph-filter').forEach(sel=>{const previous=sel.value;const vals=[...new Set(all.map(x=>cellValue(x,sel.dataset.field)).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),'vi'));sel.innerHTML='<option value="">Tất cả</option><option value="__SORT_AZ__">↑ Từ A-Z</option><option value="__SORT_ZA__">↓ Từ Z-A</option>'+vals.map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join('');sel.value=previous;});}
function render(){const all=pending(),realPending=unresolved(),asof=el('pendAsOf').value;el('pendTotal').textContent=realPending.length;const selectedDay=el('pendDailyDate').value;el('pendDue').textContent=selectedDay?realPending.filter(x=>(notes[x.id]||{}).expected===selectedDay).length:'—';el('pendDailyDescription').textContent=selectedDay?'Số HĐ tồn dự kiến Online ngày '+selectedDay.split('-').reverse().join('/'):'Vui lòng chọn ngày để thống kê';el('pendMissing').textContent=realPending.filter(x=>status(x)==='missing').length;el('pendOld').textContent=realPending.filter(x=>x.created.slice(0,7)<asof.slice(0,7)).length;
// Month offsets use the tracking month, including year rollover.
const baseMonth=new Date(Number(asof.slice(0,4)),Number(asof.slice(5,7))-1,1);
// Age of pending contracts is based on creation month, not expected online date.
[1,2,3].forEach(offset=>{const d=new Date(baseMonth.getFullYear(),baseMonth.getMonth()-offset,1),monthKey=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');el('pendOld'+offset).textContent=realPending.filter(x=>String(x.created||'').slice(0,7)===monthKey).length;el('pendOldMonth'+offset).textContent=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();});
const futureCounts=[1,2,3].map(offset=>{const d=new Date(baseMonth.getFullYear(),baseMonth.getMonth()+offset,1);const monthKey=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');const count=realPending.filter(x=>String((notes[x.id]||{}).expected||'').slice(0,7)===monthKey).length;el('pendForward'+offset).textContent=count;el('pendForwardMonth'+offset).textContent=String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();return count});
el('pendForwardTotal').textContent=futureCounts.reduce((a,b)=>a+b,0);
populateFilters();const a=filtered();const scopedAll=all.filter(x=>window.IBB5_ROLE?.canView(x)??true);const scopedDistinct=distinct.filter(x=>window.IBB5_ROLE?.canView(x)??true);el('pendCount').textContent=el('pendQuery').value.trim()?('Kết quả tra cứu: '+a.length+' / '+scopedDistinct.length+' hợp đồng trong dữ liệu NET (bao gồm HĐ đã Online và hoàn tất cập nhật)'):('Đang tìm thấy '+a.length+' / '+scopedAll.length+' hợp đồng cần theo dõi (gồm HĐ đã Online thiếu cập nhật)');el('pendRows').innerHTML=a.length?a.map(x=>{const n=notes[x.id]||{},st=status(x),lab=cellValue(x,'status');return '<tr data-id="'+escapeHTML(x.id)+'"><td><b>'+escapeHTML(x.id)+'</b>'+(x.date&&x.date<=asof?'<div class="p-online-warning">Đã Online '+escapeHTML(x.date)+(isFilled(x.id)?' · Đã cập nhật đầy đủ':' · Thiếu cập nhật')+'</div>':'')+'<button type="button" class="p-mobile-edit">Cập nhật</button></td><td>'+escapeHTML(x.staff||'—')+'<div style="color:#92a2b6">'+(teamMap[x.staff]?'Bầy '+teamMap[x.staff]:'Chưa phân Bầy')+'</div></td><td>'+escapeHTML(customer(x)||'—')+'</td><td>'+escapeHTML(x.created)+'</td><td><input class="p-date" type="date" value="'+escapeHTML(n.expected||'')+'"></td><td><select class="p-time-slot" aria-label="Mốc Hẹn Online">'+opts(TIME_SLOTS,n.timeSlot||'')+'</select></td><td><select class="p-note" aria-label="Nguyên nhân hẹn Online">'+opts(REASONS,n.action||'')+'</select></td><td><select class="p-result">'+opts(RESULTS,n.result||'')+'</select></td><td><select class="p-source">'+opts(SOURCES,n.source||'')+'</select></td><td><button class="p-save">Lưu</button></td></tr>'}).join(''):'<tr><td colspan="10" style="text-align:center;padding:28px">Không có hợp đồng phù hợp</td></tr>'}
async function savePendingEntry(id,values){
 if(!window.IBB5_ROLE?.canView(distinct.find(x=>x.id===id)||{})){alert('Không có quyền cập nhật hợp đồng này');return false;}
 try{if(window.IBB5_SYNC){await window.IBB5_SYNC.pending(id,values);notes=window.IBB5_PENDING_NOTES;}else{const entry={...notes[id],...values,updated:new Date().toISOString()},updatedNotes={...notes,[id]:entry};localStorage.setItem(key,JSON.stringify(updatedNotes));notes[id]=entry;}render();return true;}catch(err){alert('Chưa lưu được cập nhật: '+err.message);return false;}
}
const mobileEditor=document.createElement('dialog');mobileEditor.id='pendingMobileEditor';mobileEditor.setAttribute('aria-label','Cập nhật hợp đồng tồn');el('pendingContracts').append(mobileEditor);
const mobileStatus=document.createElement('p');mobileStatus.id='pendingMobileStatus';mobileStatus.setAttribute('role','status');mobileStatus.hidden=true;el('pendRows').closest('.pending-scroll').before(mobileStatus);
function openPendingEditor(id){
 const contract=distinct.find(x=>x.id===id);if(!contract||!window.IBB5_ROLE?.canView(contract)){alert('Không có quyền cập nhật hợp đồng này');return;}
 const n=notes[id]||{};
 mobileEditor.innerHTML='<div class="pm-head"><div><h3>Cập nhật '+escapeHTML(id)+'</h3><p>'+escapeHTML(contract.staff||'—')+'</p></div><button type="button" class="pm-close" aria-label="Đóng cập nhật hợp đồng">✕</button></div>'+
 '<dl class="pm-info"><dt>Khách hàng</dt><dd>'+escapeHTML(customer(contract)||'—')+'</dd><dt>Ngày tạo HĐ</dt><dd>'+escapeHTML(contract.created||'—')+'</dd><dt>Online thực tế</dt><dd>'+escapeHTML(contract.date||'Chưa Online')+'</dd></dl>'+
 '<form id="pendingMobileForm"><label>Ngày Online dự kiến<input name="expected" type="date" required value="'+escapeHTML(n.expected||'')+'"></label>'+
 '<label>Mốc hẹn Online<select name="timeSlot" required>'+opts(TIME_SLOTS,n.timeSlot||'')+'</select></label>'+
 '<label>Nguyên nhân hẹn Online<select name="action" required>'+opts(REASONS,n.action||'')+'</select></label>'+
 '<label>Kết quả<select name="result" required>'+opts(RESULTS,n.result||'')+'</select></label>'+
 '<label>Nguồn thông tin<select name="source" required>'+opts(SOURCES,n.source||'')+'</select></label>'+
 '<div class="pm-actions"><button type="button" class="pm-close">Hủy</button><button type="submit" class="primary">Lưu cập nhật</button></div></form>';
 mobileEditor.querySelectorAll('.pm-close').forEach(button=>button.onclick=()=>mobileEditor.close());
 mobileEditor.querySelector('form').onsubmit=async event=>{event.preventDefault();if(!event.target.reportValidity())return;const values=Object.fromEntries(new FormData(event.target)),submit=event.target.querySelector('[type="submit"]');submit.disabled=true;if(await savePendingEntry(id,values)){mobileEditor.close();mobileStatus.textContent='Đã lưu cập nhật '+id+(window.IBB5_SYNC?' lên hệ thống dùng chung.':' trên thiết bị này.');mobileStatus.hidden=false;const button=[...el('pendRows').querySelectorAll('.p-mobile-edit')].find(b=>b.closest('tr').dataset.id===id);button?.focus();}submit.disabled=false;};
 mobileEditor.showModal();
}
el('pendRows').addEventListener('click',async e=>{if(e.target.closest('.p-mobile-edit')){openPendingEditor(e.target.closest('tr').dataset.id);return;}if(!e.target.classList.contains('p-save'))return;
const row=e.target.closest('tr'),id=row.dataset.id;if(!window.IBB5_ROLE?.canView(distinct.find(x=>x.id===id)||{})){alert('Không có quyền cập nhật hợp đồng này');return;}
const required=[['.p-date','Ngày Online dự kiến'],['.p-time-slot','Mốc Hẹn Online'],['.p-note','Nguyên Nhân Hẹn Online'],['.p-result','Kết Quả'],['.p-source','Nguồn thông tin']];
const missing=required.filter(([selector])=>!String(row.querySelector(selector)?.value||'').trim());
row.querySelectorAll('.p-date,.p-time-slot,.p-note,.p-result,.p-source').forEach(input=>{input.classList.remove('pending-required-error');input.removeAttribute('aria-invalid')});
const previous=row.querySelector('.pending-validation-message');if(previous)previous.remove();
if(missing.length){missing.forEach(([selector])=>{const input=row.querySelector(selector);input.classList.add('pending-required-error');input.setAttribute('aria-invalid','true')});
const warning=document.createElement('div');warning.className='pending-validation-message';warning.setAttribute('role','alert');warning.textContent='Chưa cập nhật đầy đủ: '+missing.map(([,label])=>label).join(', ');row.querySelector('.p-save').insertAdjacentElement('afterend',warning);
alert('Chưa cập nhật đầy đủ. Vui lòng điền: '+missing.map(([,label])=>label).join(', '));return;}
e.target.disabled=true;await savePendingEntry(id,{expected:row.querySelector('.p-date').value,timeSlot:row.querySelector('.p-time-slot').value,action:row.querySelector('.p-note').value,result:row.querySelector('.p-result').value,source:row.querySelector('.p-source').value});e.target.disabled=false;});
el('pendRows').addEventListener('change',e=>{if(!e.target.matches('.p-date,.p-time-slot,.p-note,.p-result,.p-source'))return;e.target.classList.remove('pending-required-error');e.target.removeAttribute('aria-invalid');const row=e.target.closest('tr');if([...row.querySelectorAll('.p-date,.p-time-slot,.p-note,.p-result,.p-source')].every(input=>String(input.value||'').trim()))row.querySelector('.pending-validation-message')?.remove()});
header.addEventListener('change',e=>{if(e.target.id==='pendCreatedMonth'){render();return;}if(!e.target.classList.contains('ph-filter'))return;const sel=e.target;if(sel.value==='__SORT_AZ__'||sel.value==='__SORT_ZA__'){columnSortField=sel.dataset.field;columnSortDirection=sel.value==='__SORT_AZ__'?'az':'za';header.querySelectorAll('.ph-filter').forEach(other=>{if(other!==sel && other.value.startsWith('__SORT_'))other.value='';});}else if(columnSortField===sel.dataset.field){columnSortField='';columnSortDirection='';}render()});
['pendAsOf','pendStatus','pendDailyDate'].forEach(id=>el(id).addEventListener('change',render));el('pendQuery').addEventListener('input',render);el('pendExport').onclick=()=>{const cols=fieldLabels;const rows=filtered().map(x=>fields.map(f=>cellValue(x,f)));const csv='\ufeff'+[cols,...rows].map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='IBB5_hop_dong_ton.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};document.addEventListener('ibb5-role-change',render);document.addEventListener('ibb5-shared-updated',()=>{notes=window.IBB5_PENDING_NOTES||notes;render()});render();
})();

// ---- Original script 9 id="ibb5-analytics-js" ----
(function(){
const $=id=>document.getElementById(id),fmt=n=>Number(n||0).toLocaleString('vi-VN');
const data=()=>typeof DATA==='undefined'?[]:DATA.filter(x=>x.type==='Internet');
const notes=()=>{if(window.IBB5_PENDING_NOTES)return window.IBB5_PENDING_NOTES;try{return JSON.parse(localStorage.getItem('ibb5_pending_followup_v1')||'{}')}catch(e){return {}}};
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const unique=a=>[...new Map(a.filter(x=>x.id).map(x=>[x.id,x])).values()];
const names=()=>{const s=new Set(data().map(x=>x.staff).filter(Boolean));return [...s].sort((a,b)=>a.localeCompare(b,'vi'))};
function barRows(id,items,total,withPercent=false){$(id).innerHTML=items.length?items.map(([name,n])=>'<div class="ana-row"><span title="'+esc(name)+'">'+esc(name)+'</span><div class="ana-track"><div class="ana-fill" style="width:'+((total?100*n/total:0).toFixed(2))+'%"></div></div><strong'+(withPercent?' class="ana-share-value" title="'+fmt(n)+' / '+fmt(total)+' HĐ NET Online"':'')+'>'+fmt(n)+(withPercent?' HĐ <small>'+formatPercent(total?100*n/total:0)+'</small>':'')+'</strong></div>').join(''):'<div class="ana-empty">Chưa có dữ liệu phù hợp.</div>'}
function render(){const m=$('anaMonth').value,staff=$('anaStaff').value,day=$('anaDay').value,ns=notes(),all=unique(data()),subset=all.filter(x=>!staff||x.staff===staff),monthRows=subset.filter(x=>x.created?.slice(0,7)===m||x.date?.slice(0,7)===m);const days=new Date(+m.slice(0,4),+m.slice(5),0).getDate();let series=[];for(let d=1;d<=days;d++){const date=m+'-'+String(d).padStart(2,'0');series.push({d,sold:subset.filter(x=>x.created===date).length,on:subset.filter(x=>x.date===date).length})}const max=Math.max(1,...series.flatMap(x=>[x.sold,x.on]));
const totalOn=series.reduce((a,x)=>a+x.on,0),totalSold=series.reduce((a,x)=>a+x.sold,0);
const highestOn=series.reduce((a,x)=>x.on>a.on?x:a,series[0]);
const commonMax=Math.max(1,...series.map(x=>Math.max(x.on,x.sold)));
const YMAX=Math.max(5,Math.ceil(commonMax/5)*5), W=1200,H=174,L=49,R=15,T=16,B=137;
const step=(W-L-R)/Math.max(1,series.length-1),xx=i=>L+i*step;
const yy=v=>B-(B-T)*v/YMAX;
const areaPath=k=>'M'+xx(0).toFixed(1)+' '+B+' L'+series.map((x,i)=>xx(i).toFixed(1)+' '+yy(x[k]).toFixed(1)).join(' L')+' L'+xx(series.length-1).toFixed(1)+' '+B+' Z';
const path=k=>'M'+series.map((x,i)=>xx(i).toFixed(1)+' '+yy(x[k]).toFixed(1)).join(' L');
function graph(key,color,fill){
  const grids=[0,.25,.5,.75,1].map(f=>{
    const v=Math.round(YMAX*f),y=yy(YMAX*f).toFixed(1);
    return '<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" stroke="#e7eef6" stroke-dasharray="4 5"/>'+
      '<text x="'+(L-10)+'" y="'+(+y+4)+'" text-anchor="end" fill="#8091a5" font-size="12">'+v+'</text>';
  }).join('');
  const labels=series.map((x,i)=>((i===0||i===series.length-1||x.d%5===0)?'<text x="'+xx(i).toFixed(1)+'" y="160" text-anchor="middle" font-size="12" fill="#697f97">'+x.d+'</text>':'')).join('');
  const maxV=Math.max(...series.map(x=>x[key]));
  const maxIdx=series.findIndex(x=>x[key]===maxV);
  const circles=series.map((x,i)=>'<circle cx="'+xx(i).toFixed(1)+'" cy="'+yy(x[key]).toFixed(1)+'" r="3.5" fill="#fff" stroke="'+color+'" stroke-width="2"><title>Ngày '+x.d+': '+x[key]+' HĐ</title></circle>').join('');
  const peakX=xx(maxIdx).toFixed(1),peakY=yy(maxV).toFixed(1);
  const peakLabel='<rect x="'+Math.max(20,Math.min(W-46,xx(maxIdx)-19)).toFixed(1)+'" y="'+Math.max(0,yy(maxV)-30).toFixed(1)+'" rx="5" width="38" height="22" fill="'+fill+'" stroke="'+color+'" stroke-opacity=".25"/>'+
    '<text x="'+peakX+'" y="'+Math.max(0,yy(maxV)-30+15).toFixed(1)+'" text-anchor="middle" font-size="12" font-weight="800" fill="'+color+'">'+maxV+'</text>';
  const hit=series.map((x,i)=>{
    const first=i===0?L-15:(xx(i-1)+xx(i))/2,last=i===series.length-1?W-R+15:(xx(i+1)+xx(i))/2;
    return '<rect data-trk-day="'+x.d+'" tabindex="0" role="button" aria-label="Ngày '+x.d+': '+x.on+' hợp đồng Online, '+x.sold+' hợp đồng bán mới" x="'+first.toFixed(1)+'" width="'+(last-first).toFixed(1)+'" y="'+T+'" height="'+(B-T)+'" fill="transparent"><title>Ngày '+x.d+': Online '+x.on+' HĐ · Bán mới '+x.sold+' HĐ</title></rect>';
  }).join('');
  return '<svg class="trk-plot" viewBox="0 0 '+W+' '+H+'" aria-label="Xu hướng '+(key==='on'?'Online thực tế':'Bán mới')+' theo ngày" role="img">'+
    grids+'<path d="'+areaPath(key)+'" fill="'+fill+'" opacity=".58"/>'+
    '<path d="'+path(key)+'" stroke="'+color+'" fill="none" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>'+
    circles+peakLabel+labels+hit+'</svg>';
}
function tile(label,value,detail,style){return '<div class="trk-stat '+(style||'')+'"><span>'+label+'</span><strong>'+value+'</strong><small>'+detail+'</small></div>'}
const delta=totalOn-totalSold,sign=delta>0?'+':'';
const tiles='<div class="trk-stat-row">'+
 tile('Online thực tế',fmt(totalOn)+' HĐ','Trong tháng phân tích','trk-blue')+
 tile('HĐ bán mới',fmt(totalSold)+' HĐ','Tạo trong tháng','trk-orange')+
 tile('Chênh Online – Bán mới',sign+fmt(delta)+' HĐ','Chênh trong kỳ, không phải HĐ tồn',delta<0?'trk-orange':'trk-blue')+
 tile('Online cao nhất/ngày',highestOn.on+' HĐ','Ngày '+String(highestOn.d).padStart(2,'0')+'/'+m.slice(5,7),'trk-neutral')+'</div>';
const plotSection=(key,label,color,bg,total)=>'<section class="trk-section '+(key==='on'?'trk-online':'trk-sold')+'"><div class="trk-section-top">'+
  '<div class="trk-line-caption"><span class="trk-color-line"></span><strong>'+label+'</strong><small>'+series.length+' ngày theo dõi</small></div>'+
  '<span class="trk-section-total">Tổng <b>'+fmt(total)+' HĐ</b></span></div>'+
  '<div class="trk-plot-scroll">'+graph(key,color,bg)+'</div></section>';
const tableCells=k=>series.map(x=>'<td data-day="'+x.d+'">'+fmt(x[k])+'</td>').join('');
const tableHead=series.map(x=>'<th>'+String(x.d).padStart(2,'0')+'</th>').join('');
const allTable='<div class="trk-table-title"><strong>Chi tiết số liệu theo ngày</strong><small>Đầy đủ '+series.length+' ngày · Cuộn ngang nếu dùng màn hình hẹp</small></div>'+
 '<div class="trk-table-scroll"><table class="trk-day-table"><thead><tr><th>Ngày</th>'+tableHead+'<th>Tổng</th></tr></thead>'+
 '<tbody><tr class="trk-row-online"><th>Online</th>'+tableCells('on')+'<td>'+fmt(totalOn)+'</td></tr>'+
 '<tr class="trk-row-sold"><th>Bán mới</th>'+tableCells('sold')+'<td>'+fmt(totalSold)+'</td></tr></tbody></table></div>';
$('anaTrend').innerHTML=tiles+'<div class="trk-description"><span class="trk-hint">Hai đường xu hướng riêng, cùng thang đo để so sánh.</span><strong id="ibbTrkFocus">Rê chuột vào điểm bất kỳ để xem kết quả của ngày.</strong></div>'+
 plotSection('on','Online thực tế','#1684e6','#cde7ff',totalOn)+
 plotSection('sold','HĐ bán mới','#f47721','#ffe0c8',totalSold)+allTable;
const focusNode=$('ibbTrkFocus');
const focusDay=d=>{
  const x=series.find(a=>a.d===d);if(!x)return;
  const difference=x.on-x.sold;
  focusNode.textContent='Ngày '+String(d).padStart(2,'0')+'/'+m.slice(5,7)+': Online '+x.on+' HĐ · Bán mới '+x.sold+' HĐ · Chênh '+(difference>0?'+':'')+difference+' HĐ';
  $('anaTrend').querySelectorAll('.trk-day-table [data-day]').forEach(td=>td.classList.toggle('trk-highlighted',Number(td.dataset.day)===d));
};
$('anaTrend').querySelectorAll('[data-trk-day]').forEach(node=>{
  const d=Number(node.dataset.trkDay);
  node.addEventListener('pointerenter',()=>focusDay(d));node.addEventListener('focus',()=>focusDay(d));node.addEventListener('click',()=>focusDay(d));
});

const slots=['8h - 10h','10h - 12h','13h30 - 15h30','15h30 - 17h30'];const slotCounts=slots.map(t=>[t,subset.filter(x=>ns[x.id]?.expected===day&&ns[x.id]?.timeSlot===t&&x.created<=day&&(!x.date||x.date>day)).length]);const slotTotal=slotCounts.reduce((a,b)=>a+b[1],0);
const overdue=overdueContracts(subset,day),visibleOverdue=overdue.filter(row=>window.IBB5_ROLE?.canView(row)??false);
$('anaOld').textContent=fmt(overdue.length);
$('anaOldRows').innerHTML=visibleOverdue.length?visibleOverdue.map(row=>{const note=ns[row.id]||{};return '<tr><td><b>'+esc(row.id)+'</b></td><td>'+esc(row.staff||'Chưa gán')+'</td><td>'+fmt(row.age)+' ngày</td><td>'+esc(note.action||note.reason||'Chưa cập nhật')+((note.expected||note.result)?'<small>'+[note.expected?'Hẹn: '+esc(note.expected):'',note.result?'Kết quả: '+esc(note.result):''].filter(Boolean).join(' · ')+'</small>':'')+'</td></tr>';}).join(''):'<tr><td colspan="4" class="ana-empty">Không có HĐ tồn trên 5 ngày trong phạm vi xem.</td></tr>';
$('anaOldScope').textContent=visibleOverdue.length===overdue.length?'Danh sách theo ngày '+day.split('-').reverse().join('/'):'Hiển thị '+visibleOverdue.length+' / '+overdue.length+' HĐ theo quyền tài khoản.';
const onlineSubset=subset.filter(x=>x.date?.slice(0,7)===m);$('anaPrepaid').textContent=onlineSubset.length?formatPercent(prepaidShare(onlineSubset).percent):'—';$('anaCam').textContent=IBB_CALC.unique(IBB_CALC.camOnline(onlineSubset,IBB_CALC.monthEnd(m)));
const onlineMonth=all.filter(x=>x.date?.slice(0,7)===m),counts=new Map();onlineMonth.forEach(x=>counts.set(x.staff||'Chưa gán',1+(counts.get(x.staff||'Chưa gán')||0)));barRows('anaStaffBars',[...counts].sort((a,b)=>b[1]-a[1]),onlineMonth.length,true);
const chan=new Map();let annotated=0;subset.filter(x=>x.created?.slice(0,7)===m).forEach(x=>{const source=ns[x.id]?.source||x.sourceExcel||'';if(source){annotated++;chan.set(source,1+(chan.get(source)||0))}});barRows('anaChannelBars',[...chan].sort((a,b)=>b[1]-a[1]),annotated);$('anaChannelNote').textContent='Có nguồn: '+annotated+' HĐ. Chưa cập nhật nguồn không được tự gán vào kênh.';
if(channelMonthYear!==m.slice(0,4)){channelMonthYear=m.slice(0,4);if(![...$('anaChannelYear').options].some(option=>option.value===channelMonthYear))$('anaChannelYear').add(new Option(channelMonthYear,channelMonthYear));$('anaChannelYear').value=channelMonthYear;}
const year=$('anaChannelYear').value,annual=yearlyStaffChannels(all,ns,year,staff);
$('anaYearlyScope').textContent='Năm '+year+' · '+(staff||'Toàn phòng')+' · Đếm HĐ NET theo ngày tạo';
$('anaYearlyRows').innerHTML=annual.rows.length?annual.rows.map(row=>'<tr data-acc="'+esc(row.acc)+'" data-source="'+esc(row.source)+'"><th scope="row">'+esc(row.acc)+'</th><td>'+esc(row.source)+'</td>'+row.months.map((n,i)=>'<td>'+(annual.available[i]?fmt(n):'—')+'</td>').join('')+'<td><b>'+fmt(row.total)+'</b></td></tr>').join(''):'<tr><td colspan="15" class="ana-empty">Chưa có HĐ đã cập nhật nguồn trong năm đang chọn.</td></tr>';
$('anaYearlyFoot').innerHTML='<tr><th colspan="2">Tổng có nguồn</th>'+annual.totals.map((n,i)=>'<td>'+(annual.available[i]?fmt(n):'—')+'</td>').join('')+'<td>'+fmt(annual.total)+'</td></tr>';
$('anaYearlyNote').textContent='Có nguồn: '+fmt(annual.total)+' HĐ · Chưa cập nhật nguồn: '+fmt(annual.missing)+' HĐ (không phân vào kênh). Tháng chưa có dữ liệu nhập hiển thị —.';
}
let channelMonthYear=$('anaMonth').value.slice(0,4);const yearSelect=$('anaChannelYear'),sourceYears=[...new Set([reportDay().slice(0,4),channelMonthYear,...data().map(row=>row.created?.slice(0,4)).filter(year=>/^\d{4}$/.test(year||''))])].sort().reverse();sourceYears.forEach(year=>yearSelect.add(new Option(year,year)));yearSelect.value=channelMonthYear;yearSelect.addEventListener('change',render);
const sel=$('anaStaff');names().forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;sel.appendChild(o)});['anaMonth','anaStaff','anaDay'].forEach(id=>$(id).addEventListener('change',render));document.addEventListener('click',e=>{if(e.target?.closest?.('#pendingContracts button'))setTimeout(render,80)});window.addEventListener('storage',render);render();})();

// ---- Original script 10 id="pending-schedule-js" ----
(function(){
const people={"dng.vypv": {"team": 1, "name": "Phan Văn Vĩ", "acc": "DNG.Vypv"}, "dng.oanhlth3": {"team": 1, "name": "Lê Thị Hoàng Oanh", "acc": "DNG.OanhLTH3"}, "dng.chuonghm": {"team": 1, "name": "Hạ Minh Chương", "acc": "DNG.ChuongHM"}, "dng.nguyentp10": {"team": 1, "name": "Trần Phước Nguyên", "acc": "DNG.NguyenTP10"}, "dng.trinp": {"team": 1, "name": "Nguyễn Phước Trí", "acc": "DNG.TriNP"}, "dng.hoantt": {"team": 2, "name": "Nguyễn Thị Thanh Hoa", "acc": "DNG.Hoantt"}, "dng.nhannt137": {"team": 2, "name": "Nguyễn Thành Nhân", "acc": "DNG.Nhannt137"}, "dng.namnh170": {"team": 2, "name": "Ngô Hoài Nam", "acc": "DNG.Namnh170"}, "dng.dathx4": {"team": 1, "name": "Hồ Xuân Đạt", "acc": "DNG.DatHX4"}, "dng.hoantb6": {"team": 3, "name": "Nguyễn Thị Bích Hòa", "acc": "DNG.HoaNTB6"}, "dng.manlm3": {"team": 3, "name": "Lê Minh Mẫn", "acc": "DNG.ManLM3"}, "dng.tienna2": {"team": 3, "name": "Nguyễn Anh Tiến", "acc": "DNG.Tienna2"}, "dng.hannvn": {"team": 3, "name": "Nguyễn Vũ Ngọc Hân", "acc": "DNG.HanNVN"}, "dng.bachnd7": {"team": 3, "name": "Nguyễn Đình Bách", "acc": "DNG.BachND7"}, "dng.doanlt4": {"team": 3, "name": "Lê Trần Doãn", "acc": "DNG.DoanLT4"}, "dng.lanmh2": {"team": 3, "name": "Mai Hoàng Lân", "acc": "DNG.LanMH2"}, "dng.datbth": {"team": 3, "name": "DNG.DatBTH", "acc": "DNG.DatBTH"}};
const slots=['8h - 10h','10h - 12h','13h30 - 15h30','15h30 - 17h30'];
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const readNotes=()=>{if(window.IBB5_PENDING_NOTES)return window.IBB5_PENDING_NOTES;try{return JSON.parse(localStorage.getItem('ibb5_pending_followup_v1')||'{}')}catch(e){return {}}};
const canonical=v=>String(v||'').trim().toLowerCase();
function render(){
const day=$('psDay')?.value;if(!day)return;
const cutoff=$('pendAsOf')?.value||day;
const ns=readNotes();
const net=typeof DATA==='undefined'?[]:DATA.filter(x=>x.type==='Internet'&&x.id);
const distinct=[...new Map(net.map(x=>[x.id,x])).values()];
const rows=distinct.filter(x=>x.created&&x.created<=cutoff&&(!x.date||x.date>cutoff)&&ns[x.id]?.expected===day);
const counts=Array(5).fill(0);const grouped=new Map();
for(const x of rows){const person=people[canonical(x.staff)]||{team:0,name:x.staff||'Chưa xác định',acc:x.staff||'—'};const key=canonical(x.staff)||'unknown';if(!grouped.has(key))grouped.set(key,{...person,values:Array.from({length:5},()=>[])});let idx=slots.indexOf(ns[x.id]?.timeSlot);if(idx<0)idx=4;grouped.get(key).values[idx].push(x.id);counts[idx]++;}
$('psSummary').textContent='Ngày '+day.split('-').reverse().join('/')+' · '+rows.length+' HĐ dự kiến Online · '+counts[4]+' HĐ chưa có mốc hẹn';

let html='';const sum=Array(5).fill(0);
for(let team=1;team<=3;team++){
 const members=[...grouped.values()].filter(p=>p.team===team).sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 const subtot=Array(5).fill(0);
 for(const p of members){p.values.forEach((v,i)=>subtot[i]+=v.length);html+='<tr><td><div class="ps-person">'+esc(p.name)+'</div><div class="ps-acc">'+esc(p.acc)+'</div></td><td class="ps-blank">—</td>'+p.values.map(ids=>'<td class="ps-ids">'+(ids.length?ids.map(id=>'<span class="ps-id">'+esc(id)+'</span>').join(''):'—')+'</td>').join('')+'</tr>';}
 subtot.forEach((v,i)=>sum[i]+=v);
 html+='<tr class="ps-team"><td>TỔNG BẦY '+team+'</td><td>'+subtot.reduce((a,b)=>a+b,0)+'</td>'+subtot.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
}
const unknown=[...grouped.values()].filter(p=>!p.team);
for(const p of unknown){p.values.forEach((v,i)=>sum[i]+=v.length);html+='<tr><td><div class="ps-person">'+esc(p.name)+'</div><div class="ps-acc">Chưa phân Bầy</div></td><td class="ps-blank">—</td>'+p.values.map(ids=>'<td class="ps-ids">'+(ids.length?ids.map(id=>'<span class="ps-id">'+esc(id)+'</span>').join(''):'—')+'</td>').join('')+'</tr>';}
html+='<tr class="ps-total"><td>TỔNG PHÒNG</td><td>'+rows.length+'</td>'+sum.map(v=>'<td>'+v+'</td>').join('')+'</tr>';
$('psRows').innerHTML=html;
}
$('psDay').addEventListener('change',()=>{const date=$('pendDailyDate');if(date){date.value=$('psDay').value;date.dispatchEvent(new Event('change',{bubbles:true}));}render()});
$('pendDailyDate')?.addEventListener('change',()=>{$('psDay').value=$('pendDailyDate').value;render()});
$('pendAsOf')?.addEventListener('change',render);
document.addEventListener('click',e=>{if(e.target.closest?.('#pendingContracts button'))setTimeout(render,60)});
window.addEventListener('storage',render);
window.addEventListener('hashchange',render);
render();
})();

// ---- Original script 11  ----

(function(){
let overlay,copyTable,scrollBox;
function init(){
 const source=document.querySelector('#performance .perf-table');if(!source)return;
 overlay=document.createElement('div');overlay.id='perfStickyClone';overlay.setAttribute('aria-hidden','true');
 copyTable=document.createElement('table');copyTable.appendChild(source.tHead.cloneNode(true));overlay.appendChild(copyTable);document.body.appendChild(overlay);
 scrollBox=source.closest('.tablewrap');
 function sync(){
  const section=document.getElementById('performance');const header=source.tHead;
  if(!section.classList.contains('page-active')){overlay.style.display='none';return}
  const rect=source.getBoundingClientRect(),headRect=header.getBoundingClientRect();
  const visible=headRect.top<0 && rect.bottom>headRect.height && rect.right>0 && rect.left<innerWidth;
  if(!visible){overlay.style.display='none';return}
  const cells=[...header.rows[0].cells],clones=[...copyTable.tHead.rows[0].cells];
  overlay.style.display='block';overlay.style.left=Math.max(0,rect.left)+'px';overlay.style.width=Math.min(rect.width,innerWidth-Math.max(0,rect.left))+'px';
  copyTable.style.width=rect.width+'px';
  cells.forEach((c,i)=>{const w=c.getBoundingClientRect().width;clones[i].style.width=w+'px';clones[i].style.minWidth=w+'px';clones[i].style.maxWidth=w+'px'});
  overlay.style.height=headRect.height+'px';copyTable.style.transform='translateX('+(-(scrollBox?.scrollLeft||0))+'px)';
 }
 addEventListener('scroll',sync,{passive:true});addEventListener('resize',sync,{passive:true});scrollBox?.addEventListener('scroll',sync,{passive:true});
 const observer=new MutationObserver(sync);observer.observe(document.getElementById('performance'),{attributes:true,attributeFilter:['class']});sync();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();


// ---- Original script 13  ----

(function(){
const $=id=>document.getElementById(id);
const STORAGE='ibb5_three_source_snapshot_v1';
const TYPES=[['ibbUploadNet','Internet'],['ibbUploadCam','Camera'],['ibbUploadTv','Truyền hình']];
const esc=(s)=>String(s??'').trim();
const strip=(s)=>esc(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/Đ/g,'D').toLowerCase().replace(/\s+/g,' ');
function isoDate(x){
 if(x==null||x==='')return '';
 if(typeof x==='number'||/^\d{5}(?:\.\d+)?$/.test(String(x))){const n=Number(x);if(n>20000&&n<100000)return new Date(Math.round((n-25569)*86400000)).toISOString().slice(0,10)}
 const t=String(x).trim();let m=t.match(/^(\d{4})-(\d{2})-(\d{2})/);if(m)return m[1]+'-'+m[2]+'-'+m[3];m=t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);if(m)return m[3]+'-'+m[2].padStart(2,'0')+'-'+m[1].padStart(2,'0');return '';
}
function colIndex(a){let n=0;for(const c of a)n=n*26+(c.charCodeAt(0)-64);return n-1}
async function parseXlsx(file){
 const zip=await JSZip.loadAsync(await file.arrayBuffer());const xml=(name)=>zip.file(name)?.async('string');
 const sharedDoc=await xml('xl/sharedStrings.xml');const parser=new DOMParser();const shared=sharedDoc?[...parser.parseFromString(sharedDoc,'application/xml').getElementsByTagName('si')].map(n=>n.textContent):[];
 let sheetFile=zip.file('xl/worksheets/sheet1.xml');if(!sheetFile)sheetFile=Object.values(zip.files).find(f=>/^xl\/worksheets\/sheet\d+\.xml$/.test(f.name));if(!sheetFile)throw Error('Không tìm thấy bảng dữ liệu trong '+file.name);
 const doc=parser.parseFromString(await sheetFile.async('string'),'application/xml');if(doc.getElementsByTagName('parsererror').length)throw Error('Không đọc được XML của '+file.name);
 const out=[];for(const row of doc.getElementsByTagName('row')){const values=[];for(const c of row.getElementsByTagName('c')){const ref=c.getAttribute('r')||'';const letter=ref.match(/^[A-Z]+/)?.[0];if(!letter)continue;const t=c.getAttribute('t');const raw=c.getElementsByTagName('v')[0]?.textContent;const v=t==='inlineStr'?c.getElementsByTagName('is')[0]?.textContent:(t==='s'?shared[Number(raw)]:(raw??''));values[colIndex(letter)]=v??''}if(values.some(v=>esc(v)))out.push(values)}
 return out;
}
function transform(raw,type,fileName){
 const headerIdx=raw.findIndex(r=>r.some(c=>strip(c)==='hop dong')&&r.some(c=>strip(c).includes('ngay tao hd')));
 if(headerIdx<0)throw Error('File '+fileName+' không có cột Hợp đồng hoặc Ngày tạo HĐ');
 const headers=raw[headerIdx].map(strip),find=(...terms)=>headers.findIndex(h=>terms.some(t=>h===t||h.includes(t)));
 const idx={id:find('hop dong'),created:find('ngay tao hd'),date:find('ngay online'),customer:find('ten khach hang'),staff:find('acc nhan vien ban'),room:find('phong kinh doanh'),status:find('tinh trang'),package:find('goi dich vu'),branch:find('cn quan ly'),prepaid:find('so thang tra truoc'),netClbh:headers.findIndex(h=>h==='clbh net thoi diem hien tai'),source:find('nguon ban')};
 if(idx.id<0||idx.created<0||idx.date<0||idx.staff<0)throw Error('File '+fileName+' thiếu cột mã HĐ, ngày tạo, ngày Online hoặc Acc nhân viên');
 if(type==='Internet'&&idx.netClbh<0)throw Error('File NET thiếu cột CLBH Net Thời điểm hiện tại');
 const seen=new Map();for(const r of raw.slice(headerIdx+1)){const id=esc(r[idx.id]).toUpperCase();if(!id||id==='HOP DONG'||id==='TONG')continue;const created=isoDate(r[idx.created]),date=isoDate(r[idx.date]);if(!created&&!date)continue;const rec={type,id,created,date,staff:esc(r[idx.staff]),customer:idx.customer<0?'':esc(r[idx.customer]),room:idx.room<0?'':esc(r[idx.room]),status:idx.status<0?'':esc(r[idx.status]),package:idx.package<0?'':esc(r[idx.package]),branch:idx.branch<0?'':esc(r[idx.branch]),prepaid:idx.prepaid<0?'':Number(r[idx.prepaid]||0),sourceExcel:idx.source<0?'':esc(r[idx.source]),netClbh:type==='Internet'?esc(r[idx.netClbh]):undefined,vvip:type==='Truyền hình'?/^v\.?vip$/i.test(String(r[7]??'').trim().replace(/\s+/g,'')):undefined};const previous=seen.get(id);if(!previous||(rec.date&&!previous.date)||(rec.date&&previous.date&&rec.date>previous.date)||(!rec.date&&!previous.date))seen.set(id,rec)}
 if(!seen.size)throw Error('File '+fileName+' không có hợp đồng hợp lệ');return [...seen.values()];
}
function updateStatus(){const m=window.IBB5_IMPORT_META,el=$('ibbImportStatus');if(!el)return;if(m?.files){el.textContent=Object.entries(m.files).map(([k,v])=>k+': '+v.count+' HĐ'+(v.name?' ('+v.name+')':'')).join(' · ');}}
const fmtVietnamTime=v=>{if(!v)return '—';const d=new Date(v);if(Number.isNaN(d.getTime()))return '—';return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).format(d)};
function authenticatedUploadAccount(){
 // Only accept a session supplied by an actual authentication integration.
 // IBB5_ROLE and ibbUser are preview controls, NOT authenticated identities.
 try{
   if(window.IBB5_CURRENT_PROFILE)return window.IBB5_CURRENT_PROFILE.acc||window.IBB5_CURRENT_PROFILE.email||'';const auth=window.IBB5_AUTH;
   const session=auth && typeof auth.getSession==='function' ? auth.getSession() : null;
   if(session && session.verified===true && typeof session.acc==='string' && session.acc.trim())return session.acc.trim();
 }catch(e){console.warn('Không thể đọc phiên đăng nhập xác thực:',e)}
 return '';
}
function updateAudit(){const m=window.IBB5_IMPORT_META||{},a=m.audit||{};$('ibbAuditAccount').textContent=a.identityVerified?a.acc:'Chưa xác thực đăng nhập';$('ibbAuditTime').textContent=fmtVietnamTime(a.updated||m.updated);$('ibbAuditFiles').textContent=(a.sources||[]).join(' · ')||'Chưa có thông tin';$('ibbAuditBadge').textContent=(a.updated||m.updated)?'Đã cập nhật thành công':'Chưa có lịch sử cập nhật';$('ibbAuditIdentity').textContent='Chỉ ghi nhận từ phiên đăng nhập xác thực; không lấy mã Acc mô phỏng';}
async function run(){const files=TYPES.map(([input,type])=>({type,file:$(input).files[0]})).filter(v=>v.file),msg=$('ibbImportMessage'),btn=$('ibbImportBtn');if(!files.length){msg.textContent='Chọn ít nhất 1 file .xlsx trước khi cập nhật.';return;}btn.disabled=true;msg.textContent='Đang đọc và kiểm tra '+files.length+' file...';try{
 const parsed=[];for(const x of files){const rows=transform(await parseXlsx(x.file),x.type,x.file.name);parsed.push({...x,rows})}
 const previous=Array.isArray(window.IBB5_IMPORTED_DATA)?window.IBB5_IMPORTED_DATA:DATA;
 const replaced=new Set(parsed.map(x=>x.type));const combined=[...previous.filter(x=>!replaced.has(x.type)),...parsed.flatMap(x=>x.rows)];
 const prior=window.IBB5_IMPORT_META||{};const stamp=new Date().toISOString();const meta={files:{...(prior.files||{})},updated:stamp,audit:{acc:authenticatedUploadAccount()||'Chưa xác thực đăng nhập',identityVerified:!!authenticatedUploadAccount(),updated:stamp,sources:parsed.map(x=>x.type)}};for(const x of parsed)meta.files[x.type]={name:x.file.name,count:x.rows.length,updated:meta.updated,acc:meta.audit.acc};
 if(window.IBB5_SYNC)await window.IBB5_SYNC.snapshot({data:combined,meta},parsed.map(x=>x.type));else localStorage.setItem(STORAGE,JSON.stringify({data:combined,meta}));msg.textContent='Đã cập nhật '+parsed.map(x=>x.type+': '+x.rows.length+' HĐ').join(' · ')+(window.IBB5_SYNC?' lên hệ thống dùng chung.':'')+' Đang làm mới Dashboard...';
 location.reload();
 }catch(e){msg.textContent='Không thể cập nhật: '+e.message+' (dữ liệu cũ vẫn giữ nguyên)';console.error(e);btn.disabled=false;}}
$('ibbImportBtn')?.addEventListener('click',run);updateStatus();updateAudit();
// Date controls are initialized together using the Vietnamese calendar.

})();


// ---- Original script 14 id="price-module-js" ----
(()=>{'use strict';
const $=id=>document.getElementById(id), API='https://apis.fpt.vn/ecp/public', paths={provinces:'/v1/locations/provinces/list',wards:'/v1/locations/wards/list',packages:'/v1.1/packages/list',detail:'/v1.1/packages/get'};
const state={mode:'lookup',provinces:[{id:511,text:'Đà Nẵng'}],wards:[],list:[],compare:[],category:'Tất cả',details:{},selected:null,manual:false,request:0};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>v!==null&&v!==undefined&&v!==''&&Number.isFinite(Number(v))?Number(v).toLocaleString('vi-VN')+'đ':'Chưa rõ';
const setMessage=(t,error=false)=>{$('priceMessage').textContent=t;$('priceMessage').classList.toggle('error',error);};
const setStatus=t=>$('priceStatus').textContent=t;
const envelope=j=>{if(Array.isArray(j))return j;if(j&&j.success===false)throw Error(j.error?.message||'API trả lỗi');if(j&&j.data!=null)return j.data;throw Error('Phản hồi API không đúng định dạng');};
async function post(path,body){let controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);try{let r=await fetch(API+path,{method:'POST',headers:{'Content-Type':'application/json','Accept':'*/*','client-id':'fptvn'},body:JSON.stringify(body),signal:controller.signal,mode:'cors'});if(!r.ok)throw Error('HTTP '+r.status);return envelope(await r.json());}finally{clearTimeout(timeout);}}
const loc=()=>({province_id:Number($('priceProvince').value),ward_id:Number($('priceWard').value)});
const cacheKey=(kind,id)=>'ibb5-price-v2-'+kind+'-'+id;
function cacheGet(key,maxAge){try{let d=JSON.parse(sessionStorage.getItem(key));if(d&&Date.now()-d.t<maxAge)return d.val;}catch(e){}return null;}
function cachePut(key,val){try{sessionStorage.setItem(key,JSON.stringify({t:Date.now(),val}));}catch(e){}}
function fill(id,items,placeholder){let el=$(id);el.replaceChildren();el.add(new Option(placeholder||'Vui lòng lựa chọn',''));(items||[]).forEach(x=>el.add(new Option(x.text,x.id)));el.value='';}
async function provinces(){
  fill('priceProvince',[],'Đang tải tỉnh/thành...');
  fill('priceWard',[],'Chọn tỉnh/thành trước');
  fill('priceWard2',[],'Chọn tỉnh/thành trước');
  try{
    let d=cacheGet(cacheKey('provinces','all'),86400000)||await post(paths.provinces,{address_level:'Level2'});
    if(!Array.isArray(d))throw Error('Danh sách tỉnh không hợp lệ');
    state.provinces=d;cachePut(cacheKey('provinces','all'),d);
    fill('priceProvince',d,'Chọn tỉnh / thành phố');
    setStatus('Chờ chọn khu vực');
    setMessage('Chọn tỉnh/thành phố, sau đó chọn phường/xã để tự động tra giá.');
  }catch(e){
    fill('priceProvince',state.provinces,'Chọn tỉnh / thành phố');
    setStatus('Chưa kết nối');
    setMessage('Không tải được danh sách tỉnh: '+e.message+'. Có thể sử dụng JSON dự phòng.',true);
  }
}
async function wards(){
  const id=$('priceProvince').value;
  const token=++state.request;
  state.list=[];state.compare=[];state.wards=[];render();
  fill('priceWard',[] ,id?'Đang tải phường/xã...':'Chọn tỉnh/thành trước');
  fill('priceWard2',[],id?'Đang tải phường/xã...':'Chọn tỉnh/thành trước');
  if(!id){setStatus('Chờ chọn khu vực');setMessage('Vui lòng chọn tỉnh/thành phố.');return;}
  setStatus('Đang tải phường/xã...');
  try{
    let key=cacheKey('wards',id);
    let d=cacheGet(key,86400000)||await post(paths.wards,{location_id:Number(id),address_level:'Level2'});
    if(!Array.isArray(d))throw Error('Danh sách phường không hợp lệ');
    if(token!==state.request||$('priceProvince').value!==id)return;
    state.wards=d;cachePut(key,d);
    fill('priceWard',d,'Chọn phường / xã');
    fill('priceWard2',d,'Chọn phường / xã so sánh');
    setStatus('Chờ chọn phường/xã');
    setMessage('Đã tải '+d.length+' phường/xã. Chọn phường/xã để tự động tra giá.');
  }catch(e){
    if(token!==state.request)return;
    fill('priceWard',[],'Chưa tải được phường/xã');
    fill('priceWard2',[],'Chưa có dữ liệu');
    setStatus('Lỗi kết nối');
    setMessage('Không tải được danh sách phường/xã: '+e.message+'. Có thể nạp JSON ở mục phía dưới.',true);
  }
}
function bucket(g){let text=((g.name||'')+' '+(g.code||'')).toLowerCase();if(/biz|doanh nghi[eệ]p|super300|super500/.test(text))return 'Doanh nghiệp';if(/camera|combo.*cam/.test(text))return 'Combo Camera';if(/v\.vip|truyền hình|truyen hinh|combo/.test(text))return 'Combo Truyền hình';if(/game|f-game/.test(text))return 'Game thủ';if(/wifi ?7|speedx|lux/.test(text))return 'WiFi 7 / tốc độ cao';if(/meta|sky f[12]|giga f1/.test(text))return 'Gia đình';return 'Internet cá nhân';}
const displayed=()=>state.list.filter(g=>g&&g.type==='internet'&&(state.category==='Tất cả'||bucket(g)===state.category)&&((g.name||'')+' '+(g.code||'')).toLowerCase().includes($('priceSearch').value.trim().toLowerCase())).sort((a,b)=>{const price=x=>{const v=x?.price?.price;return v===null||v===undefined||v===''||!Number.isFinite(Number(v))?Infinity:Number(v)};return price(a)-price(b)||String(a.name||'').localeCompare(String(b.name||''),'vi',{sensitivity:'base'});});
function specs(g){return (g.product_spec_characteristics||[]).map(x=>({name:x.name||'',value:x.value||''}));}
function renderGroups(){let names=['Tất cả',...new Set(state.list.filter(x=>x?.type==='internet').map(bucket))];$('priceGroups').innerHTML=names.map(n=>'<button type="button" class="price-group '+(n===state.category?'active':'')+'" data-group="'+esc(n)+'">'+esc(n)+' ('+(n==='Tất cả'?state.list.filter(x=>x.type==='internet').length:state.list.filter(x=>x.type==='internet'&&bucket(x)===n).length)+')</button>').join('');}
function render(){renderGroups();let list=displayed();if(!state.list.length){$('priceResults').innerHTML='<div class="price-empty">Chưa có dữ liệu giá được tải. Bấm “Làm mới giá” hoặc nạp phản hồi JSON.</div>';return;}
if(state.mode==='compare'){let c=state.compare||[],codes=new Map(c.filter(x=>x.type==='internet').map(x=>[x.code,x]));$('priceResults').innerHTML='<div class="price-comparison"><table><thead><tr><th>Gói cước</th><th>'+esc($('priceWard').selectedOptions[0]?.text||'Phường 1')+'</th><th>'+esc($('priceWard2').selectedOptions[0]?.text||'Phường 2')+'</th><th>Chênh lệch</th></tr></thead><tbody>'+list.map(g=>{let peer=codes.get(g.code),a=Number(g.price?.price),b=Number(peer?.price?.price);return '<tr><td><b>'+esc(g.name)+'</b></td><td>'+money(g.price?.price)+'</td><td>'+(peer?money(peer.price?.price):'Không có gói')+'</td><td class="price-diff">'+(peer&&Number.isFinite(a)&&Number.isFinite(b)?money(Math.abs(a-b))+(a===b?' · Bằng nhau':a>b?' · Phường 1 cao hơn':' · Phường 2 cao hơn'):'—')+'</td></tr>';}).join('')+'</tbody></table></div>';return;}
$('priceResults').innerHTML=list.length?list.map(g=>{let sp=specs(g),pick=(needle)=>sp.find(x=>x.name.toLowerCase().includes(needle))?.value;return '<article class="price-card"><h3>'+esc(g.name)+'</h3><div class="price-amount">'+money(g.price?.price)+' <small>/ tháng</small></div><div class="price-specs"><div><span>Tải xuống</span><b>'+esc(pick('download')||'—')+'</b></div><div><span>Tải lên</span><b>'+esc(pick('upload')||'—')+'</b></div><div><span>Thiết bị kết nối</span><b>'+esc(pick('thiết bị')||'—')+'</b></div></div><div style="font-size:11px;color:#7c8fa4">'+esc(g.tagline||'')+'</div><button type="button" data-detail="'+esc(g.code)+'">Xem chi tiết chính sách ›</button></article>';}).join(''):'<div class="price-empty">Không tìm thấy gói phù hợp với bộ lọc.</div>';
}
async function loadPackages(){let w=$('priceWard').value;if(!w){setMessage('Vui lòng tải và chọn phường/xã trước.',true);return;}let token=++state.request, key=cacheKey('packages',$('priceProvince').value+'-'+w);setStatus('Đang tải giá...');try{let d=cacheGet(key,900000)||await post(paths.packages,{page_size:100,location:loc()});if(!Array.isArray(d))throw Error('Danh sách gói không hợp lệ');if(token!==state.request)return;state.list=d;state.manual=false;state.category='Tất cả';cachePut(key,d);if(state.mode==='compare'){let w2=$('priceWard2').value;if(!w2)throw Error('Chưa chọn phường so sánh');let key2=cacheKey('packages',$('priceProvince').value+'-'+w2);state.compare=cacheGet(key2,900000)||await post(paths.packages,{page_size:100,location:{province_id:loc().province_id,ward_id:Number(w2)}});cachePut(key2,state.compare);}render();setStatus('Đã tải từ API');setMessage('Tìm thấy '+d.filter(x=>x.type==='internet').length+' gói Internet tại '+$('priceWard').selectedOptions[0]?.text+'.');$('priceFetched').textContent='Lấy giá lúc '+new Date().toLocaleTimeString('vi-VN');}catch(e){if(token!==state.request)return;setStatus('Lỗi kết nối');setMessage('Không thể tải giá trực tiếp: '+e.message+'. API có thể chỉ cho phép CORS từ fpt.vn. Hãy nạp JSON hoặc triển khai API proxy được ủy quyền.',true);render();}}
const toUTC=s=>{if(!s)return NaN;if(/Z$|[+-]\d\d:?\d\d$/.test(s))return Date.parse(s);return Date.parse(String(s).replace(' ','T')+'Z');};
function active(p){let now=Date.now(),start=toUTC(p.effective_from),end=toUTC(p.effective_to);return p.status==='active'&&(!Number.isFinite(start)||start<=now)&&(!Number.isFinite(end)||end>=now);}
function policyScore(data,monthly){let arr=(data?.product_offering_price||[]).filter(x=>x.billing_type_name);let n=arr.filter(x=>x.summary?.fee_price?.price!=null).length;let pass=arr.find(x=>String(x.billing_type_name).toLowerCase().includes('sau')&&Number(x.contract_length_months)===1);return [arr.length,n,pass&&monthly?Math.abs(Number(pass.summary?.service_price?.price)-monthly)<1:!!pass];}
async function loadDetail(code){state.selected=code;let g=state.list.find(x=>x.code===code),monthly=Number(g?.price?.price||0),cache=cacheKey('detail',loc().province_id+'-'+loc().ward_id+'-'+code);$('priceDialog').hidden=false;$('priceDetails').innerHTML='<h2>'+esc(g?.name||code)+'</h2><p>Đang lấy chính sách, phí hòa mạng và thanh toán...</p>';try{let best=cacheGet(cache,900000),score=best?policyScore(best,monthly):[0,0,false];if(!best||score[0]===0||score[1]<score[0]||!score[2]){for(let i=0;i<4;i++){let d=await post(paths.detail,{code,location:loc()}),ss=policyScore(d,monthly);if(!best||ss[1]>score[1]||ss[1]===score[1]&&ss[0]>score[0]){best=d;score=ss;}if(ss[0]>0&&ss[1]===ss[0]&&ss[2])break;}}if(!best)throw Error('Không có dữ liệu chính sách');state.details[code]=best;cachePut(cache,best);renderDetail(g,best);}catch(e){$('priceDetails').innerHTML='<h2>'+esc(g?.name||code)+'</h2><p style="color:#bd3a39">Không lấy được chính sách: '+esc(e.message)+'</p><p>Bạn có thể nạp phản hồi JSON của packages/get từ phần nhập JSON để xem chi tiết.</p>';}}
function renderDetail(g,d){let monthly=Number(g?.price?.price),pol=(d.product_offering_price||[]).filter(x=>x.billing_type_name&&active(x)),all=(d.product_offering_price||[]).filter(x=>x.billing_type_name);if(!pol.length)pol=[];let rows=pol.map(x=>{let len=Number(x.contract_length_months),svc=x.summary?.service_price?.price,fee=x.summary?.fee_price?.price,dev=x.summary?.device_price?.price;let avg=Number.isFinite(Number(svc))&&len>0?money(Number(svc)/len):'Chưa rõ',paid=monthly>0&&svc!=null?Number(svc)/monthly:NaN,free=Number.isFinite(paid)&&len>0?Math.max(0,len-paid):NaN;return '<tr><td>'+esc(x.billing_type_name)+'</td><td>'+esc(len||'—')+' tháng</td><td>'+money(svc)+'</td><td>'+avg+'</td><td>'+(Number.isFinite(free)?free.toLocaleString('vi-VN',{maximumFractionDigits:2}):'—')+'</td><td>'+money(fee)+'</td><td>'+money(dev)+'</td></tr>';}).join('');$('priceDetails').innerHTML='<h2>'+esc(g?.name||state.selected)+'</h2><p>Giá niêm yết theo tháng: <b>'+money(g?.price?.price)+'</b> · '+esc($('priceWard').selectedOptions[0]?.text||'')+'</p><p>'+esc(g?.tagline||'')+'</p><div style="overflow:auto"><table class="price-policy-table"><thead><tr><th>Hình thức</th><th>Thời hạn</th><th>Tiền dịch vụ</th><th>Bình quân/tháng</th><th>Tháng tặng (ước tính)</th><th>Phí hòa mạng</th><th>Tiền thiết bị</th></tr></thead><tbody>'+rows+'</tbody></table></div><p>'+(pol.length?'':'Không có chính sách còn hiệu lực được xác nhận.')+' Nếu phí thiếu dữ liệu, hiển thị “Chưa rõ”, không hiểu là miễn phí.</p>';}
function manual(){try{let j=JSON.parse($('priceJson').value),d=envelope(j),type=$('priceJsonType').value;if(type==='provinces'){if(!Array.isArray(d))throw Error('Cần mảng tỉnh');state.provinces=d;fill('priceProvince',d);}else if(type==='wards'){if(!Array.isArray(d))throw Error('Cần mảng phường');state.wards=d;fill('priceWard',d);fill('priceWard2',d);}else if(type==='packages'){if(!Array.isArray(d))throw Error('Cần mảng gói');state.list=d;state.category='Tất cả';render();}else{let g=state.list.find(x=>x.code===state.selected);if(!g)throw Error('Hãy mở một gói cước trước');renderDetail(g,d);$('priceDialog').hidden=false;}state.manual=true;setStatus('Dữ liệu JSON thủ công');setMessage('Đã nhập dữ liệu '+type+' từ JSON thủ công. Không xác nhận đây là giá hiện hành.');}catch(e){setMessage('Không đọc được JSON: '+e.message,true);}}
function boot(){if(!$('priceProvince'))return;document.querySelectorAll('#lookup .price-tab').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;document.querySelectorAll('#lookup .price-tab').forEach(x=>x.classList.toggle('active',x===b));$('priceWard2Wrap').hidden=state.mode!=='compare';render();if(state.mode==='compare'&&$('priceWard').value)loadPackages();if(state.mode==='province')setMessage('Chế độ “Giá cả tỉnh”: hãy chọn từng phường để xem giá chính xác. API không cung cấp bảng giá toàn tỉnh trong một lần gọi.');}));$('priceReload').addEventListener('click',()=>loadPackages());$('priceProvince').addEventListener('change',()=>wards());$('priceWard').addEventListener('change',()=>{state.request++;state.list=[];state.compare=[];render();if($('priceWard').value)loadPackages();});$('priceWard2').addEventListener('change',()=>{if(state.mode==='compare'&&$('priceWard').value)loadPackages();});$('priceSearch').addEventListener('input',render);$('priceGroups').addEventListener('click',e=>{let b=e.target.closest('[data-group]');if(b){state.category=b.dataset.group;render();}});$('priceResults').addEventListener('click',e=>{let b=e.target.closest('[data-detail]');if(b)loadDetail(b.dataset.detail);});$('priceClose').addEventListener('click',()=>{$('priceDialog').hidden=true;});$('priceDialog').addEventListener('click',e=>{if(e.target===$('priceDialog'))$('priceDialog').hidden=true;});$('priceUseJson').addEventListener('click',manual);provinces();}window.addEventListener('pageshow',e=>{if(e.persisted){$('priceProvince').value='';fill('priceWard',[],'Chọn tỉnh/thành trước');fill('priceWard2',[],'Chọn tỉnh/thành trước');state.list=[];state.compare=[];render();setStatus('Chờ chọn khu vực');}});if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();

// ---- Original script 15  ----

/* IBB5 image export. Isolated UI-only feature, does not modify any business calculations. */
(function(){
'use strict';
function toast(msg){let el=document.getElementById('ibbShotToast');if(!el){el=document.createElement('div');el.id='ibbShotToast';el.className='ibb-shot-toast';document.body.appendChild(el);}el.textContent=msg;el.style.display='block';setTimeout(()=>{el.style.display='none';},5000);}
function inlineCopy(source, target){
 if(source.nodeType===1){
  if(source.hasAttribute('data-capture-ui')){target.remove();return;}
  const style=window.getComputedStyle(source);
  for(let i=0;i<style.length;i++){const k=style[i];try{target.style.setProperty(k,style.getPropertyValue(k),style.getPropertyPriority(k));}catch(e){}}
  if(source instanceof HTMLInputElement){target.setAttribute('value',source.value);target.setAttribute('readonly','readonly');}
  if(source instanceof HTMLSelectElement){const idx=source.selectedIndex;Array.from(target.options||[]).forEach((o,i)=>o.selected=(i===idx));}
  if(source.tagName==='CANVAS'){
   try{let img=document.createElement('img');img.src=source.toDataURL('image/png');img.width=source.width;img.height=source.height;target.replaceWith(img);return;}catch(e){}
  }
  if(source.classList.contains('ibb-capture-only-title')){target.style.setProperty('display','block','important');target.style.setProperty('margin','0 0 14px');}
 }
 const ss=Array.from(source.childNodes),tt=Array.from(target.childNodes);
 for(let i=ss.length-1;i>=0;i--) {if(tt[i]) inlineCopy(ss[i],tt[i]);}
}
async function exportPNG(id, filename){
 const node=document.getElementById(id);if(!node)throw new Error('Không tìm thấy khu vực báo cáo');
 await document.fonts.ready;
 const rect=node.getBoundingClientRect(),w=Math.ceil(Math.max(node.scrollWidth,rect.width)),h=Math.ceil(Math.max(node.scrollHeight,rect.height));
 if(!w||!h||w>8000||h>12000)throw new Error('Kích thước khu vực không phù hợp để chụp');
 const clone=node.cloneNode(true);inlineCopy(node,clone);
 clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');
 clone.style.setProperty('width',w+'px','important');clone.style.setProperty('min-height',h+'px','important');clone.style.setProperty('height','auto','important');
 clone.style.setProperty('margin','0','important');clone.style.setProperty('background-color','#ffffff','important');clone.style.setProperty('overflow','visible','important');
 // Avoid duplicate generated/decorative pseudo-elements in SVG export.
 const xml=new XMLSerializer().serializeToString(clone);
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><foreignObject width="100%" height="100%">'+xml+'</foreignObject></svg>';
 const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'});
 const url=URL.createObjectURL(blob);
 try{
  const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('Trình duyệt không hỗ trợ chụp PNG với nội dung hiện tại'));img.src=url;});
  const canvas=document.createElement('canvas');const scale=2;canvas.width=w*scale;canvas.height=h*scale;const ctx=canvas.getContext('2d');ctx.scale(scale,scale);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
  const png=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!png)throw new Error('Không thể xuất ảnh PNG');
  const a=document.createElement('a');const out=URL.createObjectURL(png);a.href=out;a.download=filename+'_'+new Date().toISOString().slice(0,10)+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(out),6000);
 }finally{URL.revokeObjectURL(url);}
}
document.addEventListener('click',async function(e){const btn=e.target.closest('[data-shot]');if(!btn)return;e.preventDefault();if(btn.disabled)return;const old=btn.textContent;btn.disabled=true;btn.textContent='Đang tạo PNG…';try{await exportPNG(btn.dataset.shot,btn.dataset.file);toast('Đã tạo ảnh PNG cho khu vực được chọn.');}catch(err){console.error('IBB5 screenshot error:',err);toast('Không chụp được PNG trong trình duyệt này: '+(err.message||err));}finally{btn.disabled=false;btn.textContent=old;}});
})();


// ---- Original script 16 id="daily-perf-script" ----
/* IBB5: Daily and monthly employee sales/online matrix; existing KPIs untouched. */
(()=>{'use strict';
const el=id=>document.getElementById(id), norm=s=>String(s||'').trim().toLowerCase(), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]||'&quot;')),fmt=n=>Number(n||0).toLocaleString('vi-VN');
const monthEnd=m=>m+'-'+String(new Date(+m.slice(0,4),+m.slice(5),0).getDate()).padStart(2,'0');
const order=['dng.vypv','dng.oanhlth3','dng.chuonghm','dng.nguyentp10','dng.trinp','dng.dathx4','dng.hoantt','dng.nhannt137','dng.namnh170','dng.hoantb6','dng.manlm3','dng.tienna2','dng.hannvn','dng.bachnd7','dng.doanlt4','dng.lanmh2','dng.datbth'];
const root=el('ibbDayPerf');if(!root)return;
let current={};
function fromReportDate(){const base=el('to')?.value||reportDay(),m=base.slice(0,7),end=monthEnd(m);el('dpMonth').value=m;el('dpDay').min=m+'-01';el('dpDay').max=end;el('dpDay').value=base.startsWith(m)?base:end;}
function distinctNet(){const acc=new Map();for(const r of DATA){if(r.type!=='Internet'||!r.id)continue;const key=String(r.id).trim().toUpperCase(),old=acc.get(key);if(!old||(!old.date&&r.date))acc.set(key,r);}return [...acc.values()];}
function calculate(){const m=el('dpMonth').value,day=el('dpDay').value,mode=el('dpView').value,team=el('dpTeam')?.value||'',search=norm(el('dpSearch')?.value||''),room=el('room')?.value||'';
 const max=+monthEnd(m).slice(-2),days=Array.from({length:max},(_,i)=>i+1),people=PERSONNEL.filter(p=>(!team||String(p.team)===team)&&(!search||norm(p.name+' '+p.acc).includes(search))).sort((a,b)=>{if(+a.team!==+b.team)return +a.team-+b.team;const x=order.indexOf(norm(a.acc)),y=order.indexOf(norm(b.acc));return (x<0?999:x)-(y<0?999:y)});
 const persons=new Map(people.map(p=>[norm(p.acc),{...p,team:String(p.team),sold:Array(max).fill(0),online:Array(max).fill(0)}]));
 // Use precisely the same personnel roster and team membership as the main Hiệu suất nhân sự table.
 for(const x of distinctNet()){
  if(room&&x.room!==room)continue;
  const acc=norm(x.staff);if(!acc)continue;const p=persons.get(acc);
  if(!p)continue;
  if(x.created?.slice(0,7)===m&&+x.created.slice(-2)>=1&&+x.created.slice(-2)<=max)p.sold[+x.created.slice(-2)-1]++;
  if(x.date?.slice(0,7)===m&&+x.date.slice(-2)>=1&&+x.date.slice(-2)<=max)p.online[+x.date.slice(-2)-1]++;
 }
 return {m,day,mode,team,search,days,rows:[...persons.values()]};
}
const total=(arr,days)=>({sold:days.map((_,i)=>arr.reduce((s,p)=>s+(p.sold[i]||0),0)),online:days.map((_,i)=>arr.reduce((s,p)=>s+(p.online[i]||0),0))});
function rowHtml(p,mode,idx,days){
 const cell=(kind,value,warn)=>'<td class="dp-'+kind+(warn&&value<1?' dp-below-one':'')+'"'+(warn&&value<1?' title="Chưa có HĐ '+(kind==='sold'?'bán mới':'Online')+' trong ngày"':'')+'>'+value+'</td>';
 if(mode==='day')return cell('sold',p.sold[idx]||0,!!p.acc)+cell('online',p.online[idx]||0,!!p.acc);
 return days.map((day,i)=>{const warn=!!p.acc&&(current.m+'-'+String(day).padStart(2,'0')<=reportDay());return cell('sold',p.sold[i]||0,warn)+cell('online',p.online[i]||0,warn)}).join('');
}
function kpi(title,val,cl=''){return `<div class="dp-kpi ${cl}"><small>${esc(title)}</small><strong>${esc(val)}</strong></div>`}
function render(){
 const v=calculate();current=v;const {m,day,mode,team,search,days,rows}=v;
 el('dpDateWrap').style.display=mode==='day'?'':'none';
 const idx=+day.slice(-2)-1,which=mode==='day'?[idx]:days.map((_,i)=>i);
 const sum=(p,k)=>which.reduce((n,i)=>n+(p[k][i]||0),0);
 const sold=rows.reduce((n,p)=>n+sum(p,'sold'),0),on=rows.reduce((n,p)=>n+sum(p,'online'),0),active=rows.filter(p=>sum(p,'sold')>0).length,activeOnline=rows.filter(p=>sum(p,'online')>0).length;
 const period=mode==='day'?day.split('-').reverse().join('/'):'tháng '+m.slice(5)+'/'+m.slice(0,4);
 const high=days.map((n,i)=>({n,val:rows.reduce((s,p)=>s+p.online[i],0)})).reduce((a,b)=>b.val>a.val?b:a,{n:1,val:0});
 el('dpKpis').innerHTML=kpi('HĐ bán mới · '+period,fmt(sold)+' HĐ','sold')+kpi('HĐ Online · '+period,fmt(on)+' HĐ','online')+kpi(mode==='day'?'Nhân sự có bán mới':'Ngày Online cao nhất',mode==='day'?active+' NV':'Ngày '+high.n+' · '+high.val+' HĐ',mode==='day'?'staff-sold':'')+kpi('Nhân sự có HĐ Online',activeOnline+' NV','staff-online');
 el('dpScope').textContent=(team?'Bầy '+team:'Toàn phòng')+(search?' · đang lọc nhân sự':'')+' · '+period;
 // Only the Acc column is fixed; daily columns scroll horizontally.
 el('dpTableHead').innerHTML='<tr><th class="dp-staff" rowspan="2">Mã Acc</th>'+
  (mode==='day'?`<th colspan="2">NGÀY ${day.split('-').reverse().join('/')}</th>`:days.map(n=>`<th colspan="2">Ngày ${String(n).padStart(2,'0')}</th>`).join(''))+'</tr><tr>'+
  (mode==='day'?'<th>Bán</th><th>Online</th>':days.map(()=>'<th>Bán</th><th>Online</th>').join(''))+'</tr>';
 let body='';const person=p=>`<td class="dp-staff dp-staff-acc-only"><strong>${esc(p.acc||p.name)}</strong></td>`;
 for(const t of team?[team]:['1','2','3']){
  const members=rows.filter(p=>p.team===t);for(const p of members)body+='<tr>'+person(p)+rowHtml(p,mode,idx,days)+'</tr>';
  body+=`<tr class="dp-subtotal"><td class="dp-staff">TỔNG BẦY ${t}</td>`+rowHtml(total(members,days),mode,idx,days)+'</tr>';
 }
 body+=`<tr class="dp-grand"><td class="dp-staff">${team?'TỔNG BẦY '+team:'TỔNG PHÒNG'} (${rows.length} NS)</td>`+rowHtml(total(rows,days),mode,idx,days)+'</tr>';
 el('dpTableBody').innerHTML=body;
 // VISUAL ONLY: explicit column grid prevents browser/zoom from stretching the pinned Mã Acc column.
 const baseDay=mode==='day'?70:50,cols=mode==='day'?2:days.length*2,tableW=146+cols*baseDay;
 el('dpColGroup').innerHTML='<col style="width:146px">'+Array(cols).fill('<col style="width:'+baseDay+'px">').join('');
 el('dpTable').style.width=tableW+'px'; el('dpTable').style.minWidth=tableW+'px';
 el('dpNote').textContent='Cố định cột Mã Acc khi kéo ngang · Cấu trúc Bầy và danh sách nhân sự trùng bảng Hiệu suất nhân sự · Mỗi mã HĐ NET chỉ tính một lần · '+(mode==='day'?'Ngày '+period:'Đủ '+days.length+' ngày trong tháng')+' · Chủ nhật vẫn ghi nhận số bán và Online thực tế.';
}
function exportCSV(){const v=current;const {m,day,mode,team,days,rows}=v;if(!rows)return;
 const table=[mode==='day'?['Bầy','Nhân sự','Mã Acc','Ngày','Bán mới','Online']:['Bầy','Nhân sự','Mã Acc',...days.flatMap(d=>[d+' Bán',d+' Online'])]];
 function push(team,name,acc,r){const idx=+day.slice(-2)-1;table.push(mode==='day'?[team,name,acc,day,r.sold[idx]||0,r.online[idx]||0]:[team,name,acc,...days.flatMap((_,i)=>[r.sold[i]||0,r.online[i]||0])]);}
 for(const t of team?[team]:['1','2','3']){const people=rows.filter(p=>p.team===t);people.forEach(p=>push('Bầy '+t,p.name,p.acc,p));push('Bầy '+t,'TỔNG BẦY '+t,'',total(people,days));}
 push('Tổng',team?'TỔNG BẦY '+team:'TỔNG PHÒNG','',total(rows,days));
 const csv='\ufeff'+table.map(row=>row.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='IBB5_Ban_Online_'+(mode==='day'?day:m)+'.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
fromReportDate();render();
el('dpMonth').addEventListener('change',()=>{const m=el('dpMonth').value;if(!m)return;el('dpDay').min=m+'-01';el('dpDay').max=monthEnd(m);el('dpDay').value=monthEnd(m);render()});
['dpDay','dpView','dpTeam','room'].forEach(id=>el(id)?.addEventListener('change',render));
el('dpSearch')?.addEventListener('input',render);
el('to')?.addEventListener('change',()=>{fromReportDate();render()});
el('dpExport').addEventListener('click',exportCSV);
window.addEventListener('storage',render);
window.IBB5_RENDER_DAILY_PERFORMANCE=render;
})();


// ---- Original script 17 id="ibbc-report-script" ----

/* HD Huy dashboard: presentation-only add-on; reads original NET DATA and pending-contract localStorage. */
(()=>{'use strict';
const $=id=>document.getElementById(id),root=$('cancelled');if(!root)return;
const storeKey='ibb5_pending_followup_v1';
const norm=s=>String(s??'').trim().toLocaleLowerCase('vi-VN');
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const whole=n=>Number(n||0).toLocaleString('vi-VN');
const isCancelled=s=>['hủy','huỷ'].includes(norm(s));
const datestr=s=>typeof s==='string'&&/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(s);
const ORDER=['dng.vypv','dng.oanhlth3','dng.chuonghm','dng.nguyentp10','dng.trinp','dng.dathx4','dng.hoantt','dng.nhannt137','dng.namnh170','dng.hoantb6','dng.manlm3','dng.tienna2','dng.hannvn','dng.bachnd7','dng.doanlt4','dng.lanmh2','dng.datbth'];
let current=null;
function getNotes(){if(window.IBB5_PENDING_NOTES)return window.IBB5_PENDING_NOTES;try{const obj=JSON.parse(localStorage.getItem(storeKey)||'{}');return obj&&typeof obj==='object'?obj:{}}catch(e){return {}}}
function netRows(){const uniq=new Map();for(const r of DATA){if(r?.type!=='Internet'||!r.id)continue;const id=String(r.id).trim().toUpperCase();uniq.set(id,r)}return [...uniq.entries()].map(([id,r])=>({...r,id}));}
function roster(){return PERSONNEL.slice().filter(p=>p.acc).sort((a,b)=>{
  const ta=Number(a.team)||99,tb=Number(b.team)||99;if(ta!==tb)return ta-tb;
  const ia=ORDER.indexOf(norm(a.acc)),ib=ORDER.indexOf(norm(b.acc));return (ia<0?999:ia)-(ib<0?999:ib);
});}
function getYears(){const years=new Set([new Date().getFullYear(),Number(($('to')?.value||reportDay().slice(0,7)).slice(0,4))]);for(const x of netRows()){const y=Number((x.created||'').slice(0,4));if(y>=2020&&y<=2100)years.add(y)}return [...years].sort((a,b)=>b-a)}
function refreshYears(){const e=$('ibbcYear'),old=e.value,ys=getYears();e.innerHTML=ys.map(y=>`<option value="${y}">${y}</option>`).join('');const follow=Number(($('to')?.value||'').slice(0,4));e.value=ys.includes(Number(old))?old:ys.includes(follow)?String(follow):String(ys[0]);}
function build(){const year=Number($('ibbcYear').value),team=$('ibbcTeam').value,ns=getNotes(),all=netRows(),people=roster(),allMap=new Map(people.map(p=>[norm(p.acc),p]));
 const visible=people.filter(p=>!team||String(p.team)===team);
 const rows=new Map(visible.map(p=>[norm(p.acc),{acc:p.acc,team:String(p.team),sold:Array(12).fill(0),cancel:Array(12).fill(0)}]));
 const notMapped={acc:'KHÔNG KHỚP MÃ ACC',team:'?',sold:Array(12).fill(0),cancel:Array(12).fill(0)};
 let invalidMonth=0,unmatched=0,yearCancellations=0;
 for(const r of all){const n=ns[r.id]||ns[String(r.id||'').trim()]||{},cancelled=isCancelled(n.result),acc=norm(r.staff),p=allMap.get(acc);
  if(!datestr(r.created)){if(cancelled)invalidMonth++;continue;}
  if(Number(r.created.slice(0,4))!==year)continue;
  const ix=Number(r.created.slice(5,7))-1;if(ix<0||ix>=12)continue;
  if(team && String(p?.team)!==team)continue;
  const entry=rows.get(acc)||(!team?notMapped:null);if(!entry)continue;
  if(!p)unmatched++;
  entry.sold[ix]++;
  if(cancelled){entry.cancel[ix]++;yearCancellations++;}
 }
 return {year,team,rows,visible,notMapped,unmatched,invalidMonth,yearCancellations};
}
function aggregated(rs){return {sold:Array.from({length:12},(_,i)=>rs.reduce((s,x)=>s+x.sold[i],0)),cancel:Array.from({length:12},(_,i)=>rs.reduce((s,x)=>s+x.cancel[i],0))};}
const nsum=arr=>arr.reduce((s,x)=>s+x,0);
const rate=(n,d)=>d>0?formatPercent(n/d*100):'—';
const fmtValue=(r,i,kind)=>kind==='count'?whole(r.cancel[i]):rate(r.cancel[i],r.sold[i]);
const fmtTotal=(r,kind)=>kind==='count'?whole(nsum(r.cancel)):rate(nsum(r.cancel),nsum(r.sold));
function renderOne(kind,v){
  const head=$(kind==='count'?'ibbcCountHead':'ibbcRateHead'),body=$(kind==='count'?'ibbcCountBody':'ibbcRateBody');
  head.innerHTML='<tr><th class="ibbc-team-head" rowspan="2">Bầy</th><th class="ibbc-acc-head" rowspan="2">Mã Acc</th><th class="ibbc-superhead" colspan="12">'+(kind==='count'?'Số lượng HĐ Hủy':'Tỷ lệ HĐ Hủy')+' · '+v.year+'</th><th rowspan="2" class="ibbc-total">Tổng năm</th></tr><tr>'+Array.from({length:12},(_,i)=>`<th class="ibbc-month">Tháng ${i+1}</th>`).join('')+'</tr>';
  const groupNums=v.team?[v.team]:['1','2','3'];let html='',exportRows=[];
  const vrow=(r)=>r.cancel.map((_,i)=>`<td class="ibbc-month ${kind==='count'&&r.cancel[i]?'ibbc-cancel-val':''}">${fmtValue(r,i,kind)}</td>`).join('')+`<td class="ibbc-total">${fmtTotal(r,kind)}</td>`;
  const exportRow=(t,acc,r)=>{exportRows.push([t,acc,...r.cancel.map((_,i)=>fmtValue(r,i,kind)),fmtTotal(r,kind)]);};
  for(const t of groupNums){const people=v.visible.filter(p=>String(p.team)===t),rr=people.map(p=>v.rows.get(norm(p.acc))).filter(Boolean),sum=aggregated(rr);
    people.forEach((p,i)=>{const r=v.rows.get(norm(p.acc));html+=`<tr>${i===0?`<td class="ibbc-team" rowspan="${people.length}">Bầy ${safe(t)}</td>`:''}<td class="ibbc-acc">${safe(p.acc)}</td>${vrow(r)}</tr>`;exportRow('Bầy '+t,p.acc,r)});
    html+=`<tr class="ibbc-subtotal"><td class="ibbc-merged" colspan="2">TỔNG BẦY ${safe(t)}</td>${vrow(sum)}</tr>`;exportRow('Bầy '+t,'TỔNG BẦY '+t,sum);
  }
  // Bỏ dòng "CHƯA KHỚP ACC" ở cả 2 bảng và file CSV.
  // Vẫn giữ bản ghi chưa khớp trong tổng phòng để không thay đổi số liệu/công thức.
  const totals=aggregated([...v.rows.values(),...(!v.team?[v.notMapped]:[])]);
  html+=`<tr class="ibbc-grand"><td colspan="2" class="ibbc-merged">${v.team?'TỔNG BẦY '+v.team:'TỔNG PHÒNG'}</td>${vrow(totals)}</tr>`;
  exportRow(v.team?'Bầy '+v.team:'Toàn phòng',v.team?'TỔNG BẦY '+v.team:'TỔNG PHÒNG',totals);
  body.innerHTML=html;return {totals,exportRows};
}
function render(){if(!$('ibbcYear')?.value)return;const v=build();
  const count=renderOne('count',v),rateTab=renderOne('rate',v),total=count.totals;
  $('ibbcCount').textContent=whole(nsum(total.cancel));$('ibbcNet').textContent=whole(nsum(total.sold));$('ibbcRate').textContent=rate(nsum(total.cancel),nsum(total.sold));
  $('ibbcStaff').textContent=whole([...v.rows.values()].filter(x=>nsum(x.cancel)>0).length);
  let warning=[];if(v.invalidMonth)warning.push(whole(v.invalidMonth)+' HĐ có Kết quả Hủy nhưng thiếu Ngày tạo hợp lệ nên chưa thể phân tháng');
  if(v.unmatched&&!v.team)warning.push(whole(v.unmatched)+' HĐ NET có mã Acc chưa nằm trong danh sách nhân sự; vẫn được tính vào TỔNG PHÒNG nhưng không hiển thị thành dòng riêng');
  $('ibbcMissing').hidden=!warning.length;$('ibbcMissing').textContent=warning.join(' · ');
  current={...v,countRows:count.exportRows,rateRows:rateTab.exportRows};
}
function exportFile(kind){if(!current)return;const rows=kind==='count'?current.countRows:current.rateRows,heading=['Bầy','Mã Acc',...Array.from({length:12},(_,i)=>'Tháng '+(i+1)),'Tổng năm'];
const csv='\ufeff'+[heading,...rows].map(arr=>arr.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='IBB5_HD_Huy_'+(kind==='count'?'So_Luong_':'Ty_Le_')+current.year+(current.team?'_Bay_'+current.team:'')+'.csv';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
}
refreshYears();render();
['ibbcYear','ibbcTeam'].forEach(id=>$(id).addEventListener('change',render));
$('ibbcRefresh').addEventListener('click',render);
root.querySelectorAll('[data-ibbc-export]').forEach(b=>b.addEventListener('click',()=>exportFile(b.dataset.ibbcExport)));
// Same-page save in HD Ton updates localStorage before this document-level click listener runs.
document.addEventListener('click',e=>{if(e.target.closest('#pendRows .p-save'))render()});
window.addEventListener('storage',e=>{if(!e.key||e.key===storeKey||e.key==='ibb5_three_source_snapshot_v1')render()});
document.addEventListener('click',e=>{if(e.target.closest('a[href="#cancelled"]')){refreshYears();render();}});
window.IBB5_RENDER_CANCELLED_REPORT=render;
})();


// ---- Original script 18 id="ibb-contact-directory" ----
(function(){'use strict';
const DATA=CONTACT_DATA;
const $=id=>document.getElementById(id),norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const phonelink=p=>{const digits=String(p||'').replace(/[^0-9+]/g,'');return /^\+?\d{9,13}$/.test(digits)?'<a href="tel:'+digits+'">'+esc(p)+'</a>':esc(p)};
const maillink=m=>/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m)?'<a href="mailto:'+encodeURIComponent(m)+'">'+esc(m)+'</a>':esc(m);
if(!$('ctRows'))return;
function render(){const q=norm($('ctSearch').value);const rows=DATA.filter(r=>!q||norm([r.group,r.section,r.sheet].join(' ')).includes(q));
$('ctCount').textContent='Hiển thị '+rows.length.toLocaleString('vi-VN')+' / '+DATA.length.toLocaleString('vi-VN')+' liên hệ TIN';
$('ctRows').innerHTML=rows.map(r=>'<tr><td>'+esc(r.name)+'</td><td>'+esc(r.group)+'</td><td>'+esc(r.role)+'</td><td>'+phonelink(r.phone)+'</td><td>'+esc(r.ext)+'</td><td>'+maillink(r.email)+'</td><td>'+esc(r.note)+'</td></tr>').join('')||'<tr><td colspan="7">Không tìm thấy chi nhánh phù hợp.</td></tr>';
}
$('ctSearch').addEventListener('input',render);render();
})();

// Every device starts on today's Vietnamese calendar date, independent of data age.
for(const id of ['from','to','ckMonth','anaMonth','anaDay','pendAsOf','pendDailyDate','psDay','dpMonth','dpDay']){const input=document.getElementById(id);if(!input)continue;input.value=input.type==='month'?reportDay().slice(0,7):id==='from'?reportDay().slice(0,7)+'-01':reportDay();input.dispatchEvent(new Event('change',{bubbles:true}));}
document.addEventListener('ibb5-shared-updated',()=>{commitDB=window.IBB5_SHARED_STATE.commitments;refreshCommitUI();perfRender();update();window.dispatchEvent(new Event('storage'));});
window.IBB5_MONTHLY_TARGET=(month,acc)=>getCommit(month,'__ALL__').staff[acc]??null;
