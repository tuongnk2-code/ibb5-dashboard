import test from 'node:test';
import assert from 'node:assert/strict';
import { quotePolicies, chooseQuotePolicy, linkedQuoteFee } from '../js/quotePolicy.js';
import { quoteTotals } from '../js/quoteModel.js';

const raw=(months,service,fee,status='active')=>({name:'Chính sách FPT',billing_type_name:'Trả trước',contract_length_months:months,status,effective_from:'2020-01-01 00:00:00',effective_to:'2099-01-01 00:00:00',summary:{service_price:{price:service},fee_price:{price:fee}}});
const base=()=>({code:'GIGA',province:'Đà Nẵng',ward:'Hòa Xuân',monthly:200000,months:1,giftMonths:0,fee:999999,discount:0,futureMonthly:200000,vat:'included',source:{code:'GIGA',province:'Đà Nẵng',ward:'Hòa Xuân',monthly:200000},policies:quotePolicies({product_offering_price:[raw(1,200000,300000),raw(7,1200000,0),raw(3,600000,null)]})});
test('exact selected policy links fee and paid/gifted months, including explicit free fee',()=>{
  const quote=base();chooseQuotePolicy(quote,'0');assert.equal(linkedQuoteFee(quote),300000);
  chooseQuotePolicy(quote,'1');assert.equal(quote.months,6);assert.equal(quote.giftMonths,1);assert.equal(linkedQuoteFee(quote),0);assert.equal(quoteTotals(quote).total,1200000);
  quote.fee=123456;assert.equal(quoteTotals(quote).fee,0);
  chooseQuotePolicy(quote,'2');assert.equal(linkedQuoteFee(quote),'');assert.ok(quoteTotals(quote).errors.some(error=>error.includes('phí hòa mạng')));
});
test('changes in period, price, package or location cannot reuse stale policy fees',()=>{
  for(const change of [{months:2},{giftMonths:1},{monthly:210000},{code:'SKY'},{province:'Hà Nội'},{ward:'Phường khác'},{policyKey:'missing'}]){
    const quote=base();chooseQuotePolicy(quote,'0');Object.assign(quote,change);assert.equal(linkedQuoteFee(quote),'');
  }
  const quote=base();chooseQuotePolicy(quote,'0');quote.policies[0].to='2001-01-01';assert.equal(linkedQuoteFee(quote),'');
  assert.equal(linkedQuoteFee({fee:300000}),300000);
});
test('inactive and expired policies are omitted, missing prices never imply free',()=>{
  const expired={...raw(1,200000,0),effective_to:'2001-01-01'},future={...raw(1,200000,0),effective_from:'2098-01-01'};
  assert.equal(quotePolicies({product_offering_price:[expired,future,raw(1,200000,0,'inactive')]}).length,0);
  assert.deepEqual(quotePolicies(null),[]);
  const quote=base();quote.policies[0].fee=-1;chooseQuotePolicy(quote,'0');assert.equal(linkedQuoteFee(quote),'');
});
test('postpaid upfront excludes monthly charges while keeping setup, once-only fees and VAT',()=>{
 const quote=base();quote.policies[0].billing='Trả sau';chooseQuotePolicy(quote,'0');
 let result=quoteTotals(quote);
 assert.equal(result.total,300000);assert.equal(result.serviceUpfront,0);assert.equal(result.ongoing,200000);assert.deepEqual(result.errors,[]);
 quote.extras=[{name:'Thiết bị',qty:1,price:100000,billing:'once'},{name:'Cloud',qty:1,price:50000,billing:'monthly'}];
 result=quoteTotals(quote);assert.equal(result.total,400000);assert.equal(result.recurring,50000);
 quote.vat='excluded';quote.vatRate=10;result=quoteTotals(quote);assert.equal(result.tax,40000);assert.equal(result.total,440000);
 quote.discount=500000;assert.ok(quoteTotals(quote).errors.some(error=>error.includes('Giảm trừ')));
 quote.discount=0;quote.vat='included';quote.extras=[];chooseQuotePolicy(quote,'1');
 result=quoteTotals(quote);assert.equal(result.postpaid,false);assert.equal(result.total,1200000);assert.equal(result.serviceUpfront,1200000);
});
