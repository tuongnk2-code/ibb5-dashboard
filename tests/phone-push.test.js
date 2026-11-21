import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {phoneAlertState,phonePushDecision} from '../js/phonePushModel.js';
import {validatePushSubscription,validPushEndpoint} from '../js/pushSubscriptionModel.js';
const now=Date.parse('2026-11-21T09:00:00+07:00');
test('phone reminders respect own/team scope, daily deduplication, cooldown, quiet hours and unread-comment cursor',()=>{
 const rows=[{id:'A',type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:''},{id:'OTHER',type:'Internet',staff:'DNG.Vypv',created:'2026-11-01',date:''}],state={rows,notes:{}};
 const alerts=phoneAlertState({id:'staff',role:'staff',acc:'DNG.ManLM3'},state,now);assert.equal(alerts.count,1);
 assert.equal(phoneAlertState({id:'lead',role:'lead',acc:'DNG.HoaNTB6'},state,now).count,1);
 assert.equal(phoneAlertState({id:'manager',role:'manager'},state,now).count,2);
 const sub={last_comment_at:'2026-11-21T01:00:00Z',last_alert_signature:'',last_alert_day:null,last_alert_sent_at:null,test_requested_at:null};
 const first=phonePushDecision(sub,{alerts,now,unread:3});assert.equal(first.payload.badge,4);assert.doesNotMatch(first.payload.body,/DNG|OTHER/);
 const saved={...sub,...first.update};assert.equal(phonePushDecision(saved,{alerts,now:now+120000,unread:3}),null);
 assert.equal(phonePushDecision(saved,{alerts:{count:2,signature:'changed'},now:now+10*60000}),null);
 assert.ok(phonePushDecision(saved,{alerts:{count:2,signature:'changed'},now:now+31*60000}));
 assert.equal(phonePushDecision(sub,{alerts,now:Date.parse('2026-11-21T22:00:00+07:00')}),null);
 assert.equal(phonePushDecision(sub,{alerts:{count:0,signature:'empty'},unread:1,latest:'2026-11-21T00:59:59Z',now}),null);
 assert.ok(phonePushDecision(sub,{alerts:{count:0,signature:'empty'},unread:1,latest:'2026-11-21T01:00:01Z',now}));
 assert.equal(phonePushDecision({...sub,test_requested_at:new Date(now).toISOString()},{alerts,now}).payload.kind,'test');
});
test('subscription endpoints reject private networks and arbitrary hosts',()=>{
 for(const endpoint of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://example.com/x','https://fcm.googleapis.com.evil.test/x','https://user@fcm.googleapis.com/x','https://fcm.googleapis.com:8443/x'])assert.equal(validPushEndpoint(endpoint),false);
 const valid={endpoint:'https://web.push.apple.com/test',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}};assert.equal(validatePushSubscription(valid).endpoint,valid.endpoint);assert.throws(()=>validatePushSubscription({...valid,keys:{auth:'x',p256dh:'y'}}));
});
test('phone API authenticates, exposes only public key and scopes device changes to caller',async()=>{
 const original=globalThis.fetch;process.env.SUPABASE_URL='https://supabase.test';process.env.SUPABASE_SERVICE_ROLE_KEY='test-only';const person={id:randomUUID(),role:'staff',acc:'DNG.ManLM3'},endpoint='https://fcm.googleapis.com/fcm/send/test';let row=null,lastMutation=null;
 globalThis.fetch=async(input,init={})=>{
  const url=new URL(input instanceof Request?input.url:input),method=init.method||'GET',json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json'}});
  if(url.pathname==='/auth/v1/user')return json({id:person.id});if(url.pathname==='/rest/v1/profiles')return json(person);
  if(url.pathname==='/rest/v1/push_settings')return json({public_key:'PUBLIC',private_key:'NEVER_RETURN',worker_secret:'NEVER_RETURN'});
  if(url.pathname==='/rest/v1/push_subscriptions'){
   if(method==='HEAD')return new Response(null,{headers:{'Content-Range':'*/0'}});
   if(method==='GET')return json(row);
   lastMutation={method,url,body:init.body?JSON.parse(init.body):null};
   if(method==='POST'){row={id:randomUUID(),...lastMutation.body};return json(null);}
   assert.equal(url.searchParams.get('user_id'),'eq.'+person.id);if(method==='DELETE')row=null;else Object.assign(row,lastMutation.body);return json(null);
  }throw Error(method+' '+url.pathname);
 };
 try{const {default:handler}=await import('../api/phone-push.js');const call=async(method,input={},auth=true)=>{const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}};await handler({method,query:input,body:input,headers:auth?{authorization:'Bearer test'}:{}},res);return res;};
  assert.equal((await call('GET',{},false)).code,401);const config=await call('GET');assert.equal(config.body.publicKey,'PUBLIC');assert.doesNotMatch(JSON.stringify(config.body),/NEVER_RETURN/);
  assert.equal((await call('POST',{action:'subscribe',subscription:{endpoint:'https://localhost/x'}})).code,400);
  assert.equal((await call('POST',{action:'subscribe',user_id:randomUUID(),subscription:{endpoint,keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}})).code,200);assert.equal(row.user_id,person.id);
  assert.equal((await call('POST',{action:'test',endpoint})).code,202);assert.equal((await call('POST',{action:'test',endpoint})).code,429);
  assert.equal((await call('POST',{action:'unsubscribe',endpoint})).code,200);assert.equal(row,null);
 }finally{globalThis.fetch=original;delete process.env.SUPABASE_URL;delete process.env.SUPABASE_SERVICE_ROLE_KEY;}
});
