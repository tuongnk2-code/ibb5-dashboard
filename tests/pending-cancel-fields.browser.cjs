const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const {validateNote}=await import('../js/dashboardStateModel.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5188,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const mobile of [false,true]){
   const ctx=await browser.newContext({viewport:{width:mobile?390:1440,height:1000}}),saved=[],errors=[];
   await ctx.addInitScript(()=>{window.IBB5_IMPORTED_DATA=['C1','C2'].map(id=>({id,type:'Internet',created:'2026-11-01',date:'',staff:'DNG.ManLM3',room:'IBB5',customer:id}));window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={commitments:{},revisions:{},notes:{}};});
   await ctx.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await ctx.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await ctx.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${mobile?'staff':'manager'}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await ctx.route('https://**/*',r=>r.abort());
   const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
   await page.exposeFunction('validateSavedNote',(id,value)=>{const clean=validateNote(value);saved.push({id,...clean});return {...clean,updated:new Date().toISOString()};});
   await page.goto('http://127.0.0.1:5188/#pendingContracts');await page.locator('#pendRows tr[data-id="C1"]').waitFor();
   await page.evaluate(()=>{window.IBB5_SYNC={pending:async(id,value)=>{const entry=await window.validateSavedNote(id,value);window.IBB5_PENDING_NOTES[id]=entry;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:'+id]}}));return entry;}};});
   assert.deepEqual((await page.locator('.pending-table thead .ph-label').allTextContents()).slice(0,7),['Mã HĐ','Nhân viên bán','Tên Khách Hàng','Ngày Tạo HĐ','Kết Quả','Lý do hủy','Ngày Online dự kiến']);
   for(const [id,result] of [['C1','Dự Kiến Hủy'],['C2','Hủy']]){
    const row=page.locator('#pendRows tr[data-id="'+id+'"]');
    if(mobile){
     await row.locator('.p-mobile-edit').click();const form=page.locator('#pendingMobileForm');
     await form.locator('[name="result"]').selectOption(result);
     assert.equal(await form.locator('[name="expected"]').evaluate(el=>el.required),false);assert.equal(await form.locator('[name="timeSlot"]').evaluate(el=>el.required),false);
     await form.locator('[name="result"]').selectOption('Chưa Online');assert.equal(await form.locator('[name="expected"]').evaluate(el=>el.required),true);await form.locator('[name="result"]').selectOption(result);
     await form.locator('[name="action"]').selectOption('Khác');if(result==='Hủy')await form.locator('[name="cancelReason"]').fill('Khách yêu cầu');
     assert.equal(await form.evaluate(el=>el.checkValidity()),false);assert.equal(saved.length,id==='C1'?0:1);
     await form.locator('[name="source"]').selectOption('Web');assert.equal(await form.evaluate(el=>el.checkValidity()),true);await form.locator('[type="submit"]').click();await page.locator('#pendingMobileEditor').waitFor({state:'hidden'});
    }else{
     await row.locator('.p-result').selectOption(result);
     assert.equal(await row.locator('td').nth(4).locator('.p-result').count(),1);
     await row.locator('.p-note').selectOption('Khác');if(result==='Hủy')await row.locator('.p-cancel-reason').fill('Khách yêu cầu');
     await row.locator('.p-save').click();assert.equal(saved.length,id==='C1'?0:1);assert.match(await row.locator('.pending-validation-message').textContent(),/Nguồn thông tin/);
     await row.locator('.p-source').selectOption('Web');await row.locator('.p-save').click();await row.locator('.p-save').filter({hasText:'Đã lưu'}).waitFor();
    }
    const last=saved.at(-1);assert.equal(last.id,id);assert.equal(last.expected,'');assert.equal(last.timeSlot,'');assert.equal(last.action,'Khác');assert.equal(last.source,'Web');
   }
   assert.deepEqual(errors,[]);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await ctx.close();
  }
  console.log('PASS: reordered result column, only date/slot optional for both cancellation statuses, other fields required, desktop/mobile saves validated');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
