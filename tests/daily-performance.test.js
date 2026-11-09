import test from 'node:test';
import assert from 'node:assert/strict';
import { dailyPerformanceContracts } from '../js/dailyPerformanceModel.js';

test('daily sold/online exclude source cancellations, staff cancellation and manager approval',()=>{
  const net=id=>({id,type:'Internet',created:'2026-11-09',date:'2026-11-09'});
  const data=[net('ACTIVE'),net('FINAL'),net('APPROVED'),net('PLANNED'),...['Đã chấm dứt hợp đồng','Đã hủy','Hủy','đã huỷ'].map((status,i)=>({...net('SOURCE'+i),status}))];
  const notes={FINAL:{result:' huỷ '},APPROVED:{cancellationApproved:true},PLANNED:{result:'Dự Kiến Hủy'}};
  assert.deepEqual(dailyPerformanceContracts(data,notes).map(row=>row.id),['ACTIVE','PLANNED']);
  assert.equal(data.length,8); // Preserve source records for cancellation history and payroll.
});

test('deduplicated Internet retains actual Online and responds to saved status changes',()=>{
  const row={id:'NET1',type:'Internet',created:'2026-11-09',date:''};
  const data=[row,{...row,id:' net1 ',date:'2026-11-09'},{...row,id:'CAM',type:'Camera'}],notes={};
  assert.equal(dailyPerformanceContracts(data,notes)[0].date,'2026-11-09');
  notes.NET1={result:'Hủy'};assert.equal(dailyPerformanceContracts(data,notes).length,0);
  notes.NET1.result='Chưa Online';assert.equal(dailyPerformanceContracts(data,notes).length,1);
});
