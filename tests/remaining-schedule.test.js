import test from 'node:test';
import assert from 'node:assert/strict';
import { remainingOnlineSchedule } from '../js/remainingScheduleModel.js';
const row=(id,extra={})=>({id,type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:'',...extra});
const data=[row('A'),row('A'),row('B'),row('TODAY'),row('NEXTMONTH'),row('ONLINE',{date:'2026-11-17'}),row('CANCEL'),row('PLANNED'),row('APPROVED'),row('TERMINATED',{status:'Đã chấm dứt hợp đồng'}),row('SOURCECANCEL',{status:'Hủy'}),row('SOURCECANCELLED',{status:'Đã huỷ'}),row('FUTURE',{created:'2026-11-18'}),row('CAM',{type:'Camera'}),row('OTHER',{staff:'DNG.Vypv'}),row('UNKNOWN',{staff:'DNG.New'})];
const notes=Object.fromEntries(data.map(r=>[r.id,{expected:'2026-11-18'}]));Object.assign(notes,{B:{expected:'2026-11-30'},TODAY:{expected:'2026-11-17'},NEXTMONTH:{expected:'2026-12-01'},CANCEL:{expected:'2026-11-18',result:'Hủy'},PLANNED:{expected:'2026-11-18',result:'Dự Kiến Hủy'},APPROVED:{expected:'2026-11-18',cancellationApproved:true}});
test('remaining month uses saved future dates, excludes ineligible contracts, deduplicates and conserves totals',()=>{
 const report=remainingOnlineSchedule(data,{cutoff:'2026-11-17',notes,canView:()=>true});
 assert.equal(report.days.length,13);assert.equal(report.days[0],'2026-11-18');assert.equal(report.days.at(-1),'2026-11-30');assert.deepEqual(report.rows.map(r=>r.id),['A','B','OTHER','UNKNOWN']);
 assert.equal(report.total,4);assert.equal(report.totals.reduce((a,b)=>a+b,0),4);assert.equal(report.groups.reduce((sum,g)=>sum+g.total,0),4);assert.equal(report.groups.find(g=>g.team===0).total,1);
 for(const group of report.groups)for(const person of group.people)assert.equal(person.cells.flat().length,person.rows.length);
});
test('role, team and accent-insensitive personnel search intersect without leaking foreign rows',()=>{
 const own=remainingOnlineSchedule(data,{cutoff:'2026-11-17',notes,canView:r=>r.staff==='DNG.ManLM3'});assert.deepEqual(own.rows.map(r=>r.id),['A','B']);assert.equal(own.groups.flatMap(g=>g.people).length,1);
 assert.equal(remainingOnlineSchedule(data,{cutoff:'2026-11-17',notes}).total,0);
 const team=remainingOnlineSchedule(data,{cutoff:'2026-11-17',notes,canView:()=>true,team:'3',query:'le minh man'});assert.deepEqual(team.rows.map(r=>r.id),['A','B']);
});
test('last day, leap February and year boundary do not invent future dates',()=>{
 assert.equal(remainingOnlineSchedule([],{cutoff:'2026-11-30',canView:()=>true}).days.length,0);
 assert.deepEqual(remainingOnlineSchedule([],{cutoff:'2028-02-27'}).days,['2028-02-28','2028-02-29']);
 assert.deepEqual(remainingOnlineSchedule([],{cutoff:'2026-12-30'}).days,['2026-12-31']);
 assert.deepEqual(remainingOnlineSchedule([],{cutoff:'invalid'}).days,[]);
});
