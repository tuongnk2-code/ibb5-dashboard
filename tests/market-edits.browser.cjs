const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const [role,width] of [['staff',1440],['lead',1440],['staff',390]]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let reports=[],posts=[],gets=0,failRefresh=false,holdNext=false,held=null;
  const me={id:'mine',role,acc:'DNG.ManLM3',created_at:'2020-01-01T00:00:00Z',team:3},other={id:'other',role:'staff',acc:'DNG.BachND7',created_at:'2020-01-01T00:00:00Z',team:3};
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';document.querySelectorAll('.panel').forEach(p=>p.classList.toggle('page-active',p.id==='marketReports'));const {renderMarketReports}=await import('/js/marketReports.js');renderMarketReports(document.getElementById('marketReportsRoot'),${JSON.stringify(me)});`}));
  await page.route('**/api/market-reports**',async r=>{
   const json=(body,status=200)=>r.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
   if(r.request().method()==='GET'){
    gets++;if(failRefresh){failRefresh=false;return json({error:'Mất kết nối thử nghiệm'},503);}
    const snapshot={profiles:role==='lead'?[me,other]:[me],reports:structuredClone(reports),serverTime:new Date().toISOString()};
    if(holdNext){holdNext=false;held=()=>json(snapshot);return;}return json(snapshot);
   }
   const body=r.request().postDataJSON();posts.push(body);const id=body.user_id||'mine',previous=reports.find(x=>x.user_id===id&&x.report_date===body.date);
   if(body.revision!==(previous?.revision||0))return json({error:'Báo cáo đã thay đổi trên thiết bị khác. Tải lại trước khi lưu.'},409);
   const report={user_id:id,report_date:body.date,revision:body.revision+1,status:body.action==='exempt'?'exempt':body.action==='draft'?'draft':'submitted',data:body.data||{absenceReason:body.reason},submitted_at:new Date().toISOString()};reports=reports.filter(x=>x!==previous).concat(report);return json({report});
  });
  await page.goto('http://127.0.0.1:5244/#marketReports');await page.locator('#mkFields').evaluate(el=>el.disabled).then(async disabled=>{if(disabled)await page.waitForFunction(()=>!document.querySelector('#mkFields').disabled);});await page.waitForFunction(()=>document.querySelector('#mkScope').textContent.length>0);
  const field=name=>page.locator('#mkForm [name="'+name+'"]'),refresh=async()=>{const before=gets;await page.evaluate(()=>dispatchEvent(new Event('focus')));await page.waitForFunction(()=>document.querySelector('#mkFields')!==null);for(let i=0;i<40&&gets===before;i++)await page.waitForTimeout(25);assert.ok(gets>before);await page.waitForTimeout(60);};
  const selectedDate=await page.locator('#mkDate').inputValue();
  // Native controls/autofill can change raw values without an input event.
  await field('sessions').evaluate(el=>{el.value='7';el.dispatchEvent(new Event('change',{bubbles:true}));});await field('area').focus();await refresh();assert.equal(await field('sessions').inputValue(),'7','Changing field/focus must not reset entered sessions');
  await field('demos').fill('3');await field('pttb').fill('2');await field('area').fill('Khu vực đang nhập');await field('note').fill('Không được mất ghi chú');await field('demos').press('Tab');await refresh();assert.equal(await field('sessions').inputValue(),'7');assert.equal(await field('demos').inputValue(),'3');assert.equal(await field('area').inputValue(),'Khu vực đang nhập');
  await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();assert.equal(posts.at(-1).data.sessions,7);assert.equal(posts.at(-1).data.demos,3);
  // Detect raw edits even if the browser emitted no input or change at all.
  await field('sessions').evaluate(el=>{el.value='8';});await field('note').focus();await refresh();assert.equal(await field('sessions').inputValue(),'8');
  if(role==='lead'){page.once('dialog',d=>d.accept('Nghỉ phép'));await page.locator('[data-mk-exempt="other"]').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();assert.equal(await field('sessions').inputValue(),'8','Reviewing another person cannot erase own edits');}
  // A newer remote revision must remain a conflict instead of rebasing the unsaved form silently.
  const own=reports.find(r=>r.user_id==='mine'&&r.report_date===selectedDate);own.revision++;own.data={sessions:1,demos:1,pttb:0,area:'Từ thiết bị khác',note:''};await refresh();await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'thiết bị khác'}).waitFor();assert.equal(await field('sessions').inputValue(),'8');
  page.once('dialog',d=>d.dismiss());await page.locator('#mkReload').click();assert.equal(await field('sessions').inputValue(),'8');page.once('dialog',d=>d.accept());await page.locator('#mkReload').click();await page.waitForFunction(()=>document.querySelector('#mkForm [name="sessions"]').value==='1');
  // Keep locally accepted values/revision if the GET immediately after saving fails.
  await field('sessions').fill('9');await field('demos').fill('4');failRefresh=true;await page.locator('#mkSubmit').click();await page.waitForFunction(()=>!document.querySelector('#mkFields').disabled);assert.equal(await field('sessions').inputValue(),'9');await field('pttb').fill('3');await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();assert.equal(posts.at(-1).revision,3);assert.equal(posts.at(-1).data.sessions,9);
  // A response started before the last save cannot restore an older report.
  holdNext=true;await refresh();for(let i=0;i<40&&!held;i++)await page.waitForTimeout(25);assert.ok(held);await field('sessions').fill('10');await page.locator('#mkSubmit').click();await page.locator('#mkMessage').filter({hasText:'Đã lưu báo cáo'}).waitFor();await held();await page.waitForTimeout(60);assert.equal(await field('sessions').inputValue(),'10');assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: market inputs survive change-only/raw edits, field switching, refresh, supervisor actions, conflicts, failed reload and stale responses on desktop/mobile');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
