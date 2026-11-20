import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSnapshot, mergeNetSnapshot } from '../js/dashboardStateModel.js';

const row=(fields={})=>({type:'Internet',id:'C1',created:'2026-11-01',date:'',status:'Đã chấm dứt hợp đồng',...fields});
test('actual NET cancellation date survives shared validation, history and narrower imports',()=>{
 const initial=validateSnapshot({data:[row({netCancelledAt:'2026-11-18T09:30:00'})]});
 assert.equal(initial.data[0].netCancelledAt,'2026-11-18T09:30:00');assert.equal(initial.cancelledNet[0].netCancelledAt,'2026-11-18T09:30:00');
 const updated=mergeNetSnapshot(initial,{data:[row({status:'Bình thường'})]});assert.equal(updated.cancelledNet[0].netCancelledAt,'2026-11-18T09:30:00');
 for(const netCancelledAt of ['2026-02-30','2026-11-18T25:01:00','<script>','2026-11-18T00:00:00;alert(1)']){
  const state=validateSnapshot({data:[row({netCancelledAt})]});assert.equal(state.data[0].netCancelledAt,undefined);assert.equal(state.cancelledNet[0].netCancelledAt,undefined);
 }
 const dateOnly=validateSnapshot({data:[row({netCancelledAt:'2026-11-18'})]});assert.equal(dateOnly.data[0].netCancelledAt,'2026-11-18');
 const unknown=validateSnapshot({data:[row()]});assert.equal(unknown.data[0].netCancelledAt,undefined);assert.equal(unknown.cancelledNet[0].netCancelledAt,undefined);
});
