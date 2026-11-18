const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const row=(id,date,room='IBB5',type='Internet')=>({id,date,created:date,room,type,staff:'DNG.ManLM3',customer:'Khách '+id});
   window.IBB5_IMPORTED_DATA=[row('OCT1','2026-10-18'),row('OCT1','2026-10-18'),row('OCT2','2026-10-18'),row('OTHER','2026-10-18','OTHER'),row('EARLIER','2026-10-17'),row('LATER','2026-10-19'),row('CAM','2026-10-18','IBB5','Camera'),row('CURRENT','2026-11-18'),row('MONTHEND','2026-02-28')];
   window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  const setDate=date=>page.locator('#to').evaluate((el,date)=>{el.value=date;el.dispatchEvent(new Event('change',{bubbles:true}));},date);
  await setDate('2026-11-18');assert.equal(await page.locator('#previousDayOnline').textContent(),'3');assert.match(await page.locator('#previousDayOnlineNote').textContent(),/18\/10\/2026/);
  await page.locator('#room').selectOption('IBB5');assert.equal(await page.locator('#previousDayOnline').textContent(),'2');
  await page.locator('#previousDayOnline').click();assert.match(await page.locator('#overviewMetricDialogTitle').innerText(),/18\/10\/2026 · 2 HĐ/);assert.deepEqual(await page.locator('#overviewMetricDialog tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.agedId)),['OCT1','OCT2']);await page.locator('#overviewMetricDialog [data-aged-close]').click();
  const pickDay=date=>page.locator('#previousDayDate').evaluate((el,date)=>{el.value=date;el.dispatchEvent(new Event('change',{bubbles:true}));},date);
  assert.equal(await page.locator('#previousDayDate').inputValue(),'2026-10-18');assert.equal(await page.locator('#previousDayDate').getAttribute('min'),'2026-10-01');assert.equal(await page.locator('#previousDayDate').getAttribute('max'),'2026-10-31');
  const currentOnline=await page.locator('#online').textContent(),growth=await page.locator('#growthNote').textContent();
  await pickDay('2026-10-19');assert.equal(await page.locator('#previousDayOnline').textContent(),'1');assert.equal(await page.locator('#to').inputValue(),'2026-11-18');assert.equal(await page.locator('#online').textContent(),currentOnline);assert.equal(await page.locator('#growthNote').textContent(),growth);
  await page.locator('#previousDayOnline').click();assert.match(await page.locator('#overviewMetricDialogTitle').innerText(),/19\/10\/2026 · 1 HĐ/);assert.deepEqual(await page.locator('#overviewMetricDialog tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.agedId)),['LATER']);await page.locator('#overviewMetricDialog [data-aged-close]').click();
  await page.locator('#room').selectOption('');assert.equal(await page.locator('#previousDayDate').inputValue(),'2026-10-19');await page.locator('#room').selectOption('IBB5');
  await pickDay('2026-10-16');assert.equal(await page.locator('#previousDayOnline').textContent(),'0');await pickDay('2026-11-19');assert.equal(await page.locator('#previousDayDate').inputValue(),'2026-10-18');
  await setDate('2026-11-16');assert.equal(await page.locator('#previousDayOnline').textContent(),'0');
  await setDate('2026-01-18');assert.equal(await page.locator('#previousDayOnline').textContent(),'—');assert.match(await page.locator('#previousDayOnlineNote').textContent(),/2025-12/);
  await setDate('2026-03-31');assert.equal(await page.locator('#previousDayOnline').textContent(),'1');assert.match(await page.locator('#previousDayOnlineNote').textContent(),/28\/02\/2026/);
  await setDate('2026-11-18');
  for(const width of [1440,390]){await page.setViewportSize({width,height:1000});await page.locator('#previousDayOnline').scrollIntoViewIfNeeded();const fit=await page.locator('#previousDayOnline').evaluate(el=>{const card=el.closest('.mini'),r=card.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&card.scrollWidth<=card.clientWidth+1;});assert.ok(fit);await pickDay('2026-10-17');assert.equal(await page.locator('#previousDayOnline').textContent(),'1');}
  assert.deepEqual(errors,[]);console.log('PASS: exact previous-month day, unique NET contracts, room filter, details, zero/missing data, month-end clamp and mobile fit');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
