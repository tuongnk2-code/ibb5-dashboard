const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5251,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const [role,width,total] of [['staff',390,2],['lead',390,2],['manager',1440,4]]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const profile={id:'user',role,acc:role==='lead'?'DNG.HoaNTB6':'DNG.ChuongHM'};
  const own=role==='lead'?'DNG.ManLM3':'DNG.ChuongHM',other=role==='lead'?'DNG.ChuongHM':'DNG.ManLM3';
  const rows=['A','B','OTHER_A','OTHER_B','DONE','APPROVED'].map(id=>({id,staff:id.startsWith('OTHER')?other:own,created:'2026-11-01',date:id==='DONE'?'2026-11-20':'',type:'Internet',status:'Bình thường',customer:'Khách thử nghiệm',room:'IBB5'}));
  const full={result:'Chưa Online',expected:'2026-11-20',timeSlot:'8h - 10h',action:'Chờ lắp',source:'Web',updated:'2026-11-15T12:00:00+07:00'};
  const notes={A:full,OTHER_A:full,DONE:{...full,result:'Đã Online'},APPROVED:{...full,cancellationApproved:true}};
  await page.addInitScript(({rows,notes})=>{window.IBB5_IMPORTED_DATA=rows;window.IBB5_PENDING_NOTES=notes;window.IBB5_SHARED_STATE={notes,commitments:{},revisions:{}};window.IBB5_IMPORT_META={files:{Internet:{updated:'2026-11-21T12:00:00+07:00'}}};const OriginalDate=Date;window.Date=class extends OriginalDate{constructor(...a){super(...(a.length?a:['2026-11-21T06:00:00Z']));}static now(){return OriginalDate.parse('2026-11-21T06:00:00Z');}};},{rows,notes});
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/api/report-comments**',r=>r.fulfill({json:{notifications:[]}}));
  await page.route('**/api/daily-reports?**',r=>r.fulfill({json:{reports:[],profiles:[]}}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(profile)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';window.dashboard=await import('/js/main.js');const {installReportNotifications}=await import('/js/reportComments.js');installReportNotifications({getContractContext:window.dashboard.getContractNotificationContext,onOpenContract:window.dashboard.openPendingContract});`}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5251/#overview');
  await page.waitForFunction(total=>document.querySelector('#reportNotificationButton b')?.textContent===String(total),total);
  await page.locator('#reportNotificationButton').click();const inbox=page.locator('.rc-inbox');await inbox.locator('[data-contract-alert="overdue"]').waitFor();
  assert.match(await inbox.locator('.rc-contract-alerts h4').first().innerText(),new RegExp(total+' HĐ'));
  await inbox.locator('[data-contract-alert="overdue"]').click();const cards=inbox.locator('.rc-alert-contracts article');assert.equal(await cards.count(),role==='manager'?2:1);assert.match(await cards.first().innerText(),/^A /);
  if(role!=='manager')assert.doesNotMatch(await inbox.locator('.rc-alert-contracts').innerText(),/OTHER/);
  assert.equal(await inbox.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  if(process.env.ALERT_SCREENSHOT_DIR)await page.screenshot({path:process.env.ALERT_SCREENSHOT_DIR+'/contract-alerts-'+role+'.png'});
  // Even previous date/team/search/column filters must not hide the selected contract.
  await page.evaluate(()=>{document.getElementById('pendQuery').value='NO_MATCH';document.getElementById('pendTeam').value='3';document.getElementById('pendAsOf').value='2026-10-01';});
  await cards.first().getByRole('button',{name:'Mở HĐ để xử lý'}).click();await inbox.waitFor({state:'hidden'});await page.waitForFunction(()=>location.hash==='#pendingContracts');
  assert.equal(await page.locator('#pendQuery').inputValue(),'A');assert.equal(await page.locator('#pendAsOf').inputValue(),'2026-11-21');assert.equal(await page.locator('#pendRows tr[data-id="A"]').count(),1);assert.equal(await page.locator('#pendRows tr[data-id]').count(),1);
  // Saving complete Online follow-ups removes all corresponding active warnings.
  await page.evaluate(()=>{for(const row of window.IBB5_IMPORTED_DATA){row.date='2026-11-21';window.IBB5_PENDING_NOTES[row.id]={result:'Đã Online',expected:'2026-11-21',timeSlot:'8h - 10h',source:'Web',action:'Đã lắp',updated:'2026-11-21T12:00:00+07:00'};}document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:[]}}));});
  await page.waitForFunction(()=>document.querySelector('#reportNotificationButton b').hidden);assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: staff/lead/manager scope, unique warning counts, live resolved updates, current-date exact contract navigation, desktop/mobile layout');}
 finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
