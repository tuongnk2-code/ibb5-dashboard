const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const role of ['manager','lead','staff']){
   const page=await browser.newPage({viewport:{width:role==='manager'?1440:390,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   let aiAvailable=false;
   await page.route('**/api/assistant',async r=>{
    if(r.request().method()==='GET')return r.fulfill({contentType:'application/json',body:JSON.stringify({configured:aiAvailable})});
    const body=r.request().postDataJSON();if(body.message==='AI ERROR')return r.fulfill({status:429,contentType:'application/json',body:JSON.stringify({error:'AI hết hạn mức thử nghiệm'})});
    const update=body.message.includes('dời lịch'),plan={intent:update?'update':'chat',scope:body.scope,contractId:update?'TEST1':'',query:'',patch:update?{expected:'2026-11-22'}:{}};
    return r.fulfill({contentType:'application/json',body:JSON.stringify({plan,answer:'Em đã hiểu câu hỏi tự nhiên của anh; chưa lưu dữ liệu.'})});
   });
   await page.addInitScript(()=>{
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const contract=(id,extra={})=>({id,type:'Internet',status:'Bình thường',room:'IBB5',staff:'DNG.ManLM3',created:today.slice(0,7)+'-01',date:'',customer:'<img src=x onerror=alert(1)>',...extra});
    window.IBB5_IMPORTED_DATA=[contract('TEST1'),contract('TEST2'),contract('TEST3'),contract('FOREIGN',{staff:'DNG.Vypv',date:today}),contract('ONLINE',{date:today}),contract('TERMINATED',{status:'Đã chấm dứt hợp đồng'}),contract('CAM',{type:'Camera',date:today})];
    const value={expected:today,timeSlot:'8h - 10h',action:'Khác',result:'Chưa Online',source:'Web'};
    window.IBB5_PENDING_NOTES={TEST1:{...value},TEST2:{...value},TEST3:{...value,result:'Hủy',cancelReason:'Khách không còn nhu cầu',expected:'',timeSlot:''}};
    window.IBB5_SHARED_STATE={commitments:{},notes:window.IBB5_PENDING_NOTES,revisions:{'pending:TEST1':1,'pending:TEST2':1,'pending:TEST3':1}};
    window.assistantCalls=[];
    window.IBB5_SYNC={refresh:async()=>false,pending:async(id,note,revision)=>{
      if(revision!==(window.IBB5_SHARED_STATE.revisions['pending:'+id]||0))throw new Error('Dữ liệu đã thay đổi');
      window.assistantCalls.push({id,note,revision});window.IBB5_PENDING_NOTES[id]={...note,updated:new Date().toISOString()};window.IBB5_SHARED_STATE.revisions['pending:'+id]++;
      document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:'+id]}}));
    },cancelPending:async(id,revision)=>{window.assistantCalls.push({kind:'approve',id,revision});window.IBB5_PENDING_NOTES[id].cancellationApproved=true;}};
   });
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/api/daily-reports?*',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({profiles:[{id:'mine',acc:'DNG.ManLM3',role:'staff',team:3},{id:'foreign',acc:'DNG.Vypv',role:'staff',team:1}],reports:[{user_id:'mine',report_date:new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),status:'submitted',data:{actual:2,commitment:3,sources:[],support:'Cần hỗ trợ khảo sát'}},{user_id:'foreign',report_date:'2026-11-16',status:'submitted',data:{actual:99,commitment:99,sources:[],support:'SECRET SUPPORT'}}]})}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.locator('#ibbAssistantLauncher').click();
   const panel=page.locator('#ibbAssistant'),log=panel.locator('.chat-messages');
   const send=async text=>{await panel.locator('#ibbAssistantInput').fill(text);await panel.locator('.chat-composer button').click();await page.waitForFunction(()=>!document.querySelector('#ibbAssistant .chat-composer button').disabled);};
   await send('Tóm tắt tháng này');assert.match(await log.innerText(),new RegExp((role==='manager'?'2':'1')+' · NET Online'));assert.match(await log.innerText(),/1 · Camera Online/);
   await log.getByRole('button',{name:(role==='manager'?'2':'1')+' · NET Online',exact:true}).click();assert.equal(await page.locator('#assistantContractDialog tbody tr').count(),role==='manager'?2:1);assert.equal(await page.locator('#assistantContractDialog th').count(),5);await page.locator('#assistantContractDialog [data-aged-close]').click();
   await send('Kênh bán');assert.match(await log.innerText(),/100%/);
   await send('Nhân sự cần hỗ trợ');assert.match(await log.innerText(),/Cần hỗ trợ khảo sát/);if(role!=='manager')assert.doesNotMatch(await log.innerText(),/SECRET SUPPORT/);
   await send('Tìm FOREIGN');if(role!=='manager')assert.match(await log.locator('article').last().innerText(),/Không tìm thấy/);
   await send('Tìm TEST1');assert.equal(await panel.locator('img').count(),0);assert.match(await log.locator('article').last().innerText(),/img src=x/);
   await send('Cập nhật HĐ TEST1 sang 20/11/2026, 15h30 - 17h30');
   const form=panel.locator('.chat-edit').last();assert.equal(await form.locator('[name=expected]').inputValue(),'2026-11-20');assert.equal(await form.locator('[name=timeSlot]').inputValue(),'15h30 - 17h30');await form.getByRole('button',{name:'Xem thay đổi'}).click();
   assert.equal(await page.evaluate(()=>window.assistantCalls.length),0);await panel.getByRole('button',{name:'Xác nhận lưu TEST1',exact:true}).click();await page.waitForFunction(()=>window.assistantCalls.length===1);
   assert.equal(await page.evaluate(()=>window.assistantCalls[0].note.source),'Web');assert.equal(await page.evaluate(()=>window.assistantCalls[0].revision),1);assert.match(await log.innerText(),/Đã lưu HĐ TEST1/);
   await send('Cập nhật HĐ TEST2 sang 21/11/2026');await panel.locator('.chat-edit').last().getByRole('button',{name:'Xem thay đổi'}).click();await page.evaluate(()=>window.IBB5_SHARED_STATE.revisions['pending:TEST2']=2);await panel.getByRole('button',{name:'Xác nhận lưu TEST2',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#ibbAssistant .chat-messages').textContent.includes('nơi khác'));assert.equal(await page.evaluate(()=>window.assistantCalls.length),1);
   await send('Cập nhật HĐ TERMINATED');assert.match(await log.locator('article').last().innerText(),/chấm dứt/);
   await send('Duyệt hủy HĐ TEST3');if(role==='manager'){await panel.getByRole('button',{name:'Xác nhận duyệt hủy',exact:true}).click();await page.waitForFunction(()=>window.assistantCalls.length===2);assert.equal(await page.evaluate(()=>window.assistantCalls.at(-1).kind),'approve');}else assert.match(await log.locator('article').last().innerText(),/Trưởng phòng/);
   await send('Cập nhật HĐ FOREIGN');if(role!=='manager')assert.equal(await panel.locator('.chat-edit').count(),0);
   if(role==='manager')await panel.locator('.chat-edit').last().getByRole('button',{name:'Bỏ nháp'}).click();
   aiAvailable=true;await panel.getByRole('button',{name:'Kết nối AI',exact:true}).click();await panel.getByRole('button',{name:'AI: Bật',exact:true}).waitFor();
   await send('Theo em, lúc này anh nên ưu tiên chuyện gì nhỉ?');assert.match(await log.innerText(),/Em đã hiểu câu hỏi tự nhiên/);
   const beforeAI=await page.evaluate(()=>window.assistantCalls.length);await send('Anh muốn dời lịch của TEST1 sang ngày 22 nhé');assert.equal(await panel.locator('.chat-edit [name=expected]').inputValue(),'2026-11-22');assert.equal(await page.evaluate(()=>window.assistantCalls.length),beforeAI);
   await panel.locator('.chat-edit').getByRole('button',{name:'Xem thay đổi'}).click();await panel.getByRole('button',{name:'Xác nhận lưu TEST1',exact:true}).last().click();await page.waitForFunction(n=>window.assistantCalls.length===n,beforeAI+1);
   await send('AI ERROR');assert.match(await log.locator('article').last().innerText(),/AI hết hạn mức/);assert.equal(await page.evaluate(()=>window.assistantCalls.length),beforeAI+1);await panel.getByRole('button',{name:'AI: Bật',exact:true}).click();
   await panel.getByRole('button',{name:'Xóa nội dung chat'}).click();assert.equal(await log.locator('article').count(),1);assert.ok(await panel.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight;}));
   if(process.env.ASSISTANT_SCREENSHOT_DIR){await send('Nhân sự cần hỗ trợ');await panel.screenshot({path:process.env.ASSISTANT_SCREENSHOT_DIR+'/assistant-'+role+'.png'});}
   await panel.getByRole('button',{name:'Đóng trợ lý'}).click();assert.equal(await panel.isVisible(),false);assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: assistant reports, permission scopes, safe details, confirmed updates, conflicts, cancellation approval and mobile layout');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
