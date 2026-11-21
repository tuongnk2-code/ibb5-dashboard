const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5245,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const priority of ['salary','prospects','overdue']){
   const page=await browser.newPage({viewport:{width:320,height:640}}),errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
   await page.route('**/api/**',async r=>{
    requests.push({url:r.request().url(),auth:r.request().headers().authorization});
    const salary={month:'2026-11',asOf:'2026-11-20',provisional:true,rows:[{acc:'OWN',net:30,vvip:0,probation:false},{acc:'OTHER',net:999,vvip:999,probation:false}]};
    const reports={reports:[{user_id:'u',status:'submitted',report_date:'2026-11-20',data:{sources:[{leads:8,closed:2}]}},{user_id:'other',status:'submitted',report_date:'2026-11-20',data:{sources:[{leads:999,closed:0}]}}]};
    await r.fulfill({json:r.request().url().includes('/salary')?(priority==='salary'?salary:{}):reports});
   });
   await page.route('**/context-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
   await page.goto('http://127.0.0.1:5245/context-check');
   await page.evaluate(async priority=>{
    const {showStaffEncouragement}=await import('/js/staffEncouragement.js');
    showStaffEncouragement({profile:{id:'u',acc:'OWN'},name:'Nhân sự thử nghiệm',day:'2026-11-20',data:[{id:'old',staff:'OWN',type:'Internet',created:'2026-10-01',date:'2026-10-02'},{id:'now',staff:'OWN',type:'Internet',created:'2026-11-01',date:'2026-11-02'},...(priority==='overdue'?[{id:'pending',staff:'OWN',type:'Internet',created:'2026-11-15',date:''}]:[])],notes:{old:{result:'Đã Online'},now:{result:'Đã Online'},pending:{expected:'2026-11-19'}}});
   },priority);
   const dialog=page.locator('.staff-encouragement');
   await page.waitForFunction(priority=>document.querySelector('.staff-encouragement')?.dataset.priority===priority,priority);
   await dialog.locator('.se-background').evaluate(el=>el.decode());
   assert.equal(await dialog.locator('.se-change').innerText(),'0 HĐ');
   const body=await dialog.locator('#staffEncouragementBody').innerText();
   assert.doesNotMatch(body,/999/);
   if(priority==='salary')assert.match(body,/LCB tạm tính.*2 NET.*1 V.VIP/);
   if(priority==='prospects')assert.match(body,/8 KHTN mới.*2 đã chốt/);
   if(priority==='overdue')assert.match(body,/1 HĐ.*qua ngày hẹn/);
   assert.equal(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight),true);
   assert.ok(requests.length>=2);assert.ok(requests.every(r=>r.auth==='Bearer test'));
   await dialog.locator('.se-close').click();await dialog.waitFor({state:'detached'});
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: own authenticated KHTN and LCB, urgent pending priority, growth badge retained, photo loaded and compact layout');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
