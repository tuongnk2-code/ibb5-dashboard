const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5179,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const definitions=[['DUE','2026-11-05','', '2026-11-06'],['LATE','2026-11-01','','2026-11-05'],['WAIT','2026-11-01','','2026-11-07'],['MISSING','2026-11-01','',''],['OLD','2026-10-01','','2026-11-06'],['ONLINE','2026-11-01','2026-11-06','2026-11-05'],['DONE','2026-11-01','2026-11-06','2026-11-05'],['FUTURE','2026-11-07','','2026-11-06'],['CANCEL','2026-11-01','','2026-11-06'],['OUTSIDE','2026-11-01','','2026-11-06']];
  const data=definitions.map(([id,created,date])=>({id,created,date,type:'Internet',staff:id==='OUTSIDE'?'DNG.Vypv':'DNG.ManLM3',room:'IBB5',customer:'Khách '+id,package:'Giga'}));
  data.push(...['SEPTCANCEL','OCTCANCEL'].map((id,index)=>({id,type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created:index?'2026-10-01':'2026-09-01',date:index?'':'2026-11-06',status:'Đã chấm dứt hợp đồng'})));
  // Payroll-only August imports must not alter any of the existing report assertions.
  data.push(...['AUGONLINE','AUGPENDING','AUGHIDDEN','AUGCANCEL'].map(id=>({id,type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created:'2026-08-20',date:id==='AUGONLINE'?'2026-11-06':'',status:id==='AUGCANCEL'?'Đã chấm dứt hợp đồng':''})));
  const notes=Object.fromEntries(definitions.map(([id,,,expected])=>[id,{expected}]));
  Object.assign(notes.DONE,{timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web'});notes.CANCEL.cancellationApproved=true;
  notes.AUGHIDDEN={cancellationApproved:true};
  for(const role of ['manager','staff']){
   const context=await browser.newContext({viewport:{width:role==='manager'?1440:390,height:900}}),errors=[];
   await context.addInitScript(({data,notes})=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES=notes;window.IBB5_SHARED_STATE={commitments:{},notes,revisions:{}};},{data,notes});
   await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await context.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'filter-${role}',role:'${role}',acc:'DNG.ManLM3',team:3};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await context.route('https://**/*',r=>r.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5179/#pendingContracts');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   assert.equal(await page.locator('#pendCreatedMonth option[value="2026-08"]').count(),0);
   await page.locator('#pendAsOf').fill('2026-11-06');await page.locator('#pendAsOf').dispatchEvent('change');
   await page.locator('#pendDailyDate').fill('2026-11-06');await page.locator('#pendDailyDate').dispatchEvent('change');
   const initialAppointments=Number(await page.locator('#pendDue').textContent());
   assert.equal(Number(await page.locator('#psRows .ps-total td').nth(1).textContent()),initialAppointments);
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.DUE.result='Hủy';window.IBB5_PENDING_NOTES.OLD.result='Dự Kiến Hủy';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:DUE','pending:OLD']}}));});
   await page.waitForFunction(expected=>Number(document.getElementById('pendDue').textContent)===expected&&Number(document.querySelector('#psRows .ps-total td:nth-child(2)').textContent)===expected,initialAppointments-2);
   await page.evaluate(()=>{delete window.IBB5_PENDING_NOTES.DUE.result;delete window.IBB5_PENDING_NOTES.OLD.result;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:DUE','pending:OLD']}}));});
   await page.evaluate(()=>{location.hash='overview'});await page.locator('#overview.page-active').waitFor();
   await page.locator('#to').fill('2026-11-06');await page.locator('#to').dispatchEvent('change');
   assert.equal(await page.locator('#online').textContent(),'2');
   const person=page.locator('#perfRows tr').filter({has:page.locator('.person',{hasText:'DNG.ManLM3'})});assert.equal(await person.locator('td').nth(4).textContent(),'2');
   // Cancellation history bypasses operational filters, but still excludes payroll-only August.
   await page.evaluate(()=>{location.hash='cancelled';document.getElementById('ibbcMonth').open=true;});
   await page.locator('#ibbcMonth input[value="8"]').check();await page.locator('#ibbcMonth input[value="11"]').uncheck();
   assert.equal(await page.locator('#ibbcCount').textContent(),'0');
   await page.locator('#ibbcMonth input[value="11"]').check();await page.locator('#ibbcMonth input[value="8"]').uncheck();await page.keyboard.press('Escape');
   assert.equal(await page.locator('#ibbcMonth input:checked').evaluateAll(inputs=>inputs.map(input=>input.value).join(',')),'11');assert.equal(await page.locator('#ibbcCount').textContent(),'0');
   await page.evaluate(()=>{location.hash='cancelled'});await page.locator('#cancelled.page-active').waitFor();
   await page.locator('#ibbcMonth summary').click();await page.locator('#ibbcMonth input[value="9"]').check();await page.locator('#ibbcMonth input[value="11"]').uncheck();assert.equal(await page.locator('#ibbcCount').textContent(),'1');assert.equal(await page.locator('#ibbcCountHead .ibbc-month').count(),1);assert.match(await page.locator('#ibbcCountLabel').textContent(),/9\/2026/);
   const monthlyDownload=page.waitForEvent('download');await page.locator('[data-ibbc-export="count"]').click();const monthlyCsv=fs.readFileSync(await (await monthlyDownload).path(),'utf8');assert.match(monthlyCsv,/Tháng 9/);assert.doesNotMatch(monthlyCsv,/Tháng 10|Tổng năm/);
   await page.locator('#ibbcMonth summary').click();await page.locator('#ibbcMonth input[value="10"]').check();assert.equal(await page.locator('#ibbcCount').textContent(),'2');assert.equal(await page.locator('#ibbcCountHead .ibbc-month').count(),2);assert.equal(await page.locator('#ibbcRate').textContent(),'67%');assert.match(await page.locator('#ibbcCountHead').textContent(),/Tổng các tháng chọn/);
   const multiDownload=page.waitForEvent('download');await page.locator('[data-ibbc-export="count"]').click();const multiCsv=fs.readFileSync(await (await multiDownload).path(),'utf8');assert.match(multiCsv, /"Toàn phòng","TỔNG PHÒNG","1","1","2"/);assert.doesNotMatch(multiCsv,/Tháng 11/);
   for(const width of [360,390,1440]){await page.setViewportSize({width,height:900});await page.locator('#ibbcMonth summary').click();await page.waitForFunction(()=>{const rect=document.querySelector('.ibbc-month-options').getBoundingClientRect();return rect.left>=0&&rect.right<=innerWidth;});await page.keyboard.press('Escape');}
   await page.setViewportSize({width:role==='manager'?1440:390,height:900});await page.locator('#ibbcMonth summary').click();await page.locator('#ibbcMonth input[value="9"]').uncheck();assert.equal(await page.locator('#ibbcCount').textContent(),'1');
   await page.keyboard.press('Escape');assert.equal(await page.locator('#ibbcMonth').evaluate(el=>el.open),false);
   await page.locator('#ibbcTeam').selectOption('1');assert.equal(await page.locator('#ibbcCount').textContent(),'0');await page.locator('#ibbcTeam').selectOption('');
   await page.locator('#to').evaluate(el=>{el.value='2026-10-06';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.locator('#ibbcMonth input:checked').evaluateAll(inputs=>inputs.map(input=>input.value).join(',')),'10');assert.equal(await page.locator('#ibbcCount').textContent(),'1');
   await page.locator('#to').evaluate(el=>{el.value='2026-11-06';el.dispatchEvent(new Event('change',{bubbles:true}));});assert.equal(await page.locator('#ibbcMonth input:checked').evaluateAll(inputs=>inputs.map(input=>input.value).join(',')),'11');assert.equal(await page.locator('#ibbcCount').textContent(),'0');
   await page.locator('#ibbcAllMonths').evaluate(el=>el.click());assert.equal(await page.locator('#ibbcCount').textContent(),'2');assert.equal(await page.locator('#ibbcCountHead .ibbc-month').count(),12);

   assert.equal(await page.evaluate(()=>window.IBB5_IMPORTED_DATA.filter(row=>['SEPTCANCEL','OCTCANCEL'].includes(row.id)).length),2);
   await page.evaluate(()=>{location.hash='pendingContracts'});await page.locator('#pendingContracts.page-active').waitFor();
   await page.locator('#pendQuery').fill('OCTCANCEL');assert.equal(await page.locator('#pendRows tr[data-id]').count(),0);await page.locator('#pendQuery').fill('');
   const ids=async()=>await page.locator('#pendRows tr[data-id]').evaluateAll(rows=>rows.map(row=>row.dataset.id).sort());
   const allowed=values=>values.filter(id=>role==='manager'||id!=='OUTSIDE').sort();
   assert.equal(await page.locator('#pendStatus option[value="due"]').textContent(),'Đến hạn');
   await page.locator('#pendStatus').selectOption('unupdated');
   assert.deepEqual(await ids(),allowed(['DUE','LATE','WAIT','MISSING','OLD','ONLINE','OUTSIDE']));
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.WAIT.result='Chưa Online';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:WAIT']}}));});
   assert.deepEqual(await ids(),allowed(['DUE','LATE','MISSING','OLD','ONLINE','OUTSIDE']));
   for(const [mode,expected]of Object.entries({all:['DUE','LATE','WAIT','MISSING','OLD','ONLINE','OUTSIDE'],notonline:['DUE','LATE','WAIT','MISSING','OLD','OUTSIDE'],due:['DUE','OLD','OUTSIDE'],missing:['MISSING'],old:['OLD'],aged:['OLD']})){
    await page.locator('#pendStatus').selectOption(mode);assert.deepEqual(await ids(),allowed(expected),role+' '+mode);
   }
   await page.locator('#pendStatus').selectOption('notonline');
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.MISSING.result='Đã Online';window.IBB5_PENDING_NOTES.ONLINE.result='Chưa Online';window.IBB5_SHARED_STATE.snapshot={data:window.IBB5_IMPORTED_DATA.map(row=>row.id==='WAIT'?{...row,date:'2026-11-07'}:{...row})};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot','pending:MISSING','pending:ONLINE']}}));});
   assert.deepEqual(await ids(),allowed(['DUE','LATE','MISSING','OLD','OUTSIDE']));
   await page.evaluate(()=>{delete window.IBB5_PENDING_NOTES.MISSING.result;delete window.IBB5_PENDING_NOTES.ONLINE.result;window.IBB5_SHARED_STATE.snapshot={data:window.IBB5_IMPORTED_DATA.map(row=>row.id==='WAIT'?{...row,date:''}:{...row})};document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot','pending:MISSING','pending:ONLINE']}}));});
   await page.locator('#pendStatus').selectOption('overdue-active');assert.deepEqual(await ids(),['LATE']);
   for(const result of ['Hủy',' Huỷ ']){
    await page.evaluate(result=>{window.IBB5_PENDING_NOTES.LATE.result=result;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:LATE']}}));},result);
    assert.deepEqual(await ids(),[]);
    await page.locator('#pendStatus').selectOption('awaiting-cancellation');assert.deepEqual(await ids(),['LATE']);
    assert.equal(await page.locator('#pendRows .p-cancel-approve').count(),role==='manager'?1:0);
    const approvalDownload=page.waitForEvent('download');await page.locator('#pendExport').click();const approvalCsv=fs.readFileSync(await (await approvalDownload).path(),'utf8');assert.match(approvalCsv,/LATE/);assert.doesNotMatch(approvalCsv,/CANCEL|ONLINE|OUTSIDE/);
    await page.locator('#pendStatus').selectOption('due');assert.ok(!(await ids()).includes('LATE'));
    await page.locator('#pendStatus').selectOption('overdue-active');assert.deepEqual(await ids(),[]);
   }
   await page.locator('#pendStatus').selectOption('awaiting-cancellation');
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.DONE.result='Hủy';window.IBB5_PENDING_NOTES.DONE.cancelReason='Khách yêu cầu';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:DONE']}}));});assert.deepEqual(await ids(),['DONE','LATE']);
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.LATE.cancellationApproved=true;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:LATE']}}));});assert.deepEqual(await ids(),['DONE']);
   await page.evaluate(()=>{delete window.IBB5_PENDING_NOTES.LATE.cancellationApproved;window.IBB5_PENDING_NOTES.DONE.result='Đã Online';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:DONE','pending:LATE']}}));});
   await page.locator('#pendStatus').selectOption('overdue-active');
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.LATE.result='Dự Kiến Hủy';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:LATE']}}));});assert.deepEqual(await ids(),['LATE']);
   const overdueDownload=page.waitForEvent('download');await page.locator('#pendExport').click();const overdueCsv=fs.readFileSync(await (await overdueDownload).path(),'utf8');assert.match(overdueCsv,/LATE/);assert.doesNotMatch(overdueCsv,/ONLINE|OUTSIDE|DUE|OLD/);
   await page.locator('#pendStatus').selectOption('due');
   await page.locator('.ph-filter[data-field="staff"]').selectOption('DNG.ManLM3');assert.deepEqual(await ids(),['DUE','OLD']);
   await page.locator('#pendCreatedMonth').selectOption('2026-11');assert.deepEqual(await ids(),['DUE']);
   await page.locator('#pendQuery').fill('Khách DUE');assert.deepEqual(await ids(),['DUE']);
   const downloaded=page.waitForEvent('download');await page.locator('#pendExport').click();const csv=fs.readFileSync(await (await downloaded).path(),'utf8');assert.match(csv,/DUE/);assert.doesNotMatch(csv,/ONLINE|OUTSIDE|LATE/);
   await page.locator('#pendQuery').fill('Khách ONLINE');assert.deepEqual(await ids(),[]);
   await page.locator('#pendStatus').selectOption('all');assert.deepEqual(await ids(),['ONLINE']);
   await page.locator('#pendQuery').fill('Khách DONE');assert.deepEqual(await ids(),['DONE']);
   await page.locator('#pendQuery').fill('');await page.locator('#pendCreatedMonth').selectOption('');await page.locator('.ph-filter[data-field="staff"]').selectOption('');
   await page.locator('#pendStatus').selectOption('due');await page.locator('#pendAsOf').fill('2026-11-05');await page.locator('#pendAsOf').dispatchEvent('change');assert.deepEqual(await ids(),['DONE','LATE','ONLINE']);
   await page.locator('#pendStatus').selectOption('hidden');assert.deepEqual(await ids(),['CANCEL']);
   assert.equal(await page.locator('#pendRows .p-result').isDisabled(),true);assert.equal(await page.locator('#pendRows .p-save').isDisabled(),true);assert.equal(await page.locator('#pendRows .p-cancel-approve').count(),0);
   assert.match(await page.locator('#pendCount').textContent(),/HĐ đã ẩn: 1 \/ 1/);
   await page.locator('#pendQuery').fill('Khách CANCEL');assert.deepEqual(await ids(),['CANCEL']);
   const hiddenDownload=page.waitForEvent('download');await page.locator('#pendExport').click();const hiddenCsv=fs.readFileSync(await (await hiddenDownload).path(),'utf8');assert.match(hiddenCsv,/CANCEL/);assert.doesNotMatch(hiddenCsv,/OUTSIDE|DUE|DONE/);
   await page.locator('#pendCreatedMonth').selectOption('2026-11');assert.deepEqual(await ids(),['CANCEL']);await page.locator('#pendQuery').fill('');
   if(role==='staff'){await page.locator('#pendRows .p-mobile-edit').click();await page.locator('#pendingMobileEditor').waitFor();assert.equal(await page.locator('#pendingMobileForm [type="submit"]').isDisabled(),true);await page.locator('#pendingMobileEditor .pm-close').first().click();}
   await page.evaluate(()=>{window.IBB5_PENDING_NOTES.SEPTCANCEL={cancellationApproved:true,result:'Hủy',cancelReason:'Lịch sử'};window.IBB5_PENDING_NOTES.OUTSIDE.cancellationApproved=true;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:SEPTCANCEL','pending:OUTSIDE']}}));});
   await page.locator('#pendCreatedMonth').selectOption('2026-09');assert.deepEqual(await ids(),['SEPTCANCEL']);
   await page.locator('#pendCreatedMonth').selectOption('');assert.deepEqual(await ids(),role==='manager'?['CANCEL','OUTSIDE','SEPTCANCEL']:['CANCEL','SEPTCANCEL']);
   await page.locator('#pendStatus').selectOption('all');assert.ok(!(await ids()).some(id=>['CANCEL','OUTSIDE','SEPTCANCEL'].includes(id)));
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: pending dropdown modes, exact due date, actual Online cutoff, date changes, search/column intersections, role scope, desktop/mobile and CSV');
 }finally{await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
