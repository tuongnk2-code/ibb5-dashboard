// IBB5 local runner, Node.js 20+. No dependencies; no remote shell commands.
import { readFileSync,writeFileSync,renameSync,existsSync } from 'node:fs';
import { resolve,dirname } from 'node:path';
import { spawn,execFile } from 'node:child_process';
const configPath=resolve(process.argv[2]||'ibb5-worker.local.json');
const config=JSON.parse(readFileSync(configPath,'utf8')),server=new URL(config.server);
if(server.protocol!=='https:'&&!['127.0.0.1','localhost'].includes(server.hostname))throw Error('Máy chủ phải dùng HTTPS.');
if(!/^dw_[A-Za-z0-9_-]{43}$/.test(config.token||''))throw Error('Tệp kết nối không hợp lệ.');
const channelNames=['meta_facebook','top_zalo','chot_care','sms_akabiz','fbnumber','fb_akabiz','facebook_search','zalo_campaign','facebook_post','email_campaign','other'];
const handlers=Object.fromEntries(Object.entries(config.handlers||{}).filter(([key,value])=>channelNames.includes(key)&&value&&typeof value.command==='string'&&value.command&&Array.isArray(value.args)&&value.args.every(arg=>typeof arg==='string')&&value.enabled!==false));
let wake=null;
const capabilities=Object.keys(handlers),journalPath=configPath+'.journal',delay=ms=>new Promise(resolveDelay=>{const timer=setTimeout(()=>{wake=null;resolveDelay();},ms);wake=()=>{clearTimeout(timer);wake=null;resolveDelay();};});
let journal=existsSync(journalPath)?JSON.parse(readFileSync(journalPath,'utf8')):null,stopping=false,child=null;
function remember(value){const temporary=journalPath+'.tmp';writeFileSync(temporary,JSON.stringify(value),{mode:0o600});renameSync(temporary,journalPath);journal=value;}
async function api(body){const response=await fetch(new URL('/api/digital-worker',server),{method:'POST',headers:{Authorization:'Bearer '+config.token,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(25000)});const result=await response.json();if(!response.ok){const error=Error(result.error||'Không kết nối được IBB5');error.status=response.status;throw error;}return result;}
function stopChild(){if(!child)return;const processToStop=child;if(process.platform==='win32')execFile('taskkill',['/PID',String(processToStop.pid),'/T','/F'],{windowsHide:true},()=>{});else processToStop.kill('SIGTERM');}
async function flush(){if(!journal)return;const outcome=journal.outcome||{status:'failed',summary:'Chương trình kết nối bị gián đoạn. Không tự chạy lại; kiểm tra tool vì có thể đã thực hiện một phần.'};await api({action:'complete',run_id:journal.run_id,...outcome});remember(null);}
async function execute(run){
 remember({run_id:run.id});
 const handler=handlers[run.task_snapshot.channel];
 let cancelled=false,uncertain=false,heartbeatBusy=false,finished=false;
 const heartbeat=setInterval(async()=>{if(heartbeatBusy)return;heartbeatBusy=true;try{const response=await api({action:'heartbeat',capabilities});if(!finished&&response.active?.id===run.id&&response.active.cancel_requested){cancelled=true;stopChild();}}catch(error){if(!finished&&[401,403].includes(error.status)){uncertain=true;stopping=true;stopChild();}}finally{heartbeatBusy=false;}},15000);
 let outcome;
 try{
  if(!handler)throw Error('Chưa cấu hình bộ kết nối cho kênh này.');
  outcome=await new Promise((resolveResult,reject)=>{
   let output='',tooLarge=false,timedOut=false;
   const timeoutMs=Math.max(10000,Math.min(Number(handler.timeoutSeconds||600)*1000,3600000));
   child=spawn(handler.command,handler.args,{cwd:handler.cwd?resolve(dirname(configPath),handler.cwd):dirname(configPath),shell:false,windowsHide:true,stdio:['pipe','pipe','pipe']});
   const timer=setTimeout(()=>{timedOut=true;stopChild();},timeoutMs);
   child.stdout.on('data',chunk=>{if(output.length+chunk.length>64000){tooLarge=true;stopChild();}else output+=chunk.toString();});
   // Do not forward arbitrary tool logs, customer data, or credentials to cloud logs.
   child.stderr.on('data',()=>{});child.stdin.on('error',()=>{});
   child.once('error',error=>{clearTimeout(timer);reject(error);});
   child.once('close',code=>{clearTimeout(timer);child=null;
    if(uncertain)return resolveResult({status:'failed',summary:'Máy bị ngắt kết nối. Kiểm tra tại tool vì có thể đã thực hiện một phần.'});
    if(cancelled||stopping)return resolveResult({status:'cancelled',summary:'Đã yêu cầu dừng bộ kết nối. Kiểm tra tại tool; các thao tác đã thực hiện không được hoàn tác.'});
    if(timedOut||tooLarge)return resolveResult({status:'failed',summary:timedOut?'Tool vượt thời gian cho phép. Kiểm tra trước khi chạy lại.':'Kết quả tool vượt giới hạn. Kiểm tra trước khi chạy lại.'});
    if(code!==0)return resolveResult({status:'failed',summary:'Bộ kết nối báo lỗi. Kiểm tra tool và phiên đăng nhập trước khi chạy lại.'});
    try{const result=JSON.parse(output);if(!['succeeded','failed','cancelled'].includes(result.status)||typeof result.summary!=='string'||!result.summary.trim())throw Error('Invalid result');resolveResult({status:result.status,summary:result.summary.slice(0,2000)});}catch{resolveResult({status:'failed',summary:'Tool chưa trả về kết quả xác nhận hợp lệ; chưa ghi nhận thành công.'});}
   });
   child.stdin.end(JSON.stringify({run_id:run.id,idempotency_key:run.id,...run.task_snapshot}));
  });
 }catch{outcome={status:'failed',summary:'Không khởi chạy được bộ kết nối. Kiểm tra cấu hình trên máy.'};}
 finally{finished=true;clearInterval(heartbeat);}
 remember({run_id:run.id,outcome});await flush();
}
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{stopping=true;wake?.();stopChild();});
console.log('IBB5: bộ kết nối đã mở. Kênh sẵn sàng: '+(capabilities.join(', ')||'Chưa cấu hình tool'));
while(!stopping){
 try{
  await flush();
  const response=await api({action:'poll',capabilities});
  if(response.run)await execute(response.run);
  else if(response.active){remember({run_id:response.active.id,outcome:{status:'failed',summary:'Không xác định được tiến trình đang chạy sau gián đoạn. Không tự chạy lại; cần kiểm tra trực tiếp tại tool.'}});await flush();}
 }catch(error){console.error('IBB5: '+([401,403].includes(error.status)?'Khóa máy không còn hiệu lực; dừng kết nối.':'Mất kết nối hoặc chưa nhận được xác nhận. Sẽ thử kết nối lại, không tự chạy lại tác vụ.'));if([401,403].includes(error.status))break;}
 if(!stopping)await delay(Math.max(15,Number(config.pollSeconds)||60)*1000);
}
