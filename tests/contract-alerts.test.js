import test from 'node:test';
import assert from 'node:assert/strict';
import {contractAlerts} from '../js/contractAlertModel.js';
import {canSeeReport} from '../js/dailyReportModel.js';
const day='2026-11-21',now=Date.parse(day+'T13:00:00+07:00');
const note={result:'Chưa Online',action:'Chờ lắp',source:'Web',expected:'2026-11-20',timeSlot:'8h - 10h',updated:'2026-11-17T10:00:00+07:00'};
const row=(id,extra={})=>({id,type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:'',status:'Bình thường',...extra});
test('warnings scope and deduplicate latest NET records; exclude approved and completed contracts',()=>{
 const rows=[row('A'),row('A'),row('B'),row('C',{date:'2026-11-20'}),row('D'),row('OTHER',{staff:'DNG.Vypv'}),row('FUTURE',{created:'2026-11-22'}),row('CAM',{type:'Camera'}),row('PAYROLL',{created:'2026-08-02'}),row('OLD_CANCEL',{created:'2026-10-02',status:'Đã chấm dứt hợp đồng'}),row('TRANSFER'),row('TRANSFER',{staff:'DNG.Vypv'})];
 const notes={A:{...note},B:{},C:{...note,result:'Đã Online'},D:{...note,cancellationApproved:true}};
 const staff={id:'me',role:'staff',acc:'DNG.ManLM3'},canView=r=>canSeeReport(staff,{id:r.staff===staff.acc?'me':'other',acc:r.staff,role:'staff'});
 const result=contractAlerts({rows,notes,canView,asOf:day,now});
 assert.deepEqual(result.groups.overdue.map(r=>r.id),['A']);assert.deepEqual(result.groups.incomplete.map(r=>r.id),['B']);assert.deepEqual(result.groups.stale.map(r=>r.id),['A']);assert.deepEqual(result.groups.aged.map(r=>r.id),['A','B']);assert.equal(result.total,2);
 assert.equal(contractAlerts({rows,notes,asOf:day,now}).total,0);
 notes.A={...note,expected:'2026-11-22',updated:day+'T12:00:00+07:00'};rows[0].created='2026-11-20';rows[1].created='2026-11-20';notes.B={...note,result:'Đã Online'};rows.find(r=>r.id==='B').date='2026-11-21';
 assert.equal(contractAlerts({rows,notes,canView,asOf:day,now}).total,0);
});
test('today missed slots require NET refresh; stale and seven-day thresholds are strict; processing remains actionable',()=>{
 const rows=[row('TODAY',{created:day}),row('SEVEN',{created:'2026-11-14'}),row('CANCEL'),row('REQ',{date:'2026-11-20'})];
 const notes={TODAY:{...note,expected:day,updated:day+'T09:00:00+07:00'},SEVEN:{...note,expected:'2026-11-22',updated:'2026-11-18T13:00:00+07:00'},CANCEL:{...note,result:'Hủy',cancelReason:'Khách đổi ý'},REQ:{...note,result:'Hủy',cancelReason:'Chờ xử lý',processingRequestedAt:'2026-11-17T10:00:00+07:00'}};
 let result=contractAlerts({rows,notes,canView:()=>true,asOf:day,now,netUpdatedAt:day+'T09:00:00+07:00'});assert.equal(result.groups.overdue.length,0);assert.equal(result.groups.aged.length,0);assert.deepEqual(result.groups.stale.map(r=>r.id),['REQ']);
 result=contractAlerts({rows,notes,canView:()=>true,asOf:day,now,netUpdatedAt:day+'T11:00:00+07:00'});assert.deepEqual(result.groups.overdue.map(r=>r.id),['TODAY']);
});
test('already Online but incomplete follow-ups warn only about missing updates',()=>{
 const rows=[row('ONLINE',{date:'2026-11-20'})],notes={ONLINE:{result:'Đã Online'}};
 const result=contractAlerts({rows,notes,canView:()=>true,asOf:day,now});
 assert.equal(result.groups.incomplete.length,1);assert.equal(result.groups.overdue.length,0);assert.equal(result.groups.stale.length,0);assert.equal(result.groups.aged.length,0);
});
