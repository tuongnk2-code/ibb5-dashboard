const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5219,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const data=Array.from({length:28},(_,i)=>({id:'OLD'+i,type:'Internet',created:'2026-10-30',date:'',room:'IBB5',staff:i%2?'DNG.Vypv':'DNG.ManLM3',customer:'Khách <script>test</script>'}));
  data.push({...data[0]},{...data[0],id:'SEVENDAYS',created:'2026-11-03'},{...data[0],id:'ONLINE',date:'2026-11-09'},{...data[0],id:'FUTURE',created:'2026-11-11'});
  data.push({...data[0],id:'PREVIOUS',created:'2026-10-01',date:'2026-10-05'});
  for(const role of ['manager','staff']){
   const page=await browser.newPage({viewport:{width:role==='manager'?1440:390,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(data=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES={OLD0:{action:'Not hạ tầng',result:'Chưa Online',expected:'2026-11-12'}};window.IBB5_SHARED_STATE={commitments:{},notes:window.IBB5_PENDING_NOTES,revisions:{}};},data);
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await page.route('https://**/*',r=>r.abort());
   await page.goto('http://127.0.0.1:5219/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   await page.locator('#to').fill('2026-11-10');await page.locator('#to').dispatchEvent('change');assert.equal(await page.locator('#aged').textContent(),'28');
   await page.locator('#aged').click();const dialog=page.locator('#agedContractDialog');assert.equal(await dialog.isVisible(),true);
   assert.equal(await dialog.locator('[data-aged-id]').count(),role==='manager'?28:14);assert.match(await dialog.textContent(),/Not hạ tầng/);assert.equal(await dialog.locator('script').count(),0);
   assert.equal(await dialog.locator('[data-aged-id="OLD0"] td').nth(4).textContent(),'11');
   assert.equal(await dialog.locator('[data-aged-id="SEVENDAYS"],[data-aged-id="ONLINE"],[data-aged-id="FUTURE"]').count(),0);
   await dialog.locator('.tablewrap').evaluate(el=>{el.style.width='800px';el.style.maxWidth='100%';});await page.waitForTimeout(100);
   const headerTop=await dialog.locator('thead th').first().evaluate(el=>el.getBoundingClientRect().top);
   const frozen=dialog.locator('tbody tr').first().locator('.aged-pinned');assert.equal(await frozen.count(),3);
   const positions=await frozen.evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));
   const before=await dialog.locator('tbody tr').first().locator('td').nth(3).evaluate(el=>el.getBoundingClientRect().left);
   await dialog.locator('.tablewrap').evaluate(el=>{el.scrollLeft=400;el.scrollTop=200;});await page.waitForTimeout(100);
   const after=await frozen.evaluateAll(cells=>cells.map(cell=>cell.getBoundingClientRect().left));assert.ok(after.every((left,i)=>Math.abs(left-positions[i])<2));
   assert.ok(Math.abs(await dialog.locator('thead th').first().evaluate(el=>el.getBoundingClientRect().top)-headerTop)<2);
   assert.ok(await dialog.locator('tbody tr').first().locator('td').nth(3).evaluate((el,left)=>el.getBoundingClientRect().left<left-10,before));
   await dialog.locator('.tablewrap').evaluate(el=>{el.scrollLeft=0;el.scrollTop=0;});
   if(role==='staff')assert.match(await dialog.textContent(),/14\/28 HĐ theo quyền/);
   await page.evaluate(()=>{const to=document.getElementById('to');to.value='2026-11-06';to.dispatchEvent(new Event('change'));});assert.equal(await dialog.locator('[data-aged-id]').count(),0);
   await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
   await page.locator('#to').fill('2026-11-10');await page.locator('#to').dispatchEvent('change');await page.locator('#aged').focus();await page.keyboard.press('Enter');assert.equal(await dialog.isVisible(),true);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));await dialog.locator('[data-aged-close]').click();
   await page.evaluate(()=>location.hash='performance');await page.locator('#performance.page-active').waitFor();
   const person=page.locator('#perfRows tr').filter({has:page.locator('.person',{hasText:'DNG.ManLM3'})}),detail=page.locator('#performanceContractDialog');
   for(const [kind,count] of [['sold',1],['online',1],['previous',1],['pending',15],['aged',14]]){
    const cell=person.locator('[data-perf-contracts="'+kind+'"]');assert.equal(Number(await cell.textContent()),count);await cell.click();
    assert.equal(await detail.locator('[data-aged-id]').count(),count);assert.equal(await detail.locator('thead th').count(),9);
    assert.equal(await detail.locator('[data-aged-id]').first().locator('.aged-pinned').count(),3);await detail.locator('[data-aged-close]').click();
   }
   if(role==='manager'){
    for(const kind of ['sold','online','previous','pending','aged']){
     const cell=page.locator('#perfFoot [data-perf-contracts="'+kind+'"]'),expected=Number(await cell.textContent());await cell.click();assert.equal(await detail.locator('[data-aged-id]').count(),expected);await detail.locator('[data-aged-close]').click();
    }
    const team=page.locator('#perfRows .perf-team-total').filter({hasText:'TỔNG BẦY 3'});await team.locator('[data-perf-contracts="aged"]').click();assert.equal(await detail.locator('[data-aged-id]').count(),14);await detail.locator('[data-aged-close]').click();
    await page.locator('#perfExpand').click();await person.locator('[data-perf-contracts="sold"]').click();await page.keyboard.press('Escape');assert.equal(await detail.isVisible(),false);assert.ok(await page.locator('#performance').evaluate(el=>el.classList.contains('perf-expanded')));await page.locator('#perfExpand').click();
   }
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: 28-contract KPI drilldown, deduplication, exact age/Online cutoff, saved notes, permissions, live date, keyboard and mobile');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
