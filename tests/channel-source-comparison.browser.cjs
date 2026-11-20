const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1600,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const row=(id,staff,created,sourceExcel)=>({id,type:'Internet',staff,created,date:'',sourceExcel,room:'IBB5'});
   window.IBB5_IMPORTED_DATA=[row('C1','DNG.Hoantt','2026-11-01','Web'),row('C2','DNG.Hoantt','2026-11-10','Web'),row('C3','DNG.Hoantt','2026-11-19','Web'),row('C4','DNG.Namnh170','2026-11-10','IBB'),row('MISSING','DNG.Namnh170','2026-11-10',''),row('AFTER','DNG.Hoantt','2026-11-20','Web'),row('P1','DNG.Hoantt','2026-10-01','Web'),row('P2','DNG.Hoantt','2026-10-10','IBB'),row('P3','DNG.Namnh170','2026-10-19','Web'),row('P4','DNG.Namnh170','2026-10-20','IBB'),row('JAN','DNG.Hoantt','2026-01-01','Web')];
   Object.assign(window.IBB5_IMPORTED_DATA.find(row=>row.id==='C1'),{date:'2026-11-05'});
   Object.assign(window.IBB5_IMPORTED_DATA.find(row=>row.id==='C2'),{date:'2026-11-20'});
   Object.assign(window.IBB5_IMPORTED_DATA.find(row=>row.id==='C3'),{status:'Đã chấm dứt hợp đồng'});
   for(const id of ['C4','MISSING'])window.IBB5_IMPORTED_DATA.find(row=>row.id===id).date='2026-11-19';
   window.IBB5_PENDING_NOTES={C1:{result:'Hủy'},C2:{result:'Đã Online'}};window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  const set=(id,value)=>page.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
  await set('anaMonth','2026-11');await set('anaDay','2026-11-19');
  const grand=page.locator('#anaMonthlyFoot .ana-channel-grand'),metric=(root,name)=>root.locator('[data-source-metric="'+name+'"]'),person=page.locator('#anaMonthlyRows [data-acc="DNG.Hoantt"]');
  assert.equal(await metric(grand,'current').innerText(),'4');assert.equal(await metric(grand,'previous').innerText(),'3');assert.equal(await metric(grand,'delta').innerText(),'+1 HĐ');assert.equal(await metric(grand,'percent').innerText(),'+33%');assert.doesNotMatch(await page.locator('#anaMonthlyHead').innerText(),/PTTB/);
  assert.equal(await metric(person,'current').innerText(),'3');assert.equal(await metric(person,'previous').innerText(),'2');assert.equal(await metric(person,'percent').innerText(),'+50%');assert.equal(await person.locator('[data-channel="Web"] .ana-source-count').innerText(),'3');assert.equal(await person.locator('[data-channel="Web"] .ana-source-change').innerText(),'+2 HĐ');assert.match(await page.locator('#anaMonthlyNote').innerText(),/1 HĐ chưa cập nhật/);assert.match(await page.locator('#anaMonthlyScope').innerText(),/19\/10/);
  assert.equal(await person.locator('[data-channel="Web"] .ana-net-online').innerText(),'Online 1 / 3');
  assert.equal(await metric(grand,'net-status').innerText(),'Online 2\nChưa 1 · Hủy 1');assert.equal(await metric(grand,'online-percent').innerText(),'50%');
  const headerColumns=await page.locator('#anaMonthlyHead th').count();
  assert.equal(await grand.locator('th,td').count(),headerColumns);assert.equal(await page.locator('#anaMonthlyFoot .ana-channel-ratio th,#anaMonthlyFoot .ana-channel-ratio td').count(),headerColumns);
  await page.locator('#anaChannelTeam').selectOption('2');assert.equal(await metric(grand,'current').innerText(),'4'); // both current staff belong to Bầy 2
  await page.locator('#anaStaff').selectOption('DNG.Hoantt');assert.equal(await metric(grand,'current').innerText(),'3');assert.equal(await metric(grand,'previous').innerText(),'2');
  await page.locator('#anaStaff').selectOption('');await page.locator('#anaChannelTeam').selectOption('1');assert.equal(await metric(grand,'current').innerText(),'0');assert.equal(await metric(grand,'percent').innerText(),'—');
  await page.locator('#anaChannelTeam').selectOption('');await set('anaDay','2026-11-01');assert.equal(await metric(grand,'current').innerText(),'1');assert.equal(await metric(grand,'previous').innerText(),'1');
  await set('anaChannelMonth','2026-01');assert.equal(await metric(grand,'previous').innerText(),'—');assert.equal(await metric(grand,'delta').innerText(),'—');assert.match(await page.locator('#anaMonthlyNote').innerText(),/2025-12/);
  await set('anaChannelMonth','2026-11');await set('anaDay','2026-11-19');
  await page.locator('#anaMonthlyHead').scrollIntoViewIfNeeded();await page.screenshot({path:'C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/channel-comparison-desktop.png'});
  await page.setViewportSize({width:390,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));assert.deepEqual(errors,[]);
  assert.equal(await metric(grand,'online-percent').innerText(),'50%');
  await page.evaluate(()=>{const data=window.IBB5_IMPORTED_DATA.map(row=>row.id==='C2'?{...row,date:'2026-11-19'}:row);window.IBB5_SHARED_STATE.snapshot={data,meta:{},cancelledNet:[]};document.dispatchEvent(new Event('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});
  await page.waitForFunction(()=>document.querySelector('#anaMonthlyFoot [data-source-metric="net-status"]').textContent.includes('Online 3'));
  assert.equal(await metric(grand,'net-status').innerText(),'Online 3\nChưa 0 · Hủy 1');assert.equal(await metric(grand,'online-percent').innerText(),'75%');assert.equal(await metric(grand,'current').innerText(),'4');
  console.log('PASS: source counts, same-period dates, per-channel differences, staff/team/grand totals, missing sources/history, zero baseline and mobile fit');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
