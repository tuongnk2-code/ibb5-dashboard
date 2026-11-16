const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5233,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const data=[{id:'N1',type:'Internet',staff:'DNG.ManLM3',created:'2026-11-09',date:'2026-11-10',customer:'Khách <script>test</script>'},{id:'N2',type:'Internet',staff:'DNG.Vypv',created:'2026-11-09',date:'2026-11-10'},{id:'P1',type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:''},{id:'PREV',type:'Internet',staff:'DNG.ManLM3',created:'2026-11-02',date:'2026-11-03'},{id:'TV1',type:'Truyền hình',staff:'DNG.ManLM3',created:'2026-11-09',date:'2026-11-10',vvip:true}];
  for(const role of ['manager','lead','staff']){
   const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(data=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES={P1:{expected:'2026-11-08'}};window.IBB5_SHARED_STATE={commitments:{},notes:window.IBB5_PENDING_NOTES,revisions:{}};},data);
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await page.route('https://**/*',r=>r.abort());
   await page.goto('http://127.0.0.1:5233/#weeklyReports');const root=page.locator('#weeklyReports');await root.locator('[data-week-date]').waitFor();
   const today=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));assert.equal(await root.locator('[data-week-date]').inputValue(),today);
   await root.locator('[data-week-date]').fill('2026-11-10');await root.locator('[data-week-date]').dispatchEvent('change');
   assert.match(await root.locator('[data-week-range]').innerText(),/09\/11\/2026.*15\/11\/2026/);
   const count=role==='manager'?2:1;assert.equal(await root.locator('.wr-summary [data-week-kind="online"]').textContent(),String(count));
   if(role!=='manager')assert.doesNotMatch(await root.locator('[data-week-rows]').innerText(),/DNG.Vypv/);
   for(const kind of ['online','sold','vvip','pending','aged','overdue','missing']){
    const button=root.locator('[data-week-kind="'+kind+'"]').first(),expected=Number(await button.textContent());await button.click();
    const dialog=page.locator('#weeklyContractDialog');assert.equal(await dialog.locator('[data-aged-id]').count(),expected);assert.deepEqual(await dialog.locator('thead th').allTextContents(),['Mã HĐ','Acc','Khách hàng','Ngày tạo','Ngày Online thực tế']);assert.equal(await dialog.locator('script').count(),0);await dialog.locator('[data-aged-close]').click();
   }
   await root.locator('[data-week-team]').selectOption('1');assert.equal(await root.locator('.wr-summary [data-week-kind="online"]').textContent(),role==='manager'?'1':'0');
   await root.locator('[data-week-team]').selectOption('');
   const downloadPromise=page.waitForEvent('download');await root.locator('[data-week-export]').click();assert.equal((await downloadPromise).suggestedFilename(),'bao_cao_tuan_2026-11-09.csv');
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.P1={expected:'2026-11-08',result:'Hủy'};document.dispatchEvent(new CustomEvent('ibb5-shared-updated'));});
   await page.waitForFunction(()=>document.querySelector('#weeklyReports [data-week-alerts] [data-week-kind="aged"]').textContent==='0');
   await page.evaluate(()=>{const data=window.IBB5_IMPORTED_DATA;window.IBB5_SHARED_STATE.snapshot={data:[...data,{id:'N3',type:'Internet',staff:'DNG.ManLM3',created:'2026-11-11',date:'2026-11-11'}],cancelledNet:[]};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));});
   await page.waitForFunction(expected=>document.querySelector('#weeklyReports .wr-summary [data-week-kind="online"]').textContent===String(expected),count+1);
   for(const width of [360,390,768,1440]){await page.setViewportSize({width,height:1000});await page.waitForTimeout(80);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'No horizontal page overflow at '+width);}
   if(role==='manager'&&process.env.WEEKLY_SCREENSHOT_DIR){await page.setViewportSize({width:1440,height:1100});await root.screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-desktop.png'});await page.setViewportSize({width:390,height:950});await root.screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-mobile.png'});}
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: weekly tab, role scope, same-template drilldowns, team filter, CSV, live snapshot/notes and desktop/mobile layouts');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
