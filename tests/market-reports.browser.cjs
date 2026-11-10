const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const {canSeeReport,teamOf}=await import('../js/dailyReportModel.js');
 const {canViewAllMarketReports}=await import('../js/marketReportModel.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5186,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const people=[{id:'p1',acc:'DNG.ManLM3',role:'staff'},{id:'p2',acc:'DNG.BachND7',role:'staff'},{id:'p3',acc:'DNG.HoaNTB6',role:'lead'},{id:'p4',acc:'DNG.Vypv',role:'staff'}].map(p=>({...p,full_name:p.acc,team:teamOf(p),created_at:'2020-01-01T00:00:00Z'}));
 const record=(user_id,report_date,status,sessions,demos,pttb)=>({user_id,report_date,status,revision:1,submitted_at:status==='submitted'?report_date+'T15:06:00Z':null,data:{sessions,demos,pttb,area:'Hòa Xuân',note:'Khó khăn <script>test</script>'}});
 let reports=[record('p1','2026-11-05','submitted',2,5,1),record('p1','2026-11-06','submitted',1,0,1),record('p2','2026-11-06','draft',3,99,99),{...record('p3','2026-11-06','exempt',0,0,0),data:{absenceReason:'Nghỉ'}},record('p4','2026-11-06','submitted',1,1,0)];
 let failNext=false;const pages=[];
 try{
  for(const [role,width] of [['manager',1440],['staff',390],['lead',390],['dat',390]]){
   const me=role==='dat'?{id:'dat',role:'staff',acc:'DNG.DatHX4'}:role==='manager'?{id:'manager',role,full_name:'Trưởng phòng'}:people.find(p=>p.id===(role==='staff'?'p1':'p3'));
   const context=await browser.newContext({viewport:{width,height:1000}}),errors=[];
   await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await context.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(me)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');const {renderMarketReports}=await import('/js/marketReports.js');renderMarketReports(document.getElementById('marketReportsRoot'),window.IBB5_CURRENT_PROFILE);`}));
   await context.route('https://**/*',r=>r.abort());
   await context.route('**/api/market-reports*',async r=>{
    const request=r.request(),allowed=people.filter(p=>canViewAllMarketReports(me)||canSeeReport(me,p));
    if(request.method()==='GET')return r.fulfill({json:{profiles:allowed,reports:reports.filter(x=>allowed.some(p=>p.id===x.user_id)),serverTime:new Date().toISOString()}});
    const body=request.postDataJSON(),id=body.action.includes('exempt')?body.user_id:me.id,old=reports.find(x=>x.user_id===id&&x.report_date===body.date);
    if(failNext||(old?.revision||0)!==body.revision){failNext=false;return r.fulfill({status:409,json:{error:'Báo cáo đã thay đổi trên thiết bị khác. Tải lại trước khi lưu.'}});}
    const report={...old,user_id:id,report_date:body.date,data:body.data||{absenceReason:body.reason},status:body.action==='exempt'?'exempt':body.action==='unexempt'?'draft':body.action==='submit'||old?.status==='submitted'?'submitted':'draft',revision:body.revision+1,submitted_at:old?.submitted_at||(body.action==='submit'?new Date().toISOString():null)};
    reports=reports.filter(x=>x.user_id!==id||x.report_date!==body.date);reports.push(report);return r.fulfill({json:{report}});
   });
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));pages.push(page);
   await page.goto('http://127.0.0.1:5186/#marketReports');await page.locator('#mkRows tr td b').first().waitFor();
   await page.locator('#mkDate').fill('2026-11-06');await page.locator('#mkDate').dispatchEvent('change');await page.waitForResponse(r=>r.url().includes('/api/market-reports?date=2026-11-06'));await page.locator('#mkScope').filter({hasText:'06/11/2026'}).waitFor();
   assert.equal(await page.locator('#mkOwn').isVisible(),role!=='manager');
   assert.equal(await page.locator('#mkRows tr td b').count(),['manager','dat'].includes(role)?4:role==='lead'?3:1);
   if(role==='dat'){
    assert.match(await page.locator('#mkScope').textContent(),/Toàn phòng/);assert.equal(await page.locator('[data-mk-exempt]').count(),0);
    await page.locator('#mkRows tr').filter({hasText:'DNG.Vypv'}).locator('[data-mk-user]').click();assert.match(await page.locator('#mkDetailTitle').textContent(),/DNG.Vypv/);await page.locator('#mkClose').click();
    assert.match(await page.locator('#mkMatrix .mk-total').textContent(),/TỔNG PHÒNG/);
   }
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
   assert.equal(await page.locator('#marketReports').getByText('Số dán',{exact:true}).count(),0);
   if(role==='manager'){
    const row=page.locator('#mkMatrix tr').filter({has:page.locator('th', {hasText:'DNG.ManLM3'})});
    assert.deepEqual((await row.locator('td').allTextContents()).slice(0,5),['3','5','2','167%','67%']);assert.equal(await row.locator('.mk-zero').count(),1);
    await page.locator('#mkFilter').selectOption('overdue');assert.equal(await page.locator('#mkRows tr td b').count(),3);
    await page.locator('#mkFilter').selectOption('pending');assert.deepEqual(await page.locator('#mkRows tr td b').allTextContents(),['DNG.BachND7']);
    await page.locator('#mkFilter').selectOption('all');
    await page.locator('#mkView').selectOption('month');assert.equal(await page.locator('#mkHead tr').first().locator('th').count(),32);
    await row.locator('[data-mk-day="2026-11-05"]').first().click();assert.match(await page.locator('#mkDetailBody').textContent(),/Khó khăn <script>test<\/script>/);assert.equal(await page.locator('#mkDetail script').count(),0);await page.locator('#mkClose').click();
    const monthDownload=page.waitForEvent('download');await page.locator('#mkShot').click();const monthPng=fs.readFileSync(await (await monthDownload).path());assert.equal(monthPng.subarray(1,4).toString(),'PNG');
    await page.locator('#mkView').selectOption('day');
    const csvDownload=page.waitForEvent('download');await page.locator('#mkExport').click();const csv=fs.readFileSync(await (await csvDownload).path(),'utf8');assert.match(csv,/DNG.ManLM3/);assert.doesNotMatch(csv,/Số dán|Phướn/);
    const pngDownload=page.waitForEvent('download');await page.locator('#mkShot').click();const png=fs.readFileSync(await (await pngDownload).path());assert.equal(png.subarray(1,4).toString(),'PNG');
    if(process.env.MARKET_SCREENSHOT_DIR)fs.writeFileSync(process.env.MARKET_SCREENSHOT_DIR+'/market-table.png',png);
   }
   if(role==='staff'){
    const field=n=>page.locator('#mkForm [name="'+n+'"]');
    await page.locator('#mkMatrix [data-mk-day="2026-11-06"]').first().click();assert.match(await page.locator('#mkDetailTitle').textContent(),/DNG.ManLM3/);await page.locator('#mkClose').click();
    await field('sessions').fill('2');await field('demos').fill('3');await field('pttb').fill('1');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await page.waitForTimeout(500);assert.equal(await field('demos').inputValue(),'3');
    failNext=true;await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'thiết bị khác'}).waitFor();assert.equal(await field('demos').inputValue(),'3');
    await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();
    assert.equal(reports.find(r=>r.user_id==='p1'&&r.report_date==='2026-11-06').data.sessions,2);
    const managerPage=pages[0];await managerPage.evaluate(()=>window.dispatchEvent(new Event('focus')));await managerPage.locator('#mkRows tr').filter({hasText:'DNG.ManLM3'}).locator('td').nth(3).filter({hasText:'3'}).waitFor();
    await page.locator('#mkDate').fill('2026-11-07');await page.locator('#mkDate').dispatchEvent('change');await page.locator('#mkScope').filter({hasText:'07/11/2026'}).waitFor();
    await field('sessions').fill('2');await field('demos').fill('1');await field('pttb').fill('0');await page.locator('#mkDraft').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu nháp'}).waitFor();assert.equal(reports.find(r=>r.user_id==='p1'&&r.report_date==='2026-11-07').status,'draft');
    await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();assert.equal(reports.find(r=>r.user_id==='p1'&&r.report_date==='2026-11-07').status,'submitted');
   }
   if(role==='lead'){
    assert.equal(await page.locator('#mkFields').evaluate(el=>el.disabled),true);
    assert.equal(await page.locator('#mkRows').getByText('DNG.Vypv',{exact:true}).count(),0);
    page.once('dialog',d=>d.accept('Nghỉ phép'));await page.locator('#mkRows tr').filter({hasText:'DNG.BachND7'}).locator('[data-mk-exempt]').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();assert.equal(reports.find(r=>r.user_id==='p2').status,'exempt');
   }
   if(process.env.MARKET_SCREENSHOT_DIR)await page.screenshot({path:process.env.MARKET_SCREENSHOT_DIR+'/market-'+role+'.png',fullPage:true});
   assert.deepEqual(errors,[]);
  }
  console.log('PASS: market manager/lead/staff scope, submissions/drafts, ratios, late filters, own history, conflicts, live refresh, CSV/PNG and mobile layout');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
