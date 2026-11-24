const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.addInitScript(()=>{
   const net=(id,staff,date)=>({id,staff,type:'Internet',room:'IBB5',status:'Bình thường',created:'2026-11-01',date});
   window.IBB5_IMPORTED_DATA=[net('A','DNG.Hoantt','2026-11-05'),net('B','DNG.Hoantt','2026-11-06'),net('C','DNG.Namnh170','2026-11-07'),net('D','DNG.Hoantt',''),net('E','DNG.Vypv','2026-11-08'),{...net('P','DNG.Hoantt','2026-10-01'),created:'2026-10-01'}];
   window.IBB5_SHARED_STATE={notes:{},revisions:{},commitments:{'2026-11':{__ALL__:{staff:{'DNG.Hoantt':{status:'approved',value:4},'DNG.Namnh170':{status:'approved',value:1},'DNG.Vypv':{status:'approved',value:2}}}}}};window.IBB5_PENDING_NOTES={};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:"window.IBB5_CURRENT_PROFILE={id:'test',role:'manager',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');"}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#performance');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');await page.locator('#to').evaluate(el=>{el.value='2026-11-17';el.dispatchEvent(new Event('change'));});
  const table=page.locator('#performance .perf-table'),filter=field=>table.locator('[data-perf-field="'+field+'"]'),people=table.locator('tbody .person');
  assert.equal(await filter('acc').count(),1);assert.equal(await table.locator('thead select').count(),14);assert.equal(await people.count(),17);
  await filter('online').selectOption('positive');assert.equal(await people.count(),3);assert.equal(await page.locator('#perfFoot td').nth(4).textContent(),'4');
  await page.locator('#perfTeam').selectOption('2');assert.equal(await people.count(),2);assert.equal(await page.locator('#perfFoot td').nth(4).textContent(),'3');
  await filter('pct').selectOption('sort:desc');assert.deepEqual(await people.allTextContents(),['DNG.Namnh170','DNG.Hoantt']);assert.equal(await filter('online').inputValue(),'positive');assert.equal(await page.locator('#perfFoot td').nth(4).textContent(),'3');
  await filter('pct').selectOption('sort:asc');assert.deepEqual(await people.allTextContents(),['DNG.Hoantt','DNG.Namnh170']);assert.equal(await table.locator('th[aria-sort="ascending"]').count(),1);
  await filter('pct').selectOption('under100');assert.equal(await people.count(),1);assert.equal(await people.textContent(),'DNG.Hoantt');assert.equal(await page.locator('#perfFoot td').nth(4).textContent(),'2');
  await table.locator('tfoot [data-perf-contracts="online"]').click();assert.equal(await page.locator('#performanceContractDialog tbody tr').count(),2);await page.locator('#performanceContractDialog [data-aged-close]').click();
  await page.locator('#perfSearch').fill('Namnh');assert.equal(await people.count(),0);assert.match(await table.locator('tbody').innerText(),/Không có nhân sự/);await page.locator('#perfSearch').fill('');assert.equal(await people.count(),1);
  await page.evaluate(()=>{window.IBB5_IMPORTED_DATA.push({id:'NEW',staff:'DNG.Hoantt',type:'Internet',room:'IBB5',created:'2026-11-17',date:'2026-11-17'});document.dispatchEvent(new CustomEvent('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated'));});assert.equal(await filter('pct').inputValue(),'under100');assert.equal(await page.locator('#perfFoot td').nth(4).textContent(),'3');
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#perfExport').click()]);const csv=await fs.readFile(await download.path(),'utf8');assert.match(csv,/DNG.Hoantt/);assert.doesNotMatch(csv,/DNG.Namnh170|Lớn hơn 0|Dưới 100%|Tất cả/);assert.equal(csv.split('\r\n')[0].split(',').length,14);
  await page.locator('#perfExpand').click();await page.locator('#perfClearFilters').click();assert.equal(await people.count(),3);await filter('tenure').selectOption('eq:13+');assert.equal(await people.count(),3);assert.equal(await page.locator('#perfFilterStatus').isVisible(),true);await page.locator('#perfExpand').click();
  await page.locator('#performance .heading').scrollIntoViewIfNeeded();await page.evaluate(()=>{const y=document.querySelector('#performance .perf-table').getBoundingClientRect().top+scrollY+80;scrollTo(0,y);});await page.waitForTimeout(150);await page.evaluate(()=>dispatchEvent(new Event('scroll')));await page.locator('#perfStickyClone').waitFor({state:'visible'});
  await page.locator('#perfStickyClone [data-perf-field="acc"]').selectOption('sort:desc');assert.deepEqual(await people.allTextContents(),['DNG.Nhannt137','DNG.Namnh170','DNG.Hoantt']);assert.equal(await table.locator('th[aria-sort="descending"]').count(),1);
  await page.locator('#perfStickyClone [data-perf-field="online"]').selectOption('zero');assert.equal(await filter('online').inputValue(),'zero');assert.equal(await people.count(),1);assert.equal(await people.textContent(),'DNG.Nhannt137');
  assert.equal(await page.locator('#perfPrevOnlineTitle').count(),1);await page.locator('#perfClearFilters').click();assert.equal(await people.count(),3);
  await page.locator('#performance .heading').scrollIntoViewIfNeeded();assert.equal(await filter('acc').evaluate(el=>{const rect=el.getBoundingClientRect();return document.elementFromPoint(rect.left+rect.width/2,rect.top+rect.height/2)?.closest('[data-perf-field]')?.dataset.perfField;}),'acc');
  if(process.env.PERF_SCREENSHOT_DIR)await page.locator('#perfTableCapture').screenshot({path:process.env.PERF_SCREENSHOT_DIR+'/performance-filters-'+width+'.png'});
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: 14 intersecting filters, filtered totals/details/CSV, upstream filters, live updates, sticky controls and desktop/mobile');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

