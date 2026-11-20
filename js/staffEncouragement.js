import { personalGrowth, encouragementMessage } from './staffEncouragementModel.js';
import { animateEncouragement } from './staffEncouragementAnimation.js';
import './staffEncouragement.css';

const shown=new Set();
const DURATION_MS=7000;
export function showStaffEncouragement({profile,name,data,day}) {
  if(!profile?.acc||document.querySelector('.staff-encouragement'))return false;
  const growth=personalGrowth(data,profile.acc,day);if(!growth)return false;
  const key='ibb5_encouragement_v1:'+encodeURIComponent(profile.id||profile.acc.toLowerCase())+':'+growth.day;
  if(shown.has(key))return false;
  const message=encouragementMessage(profile.acc,growth),dialog=document.createElement('dialog');
  dialog.className='staff-encouragement '+message.kind;dialog.setAttribute('aria-labelledby','staffEncouragementTitle');dialog.setAttribute('aria-describedby','staffEncouragementBody');dialog.dataset.messageId=message.id;
  dialog.innerHTML='<header class="se-header"><strong>IBB5 <span>· CÙNG NHAU TIẾN LÊN</span></strong><span class="se-account"></span></header><main class="se-main"><canvas class="se-scene" aria-hidden="true"></canvas><div class="se-text"><p class="se-greeting"></p><h1 id="staffEncouragementTitle"><span></span><em></em></h1><p class="se-comparison"></p><p id="staffEncouragementBody"></p><p class="se-signature"></p></div></main><footer class="se-footer"><div><span class="se-countdown">Tiếp sức 7 giây, rồi mình bắt đầu nhé!</span><button type="button" class="se-skip" autofocus>Vào dashboard →</button></div><div class="se-track" role="progressbar" aria-label="Thời gian còn lại" aria-valuemin="0" aria-valuemax="7" aria-valuenow="7"><div></div></div></footer>';
  dialog.querySelector('.se-account').textContent=profile.acc;
  dialog.querySelector('.se-greeting').textContent='Chào '+(name||profile.full_name||profile.acc)+',';
  dialog.querySelector('h1 span').textContent=message.title[0];dialog.querySelector('h1 em').textContent=message.title[1];
  dialog.querySelector('#staffEncouragementBody').textContent=message.body;dialog.querySelector('.se-signature').textContent=message.signature;
  const delta=growth.delta;
  dialog.querySelector('.se-comparison').textContent=delta===null?'Chưa đủ dữ liệu cùng kỳ để so sánh':delta<0?'Hiện thấp hơn cùng kỳ tháng trước '+Math.abs(delta)+' HĐ':delta>0?'Hiện vượt cùng kỳ tháng trước '+delta+' HĐ':'Đang ngang cùng kỳ tháng trước';
  document.body.append(dialog);const focused=document.activeElement;
  try{dialog.showModal();}catch{dialog.remove();return false;}
  shown.add(key);
  let stopAnimation=()=>{};try{stopAnimation=animateEncouragement(dialog.querySelector('canvas'),message.kind);}catch{/* Keep the readable message if canvas is unavailable. */}
  const started=performance.now(),track=dialog.querySelector('.se-track'),fill=track.firstElementChild;
  const progress=setInterval(()=>{const remaining=Math.max(0,DURATION_MS-(performance.now()-started));track.setAttribute('aria-valuenow',String(Math.ceil(remaining/1000)));fill.style.transform='scaleX('+(remaining/DURATION_MS)+')';},50);
  const timeout=setTimeout(()=>dialog.close(),DURATION_MS);
  dialog.querySelector('.se-skip').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{clearTimeout(timeout);clearInterval(progress);stopAnimation();dialog.remove();if(focused?.isConnected&&focused!==document.body)focused.focus({preventScroll:true});},{once:true});
  return true;
}
