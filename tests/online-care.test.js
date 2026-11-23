import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanOnlineCare,onlineCareEvents,ONLINE_CARE_SCRIPTS } from '../js/onlineCareModel.js';
import { cleanWorkerTask,workerSupportsTask } from '../js/digitalWorkerModel.js';
const owner={id:'staff',acc:'DNG.A',full_name:'Nhân sự A'},task={id:'task',owner_id:'staff',config:{care_policy:{kind:'online_3_7_10',time:'09:00',scripts:ONLINE_CARE_SCRIPTS}}};
const row={id:'NET1',type:'Internet',staff:'DNG.A',customer:'Khách A',date:'2026-11-01',status:'Bình thường'},contact={contract_id:'NET1',phone:'0990000001',consent:true};
test('each eligible customer has independent Online +3/+7/+10 dates and distinct scripts',()=>{
 const events=onlineCareEvents({task,rows:[row],contacts:[contact],runs:[],owner,now:new Date('2026-11-08T03:00:00Z')});
 assert.deepEqual(events.map(e=>[e.offset,e.due_date,e.status]),[[3,'2026-11-04','missed'],[7,'2026-11-08','due'],[10,'2026-11-11','future']]);
 assert.equal(events[0].can_approve,true);assert.equal(new Set(events.map(e=>e.message)).size,3);assert.match(events[0].message,/Khách A/);assert.match(events[0].message,/Nhân sự A/);
 assert.equal(onlineCareEvents({task,rows:[row,{...row,id:'NET2'}],contacts:[contact,{...contact,contract_id:'NET2'}],runs:[],owner}).length,3);
 assert.equal(onlineCareEvents({task,rows:[row,{...row,id:'OUT',staff:'DNG.B'}],contacts:[{...contact,consent:false}],runs:[],owner}).length,0);
 assert.equal(onlineCareEvents({task,rows:[{...row,status:'Đã chấm dứt hợp đồng'}],contacts:[contact],runs:[],owner}).length,0);
});
test('confirmed history prevents repeat care; uncertain failures require review rather than automatic replay',()=>{
 const runs=[{id:'sent',status:'succeeded',started_at:'2026-11-04T02:00Z',task_snapshot:{care:{contract_id:'NET1',phone:contact.phone,offset:3}}},{id:'failed',status:'failed',started_at:'2026-11-08T02:00Z',task_snapshot:{care:{contract_id:'NET1',phone:contact.phone,offset:7}}}];
 const events=onlineCareEvents({task,rows:[row],contacts:[contact],runs,owner,now:new Date('2026-11-12T03:00Z')});assert.equal(events[0].status,'succeeded');assert.equal(events[0].can_approve,false);assert.equal(events[1].status,'failed');assert.equal(events[1].can_approve,false);assert.equal(events[2].can_approve,true);
 const leap=onlineCareEvents({task,rows:[{...row,date:'2028-02-27'}],contacts:[contact],runs:[],owner,now:new Date('2028-03-01T03:00Z')});assert.equal(leap[0].due_date,'2028-03-01');
});
test('care policies cannot be mixed with daily schedules or generic bulk adapters',()=>{
 assert.throws(()=>cleanOnlineCare({...task.config.care_policy,time:'25:00'}));assert.throws(()=>cleanOnlineCare({...task.config.care_policy,scripts:{3:'a',7:'b'}}));
 const input={name:'CSKH',channel:'top_zalo',content:'Theo NET',repeat_days:0,care_policy:task.config.care_policy};assert.ok(cleanWorkerTask(input).config.care_policy);
 assert.throws(()=>cleanWorkerTask({...input,repeat_days:1,scheduled_at:'2026-11-24T09:00+07:00'}));assert.throws(()=>cleanWorkerTask({...input,channel:'meta_facebook'}));
 const careTask={channel:'top_zalo',config:task.config},device={capabilities:['top_zalo']};assert.equal(workerSupportsTask(device,careTask),false);device.capabilities.push('care_top_zalo');assert.equal(workerSupportsTask(device,careTask),true);
});
