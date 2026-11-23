import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingFollowupContracts, agedFollowupContracts } from '../js/pendingInventory.js';

test('follow-up inventory includes Online missing updates and excludes approved cancellations', () => {
  const row = (id, fields = {}) => ({id, type:'Internet', created:'2026-11-01', date:'', ...fields});
  const rows = [row('WAIT'),row('WAIT'),row('FUTUREONLINE',{date:'2026-11-19'}),row('ONLINETODAY',{date:'2026-11-18'}),row('ONLINEBEFORE',{date:'2026-11-17'}),row('TERMINATED',{status:'Đã chấm dứt hợp đồng'}),row('CANCELLED',{status:'Đã hủy'}),row('SOURCECANCEL',{status:'Huỷ'}),row('APPROVED'),row('NOTECANCEL'),row('PLANNED'),row('STAFFONLINE'),row('NEW',{created:'2026-11-19'}),row('INVALID',{created:''}),row('CAM',{type:'Camera'}),row('')];
  const notes = {APPROVED:{cancellationApproved:true},NOTECANCEL:{result:'Hủy'},PLANNED:{result:'Dự kiến hủy'},STAFFONLINE:{result:'Đã Online'}};
  assert.deepEqual(pendingFollowupContracts(rows, notes, '2026-11-18').map(row=>row.id),['WAIT','FUTUREONLINE','ONLINETODAY','ONLINEBEFORE','TERMINATED','CANCELLED','SOURCECANCEL','NOTECANCEL','PLANNED','STAFFONLINE']);
  // A later source record replaces an older duplicate before eligibility is checked.
  const filled={expected:'2026-11-18',timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web'};
  assert.equal(pendingFollowupContracts([row('WAIT'),row('WAIT',{date:'2026-11-18'})],{WAIT:filled},'2026-11-18').length,0);
  assert.equal(pendingFollowupContracts(rows, notes, '').length,0);
});

test('aged follow-up uses strictly more than seven calendar days and the same eligibility', () => {
 const row=(id,created,date='')=>({id,created,date,type:'Internet'});
 const rows=[row('SEVEN','2026-11-11'),row('EIGHT','2026-11-10'),row('APPROVED','2026-11-01'),row('INCOMPLETE','2026-11-01','2026-11-18'),row('COMPLETE','2026-11-01','2026-11-18')];
 const notes={APPROVED:{cancellationApproved:true},COMPLETE:{expected:'2026-11-18',timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web'}};
 assert.deepEqual(agedFollowupContracts(rows,notes,'2026-11-18').map(row=>row.id),['EIGHT','INCOMPLETE']);
});

test('planned cancellation remains available for manager review even after source Online',()=>{
 const row={id:'PROPOSED',type:'Internet',created:'2026-11-01',date:'2026-11-18'};
 const note={expected:'',timeSlot:'',action:'Khác',result:'Dự Kiến Hủy',source:'Web',cancelReason:'Cần TP xem xét'};
 assert.deepEqual(pendingFollowupContracts([row],{PROPOSED:note},'2026-11-20').map(r=>r.id),['PROPOSED']);
 assert.equal(pendingFollowupContracts([row],{PROPOSED:{...note,cancellationApproved:true}},'2026-11-20').length,0);
});

test('manager continuation survives every staff update and source Online until manager cancellation',()=>{
 const row={id:'CONTINUE',type:'Internet',created:'2026-11-01',date:'2026-11-18'};
 const note={expected:'2026-11-18',timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web',cancelReason:'Lý do ban đầu',processingRequestedAt:'2026-11-17T01:00:00Z',processingRespondedAt:'2026-11-18T01:00:00Z'};
 for(const change of [{expected:'2026-11-19'},{timeSlot:'10h - 12h'},{action:'Kh chưa chuyển vào ở'},{source:'Đại Lý'},{cancelReason:'Đổi nội dung'},...['Chưa Online','Đã Online','Dự Kiến Hủy','Hủy'].map(result=>({result}))]){
  assert.deepEqual(pendingFollowupContracts([row],{CONTINUE:{...note,...change}},'2026-11-20').map(row=>row.id),['CONTINUE']);
 }
 assert.equal(pendingFollowupContracts([{...row,status:'Đã chấm dứt hợp đồng'}],{CONTINUE:note},'2026-11-20').length,1);
 assert.equal(pendingFollowupContracts([row],{CONTINUE:{...note,cancellationApproved:true}},'2026-11-20').length,0);
 assert.equal(pendingFollowupContracts([row],{CONTINUE:{...note,processingRequestedAt:null}},'2026-11-20').length,0);
});
