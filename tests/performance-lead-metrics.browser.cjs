const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5285,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   const net=(id,staff,date)=>({id,staff,type:'Internet',room:'IBB5',status:'Bình thường',created:'2026-11-01',date});
   window.IBB5_IMPORTED_DATA=[net('A','DNG.Hoantt','2026-11-05'),net('B','DNG.Hoantt','2026-11-06'),net('C','DNG.Namnh170','2026-11-07'),net('D','DNG.Hoantt',''),net('E','DNG.Vypv','2026-11-08'),{...net('P','DNG.Hoantt','2026-10-01'),created:'2026-10-01'}];
   window.IBB5_SHARED_STATE={notes:{},revisions:{},commitments:{'2026-11':{__ALL__:{staff:{'DNG.Hoantt':{status:'approved',value:4},'DNG.Namnh170':{status:'approved',value:1},'DNG.Vypv':{status:'approved',value:2}}}}}};window.IBB5_PENDING_NOTES={};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:"window.IBB5_CURRENT_PROFILE={id:'test',role:'lead',acc:'DNG.HoaNTB6'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';const {scopeCommitmentRow}=await import('/js/dashboardStateModel.js');const raw=window.IBB5_SHARED_STATE.commitments['2026-11'].__ALL__;window.IBB5_SHARED_STATE.commitments['2026-11'].__ALL__=scopeCommitmentRow({key:'commit:2026-11:__ALL__',data:raw},window.IBB5_CURRENT_PROFILE).data;await import('/js/main.js');"}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5285/#performance');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');await page.locator('#to').evaluate(el=>{el.value='2026-11-17';el.dispatchEvent(new Event('change'));});

  for(const [acc,goal,percent]of[['DNG.Vypv','2','50%'],['DNG.Hoantt','4','50%'],['DNG.Namnh170','1','100%']]){const row=page.locator('#perfRows tr').filter({has:page.locator('.person',{hasText:acc})});assert.equal(await row.locator('td').nth(2).textContent(),goal);assert.equal(await row.locator('td').nth(7).textContent(),percent);assert.notEqual(await row.locator('td').nth(8).textContent(),'—');assert.notEqual(await row.locator('td').nth(9).textContent(),'—');assert.notEqual(await row.locator('td').nth(10).textContent(),'—');}
  assert.equal(await page.locator('#perfFoot td').nth(2).textContent(),'7');assert.equal(await page.locator('#perfFoot td').nth(7).textContent(),'57%');
  assert.equal(await page.evaluate(()=>window.IBB5_SHARED_STATE.commitments['2026-11'].__ALL__.staff['DNG.Vypv']),undefined);
  assert.equal(await page.locator('#ckCount').textContent(),'8');assert.equal(await page.locator('#ckRows').textContent().then(text=>text.includes('DNG.Vypv')),false);assert.deepEqual(errors,[]);await page.close();}
  console.log('PASS: lead sees approved goals and all performance ratios across teams, scoped monthly commitment tab remains unchanged, desktop/mobile');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
