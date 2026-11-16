const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const {STAFF_ROSTER}=await import('../js/staffRoster.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const data=Array.from({length:90},(_,i)=>({id:'OLD'+i,type:'Internet',staff:i%2?'DNG.Vypv':'DNG.ManLM3',room:'IBB5',created:i%4?'2026-11-08':'2026-11-04',date:''}));
  data.push(...STAFF_ROSTER.map((person,i)=>({id:'ONLINE'+i,type:'Internet',staff:person.acc,room:'IBB5',created:'2026-11-01',date:'2026-11-15'})));
  const notes=Object.fromEntries(data.filter(row=>row.id.startsWith('OLD')).map((row,i)=>[row.id,{action:i%3?'KH muốn hẹn ngày đó':'Khác',expected:'2026-11-20',result:'Chưa Online'}]));notes.OLD2.action='<img src=x onerror=alert(1)>';
  for(const role of ['manager','staff']){
   const page=await browser.newPage({viewport:{width:role==='manager'?1440:390,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(({data,notes})=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES=notes;window.IBB5_SHARED_STATE={commitments:{},notes,revisions:{}};},{data,notes});
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   await page.locator('#anaDay').fill('2026-11-16');await page.locator('#anaDay').dispatchEvent('change');
   const card=page.locator('.ana-overdue-card'),list=card.locator('.ana-overdue-scroll'),rows=card.locator('[data-overdue-id]');
   assert.equal(await page.locator('#anaOld').textContent(),'90');assert.equal(await rows.count(),role==='manager'?90:45);assert.equal(await card.locator('thead select').count(),4);assert.equal(await card.locator('img').count(),0);
   if(role==='manager'){
    const fit=await card.evaluate(el=>{const list=el.querySelector('.ana-overdue-scroll').getBoundingClientRect(),footer=el.querySelector('.ana-overdue-footer').getBoundingClientRect();return {height:list.height,gap:footer.top-list.bottom,tail:el.getBoundingClientRect().bottom-footer.bottom};});assert.ok(fit.height>450&&fit.gap<=15&&fit.tail<30,'List fills card instead of leaving blank space: '+JSON.stringify(fit));
   }else assert.doesNotMatch(await card.locator('[data-field="staff"]').innerText(),/DNG.Vypv/);
   await card.locator('[data-field="staff"]').selectOption('DNG.ManLM3');assert.equal(await rows.count(),45);
   await card.locator('[data-field="reason"]').selectOption('Khác');assert.equal(await rows.count(),15);
   await card.locator('[data-field="age"]').selectOption('12');assert.equal(await rows.count(),8);
   await card.locator('[data-field="id"]').selectOption('OLD12');assert.equal(await rows.count(),1);assert.equal(await rows.first().getAttribute('data-overdue-id'),'OLD12');assert.match(await page.locator('#anaOldScope').textContent(),/1 \/ (90|45)/);
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.OLD12.action='Đã đổi nguyên nhân';window.dispatchEvent(new Event('storage'));});assert.equal(await rows.count(),0);
   await page.locator('#anaOldReset').click();assert.equal(await rows.count(),role==='manager'?90:45);assert.equal(await page.locator('#anaOld').textContent(),'90');
   await list.scrollIntoViewIfNeeded();await list.evaluate(el=>{el.scrollTop=0;});await page.evaluate(()=>new Promise(requestAnimationFrame));const top=await card.locator('thead th').first().evaluate(el=>el.getBoundingClientRect().top);await list.evaluate(el=>{el.scrollTop=300;});await page.evaluate(()=>new Promise(requestAnimationFrame));const after=await card.locator('thead th').first().evaluate(el=>el.getBoundingClientRect().top);assert.ok(Math.abs(after-top)<2,JSON.stringify({role,top,after}));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   if(process.env.ANALYTICS_SCREENSHOT_DIR)await card.screenshot({path:process.env.ANALYTICS_SCREENSHOT_DIR+'/analytics-overdue-'+role+'.png'});
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: overdue list fills card, four intersecting header filters, unchanged KPI, permissions, live notes, sticky header and mobile');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
