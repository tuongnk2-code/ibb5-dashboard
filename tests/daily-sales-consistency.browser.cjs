const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const {validateSnapshot}=await import('../js/dashboardStateModel.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const row=(id,extra={})=>({id,type:'Internet',staff:'DNG.Hoantt',room:'IBB5',customer:id,status:'Bình thường',created:'2026-11-19',date:'',...extra});
   const active=Array.from({length:17},(_,i)=>row('ACTIVE'+i,{staff:i<9?'DNG.Hoantt':'DNG.Vypv',date:i<3?'2026-11-19':''}));
   window.IBB5_IMPORTED_DATA=[...active,...[1,2,3].map(i=>row('CANCEL'+i,{status:'Đã chấm dứt hợp đồng',date:'2026-11-19'})),row('LOCAL',{date:'2026-11-19'}),row('EARLIER',{created:'2026-11-18'}),{...active[0]},{...row('CAMERA'),type:'Camera'}];
   window.IBB5_PENDING_NOTES={LOCAL:{result:'Hủy'},ACTIVE16:{result:'Dự Kiến Hủy'}};
   window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
  await page.locator('#to').fill('2026-11-19');await page.locator('#to').dispatchEvent('change');
  assert.equal(await page.locator('#soldToday').innerText(),'17 HĐ');assert.equal(await page.locator('#todayOnlineCount').innerText(),'7 HĐ');
  assert.equal(await page.locator('#anaTrend .trk-row-sold [data-day="19"]').innerText(),'17');assert.equal(await page.locator('#anaTrend .trk-row-sold td').last().innerText(),'18');assert.equal(await page.locator('#anaTrend .trk-sold .trk-section-total').innerText(),'Tổng 18 HĐ');assert.equal(await page.locator('#anaTrend .trk-row-online [data-day="19"]').innerText(),'7');
  await page.locator('#anaStaff').selectOption('DNG.Hoantt');assert.equal(await page.locator('#anaTrend .trk-row-sold [data-day="19"]').innerText(),'9');await page.locator('#anaStaff').selectOption('');
  assert.equal(await page.locator('#anaTrend .trk-combined-plot').count(),1);assert.equal(await page.locator('#anaTrend .trk-section').count(),1);
  assert.equal(await page.locator('#anaTrend [data-trk-series]').count(),2);assert.equal(await page.locator('#anaTrend [data-trk-day]').count(),30);
  assert.equal(await page.locator('#anaTrend [data-trk-series="sold"]').getAttribute('stroke-dasharray'),'7 4');
  await page.locator('#anaTrend [data-trk-day="19"]').focus();assert.match(await page.locator('#ibbTrkFocus').innerText(),/Online 7 HĐ · Bán mới 17 HĐ · Chênh -10 HĐ/);
  assert.equal(await page.locator('#anaTrend .trk-series-point.is-selected').count(),2);assert.equal(await page.locator('#anaTrend .trk-row-sold .trk-highlighted').innerText(),'17');
  await page.keyboard.press('ArrowRight');assert.match(await page.locator('#ibbTrkFocus').innerText(),/Ngày 20\/11: Online 0 HĐ · Bán mới 0 HĐ/);
  assert.equal(await page.locator('#anaTrend .trk-row-online .trk-highlighted').innerText(),'0');
  const checkColumns=async()=>{
   const offsets=await page.locator('#anaTrend .trk-day-table thead [data-day]').evaluateAll(headers=>headers.map(header=>{
    const day=header.dataset.day,table=header.closest('table'),cells=[header,...table.querySelectorAll('tbody [data-day="'+day+'"]')],center=el=>{const r=el.getBoundingClientRect();return (r.left+r.right)/2;};
    const svg=document.querySelector('#anaTrend .trk-combined-plot'),point=svg.querySelector('circle[data-point-day="'+day+'"]'),position=svg.createSVGPoint();position.x=Number(point.getAttribute('cx'));position.y=Number(point.getAttribute('cy'));const screen=position.matrixTransform(svg.getScreenCTM());
    return {day,alignments:cells.map(cell=>getComputedStyle(cell).textAlign),offsets:cells.map(cell=>Math.abs(center(cell)-screen.x))};
   }));
   for(const item of offsets){assert.ok(item.offsets.every(offset=>offset<2),'chart/table day '+item.day+' must align: '+item.offsets);assert.ok(item.alignments.every(value=>value==='center'),'day '+item.day+' headers and figures must be centered');}
  };
  await checkColumns();
  if(width===390){await page.locator('#anaTrend .trk-aligned-scroll').evaluate(el=>el.scrollLeft=400);await checkColumns();}
  if(width===1440){for(const month of ['2026-02','2026-12','2026-11']){await page.locator('#anaMonth').fill(month);await page.locator('#anaMonth').dispatchEvent('change');await checkColumns();}}
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));
  await page.evaluate(()=>location.hash='performance');await page.locator('#dpView').selectOption('day');await page.locator('#dpDay').fill('2026-11-19');await page.locator('#dpDay').dispatchEvent('change');assert.equal(await page.locator('#dpTableBody .dp-grand .dp-sold').innerText(),'17');
  await page.evaluate(()=>{window.IBB5_PENDING_NOTES.LOCAL.result='Chưa Online';document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:LOCAL']}}));});await page.waitForFunction(()=>document.getElementById('soldToday').textContent==='18 HĐ');assert.equal(await page.locator('#dpTableBody .dp-grand .dp-sold').innerText(),'18');assert.equal(await page.locator('#anaTrend .trk-row-sold [data-day="19"]').innerText(),'18');
  await page.evaluate(()=>{window.IBB5_PENDING_NOTES.LOCAL.cancellationApproved=true;document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['pending:LOCAL']}}));});await page.waitForFunction(()=>document.getElementById('soldToday').textContent==='17 HĐ');assert.equal(await page.locator('#dpTableBody .dp-grand .dp-sold').innerText(),'17');assert.equal(await page.locator('#anaTrend .trk-row-sold [data-day="19"]').innerText(),'17');assert.equal(await page.locator('#todayOnlineCount').innerText(),'7 HĐ');
  assert.deepEqual(errors,[]);await page.close();}console.log('PASS: overview sales, trend daily/monthly totals and personnel matrix agree after cancellation exclusions and live updates; Online unchanged');}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
