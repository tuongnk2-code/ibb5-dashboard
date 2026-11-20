import test from 'node:test';
import assert from 'node:assert/strict';
import { compareChannelSources } from '../js/channelSourceComparison.js';

const roster=[{acc:'DNG.A',team:1},{acc:'DNG.B',team:2},{acc:'DNG.ZERO',team:2}];
const row=(id,staff,created,sourceExcel='Web')=>({id,staff,created,sourceExcel,date:'2026-11-19',type:'Internet'});
test('source comparison uses creation dates, same cutoff, unique contracts and excludes missing source from totals',()=>{
 const rows=[row('A','DNG.A','2026-11-01'),row('A','DNG.A','2026-11-01'),row('B','DNG.B','2026-11-19','FaceBook ADS'),row('MISSING','DNG.A','2026-11-02',''),row('AFTER','DNG.A','2026-11-20'),row('P1','DNG.A','2026-10-01'),row('P2','DNG.A','2026-10-19'),row('LATER','DNG.B','2026-10-20'),row('PRIORONLY','DNG.NEW','2026-10-05','Sự kiện')];
 const report=compareChannelSources(rows,{B:{source:'Zalo'}},'2026-11','2026-11-19','',roster);
 assert.equal(report.cutoff,'2026-11-19');assert.equal(report.previousCutoff,'2026-10-19');assert.equal(report.current.missing,1);
 assert.equal(report.comparison.current,2);assert.equal(report.comparison.previous,3);assert.equal(report.comparison.delta,-1);assert.ok(Math.abs(report.comparison.percent+100/3)<1e-8);
 assert.equal(report.current.counts['Top Zalo'],1);assert.equal(report.current.counts['Face Book'],0);assert.ok(report.channels.includes('Sự kiện'));
 assert.ok(report.current.groups.flatMap(g=>g.rows).some(p=>p.acc==='DNG.NEW'&&p.comparison.previous===1));
 assert.equal(report.current.groups.reduce((n,g)=>n+g.comparison.current,0),2);
 const team=compareChannelSources(rows,{},'2026-11','2026-11-19','',roster,'2');assert.deepEqual(team.comparison,{current:1,previous:0,delta:1,percent:null});
 const staff=compareChannelSources(rows,{},'2026-11','2026-11-19','DNG.A',roster);assert.equal(staff.comparison.current,1);assert.equal(staff.comparison.previous,2);
});
test('missing previous data is not zero, and month-end/year rollover are clamped correctly',()=>{
 const rows=[row('JAN','DNG.A','2026-01-31'),row('DEC','DNG.A','2025-12-31'),row('MAR','DNG.A','2026-03-31'),row('FEB','DNG.A','2026-02-28')];
 assert.equal(compareChannelSources(rows,{},'2026-01','2026-01-31','',roster).previousCutoff,'2025-12-31');
 assert.equal(compareChannelSources(rows,{},'2026-03','2026-03-31','',roster).previousCutoff,'2026-02-28');
 const missing=compareChannelSources([row('A','DNG.A','2026-11-01')],{},'2026-11','2026-11-19','',roster);assert.equal(missing.available,false);assert.equal(missing.comparison.delta,null);assert.equal(missing.comparison.percent,null);
 const noCurrent=compareChannelSources([row('P','DNG.A','2026-10-01')],{},'2026-11','2026-11-19','',roster);assert.equal(noCurrent.comparison.previous,1);assert.equal(noCurrent.comparison.delta,null);
});

test('NET Online reconciliation partitions the source cohort without using employee follow-up status',()=>{
 const data=[row('ON','DNG.A','2026-11-01'),{...row('FUTURE','DNG.A','2026-11-02'),date:'2026-11-20'},
  {...row('NOTE','DNG.B','2026-11-03'),date:''},{...row('CANCEL','DNG.B','2026-11-04'),status:'Đã chấm dứt hợp đồng'},
  row('MISSING','DNG.A','2026-11-05',''),row('AFTER','DNG.A','2026-11-20'),row('OLDER','DNG.A','2026-10-01')];
 const notes={ON:{result:'Hủy',cancellationApproved:true},NOTE:{result:'Đã Online'}};
 const current=compareChannelSources(data,notes,'2026-11','2026-11-19','',roster).current;
 assert.deepEqual(current.netStatus,{online:1,pending:2,cancelled:1});
 assert.equal(current.netOnlineCounts.Web,1);assert.equal(current.netOnlineCounts['Chưa cập nhật'],1);
 assert.equal(Object.values(current.netStatus).reduce((sum,n)=>sum+n,0),current.total-current.missing);
 const staff=compareChannelSources(data,notes,'2026-11','2026-11-19','DNG.B',roster).current;
 assert.deepEqual(staff.netStatus,{online:0,pending:1,cancelled:1});
 const team=compareChannelSources(data,notes,'2026-11','2026-11-19','',roster,'1').current;
 assert.deepEqual(team.netStatus,{online:1,pending:1,cancelled:0});
 // New source data changes reconciliation immediately, retaining source-channel totals.
 const next=compareChannelSources(data.map(item=>item.id==='FUTURE'?{...item,date:'2026-11-19'}:item),notes,'2026-11','2026-11-19','',roster).current;
 assert.deepEqual(next.netStatus,{online:2,pending:1,cancelled:1});assert.equal(next.total,current.total);
});
