import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteTotals,quoteErrors,quotePlan,quoteOptions } from '../js/quoteModel.js';

const base=()=>({customer:'Khách hàng',address:'123 Đường A',province:'Đà Nẵng',ward:'Hòa Xuân',packageName:'Giga',advisor:'Nhân viên',contact:'0900000000',date:'2026-11-05',validUntil:'2099-11-12',monthly:200000,months:6,giftMonths:1,fee:300000,discount:100000,futureMonthly:250000,vat:'included',vatRate:'',extras:[{name:'Camera',qty:2,price:500000,billing:'once'},{name:'Cloud',qty:1,price:50000,billing:'monthly'}],confirmed:true});
test('quote totals separate upfront/recurring fees and never charge gifted months',()=>{
  const result=quoteTotals(base());
  assert.equal(result.total,2700000);assert.equal(result.ongoing,250000);assert.equal(result.tax,0);
  assert.deepEqual(result.errors,[]);assert.deepEqual(quoteErrors(base()),[]);
  assert.equal(quoteTotals({...base(),giftMonths:12}).total,result.total);
});
test('VAT excluded applies once after discount, included never adds tax again',()=>{
  const result=quoteTotals({...base(),vat:'excluded',vatRate:10});
  assert.equal(result.tax,270000);assert.equal(result.total,2970000);assert.equal(result.ongoing,275000);
  assert.equal(quoteTotals({...base(),vat:'included',vatRate:10}).total,2700000);
});
test('missing prices and unconfirmed policies cannot produce a customer quote',()=>{
  for(const field of ['monthly','fee'])assert.ok(quoteErrors({...base(),[field]:''}).length);
  assert.ok(quoteErrors({...base(),vat:''}).some(error=>error.includes('VAT')));
  assert.ok(quoteErrors({...base(),confirmed:false}).some(error=>error.includes('Xác nhận')));
  assert.ok(quoteErrors({...base(),discount:999999999}).some(error=>error.includes('Giảm trừ')));
  assert.ok(quoteErrors({...base(),months:0}).length);
  assert.ok(quoteErrors({...base(),months:1.5}).length);
  assert.deepEqual(quoteErrors({...base(),validUntil:'2001-01-01'}),[]);
  assert.ok(quoteErrors({...base(),date:''}).length);
  assert.ok(quoteErrors({...base(),extras:[{name:'Camera',qty:1,price:'',billing:'once'}]}).length);
});
test('multiple quote options retain independent charges and validate every option',()=>{
  const first=quotePlan(base()),second=quotePlan({...base(),packageName:'Sky',monthly:300000,months:3,fee:0,discount:0,extras:[],futureMonthly:350000});
  const quote={...base(),options:[first,second]};
  const options=quoteOptions(quote);assert.equal(quoteTotals(options[0]).total,2700000);assert.equal(quoteTotals(options[1]).total,900000);
  assert.deepEqual(quoteErrors(quote),[]);second.fee='';assert.ok(quoteErrors(quote).some(error=>error.startsWith('Gói 2:')));
  assert.equal(first.fee,300000);assert.equal(quoteOptions(base()).length,1);
  assert.ok(quoteErrors({...quote,options:Array.from({length:10},()=>first)}).length);
});


test('ongoing monthly payment follows the package and recurring extras, never a stale typed value',()=>{
 const quote={...base(),futureMonthly:5};
 assert.equal(quoteTotals(quote).future,250000);assert.equal(quoteTotals(quote).ongoing,250000);
 assert.equal(quoteTotals({...quote,futureMonthly:''}).ongoing,250000);
 assert.equal(quoteTotals({...quote,monthly:300000}).ongoing,350000);
 assert.equal(quoteTotals({...quote,extras:[]}).ongoing,200000);
 assert.equal(quoteTotals({...quote,extras:[{name:'Thiết bị',qty:2,price:500000,billing:'once'}]}).ongoing,200000);
 assert.equal(quoteTotals({...quote,extras:[{name:'Cloud',qty:2,price:50000,billing:'monthly'}]}).ongoing,300000);
 assert.equal(quoteTotals({...quote,vat:'excluded',vatRate:10}).ongoing,275000);
 assert.equal(quoteTotals({...quote,monthly:''}).ongoing,null);
 assert.equal(quoteTotals({...quote,extras:[{name:'Cloud',qty:1,price:'',billing:'monthly'}]}).ongoing,null);
});
