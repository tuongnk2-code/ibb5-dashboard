const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   Date.now=()=>Date.parse('2026-11-17T13:00:00+07:00');
   window.IBB5_IMPORTED_DATA=['MORNING','AFTERNOON','LAST','NO_SLOT'].map(id=>({id,type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created:'2026-11-01',date:''}));
   window.IBB5_PENDING_NOTES=Object.fromEntries(window.IBB5_IMPORTED_DATA.map((row,i)=>[row.id,{expected:'2026-11-17',result:'Chưa Online',timeSlot:['8h - 10h','13h30 - 15h30','15h30 - 17h30',''][i]}]));
   window.IBB5_IMPORT_META={files:{Internet:{updated:'2026-11-17T11:00:00+07:00'}}};window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:"window.IBB5_CURRENT_PROFILE={id:'test',role:'manager',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');"}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#pendingContracts');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  await page.locator('#pendAsOf').fill('2026-11-17');await page.locator('#pendAsOf').dispatchEvent('change');await page.locator('#psDay').fill('2026-11-17');await page.locator('#psDay').dispatchEvent('change');
  const badge=id=>page.locator('[data-schedule-id="'+id+'"]'),remaining=async expected=>{assert.equal(await page.locator('#pendDue').textContent(),String(expected));assert.equal(await page.locator('#psRows .ps-total td').nth(1).textContent(),String(expected));assert.equal(await page.locator('#perfFoot td').last().textContent(),String(expected));const person=page.locator('#perfRows tr').filter({has:page.locator('.person', {hasText:'DNG.ManLM3'})});assert.equal(await person.locator('td').last().textContent(),String(expected));};
  assert.equal(await page.locator('#performance [data-perf-field="expected"]').count(),1);await remaining(3);assert.equal(await page.locator('#psRows .ps-id').count(),4);assert.equal(await badge('MORNING').evaluate(el=>el.classList.contains('ps-overdue')),true);assert.equal(await badge('AFTERNOON').evaluate(el=>el.classList.contains('ps-overdue')),false);
  assert.equal(await badge('MORNING').evaluate(el=>getComputedStyle(el).color),'rgb(180, 35, 24)');
  await page.evaluate(()=>{Date.now=()=>Date.parse('2026-11-17T15:32:00+07:00');window.IBB5_IMPORT_META.files.Internet.updated='2026-11-17T15:31:00+07:00';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});await page.waitForTimeout(30);await remaining(2);assert.equal(await page.locator('#psRows .ps-overdue').count(),2);assert.equal(await page.locator('#psRows .ps-id').count(),4);
  await page.evaluate(()=>{window.IBB5_IMPORTED_DATA.find(r=>r.id==='MORNING').date='2026-11-17';window.IBB5_SHARED_STATE.snapshot={data:window.IBB5_IMPORTED_DATA};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});await page.waitForTimeout(30);await remaining(2);assert.equal(await badge('MORNING').count(),0);assert.equal(await badge('AFTERNOON').count(),1);
  await page.evaluate(()=>{Date.now=()=>Date.parse('2026-11-17T17:31:00+07:00');dispatchEvent(new Event('focus'));});await remaining(2);assert.equal(await badge('LAST').evaluate(el=>el.classList.contains('ps-awaiting-refresh')),true);
  await page.evaluate(()=>{Date.now=()=>Date.parse('2026-11-17T17:33:00+07:00');window.IBB5_IMPORT_META.files.Internet.updated='2026-11-17T17:32:00+07:00';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});await page.waitForTimeout(30);await remaining(1);assert.equal(await page.locator('#psRows .ps-overdue').count(),2);assert.equal(await badge('NO_SLOT').count(),1);assert.match(await page.locator('#psSummary').textContent(),/2 HĐ quá hẹn chỉ hiển thị/);
  assert.match(await page.locator('#pendingSchedule .ps-note').textContent(),/không tính vào tổng còn theo dõi/);
  if(process.env.SCHEDULE_SCREENSHOT_DIR)await page.locator('#pendingSchedule').screenshot({path:process.env.SCHEDULE_SCREENSHOT_DIR+'/missed-schedule-'+width+'.png'});
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: missed slots stay red and visible, excluded from KPI/team/room counts, fresh NET required, actual Online removes, desktop/mobile');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
