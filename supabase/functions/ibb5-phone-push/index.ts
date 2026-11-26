import {createClient} from 'npm:@supabase/supabase-js@2.118.0';
import webpush from 'npm:web-push@3.6.7';
import {phoneAlertState,phonePushDecision} from '../../../js/phonePushModel.js';
import {canSeeReport} from '../../../js/dailyReportModel.js';

const check=(result:any)=>{if(result.error)throw result.error;return result.data;};
let cachedState:any=null,cachedVersion='';
async function sameSecret(a:string,b:string){const encode=new TextEncoder();const [x,y]=await Promise.all([crypto.subtle.digest('SHA-256',encode.encode(a)),crypto.subtle.digest('SHA-256',encode.encode(b))]);return new Uint8Array(x).reduce((n,v,i)=>n|(v^new Uint8Array(y)[i]),0)===0;}
Deno.serve(async(req:Request)=>{
 if(req.method!=='POST')return new Response('Method not allowed',{status:405});
 const secret=req.headers.get('x-ibb5-push-secret')||'';if(secret.length!==64)return new Response('Unauthorized',{status:401});
 const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}}),workerId=crypto.randomUUID();let claimed=false;
 try{
  const config=check(await admin.from('push_settings').select('*').eq('singleton',true).single());if(!await sameSecret(secret,config.worker_secret))return new Response('Unauthorized',{status:401});
  claimed=check(await admin.rpc('claim_push_worker',{worker_id:workerId}));if(!claimed)return Response.json({busy:true});
  const now=Date.now(),subscriptions=check(await admin.from('push_subscriptions').select('*').lte('next_attempt_at',new Date(now).toISOString()).order('created_at').limit(1000));
  if(!subscriptions.length)return Response.json({devices:0,sent:0});
  const people=check(await admin.from('profiles').select('id,role,acc')),byId=new Map(people.map((p:any)=>[p.id,p]));
  const version=check(await admin.rpc('push_state_version'));
  if(!cachedState||version!==cachedVersion){cachedState=check(await admin.rpc('push_contract_state'));cachedVersion=version;}
  const state=cachedState,unreadState=check(await admin.rpc('push_unread_state'));
  const reads=new Map();for(let offset=0;;offset+=1000){const batch=check(await admin.from('contract_alert_reads').select('user_id,contract_id,signature').in('user_id',[...new Set(subscriptions.map((s:any)=>s.user_id))]).order('user_id').order('contract_id').range(offset,offset+999));for(const record of batch){if(!reads.has(record.user_id))reads.set(record.user_id,{});reads.get(record.user_id)[record.contract_id]=record.signature;}if(batch.length<1000)break;}
  webpush.setVapidDetails('https://ibb5-dashboard.vercel.app',config.public_key,config.private_key);
  const alerts=new Map();let sent=0,removed=0,failed=0;
  // Bound parallelism so one bad endpoint cannot prevent delivery to the remaining devices.
  for(let offset=0;offset<subscriptions.length&&Date.now()-now<45000;offset+=8)await Promise.all(subscriptions.slice(offset,offset+8).map(async(subscription:any)=>{
   const person:any=byId.get(subscription.user_id);if(!person){check(await admin.from('push_subscriptions').delete().eq('id',subscription.id));return;}
   if(person.role==='ctv')return;
   if(!alerts.has(person.id))alerts.set(person.id,phoneAlertState(person,state,now,reads.get(person.id)||{}));
   const visible=unreadState.filter((n:any)=>n.recipient_id===person.id&&byId.has(n.subject_id)&&canSeeReport(person,byId.get(n.subject_id)));
   const unread=visible.reduce((sum:number,n:any)=>sum+n.unread,0),latest=visible.map((n:any)=>n.latest).sort((a:string,b:string)=>Date.parse(b)-Date.parse(a))[0]||null;
   const decision=phonePushDecision(subscription,{alerts:alerts.get(person.id),unread,latest,now});if(!decision)return;
   try{
    await webpush.sendNotification({endpoint:subscription.endpoint,keys:{p256dh:subscription.p256dh,auth:subscription.auth}},JSON.stringify(decision.payload),{TTL:3600,urgency:'normal',timeout:6000});
    check(await admin.from('push_subscriptions').update({...decision.update,failures:0,next_attempt_at:new Date(now).toISOString(),last_sent_at:new Date(now).toISOString()}).eq('id',subscription.id));sent++;
   }catch(error:any){
    if([404,410].includes(error.statusCode)){check(await admin.from('push_subscriptions').delete().eq('id',subscription.id));removed++;}
    else{const failures=subscription.failures+1;check(await admin.from('push_subscriptions').update({failures,next_attempt_at:new Date(now+Math.min(3600000,60000*2**Math.min(failures,6))).toISOString()}).eq('id',subscription.id));failed++;}
   }
  }));
  return Response.json({devices:subscriptions.length,sent,removed,failed});
 }catch(error:any){console.error('phone-push-worker',error.code||error.name||'error');return Response.json({error:'Delivery unavailable'},{status:503});}
 finally{if(claimed)await admin.from('push_settings').update({lease_until:new Date().toISOString()}).eq('singleton',true).eq('lease_id',workerId);}
});
