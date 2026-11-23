export const PROSPECT_RESULTS={unsigned:'Chưa ký',signed:'Đã ký',following:'Đang theo',other_provider:'Đã lắp bên khác',other:'Khác'};
export const PROSPECT_STAGES={new:'Chờ tiếp nhận',received:'Đang xử lý',contacted:'Đã liên hệ',appointment:'Hẹn lại',qualified:'Có nhu cầu',won:'Đã chốt',lost:'Không phù hợp'};
export function cleanProspect(input){
 const text=(key,max,required=false)=>{const value=input[key];if(typeof value!=='string'||value.length>max||(required&&!value.trim()))throw Error('Thông tin '+({name:'tên khách',phone:'SĐT',source:'nguồn',need:'nhu cầu',address:'địa chỉ',description:'ghi chú'}[key]||key)+' không hợp lệ.');return value.trim();};
 let phone=text('phone',30,true).replace(/[\s().-]/g,'');if(phone.startsWith('+84'))phone='0'+phone.slice(3);else if(phone.startsWith('84'))phone='0'+phone.slice(2);
 if(!/^0[35789]\d{8}$/.test(phone))throw Error('Nhập SĐT di động Việt Nam 10 số.');
 return {name:text('name',150,true),phone,source:typeof input.source==='string'?text('source',150):'',need:text('need',500),address:text('address',500),description:text('description',3000)};
}
export function cleanProspectUpdate(input){
 const care={};for(const key of ['care_1','care_2'])if(Object.hasOwn(input,key)){if(typeof input[key]!=='string'||input[key].length>3000)throw Error('Nội dung Care tối đa 3.000 ký tự.');care[key]=input[key].trim();}
 if(Object.hasOwn(input,'result')){if(!Object.hasOwn(PROSPECT_RESULTS,input.result))throw Error('Chọn kết quả hợp lệ.');care.result=input.result;}
 if(!Object.hasOwn(PROSPECT_STAGES,input.stage))throw Error('Chọn tình trạng hợp lệ.');
 if(typeof input.note!=='string'||!input.note.trim()||input.note.length>3000)throw Error('Nhập nội dung xử lý tối đa 3.000 ký tự.');
 const next=input.next_followup_at||null;if(next&&(!/T\d\d:\d\d/.test(next)||!/(?:Z|[+-]\d\d:\d\d)$/.test(next)||!Number.isFinite(Date.parse(next))))throw Error('Ngày giờ hẹn không hợp lệ.');
 const stage=care.result==='signed'?'won':care.result==='other_provider'?'lost':care.result&&['won','lost'].includes(input.stage)?'contacted':input.stage;
 if(stage==='appointment'&&!next)throw Error('Chọn ngày giờ hẹn lại.');
 return {...care,stage,note:input.note.trim(),next_followup_at:['won','lost'].includes(stage)?null:next};
}
export function prospectStats(rows,now=Date.now()){
 const open=rows.filter(r=>!['won','lost'].includes(r.stage));return {total:rows.length,new:rows.filter(r=>r.stage==='new').length,working:open.filter(r=>r.stage!=='new').length,due:open.filter(r=>r.next_followup_at&&Date.parse(r.next_followup_at)<=now).length,won:rows.filter(r=>r.stage==='won').length};
}

const reportTime=value=>value?new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
export function prospectCsv(rows,people){
 const names=new Map(people.map(p=>[p.id,p.full_name||p.acc]));
 const lines=[['STT','Tên khách hàng','Số điện thoại','Địa chỉ / Khu vực','Nhu cầu','Người phụ trách','Care lần 1','Cập nhật Care lần 1','Care lần 2','Cập nhật Care lần 2','Kết quả','Cập nhật Kết quả','Hẹn liên hệ lại','Ghi chú','Cập nhật'],...rows.map((r,i)=>[i+1,r.name,r.phone,r.address,r.need,names.get(r.assignee_id)||'Chưa giao',r.care_1||'',reportTime(r.care_1_at),r.care_2||'',reportTime(r.care_2_at),PROSPECT_RESULTS[r.result]||(r.stage==='won'?'Đã ký':r.stage==='lost'?'Khác':'Chưa ký'),reportTime(r.result_at),r.next_followup_at?new Date(r.next_followup_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'',r.last_note||r.description,r.updated_at?new Date(r.updated_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):''])];
 return '\ufeff'+lines.map(row=>row.map(v=>{let text=String(v??'');if(/^[\s]*[=+@\-]/.test(text)||/^[\t\r\n]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
}
