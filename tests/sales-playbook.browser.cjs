const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const source=JSON.parse(await fs.readFile('js/data/salesPlaybookSource.json','utf8'));assert.equal(source.length,156);
  for(const [role,width] of [['manager',1440],['staff',390]]){
   const page=await browser.newPage({viewport:{width,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.context().grantPermissions(['clipboard-read','clipboard-write']);
   await page.addInitScript(()=>{window.IBB5_IMPORTED_DATA=[];window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={notes:{},commitments:{},revisions:{}};});
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'${role}',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
   await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/'+(role==='staff'?'#overview':'#scripts'));
   if(role==='staff'){await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');assert.equal(await page.locator('#spTopics').count(),0);await page.locator('#mobileMenuToggle').click();await page.locator('.sidebar .nav a[href="#scripts"]').click();}
   await page.waitForSelector('#spTopics button');
   if(role==='staff'){await page.goBack();await page.waitForFunction(()=>location.hash==='#overview');await page.goForward();await page.waitForSelector('#spTopics button');await page.reload();await page.waitForSelector('#spTopics button');}
   assert.equal(await page.locator('#spTopics button').count(),10);assert.equal(await page.locator('#scripts .planned-badge').count(),0);assert.match(await page.locator('#spContent h3').innerText(),/Camera/);
   const chapters=await page.locator('#spTopics button').evaluateAll(nodes=>nodes.map(n=>n.dataset.spChapter));let referenced=[];
   for(const id of chapters){await page.locator(`[data-sp-chapter="${id}"]`).click();assert.equal(await page.locator('.sp-steps li').count(),5);assert.equal(await page.locator('.sp-responses details').count(),3);assert.equal(await page.locator('.sp-completion li').count(),3);await page.locator('[data-sp-view="source"]').click();const pages=await page.locator('.sp-source-pages summary>span').allTextContents();referenced.push(...pages.map(p=>Number(p.replace('Trang ',''))));}
   assert.equal(referenced.length,144);assert.equal(new Set(referenced).size,144);assert.ok(referenced.includes(156));
   await page.locator('#spSearch').fill('gam cau thang');assert.equal(await page.locator('#spTopics button').count(),1);assert.match(await page.locator('#spContent h3').innerText(),/Wi-Fi/);
   await page.locator('#spCategory').selectOption('Chính sách');assert.equal(await page.locator('#spTopics button').count(),0);assert.match(await page.locator('.sp-empty').innerText(),/Chưa tìm thấy/);
   await page.locator('#spReset').click();await page.locator('#spSearch').fill('nguyen minh hien');assert.ok(await page.locator('#spTopics button').count()>0);assert.equal(await page.locator('[data-sp-view="source"]').getAttribute('aria-pressed'),'true');assert.match(await page.locator('.sp-source-pages').innerText(),/Nguyễn Minh Hiển/);
   await page.locator('#spReset').click();await page.locator('#spCategory').selectOption('Kỹ thuật');assert.equal(await page.locator('#spTopics button').count(),2);
   await page.locator('#spReset').click();await page.locator('[data-sp-chapter="payment"]').click();const script=await page.locator('#spScriptText').innerText();await page.locator('#spCopy').click();await page.locator('#spCopyStatus').filter({hasText:'Đã sao chép'}).waitFor();assert.equal(await page.evaluate(()=>navigator.clipboard.readText()),script);await page.locator('#spCopyAll').click();await page.locator('#spCopyAllStatus').filter({hasText:'Đã sao chép'}).waitFor();assert.match(await page.evaluate(()=>navigator.clipboard.readText()),/Gợi ý trả lời:/);
   await page.locator('[data-sp-view="source"]').click();await page.locator('.sp-source-pages details').first().locator('summary').click();assert.match(await page.locator('.sp-source-pages details').first().innerText(),/khách hàng/);await page.locator('#spOriginal').check();assert.match(await page.locator('.sp-provenance').innerText(),/Đang xem nguyên văn/);
   await page.locator('#spSearch').fill('<img src=x onerror=alert(1)>');assert.equal(await page.locator('#scripts img').count(),0);assert.equal(await page.locator('#spTopics button').count(),0);await page.locator('#spReset').click();
   assert.ok(await page.locator('#scripts').evaluate(el=>el.scrollWidth<=el.clientWidth+1));await page.screenshot({path:`C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/sales-playbook-${width}.png`,fullPage:true});assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: 10 chapters, 156-slide source / 144 reference pages, unaccented full-text/author search, categories, empty states, clipboard, safe text and desktop/mobile access');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
