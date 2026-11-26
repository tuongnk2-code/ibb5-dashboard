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
 const dialog=document.createElement('dialog');dialog.className='rc-dialog rc-inbox';dialog.innerHTML='<header class="rc-dialog-head"><h3>Thông báo & nhắc việc</h3><button type="button">Đóng</button></header><div class="rc-inbox-list"></div><p class="rc-status" role="status"></p><button type="button" data-rc-inbox-reload>Tải lại</button>';document.body.append(dialog);
 const list=dialog.querySelector('.rc-inbox-list'),status=dialog.querySelector('.rc-status');let notifications=[],busy=false,pendingLoad=false;const viewedComments=new Set();
 const alertsRoot=document.createElement('section');alertsRoot.className='rc-contract-alerts';list.before(alertsRoot);
 const messagesHeading=document.createElement('h4');messagesHeading.textContent='Bình luận & phản hồi';list.before(messagesHeading);
 const tabs=document.createElement('nav');tabs.className='rc-inbox-tabs';tabs.setAttribute('aria-label','Trạng thái thông báo');tabs.innerHTML='<button type="button" data-inbox-view="unread" aria-pressed="true">Chưa xem</button><button type="button" data-inbox-view="read" aria-pressed="false">Đã xem</button>';alertsRoot.before(tabs);
 const history=document.createElement('section');history.className='rc-read-history';history.hidden=true;status.before(history);
 let inboxView='unread',historyNotifications=[],historyBusy=false,historyPending=false;
 async function loadHistory(){if(historyBusy){historyPending=true;return;}historyBusy=true;history.innerHTML='<p>Đang tải thông báo đã xem…</p>';try{const result=await api('GET',{inbox:'mine',view:'read'});historyNotifications=result.notifications||[];const contracts=result.viewedContracts||[];history.innerHTML=(contracts.length?'<h4>HĐ đã xem · '+contracts.length+'</h4><div class="rc-history-contracts">'+contracts.map(row=>'<article><strong>'+esc(row.contract_id)+' · '+esc(row.staff)+'</strong>'+(row.customer?'<p>'+esc(row.customer)+'</p>':'')+'<small>'+esc(row.kinds.map(kind=>CONTRACT_ALERT_LABELS[kind]).filter(Boolean).join(' · '))+'<br>Đã xem: '+esc(time(row.viewed_at))+'</small></article>').join('')+'</div>':'')+(historyNotifications.length?'<h4>Bình luận & phản hồi đã xem</h4>'+historyNotifications.map(n=>'<button type="button" class="rc-notification" data-rc-notification="'+esc(n.id)+'"><strong>'+esc(n.author)+' · '+(n.comment.kind==='daily'?'Báo cáo ngày':'Báo cáo thị trường')+'</strong><span>'+esc(n.subject)+' · '+date(n.comment.report_date)+'</span><p>'+esc(n.comment.body)+'</p><small>Đã xem: '+esc(time(n.read_at))+'</small></button>').join(''):'')+(!contracts.length&&!historyNotifications.length?'<p class="rc-empty">Chưa có thông báo đã xem.</p>':'<p class="rc-note">Hiển thị tối đa 100 phản hồi và 100 HĐ đã xem gần nhất.</p>');}catch(error){history.innerHTML='<p class="rc-status">'+esc(error.message)+'</p>';}finally{historyBusy=false;if(historyPending){historyPending=false;if(dialog.open&&inboxView==='read')queueMicrotask(loadHistory);}}}
 function showView(view){inboxView=view;tabs.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.inboxView===view)));history.hidden=view!=='read';status.textContent='';refreshAlerts();drawMessages();if(view==='read')loadHistory();else load();}
 tabs.onclick=event=>{const b=event.target.closest('[data-inbox-view]');if(b)showView(b.dataset.inboxView);};
 let alerts=null,rawAlerts=null,serverAlerts=null,selectedAlert='',selectedSnapshot=null,alertReadsReady=false,serverReads=[],localReads=[];
 function updateBadge(){
  const unread=notifications.filter(n=>!n.read_at).length,total=unread+(alerts?.total||0),badge=button.querySelector('b');badge.textContent=total>=100?'99+':String(total);badge.hidden=!total;
  const label=[unread+' phản hồi chưa đọc',(alerts?.total||0)+' HĐ có cảnh báo chưa xem'].join(' · ');button.setAttribute('aria-label','Thông báo, '+label);button.title=label;
  updatePhoneBadge(total);
 }
 function drawMessages(){messagesHeading.hidden=list.hidden=inboxView!=='unread'||!notifications.length;list.innerHTML=notifications.map(n=>'<button type="button" class="rc-notification rc-unread" data-rc-notification="'+esc(n.id)+'"><strong>'+esc(n.author)+' · '+(n.comment.kind==='daily'?'Báo cáo ngày':'Báo cáo thị trường')+'</strong><span>'+esc(n.subject)+' · '+date(n.comment.report_date)+'</span><p>'+esc(n.comment.body)+'</p><small>'+time(n.created_at)+' · Chưa đọc</small></button>').join('');}
 function refreshAlerts(){
  const context=getContractContext();rawAlerts=context?contractAlerts(context):null;alerts=context&&alertReadsReady?unreadContractAlerts(serverAlerts||rawAlerts,context.notes,mergeContractAlertReads(serverReads,localReads)):null;alertsRoot.hidden=inboxView!=='unread'||!alerts;updateBadge();if(!alerts)return;
  const groups=Object.entries(alerts.groups).filter(([,rows])=>rows.length);
  alertsRoot.innerHTML='<h4>HĐ cần xem · '+alerts.total+' HĐ</h4>';
  if(!groups.length)alertsRoot.insertAdjacentHTML('beforeend','<p>Hiện không có cảnh báo HĐ chưa xem.</p>');
  alertsRoot.insertAdjacentHTML('beforeend','<div class="rc-alert-groups">'+groups.map(([key,rows])=>'<button type="button" data-contract-alert="'+key+'" aria-pressed="'+(key===selectedAlert)+'"><span>'+CONTRACT_ALERT_LABELS[key]+'</span><b>'+rows.length+' HĐ</b></button>').join('')+'</div>');
  if(!selectedSnapshot)return;
  alertsRoot.insertAdjacentHTML('beforeend','<h4>'+CONTRACT_ALERT_LABELS[selectedSnapshot.kind]+'</h4><div class="rc-alert-contracts">'+selectedSnapshot.rows.map(row=>'<article><strong>'+esc(row.id)+' · '+esc(row.staff||'Chưa gán Acc')+'</strong>'+(row.customer?'<p>'+esc(row.customer)+'</p>':'')+'<small>'+[row.expected?'Hẹn: '+date(row.expected)+(row.timeSlot?' · '+esc(row.timeSlot):''):'Chưa có ngày hẹn',row.online?'Đã Online · Còn thiếu cập nhật':'Chưa ghi nhận Online',row.updated?'Cập nhật: '+esc(time(row.updated)):'Chưa ghi nhận cập nhật'].join('<br>')+'</small><button type="button" data-alert-contract="'+esc(row.id)+'">Mở HĐ để xử lý</button></article>').join('')+'</div>');
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
  refreshAlerts();if(busy){pendingLoad=true;return;}busy=true;
  try{const result=await api('GET',{inbox:'mine'});notifications=result.notifications.filter(n=>!n.read_at&&!viewedComments.has(n.comment_id));serverReads=result.alertReads||[];serverAlerts=result.contractAlerts||null;alertReadsReady=true;
   refreshAlerts();
   drawMessages();if(inboxView==='unread')status.textContent=notifications.length===100?'Hiển thị tối đa 100 thông báo chưa đọc.':'';
  }catch(error){status.textContent=error.message;button.title='Chưa tải được thông báo. Bấm để thử lại.';}
  finally{busy=false;if(pendingLoad){pendingLoad=false;queueMicrotask(load);}}
 }
 button.onclick=()=>{if(!dialog.open)dialog.showModal();showView('unread');};dialog.querySelector('header button').onclick=()=>dialog.close();dialog.querySelector('[data-rc-inbox-reload]').onclick=()=>inboxView==='read'?loadHistory():load();
 const phoneRoot=document.createElement('div');dialog.querySelector('header').after(phoneRoot);installPhonePush(phoneRoot,()=>button.click(),{compact:true});
 const openNotification=event=>{const item=event.target.closest('[data-rc-notification]');if(!item)return;const notification=[...notifications,...historyNotifications].find(n=>n.id===item.dataset.rcNotification);if(notification){dialog.close();const {kind,subject_id,report_date}=notification.comment;openReportDiscussion({kind,subject_id,report_date});}};
 list.onclick=history.onclick=openNotification;
 document.addEventListener('ibb5-report-comments-updated',event=>{for(const id of event.detail?.commentIds||[])viewedComments.add(id);notifications=notifications.filter(n=>!viewedComments.has(n.comment_id));drawMessages();updateBadge();load();if(dialog.open&&inboxView==='read')loadHistory();});window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},20000);load();
 window.addEventListener('pageshow',load);for(const event of ['ibb5-shared-updated','ibb5-snapshot-updated','ibb5-role-change'])document.addEventListener(event,()=>queueMicrotask(load));
}
