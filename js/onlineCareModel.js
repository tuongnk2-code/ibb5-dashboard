import { onlineCareContract,eligibleCare,careMessage } from './customerCareModel.js';
import { reportDay,shiftDay } from './dailyReportModel.js';
export const ONLINE_CARE_SCRIPTS={
 3:'Chào anh/chị {ten_kh}, em {nhan_su} bên FPT hỏi thăm sau khi lắp Internet. Kết nối và Wi-Fi nhà mình đang sử dụng ổn định không ạ? Anh/chị cần hỗ trợ cứ nhắn em nhé.',
 7:'Chào anh/chị {ten_kh}, sau một tuần sử dụng Internet FPT, trải nghiệm của gia đình mình thế nào ạ? Em {nhan_su} sẵn sàng hỗ trợ nếu có khu vực Wi-Fi yếu hoặc thiết bị chưa kết nối thuận tiện.',
 10:'Chào anh/chị {ten_kh}, em {nhan_su} xin phép hỏi thăm chất lượng Internet sau 10 ngày sử dụng. Anh/chị có góp ý hoặc cần hỗ trợ gì thêm không ạ? Em luôn sẵn sàng đồng hành cùng gia đình.'
};
export function cleanOnlineCare(policy){
 if(!policy||policy.kind!=='online_3_7_10'||typeof policy.time!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(policy.time))throw Error('Chọn giờ CSKH hợp lệ.');
 const scripts={};for(const day of [3,7,10]){const value=policy.scripts?.[day];if(typeof value!=='string'||!value.trim()||value.length>2000)throw Error('Nhập kịch bản riêng cho mốc '+day+' ngày (tối đa 2.000 ký tự).');if([...value.matchAll(/\{([^{}]+)\}/g)].some(([,key])=>!['ten_kh','ma_hd','nhan_su'].includes(key)))throw Error('Chỉ dùng {ten_kh}, {ma_hd}, {nhan_su} để điền tự động.');scripts[day]=value.trim();}
 return {kind:'online_3_7_10',time:policy.time,scripts};
}
export function onlineCareEvents({task,rows,contacts,runs,owner,now=new Date()}){
 const policy=task.config.care_policy,asOf=reportDay(now),contactMap=new Map(contacts.map(c=>[c.contract_id,c])),norm=v=>String(v||'').trim().toLowerCase();
 const seen=new Set(),events=[];
 for(const row of rows){const contact=contactMap.get(row.id);if(norm(row.staff)!==norm(owner.acc)||!onlineCareContract(row,asOf)||!eligibleCare(contact))continue;
  for(const day of [3,7,10]){const due=shiftDay(row.date,day),key=row.id+':'+day,phoneKey=contact.phone+':'+day;if(seen.has(phoneKey))continue;seen.add(phoneKey);
   const run=runs.find(r=>r.task_snapshot?.care?.contract_id===row.id&&r.task_snapshot.care.offset===day)||runs.find(r=>r.task_snapshot?.care?.phone===contact.phone&&r.task_snapshot.care.offset===day);
   const status=run?.status==='succeeded'?'succeeded':run?.status==='running'?'running':run?.status==='failed'&&run.started_at?'failed':run?.status==='queued'&&(due>=asOf||run.task_snapshot.care.approved_late)?'queued':due<asOf?'missed':due===asOf?'due':'future';
   events.push({key,contract_id:row.id,customer:row.customer||row.id,online_date:row.date,offset:day,due_date:due,status,run_id:run?.id||null,can_approve:status==='missed'&&!run?.started_at,message:careMessage(policy.scripts[day],row,owner),phone:contact.phone});
  }
 }
 return events.sort((a,b)=>a.due_date.localeCompare(b.due_date)||a.contract_id.localeCompare(b.contract_id)||a.offset-b.offset);
}
