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
   let reportFailure=false;
   await page.route('**/api/daily-reports?*',r=>{
    if(reportFailure)return r.fulfill({status:503,json:{error:'Thử lỗi kết nối'}});
    const profiles=[{id:'a',acc:'DNG.ManLM3',role:'staff',team:3,created_at:'2026-11-01T00:00:00Z'},...(role==='manager'?[{id:'b',acc:'DNG.Vypv',role:'lead',team:1,created_at:'2026-11-01T00:00:00Z'}]:[])];
    const payload=(actual,commitment,leads,closed)=>({actual,commitment,online:2,monthlyOnline:999,sources:[{name:'Zalo',leads,closed}],difficulty:'<img src=x onerror=alert(1)>',support:'Hỗ trợ khách'});
    const reports=[{user_id:'a',report_date:'2026-11-04',status:'submitted',submitted_at:'2026-11-04T14:00:00Z',data:payload(4,1,5,2)},{user_id:'a',report_date:'2026-11-10',status:'submitted',submitted_at:'2026-11-10T15:10:00Z',data:payload(6,3,10,4)},{user_id:'a',report_date:'2026-11-11',status:'draft',data:payload(999,999,999,999)},...(role==='manager'?[{user_id:'b',report_date:'2026-11-10',status:'submitted',submitted_at:'2026-11-10T14:00:00Z',data:payload(2,1,3,1)}]:[])];
    return r.fulfill({json:{profiles,reports,trackingStart:'2026-11-04',serverTime:new Date().toISOString()}});
   });
   await page.route('https://**/*',r=>r.abort());
   await page.goto('http://127.0.0.1:5233/#overview');await page.locator('.sidebar a[href="#weeklyReports"]').click();const root=page.locator('#weeklyReports');await root.locator('[data-week-date]').waitFor();await root.locator('[data-rollup-content]').waitFor({state:'visible',timeout:5000});
   const today=await page.evaluate(()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
   assert.equal(await root.locator('[data-week-date]').inputValue(),'2026-11-10');
   assert.match(await root.locator('.wr-data-notice').innerText(),/10\/11\/2026/);
   await root.locator('[data-week-today]').click();assert.equal(await root.locator('[data-week-date]').inputValue(),today);
   if(today>='2026-11-16'){assert.equal(await root.locator('.wr-summary [data-week-kind="online"]').textContent(),'0');await root.locator('[data-week-latest]').click();assert.equal(await root.locator('[data-week-date]').inputValue(),'2026-11-10');}
   await root.locator('[data-week-date]').fill('2026-11-10');await root.locator('[data-week-date]').dispatchEvent('change');
   assert.match(await root.locator('[data-week-range]').innerText(),/09\/11\/2026.*15\/11\/2026/);
   await root.locator('[data-rollup-content]').waitFor({state:'visible'});
   assert.match(await root.locator('[data-rollup-cards]').innerText(),role==='manager'?/8 \/ 4 PTTB/:/6 \/ 3 PTTB/);
   assert.match(await root.locator('[data-rollup-cards]').innerText(),role==='manager'?/12 \/ 5 PTTB/:/10 \/ 4 PTTB/);
   await root.locator('[data-rollup-mode="month"]').click();const reportRow=root.locator('[data-rollup-rows] tr').filter({hasText:'DNG.ManLM3'});assert.match(await reportRow.locator('td').nth(1).textContent(),/^10 \/ 4/);assert.match(await reportRow.locator('.wr-assessment').textContent(),/Đạt cam kết 250%.*Dữ liệu chưa đủ/);
   await reportRow.locator('[data-rollup-person]').click();assert.equal(await page.locator('.wr-report-dialog img').count(),0);assert.match(await page.locator('.wr-report-dialog pre').first().textContent(),/PTTB trong ngày: 4\/1/);await page.locator('[data-rollup-close]').click();
   const reportDownload=page.waitForEvent('download');await root.locator('[data-rollup-export]').click();assert.equal((await reportDownload).suggestedFilename(),'danh_gia_month_2026-11-01.csv');
   reportFailure=true;await root.locator('[data-rollup-reload]').click();await page.waitForFunction(()=>document.querySelector('[data-rollup-status]').textContent.includes('Thử lỗi kết nối'));assert.match(await reportRow.locator('td').nth(1).textContent(),/^10 \/ 4/);reportFailure=false;await root.locator('[data-rollup-reload]').click();
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
   if(role==='manager'&&process.env.WEEKLY_SCREENSHOT_DIR){await page.setViewportSize({width:1440,height:1100});await root.screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-desktop.png'});await root.locator('.wr-rollup').screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-rollup-desktop.png'});await page.setViewportSize({width:390,height:950});await root.screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-mobile.png'});await root.locator('.wr-rollup').screenshot({path:process.env.WEEKLY_SCREENSHOT_DIR+'/weekly-rollup-mobile.png'});}
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: weekly tab, role scope, same-template drilldowns, team filter, CSV, live snapshot/notes and desktop/mobile layouts');
 }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
