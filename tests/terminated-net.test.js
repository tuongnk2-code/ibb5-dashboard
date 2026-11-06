import test from 'node:test';
import assert from 'node:assert/strict';
import { isTerminatedNetContract, includeInOperationalReports } from '../js/analyticsDetails.js';
import { mergeNetSnapshot } from '../js/dashboardStateModel.js';

test('cancellation statistics use the NET source status only',()=>{
 for(const status of ['Đã chấm dứt hợp đồng','  ĐÃ CHẤM DỨT   HỢP ĐỒNG  ','Đã chấm dứt hợp đồng'.normalize('NFD')])assert.equal(isTerminatedNetContract({type:'Internet',status}),true);
 for(const status of ['',null,'Hủy','Dự Kiến Hủy','Chấm dứt hợp đồng','Chưa chấm dứt hợp đồng','Bình thường'])assert.equal(isTerminatedNetContract({type:'Internet',status,cancellationApproved:true}),false);
 assert.equal(isTerminatedNetContract({type:'Camera',status:'Đã chấm dứt hợp đồng'}),false);
});
test('NET imports retain source termination status and update matching IDs without duplication',()=>{
 const previous={data:[{id:'OLD',type:'Internet',status:'Đã chấm dứt hợp đồng'},{id:'MATCH',type:'Internet',status:'Bình thường'}]};
 const imported=mergeNetSnapshot(previous,{data:[{id:' match ',type:'Internet',status:'Đã chấm dứt hợp đồng'},{id:'MATCH',type:'Internet',status:'Đã chấm dứt hợp đồng'}]});
 assert.equal(imported.data.filter(isTerminatedNetContract).length,2);
 const revised=mergeNetSnapshot(imported,{data:[{id:'MATCH',type:'Internet',status:'Bình thường'}]});
 assert.equal(revised.data.filter(isTerminatedNetContract).length,1);
});


test('operational views omit only terminated NET created in September/October 2026',()=>{
 const row={type:'Internet',status:'Đã chấm dứt hợp đồng',created:'2026-09-01'};
 assert.equal(includeInOperationalReports(row),false);
 assert.equal(includeInOperationalReports({...row,created:'2026-10-31'}),false);
 for(const change of [{created:'2026-11-01'},{created:'2025-09-01'},{created:'2026-08-31'},{status:'Bình thường'},{status:'Hủy'},{type:'Camera'}])assert.equal(includeInOperationalReports({...row,...change}),true);
});
