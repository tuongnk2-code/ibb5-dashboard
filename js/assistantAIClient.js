import { getSession } from './auth.js';
export async function assistantAIRequest(body){
  const session=await getSession();if(!session?.access_token)throw new Error('Phiên đăng nhập đã hết hạn.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),55000);
  try{
    const response=await fetch('/api/assistant',{method:body?'POST':'GET',headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:controller.signal,cache:'no-store'});
    const result=await response.json().catch(()=>({}));if(!response.ok)throw new Error(result.error||'Kết nối AI chưa sẵn sàng.');return result;
  }catch(err){if(err.name==='AbortError')throw new Error('AI trả lời quá lâu, anh thử lại.');throw err;}
  finally{clearTimeout(timer);}
}
