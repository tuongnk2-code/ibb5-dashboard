import { linkedQuoteFee } from './quotePolicy.js';
import { validDay, reportDay } from './dailyReportModel.js';

export const quoteMoney = value => Number.isFinite(value) ? value.toLocaleString('vi-VN') + ' ₫' : '—';
export const MAX_QUOTE_OPTIONS = 9;
export const QUOTE_PLAN_FIELDS = ['packageName','code','specs','monthly','months','giftMonths','fee','discount','futureMonthly','vat','vatRate','notes','extras','source','policies','policyKey'];
export const quotePlan = quote => structuredClone(Object.fromEntries(QUOTE_PLAN_FIELDS.map(field=>[field,quote[field]])));
export const quoteOptions = quote => Array.isArray(quote.options)&&quote.options.length
  ? quote.options.map(plan=>({...quote,...Object.fromEntries(QUOTE_PLAN_FIELDS.map(field=>[field,plan?.[field]])),options:undefined}))
  : [{...quote,options:undefined}];
const amount = value => value === '' || value == null ? null : Number(value);
export function quoteTotals(quote) {
  const errors = [], read = (value,label,max=1000000000) => { const n=amount(value); if(n===null||!Number.isFinite(n)||n<0||n>max||!Number.isInteger(n)){errors.push(label+' cần là số nguyên từ 0 đến '+max.toLocaleString('vi-VN')+'.');return null;}return n; };
  const feeValue=linkedQuoteFee(quote),missingPolicy=Array.isArray(quote.policies)&&amount(feeValue)===null;
  if(missingPolicy)errors.push('Chưa xác định phí hòa mạng. Chọn chính sách phù hợp với gói và khu vực.');
  const monthly=read(quote.monthly,'Cước gói/tháng'),months=read(quote.months,'Số tháng thu tiền',36),gift=read(quote.giftMonths,'Số tháng tặng',36),fee=missingPolicy?null:read(feeValue,'Phí hòa mạng theo chính sách gói'),discount=read(quote.discount,'Giảm trừ'),future=read(quote.futureMonthly,'Cước định kỳ sau ưu đãi');
  if(months===0)errors.push('Số tháng thu tiền phải lớn hơn 0.');
  let once=0,recurring=0;
  const extras=(quote.extras||[]).map((item,index)=>{
    const qty=read(item.qty,'Số lượng dòng '+(index+1),100),price=read(item.price,'Đơn giá dòng '+(index+1));
    if(!item.name?.trim())errors.push('Nhập tên thiết bị/dịch vụ dòng '+(index+1)+'.');
    if(!['once','monthly'].includes(item.billing))errors.push('Chọn loại thanh toán dịch vụ thêm.');
    if(qty===0)errors.push('Số lượng phải lớn hơn 0.');
    const total=qty===null||price===null?null:qty*price;
    if(item.billing==='monthly')recurring+=total||0;else once+=total||0;
    return {...item,total};
  });
  const taxRate=quote.vat==='excluded'?read(quote.vatRate,'Thuế suất VAT',100):0;
  if(!['included','excluded'].includes(quote.vat))errors.push('Xác nhận giá đã gồm hay chưa gồm VAT.');
  const subtotal=[monthly,months,fee].some(n=>n===null)?null:monthly*months+recurring*months+once+fee;
  if(subtotal!==null&&discount!==null&&discount>subtotal)errors.push('Giảm trừ không được lớn hơn tổng chi phí.');
  const net=subtotal===null||discount===null?null:subtotal-discount;
  const tax=net===null||taxRate===null?null:quote.vat==='excluded'?Math.round(net*taxRate/100):0;
  const total=net===null||tax===null?null:net+tax;
  const ongoing=future===null||taxRate===null?null:quote.vat==='excluded'?future+Math.round(future*taxRate/100):future;
  return {errors,monthly,months,gift,fee,discount,extras,once,recurring,subtotal,tax,total,ongoing};
}
export function quoteErrors(quote) {
  if(Array.isArray(quote.options)&&quote.options.length){
    if(quote.options.length>MAX_QUOTE_OPTIONS)return ['Một báo giá tối đa '+MAX_QUOTE_OPTIONS+' phương án.'];
    return quoteOptions(quote).flatMap((option,index)=>quoteErrors(option).map(error=>(quote.options.length>1?'Gói '+(index+1)+': ':'')+error));
  }
  const errors=[...quoteTotals(quote).errors];
  for(const [field,label]of Object.entries({customer:'Tên khách hàng',address:'Địa chỉ lắp đặt',province:'Tỉnh/thành',ward:'Phường/xã',packageName:'Tên gói/phương án',advisor:'Nhân viên tư vấn',contact:'Số liên hệ nhân viên'}))if(!quote[field]?.trim())errors.push('Cần nhập '+label+'.');
  if(!validDay(quote.date)||!validDay(quote.validUntil)||quote.validUntil<quote.date)errors.push('Chọn hạn báo giá không trước ngày lập.');
  if(validDay(quote.validUntil)&&quote.validUntil<reportDay())errors.push('Báo giá đã hết hiệu lực; cập nhật hạn trước khi xuất.');
  if(!quote.confirmed)errors.push('Xác nhận giá, VAT, phí và ưu đãi trước khi xuất.');
  return errors;
}
