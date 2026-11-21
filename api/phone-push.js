import {requireProfile} from './_supabaseAdmin.js';
import {validatePushSubscription,validPushEndpoint} from '../js/pushSubscriptionModel.js';
const check=result=>{if(result.error)throw result.error;return result.data;};
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 try{
  const auth=await requireProfile(req);if(auth.error)return res.status(auth.status).json({error:auth.error});const {admin,caller}=auth;
  if(req.method==='GET'){const config=check(await admin.from('push_settings').select('public_key').eq('singleton',true).maybeSingle());let registered=false;if(req.query?.endpoint){if(!validPushEndpoint(req.query.endpoint))return res.status(400).json({error:'Thiết bị không hợp lệ.'});registered=!!check(await admin.from('push_subscriptions').select('id').eq('user_id',caller.id).eq('endpoint',req.query.endpoint).maybeSingle());}return res.status(200).json({enabled:!!config,publicKey:config?.public_key||null,registered});}
  if(req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Phương thức không hỗ trợ.'});}
  const input=req.body||{};
  if(input.action==='subscribe'){
   let subscription;try{subscription=validatePushSubscription(input.subscription);}catch(error){return res.status(400).json({error:error.message});}
   const existing=check(await admin.from('push_subscriptions').select('id,user_id').eq('endpoint',subscription.endpoint).maybeSingle());
   if(existing?.user_id!==caller.id){const count=await admin.from('push_subscriptions').select('id',{count:'exact',head:true}).eq('user_id',caller.id);if(count.error)throw count.error;if(count.count>=10)return res.status(409).json({error:'Tài khoản đã bật thông báo trên 10 thiết bị. Vui lòng tắt ở thiết bị cũ trước.'});}
   const record={...subscription,user_id:caller.id};
   if(existing?.user_id!==caller.id)Object.assign(record,{created_at:new Date().toISOString(),last_comment_at:new Date().toISOString(),last_alert_signature:'',last_alert_day:null,last_alert_sent_at:null,alert_count:0,test_requested_at:null,test_delivered_at:null,failures:0,next_attempt_at:new Date().toISOString()});
   check(await admin.from('push_subscriptions').upsert(record,{onConflict:'endpoint'}));return res.status(200).json({ok:true});
  }
  if(!['unsubscribe','test'].includes(input.action)||!validPushEndpoint(input.endpoint))return res.status(400).json({error:'Yêu cầu không hợp lệ.'});
  if(input.action==='unsubscribe'){check(await admin.from('push_subscriptions').delete().eq('user_id',caller.id).eq('endpoint',input.endpoint));return res.status(200).json({ok:true});}
  const existing=check(await admin.from('push_subscriptions').select('id,test_requested_at').eq('user_id',caller.id).eq('endpoint',input.endpoint).maybeSingle());
  if(!existing)return res.status(404).json({error:'Chưa bật thông báo trên thiết bị này.'});
  if(existing.test_requested_at&&Date.now()-Date.parse(existing.test_requested_at)<60000)return res.status(429).json({error:'Anh/chị chờ một phút trước khi gửi thử tiếp.'});
  check(await admin.from('push_subscriptions').update({test_requested_at:new Date().toISOString(),next_attempt_at:new Date().toISOString()}).eq('id',existing.id).eq('user_id',caller.id));return res.status(202).json({ok:true});
 }catch(error){console.error('phone-push:',error.code||error.name);return res.status(503).json({error:'Chưa kết nối được dịch vụ thông báo điện thoại. Vui lòng thử lại.'});}
}
