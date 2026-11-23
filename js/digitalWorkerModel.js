import { canSeeReport } from './dailyReportModel.js';
import { cleanOnlineCare } from './onlineCareModel.js';
export const WORKER_CHANNELS={meta_facebook:'Meta Facebook',top_zalo:'Top Zalo',chot_care:'Chốt Care',sms_akabiz:'SMS AkaBiz',fbnumber:'FBnumber',fb_akabiz:'FB AkaBiz',fpt_sop:'FPT SOP',facebook_search:'Lọc dữ liệu Facebook',zalo_campaign:'Chiến dịch Zalo',facebook_post:'Đăng bài Fanpage',email_campaign:'Chiến dịch email',other:'Quy trình khác'};
export const WORKER_CHANNEL_URLS={fpt_sop:'https://portal-sop.fpt.vn/trang-chu'};
export const WORKER_STATES={queued:'Chờ máy thực hiện',running:'Đang thực hiện',succeeded:'Đã hoàn tất',failed:'Cần kiểm tra',cancelled:'Đã dừng'};
export const canViewWorker=(caller,owner)=>!!owner&&canSeeReport(caller,owner);
export const canManageWorker=(caller,owner)=>!!owner&&(caller.role==='manager'||caller.id===owner.id);
export const workerOnline=(device,now=Date.now())=>!!device&&!device.revoked&&Date.parse(device.last_seen_at)>now-90000;
export const workerSupportsTask=(device,task)=>!!device&&!device.revoked&&device.capabilities.includes(task.channel)&&(!task.config?.care_policy||device.capabilities.includes('care_'+task.channel))&&(!task.config?.steps||(device.capabilities.includes('workflow_v1')&&task.config.steps.every(step=>device.capabilities.includes(step.channel))));
export function cleanWorkerTask(input){
 const text=(v,label,max,required=false)=>{if(typeof v!=='string'||v.trim().length>max||(required&&!v.trim()))throw Error(label+' không hợp lệ.');return v.trim();};
 if(!Object.hasOwn(WORKER_CHANNELS,input.channel))throw Error('Chọn kênh hợp lệ.');
 const scheduled_at=input.scheduled_at||null;
 if(scheduled_at&&(!/^\d{4}-\d\d-\d\dT/.test(scheduled_at)||!Number.isFinite(Date.parse(scheduled_at))))throw Error('Lịch chạy không hợp lệ.');
 if(![0,1,7].includes(input.repeat_days))throw Error('Chọn lịch một lần, hằng ngày hoặc hằng tuần.');
 if(input.repeat_days&&!scheduled_at)throw Error('Chọn thời gian bắt đầu lịch lặp.');
 const config={keywords:text(input.keywords||'','Từ khóa',500),sources:text(input.sources||'','Nguồn dữ liệu',3000),content:text(input.content||'','Nội dung thực hiện',4000,true)};
 if(input.care_policy){if(input.steps||![0].includes(input.repeat_days)||scheduled_at||!['top_zalo','zalo_campaign','chot_care','sms_akabiz'].includes(input.channel))throw Error('Lịch sau Online dùng riêng cho kênh chăm sóc, không kết hợp lịch lặp hoặc quy trình khác.');config.care_policy=cleanOnlineCare(input.care_policy);}
 if(input.steps!=null){
  if(!Array.isArray(input.steps)||input.steps.length<1||input.steps.length>6||input.channel!=='other')throw Error('Quy trình nhiều bước không hợp lệ.');
  config.steps=input.steps.map(step=>{if(!step||!Object.hasOwn(WORKER_CHANNELS,step.channel)||step.channel==='other')throw Error('Kênh trong bước không hợp lệ.');return {name:text(step.name,'Tên bước',120,true),channel:step.channel,keywords:text(step.keywords||'','Từ khóa',500),sources:text(step.sources||'','Nguồn dữ liệu',3000),content:text(step.content,'Nội dung bước',4000,true)};});
 }
 return {name:text(input.name,'Tên tác vụ',120,true),channel:input.channel,config,scheduled_at,repeat_days:input.repeat_days};
}
const fold=v=>String(v||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim();
// Commands select existing, reviewed tasks. They never become executable code.
export function parseWorkerCommand(command,tasks){
 const value=fold(command),match=value.match(/^(chay|dung|tam dung|xem ket qua)\s+(.+)$/);
 if(!match)return {error:'Dùng: Chạy [tên tác vụ], Dừng [tên tác vụ] hoặc Xem kết quả [tên tác vụ].'};
 const found=tasks.filter(task=>fold(task.name)===match[2]);
 if(found.length!==1)return {error:found.length?'Có nhiều tác vụ trùng tên. Anh/chị chọn tác vụ trong danh sách.':'Chưa tìm thấy tác vụ đúng tên. Hãy tạo tác vụ trước.'};
 return {action:match[1]==='chay'?'run':match[1]==='xem ket qua'?'results':'pause',task:found[0]};
}
