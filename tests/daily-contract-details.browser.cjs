const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const port=Number(process.env.DAILY_DETAILS_PORT||5183);
 const server=await createServer({server:{host:'127.0.0.1',port,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const contract=(id,staff,created,date)=>({id,type:'Internet',staff,created,date,room:'IBB5',customer:'Khách <'+id+'>',package:'Giga'});
  const data=[contract('A','DNG.Hoantt','2026-11-06','2026-11-07'),contract('B','DNG.Nhannt137','2026-11-06','2026-11-06'),contract('C','DNG.Namnh170','2026-11-01','2026-11-06'),contract('D','DNG.ManLM3','2026-11-06','2026-11-06'),contract('E','DNG.Hoantt','2026-11-02','2026-11-06')];data.push({...data[1]});
  for(const role of ['manager','lead','staff']){
   const context=await browser.newContext({viewport:{width:role==='manager'?1440:390,height:950}}),errors=[];
   await context.addInitScript(data=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_SHARED_STATE={commitments:{},notes:{},revisions:{}};},data);
   await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await context.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'details-${role}',role:'${role}',acc:'DNG.Hoantt'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await context.route('https://**/*',r=>r.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:'+port+'/#performance');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   await page.locator('#dpMonth').fill('2026-11');await page.locator('#dpMonth').dispatchEvent('change');await page.locator('#dpDay').fill('2026-11-06');await page.locator('#dpDay').dispatchEvent('change');await page.locator('#dpTeam').selectOption('2');await page.locator('#dpView').selectOption('day');
   const ids=async kind=>await page.locator('.dp-contract-'+kind+' [data-contract-id]').evaluateAll(rows=>rows.map(row=>row.dataset.contractId).sort());
   assert.deepEqual(await page.locator('#dpKpis strong').allTextContents(),['2 HĐ','3 HĐ','2 NV','3 NV']);
   assert.deepEqual(await ids('sold'),role==='staff'?['A']:['A','B']);assert.deepEqual(await ids('online'),role==='staff'?['E']:['B','C','E']);
   assert.match(await page.locator('.dp-contract-sold').textContent(),/Khách <A>/);assert.equal(await page.locator('.dp-contract-details img').count(),0);
   if(role==='staff')assert.match(await page.locator('.dp-contract-sold').textContent(),/1\/2 HĐ theo quyền/);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   if(process.env.DAILY_DETAILS_SCREENSHOT_DIR)await page.locator('#ibbDayPerf').screenshot({path:process.env.DAILY_DETAILS_SCREENSHOT_DIR+'/daily-contracts-'+role+'.png'});
   if(role==='manager'){
    await page.locator('#dpTeam').selectOption('');
    const shot=page.waitForEvent('download');await page.locator('#dpShot').click();const imageFile=await shot;
    assert.match(imageFile.suggestedFilename(),/IBB5_Ban_Online_2026-11-06\.png$/);
    const png=fs.readFileSync(await imageFile.path());assert.equal(png.subarray(1,4).toString(),'PNG');assert.ok(png.readUInt32BE(20)>1000,'PNG includes all staff rows');
    if(process.env.DAILY_DETAILS_SCREENSHOT_DIR)fs.writeFileSync(process.env.DAILY_DETAILS_SCREENSHOT_DIR+'/daily-table-export.png',png);
    const perfDownload=page.waitForEvent('download');await page.locator('#perfShot').click();const perfImage=await perfDownload;
    assert.match(perfImage.suggestedFilename(),/IBB5_Hieu_Suat_Nhan_Su_.*\.png$/);
    const perfPng=fs.readFileSync(await perfImage.path());assert.equal(perfPng.subarray(1,4).toString(),'PNG');assert.ok(perfPng.readUInt32BE(16)>2000);assert.ok(perfPng.readUInt32BE(20)>1000);
    if(process.env.DAILY_DETAILS_SCREENSHOT_DIR)fs.writeFileSync(process.env.DAILY_DETAILS_SCREENSHOT_DIR+'/performance-table-export.png',perfPng);
    await page.evaluate(()=>location.hash='overview');await page.locator('#ibbCaptureOverview').waitFor({state:'visible'});
    const overviewDownload=page.waitForEvent('download');await page.locator('[data-shot="ibbCaptureOverview"]').click();const overviewImage=await overviewDownload;
    const overviewPng=fs.readFileSync(await overviewImage.path());assert.equal(overviewPng.subarray(1,4).toString(),'PNG');assert.ok(overviewPng.readUInt32BE(20)>1000);
    if(process.env.DAILY_DETAILS_SCREENSHOT_DIR)fs.writeFileSync(process.env.DAILY_DETAILS_SCREENSHOT_DIR+'/overview-export.png',overviewPng);
    await page.evaluate(()=>{window.IBB5_PENDING_NOTES={A:{expected:'2026-11-06',timeSlot:'15h30 - 17h30'}};location.hash='pendingContracts';});
    await page.locator('#psShot').waitFor({state:'visible'});await page.locator('#psDay').fill('2026-11-06');await page.locator('#psDay').dispatchEvent('change');
    assert.match(await page.locator('#psRows').textContent(),/DNG.Hoantt/);
    const scheduleDownload=page.waitForEvent('download');await page.locator('#psShot').click();const scheduleImage=await scheduleDownload;
    assert.match(scheduleImage.suggestedFilename(),/IBB5_HD_Online_Du_Kien_2026-11-06\.png$/);
    const schedulePng=fs.readFileSync(await scheduleImage.path());assert.equal(schedulePng.subarray(1,4).toString(),'PNG');
    if(process.env.DAILY_DETAILS_SCREENSHOT_DIR)fs.writeFileSync(process.env.DAILY_DETAILS_SCREENSHOT_DIR+'/scheduled-online-export.png',schedulePng);
    await page.evaluate(()=>location.hash='performance');await page.locator('#dpShot').waitFor({state:'visible'});
    await page.locator('#dpTeam').selectOption('2');
   }
   const download=page.waitForEvent('download');await page.locator('#dpExport').click();const csv=fs.readFileSync(await (await download).path(),'utf8');assert.match(csv,/Mã HĐ đã lên/);assert.match(csv,/"A"/);assert.match(csv,/"E"/);if(role==='staff')assert.doesNotMatch(csv,/"B"|"C"/);
   await page.locator('#dpSearch').fill('Hoantt');assert.deepEqual(await ids('sold'),['A']);assert.deepEqual(await ids('online'),['E']);await page.locator('#dpSearch').fill('');
   await page.locator('#dpDay').fill('2026-11-07');await page.locator('#dpDay').dispatchEvent('change');assert.deepEqual(await ids('sold'),[]);assert.deepEqual(await ids('online'),['A']);
   await page.locator('#dpView').selectOption('month');assert.equal(await page.locator('#dpContractDetails').isVisible(),false);
   await page.locator('#dpView').selectOption('day');await page.locator('#dpDay').fill('2026-11-06');await page.locator('#dpDay').dispatchEvent('change');
   await page.evaluate(()=>{window.IBB5_SHARED_STATE.snapshot={data:[...window.IBB5_IMPORTED_DATA,{id:'LIVE',type:'Internet',staff:'DNG.Hoantt',created:'2026-11-06',date:'',room:'IBB5'}]};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});
   assert.deepEqual(await ids('sold'),role==='staff'?['A','LIVE']:['A','B','LIVE']);assert.equal(await page.locator('#dpKpis strong').first().textContent(),'3 HĐ');
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: daily sold/online contract details, deduplication, filters, role visibility, CSV, responsive layout and live source refresh');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
