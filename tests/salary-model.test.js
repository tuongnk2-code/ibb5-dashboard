import test from 'node:test';
import assert from 'node:assert/strict';
import { salaryCounts, salaryPeriod, calculateSalary } from '../js/salaryModel.js';

test('LCB source counts distinguish NET, V.VIP and other TV, deduplicate service IDs and obey period', () => {
  const roster = [{ acc: 'DNG.HoaNTB6', team: 3 }, { acc: 'DNG.ManLM3', team: 3 }];
  const net = { type: 'Internet', id: ' NET1 ', staff: 'dng.hoantb6 ', created: '2026-11-01', date: '2026-11-05' };
  const data = [net, { ...net, id: 'net1' }, { ...net, id: 'PENDING', date: '' },
    { ...net, id: 'FUTURE', date: '2026-11-08' }, { ...net, id: 'OLD', date: '2026-10-31' },
    { ...net, type: 'Truyền hình', id: 'NET1', vvip: true },
    { ...net, type: 'Truyền hình', id: 'OTHER', vvip: false },
    { ...net, type: 'Camera', id: 'CAM' }];
  const rows = salaryCounts(data, { month: '2026-11', asOf: '2026-11-07', roster });
  assert.equal(rows[0].net, 1); assert.equal(rows[0].vvip, 1);
  assert.equal(rows[1].net, 0); assert.equal(rows[1].vvip, 0);
  const october = salaryCounts(data, { month: '2026-10', asOf: '2026-11-07', roster });
  assert.equal(october[0].net, 0); assert.equal(october[0].vvip, 0);
  assert.throws(() => salaryCounts(data, { month: '2026-11', asOf: '2026-10-31', roster }));
});

test('LCB window includes the first four days of T+1, across December and leap years', () => {
  assert.deepEqual(salaryPeriod('2026-12', '2027-01-08'), { start:'2026-12-01',end:'2027-01-04',asOf:'2027-01-04',provisional:false });
  assert.equal(salaryPeriod('2028-02','2028-03-02').asOf,'2028-03-02');
  assert.equal(salaryPeriod('2028-02','2028-03-02').provisional,true);
  assert.equal(salaryPeriod('2028-02','2028-03-05').end,'2028-03-04');assert.equal(salaryPeriod('2028-02','2028-03-04').provisional,true);assert.equal(salaryPeriod('2028-02','2028-03-05').provisional,false);
  const data=['2026-09-30','2026-10-01','2026-10-31','2026-11-01','2026-11-04','2026-11-05'].map((date,i)=>({type:'Internet',id:'ID'+i,date,created:date==='2026-09-30'?'2026-09-30':'2026-10-01',staff:'DNG.HoaNTB6'}));
  data.push({type:'Internet',id:'PREVIOUS_COHORT',created:'2026-09-30',date:'2026-10-05',staff:'DNG.HoaNTB6'},{type:'Internet',id:'NEXT_COHORT',created:'2026-11-01',date:'2026-11-02',staff:'DNG.HoaNTB6'});
  const roster=[{acc:'DNG.HoaNTB6'}];
  assert.equal(salaryCounts(data,{month:'2026-10',asOf:'2026-11-10',roster})[0].net,4);
  assert.equal(salaryCounts(data,{month:'2026-10',asOf:'2026-10-15',roster})[0].net,1);
});

test('approved weights have no bonus and round halves up before LCB lookup', () => {
  const example=calculateSalary(46,6);assert.equal(example.total,47);assert.equal(example.salary,7800000);
  const low=calculateSalary(19,6);assert.equal(low.total,25.4);assert.equal(low.compared,25);assert.equal(low.salary,4700000);
  const half=calculateSalary(17,7);assert.equal(half.total,25.5);assert.equal(half.compared,26);assert.equal(half.salary,5200000);
  const high=calculateSalary(28,2);assert.equal(high.total,25.8);assert.equal(high.compared,26);assert.equal(high.salary,5200000);
  assert.equal(calculateSalary(46,6,true).salary,4500000);
  assert.equal(calculateSalary(0,0).total,0);assert.equal(calculateSalary(0,0).salary,4700000);
  assert.throws(()=>calculateSalary(-1,0));assert.throws(()=>calculateSalary(1,0.5));
});

test('October creation cohort is 45 NET and 30 V.VIP, including late Online through November 4',()=>{
  const acc='TEST.Sales',roster=[{acc}],data=[];
  for(const [type,vvip,count,regular] of [['Internet',false,45,42],['Truyền hình',true,30,27]]){
    for(let i=0;i<count;i++)data.push({type,vvip,id:type+i,staff:acc,created:'2026-10-20',date:i<regular?'2026-10-25':'2026-11-04'});
    data.push({type,vvip,id:'OLD'+type,staff:acc,created:'2026-09-30',date:'2026-10-01'},{type,vvip,id:'NEW'+type,staff:acc,created:'2026-11-01',date:'2026-11-03'},{type,vvip,id:'LATE'+type,staff:acc,created:'2026-10-31',date:'2026-11-05'},{type,vvip,id:'MISSING_CREATED'+type,staff:acc,date:'2026-10-05'});
  }
  const row=salaryCounts(data,{month:'2026-10',asOf:'2026-11-07',roster})[0];
  assert.equal(row.net,45);assert.equal(row.vvip,30);assert.equal(calculateSalary(row.net,row.vvip).total,87);assert.equal(calculateSalary(row.net,row.vvip).salary,14800000);
  const november=salaryCounts(data,{month:'2026-11',asOf:'2026-11-07',roster})[0];assert.equal(november.net,1);assert.equal(november.vvip,1);
});
