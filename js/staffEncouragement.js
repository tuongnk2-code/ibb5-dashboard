import { personalGrowth, encouragementMessage } from './staffEncouragementModel.js';
import { animateEncouragement } from './staffEncouragementAnimation.js';
import { nextEncouragementTheme } from './staffEncouragementThemes.js';
import './staffEncouragement.css';

const shown=new Set();
const themeHistory=new Map();
export function showStaffEncouragement({profile,name,data,day}) {
  if(!profile?.acc||document.querySelector('.staff-encouragement'))return false;
  const growth=personalGrowth(data,profile.acc,day);if(!growth)return false;
  const key='ibb5_encouragement_v1:'+encodeURIComponent(profile.id||profile.acc.toLowerCase())+':'+growth.day;
  if(shown.has(key))return false;
  const message=encouragementMessage(profile.acc,growth),dialog=document.createElement('dialog');
  const themeKey='ibb5_encouragement_themes_v1:'+encodeURIComponent(String(profile.acc).trim().toLowerCase());
  let history=themeHistory.get(themeKey)||{};try{history=JSON.parse(localStorage.getItem(themeKey)||'null')||history;}catch{/* Keep variation in memory if storage is unavailable. */}
  const appearance=nextEncouragementTheme(message.kind,history);
  dialog.className='staff-encouragement '+message.kind;dialog.setAttribute('aria-labelledby','staffEncouragementTitle');dialog.setAttribute('aria-describedby','staffEncouragementBody');dialog.dataset.messageId=message.id;
  dialog.dataset.theme=appearance.id;dialog.style.setProperty('--se-accent',appearance.theme.accent);appearance.theme.colors.forEach((color,index)=>dialog.style.setProperty('--se-bg-'+index,color));dialog.style.setProperty('--se-glow',appearance.theme.glow);
  dialog.innerHTML='<header class="se-header"><strong>IBB5 <span>· CÙNG NHAU TIẾN LÊN</span></strong><div class="se-controls"><span class="se-account"></span><button type="button" class="se-close" aria-label="Đóng thông điệp" autofocus>×</button></div></header><main class="se-main"><canvas class="se-scene" aria-hidden="true"></canvas><div class="se-text"><p class="se-greeting"></p><h1 id="staffEncouragementTitle"><span></span><em></em></h1><p class="se-comparison"></p><p id="staffEncouragementBody"></p><p class="se-signature"></p></div></main><footer class="se-footer"><div><span class="se-hint">Bấm dấu X để vào dashboard.</span></div></footer>';
  dialog.querySelector('.se-account').textContent=profile.acc;
  dialog.querySelector('.se-greeting').textContent='Chào '+(name||profile.full_name||profile.acc)+',';
  dialog.querySelector('h1 span').textContent=message.title[0];dialog.querySelector('h1 em').textContent=message.title[1];
  dialog.querySelector('#staffEncouragementBody').textContent=message.body;dialog.querySelector('.se-signature').textContent=message.signature;
  const delta=growth.delta;
  const comparison=dialog.querySelector('.se-comparison'),label=document.createElement('span');
  label.textContent=delta===null?'Chưa đủ dữ liệu cùng kỳ để so sánh':delta<0?'Hiện thấp hơn cùng kỳ tháng trước':delta>0?'Hiện vượt cùng kỳ tháng trước':'Đang ngang cùng kỳ tháng trước';
  comparison.append(label);
  if(delta!==null){const change=document.createElement('strong');change.className='se-change';change.textContent=(delta>0?'+':'')+delta+' HĐ';comparison.append(change);}
  document.body.append(dialog);const focused=document.activeElement;
  try{dialog.showModal();}catch{dialog.remove();return false;}
  shown.add(key);
  themeHistory.set(themeKey,appearance.history);try{localStorage.setItem(themeKey,JSON.stringify(appearance.history));}catch{/* Variation remains available for this page. */}
  let stopAnimation=()=>{};try{stopAnimation=animateEncouragement(dialog.querySelector('canvas'),message.kind,appearance.id,appearance.theme.accent);}catch{/* Keep the readable message if canvas is unavailable. */}
  dialog.querySelector('.se-close').onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{stopAnimation();dialog.remove();if(focused?.isConnected&&focused!==document.body)focused.focus({preventScroll:true});},{once:true});
  return true;
}
