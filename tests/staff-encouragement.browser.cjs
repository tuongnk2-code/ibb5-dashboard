const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const [kind,width,height] of [['negative',1440,900],['negative',390,844],['positive',390,844],['neutral',740,390],['unavailable',390,844],['no-account',1440,900]]){
  const page=await browser.newPage({viewport:{width,height},reducedMotion:kind==='positive'?'reduce':'no-preference'}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const profile={id:'current-user',role:'staff',acc:kind==='no-account'?'':'DNG.ChuongHM'};
  const current=kind==='positive'?22:kind==='neutral'?18:14,previous=kind==='unavailable'?0:18;
  const rows=[...Array.from({length:current},(_,i)=>({id:'CURRENT'+i,date:'2026-11-05',created:'2026-11-01',type:'Internet',staff:'DNG.ChuongHM',room:'IBB5'})),...Array.from({length:previous},(_,i)=>({id:'PRIOR'+i,date:'2026-10-05',created:'2026-10-01',type:'Internet',staff:'DNG.ChuongHM',room:'IBB5'})),{id:'OTHER',date:'2026-11-19',created:'2026-11-01',type:'Internet',staff:'OTHER.ACC',room:'IBB5'}];
  await page.addInitScript(rows=>{window.IBB5_IMPORTED_DATA=rows;window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={notes:{},commitments:{},revisions:{}};const OriginalDate=Date;window.__welcomeNow=OriginalDate.parse('2026-11-20T04:00:00Z');window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:[window.__welcomeNow]));}static now(){return window.__welcomeNow;}};},rows);
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(profile)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';window.testDashboard=await import('/js/main.js');window.testDashboard.showDailyEncouragement(window.IBB5_CURRENT_PROFILE);`}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#performance');await page.waitForFunction(()=>!!window.testDashboard);
  const dialog=page.locator('.staff-encouragement');
  if(kind==='no-account'){assert.equal(await dialog.count(),0);await page.close();continue;}
  await dialog.waitFor({state:'visible'});assert.ok((await dialog.getAttribute('class')).includes(kind));
  assert.equal(await dialog.locator('.se-account').innerText(),'DNG.ChuongHM');assert.doesNotMatch(await dialog.innerText(),/OTHER.ACC/);
  assert.match(await dialog.locator('.se-greeting').innerText(),/Hạ Minh Chương/);
  assert.equal(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth),true);assert.equal(await dialog.evaluate(el=>el.scrollHeight<=el.clientHeight),true,'No vertical clipping '+width+'x'+height);
  const firstId=await dialog.getAttribute('data-message-id');
  if(kind==='negative')assert.match(await dialog.locator('.se-comparison').innerText(),/thấp hơn.*4 HĐ/);
  if(kind==='positive'){assert.match(await dialog.locator('.se-comparison').innerText(),/vượt.*4 HĐ/);assert.equal(await dialog.locator('.se-text').evaluate(el=>getComputedStyle(el).animationName),'none');}
  if(kind==='neutral')assert.match(await dialog.locator('.se-comparison').innerText(),/ngang/);
  if(kind==='unavailable')assert.match(await dialog.locator('.se-comparison').innerText(),/Chưa đủ dữ liệu/);
  if(process.env.ENCOURAGEMENT_SCREENSHOT_DIR&&kind==='negative')await dialog.screenshot({path:process.env.ENCOURAGEMENT_SCREENSHOT_DIR+'/staff-encouragement-live-'+width+'.png'});
  if(width===1440){await dialog.waitFor({state:'detached',timeout:6500});}else{await dialog.locator('.se-skip').click();}
  assert.equal(await dialog.count(),0);assert.equal(await page.evaluate(()=>window.testDashboard.showDailyEncouragement(window.IBB5_CURRENT_PROFILE)),false);
  if(kind==='negative'){
   await page.evaluate(()=>{window.__welcomeNow+=86400000;window.testDashboard.showDailyEncouragement(window.IBB5_CURRENT_PROFILE);});await dialog.waitFor({state:'visible'});assert.notEqual(await dialog.getAttribute('data-message-id'),firstId);assert.match(await dialog.locator('.se-comparison').innerText(),/thấp hơn.*4 HĐ/);await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});
  }
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: own-account growth, five-second animated welcome, daily variation through repeated negatives, missing baseline, reduced motion and mobile/landscape layouts');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
