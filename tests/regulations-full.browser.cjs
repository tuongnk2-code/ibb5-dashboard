const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5288,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const html=process.env.QMS_HTML?await fs.readFile(process.env.QMS_HTML,'utf8'):'<html><body><article data-source-page="1">Trang 1</article><article data-source-page="2">Trang 2</article><article data-source-page="3">Trang 3</article><article data-source-page="4">Trang 4</article><script>parent.document.body.dataset.injected="true"</script></body></html>';
 const pdf=process.env.QMS_PDF?await fs.readFile(process.env.QMS_PDF):Buffer.from('%PDF-1.4\ntest');
 const rulesHtml=process.env.QMS_RULES_HTML?await fs.readFile(process.env.QMS_RULES_HTML,'utf8'):'<article data-source-page="1">Quy định lên hợp đồng</article><article data-source-page="2">Phụ lục thay đổi</article>';
 const codes=['2-SEL.0.0.1-QT/KD/HDCV/FTEL','2-SEL.0.0.1-QD/KD/HDCV/FTEL'];
 const documents=[{code:codes[0],title:'Quy trình bán hàng'},{code:codes[1],title:'Quy định lên hợp đồng'}];
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
  await page.route('**/api/dashboard-sync?document=sales-procedure*',r=>{const rules=new URL(r.request().url()).searchParams.get('code')===codes[1];return r.fulfill({json:{document:{title:rules?'Quy định lên hợp đồng':'Quy trình bán hàng',code:rules?codes[1]:codes[0],version:rules?'2/2':'1/11',qmsEffectiveDate:rules?'17/09/2026':'18/08/2026',sourcePages:rules?2:4,originalHtml:rules?rulesHtml:html,pdfBase64:pdf.toString('base64')},documents}});});
  await page.goto('http://127.0.0.1:5288/tests/regulations-full.browser.cjs');
  await page.setContent('<main id="regulations"></main>');
  await page.evaluate(async()=>{const {renderRegulations}=await import('/js/regulations.js');await renderRegulations(document.querySelector('main'));});
  const frame=page.frameLocator('iframe');await frame.locator('[data-source-page="4"]').waitFor({state:'attached'});assert.equal(await frame.locator('[data-source-page]').count(),4);assert.equal(await page.locator('iframe').getAttribute('sandbox'),'');assert.equal(await page.locator('body').getAttribute('data-injected'),null);
  assert.equal(await page.locator('.qr-tools').count(),0);assert.equal(await page.locator('.qr-section').count(),0);
  assert.match(await page.locator('.qr-head').innerText(),/Hiệu lực: 18\/08\/2026/);
  if(process.env.QMS_HTML){assert.match(await frame.locator('body').innerText(),/TINPNC xác minh thông tin KH/);assert.match(await frame.locator('[data-source-page="4"]').innerText(),/Chưa có quy định/);assert.equal(await frame.locator('.penalties [rowspan="2"]').count(),4);}
  assert.equal(await page.getByRole('button',{name:'Tải file PDF'}).count(),0);assert.equal(await page.locator('.qr-head a').count(),0);
  await page.getByRole('combobox',{name:'Chọn tài liệu'}).selectOption(codes[1]);await page.getByRole('heading',{name:'Quy định lên hợp đồng',exact:true}).waitFor();await frame.locator('[data-source-page="2"]').waitFor({state:'attached'});assert.equal(await frame.locator('[data-source-page]').count(),2);assert.match(await page.locator('.qr-head').innerText(),/2\/2/);assert.equal(await page.locator('iframe').getAttribute('title'),'Toàn bộ nội dung Quy định lên hợp đồng - 2 trang');
  if(process.env.QMS_RULES_HTML){assert.equal(await frame.locator('.duplicates tr').count(),9);assert.equal(await frame.locator('.duplicates [rowspan="4"]').count(),2);assert.match(await frame.locator('[data-source-page="2"]').innerText(),/Không yêu cầu cung cấp và tải lên giấy tờ tùy thân/);}
  assert.match(await page.locator('.qr-head').innerText(),/Hiệu lực: 17\/09\/2026/);
  assert.equal(await page.locator('.qr-head a,.qr-head button').count(),0);
  assert.ok(await page.locator('#regulations').evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert.deepEqual(errors,[]);
  await page.screenshot({path:`C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/qms-full-dashboard-${width}.png`});await page.close();
 }console.log('PASS: switching 4-page procedure / 2-page regulation, isolated viewer, exact table structure, hidden PDF/QMS actions and desktop/mobile rendering');}
 finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
