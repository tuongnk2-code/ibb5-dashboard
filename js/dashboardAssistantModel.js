import { reportDay, shiftDay, validDay } from './dailyReportModel.js';
import { weeklyPeriod } from './weeklyReportModel.js';
import { dailyPerformanceContracts } from './dailyPerformanceModel.js';
import { isTerminatedNetContract } from './cancellationArchive.js';
import { includeInDashboardReports } from './reportScope.js';
import { STAFF_ROSTER } from './staffRoster.js';
import { validateNote } from './dashboardStateModel.js';

export const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().trim();
const same = (a,b) => normalize(a) === normalize(b);
const unique = rows => [...new Map(rows.map(row=>[row.type+':'+String(row.id).toUpperCase(),row])).values()];
const between = (day,start,end) => validDay(day) && day >= start && day <= end;
export const NOTE_FIELDS = ['expected','timeSlot','action','result','source','cancelReason'];
export const NOTE_LABELS = {expected:'Ngày Online dự kiến',timeSlot:'Mốc hẹn Online',action:'Nguyên nhân hẹn',result:'Kết quả nhân viên cập nhật',source:'Nguồn thông tin',cancelReason:'Lý do hủy/dự kiến hủy'};
export function assistantScope(question, scope = {}, today = reportDay()) {
  const q=normalize(question), result={period:scope.period||'month',anchor:validDay(scope.anchor)?scope.anchor:today,team:scope.team||'',staff:scope.staff||''};
  if (/hom nay/.test(q)) Object.assign(result,{period:'day',anchor:today});
  else if (/hom qua/.test(q)) Object.assign(result,{period:'day',anchor:shiftDay(today,-1)});
  else if (/tuan truoc/.test(q)) Object.assign(result,{period:'week',anchor:shiftDay(today,-7)});
  else if (/tuan nay/.test(q)) Object.assign(result,{period:'week',anchor:today});
  else if (/thang truoc/.test(q)) Object.assign(result,{period:'month',anchor:shiftDay(today.slice(0,7)+'-01',-1)});
  else if (/thang nay/.test(q)) Object.assign(result,{period:'month',anchor:today});
  const month=q.match(/thang\s+(\d{1,2})(?:\/(\d{4}))?\b/);
  if(month){const day=(month[2]||today.slice(0,4))+'-'+month[1].padStart(2,'0')+'-01';if(!validDay(day))throw new Error('Tháng không hợp lệ.');Object.assign(result,{period:'month',anchor:day});}
  const date=q.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
  if(date&&!/doi|sua|cap nhat|hen/.test(q)){const day=date[3]+'-'+date[2].padStart(2,'0')+'-'+date[1].padStart(2,'0');if(!validDay(day))throw new Error('Ngày không hợp lệ.');result.anchor=day;}
  const team=q.match(/bay\s*([123])\b/);if(team)result.team=team[1];
  if(/toan phong/.test(q)){result.team='';result.staff='';}
  const person=STAFF_ROSTER.find(p=>q.includes(normalize(p.acc)));if(person)result.staff=person.acc;
  return result;
}
export function assistantReport(data,{scope={},notes={},canView=()=>false,today=reportDay(),now=Date.now(),commitments={}}={}){
  const anchor=validDay(scope.anchor)?scope.anchor:today;
  let start=anchor,end=anchor;
  if(scope.period==='week'){const week=weeklyPeriod(anchor,today);start=week.start;end=week.end;}
  else if(scope.period!=='day'){start=anchor.slice(0,7)+'-01';end=new Date(Date.UTC(+anchor.slice(0,4),+anchor.slice(5,7),0)).toISOString().slice(0,10);}
  const asOf=end<today?end:today, future=start>today;
  const view=row=>canView(row)&&(!scope.staff||same(scope.staff,row.staff))&&(!scope.team||STAFF_ROSTER.some(p=>same(p.acc,row.staff)&&String(p.team)===String(scope.team)));
  const source=unique(data.filter(includeInDashboardReports).filter(view));
  const net=dailyPerformanceContracts(source,notes);
  const inPeriod=field=>row=>!future&&between(row[field],start,asOf);
  const pending=future?[]:net.filter(row=>validDay(row.created)&&row.created<=asOf&&(!validDay(row.date)||row.date>asOf));
  const groups={sold:net.filter(inPeriod('created')),online:net.filter(inPeriod('date')),camera:source.filter(row=>row.type==='Camera'&&inPeriod('date')(row)),vvip:source.filter(row=>row.type==='Truyền hình'&&row.vvip===true&&inPeriod('date')(row)),pending,
    aged:pending.filter(row=>row.created<shiftDay(asOf,-7)),overdue:pending.filter(row=>validDay(notes[row.id]?.expected)&&notes[row.id].expected<asOf),missing:pending.filter(row=>!validDay(notes[row.id]?.expected)),stale:pending.filter(row=>{const updated=Date.parse(notes[row.id]?.updated);return Number.isFinite(updated)&&now-updated>3*86400000;})};
  const people=new Map(STAFF_ROSTER.filter(p=>view({staff:p.acc})).map(p=>[normalize(p.acc),p]));
  net.forEach(row=>{if(!people.has(normalize(row.staff)))people.set(normalize(row.staff),{acc:row.staff||'Chưa gán',team:0});});
  const staff=[...people.values()].map(p=>{
    const counts=Object.fromEntries(Object.entries(groups).map(([kind,rows])=>[kind,rows.filter(row=>same(row.staff,p.acc)).length]));
    const target=commitments[anchor.slice(0,7)]?.__ALL__?.staff?.[p.acc];
    const monthlyOnline=net.filter(row=>same(row.staff,p.acc)&&between(row.date,anchor.slice(0,7)+'-01',asOf)).length;
    return {...p,...counts,target:target?.status==='approved'?target.value:null,monthlyOnline};
  }).sort((a,b)=>b.online-a.online||a.acc.localeCompare(b.acc));
  const channels=new Map();groups.sold.forEach(row=>{const channel=notes[row.id]?.source||row.sourceExcel;if(channel)channels.set(channel,(channels.get(channel)||0)+1);});
  const duration=Math.max(0,Math.round((Date.parse(asOf)-Date.parse(start))/86400000)+1),previousStart=shiftDay(start,-duration),previousEnd=shiftDay(start,-1);
  const previous=future?[]:net.filter(row=>between(row.date,previousStart,previousEnd));
  return {start,end,asOf,future,source,groups,staff,channels:[...channels].sort((a,b)=>b[1]-a[1]),previous,change:groups.online.length-previous.length};
}
export function findAssistantContracts(data,query,canView=()=>false){
  const q=normalize(query).replace(/^(?:(?:tim|tra cuu|hop dong|hd)\s+)+/,'');
  const rows=unique(data.filter(includeInDashboardReports).filter(canView)),exact=rows.filter(row=>normalize(row.id)===q);
  return (exact.length?exact:rows.filter(row=>[row.id,row.staff,row.customer].some(value=>normalize(value).includes(q)))).slice(0,100);
}
export function draftAssistantUpdate(row,note,patch,revision=0){
  if(!row||row.type!=='Internet')throw new Error('Chỉ cập nhật thông tin theo dõi HĐ NET.');
  if(isTerminatedNetContract(row)||note?.cancellationApproved)throw new Error('HĐ đã chấm dứt hoặc đã duyệt hủy; không thể sửa qua trợ lý.');
  const before=Object.fromEntries(NOTE_FIELDS.map(field=>[field,String(note?.[field]||'')]));
  const after={...before};for(const field of NOTE_FIELDS)if(patch[field]!==undefined)after[field]=String(patch[field]);
  return {id:row.id,before,after,revision};
}
export function validateAssistantDraft(draft,latestNote,latestRevision){
  if(draft.revision!==latestRevision||NOTE_FIELDS.some(field=>String(latestNote?.[field]||'')!==draft.before[field]))throw new Error('HĐ đã được cập nhật ở nơi khác. Vui lòng tạo lại bản nháp từ dữ liệu mới.');
  if(latestNote?.cancellationApproved)throw new Error('HĐ đã được duyệt hủy.');
  return validateNote(draft.after);
}
export function parseAssistantPatch(text,today=reportDay()){
  const q=normalize(text),patch={};
  const iso=text.match(/\b\d{4}-\d{2}-\d{2}\b/),date=text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
  if(iso)patch.expected=iso[0];else if(date)patch.expected=(date[3]||today.slice(0,4))+'-'+date[2].padStart(2,'0')+'-'+date[1].padStart(2,'0');
  if(patch.expected&&!validDay(patch.expected))throw new Error('Ngày hẹn không hợp lệ.');
  for(const [pattern,slot] of [[/15h30\s*[-–]\s*17h30/,'15h30 - 17h30'],[/13h30\s*[-–]\s*15h30/,'13h30 - 15h30'],[/10h\s*[-–]\s*12h/,'10h - 12h'],[/8h\s*[-–]\s*10h/,'8h - 10h']])if(pattern.test(q))patch.timeSlot=slot;
  if(/du kien huy/.test(q))patch.result='Dự Kiến Hủy';else if(/chua online/.test(q))patch.result='Chưa Online';else if(/da online/.test(q))patch.result='Đã Online';else if(/\bhuy\b/.test(q))patch.result='Hủy';
  for(const [label,field] of [['nguon','source'],['nguyen nhan','action'],['ly do huy','cancelReason']]){
    const match=q.match(new RegExp(label+'\\s*:\\s*([^;\\n]+)'));
    if(match){const index=match.index+match[0].indexOf(match[1]);patch[field]=text.slice(index,index+match[1].length).trim();}
  }
  return patch;
}
