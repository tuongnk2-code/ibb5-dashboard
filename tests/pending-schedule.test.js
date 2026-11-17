import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledOnlineContracts, scheduledAppointmentStatus, latestNetUpdate } from '../js/pendingScheduleModel.js';

test('seven appointments become five when final and planned cancellations are excluded',()=>{
  const data=Array.from({length:7},(_,i)=>({id:'N'+i,type:'Internet',created:'2026-11-01',date:''}));
  const notes=Object.fromEntries(data.map(r=>[r.id,{expected:'2026-11-07',result:'Chưa Online'}]));
  notes.N5.result='Hủy';notes.N6.result='Dự Kiến Hủy';
  assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').map(r=>r.id),['N0','N1','N2','N3','N4']);
  notes.N0.cancellationApproved=true;
  assert.equal(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').length,4);
});
test('missed slots require Vietnamese end time and a newer NET refresh, not Camera refresh',()=>{
 const day='2026-11-17',note={expected:day,timeSlot:'13h30 - 15h30'},end=Date.parse(day+'T15:30:00+07:00');
 assert.deepEqual(scheduledAppointmentStatus(note,day,new Date(end).toISOString(),end),{overdue:false,awaitingRefresh:false});
 assert.deepEqual(scheduledAppointmentStatus(note,day,new Date(end).toISOString(),end+1),{overdue:false,awaitingRefresh:true});
 assert.equal(scheduledAppointmentStatus(note,day,new Date(end+1).toISOString(),end+2).overdue,true);
 assert.equal(scheduledAppointmentStatus(note,day,'',end+2).awaitingRefresh,true);
 assert.equal(scheduledAppointmentStatus(note,day,new Date(end+100).toISOString(),end+2).overdue,false);
 assert.equal(scheduledAppointmentStatus({...note,timeSlot:''},day,'',end+2).awaitingRefresh,false);
 assert.equal(latestNetUpdate({files:{Internet:{updated:'NET'},Camera:{updated:'CAM'}},audit:{sources:['Camera'],updated:'CAM'}}),'NET');
 assert.equal(latestNetUpdate({audit:{sources:['Camera'],updated:'CAM'}}),'');assert.equal(latestNetUpdate(null),'');
});
test('overdue pending appointments stay in display rows, but leave remaining KPI and totals',()=>{
 const data=['MISSED','WAIT','UNSLOTTED','ONLINE'].map(id=>({id,type:'Internet',created:'2026-11-01',date:id==='ONLINE'?'2026-11-17':''}));
 const notes=Object.fromEntries(data.map(row=>[row.id,{expected:'2026-11-17',timeSlot:row.id==='WAIT'?'15h30 - 17h30':row.id==='UNSLOTTED'?'':'8h - 10h'}]));
 const options={now:Date.parse('2026-11-17T14:00:00+07:00'),netUpdatedAt:'2026-11-17T13:00:00+07:00'};
 assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-17','2026-11-17',options).map(r=>r.id),['WAIT','UNSLOTTED']);
 assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-17','2026-11-17',{...options,includeOverdue:true}).map(r=>r.id),['MISSED','WAIT','UNSLOTTED']);
 assert.equal(scheduledOnlineContracts(data,notes,'2026-11-17','2026-11-17',{...options,netUpdatedAt:'2026-11-17T09:00:00+07:00'}).length,3);
});

test('schedule counts only distinct pending NET, at the cutoff, on the selected appointment day',()=>{
  const base={id:'A',type:'Internet',created:'2026-11-01',date:''};
  const data=[base,base,{...base,id:'ONLINE',date:'2026-11-07'},{...base,id:'FUTURE',created:'2026-11-08'},{...base,id:'CAM',type:'Camera'},{...base,id:'OTHERDAY'},{...base,id:'MISSING'}];
  const notes=Object.fromEntries(data.map(r=>[r.id,{expected:'2026-11-07'}]));notes.OTHERDAY.expected='2026-11-08';delete notes.MISSING;
  assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').map(r=>r.id),['A']);
  assert.equal(scheduledOnlineContracts(data,notes,'2026-11-07','').length,0);
});
