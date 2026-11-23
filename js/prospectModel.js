export const PROSPECT_STAGES={new:'Chờ tiếp nhận',received:'Đang xử lý',contacted:'Đã liên hệ',appointment:'Hẹn lại',qualified:'Có nhu cầu',won:'Đã chốt',lost:'Không phù hợp'};
export function cleanProspect(input){
 const text=(key,max,required=false)=>{const value=input[key];if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Thông tin '+({name:'tên khách',phone:'SĐT',source:'nguồn',need:'nhu cầu',address:'địa chỉ',description:'ghi chú'}[key]||key)+' không hợp lệ.');return value.trim();};
 let phone=text('phone',30,true).replace(/[\s().-]/g,'');if(phone.startsWith('+84'))phone='0'+phone.slice(3);else if(phone.startsWith('84'))phone='0'+phone.slice(2);
 if(!/^0[35789]\d{8}$/.test(phone))throw Error('Nhập SĐT di động Việt Nam 10 số.');
 return {name:text('name',150,true),phone,source:text('source',150),need:text('need',500),address:text('address',500),description:text('description',3000)};
}
export function cleanProspectUpdate(input){
 if(!Object.hasOwn(PROSPECT_STAGES,input.stage))throw Error('Chọn tình trạng hợp lệ.');
 if(typeof input.note!=='string'||!input.note.trim()||input.note.length>3000)throw Error('Nhập nội dung xử lý tối đa 3.000 ký tự.');
 const next=input.next_followup_at||null;if(next&&(!/T\d\d:\d\d/.test(next)||!/(?:Z|[+-]\d\d:\d\d)$/.test(next)||!Number.isFinite(Date.parse(next))))throw Error('Ngày giờ hẹn không hợp lệ.');
 if(input.stage==='appointment'&&!next)throw Error('Chọn ngày giờ hẹn lại.');
 return {stage:input.stage,note:input.note.trim(),next_followup_at:['won','lost'].includes(input.stage)?null:next};
}
export function prospectStats(rows,now=Date.now()){
 const open=rows.filter(r=>!['won','lost'].includes(r.stage));return {total:rows.length,new:rows.filter(r=>r.stage==='new').length,working:open.filter(r=>r.stage!=='new').length,due:open.filter(r=>r.next_followup_at&&Date.parse(r.next_followup_at)<=now).length,won:rows.filter(r=>r.stage==='won').length};
}
