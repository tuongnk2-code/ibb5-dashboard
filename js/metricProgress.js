import { parseMetricPercent,metricProgressMarkup } from './metricProgressModel.js';
import './metricProgress.css';
const bindings=[
 ['#rate,#forecastRatio,#dailyProgress','completion'],
 ['#pnRate,#managed,#anaPrepaid,#ibbQualitySummary [data-k="prepaid"],#ibbQualitySummary [data-k="coverage"]','ratio'],
 ['#growth','change'],
 ['#perfRows tr td:nth-child(8),#perfRows tr td:nth-child(9),#perfFoot tr td:nth-child(8),#perfFoot tr td:nth-child(9)','completion'],
 ['#ibbcRate,#ibbcRateBody td.ibbc-month,#ibbcRateBody td.ibbc-total','risk'],
 ['[data-metric-percent]',null],
];
export function installMetricProgress(scope=document.querySelector('.content')){if(!scope)return()=>{};let frame=0,disposed=false;
 function enhance(el,kind){if(el.matches('input,select,textarea')||el.querySelector('input,select,textarea,button'))return;const label=el.textContent,percent=el.hasAttribute('data-metric-value')?Number(el.dataset.metricValue):parseMetricPercent(label);if(percent===null||!Number.isFinite(percent)){el.classList.remove('metric-progress-host');delete el.dataset.metricProgressKey;return;}const mode=kind||el.dataset.metricPercent||'completion',signature=JSON.stringify([percent,mode,label]);if(el.dataset.metricProgressKey===signature&&el.firstElementChild?.classList.contains('metric-progress'))return;el.dataset.metricProgressKey=signature;el.classList.add('metric-progress-host');el.innerHTML=metricProgressMarkup(percent,{kind:mode,label,title:el.title||label});}
 function refresh(){frame=0;if(disposed)return;for(const [selector,kind]of bindings)scope.querySelectorAll(selector).forEach(el=>enhance(el,kind));for(const id of ['targetBar','forecastBar','dailyBar']){const el=scope.querySelector('#'+id);if(el)el.parentElement.classList.add('metric-progress-legacy');}const daily=scope.querySelector('#dailyProgress'),old=scope.querySelector('#todayBar');if(daily&&old){const percent=parseMetricPercent(daily.textContent),parent=old.parentElement;parent.classList.add('metric-progress-legacy');let sibling=parent.nextElementSibling;if(!sibling?.hasAttribute('data-pace-progress')){sibling=document.createElement('div');sibling.dataset.paceProgress='';parent.after(sibling);}const signature=String(percent);if(sibling.dataset.signature!==signature){sibling.dataset.signature=signature;sibling.innerHTML=percent===null?'':metricProgressMarkup(percent,{title:'Hoàn thành Online / Pace ngày'});}}}
 const schedule=()=>{if(!frame&&!disposed)frame=requestAnimationFrame(refresh);};const observer=new MutationObserver(schedule);observer.observe(scope,{childList:true,subtree:true,characterData:true});refresh();return()=>{disposed=true;observer.disconnect();if(frame)cancelAnimationFrame(frame);};}
