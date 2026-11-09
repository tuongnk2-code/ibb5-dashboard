const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5216,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const data=['DNG.Vypv','DNG.Nhannt137','DNG.Nhannt137','DNG.ManLM3'].map((staff,i)=>({id:'NET'+i,type:'Internet',staff,created:'2026-11-01',date:'2026-11-02',sourceExcel:i%2?'Web':'IBB',room:'IBB5'}));
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(data=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={commitments:{},notes:{},revisions:{}};},data);
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:"window.IBB5_CURRENT_PROFILE={id:'manager',role:'manager'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');"}));
  await page.route('https://**/*',r=>r.abort());
  await page.goto('http://127.0.0.1:5216/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  await page.locator('#anaMonth').fill('2026-11');await page.locator('#anaMonth').dispatchEvent('change');
  assert.match(await page.locator('#anaShareTotal').textContent(),/4 HĐ/);assert.match(await page.locator('#anaMonthlyTotal').textContent(),/4 HĐ/);
  await page.locator('#anaShareTeam').selectOption('2');
  assert.deepEqual(await page.locator('#anaStaffBars .ana-row>span').allTextContents(),['DNG.Nhannt137']);
  assert.match(await page.locator('#anaShareTotal').textContent(),/Bầy 2.*2 HĐ/);assert.match(await page.locator('#anaStaffBars').textContent(),/100%/);
  assert.match(await page.locator('#anaMonthlyTotal').textContent(),/Toàn phòng.*4 HĐ/);
  await page.locator('#anaChannelTeam').selectOption('2');
  assert.equal(await page.locator('#anaMonthlyRows tr[data-acc]').count(),3);
  assert.match(await page.locator('#anaMonthlyTotal').textContent(),/Bầy 2.*2 HĐ/);assert.equal(await page.locator('#anaMonthlyFoot .ana-channel-grand td').last().textContent(),'2');
  await page.locator('#anaStaff').selectOption('DNG.Vypv');assert.equal(await page.locator('#anaMonthlyRows tr[data-acc]').count(),0);assert.match(await page.locator('#anaMonthlyTotal').textContent(),/0 HĐ/);
  await page.locator('#anaStaff').selectOption('');
  await page.locator('#anaChannelMonth').fill('2026-12');await page.locator('#anaChannelMonth').dispatchEvent('change');assert.match(await page.locator('#anaMonthlyTotal').textContent(),/— HĐ/);assert.match(await page.locator('#anaShareTotal').textContent(),/0 HĐ/);
  await page.locator('#anaChannelMonth').fill('2026-11');await page.locator('#anaChannelMonth').dispatchEvent('change');
  await page.locator('#anaChannelTeam').selectOption('');await page.locator('#anaShareTeam').selectOption('');assert.equal(await page.locator('#anaMonthlyRows tr[data-acc]').count(),17);assert.match(await page.locator('#anaShareTotal').textContent(),/4 HĐ/);
  for(const width of [390,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));}
  assert.deepEqual(errors,[]);console.log('PASS: independent analytics team filters, team totals, percentages, full channel roster, month/staff intersections and mobile layout');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
