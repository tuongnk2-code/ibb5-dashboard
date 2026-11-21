import {getSession} from './auth.js';

let pendingOpen=false,openInbox=null,testStatus=null,badgeRevision=0;
const supported=()=>window.isSecureContext&&'Notification' in window&&'serviceWorker' in navigator&&'PushManager' in window;
async function request(method,input={},timeout=15000){
 const session=await getSession();if(!session?.access_token)throw Error('Vui lòng đăng nhập lại để bật thông báo.');
 const response=await fetch('/api/phone-push'+(method==='GET'?'?'+new URLSearchParams(input):''),{method,cache:'no-store',signal:AbortSignal.timeout(timeout),headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(input):undefined});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Chưa kết nối được thông báo điện thoại.');return result;
}
function publicKey(value){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
async function registration(){
 const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});await reg.update();
 if(reg.installing)await new Promise((resolve,reject)=>{const worker=reg.installing,timer=setTimeout(()=>reject(Error('Chưa cập nhật xong ứng dụng. Anh/chị thử lại sau ít giây.')),12000);worker.addEventListener('statechange',()=>{if(worker.state==='activated'){clearTimeout(timer);resolve();}else if(worker.state==='redundant'){clearTimeout(timer);reject(Error('Chưa cập nhật được ứng dụng.'));}});});
 return navigator.serviceWorker.ready;
}
export function updatePhoneBadge(count){
 if(!('Notification'in window)||Notification.permission!=='granted')return;
 const revision=++badgeRevision;
 try{const result=count>0?navigator.setAppBadge?.(count):navigator.clearAppBadge?.();result?.catch(()=>{});}catch{}
 try{navigator.serviceWorker?.getRegistration('/').then(reg=>{if(revision===badgeRevision)reg?.active?.postMessage({type:'IBB5_SYNC_BADGE',count});}).catch(()=>{});}catch{}
}
export async function clearDisplayedPhoneNotifications(){
 try{const reg=await navigator.serviceWorker?.getRegistration('/');const notifications=await reg?.getNotifications({tag:'ibb5-phone-summary'});notifications?.forEach(notification=>notification.close());}catch{}
}
export async function clearPhonePushOnLogout(){
 if(!('serviceWorker'in navigator))return;
 const reg=await navigator.serviceWorker.getRegistration('/'),subscription=await reg?.pushManager.getSubscription();
 if(subscription){const results=await Promise.allSettled([request('POST',{action:'unsubscribe',endpoint:subscription.endpoint},5000),subscription.unsubscribe()]);if(results.every(result=>result.status==='rejected'))throw Error('Chưa tắt được thông báo trên thiết bị. Anh/chị thử lại khi có mạng.');}
 try{const notifications=await reg?.getNotifications();notifications?.forEach(n=>n.close());await navigator.clearAppBadge?.();}catch{}
}
export function installPhonePush(root,onOpen,{compact=false}={}){
 openInbox=onOpen;root.innerHTML='<section class="rc-phone-push"><h4>Thông báo trên điện thoại</h4><p data-phone-state role="status"></p><div class="rc-actions"><button type="button" data-phone-enable>Bật thông báo điện thoại</button><button type="button" data-phone-test hidden>Gửi thông báo thử</button><button type="button" data-phone-disable hidden>Tắt trên thiết bị này</button></div></section>';
 const enable=root.querySelector('[data-phone-enable]'),test=root.querySelector('[data-phone-test]'),disable=root.querySelector('[data-phone-disable]'),status=root.querySelector('[data-phone-state]');let subscription=null,busy=false;
 let settings=null,enabledLabel=null;
 if(compact){const section=root.querySelector('section');section.classList.add('rc-phone-compact');enable.textContent='Bật thông báo';settings=document.createElement('details');settings.innerHTML='<summary>Cài đặt</summary>';enabledLabel=document.createElement('span');enabledLabel.textContent='✓ Thông báo đã bật';enabledLabel.hidden=true;const actions=document.createElement('div');actions.className='rc-actions';actions.append(test,disable);settings.append(status,actions);section.replaceChildren(enable,enabledLabel,settings);}
 const controls=on=>{enable.hidden=on;test.hidden=disable.hidden=!on;if(enabledLabel)enabledLabel.hidden=!on;};
 const fail=error=>{status.textContent=error.message||'Chưa bật được thông báo. Vui lòng thử lại.';if(settings)settings.open=true;};
 testStatus=()=>{status.textContent='Điện thoại đã nhận được thông báo thử từ máy chủ.';};
 async function refresh(){
  if(!supported()){enable.disabled=true;status.textContent='Trên iPhone, mở IBB5 từ biểu tượng đã cài ở Màn hình chính (iOS 16.4 trở lên) để bật thông báo.';if(settings)settings.open=true;return;}
  if(Notification.permission==='denied'){enable.disabled=true;status.textContent='Thông báo đang bị chặn. Anh/chị mở Cài đặt điện thoại → Thông báo → IBB5 để cho phép.';if(settings)settings.open=true;return;}
  status.textContent='Bật để nhận phản hồi và nhắc việc ngay cả khi không mở app.';
  if(Notification.permission!=='granted')return;
  try{const reg=await navigator.serviceWorker.getRegistration('/');subscription=await reg?.pushManager.getSubscription();if(!subscription)return;const config=await request('GET',{endpoint:subscription.endpoint});if(config.registered){controls(true);status.textContent='Đang bật thông báo trên thiết bị này.';}else{await subscription.unsubscribe();subscription=null;}}
  catch(error){fail(error);}
 }
 enable.onclick=async()=>{
  if(busy||!supported())return;busy=true;enable.disabled=true;
  if(settings)settings.open=true;
  try{
   // Request permission directly in the tap handler, before any network work (required on iPhone).
   const permission=await Notification.requestPermission();if(permission!=='granted'){status.textContent=permission==='denied'?'Anh/chị chưa cho phép thông báo. Có thể bật lại trong Cài đặt điện thoại → Thông báo → IBB5.':'Chưa bật thông báo. Anh/chị có thể thử lại khi cần.';return;}
   status.textContent='Đang kết nối thông báo điện thoại…';const config=await request('GET');if(!config.enabled||!config.publicKey)throw Error('Dịch vụ thông báo chưa sẵn sàng.');
   const reg=await registration();subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey(config.publicKey)});
   await request('POST',{action:'subscribe',subscription:subscription.toJSON()});controls(true);status.textContent='Đã bật. Anh/chị bấm Gửi thông báo thử để kiểm tra trên điện thoại.';if(settings)settings.open=false;
  }catch(error){fail(error);}finally{busy=false;enable.disabled=false;}
 };
 test.onclick=async()=>{if(busy||!subscription)return;busy=true;test.disabled=true;try{await request('POST',{action:'test',endpoint:subscription.endpoint});status.textContent='Đã yêu cầu gửi thử từ máy chủ. Anh/chị chờ thông báo trên điện thoại nhé.';}catch(error){fail(error);}finally{busy=false;test.disabled=false;}};
 disable.onclick=async()=>{if(busy)return;busy=true;disable.disabled=true;try{await clearPhonePushOnLogout();subscription=null;controls(false);status.textContent='Đã tắt thông báo trên thiết bị này.';}catch(error){fail(error);}finally{busy=false;disable.disabled=false;}};
 refresh();
 const refreshPermission=()=>{if(!busy&&root.isConnected){enable.disabled=false;refresh();}};window.addEventListener('focus',refreshPermission);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshPermission();});
 const url=new URL(location.href);if(url.searchParams.has('inbox')){pendingOpen=true;url.searchParams.delete('inbox');history.replaceState(null,'',url.pathname+url.search+url.hash);}
 if(pendingOpen){pendingOpen=false;queueMicrotask(onOpen);}
}
if('serviceWorker'in navigator)navigator.serviceWorker.addEventListener('message',event=>{
 if(event.data?.type==='IBB5_OPEN_NOTIFICATIONS'){if(openInbox)openInbox();else pendingOpen=true;}
 if(event.data?.type==='IBB5_PUSH_RECEIVED'){document.dispatchEvent(new Event('ibb5-report-comments-updated'));if(event.data.kind==='test')testStatus?.();}
});
