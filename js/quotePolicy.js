const numeric = value => value === '' || value == null ? null : Number(value);
const timestamp = value => value ? Date.parse(/Z$|[+-]\d\d:?\d\d$/.test(value) ? value : String(value).replace(' ','T')+'Z') : NaN;
export const policyActive = (policy,now=Date.now()) => policy.status==='active' && (!Number.isFinite(timestamp(policy.from))||timestamp(policy.from)<=now) && (!Number.isFinite(timestamp(policy.to))||timestamp(policy.to)>=now);
export function quotePolicies(data) {
  return (Array.isArray(data?.product_offering_price)?data.product_offering_price:[]).filter(item=>item.billing_type_name).map((item,index)=>({
    key:String(index),name:item.name||'',billing:item.billing_type_name,duration:numeric(item.contract_length_months),
    service:numeric(item.summary?.service_price?.price),fee:numeric(item.summary?.fee_price?.price),
    status:item.status,from:item.effective_from,to:item.effective_to
  })).filter(item=>policyActive(item));
}
export function policyMatches(quote,policy) {
  return policyActive(policy) && Number.isInteger(policy.duration) && policy.duration===Number(quote.months)+Number(quote.giftMonths)
    && Number.isFinite(policy.service) && policy.service>=0 && Math.abs(policy.service-Number(quote.monthly)*Number(quote.months))<1;
}
export function linkedQuoteFee(quote) {
  // Old saved versions retain their original fee snapshot.
  if(!Array.isArray(quote.policies))return quote.fee;
  const source=quote.source,policy=quote.policies.find(item=>item.key===quote.policyKey);
  if(!source||quote.code!==source.code||quote.province!==source.province||quote.ward!==source.ward||Number(quote.monthly)!==source.monthly||!policy||!policyMatches(quote,policy))return '';
  return Number.isInteger(policy.fee)&&policy.fee>=0?policy.fee:'';
}
export function chooseQuotePolicy(quote,key) {
  quote.policyKey=key;
  const policy=quote.policies?.find(item=>item.key===key),paid=policy?.service/Number(quote.monthly);
  if(policy&&Number.isInteger(paid)&&paid>0&&paid<=36&&Number.isInteger(policy.duration)&&policy.duration>=paid&&policy.duration-paid<=36){quote.months=paid;quote.giftMonths=policy.duration-paid;}
  quote.fee=linkedQuoteFee(quote);
}
