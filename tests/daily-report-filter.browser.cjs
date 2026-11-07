const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5185,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const profiles=['late','ontime','draft','missing','exempt'].map(id=>({id,role:'staff',acc:id}));
  const data={actual:1,commitment:1,tomorrowPttb:1,tomorrowOnline:1,sources:[],support:''};
  const reports=[{user_id:'late',status:'submitted',submitted_at:'2026-11-06T15:06:00Z',data},{user_id:'ontime',status:'submitted',submitted_at:'2026-11-06T14:53:00Z',data},{user_id:'draft',status:'draft',data},{user_id:'exempt',status:'exempt',data:{absenceReason:'Nghỉ'}}];
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
  await page.route('**/api/daily-reports*',r=>r.fulfill({json:{profiles,reports,metrics:{},serverTime:'2026-11-06T15:30:00Z'}}));
  await page.route('**/filter-check',r=>r.fulfill({contentType:'text/html',body:'<section class="panel page-active"><div id="root"></div></section><script type="module">import {renderDailyReports} from "/js/dailyReports.js";renderDailyReports(document.getElementById("root"),{id:"manager",role:"manager"},()=>null);</script>'}));
  await page.goto('http://127.0.0.1:5185/filter-check');await page.locator('#drDate').fill('2026-11-06');await page.locator('#drDate').dispatchEvent('change');
  await page.locator('#drRows .dr-row-late').waitFor();
  const shown=()=>page.locator('#drRows tr td:first-child b').allTextContents();
  assert.equal((await shown()).length,5);
  await page.locator('#drFilter').selectOption('overdue');assert.deepEqual(await shown(),['late','draft','missing']);
  assert.match(await page.locator('#drRows').textContent(),/Đã gửi muộn/);assert.match(await page.locator('#drRows').textContent(),/Quá hạn chưa gửi/);
  await page.locator('#drFilter').selectOption('pending');assert.deepEqual(await shown(),['draft','missing']);
  await page.locator('#drFilter').selectOption('sent');assert.deepEqual(await shown(),['late','ontime']);
  await page.locator('[data-dr-filter="pending"]').click();assert.deepEqual(await shown(),['draft','missing']);
  await page.locator('#drFilter').selectOption('exempt');assert.deepEqual(await shown(),['exempt']);
  assert.deepEqual(errors,[]);console.log('PASS: overdue filter includes late submissions and missing/drafts, excludes on-time and exempt; pending KPI remains consistent');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
