import { createHash, randomBytes } from 'node:crypto';
import { requireProfile, getSupabaseAdmin } from './_supabaseAdmin.js';
import { WORKER_CHANNELS, canViewWorker, canManageWorker, cleanWorkerTask, workerSupportsTask } from '../js/digitalWorkerModel.js';
import { planWorkerRequest } from './_workerPlanner.js';
import { sharedRow } from './_dashboardState.js';
import { onlineCareEvents } from '../js/onlineCareModel.js';
const plannerLimits=new Map();
const checked=result=>{if(result.error)throw result.error;return result.data;};
const uuid=value=>typeof value==='string'&&/^[a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(value);
const hash=value=>createHash('sha256').update(value).digest('hex');
const deviceColumns='id,owner_id,name,capabilities,last_seen_at,revoked,created_at';
async function careContext(admin,task,owner){
 const all=async query=>{const rows=[];for(let start=0;;start+=1000){const batch=checked(await query.range(start,start+999));rows.push(...batch);if(batch.length<1000)return rows;}};
 const [snapshot,contacts,runs]=await Promise.all([sharedRow(admin,'snapshot'),all(admin.from('care_contacts').select('*').order('contract_id')),all(admin.from('worker_runs').select('*').eq('owner_id',task.owner_id).order('id'))]);
 return onlineCareEvents({task,rows:snapshot?.data?.data||[],contacts,runs,owner});
}
export function createDigitalWorkerHandler(authenticate=requireProfile,adminClient=getSupabaseAdmin,planner=planWorkerRequest){return async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const fail=(status,error)=>res.status(status).json({error});
 try{
  if(!['GET','POST'].includes(req.method))return fail(405,'Phương thức không hỗ trợ.');
  const input=req.body||{};if(JSON.stringify(input).length>60000)return fail(400,'Yêu cầu quá lớn.');
  // Device credentials can only poll/acknowledge their own runs, never CRUD tasks.
  if(req.method==='POST'&&['poll','heartbeat','complete'].includes(input.action)){
   const token=(req.headers.authorization||'').replace(/^Bearer /,'');
   if(!/^dw_[a-zA-Z0-9_-]{43}$/.test(token))return fail(401,'Khóa kết nối máy không hợp lệ.');
   const admin=adminClient(),device=checked(await admin.from('worker_devices').select('*').eq('token_hash',hash(token)).maybeSingle());
   if(!device||device.revoked)return fail(403,'Máy đã bị ngắt kết nối hoặc khóa không còn hiệu lực.');
   if(input.action==='complete'){
    if(!uuid(input.run_id)||!['succeeded','failed','cancelled'].includes(input.status)||typeof input.summary!=='string'||input.summary.length>2000)return fail(400,'Kết quả không hợp lệ.');
    const previous=checked(await admin.from('worker_runs').select('*').eq('id',input.run_id).eq('device_id',device.id).maybeSingle());
    if(!previous)return fail(404,'Không có lượt chạy trên máy này.');
    if(previous.status!=='running')return res.status(200).json({run:previous});
    const run=checked(await admin.from('worker_runs').update({status:input.status,summary:input.summary,finished_at:new Date().toISOString()}).eq('id',previous.id).eq('status','running').select().maybeSingle());
    return res.status(200).json({run});
   }
   const capabilities=Array.isArray(input.capabilities)?[...new Set(input.capabilities.filter(c=>Object.hasOwn(WORKER_CHANNELS,c)||c==='workflow_v1'||(typeof c==='string'&&c.startsWith('care_')&&Object.hasOwn(WORKER_CHANNELS,c.slice(5)))))]:device.capabilities;
   checked(await admin.from('worker_devices').update({last_seen_at:new Date().toISOString(),capabilities}).eq('id',device.id));
   const active=checked(await admin.from('worker_runs').select('id,cancel_requested').eq('device_id',device.id).eq('status','running').maybeSingle());
   const run=input.action==='poll'&&!active?checked(await admin.rpc('claim_worker_run',{p_device:device.id})):null;
   return res.status(200).json({run,active,serverTime:new Date().toISOString()});
  }
  const auth=await authenticate(req);if(auth.error)return fail(auth.status,auth.error);
  const {admin,caller}=auth,people=checked(await admin.from('profiles').select('id,acc,full_name,role'));
  const byId=new Map(people.map(p=>[p.id,p])),owners=people.filter(p=>canViewWorker(caller,p)),ids=owners.map(p=>p.id);
  if(req.method==='POST'&&input.action==='plan'){
   if(!process.env.OPENAI_API_KEY)return res.status(503).json({code:'AI_NOT_CONFIGURED',error:'Chưa kích hoạt AI hiểu yêu cầu tự do trên máy chủ. Cần cấu hình khóa AI; anh/chị vẫn có thể dùng Tạo tác vụ hoặc lệnh cho tác vụ có sẵn.'});
   const now=Date.now();for(const [id,value]of plannerLimits)if(now>value.until)plannerLimits.delete(id);
   const limit=plannerLimits.get(caller.id)||{count:0,until:now+60000};if(limit.count>=6||plannerLimits.size>1000)return fail(429,'Anh/chị chờ một phút rồi tạo kế hoạch tiếp nhé.');limit.count++;plannerLimits.set(caller.id,limit);
   const plan=await planner({message:input.message,history:input.history||[],caller,people:owners.filter(p=>canManageWorker(caller,p))});
   return res.status(200).json({plan});
  }
  if(req.method==='GET'){
   const [devices,tasks,runs]=ids.length?await Promise.all([
    admin.from('worker_devices').select(deviceColumns).in('owner_id',ids).order('created_at',{ascending:false}).limit(500),
    admin.from('worker_tasks').select('*').in('owner_id',ids).order('created_at',{ascending:false}).limit(1000),
    admin.from('worker_runs').select('*').in('owner_id',ids).order('created_at',{ascending:false}).limit(300),
   ]):[{data:[]},{data:[]},{data:[]}];
   return res.status(200).json({people:owners,devices:checked(devices),tasks:checked(tasks),runs:checked(runs),serverTime:new Date().toISOString(),aiConfigured:!!process.env.OPENAI_API_KEY});
  }
  if(input.action==='register'){
   const owner=byId.get(input.owner_id);if(!canManageWorker(caller,owner))return fail(403,'Không có quyền kết nối máy cho nhân sự này.');
   if(typeof input.name!=='string'||!input.name.trim()||input.name.length>100)return fail(400,'Nhập tên máy tối đa 100 ký tự.');
   const token='dw_'+randomBytes(32).toString('base64url');
   const device=checked(await admin.from('worker_devices').insert({owner_id:owner.id,name:input.name.trim(),token_hash:hash(token)}).select(deviceColumns).single());
   return res.status(200).json({device,token});
  }
  if(input.action==='revoke'){
   const device=uuid(input.device_id)&&checked(await admin.from('worker_devices').select(deviceColumns).eq('id',input.device_id).maybeSingle());
   if(!device||!canManageWorker(caller,byId.get(device.owner_id)))return fail(403,'Không có quyền ngắt máy này.');
   checked(await admin.from('worker_devices').update({revoked:true}).eq('id',device.id));
   checked(await admin.from('worker_tasks').update({enabled:false}).eq('device_id',device.id));
   checked(await admin.from('worker_runs').update({status:'cancelled',summary:'Đã ngắt máy trước khi thực hiện.',finished_at:new Date().toISOString()}).eq('device_id',device.id).eq('status','queued'));
   checked(await admin.from('worker_runs').update({status:'failed',cancel_requested:true,finished_at:new Date().toISOString(),summary:'Máy bị ngắt kết nối khi đang thực hiện. Kiểm tra tool trước khi chạy lại vì có thể đã thực hiện một phần.'}).eq('device_id',device.id).eq('status','running'));
   return res.status(200).json({ok:true});
  }
  if(input.action==='create'){
   const owner=byId.get(input.owner_id);if(!canManageWorker(caller,owner))return fail(403,'Chỉ tạo tác vụ cho bản thân hoặc do Trưởng phòng phân công.');
   if(!uuid(input.id))return fail(400,'Mã tác vụ không hợp lệ.');
   const clean=cleanWorkerTask(input);
   const device=input.device_id&&uuid(input.device_id)?checked(await admin.from('worker_devices').select(deviceColumns).eq('id',input.device_id).maybeSingle()):null;
   if(input.device_id&&(!device||device.revoked||device.owner_id!==owner.id))return fail(400,'Chọn máy thuộc đúng nhân sự.');
   const task=checked(await admin.from('worker_tasks').insert({id:input.id,owner_id:owner.id,created_by:caller.id,device_id:device?.id||null,name:clean.name,channel:clean.channel,config:clean.config,scheduled_at:clean.scheduled_at,next_run_at:clean.scheduled_at,repeat_days:clean.repeat_days}).select().single());
   return res.status(200).json({task});
  }
  const task=uuid(input.task_id)&&checked(await admin.from('worker_tasks').select('*').eq('id',input.task_id).maybeSingle());
  if(input.action==='care_preview'&&task?.config.care_policy&&canViewWorker(caller,byId.get(task.owner_id))){
   const events=await careContext(admin,task,byId.get(task.owner_id)),matching=input.status?events.filter(e=>e.status===input.status):events,offset=Number.isInteger(input.offset)&&input.offset>=0?input.offset:0;
   return res.status(200).json({events:matching.slice(offset,offset+100),total:matching.length,stats:Object.fromEntries(['future','due','missed','queued','running','succeeded','failed'].map(status=>[status,events.filter(e=>e.status===status).length]))});
  }
  if(!task||!canManageWorker(caller,byId.get(task.owner_id)))return fail(403,'Không có quyền điều khiển tác vụ này.');
  if(input.action==='approve_care'){
   if(caller.role!=='manager')return fail(403,'Chỉ Trưởng phòng được duyệt chăm bù các mốc đã quá.');
   if(!task.config.care_policy||input.revision!==task.revision)return fail(409,'Lịch hoặc kịch bản vừa thay đổi. Tải lại trước khi duyệt.');
   if(!Array.isArray(input.keys)||!input.keys.length||input.keys.length>100||input.keys.some(k=>typeof k!=='string'||k.length>110))return fail(400,'Chọn từ 1 đến 100 mốc quá hạn để duyệt.');
   const events=await careContext(admin,task,byId.get(task.owner_id));let queued=0,skipped=0;
   for(const key of new Set(input.keys)){const event=events.find(e=>e.key===key&&e.can_approve);if(!event){skipped++;continue;}const result=checked(await admin.rpc('enqueue_online_care',{p_task:task.id,p_contract:event.contract_id,p_offset:event.offset,p_late:true,p_revision:task.revision}));if(result?.id&&result.status==='queued')queued++;else skipped++;}
   return res.status(200).json({queued,skipped});
  }
  if(input.action==='update'){
   const clean=cleanWorkerTask(input),device=input.device_id&&uuid(input.device_id)?checked(await admin.from('worker_devices').select(deviceColumns).eq('id',input.device_id).maybeSingle()):null;
   if(input.device_id&&(!device||device.revoked||device.owner_id!==task.owner_id))return fail(400,'Chọn máy thuộc đúng nhân sự.');
   const saved=checked(await admin.from('worker_tasks').update({name:clean.name,channel:clean.channel,config:clean.config,device_id:device?.id||null,scheduled_at:clean.scheduled_at,next_run_at:clean.scheduled_at,repeat_days:clean.repeat_days,enabled:false,revision:task.revision+1,updated_at:new Date().toISOString()}).eq('id',task.id).eq('revision',input.revision).select().maybeSingle());
   if(!saved)return fail(409,'Tác vụ vừa thay đổi. Tải lại trước khi lưu.');
   return res.status(200).json({task:saved});
  }
  if(input.action==='run'){
   if(task.config.care_policy)return fail(400,'Dùng Bật lịch CSKH hoặc duyệt mốc chăm bù; không chạy chung cả danh sách.');
   if(!uuid(input.request_id))return fail(400,'Mã yêu cầu chạy không hợp lệ.');
   if(!Number.isInteger(input.revision))return fail(400,'Cần xem trước tác vụ trước khi chạy.');
   const run=checked(await admin.rpc('enqueue_worker_run',{p_task:task.id,p_request:input.request_id,p_revision:input.revision}));
   return res.status(200).json({run});
  }
  if(input.action==='cancel'){
   if(!uuid(input.run_id))return fail(400,'Mã lượt chạy không hợp lệ.');
   const run=checked(await admin.from('worker_runs').select('*').eq('id',input.run_id).eq('task_id',task.id).maybeSingle());
   if(!run)return fail(404,'Không tìm thấy lượt chạy.');
   if(run.status==='queued')checked(await admin.from('worker_runs').update({status:'cancelled',cancel_requested:true,finished_at:new Date().toISOString(),summary:'Đã dừng trước khi chạy.'}).eq('id',run.id).eq('status','queued'));
   checked(await admin.from('worker_runs').update({cancel_requested:true}).eq('id',run.id).eq('status','running'));
   return res.status(200).json({ok:true});
  }
  if(['enable','pause'].includes(input.action)){
   if(input.revision!==task.revision)return fail(409,'Tác vụ vừa thay đổi. Tải lại trước khi điều khiển.');
   if(input.action==='enable'){
    const device=task.device_id&&checked(await admin.from('worker_devices').select(deviceColumns).eq('id',task.device_id).maybeSingle());
    if(!workerSupportsTask(device,task))return fail(400,'Chưa kết nối đủ các tool cần thiết trên máy đã chọn.');
    if(!task.config.care_policy&&!task.scheduled_at)return fail(400,'Tác vụ chưa có lịch. Dùng Chạy ngay hoặc tạo tác vụ có lịch.');
    if(!task.config.care_policy&&!task.repeat_days&&!task.next_run_at)return fail(400,'Lịch một lần đã kết thúc. Dùng Chạy ngay hoặc sửa lịch mới.');
   }
   const updated=checked(await admin.from('worker_tasks').update({enabled:input.action==='enable',next_run_at:task.config.care_policy?new Date().toISOString():task.next_run_at||task.scheduled_at,revision:task.revision+1,updated_at:new Date().toISOString()}).eq('id',task.id).eq('revision',task.revision).select().maybeSingle());
   if(!updated)return fail(409,'Tác vụ vừa thay đổi. Tải lại trước khi điều khiển.');
   return res.status(200).json({task:updated});
  }
  return fail(400,'Thao tác không hợp lệ.');
 }catch(error){
  if(['42P01','PGRST205','PGRST202'].includes(error.code))return fail(503,'Nhân sự số chưa sẵn sàng trên máy chủ.');
  if(error.code==='23505')return fail(409,'Yêu cầu này đã được lưu. Tải lại để đối chiếu.');
  if(error.code==='P0001'||(!error.code&&error instanceof Error&&error.name!=='TypeError'))return fail(400,error.message);
  console.error('digital-worker:',error.code||error.name);return fail(500,'Chưa thực hiện được yêu cầu. Vui lòng thử lại.');
 }
};}
export default createDigitalWorkerHandler();
