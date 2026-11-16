import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantScope,assistantReport,findAssistantContracts,draftAssistantUpdate,validateAssistantDraft,parseAssistantPatch} from '../js/dashboardAssistantModel.js';
const today='2026-11-16';
const row=(id,extra={})=>({id,type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:'',status:'Bình thường',...extra});
const data=[row('SOLD',{created:today}),row('ON',{date:today}),row('OLD'),row('CANCEL',{status:'Đã chấm dứt hợp đồng'}),row('NOTE'),row('FOREIGN',{staff:'DNG.Vypv',date:today}),row('CAM',{type:'Camera',date:today}),row('TV',{type:'Truyền hình',vvip:true,date:today}),row('TVWAIT',{type:'Truyền hình',vvip:true}),row('AUG',{created:'2026-08-01',date:today})];
const notes={NOTE:{result:'Hủy'},OLD:{expected:'2026-11-10',updated:'2026-11-11T00:00:00Z'},SOLD:{source:'Web'},ON:{source:'Zalo'}};
test('Vietnamese scope uses explicit period, team, account and valid calendar dates',()=>{
 assert.deepEqual(assistantScope('Tóm tắt tuần này bầy 3 DNG.ManLM3',{},today),{period:'week',anchor:today,team:'3',staff:'DNG.ManLM3'});
 assert.equal(assistantScope('tháng 10/2026',{},today).anchor,'2026-10-01');
 assert.equal(assistantScope('hôm qua',{},today).anchor,'2026-11-15');
 assert.equal(assistantScope('tuần trước',{},today).anchor,'2026-11-09');
 assert.throws(()=>assistantScope('tháng 13/2026',{},today));
 assert.throws(()=>parseAssistantPatch('Đổi sang 31/11/2026',today));
});
test('reports conserve source totals and restrict all metrics, channels, targets and details to permission',()=>{
 const result=assistantReport(data,{scope:{period:'month',anchor:today},today,now:Date.parse(today),notes,canView:r=>r.staff==='DNG.ManLM3'});
 assert.equal(result.groups.online.length,1);assert.equal(result.groups.sold.length,3);
 assert.deepEqual(result.groups.pending.map(r=>r.id),['SOLD','OLD']);assert.deepEqual(result.groups.overdue.map(r=>r.id),['OLD']);assert.deepEqual(result.groups.stale.map(r=>r.id),['OLD']);
 assert.equal(result.groups.camera.length,1);assert.equal(result.groups.vvip.length,1);assert.deepEqual(result.channels,[['Web',1],['Zalo',1]]);
 assert.equal(result.source.some(r=>r.id==='FOREIGN'||r.id==='AUG'),false);
 assert.deepEqual(assistantReport(data,{today}).source,[]);
 assert.equal(findAssistantContracts(data,'FOREIGN',r=>r.staff==='DNG.ManLM3').length,0);
 assert.deepEqual(findAssistantContracts(data,'Tìm OLD',()=>true).map(r=>r.id),['OLD']);
 assert.equal(assistantReport(data,{scope:{period:'week',anchor:'2026-12-01'},today,canView:()=>true}).future,true);
});
test('chat drafts preserve original fields and reject stale data and terminated contracts',()=>{
 const note={expected:today,timeSlot:'8h - 10h',action:'Khác',source:'Web',result:'Chưa Online'};
 const patch=parseAssistantPatch('Cập nhật HĐ OLD sang 20/11/2026, 15h30 - 17h30; nguồn: Top Zalo; nguyên nhân: Kh muốn hẹn ngày đó',today);
 assert.equal(patch.expected,'2026-11-20');assert.equal(patch.timeSlot,'15h30 - 17h30');assert.equal(patch.source,'Top Zalo');assert.equal(patch.action,'Kh muốn hẹn ngày đó');
 const draft=draftAssistantUpdate(row('OLD'),note,patch,4);assert.equal(draft.after.result,note.result);
 assert.equal(validateAssistantDraft(draft,note,4).expected,'2026-11-20');
 assert.throws(()=>validateAssistantDraft(draft,note,5),/nơi khác/);
 assert.throws(()=>validateAssistantDraft(draft,{...note,action:'Changed'},4),/nơi khác/);
 assert.throws(()=>draftAssistantUpdate(row('C',{status:'Đã chấm dứt hợp đồng'}),{},{}),/chấm dứt/);
 assert.throws(()=>draftAssistantUpdate(row('C'),{cancellationApproved:true},{}),/duyệt hủy/);
 assert.throws(()=>validateAssistantDraft({...draft,after:{...draft.after,source:''}},note,4));
 const cancel=draftAssistantUpdate(row('OLD'),note,{result:'Hủy',cancelReason:'Khách không còn nhu cầu',expected:'',timeSlot:''},4);assert.equal(validateAssistantDraft(cancel,note,4).result,'Hủy');
});
