import { quoteOptions,quoteTotals,quoteMoney as money } from './quoteModel.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=value=>esc(value||'Theo chính sách được xác nhận').replace(/\n/g,'<br>');
const vatLabel=option=>option.vat==='included'?'Đã gồm VAT':option.vat==='excluded'?'Chưa gồm VAT · '+option.vatRate+'%':'Chưa xác nhận VAT';
const total=totals=>money(totals.errors.length?null:totals.total);
function extras(option){return option.extras?.length?option.extras.map(item=>esc(item.name||'Dịch vụ thêm')+' × '+esc(item.qty)+' · '+money(item.price===''?null:Number(item.price))+(item.billing==='monthly'?'/tháng':'/một lần')).join('<br>'):'Không có';}
function source(option){return option.source?esc((option.source.customized?'Gói tham khảo, giá đã điều chỉnh':option.source.manual?'JSON nhập tay':'Tra cứu giá FPT')+' · '+option.source.province+' / '+option.source.ward):'Phương án nhập tay';}
const period=totals=>(totals.months??'—')+' tháng thu tiền + '+(totals.gift??'—')+' tháng tặng';
export function quoteComparison(quote){
  const options=quoteOptions(quote),totals=options.map(quoteTotals);
  const intro='<div class="q-compare-intro"><strong>'+options.length+' PHƯƠNG ÁN ĐỂ KHÁCH LỰA CHỌN</strong><p>Chi phí được tính riêng từng gói; không cộng tổng các phương án.</p></div>';
  if(options.length===2)return intro+'<div class="q-two-options">'+options.map((option,index)=>{
    const sum=totals[index];
    return '<section class="q-option-card"><small>PHƯƠNG ÁN '+(index+1)+'</small><h2>'+esc(option.packageName||'Chưa chọn gói')+'</h2><p class="q-option-specs">'+text(option.specs)+'</p><div class="q-option-period">'+period(sum)+'</div><div class="q-option-upfront"><small>THANH TOÁN BAN ĐẦU · GỒM VAT</small><strong>'+total(sum)+'</strong></div><div class="q-option-ongoing"><small>CƯỚC TOÀN BỘ SAU ƯU ĐÃI · GỒM VAT</small><strong>'+money(sum.ongoing)+'<span> / tháng</span></strong></div><dl><dt>Đơn giá cước / tháng</dt><dd>'+money(sum.monthly)+'</dd><dt>Hòa mạng / triển khai</dt><dd>'+money(sum.fee)+'</dd><dt>Thiết bị / dịch vụ thêm</dt><dd>'+extras(option)+'</dd><dt>Ưu đãi / giảm trừ</dt><dd>'+money(sum.discount)+'</dd><dt>VAT</dt><dd>'+esc(vatLabel(option))+'</dd></dl><div class="q-option-conditions"><strong>Điều kiện & ưu đãi</strong><p>'+text(option.notes)+'</p></div><p class="q-option-source">'+source(option)+'</p></section>';
  }).join('')+'</div>';
  let result=intro;
  for(let start=0;start<options.length;start+=3){
    const group=options.slice(start,start+3),sums=totals.slice(start,start+3);
    const rows=[
      ['Thông số / thiết bị',option=>text(option.specs)],
      ['Chu kỳ thanh toán',(_,index)=>period(sums[index])],
      ['Đơn giá cước / tháng',(_,index)=>money(sums[index].monthly)],
      ['Hòa mạng / triển khai',(_,index)=>money(sums[index].fee)],
      ['Thiết bị / dịch vụ thêm',extras],
      ['Ưu đãi / giảm trừ',(_,index)=>money(sums[index].discount)],
      ['VAT',option=>esc(vatLabel(option))],
      ['Thanh toán ban đầu · gồm VAT',(_,index)=>total(sums[index]),'q-compare-total'],
      ['Cước toàn bộ sau ưu đãi · gồm VAT',(_,index)=>money(sums[index].ongoing)+'/tháng','q-compare-ongoing'],
      ['Điều kiện & ưu đãi',option=>text(option.notes)],
      ['Nguồn gói',source],
    ];
    result+='<section class="q-compare-group">'+(options.length>3?'<h3>Phương án '+(start+1)+'–'+(start+group.length)+'</h3>':'')+'<table class="q-compare-table"><thead><tr><th>Nội dung</th>'+group.map((option,index)=>'<th><small>PHƯƠNG ÁN '+(start+index+1)+'</small>'+esc(option.packageName||'Chưa chọn gói')+'</th>').join('')+'</tr></thead><tbody>'+rows.map(([label,value,className])=>'<tr class="'+(className||'')+'"><th>'+esc(label)+'</th>'+group.map((option,index)=>'<td>'+value(option,index)+'</td>').join('')+'</tr>').join('')+'</tbody></table></section>';
  }
  return result;
}
