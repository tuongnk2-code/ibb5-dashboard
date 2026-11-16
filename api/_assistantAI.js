import { NOTE_FIELDS } from '../js/dashboardAssistantModel.js';
import { validDay } from '../js/dailyReportModel.js';

export const AI_INTENTS=['summary','people','warnings','advice','channels','daily','sold','online','camera','vvip','pending','aged','overdue','missing','stale','search','update','approve','chat'];
const string={type:'string'},nullable={type:['string','null']};
export const planSchema={type:'object',additionalProperties:false,required:['intent','scope','query','contractId','patch'],properties:{
  intent:{type:'string',enum:AI_INTENTS},query:string,contractId:string,
  scope:{type:'object',additionalProperties:false,required:['period','anchor','team','staff'],properties:{period:{type:'string',enum:['day','week','month']},anchor:string,team:{type:'string',enum:['','1','2','3']},staff:string}},
  patch:{type:'object',additionalProperties:false,required:NOTE_FIELDS,properties:Object.fromEntries(NOTE_FIELDS.map(field=>[field,nullable]))}
}};
export function cleanScope(value){
  if(!value||!['day','week','month'].includes(value.period)||!validDay(value.anchor)||!['','1','2','3'].includes(value.team)||typeof value.staff!=='string'||value.staff.length>100)throw new Error('Phạm vi báo cáo không hợp lệ.');
  return {period:value.period,anchor:value.anchor,team:value.team,staff:value.staff};
}
export function cleanPlan(value){
  if(!value||!AI_INTENTS.includes(value.intent)||typeof value.query!=='string'||value.query.length>200||typeof value.contractId!=='string'||value.contractId.length>100)throw new Error('AI chưa hiểu rõ yêu cầu. Anh diễn đạt lại giúp em.');
  const patch={};for(const field of NOTE_FIELDS){const text=value.patch?.[field];if(text!=null){if(typeof text!=='string'||text.length>(field==='cancelReason'?1000:300))throw new Error('Thông tin cập nhật không hợp lệ.');patch[field]=text;}}
  if(patch.expected&&!validDay(patch.expected))throw new Error('AI đọc ngày hẹn chưa hợp lệ. Anh nhập rõ ngày/tháng/năm.');
  return {intent:value.intent,scope:cleanScope(value.scope),query:value.query,contractId:value.contractId.trim().toUpperCase(),patch};
}
export async function askAI({instructions,input,schema,maxTokens=800}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);
  try{
    const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',signal:controller.signal,headers:{Authorization:'Bearer '+process.env.OPENAI_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_MODEL||'gpt-4.1-mini',store:false,instructions,input:JSON.stringify(input),max_output_tokens:maxTokens,...(schema?{text:{format:{type:'json_schema',name:'dashboard_plan',strict:true,schema}}}:{})})});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(response.status===429?'Dịch vụ AI đang giới hạn lượt dùng hoặc hết hạn mức. Anh thử lại sau.':'Chưa kết nối được dịch vụ AI. Vui lòng kiểm tra cấu hình máy chủ.');
    const text=(result.output||[]).flatMap(item=>item.content||[]).filter(part=>part.type==='output_text').map(part=>part.text).join('');
    if(result.status!=='completed'||!text)throw new Error('AI chưa trả lời đầy đủ. Anh thử câu hỏi ngắn hơn.');
    return schema?JSON.parse(text):text.slice(0,6000);
  }catch(err){if(err.name==='AbortError')throw new Error('AI trả lời quá lâu. Anh thử lại hoặc dùng chế độ câu hỏi mẫu.');throw err;}
  finally{clearTimeout(timer);}
}
