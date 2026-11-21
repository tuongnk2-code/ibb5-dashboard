import test from 'node:test';
import assert from 'node:assert/strict';
import { encouragementContext, encouragementFocus, ownProspects, ownSalaryMilestone } from '../js/staffEncouragementContext.js';
import { encouragementMessage } from '../js/staffEncouragementModel.js';
import { shiftDay } from '../js/dailyReportModel.js';
const day='2026-11-21',growth={day,current:14,delta:-4,changeSinceYesterday:0};
const row=(id,extra={})=>({id,type:'Internet',staff:'DNG.Me',created:'2026-11-01',date:'',status:'Bình thường',...extra});
const ctx=extra=>encouragementContext({data:[],notes:{},account:'DNG.Me',day,growth,target:null,userId:'me',...extra});
test('urgent real pending work outranks plans and distinguishes completed Online updates',()=>{
 const data=[row('OVER'),row('AGED'),row('ONLINE',{date:'2026-11-10'}),row('CANCELLED',{status:'Đã chấm dứt hợp đồng'}),row('PLANNED'),row('OTHER',{staff:'OTHER'})];
 const notes={OVER:{expected:'2026-11-20'},PLANNED:{result:'Dự kiến hủy'}};
 const c=ctx({data,notes,target:30});assert.equal(c.pending,5);assert.equal(c.active,2);assert.equal(c.aged,2);assert.equal(c.overdue,1);assert.equal(c.needsUpdates,1);assert.equal(c.completion,46.7);assert.equal(encouragementFocus(c).type,'overdue');
 delete notes.OVER.expected;assert.equal(encouragementFocus(ctx({data,notes})).type,'aged');
 assert.equal(encouragementFocus(ctx({data:[row('ONLINE',{date:'2026-11-10'})]})).type,'records');
 assert.equal(ctx({data:[row('OLD')],notes:{OLD:{cancellationApproved:true}}}).pending,0);
});
test('prospects use only recent submitted own reports; missing and stale reports remain unknown',()=>{
 const report=(user,date,status='submitted',leads=8,closed=2)=>({user_id:user,report_date:date,status,data:{sources:[{leads,closed}]}});
 const reports=[report('other',day,'submitted',999),report('me','2026-11-18'),report('me',day,'draft',999),report('me','2026-11-20')];
 assert.deepEqual(ownProspects(reports,'me',day),{day:'2026-11-20',leads:8,closed:2});
 const focus=encouragementFocus(ctx({reports}));assert.equal(focus.type,'prospects');assert.match(focus.body,/20\/11: 8 KHTN mới, 2 đã chốt/);assert.doesNotMatch(focus.body,/còn 6|999/);
 assert.equal(ownProspects(reports,'nobody',day),null);assert.equal(ownProspects([report('me','2026-11-18')],'me',day),null);
 assert.equal(encouragementFocus(ctx({target:30})).type,'plan');
 assert.equal(encouragementFocus(ctx({target:30,reports:[report('me',day,'submitted',0,0)]})).type,'prospecting');
});
test('LCB thresholds follow actual weighted rounding, own account, period and probation status',()=>{
 const payload={month:'2026-11',asOf:day,provisional:true,rows:[{acc:'DNG.Other',net:100,vvip:0,probation:false},{acc:'DNG.Me',net:30,vvip:0,probation:false}]};
 const salary=ownSalaryMilestone(payload,'dng.me',day);assert.equal(salary.netNeeded,2);assert.equal(salary.vvipNeeded,1);assert.equal(encouragementFocus(ctx({salary})).type,'salary');assert.match(encouragementFocus(ctx({salary})).body,/LCB tạm tính/);
 assert.equal(ownSalaryMilestone({...payload,asOf:'2026-11-20'},'DNG.Me',day),null);
 assert.equal(ownSalaryMilestone({...payload,rows:[{...payload.rows[1],probation:true}]},'DNG.Me',day),null);
 assert.equal(ownSalaryMilestone(payload,'DNG.Missing',day),null);
});
test('targets are optional and no achievement is invented by rounding up below the goal',()=>{
 assert.equal(ctx({target:null}).completion,null);assert.equal(ctx({target:0}).completion,null);
 const c=ctx({target:200,growth:{...growth,current:199}});assert.equal(c.completion,99.5);assert.equal(encouragementFocus(c).type,'plan');
 assert.equal(encouragementFocus(ctx({target:14})).type,'achievement');
});
test('unchanged priority retains daily variation in both headline and action',()=>{
 const texts=new Set(),c=ctx({data:[row('OLD')]});
 for(let n=0;n<16;n++)texts.add(encouragementMessage('DNG.Me',{...growth,day:shiftDay(day,n)},c).body);
 assert.ok(texts.size>=8);
});
