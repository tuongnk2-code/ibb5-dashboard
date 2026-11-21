import { getSession } from './auth.js';
import { reportText, reportIdentity } from './dailyReportModel.js';
import './reportComments.css';

const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=value=>value.split('-').reverse().join('/');
const time=value=>new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
async function api(method,input,signal){
 const session=await getSession();if(!session?.access_token)throw Error('Phiên đăng nhập đã hết hạn.');
 const response=await fetch('/api/report-comments'+(method==='GET'?'?'+new URLSearchParams(input):''),{method,cache:'no-store',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000),headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:method==='POST'?JSON.stringify(input):undefined});
 const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error||'Không kết nối được phần bình luận.');return result;
}
const changed=()=>document.dispatchEvent(new Event('ibb5-report-comments-updated'));
export function mountReportComments(root,context,{onReport}={}){
 root.innerHTML='<section class="rc-thread"><h4>Bình luận & phản hồi</h4><p class="rc-note">Phản hồi được gửi vào chuông thông báo của nhân sự và người đã tham gia trao đổi.</p><div class="rc-comments" aria-live="polite"></div><p class="rc-status" role="status"></p><form><label>Nội dung bình luận<textarea maxlength="2000" rows="3" required placeholder="Nhập phản hồi hoặc hướng xử lý cụ thể…"></textarea></label><div class="rc-actions"><button type="submit">Gửi bình luận</button><button type="button" data-rc-reload>Tải lại</button></div></form></section>';
 const comments=root.querySelector('.rc-comments'),status=root.querySelector('.rc-status'),form=root.querySelector('form'),input=root.querySelector('textarea'),button=form.querySelector('[type=submit]');
 let disposed=false,busy=false,loading=false,requestId=crypto.randomUUID(),lastBody='';const controller=new AbortController();
 const notifyRead=async ids=>{if(!ids.length)return;await api('POST',{action:'read',comment_ids:ids});changed();};
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

export function installReportNotifications(){
 if(document.getElementById('reportNotificationButton'))return;
 const anchor=document.getElementById('topLogoutBtn');if(!anchor)return;
 const button=document.createElement('button');button.id='reportNotificationButton';button.type='button';button.className='rc-bell top-logout-btn';button.innerHTML='🔔 Thông báo <b hidden>0</b>';button.setAttribute('aria-label','Thông báo báo cáo');anchor.before(button);
 const dialog=document.createElement('dialog');dialog.className='rc-dialog rc-inbox';dialog.innerHTML='<header class="rc-dialog-head"><h3>Thông báo báo cáo</h3><button type="button">Đóng</button></header><p class="rc-note">Phản hồi được cập nhật khi đang mở dashboard, hoặc khi đăng nhập lại.</p><div class="rc-inbox-list"></div><p class="rc-status" role="status"></p><button type="button" data-rc-inbox-reload>Tải lại thông báo</button>';document.body.append(dialog);
 const list=dialog.querySelector('.rc-inbox-list'),status=dialog.querySelector('.rc-status');let notifications=[],busy=false;
 async function load(){
  if(busy)return;busy=true;
  try{const result=await api('GET',{inbox:'mine'});notifications=result.notifications;const unread=notifications.filter(n=>!n.read_at).length;
   const badge=button.querySelector('b');badge.textContent=unread>=100?'99+':String(unread);badge.hidden=!unread;button.setAttribute('aria-label','Thông báo báo cáo'+(unread?', '+unread+' chưa đọc':''));
   list.innerHTML=notifications.map(n=>'<button type="button" class="rc-notification '+(!n.read_at?'rc-unread':'')+'" data-rc-notification="'+esc(n.id)+'"><strong>'+esc(n.author)+' · '+(n.comment.kind==='daily'?'Báo cáo ngày':'Báo cáo thị trường')+'</strong><span>'+esc(n.subject)+' · '+date(n.comment.report_date)+'</span><p>'+esc(n.comment.body)+'</p><small>'+time(n.created_at)+(!n.read_at?' · Chưa đọc':' · Đã đọc')+'</small></button>').join('')||'<p>Chưa có thông báo phản hồi.</p>';status.textContent=notifications.length===100?'Hiển thị tối đa 100 thông báo, ưu tiên chưa đọc.':'';
  }catch(error){status.textContent=error.message;button.title='Chưa tải được thông báo. Bấm để thử lại.';}
  finally{busy=false;}
 }
 button.onclick=()=>{if(!dialog.open)dialog.showModal();load();};dialog.querySelector('header button').onclick=()=>dialog.close();dialog.querySelector('[data-rc-inbox-reload]').onclick=load;
 list.onclick=event=>{const item=event.target.closest('[data-rc-notification]');if(!item)return;const notification=notifications.find(n=>n.id===item.dataset.rcNotification);if(notification){dialog.close();const {kind,subject_id,report_date}=notification.comment;openReportDiscussion({kind,subject_id,report_date});}};
 document.addEventListener('ibb5-report-comments-updated',load);window.addEventListener('focus',load);document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});setInterval(()=>{if(!document.hidden)load();},20000);load();
}
