import test from 'node:test';
import assert from 'node:assert/strict';
import { PERF_FIELDS,matchesPerformanceFilters,performanceFilterOptions } from '../js/performanceFilters.js';
const fields=(extra={})=>Object.fromEntries(PERF_FIELDS.map(field=>[field,extra[field]||{raw:null,display:'—'}]));
test('column criteria intersect without treating unavailable metrics as zero',()=>{
 const row=fields({online:{raw:0,display:'0'},pct:{raw:75.4,display:'75%'},growth:{raw:-2,display:'-2 HĐ'},tenure:{raw:'13+',display:'13+'}});
 assert.equal(matchesPerformanceFilters(row,{pct:'under100',growth:'negative',online:'zero',tenure:'eq:13+'}),true);
 assert.equal(matchesPerformanceFilters(row,{pct:'atleast100'}),false);
 assert.equal(matchesPerformanceFilters(row,{goal:'zero'}),false);
 assert.equal(matchesPerformanceFilters(row,{goal:'eq:—'}),true);
 assert.equal(matchesPerformanceFilters(row,{pct:'eq:75%'}),true);
 assert.equal(matchesPerformanceFilters(row,{growth:'positive'}),false);
 assert.equal(matchesPerformanceFilters(fields(),{growth:'zero'}),false);
});
test('options retain display values and numeric ordering without duplicate choices',()=>{
 const records=[2,12,2].map(raw=>fields({online:{raw,display:String(raw)}}));
 assert.deepEqual(performanceFilterOptions('online',records),[['','Tất cả'],['positive','Lớn hơn 0'],['zero','Bằng 0'],['eq:2','2'],['eq:12','12']]);
 assert.ok(performanceFilterOptions('pct',[]).some(([value])=>value==='atleast100'));
});
