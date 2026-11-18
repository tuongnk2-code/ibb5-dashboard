import test from 'node:test';
import assert from 'node:assert/strict';
import { pendingFollowupContracts } from '../js/pendingInventory.js';

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
