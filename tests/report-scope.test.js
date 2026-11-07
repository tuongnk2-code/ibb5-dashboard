import test from 'node:test';
import assert from 'node:assert/strict';
import { includeInDashboardReports } from '../js/reportScope.js';
import { mergeNetSnapshot } from '../js/dashboardStateModel.js';
import { salaryCounts, calculateSalary } from '../js/salaryModel.js';

test('August 2026 is payroll-only even when Online in a later month, across services',()=>{
  for(const type of ['Internet','Truyền hình','Camera']){
    assert.equal(includeInDashboardReports({type,created:'2026-08-20',date:'2026-10-25'}),false);
    assert.equal(includeInDashboardReports({type,created:'2026-09-01',date:'2026-10-25'}),true);
    assert.equal(includeInDashboardReports({type,created:'2027-08-20',date:'2027-09-01'}),true);
    assert.equal(includeInDashboardReports({type,created:'',date:'2026-08-25'}),false);
  }
});

test('narrower imports retain August for LCB, but not dashboard or cancellation reports',()=>{
  const acc='DNG.Tienna2',august={type:'Internet',id:'DAAAQ6005',staff:acc,created:'2026-08-20',date:'2026-10-25'};
  const cancelled={...august,id:'AUGCANCEL',date:'',status:'Đã chấm dứt hợp đồng'};
  const later={...august,id:'OCT',created:'2026-10-01'};
  const merged=mergeNetSnapshot(mergeNetSnapshot(null,{data:[august,cancelled]}),{data:[later]});
  assert.equal(merged.data.length,3);
  assert.deepEqual(merged.data.filter(includeInDashboardReports).map(r=>r.id),['OCT']);
  assert.deepEqual(merged.cancelledNet.filter(includeInDashboardReports),[]);
  const counts=salaryCounts(merged.data,{month:'2026-10',asOf:'2026-11-07',roster:[{acc}]})[0];
  assert.equal(counts.net,2);
  assert.equal(calculateSalary(counts.net,counts.vvip).total,1.6);
});
