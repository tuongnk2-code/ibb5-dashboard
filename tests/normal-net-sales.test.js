import test from 'node:test';
import assert from 'node:assert/strict';
import { normalNetSales } from '../js/dailyPerformanceModel.js';
import { performanceContractRows } from '../js/performanceContractDetails.js';
import { mergeNetSnapshot } from '../js/dashboardStateModel.js';

const row=(id,status='Bình thường',extra={})=>({id,type:'Internet',status,created:'2026-11-01',date:'',staff:'DNG.Hoantt',room:'IBB5',...extra});
test('monthly sales require explicitly normal NET status and deduplicate before checking status',()=>{
 const source=[row('A'),row('B',' BÌNH   THƯỜNG '),row('C','Đã chấm dứt hợp đồng'),row('D','Tạm ngưng'),row('E',''),row('F',null),row('A','Đã chấm dứt hợp đồng'),row('G'),row(' g '),row('CAM','Bình thường',{type:'Camera'})];
 assert.deepEqual(normalNetSales(source).map(x=>x.id),['B',' g ']);assert.equal(source.length,10);
});
test('latest NET import removes terminated sales and restores them when source becomes normal',()=>{
 const before={data:[row('A')],meta:{}};
 const terminated=mergeNetSnapshot(before,{data:[row('A','Đã chấm dứt hợp đồng')],meta:{}});
 assert.equal(normalNetSales(terminated.data).length,0);
 const restored=mergeNetSnapshot(terminated,{data:[row('A')],meta:{}});
 assert.equal(normalNetSales(restored.data).length,1);
});
test('monthly sold drill-down applies source status, dates, staff and room without using staff follow-up results',()=>{
 const source=[row('OK'),row('TERMINATED','Đã chấm dứt hợp đồng'),row('LASTMONTH','Bình thường',{created:'2026-10-01'}),row('FUTURE','Bình thường',{created:'2026-11-22'}),row('OTHER','Bình thường',{staff:'DNG.Other'}),row('ROOM','Bình thường',{room:'OTHER'}),row('MOVED'),row('MOVED','Bình thường',{staff:'DNG.Other'})];
 const selection={kind:'sold',accs:[' dng.hoantt '],start:'2026-11-01',asOf:'2026-11-21',room:'IBB5'};
 assert.deepEqual(performanceContractRows(source,selection,{OK:{result:'Hủy',cancellationApproved:true}}).map(x=>x.id),['OK']);
});
