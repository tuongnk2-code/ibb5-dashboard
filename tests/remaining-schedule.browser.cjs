const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const [role,width] of [['manager',1440],['manager',390],['staff',390],['lead',390]]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   const row=(id,staff='DNG.ManLM3')=>({id,type:'Internet',staff,room:'IBB5',created:'2026-11-01',date:'',customer:'Khách '+id});
   window.IBB5_IMPORTED_DATA=[row('A',' dng.manlm3 '),row('B'),row('C','DNG.Vypv'),row('CANCEL'),row('ONLINE'),row('NEXT')];window.IBB5_IMPORTED_DATA.find(r=>r.id==='ONLINE').date='2026-11-17';
   window.IBB5_PENDING_NOTES=Object.fromEntries(window.IBB5_IMPORTED_DATA.map((r,i)=>[r.id,{expected:r.id==='B'?'2026-11-30':r.id==='NEXT'?'2026-12-01':'2026-11-18',result:r.id==='CANCEL'?'Dự Kiến Hủy':'Chưa Online',timeSlot:'8h - 10h'}]));window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#pendingContracts');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');await page.locator('#pendAsOf').fill('2026-11-17');await page.locator('#pendAsOf').dispatchEvent('change');
  const root=page.locator('#remainingOnlineSchedule');await root.scrollIntoViewIfNeeded();await root.locator('thead th').nth(2).waitFor();
  assert.equal(await root.locator('thead th').count(),15);assert.equal(await root.locator('.rc-id').count(),role==='manager'?3:2);assert.equal(await root.locator('tfoot td').first().innerText(),role==='manager'?'3':'2');assert.equal(await root.evaluate(el=>el.previousElementSibling.contains(document.getElementById('pendRows'))),true);
  const mine=root.locator('[data-rc-person="DNG.ManLM3"]');assert.match(await mine.innerText(),/A/);assert.match(await mine.innerText(),/B/);assert.doesNotMatch(await root.locator('tbody').innerText(),/CANCEL|ONLINE|NEXT/);
  await mine.locator('.rc-id[data-rc-id="A"]').click();assert.equal(await page.locator('#remainingScheduleDialog tbody tr').count(),1);assert.equal(await page.locator('#remainingScheduleDialog th').count(),5);await page.locator('#remainingScheduleDialog [data-aged-close]').click();
  await root.locator('select').selectOption('3');assert.equal(await root.locator('.rc-id').count(),2);await root.locator('input').fill('le minh man');assert.equal(await root.locator('tbody [data-rc-person]').count(),1);
  await page.evaluate(()=>{window.IBB5_PENDING_NOTES.A.expected='2026-11-19';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:A']}}));});await page.waitForTimeout(20);assert.equal(await mine.locator('td').nth(2).locator('[data-rc-id="A"]').count(),1);
  await page.evaluate(()=>{window.IBB5_IMPORTED_DATA.find(row=>row.id==='B').date='2026-11-17';window.IBB5_SHARED_STATE.snapshot={data:window.IBB5_IMPORTED_DATA};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});await page.waitForTimeout(20);assert.equal(await root.locator('tfoot td').first().innerText(),'1');assert.equal(await root.locator('.rc-id').count(),1);
  await root.locator('.rc-scroll').evaluate(el=>{el.scrollLeft=el.scrollWidth;el.scrollTop=100;});const pin=await mine.locator('th').evaluate(el=>({left:el.getBoundingClientRect().left,scroll:el.closest('.rc-scroll').getBoundingClientRect().left}));assert.ok(Math.abs(pin.left-pin.scroll)<=2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  if(process.env.REMAINING_SCREENSHOT_DIR){await root.locator('.rc-scroll').evaluate(el=>{el.scrollLeft=0;el.scrollTop=0;});await root.screenshot({path:process.env.REMAINING_SCREENSHOT_DIR+'/remaining-schedule-'+role+'-'+width+'.png'});}
  await page.locator('#pendAsOf').fill('2026-11-30');await page.locator('#pendAsOf').dispatchEvent('change');await page.waitForTimeout(20);assert.match(await root.locator('.rc-summary').textContent(),/không còn ngày/);assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: personnel/day calendar, counts and IDs, scoped drilldown, filters, live notes/source updates, pinned columns, month end and mobile');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
