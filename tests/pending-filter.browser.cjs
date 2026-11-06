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
  const notes=Object.fromEntries(definitions.map(([id,,,expected])=>[id,{expected}]));
  Object.assign(notes.DONE,{timeSlot:'8h - 10h',action:'Khác',result:'Đã Online',source:'Web'});notes.CANCEL.cancellationApproved=true;
  for(const role of ['manager','staff']){
   const context=await browser.newContext({viewport:{width:role==='manager'?1440:390,height:900}}),errors=[];
   await context.addInitScript(({data,notes})=>{window.IBB5_IMPORTED_DATA=data;window.IBB5_PENDING_NOTES=notes;},{data,notes});
   await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await context.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'filter-${role}',role:'${role}',acc:'DNG.ManLM3',team:3};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await context.route('https://**/*',r=>r.abort());
   const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://127.0.0.1:5179/#pendingContracts');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   await page.locator('#pendAsOf').fill('2026-11-06');await page.locator('#pendAsOf').dispatchEvent('change');
   const ids=async()=>await page.locator('#pendRows tr[data-id]').evaluateAll(rows=>rows.map(row=>row.dataset.id).sort());
   const allowed=values=>values.filter(id=>role==='manager'||id!=='OUTSIDE').sort();
   for(const [mode,expected]of Object.entries({all:['DUE','LATE','WAIT','MISSING','OLD','ONLINE','OUTSIDE'],notonline:['DUE','LATE','WAIT','MISSING','OLD','OUTSIDE'],due:['DUE','LATE','OLD','OUTSIDE'],missing:['MISSING'],old:['OLD'],aged:['OLD']})){
    await page.locator('#pendStatus').selectOption(mode);assert.deepEqual(await ids(),allowed(expected),role+' '+mode);
   }
   await page.locator('#pendStatus').selectOption('due');
   await page.locator('.ph-filter[data-field="staff"]').selectOption('DNG.ManLM3');assert.deepEqual(await ids(),['DUE','LATE','OLD']);
   await page.locator('#pendCreatedMonth').selectOption('2026-11');assert.deepEqual(await ids(),['DUE','LATE']);
   await page.locator('#pendQuery').fill('Khách LATE');assert.deepEqual(await ids(),['LATE']);
   const downloaded=page.waitForEvent('download');await page.locator('#pendExport').click();const csv=fs.readFileSync(await (await downloaded).path(),'utf8');assert.match(csv,/LATE/);assert.doesNotMatch(csv,/ONLINE|OUTSIDE|DUE/);
   await page.locator('#pendQuery').fill('Khách ONLINE');assert.deepEqual(await ids(),[]);
   await page.locator('#pendStatus').selectOption('all');assert.deepEqual(await ids(),['ONLINE']);
   await page.locator('#pendQuery').fill('Khách DONE');assert.deepEqual(await ids(),['DONE']);
   await page.locator('#pendQuery').fill('');await page.locator('#pendCreatedMonth').selectOption('');await page.locator('.ph-filter[data-field="staff"]').selectOption('');
   await page.locator('#pendStatus').selectOption('due');await page.locator('#pendAsOf').fill('2026-11-05');await page.locator('#pendAsOf').dispatchEvent('change');assert.deepEqual(await ids(),['DONE','LATE','ONLINE']);
   assert.deepEqual(errors,[]);await context.close();
  }
  console.log('PASS: pending dropdown modes, exact due date, actual Online cutoff, date changes, search/column intersections, role scope, desktop/mobile and CSV');
 }finally{await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
