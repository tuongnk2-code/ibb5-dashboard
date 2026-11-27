const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5300,strictPort:true}});await server.listen();const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
try{for(const width of [1440,390]){const page=await browser.newPage({viewport:{width,height:900}}),errors=[];let documents=[],uploaded=false,ready=false,prepares=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test-session"}}'}));
 await page.route('**/js/supabaseClient.js',r=>r.fulfill({contentType:'application/javascript',body:'import {createClient} from "/node_modules/.vite/deps/@supabase_supabase-js.js";export const supabase=createClient("https://storage.test","test-public-key");'}));
 await page.route('https://storage.test/**',async r=>{if(r.request().url().includes('/object/upload/sign/')){uploaded=true;assert.equal(r.request().method(),'PUT');return r.fulfill({json:{Key:'sales-channel-documents/owner/doc/document.pdf',Id:'file'}});}return r.abort();});
 await page.route('**/api/dashboard-sync*',async r=>{
  assert.equal(r.request().headers().authorization,'Bearer test-session');
  if(r.request().method()==='GET'){const url=new URL(r.request().url());if(url.searchParams.get('id'))return r.fulfill({json:{url:'https://storage.test/signed.pdf'}});return r.fulfill({json:{documents,canUpload:true}});}
  const body=r.request().postDataJSON();assert.equal(body.kind,'channel-document');
  if(body.action==='prepare'){prepares++;assert.equal(body.title,'Hướng dẫn kênh Zalo');return r.fulfill({json:{id:'new-doc',path:'owner/doc/document.pdf',token:'test-upload-token',bucket:'sales-channel-documents',mime:'application/pdf'}});}
  assert.ok(uploaded);ready=true;documents=[{id:'new-doc',title:'Hướng dẫn kênh Zalo',channel:'Zalo',fileName:'test.pdf',extension:'pdf',mime:'application/pdf',size:100,uploadedBy:'DNG.ManLM3',uploadedAt:'2026-11-27T08:00:00Z'}];return r.fulfill({json:{document:documents[0]}});
 });
 await page.route('**/upload-check',r=>r.fulfill({contentType:'text/html',body:'<link rel="stylesheet" href="/css/style.css"><section class="panel page-active" id="channelDocuments"></section><script type="module">import {renderChannelDocuments} from "/js/channelDocuments.js";renderChannelDocuments(document.getElementById("channelDocuments"));</script>'}));
 await page.goto('http://127.0.0.1:5300/upload-check');await page.locator('[data-chdoc-upload]').waitFor({state:'visible'});await page.locator('[data-chdoc-upload]').click();
 await page.locator('input[type=file]').setInputFiles({name:'test.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7\nUpload test')});
 await page.locator('[name=title]').fill('Hướng dẫn kênh Zalo');await page.locator('[name=channel]').selectOption('Zalo');await page.locator('.chdoc-upload-dialog button[type=submit]').click();
 await page.waitForFunction(()=>document.querySelector('[data-chdoc-status]').textContent.includes('Đã đăng'));assert.ok(ready);assert.equal(prepares,1);assert.equal(await page.locator('.chdoc-card').count(),2);
 await page.locator('[data-chdoc-channel]').selectOption('Zalo');assert.equal(await page.locator('.chdoc-card').count(),1);assert.match(await page.locator('.chdoc-card').textContent(),/DNG.ManLM3/);
 await page.locator('[data-chdoc-search]').fill('không tìm thấy');assert.equal(await page.locator('.chdoc-card').count(),0);await page.locator('[data-chdoc-search]').fill('');
 await page.locator('[data-chdoc-read]').click();assert.match(await page.locator('iframe').getAttribute('src'),/storage.test\/signed.pdf/);
 await page.locator('[data-chdoc-close]').click();await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.chdoc-card').length===2);
 await page.screenshot({path:'C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/channel-upload-'+width+'.png'});assert.deepEqual(errors,[]);await page.close();
}console.log('PASS: file picker, signed-upload SDK request, completion, shared listing, author, search/channel filter, preview and reload on desktop/mobile');}finally{await browser.close();await server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
