import test from 'node:test';
import assert from 'node:assert/strict';
import { overdueContracts, yearlyStaffChannels } from '../js/analyticsDetails.js';

test('overdue detail matches the >5-day cutoff and actual online date', () => {
  const rows = [
    {id:'A',created:'2026-10-29',date:''}, {id:'A',created:'2026-10-29',date:''},
    {id:'B',created:'2026-10-30',date:''}, {id:'C',created:'2026-10-25',date:'2026-11-04'},
    {id:'D',created:'2026-10-20',date:'2026-11-05'}, {id:'E',created:'2026-11-05',date:''},
    {id:'F',created:'invalid',date:''},
  ];
  assert.deepEqual(overdueContracts(rows,'2026-11-04').map(row=>[row.id,row.age]),[['D',15],['A',6]]);
  assert.deepEqual(overdueContracts(rows,''),[]);
});

test('annual channels use creation month, source updates, unique contracts and staff scope', () => {
  const rows = [
    {id:'A',staff:'DNG.A',created:'2026-01-31',date:'2026-02-01',sourceExcel:'IBB'},
    {id:'A',staff:'DNG.A',created:'2026-01-31',date:'2026-02-01',sourceExcel:'IBB'},
    {id:'B',staff:'DNG.A',created:'2026-02-01',sourceExcel:'IBB'},
    {id:'C',staff:'DNG.B',created:'2026-02-02',sourceExcel:'IBB'},
    {id:'D',staff:'DNG.B',created:'2026-02-03',sourceExcel:''},
    {id:'E',staff:'DNG.A',created:'2025-12-31',sourceExcel:'IBB'},
    {id:'F',staff:'DNG.A',created:'2026-02-30',sourceExcel:'IBB'},
  ];
  const notes = { A:{source:'Zalo'} }, all = yearlyStaffChannels(rows,notes,'2026');
  assert.equal(all.total,3); assert.equal(all.missing,1);
  assert.deepEqual(all.totals.slice(0,3),[1,2,0]);
  assert.deepEqual(all.available.slice(0,3),[true,true,false]);
  assert.equal(all.rows.find(row=>row.acc==='DNG.A'&&row.source==='Zalo').months[0],1);
  assert.equal(yearlyStaffChannels(rows,notes,'2026','DNG.A').total,2);
  assert.equal(yearlyStaffChannels(rows,notes,'2025').total,1);
});
