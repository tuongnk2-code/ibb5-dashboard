import { getSession } from './auth.js';
import { reportText, reportIdentity } from './dailyReportModel.js';
import { contractAlerts, CONTRACT_ALERT_LABELS } from './contractAlertModel.js';
import { installPhonePush, updatePhoneBadge, clearDisplayedPhoneNotifications } from './phonePush.js';
import { unreadContractAlerts, mergeContractAlertReads } from './contractAlertReadModel.js';
import './reportComments.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value.split('-').reverse().join('/');
const time=value=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
async function api(method,input,signal){
 const session=await getSession();if(!session?.access_token)throw Error('Phiên đăng nhập đã hết hạn.');
 const response=await fetch('/api/report-comments'+(method==='GET'?'?'+new URLSearchParams(input):''),{method,cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(input):undefined});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Không kết nối được phần bình luận.');return result;
}
const changed=detail=>document.dispatchEvent(new CustomEvent('ibb5-report-comments-updated',{detail}));
export function mountReportComments(root,context,{onReport}={}){
 root.innerHTML='<section class="rc-thread"><h4>Bình luận & phản hồi</h4><p class="rc-note">Phản hồi được gửi vào chuông thông báo của nhân sự và người đã tham gia trao đổi.</p><div class="rc-comments" aria-live="polite"></div><p class="rc-status" role="status"></p><form><label>Nội dung bình luận<textarea maxlength="2000" rows="3" required placeholder="Nhập phản hồi hoặc hướng xử lý cụ thể…"></textarea></label><div class="rc-actions"><button type="submit">Gửi bình luận</button><button type="button" data-rc-reload>Tải lại</button></div></form></section>';
 const comments=root.querySelector('.rc-comments'),status=root.querySelector('.rc-status'),form=root.querySelector('form'),input=root.querySelector('textarea'),button=form.querySelector('[type=submit]');
 let disposed=false,busy=false,loading=false,requestId=crypto.randomUUID(),lastBody='';const controller=new AbortController();
 const notifyRead=async ids=>{if(!ids.length)return;await api('POST',{action:'read',comment_ids:ids});clearDisplayedPhoneNotifications();changed({commentIds:ids});};
 async function load(){
  if(disposed||loading)return;loading=true;status.textContent='Đang tải bình luận…';
  try{
   const result=await api('GET',context,controller.signal);if(disposed)return;
   onReport?.(result);comments.innerHTML=result.comments.map(c=>'<article><header><strong>'+esc(c.author)+'</strong><time>'+esc(time(c.created_at))+'</time></header><p>'+esc(c.body)+'</p></article>').join('')||'<p class="rc-empty">Chưa có bình luận. Anh có thể gửi phản hồi đầu tiên.</p>';
   status.textContent=result.comments.length===200?'Đang hiển thị 200 bình luận gần nhất.':'';
   notifyRead(result.comments.map(c=>c.id)).catch(()=>{if(!disposed)status.textContent='Đã tải bình luận; chưa đồng bộ được trạng thái đã đọc. Bấm Tải lại để thử lại.';});
  }catch(error){if(!disposed)status.textContent=error.message;}
  finally{loading=false;}
 }
 form.onsubmit=async event=>{
  event.preventDefault();const body=input.value.trim();if(busy||!body)return;
  if(body!==lastBody){requestId=crypto.randomUUID();lastBody=body;}
  busy=true;button.disabled=true;input.readOnly=true;status.textContent='Đang gửi…';
  try{await api('POST',{...context,action:'comment',body,request_id:requestId});if(disposed)return;input.value='';lastBody='';requestId=crypto.randomUUID();changed();await load();}
  catch(error){if(!disposed)status.textContent=error.message+' Nội dung vẫn được giữ để anh/chị thử lại.';}
  finally{busy=false;button.disabled=false;input.readOnly=false;}
 };
 root.querySelector('[data-rc-reload]').onclick=load;
 const timer=setInterval(()=>{if(!document.hidden&&!busy&&root.isConnected&&!root.closest('dialog:not([open])'))load();},20000);
 load();
 return ()=>{disposed=true;controller.abort();clearInterval(timer);};
}

export function openReportDiscussion(context){
 const dialog=document.createElement('dialog');dialog.className='rc-dialog';dialog.innerHTML='<header class="rc-dialog-head"><h3>Trao đổi báo cáo</h3><button type="button" aria-label="Đóng bình luận">Đóng</button></header><pre class="rc-report"></pre><div class="rc-mount"></div>';
 document.body.append(dialog);const previous=document.activeElement;dialog.showModal();dialog.querySelector('button').onclick=()=>dialog.close();
 const dispose=mountReportComments(dialog.querySelector('.rc-mount'),context,{onReport:({report,subject})=>{
  dialog.querySelector('h3').textContent=(context.kind==='daily'?'Báo cáo ngày':'Báo cáo thị trường')+' · '+reportIdentity(subject)+' · '+date(context.report_date);
  dialog.querySelector('.rc-report').textContent=context.kind==='daily'?reportText(subject,context.report_date,report.data):'Tham gia: '+report.data.sessions+' · Demo: '+report.data.demos+' · PTTB: '+report.data.pttb+'\nKhu vực: '+(report.data.area||'—')+'\nGhi chú: '+(report.data.note||'—');
 }});
 dialog.addEventListener('close',()=>{dispose();dialog.remove();if(previous?.isConnected)previous.focus();},{once:true});
}

export function installReportNotifications({getContractContext=()=>null,onOpenContract=()=>false}={}){
 if(document.getElementById('reportNotificationButton'))return;
 const anchor=document.getElementById('topLogoutBtn');if(!anchor)return;
 const button=document.createElement('button');button.id='reportNotificationButton';button.type='button';button.className='rc-bell top-logout-btn';button.innerHTML='<svg class="rc-bell-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg><span>Thông báo</span><b hidden>0</b>';button.setAttribute('aria-label','Thông báo báo cáo');
 const dock=document.createElement('div');dock.className='ibb-floating-actions';dock.append(button);const assistant=document.getElementById('ibbAssistantLauncher');if(assistant)dock.append(assistant);document.body.append(dock);
 const dialog=document.createElement('dialog');dialog.className='rc-dialog rc-inbox';dialog.innerHTML='<header class="rc-dialog-head"><h3>Thông báo báo cáo</h3><button type="button">Đóng</button></header><p class="rc-note">Phản hồi được cập nhật khi đang mở dashboard, hoặc khi đăng nhập lại.</p><div class="rc-inbox-list"></div><p class="rc-status" role="status"></p><button type="button" data-rc-inbox-reload>Tải lại thông báo</button>';document.body.append(dialog);
 const list=dialog.querySelector('.rc-inbox-list'),status=dialog.querySelector('.rc-status');let notifications=[],busy=false;const viewedComments=new Set();
 dialog.querySelector('h3').textContent='Thông báo & nhắc việc';dialog.querySelector('.rc-note').textContent='Phản hồi mới và HĐ cần xử lý trong phạm vi tài khoản của bạn.';
 const alertsRoot=document.createElement('section');alertsRoot.className='rc-contract-alerts';list.before(alertsRoot);
 const messagesHeading=document.createElement('h4');messagesHeading.textContent='Bình luận & phản hồi';list.before(messagesHeading);
 let alerts=null,rawAlerts=null,selectedAlert='',selectedSnapshot=null,alertReadsReady=false,serverReads=[],localReads=[];
 function updateBadge(){
  const unread=notifications.filter(n=>!n.read_at).length,total=unread+(alerts?.total||0),badge=button.querySelector('b');badge.textContent=total>=100?'99+':String(total);badge.hidden=!total;
  const label=[unread+' phản hồi chưa đọc',(alerts?.total||0)+' HĐ có cảnh báo chưa xem'].join(' · ');button.setAttribute('aria-label','Thông báo, '+label);button.title=label;
  updatePhoneBadge(total);
 }
 function drawMessages(){list.innerHTML=notifications.map(n=>'<button type="button" class="rc-notification rc-unread" data-rc-notification="'+esc(n.id)+'"><strong>'+esc(n.author)+' · '+(n.comment.kind==='daily'?'Báo cáo ngày':'Báo cáo thị trường')+'</strong><span>'+esc(n.subject)+' · '+date(n.comment.report_date)+'</span><p>'+esc(n.comment.body)+'</p><small>'+time(n.created_at)+' · Chưa đọc</small></button>').join('')||'<p>Không có phản hồi chưa đọc.</p>';}
 function refreshAlerts(){
  const context=getContractContext();rawAlerts=context?contractAlerts(context):null;alerts=context&&alertReadsReady?unreadContractAlerts(rawAlerts,context.notes,mergeContractAlertReads(serverReads,localReads)):null;alertsRoot.hidden=!alerts;updateBadge();if(!alerts)return;
  const groups=Object.entries(alerts.groups).filter(([,rows])=>rows.length);
  alertsRoot.innerHTML='<h4>Cảnh báo HĐ chưa xem · '+alerts.total+' HĐ</h4><p class="rc-note">Nội dung đã xem sẽ ẩn khỏi chuông; chỉ báo lại khi có thay đổi cần chú ý. Theo dữ liệu NET hiện có'+(alerts.netUpdatedAt?' · NET cập nhật '+esc(time(alerts.netUpdatedAt)):'')+'.</p>';
  if(!groups.length)alertsRoot.insertAdjacentHTML('beforeend','<p>Hiện không có cảnh báo HĐ chưa xem.</p>');
  alertsRoot.insertAdjacentHTML('beforeend','<div class="rc-alert-groups">'+groups.map(([key,rows])=>'<button type="button" data-contract-alert="'+key+'" aria-pressed="'+(key===selectedAlert)+'"><span>'+CONTRACT_ALERT_LABELS[key]+'</span><b>'+rows.length+' HĐ</b></button>').join('')+'</div>');
  if(!selectedSnapshot)return;
  alertsRoot.insertAdjacentHTML('beforeend','<h4>'+CONTRACT_ALERT_LABELS[selectedSnapshot.kind]+' · Danh sách đang xem</h4><div class="rc-alert-contracts">'+selectedSnapshot.rows.map(row=>'<article><strong>'+esc(row.id)+' · '+esc(row.staff||'Chưa gán Acc')+'</strong><p>'+esc(row.customer||'')+'</p><small>'+[row.expected?'Hẹn: '+date(row.expected)+(row.timeSlot?' · '+esc(row.timeSlot):''):'Chưa có ngày hẹn',row.online?'Đã Online · Còn thiếu cập nhật':'Chưa ghi nhận Online',row.updated?'Cập nhật: '+esc(time(row.updated)):'Chưa ghi nhận cập nhật'].join('<br>')+'</small><button type="button" data-alert-contract="'+esc(row.id)+'">Mở HĐ để xử lý</button></article>').join('')+'</div>');
 }
 async function acknowledgeContracts(items){
  try{for(let offset=0;offset<items.length;offset+=200){const result=await api('POST',{action:'read-contracts',items:items.slice(offset,offset+200)});localReads.push(...(result.alertReads||[]));refreshAlerts();}clearDisplayedPhoneNotifications();changed();}
  catch(error){status.textContent='Chưa lưu được trạng thái đã xem: '+error.message;}
 }
 dialog.addEventListener('close',()=>{selectedAlert='';selectedSnapshot=null;});
 alertsRoot.onclick=event=>{
  const group=event.target.closest('[data-contract-alert]');if(group){selectedAlert=group.dataset.contractAlert;const rows=alerts.groups[selectedAlert]||[];selectedSnapshot={kind:selectedAlert,rows:[...rows]};const items=rows.map(row=>({id:row.id,signature:alerts.signatures[row.id]}));refreshAlerts();if(items.length)acknowledgeContracts(items);return;}
  const item=event.target.closest('[data-alert-contract]');if(item){refreshAlerts();const allowed=Object.values(rawAlerts?.groups||{}).flat().some(row=>row.id===item.dataset.alertContract);if(allowed&&onOpenContract(item.dataset.alertContract)!==false)dialog.close();}
 };
 async function load(){
  refreshAlerts();if(busy)return;busy=true;
  try{const result=await api('GET',{inbox:'mine'});notifications=result.notifications.filter(n=>!n.read_at&&!viewedComments.has(n.comment_id));serverReads=result.alertReads||[];alertReadsReady=true;
   refreshAlerts();
   drawMessages();status.textContent=notifications.length===100?'Hiển thị tối đa 100 thông báo chưa đọc.':'';
  }catch(error){status.textContent=error.message;button.title='Chưa tải được thông báo. Bấm để thử lại.';}
  finally{busy=false;}
 }
 button.onclick=()=>{if(!dialog.open)dialog.showModal();load();};dialog.querySelector('header button').onclick=()=>dialog.close();dialog.querySelector('[data-rc-inbox-reload]').onclick=load;
 const phoneRoot=document.createElement('div');dialog.querySelector('header').after(phoneRoot);installPhonePush(phoneRoot,()=>button.click());
 list.onclick=event=>{const item=event.target.closest('[data-rc-notification]');if(!item)return;const notification=notifications.find(n=>n.id===item.dataset.rcNotification);if(notification){dialog.close();const {kind,subject_id,report_date}=notification.comment;openReportDiscussion({kind,subject_id,report_date});}};
 document.addEventListener('ibb5-report-comments-updated',event=>{for(const id of event.detail?.commentIds||[])viewedComments.add(id);notifications=notifications.filter(n=>!viewedComments.has(n.comment_id));drawMessages();updateBadge();load();});window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},20000);load();
 for(const event of ['ibb5-shared-updated','ibb5-snapshot-updated','ibb5-role-change'])document.addEventListener(event,()=>queueMicrotask(refreshAlerts));
}
