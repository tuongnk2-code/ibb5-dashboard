import { canSeeReport, validDay } from './dailyReportModel.js';
export const CARE_STATUS={pending:'Chưa thực hiện',sent:'Đã gửi',replied:'KH đã phản hồi',interested:'Có nhu cầu',support:'Cần hỗ trợ',no_zalo:'Không liên hệ được',optout:'Từ chối nhận tin'};
export const CARE_TEMPLATES=[
  ['Hỏi thăm chất lượng','Chào anh/chị {ten_kh}, em là {nhan_su} phụ trách hợp đồng {ma_hd}. Internet nhà mình sử dụng có ổn định không ạ? Anh/chị cần hỗ trợ cứ nhắn em nhé.'],
  ['Chăm sóc định kỳ','Chào anh/chị {ten_kh}, em {nhan_su} xin phép hỏi thăm tình hình sử dụng dịch vụ của gia đình. Anh/chị có nhu cầu hỗ trợ hoặc tư vấn thêm, em sẵn sàng hỗ trợ ạ.'],
  ['Sau lắp đặt','Chào anh/chị {ten_kh}, em {nhan_su} hỏi thăm sau khi lắp đặt hợp đồng {ma_hd}. Anh/chị đã sử dụng thuận tiện chưa ạ? Em luôn sẵn sàng hỗ trợ.'],
];
export const normCare=v=>String(v||'').trim().toLowerCase();
export const canManageCare=(caller,owner)=>caller?.id===owner?.id||caller?.role==='manager';
export const careScope=(caller,owner)=>!!owner&&canSeeReport(caller,owner);
export function carePhone(value){
  let phone=String(value||'').replace(/[\s().-]/g,'');
  if(phone.startsWith('+84'))phone='0'+phone.slice(3);else if(phone.startsWith('84'))phone='0'+phone.slice(2);
  if(phone&&!/^0[35789]\d{8}$/.test(phone))throw Error('Nhập SĐT di động Việt Nam gồm 10 số.');
  return phone;
}
export function cleanCareContact(input){
  if(typeof input.consent!=='boolean')throw Error('Cần xác nhận trạng thái đồng ý nhận chăm sóc.');
  const phone=carePhone(input.phone);
  if(input.consent&&!phone)throw Error('Cần nhập SĐT trước khi xác nhận đồng ý.');
  if(typeof input.note!=='string'||input.note.length>1000)throw Error('Ghi chú tối đa 1.000 ký tự.');
  return {phone,consent:input.consent,note:input.note.trim()};
}
export function cleanCareCampaign(input){
  const name=String(input.name||'').trim(),body=String(input.body||'').trim();
  if(!name||name.length>150)throw Error('Tên chiến dịch từ 1 đến 150 ký tự.');
  if(!body||body.length>2000)throw Error('Nội dung chăm sóc từ 1 đến 2.000 ký tự.');
  if([...body.matchAll(/\{([^{}]+)\}/g)].some(([,key])=>!['ten_kh','ma_hd','nhan_su'].includes(key)))throw Error('Chỉ sử dụng {ten_kh}, {ma_hd}, {nhan_su} để điền tự động.');
  const when=String(input.scheduled_at||'');
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:Z|[+-]\d\d:\d\d)$/.test(when)||!Number.isFinite(Date.parse(when))||!validDay(when.slice(0,10)))throw Error('Chọn ngày và giờ chăm sóc hợp lệ.');
  if(![0,7,30].includes(input.repeat_days))throw Error('Lịch lặp không hợp lệ.');
  if(!Array.isArray(input.contract_ids)||!input.contract_ids.length||input.contract_ids.length>500||input.contract_ids.some(id=>typeof id!=='string'||!/^[A-Z0-9][A-Z0-9._/-]{0,99}$/.test(id)))throw Error('Chọn từ 1 đến 500 khách hàng.');
  return {name,body,scheduled_at:new Date(when).toISOString(),repeat_days:input.repeat_days,contract_ids:[...new Set(input.contract_ids)]};
}
export function eligibleCare(contact){return !!contact?.consent&&!!contact?.phone;}
export function careMessage(body,customer,staff){return body.replace(/\{(ten_kh|ma_hd|nhan_su)\}/g,(_,key)=>({ten_kh:customer.customer||'anh/chị',ma_hd:customer.id,nhan_su:staff.full_name||staff.acc||'nhân viên phụ trách'})[key]);}
export function nextCareTime(campaign){
  const next=new Date(Date.parse(campaign.scheduled_at)+7*3600000);
  if(campaign.repeat_days===30){const anchor=new Date(Date.parse(campaign.first_at||campaign.scheduled_at)+7*3600000),day=anchor.getUTCDate();next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);const end=new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate();next.setUTCDate(Math.min(day,end));}
  else next.setUTCDate(next.getUTCDate()+campaign.repeat_days);
  next.setTime(next.getTime()-7*3600000);
  return next.toISOString();
}
export function careStats(ids,results){
  const rows=ids.map(id=>results.find(r=>r.contract_id===id)?.status||'pending');
  return {total:ids.length,done:rows.filter(s=>s!=='pending').length,sent:rows.filter(s=>['sent','replied','interested','support'].includes(s)).length,replied:rows.filter(s=>['replied','interested','support'].includes(s)).length,interested:rows.filter(s=>s==='interested').length,support:rows.filter(s=>s==='support').length};
}
