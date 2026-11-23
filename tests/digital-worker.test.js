import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canViewWorker,canManageWorker,cleanWorkerTask,parseWorkerCommand,workerOnline } from '../js/digitalWorkerModel.js';
import { createDigitalWorkerHandler } from '../api/digital-worker.js';
const id=n=>'00000000-0000-0000-0000-'+String(n).padStart(12,'0');
const people=[{id:id(1),role:'manager',acc:'DNG.Manager'},{id:id(2),role:'lead',acc:'DNG.HoaNTB6'},{id:id(3),role:'staff',acc:'DNG.ManLM3'},{id:id(4),role:'staff',acc:'DNG.Vypv'}];
test('worker permissions, reviewed commands and schedules are bounded',()=>{
 assert.equal(canViewWorker(people[1],people[2]),true);assert.equal(canViewWorker(people[1],people[3]),false);
 assert.equal(canManageWorker(people[1],people[2]),false);assert.equal(canManageWorker(people[0],people[2]),true);
 assert.equal(canViewWorker(people[2],people[3]),false);assert.equal(canManageWorker(people[2],people[2]),true);
 const task={name:'Chăm khách cũ'},tasks=[task];assert.equal(parseWorkerCommand('Chạy Chăm khách cũ',tasks).task,task);
 assert.equal(parseWorkerCommand('Dừng Chăm khách cũ',tasks).action,'pause');assert.ok(parseWorkerCommand('chạy toàn phòng',tasks).error);
 assert.ok(parseWorkerCommand('run powershell dangerous',tasks).error);assert.ok(parseWorkerCommand('chạy Chăm khách cũ',[task,task]).error);
 const input={name:' A ',channel:'zalo_campaign',content:'Đã duyệt',repeat_days:0};assert.equal(cleanWorkerTask(input).name,'A');
 assert.throws(()=>cleanWorkerTask({...input,channel:'shell'}));assert.throws(()=>cleanWorkerTask({...input,repeat_days:1}));
 assert.throws(()=>cleanWorkerTask({...input,scheduled_at:'bad'}));assert.throws(()=>cleanWorkerTask({...input,content:'x'.repeat(4001)}));
 assert.equal(workerOnline({last_seen_at:new Date().toISOString()}),true);assert.equal(workerOnline({last_seen_at:new Date().toISOString(),revoked:true}),false);
});

function database(){
 const token='dw_'+'A'.repeat(43),device={id:id(10),owner_id:people[2].id,name:'PC',capabilities:['zalo_campaign'],token_hash:createHash('sha256').update(token).digest('hex'),revoked:false};
 const store={profiles:structuredClone(people),worker_devices:[device],worker_tasks:[],worker_runs:[]};
 const from=table=>{let operation='select',payload,filters=[],columns='*',one=false,maximum=Infinity;
  const q={select(value='*'){columns=value;return q;},eq(k,v){filters.push(r=>r[k]===v);return q;},in(k,v){filters.push(r=>v.includes(r[k]));return q;},order(){return q;},limit(n){maximum=n;return q;},maybeSingle(){one=true;return q;},single(){one=true;return q;},insert(value){operation='insert';payload=value;return q;},update(value){operation='update';payload=value;return q;},then(resolve,reject){try{let rows=store[table].filter(r=>filters.every(f=>f(r))).slice(0,maximum);if(operation==='insert'){const row={revision:1,enabled:false,status:'queued',...payload};store[table].push(row);rows=[row];}if(operation==='update')rows.forEach(r=>Object.assign(r,payload));const result=rows.map(row=>columns==='*'?structuredClone(row):Object.fromEntries(columns.split(',').map(k=>[k,row[k]])));return Promise.resolve({data:one?result[0]||null:result,error:null}).then(resolve,reject);}catch(e){return Promise.reject(e).then(resolve,reject);}}};return q;
 };
 const admin={from,async rpc(name,body){assert.equal(name,'enqueue_worker_run');const task=store.worker_tasks.find(t=>t.id===body.p_task);let run=store.worker_runs.find(r=>r.request_id===body.p_request&&r.task_id===task.id);if(!run){run={id:id(20),task_id:task.id,owner_id:task.owner_id,device_id:task.device_id,status:'queued',request_id:body.p_request,task_snapshot:{name:task.name,channel:task.channel,config:task.config}};store.worker_runs.push(run);}return {data:structuredClone(run)};}};
 return {store,admin,token};
}
test('API isolates owners, hashes device credentials, requires capability and acknowledges only claimed jobs',async()=>{
 const {store,admin,token}=database();let caller=people[2];
 const handler=createDigitalWorkerHandler(async req=>req.headers.authorization==='Bearer user'?{admin,caller}:{error:'Unauthorized',status:401},()=>admin);
 async function invoke(body=null,auth='Bearer user'){const response={setHeader(){},status(code){this.code=code;return this;},json(value){this.body=value;return this;}};await handler({method:body?'POST':'GET',headers:{authorization:auth},body},response);return response;}
 assert.equal((await invoke(null,'')).code,401);
 assert.equal((await invoke({action:'register',owner_id:people[3].id,name:'Not mine'})).code,403);
 const registered=await invoke({action:'register',owner_id:caller.id,name:'My PC'});assert.equal(registered.code,200);assert.match(registered.body.token,/^dw_/);assert.ok(store.worker_devices.at(-1).token_hash);assert.notEqual(store.worker_devices.at(-1).token_hash,registered.body.token);
 const payload={action:'create',id:id(11),owner_id:caller.id,device_id:id(10),name:'Chăm khách',channel:'zalo_campaign',content:'Nội dung đã duyệt',repeat_days:0};
 assert.equal((await invoke({...payload,owner_id:people[3].id})).code,403);
 const task=(await invoke(payload)).body.task;assert.equal(task.enabled,false);
 assert.equal((await invoke({action:'enable',task_id:task.id,revision:1})).code,400);
 const run=await invoke({action:'run',task_id:task.id,revision:1,request_id:id(12)});assert.equal(run.code,200);assert.equal(run.body.run.status,'queued');
 assert.equal((await invoke({action:'run',task_id:task.id,revision:1,request_id:id(12)})).body.run.id,run.body.run.id);assert.equal(store.worker_runs.length,1);
 assert.equal((await invoke({action:'create',...payload},'Bearer '+token)).code,401);
 assert.equal((await invoke({action:'complete',run_id:id(99),status:'succeeded',summary:'fake'},'Bearer '+token)).code,404);
 assert.equal((await invoke({action:'complete',run_id:run.body.run.id,status:'succeeded',summary:'fake'},'Bearer '+token)).body.run.status,'queued');
 store.worker_runs[0].status='running';assert.equal((await invoke({action:'complete',run_id:run.body.run.id,status:'succeeded',summary:'Confirmed by adapter'},'Bearer '+token)).body.run.status,'succeeded');
 assert.equal((await invoke({action:'complete',run_id:run.body.run.id,status:'failed',summary:'late'},'Bearer '+token)).body.run.status,'succeeded');
 const view=await invoke();assert.equal(view.body.devices.some(d=>Object.hasOwn(d,'token_hash')),false);
 caller=people[3];assert.equal((await invoke({action:'run',task_id:task.id,revision:1,request_id:id(14)})).code,403);assert.equal((await invoke()).body.tasks.length,0);
 caller=people[1];assert.equal((await invoke()).body.tasks.length,1);assert.equal((await invoke({action:'pause',task_id:task.id,revision:1})).code,403);
 store.worker_devices[0].revoked=true;assert.equal((await invoke({action:'poll'},'Bearer '+token)).code,403);
});

test('free-form planning requires configured AI, uses only controllable owners and performs no writes',async()=>{
 const {store,admin}=database();let caller=people[1],calls=0;const oldKey=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;
 const handler=createDigitalWorkerHandler(async()=>({admin,caller}),()=>admin,async context=>{calls++;assert.deepEqual(context.people.map(p=>p.id),[caller.id]);return {intent:'clarify',summary:'Cần bổ sung',questions:['Nội dung gửi là gì?']};});
 async function invoke(){const response={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method:'POST',headers:{},body:{action:'plan',message:'Gửi chăm khách ngày mai',history:[]}},response);return response;}
 try{assert.equal((await invoke()).code,503);assert.equal(calls,0);process.env.OPENAI_API_KEY='test-only';const result=await invoke();assert.equal(result.code,200);assert.equal(result.body.plan.intent,'clarify');assert.equal(store.worker_tasks.length,0);assert.equal(store.worker_runs.length,0);}
 finally{if(oldKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldKey;}
});
