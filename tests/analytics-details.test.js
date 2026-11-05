import test from 'node:test';
import assert from 'node:assert/strict';
import { overdueContracts, monthlyStaffChannels, SALES_CHANNELS } from '../js/analyticsDetails.js';

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

test('monthly channels show the full roster, fixed channels, source aliases and conserved totals', () => {
  const rows = [
    {id:'A',staff:'dng.a',created:'2026-01-31',date:'2026-02-01',sourceExcel:'IBB'},
    {id:'A',staff:'dng.a',created:'2026-01-31',date:'2026-02-01',sourceExcel:'IBB'},
    {id:'B',staff:'DNG.A',created:'2026-02-01',sourceExcel:'IBB'},
    {id:'C',staff:'DNG.B',created:'2026-02-02',sourceExcel:'FaceBook ADS'},
    {id:'D',staff:'DNG.B',created:'2026-02-03',sourceExcel:''},
    {id:'E',staff:'DNG.A',created:'2025-12-31',sourceExcel:'IBB'},
    {id:'F',staff:'DNG.A',created:'2026-02-30',sourceExcel:'IBB'},
  ];
  const roster=[{acc:'DNG.A',team:1},{acc:'DNG.B',team:2},{acc:'DNG.ZERO',team:3}], notes={A:{source:'Zalo'}};
  const jan=monthlyStaffChannels(rows,notes,'2026-01','',roster);
  assert.equal(jan.total,1);assert.equal(jan.groups[0].rows[0].counts['Top Zalo'],1);
  const feb=monthlyStaffChannels(rows,notes,'2026-02','',roster);
  assert.equal(feb.total,3);assert.equal(feb.missing,1);
  assert.deepEqual(feb.channels.slice(0,SALES_CHANNELS.length),SALES_CHANNELS);
  assert.equal(feb.counts['Face Book'],1);assert.equal(feb.counts.IBB,1);assert.equal(feb.counts['Chưa cập nhật'],1);
  assert.equal(feb.groups[2].rows[0].acc,'DNG.ZERO');assert.equal(feb.groups[2].rows[0].total,0);
  assert.ok(feb.groups.every(group=>group.rows.every(person=>Object.keys(person.counts).length===feb.channels.length)));
  assert.equal(feb.groups.reduce((sum,group)=>sum+group.total,0),feb.total);
  assert.equal(Object.values(feb.counts).reduce((a,b)=>a+b,0),feb.total);
  const filtered=monthlyStaffChannels(rows,notes,'2026-02','DNG.A',roster);
  assert.equal(filtered.total,1);assert.equal(filtered.groups.flatMap(group=>group.rows).length,1);
  assert.equal(monthlyStaffChannels(rows,notes,'2026-03','',roster).available,false);
});

test('unrecognized channels and accounts remain visible instead of being dropped into Other',()=>{
  const report=monthlyStaffChannels([{id:'X',staff:'DNG.NEW',created:'2026-02-02',sourceExcel:'Sự kiện'}],{},'2026-02','',[]);
  assert.equal(report.counts['Sự kiện'],1);assert.equal(report.counts['Khác'],0);assert.equal(report.groups[0].team,0);assert.equal(report.total,1);
});
