import './installApp.css';
import './appUpdate.js';

let pendingPrompt=null,installed=false,installing=false;
const standalone=()=>installed||window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const ios=/iPad|iPhone|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
const triggers=[];
const dialog=document.createElement('dialog');dialog.className='pwa-install-dialog';dialog.setAttribute('aria-labelledby','pwaInstallTitle');
dialog.innerHTML='<header><div><img src="/icons/ibb5-192.png" alt="" width="48" height="48"><h2 id="pwaInstallTitle">Cài ứng dụng IBB5</h2></div><button type="button" data-install-close aria-label="Đóng hướng dẫn cài đặt">×</button></header><p>Có biểu tượng IBB5 trên màn hình chính và mở dashboard trong cửa sổ ứng dụng riêng.</p><div data-install-guide></div><p class="pwa-install-note">Dùng tài khoản hiện tại. Ứng dụng cần Internet để tải và lưu dữ liệu.</p><button type="button" class="pwa-install-native" hidden>Cài đặt ứng dụng</button><p data-install-status role="status"></p>';
document.body.append(dialog);
const native=dialog.querySelector('.pwa-install-native'),status=dialog.querySelector('[data-install-status]');
dialog.querySelector('[data-install-guide]').innerHTML=ios?'<h3>Trên iPhone / iPad</h3><ol><li>Mở dashboard trong <strong>Safari</strong>.</li><li>Bấm <strong>Chia sẻ → Thêm vào Màn hình chính</strong>.</li><li>Bật <strong>Mở dưới dạng ứng dụng web</strong> nếu có, rồi bấm <strong>Thêm</strong>.</li></ol>':'<h3>Trên điện thoại Android</h3><ol><li>Mở dashboard trong <strong>Chrome</strong>.</li><li>Bấm menu <strong>⋮ → Cài đặt ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</li><li>Xác nhận <strong>Cài đặt / Thêm</strong>, rồi mở biểu tượng IBB5.</li></ol><p class="pwa-install-note">Trên máy tính, dùng nút cài ứng dụng trên thanh địa chỉ nếu trình duyệt hỗ trợ.</p>';
function update(){triggers.forEach(button=>{button.hidden=standalone();button.disabled=installing;});native.hidden=!pendingPrompt||standalone();native.disabled=installing;}
function showGuide(){status.textContent='';update();if(!dialog.open)dialog.showModal();}
function trigger(host){if(!host)return;const button=document.createElement('button');button.type='button';button.className='pwa-install-trigger';button.textContent='↓ Cài ứng dụng IBB5';button.onclick=()=>{if(installing)return;if(pendingPrompt)install();else showGuide();};host.append(button);triggers.push(button);}
trigger(document.querySelector('.login-card'));trigger(document.getElementById('sidebarAppActions') || document.querySelector('.sidebar .nav'));
dialog.querySelector('[data-install-close]').onclick=()=>dialog.close();
async function install(){
 const prompt=pendingPrompt;if(!prompt||installing)return;pendingPrompt=null;installing=true;update();if(dialog.open)dialog.close();
 try{await prompt.prompt();await prompt.userChoice;}
 catch{showGuide();status.textContent='Hãy dùng menu trình duyệt theo hướng dẫn phía trên để cài ứng dụng.';}
 finally{installing=false;update();}
}
native.onclick=install;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();pendingPrompt=event;update();});
window.addEventListener('appinstalled',()=>{installed=true;pendingPrompt=null;update();if(dialog.open)dialog.close();});
window.matchMedia('(display-mode: standalone)').addEventListener('change',update);update();
if(import.meta.env.PROD&&window.isSecureContext&&'serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).catch(()=>{/* Installation guidance remains available when registration cannot complete. */});}
