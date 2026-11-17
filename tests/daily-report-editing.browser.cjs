const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],posts=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.addInitScript(()=>{const original=setInterval;window.setInterval=(fn,ms,...args)=>ms===5000?(window.testReportRefresh=fn,0):original(fn,ms,...args);});
  let stored=null,metric=0,holdNext=false,holdStarted,releaseHold,rejectPost=false,staleAfterPost=false,staleOnce;
  const me={id:'staff',role:'staff',acc:'DNG.ManLM3'},baseData={actual:0,commitment:0,tomorrowPttb:0,tomorrowOnline:0,focus:'',difficulty:'',support:'',sources:[{name:'Zalo',leads:0,closed:0}]};
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
  await page.route('**/api/daily-reports*',async r=>{
   const req=r.request(),url=new URL(req.url());
   if(req.method()==='POST'){
    const body=req.postDataJSON();posts.push(body);if(rejectPost)return r.fulfill({status:409,json:{error:'Báo cáo đã thay đổi trên thiết bị khác. Tải lại để cập nhật.'}});
    const previous=stored;stored={user_id:me.id,report_date:body.date,status:body.action==='draft'?'draft':'submitted',revision:(stored?.revision||0)+1,data:body.data,updated_at:new Date().toISOString()};if(staleAfterPost){staleOnce=previous;staleAfterPost=false;}return r.fulfill({json:{report:stored}});
   }
   if(url.searchParams.has('history'))return r.fulfill({json:{reports:[]}});
   const day=url.searchParams.get('date'),report=staleOnce!==undefined?staleOnce:stored;staleOnce=undefined;
   const payload={profiles:[me],reports:report&&report.report_date===day?[structuredClone(report)]:[],metrics:{staff:{online:metric,monthlyOnline:metric}},previous:null,serverTime:new Date().toISOString()};
   if(holdNext){holdNext=false;await new Promise(resolve=>{releaseHold=resolve;holdStarted?.();});}
   await r.fulfill({json:payload});
  });
  await page.route('**/editing-check',r=>r.fulfill({contentType:'text/html',body:'<section class="panel page-active"><div id="root"></div></section><script type="module">import {renderDailyReports} from "/js/dailyReports.js";renderDailyReports(document.getElementById("root"),{id:"staff",role:"staff",acc:"DNG.ManLM3"},()=>40);</script>'}));
  await page.goto('http://127.0.0.1:5244/editing-check');await page.waitForFunction(()=>!document.getElementById('drFields').disabled);
  const field=name=>page.locator('#drForm [name="'+name+'"]'),leads=()=>page.locator('.dr-leads').first(),closed=()=>page.locator('.dr-closed').first();
  const reloadStarted=new Promise(resolve=>holdStarted=resolve);holdNext=true;await page.locator('#drReload').click();await reloadStarted;
  await field('actual').fill('7');await field('commitment').fill('9');await leads().fill('12');await closed().fill('3');await field('support').fill('Hỗ trợ khảo sát');
  releaseHold();await page.waitForTimeout(50);assert.equal(await field('actual').inputValue(),'7','A delayed reload must not reset numbers entered after it began');assert.equal(await leads().inputValue(),'12');
  metric=2;await page.evaluate(()=>window.testReportRefresh());assert.equal(await field('commitment').inputValue(),'9');assert.equal(await leads().inputValue(),'12');assert.match(await page.locator('#drAuto').innerText(),/2/);
  await field('commitment').evaluate(el=>{el.value='11';el.dispatchEvent(new Event('change',{bubbles:true}));});await field('focus').focus();await page.evaluate(()=>window.testReportRefresh());assert.equal(await field('commitment').inputValue(),'11');
  await leads().fill('');await field('focus').focus();await page.evaluate(()=>window.testReportRefresh());assert.equal(await leads().inputValue(),'','An intentionally cleared number must not be coerced to zero by refresh');await leads().fill('12');
  await page.locator('#drAddSource').click();await page.locator('.dr-source-name').last().fill('Nguồn mới');await page.locator('.dr-leads').last().fill('8');await page.locator('.dr-closed').last().fill('1');await page.locator('.dr-source-row').nth(1).locator('button').click();await page.evaluate(()=>window.testReportRefresh());assert.equal(await page.locator('.dr-source-name').last().inputValue(),'Nguồn mới');assert.equal(await leads().inputValue(),'12');assert.match(await page.locator('#drLeadTotal').innerText(),/20 KHTN.*4 chốt/);
  const date=await page.locator('#drDate').inputValue();stored={user_id:me.id,report_date:date,status:'draft',revision:5,data:baseData,updated_at:new Date().toISOString()};await page.evaluate(()=>window.testReportRefresh());rejectPost=true;await page.locator('#drDraft').click();await page.waitForFunction(()=>!document.getElementById('drFields').disabled);assert.equal(posts.at(-1).revision,0,'Keep the revision the employee started editing');assert.equal(posts.at(-1).data.actual,7);assert.equal(posts.at(-1).data.sources[0].leads,12);assert.equal(await field('actual').inputValue(),'7');assert.match(await page.locator('#drMessage').innerText(),/thiết bị khác/);
  rejectPost=false;await page.locator('#drReload').click();await page.waitForFunction(()=>document.querySelector('#drForm [name=actual]').value==='0');await field('actual').fill('8');await leads().fill('4');await closed().fill('2');staleAfterPost=true;await page.locator('#drDraft').click();await page.waitForFunction(()=>document.getElementById('drMessage').textContent.includes('Đã lưu nháp'));assert.equal(posts.at(-1).revision,5);assert.equal(await field('actual').inputValue(),'8','A stale GET after saving must not overwrite the saved report');assert.equal(await leads().inputValue(),'4');
  const backgroundStarted=new Promise(resolve=>holdStarted=resolve);holdNext=true;const refreshing=page.evaluate(()=>window.testReportRefresh());await backgroundStarted;await page.locator('#drDate').fill('2026-11-01');await page.locator('#drDate').dispatchEvent('change');await page.waitForFunction(()=>!document.getElementById('drFields').disabled);releaseHold();await refreshing;assert.equal(await page.locator('#drDate').inputValue(),'2026-11-01');assert.equal(await field('actual').inputValue(),'0');assert.deepEqual(errors,[]);
  console.log('PASS: delayed reload, tabbing/change events, background metrics, source rows, cleared numbers, conflict preservation, stale save responses and date races');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
