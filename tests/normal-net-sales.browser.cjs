const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const net=(id,status='Bình thường',staff='DNG.Hoantt',extra={})=>({id,status,staff,type:'Internet',created:'2026-11-05',date:'',room:'IBB5',...extra});
   window.IBB5_IMPORTED_DATA=[net('ACTIVE'),net('LOCAL'),net('TERMINATED','Đã chấm dứt hợp đồng'),net('SUSPENDED','Tạm ngưng'),net('UNKNOWN',''),net('OTHER','Bình thường','DNG.Vypv'),net('OLD','Bình thường','DNG.Hoantt',{created:'2026-10-01'}),net('FUTURE','Bình thường','DNG.Hoantt',{created:'2026-11-22'})];
   window.IBB5_PENDING_NOTES={LOCAL:{result:'Hủy',cancellationApproved:true}};window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,revisions:{},commitments:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:"window.IBB5_CURRENT_PROFILE={id:'test',role:'manager'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');"}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#performance');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  await page.locator('#to').evaluate(el=>{el.value='2026-11-21';el.dispatchEvent(new Event('change'));});
  const person=page.locator('#perfRows tr').filter({has:page.locator('.person',{hasText:'DNG.Hoantt'})}),sold=person.locator('[data-perf-contracts="sold"]');
  assert.equal(await sold.innerText(),'2');assert.equal(await page.locator('#perfFoot td').nth(3).innerText(),'3');
  await sold.click();await page.locator('#performanceContractDialog').waitFor({state:'visible'});
  const detail=await page.locator('#performanceContractDialog').innerText();assert.match(detail,/ACTIVE/);assert.match(detail,/LOCAL/);assert.doesNotMatch(detail,/TERMINATED|SUSPENDED|UNKNOWN|FUTURE/);
  await page.keyboard.press('Escape');
  for(const [status,expected,total] of [['Đã chấm dứt hợp đồng','1','2'],['Bình thường','2','3']]){
   await page.evaluate(status=>{window.IBB5_SHARED_STATE.snapshot={data:window.IBB5_IMPORTED_DATA.map(row=>row.id==='ACTIVE'?{...row,status}:row),meta:{}};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));},status);
   assert.equal(await sold.innerText(),expected);assert.equal(await page.locator('#perfFoot td').nth(3).innerText(),total);
  }
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: monthly sales and drill-down count only normal NET status; totals respond to latest source changes on desktop/mobile');}
 finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
