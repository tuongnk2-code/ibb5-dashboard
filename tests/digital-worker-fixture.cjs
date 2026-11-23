exports.fixture=async(options={})=>{
 const {createDigitalWorkerHandler}=await import('../api/digital-worker.js');
 const ids={manager:'11111111-1111-4111-8111-111111111111',staff:'22222222-2222-4222-8222-222222222222',outside:'33333333-3333-4333-8333-333333333333',lead:'44444444-4444-4444-8444-444444444444'};
 const people=[{id:ids.manager,role:'manager',acc:'DNG.Manager',full_name:'Trưởng phòng'},{id:ids.staff,role:'staff',acc:'DNG.ManLM3',full_name:'Lê Minh Mẫn'},{id:ids.outside,role:'staff',acc:'DNG.Vypv',full_name:'Phan Văn Vĩ'},{id:ids.lead,role:'lead',acc:'DNG.HoaNTB6',full_name:'Nguyễn Thị Bích Hòa'}];
 const tables={profiles:people,worker_devices:[],worker_tasks:[],worker_runs:[]};
 class Query{
  constructor(table){this.table=table;this.filters=[];this.columns='*';}
  select(columns='*'){this.columns=columns;return this;}eq(k,v){this.filters.push(r=>r[k]===v);return this;}in(k,values){this.filters.push(r=>values.includes(r[k]));return this;}order(){return this;}limit(n){this.maximum=n;return this;}
  maybeSingle(){this.one=true;return this;}single(){this.one=true;return this;}insert(value){this.mode='insert';this.value=value;return this;}update(value){this.mode='update';this.value=value;return this;}
  then(resolve,reject){try{let rows=tables[this.table].filter(r=>this.filters.every(fn=>fn(r)));if(this.mode==='insert'){const row={id:require('node:crypto').randomUUID(),revision:1,enabled:false,status:'queued',capabilities:[],last_seen_at:null,revoked:false,created_at:new Date().toISOString(),...this.value};tables[this.table].push(row);rows=[row];}if(this.mode==='update')rows.forEach(r=>Object.assign(r,this.value));rows=rows.slice(0,this.maximum||10000).map(row=>this.columns==='*'?row:Object.fromEntries(this.columns.split(',').map(k=>[k,row[k]])));resolve({data:structuredClone(this.one?rows[0]||null:rows)});}catch(error){reject(error);}}
 }
 const admin={from:table=>new Query(table),rpc:async(name,body)=>{
  if(name!=='enqueue_worker_run')throw Error('Unexpected RPC');const task=tables.worker_tasks.find(t=>t.id===body.p_task),device=tables.worker_devices.find(d=>d.id===task.device_id);
  if(!device||device.revoked||!device.capabilities.includes(task.channel))return {error:{code:'P0001',message:'Chưa kết nối tool'}};
  let run=tables.worker_runs.find(r=>r.task_id===task.id&&r.request_id===body.p_request);
  if(!run){if(body.p_revision!==task.revision)return {error:{code:'P0001',message:'Tác vụ đã thay đổi'}};if(tables.worker_runs.some(r=>r.task_id===task.id&&['queued','running'].includes(r.status)))return {error:{code:'P0001',message:'Tác vụ đang chạy'}};run={id:require('node:crypto').randomUUID(),task_id:task.id,device_id:device.id,owner_id:task.owner_id,request_id:body.p_request,task_snapshot:{name:task.name,channel:task.channel,config:structuredClone(task.config)},status:'queued',summary:'',created_at:new Date().toISOString()};tables.worker_runs.push(run);}return {data:structuredClone(run)};
 }};
 const handler=createDigitalWorkerHandler(async req=>{const caller=people.find(p=>req.headers.authorization==='Bearer '+p.id);return caller?{caller,admin}:{error:'Thiếu phiên đăng nhập.',status:401};},()=>admin,options.planner);
 const request=async(user,method='GET',body)=>{let status=200,payload;const res={setHeader(){},status(value){status=value;return res;},json(value){payload=value;return res;}};await handler({method,headers:{authorization:'Bearer '+user},body},res);return {status,body:payload};};
 return {ids,people,tables,request};
};
