import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteTotals,quoteErrors } from '../js/quoteModel.js';

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
  for(const field of ['monthly','fee','futureMonthly'])assert.ok(quoteErrors({...base(),[field]:''}).length);
  assert.ok(quoteErrors({...base(),vat:''}).some(error=>error.includes('VAT')));
  assert.ok(quoteErrors({...base(),confirmed:false}).some(error=>error.includes('Xác nhận')));
  assert.ok(quoteErrors({...base(),discount:999999999}).some(error=>error.includes('Giảm trừ')));
  assert.ok(quoteErrors({...base(),months:0}).length);
  assert.ok(quoteErrors({...base(),months:1.5}).length);
  assert.ok(quoteErrors({...base(),validUntil:'2001-01-01'}).length);
  assert.ok(quoteErrors({...base(),extras:[{name:'Camera',qty:1,price:'',billing:'once'}]}).length);
});
