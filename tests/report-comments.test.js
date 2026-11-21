import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { reportDay } from '../js/dailyReportModel.js';

test('comments API scopes threads, authors and receipts; rejects spoofing and safely retries sends',async()=>{
 const oldFetch=globalThis.fetch;process.env.SUPABASE_URL='https://supabase.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';
 const staff={id:randomUUID(),role:'staff',acc:'DNG.ManLM3'},other={id:randomUUID(),role:'staff',acc:'DNG.Vypv'},manager={id:randomUUID(),role:'manager',acc:''},lead={id:randomUUID(),role:'lead',acc:'DNG.HoaNTB6'};
 const people=[staff,other,manager,lead],day=reportDay();let caller=staff,comments=[],status='submitted',lastRead=null;
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:input),method=init.method||'GET';
  const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  if(url.pathname==='/auth/v1/user')return json({id:caller.id});
  if(url.pathname==='/rest/v1/profiles'){const id=url.searchParams.get('id');return json(id?.startsWith('eq.')?people.find(p=>p.id===id.slice(3))||null:people);}
  if(['/rest/v1/daily_reports','/rest/v1/market_reports'].includes(url.pathname))return json({user_id:staff.id,report_date:day,status,data:{}});
  if(url.pathname==='/rest/v1/report_comments'){
   if(method==='POST'){const row=JSON.parse(init.body);comments.push({...row,id:randomUUID(),created_at:new Date().toISOString()});return json(comments.at(-1));}
   if(url.searchParams.has('request_id'))return json(comments.find(c=>c.request_id===url.searchParams.get('request_id').slice(3)&&c.author_id===caller.id)||null);
   assert.equal(url.searchParams.get('subject_id'),'eq.'+staff.id);return json([...comments].reverse());
  }
  if(url.pathname==='/rest/v1/report_notifications'){
   assert.equal(url.searchParams.get('recipient_id'),'eq.'+caller.id);
   if(method==='PATCH'){lastRead={url,body:JSON.parse(init.body)};return json(null);}
   return json(comments.map(c=>({id:randomUUID(),comment_id:c.id,comment:c,read_at:null})));
  }
  throw Error(method+' '+url.pathname);
 };
 try{
  const {default:handler}=await import('../api/report-comments.js');
  const invoke=async(method,input={},auth=true)=>{const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method,headers:auth?{authorization:'Bearer test'}:{},query:input,body:input},res);return res;};
  const context={kind:'daily',subject_id:staff.id,report_date:day};
  assert.equal((await invoke('GET',context,false)).code,401);
  assert.equal((await invoke('GET',{...context,subject_id:other.id})).code,403);
  assert.equal((await invoke('GET',{...context,kind:'profiles'})).code,400);
  status='draft';assert.equal((await invoke('GET',context)).code,409);status='submitted';
  caller=manager;const request={...context,action:'comment',body:'Gọi lại khách theo lịch nhé.',request_id:randomUUID(),author_id:other.id};
  assert.equal((await invoke('POST',request)).code,201);assert.equal(comments[0].author_id,manager.id);
  assert.equal((await invoke('POST',request)).code,200);assert.equal(comments.length,1);
  assert.equal((await invoke('POST',{...request,body:'Khác'})).code,409);
  assert.equal((await invoke('POST',{...request,body:'   ',request_id:randomUUID()})).code,400);
  assert.equal((await invoke('POST',{...request,body:'x'.repeat(2001),request_id:randomUUID()})).code,400);
  caller=staff;assert.equal((await invoke('GET',context)).body.comments[0].author,'Trưởng phòng');
  assert.equal((await invoke('GET',{inbox:'mine',recipient_id:manager.id})).body.notifications.length,1);
  assert.equal((await invoke('POST',{action:'read',comment_ids:[comments[0].id],recipient_id:manager.id})).code,200);assert.match(lastRead.url.searchParams.get('recipient_id'),new RegExp(staff.id));assert.ok(lastRead.body.read_at);
  caller=lead;assert.equal((await invoke('GET',context)).code,200);assert.equal((await invoke('GET',{...context,subject_id:other.id})).code,403);
  assert.equal((await invoke('GET',{...context,kind:'market'})).code,200);
 }finally{globalThis.fetch=oldFetch;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;}
});
