const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5287,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  for(const width of [1440,390]){
   const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{window.IBB5_IMPORTED_DATA=[];window.IBB5_PENDING_NOTES={};window.IBB5_SHARED_STATE={notes:{},commitments:{},revisions:{}};});
   await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
   await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
   await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"test",role:"staff",acc:"DNG.ManLM3"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
   let fail=true;await page.route('**/api/regulations',r=>{assert.equal(r.request().headers().authorization,'Bearer test');return r.fulfill({status:fail?500:200,json:fail?{error:'Lỗi thử nghiệm'}:{document:{title:'Tài liệu kiểm thử',code:'TEST',version:'1',effective:'Ngày ký',reviewedAt:'2026-11-26',pages:4,sections:[{id:'a',title:'Ghi nhận',page:'2',paragraphs:['Công tư vấn'],bullets:['<img src=x onerror=alert(1)>']},{id:'b',title:'Quy định',page:'3',columns:['A','B'],rows:[['Bán hàng','Test']]}]}}});});
   await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5287/#overview');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');
   if(width<650)await page.locator('#mobileMenuToggle').click();await page.locator('.sidebar .nav a[href="#regulations"]').click();await page.getByText('Lỗi thử nghiệm',{exact:true}).waitFor();fail=false;await page.getByRole('button',{name:'Thử lại',exact:true}).click();await page.locator('.qr-section').first().waitFor();
   assert.equal(await page.locator('.qr-section').count(),2);assert.equal(await page.locator('#regulations img').count(),0);
   await page.getByRole('searchbox',{name:'Tìm trong quy trình'}).fill('cong tu van');assert.equal(await page.locator('.qr-section').count(),1);
   await page.getByRole('combobox',{name:'Mục quy trình'}).selectOption('b');assert.equal(await page.locator('.qr-section').count(),0);await page.locator('.qr-tools button').click();assert.equal(await page.locator('.qr-section').count(),2);
   await page.goBack();await page.goForward();await page.locator('.qr-section').first().waitFor();await page.reload();await page.locator('.qr-section').first().waitFor();
   assert.ok(await page.locator('#regulations').evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.equal(await page.locator('.qr-original').getAttribute('rel'),'noopener noreferrer');assert.deepEqual(errors,[]);await page.screenshot({path:`C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/regulations-${width}.png`,fullPage:true});await page.close();
  }
  console.log('PASS: regulations auth, retry, real sidebar navigation, history/reload, safe text, unaccented search and responsive layout');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
