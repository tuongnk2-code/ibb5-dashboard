const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const {STAFF_ROSTER}=await import('../js/staffRoster.js');
 const {canSeeReport,reportDay}=await import('../js/dailyReportModel.js');
 const {salaryCounts,salaryPeriod,calculateSalary}=await import('../js/salaryModel.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5189,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const settings=new Map(),contexts=[],pages=[];let failNext=false;
 const data=[...Array.from({length:46},(_,i)=>({type:'Internet',id:'N'+i,staff:'DNG.HoaNTB6',date:i<44?'2026-10-25':'2026-11-04'})),...Array.from({length:6},(_,i)=>({type:'Truyền hình',id:'T'+i,staff:'DNG.HoaNTB6',date:'2026-10-25',vvip:true})),{type:'Internet',id:'EXCLUDE',staff:'DNG.HoaNTB6',date:'2026-11-05'}];
 try{
  for(const role of ['manager','staff','lead']){
   const me={id:role,role,acc:role==='manager'?null:'DNG.HoaNTB6'};
   const context=await browser.newContext({viewport:{width:role==='manager'?1440:390,height:1000}});contexts.push(context);
   await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await context.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(me)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');const {renderSalary}=await import('/js/salary.js');renderSalary(document.getElementById('salaryRoot'),window.IBB5_CURRENT_PROFILE);`}));
   await context.route('https://**/*',r=>r.abort());
   await context.route('**/api/salary*',r=>{
    const request=r.request(),month=new URL(request.url()).searchParams.get('month');
    if(request.method()==='GET'){
     const roster=STAFF_ROSTER.filter(p=>canSeeReport(me,{id:p.acc===me.acc?me.id:null,acc:p.acc,role:'staff'})),period=salaryPeriod(month);
     const rows=salaryCounts(data,{month,asOf:period.asOf,roster}).map(p=>({...p,probation:settings.get(month+':'+p.acc)?.probation||false,revision:settings.get(month+':'+p.acc)?.revision||0}));
     return r.fulfill({json:{rows,month,...period,sourceUpdated:'2026-11-07T02:00:00Z',serverTime:new Date().toISOString()}});
    }
    const body=request.postDataJSON(),key=body.month+':'+body.acc,old=settings.get(key);
    if(me.role!=='manager')return r.fulfill({status:403,json:{error:'Chỉ Trưởng phòng được đánh dấu thử việc.'}});
    if(failNext||(old?.revision||0)!==body.revision){failNext=false;return r.fulfill({status:409,json:{error:'Trạng thái thử việc đã thay đổi trên thiết bị khác. Tải lại trước khi lưu.'}});}
    const setting={...body,revision:body.revision+1};settings.set(key,setting);return r.fulfill({json:{setting}});
   });
   const page=await context.newPage(),errors=[];pages.push(page);page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5189/#lcb');await page.locator('#salRows tr[data-salary-acc]').first().waitFor();
   await page.locator('#salMonth').fill('2026-10');await page.locator('#salMonth').dispatchEvent('change');await page.locator('#salScope').filter({hasText:'01/10/2026–04/11/2026'}).waitFor();
   assert.equal(await page.locator('#salRows tr[data-salary-acc]').count(),role==='manager'?17:role==='staff'?1:8);
   const hoa=page.locator('[data-salary-acc="DNG.HoaNTB6"]');
   assert.deepEqual((await hoa.locator('td').allTextContents()).slice(1,4),role==='lead'?['52','6','51,8']:['46','6','47']);assert.equal(await hoa.locator('.sal-amount').textContent(),role==='lead'?'8.600.000':'7.800.000');
   assert.equal(await page.locator('[data-sal-probation]').count(),role==='manager'?17:0);
   if(role==='manager'){
    failNext=true;await hoa.locator('[type="checkbox"]').evaluate(el=>el.click());await page.locator('#salMessage').filter({hasText:'thiết bị khác'}).waitFor();assert.equal(await hoa.locator('[type="checkbox"]').isChecked(),false);
    await hoa.locator('[type="checkbox"]').evaluate(el=>el.click());await page.locator('#salMessage').filter({hasText:'Đã cập nhật thử việc'}).waitFor();assert.equal(await hoa.locator('.sal-amount').textContent(),'4.500.000');
    await page.locator('#salMonth').fill(reportDay().slice(0,7));await page.locator('#salMonth').dispatchEvent('change');await page.locator('#salScope').filter({hasText:'Tạm tính'}).waitFor();assert.equal(await hoa.locator('[type="checkbox"]').isChecked(),false);
    await page.locator('#salMonth').fill('2026-10');await page.locator('#salMonth').dispatchEvent('change');await page.locator('#salScope').filter({hasText:'04/11/2026'}).waitFor();assert.equal(await hoa.locator('.sal-amount').textContent(),'4.500.000');
    await hoa.locator('[type="checkbox"]').evaluate(el=>el.click());await hoa.locator('.sal-amount').filter({hasText:'7.800.000'}).waitFor();assert.equal(await hoa.locator('.sal-amount').textContent(),'7.800.000');
    await page.locator('#salTeam').selectOption('3');assert.equal(await page.locator('#salRows tr[data-salary-acc]').count(),8);
    await page.locator('#salSearch').fill('hoantb6');assert.equal(await page.locator('#salRows tr[data-salary-acc]').count(),1);assert.match(await page.locator('#salSummary').textContent(),/7\.800\.000/);
    const download=page.waitForEvent('download');await page.locator('#salExport').click();const csv=fs.readFileSync(await (await download).path(),'utf8');assert.match(csv,/"47","47","46–50 INT","7800000"/);assert.doesNotMatch(csv,/DNG.Vypv/);
    await page.locator('#salSearch').fill('');await page.locator('#salTeam').selectOption('');
   }
   if(role==='staff'){
    for(let i=0;i<6;i++)data.push({type:'Internet',id:'LIVE'+i,staff:'DNG.HoaNTB6',date:'2026-10-30'});
    for(const p of [pages[0],page])await p.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await hoa.locator('.sal-amount').filter({hasText:'8.600.000'}).waitFor();await pages[0].locator('[data-salary-acc="DNG.HoaNTB6"] .sal-amount').filter({hasText:'8.600.000'}).waitFor();
   }
   if(role==='lead')assert.equal(await hoa.locator('.sal-amount').textContent(),'8.600.000');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   if(process.env.SALARY_SCREENSHOT_DIR)await page.screenshot({path:process.env.SALARY_SCREENSHOT_DIR+'/lcb-'+role+'.png',fullPage:true});
   assert.deepEqual(errors,[]);
  }
  console.log('PASS: LCB example, next-month cutoff, manager-only monthly probation, revision conflicts, scoped staff/lead views, CSV, live data and mobile layout');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
