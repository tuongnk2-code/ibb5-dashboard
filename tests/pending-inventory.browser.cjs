const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const row=(id,date='')=>({id,type:'Internet',created:'2026-11-01',date,room:'IBB5',staff:'DNG.ManLM3',customer:id});
   window.IBB5_IMPORTED_DATA=[...Array.from({length:86},(_,i)=>row('WAIT'+i)),row('INCOMPLETE','2026-11-18'),row('COMPLETE','2026-11-18'),row('APPROVED'),row('WAIT0')];
   window.IBB5_PENDING_NOTES={COMPLETE:{expected:'2026-11-18',timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web'},APPROVED:{cancellationApproved:true}};
   window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  await page.locator('#to').evaluate(el=>{el.value='2026-11-18';el.dispatchEvent(new Event('change',{bubbles:true}));});
  await page.locator('#pendAsOf').evaluate(el=>{el.value='2026-11-18';el.dispatchEvent(new Event('change',{bubbles:true}));});
  assert.equal(await page.locator('#pending').innerText(),'87');assert.match(await page.locator('#pendCount').textContent(),/87 \/ 87/);
  const list=await page.locator('#pendRows tr[data-id]').evaluateAll(rows=>rows.map(r=>r.dataset.id).sort());assert.equal(list.length,87);assert.ok(list.includes('INCOMPLETE'));assert.ok(!list.includes('APPROVED'));
  const person=page.locator('#perfRows tr').filter({has:page.locator('.person',{hasText:'DNG.ManLM3'})}),pendingCell=person.locator('[data-perf-contracts="pending"]');
  assert.equal(await pendingCell.innerText(),'87');assert.equal(await page.locator('#perfFoot [data-perf-contracts="pending"]').innerText(),'87');
  assert.equal(await person.locator('[data-perf-contracts="aged"]').innerText(),'87');assert.equal(await page.locator('#perfFoot [data-perf-contracts="aged"]').innerText(),'87');assert.equal(await page.locator('#aged').innerText(),'87');
  await page.evaluate(()=>{location.hash='performance';});await pendingCell.click();assert.deepEqual(await page.locator('#performanceContractDialog tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.agedId).sort()),list);await page.locator('#performanceContractDialog [data-aged-close]').click();
  await page.locator('#perfFoot [data-perf-contracts="pending"]').click();assert.equal(await page.locator('#performanceContractDialog tbody tr').count(),87);await page.locator('#performanceContractDialog [data-aged-close]').click();await page.evaluate(()=>{location.hash='overview';});
  await page.evaluate(()=>{location.hash='performance';});await person.locator('[data-perf-contracts="aged"]').click();assert.deepEqual(await page.locator('#performanceContractDialog tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.agedId).sort()),list);await page.locator('#performanceContractDialog [data-aged-close]').click();await page.evaluate(()=>{location.hash='overview';});
  await page.locator('#pending').click();const detail=await page.locator('#overviewMetricDialog tbody tr').evaluateAll(rows=>rows.map(r=>r.dataset.agedId).sort());assert.deepEqual(detail,list);await page.locator('#overviewMetricDialog [data-aged-close]').click();
  await page.evaluate(()=>{window.IBB5_PENDING_NOTES.INCOMPLETE={...window.IBB5_PENDING_NOTES.COMPLETE};document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:INCOMPLETE']}}));});assert.equal(await page.locator('#pending').innerText(),'86');assert.match(await page.locator('#pendCount').textContent(),/86 \/ 86/);
  await page.evaluate(()=>{window.IBB5_PENDING_NOTES.WAIT1={cancellationApproved:true};document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:WAIT1']}}));});assert.equal(await page.locator('#pending').innerText(),'85');assert.match(await page.locator('#pendCount').textContent(),/85 \/ 85/);
  assert.equal(await pendingCell.innerText(),'85');assert.equal(await page.locator('#perfFoot [data-perf-contracts="pending"]').innerText(),'85');
  assert.equal(await person.locator('[data-perf-contracts="aged"]').innerText(),'85');assert.equal(await page.locator('#aged').innerText(),'85');
  await page.evaluate(()=>{window.IBB5_IMPORTED_DATA.filter(row=>row.id==='WAIT0').forEach(row=>row.created='2026-11-11');document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});assert.equal(await person.locator('[data-perf-contracts="aged"]').innerText(),'84');assert.equal(await page.locator('#perfFoot [data-perf-contracts="aged"]').innerText(),'84');assert.equal(await page.locator('#aged').innerText(),'84');assert.equal(await pendingCell.innerText(),'85');
  assert.deepEqual(errors,[]);console.log('PASS: overview inventory equals follow-up list and drill-down (87), live completion and cancellation update both');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
