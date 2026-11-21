import './appUpdate.css';
const version=typeof __IBB5_APP_VERSION__==='string'?__IBB5_APP_VERSION__:'dev';
let checking=false,dismissed='',notice=null;
function reload(){location.reload();}
function addRefresh(host){if(!host)return;const button=document.createElement('button');button.type='button';button.className='pwa-refresh-trigger';button.textContent='↻ Cập nhật IBB5';button.title='Lưu nội dung đang nhập trước khi cập nhật ứng dụng';button.onclick=reload;host.append(button);}
addRefresh(document.querySelector('.sidebar .nav'));addRefresh(document.querySelector('.login-card'));
async function check(){
 if(checking||document.hidden||!import.meta.env.PROD)return;checking=true;
 try{const response=await fetch('/app-version.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});if(!response.ok)return;const latest=await response.json();if(typeof latest.version!=='string'||latest.version===version||latest.version===dismissed)return;
  if(!notice){notice=document.createElement('aside');notice.className='ibb-app-update';notice.setAttribute('role','status');notice.innerHTML='<div><strong>IBB5 có bản cập nhật mới</strong><small>Lưu nội dung đang nhập trước khi cập nhật.</small></div><button type="button" data-app-reload>Cập nhật ngay</button><button type="button" data-app-later aria-label="Để sau">×</button>';document.body.append(notice);notice.querySelector('[data-app-reload]').onclick=reload;notice.querySelector('[data-app-later]').onclick=()=>{dismissed=latest.version;notice.remove();notice=null;};}
 }catch{/* Keep the current page and unsaved edits if the update check is offline. */}finally{checking=false;}
}
window.addEventListener('pageshow',check);window.addEventListener('focus',check);window.addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});setInterval(check,60000);check();
