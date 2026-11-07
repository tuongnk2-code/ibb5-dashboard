import test from 'node:test';
import assert from 'node:assert/strict';
import { scheduledOnlineContracts } from '../js/pendingScheduleModel.js';

test('seven appointments become five when final and planned cancellations are excluded',()=>{
  const data=Array.from({length:7},(_,i)=>({id:'N'+i,type:'Internet',created:'2026-11-01',date:''}));
  const notes=Object.fromEntries(data.map(r=>[r.id,{expected:'2026-11-07',result:'Chưa Online'}]));
  notes.N5.result='Hủy';notes.N6.result='Dự Kiến Hủy';
  assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').map(r=>r.id),['N0','N1','N2','N3','N4']);
  notes.N0.cancellationApproved=true;
  assert.equal(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').length,4);
});

test('schedule counts only distinct pending NET, at the cutoff, on the selected appointment day',()=>{
  const base={id:'A',type:'Internet',created:'2026-11-01',date:''};
  const data=[base,base,{...base,id:'ONLINE',date:'2026-11-07'},{...base,id:'FUTURE',created:'2026-11-08'},{...base,id:'CAM',type:'Camera'},{...base,id:'OTHERDAY'},{...base,id:'MISSING'}];
  const notes=Object.fromEntries(data.map(r=>[r.id,{expected:'2026-11-07'}]));notes.OTHERDAY.expected='2026-11-08';delete notes.MISSING;
  assert.deepEqual(scheduledOnlineContracts(data,notes,'2026-11-07','2026-11-07').map(r=>r.id),['A']);
  assert.equal(scheduledOnlineContracts(data,notes,'2026-11-07','').length,0);
});
