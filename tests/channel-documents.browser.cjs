const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5298, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }), errors = []; let pdfRequests = 0;
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => { window.IBB5_IMPORTED_DATA = []; window.IBB5_PENDING_NOTES = {}; window.IBB5_SHARED_STATE = { notes: {}, commitments: {}, revisions: {} }; });
      await page.route('**/js/auth.js', r => r.fulfill({ contentType: 'application/javascript', body: 'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}' }));
      await page.route('**/js/api.js', r => r.fulfill({ contentType: 'application/javascript', body: 'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}' }));
      await page.route('**/js/app-gate.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.IBB5_CURRENT_PROFILE={id:"test",role:"staff",acc:"DNG.ManLM3"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");' }));
      await page.route('**/facebook-ads.pdf*', r => { pdfRequests++; return r.abort(); });
      await page.route('https://**/*', r => r.abort());
      await page.goto('http://127.0.0.1:5298/#overview'); await page.waitForFunction(() => typeof window.IBB5_MONTHLY_TARGET === 'function');
      if (width < 1000) await page.locator('#mobileMenuToggle').click();
      await page.locator('[data-nav-group="reference"] summary').click();
      await page.locator('.nav a[href="#channelDocuments"]').click(); await page.locator('[data-chdoc-read]').waitFor();
      assert.equal(await page.locator('.top h1').textContent(), 'Tài liệu kênh bán');
      assert.equal(pdfRequests, 0); assert.equal(await page.locator('#channelDocuments iframe').count(), 0);
      assert.match(await page.locator('.chdoc-card').textContent(), /90 trang/);
      assert.equal(await page.locator('.chdoc-card img').evaluate(img => img.complete && img.naturalWidth > 0), true);
      assert.equal(await page.locator('.chdoc-actions a[download]').getAttribute('href'), '/documents/sales-channels/facebook-ads.pdf');
      await page.screenshot({ path: `C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/channel-documents-${width}.png` });
      await page.locator('[data-chdoc-read]').click();
      assert.match(await page.locator('#channelDocuments iframe').getAttribute('src'), /facebook-ads.pdf#view=FitH/);
      await page.locator('[data-chdoc-close]').click(); assert.equal(await page.locator('#channelDocuments iframe').count(), 0);
      await page.reload(); await page.locator('[data-chdoc-read]').waitFor(); assert.equal(await page.locator('[data-nav-group="reference"]').getAttribute('open'), '');
      assert.deepEqual(errors, []); await page.close();
    }
    const request = await browser.newContext();
    const response = await request.request.get('http://127.0.0.1:5298/documents/sales-channels/facebook-ads.pdf', { headers: { Range: 'bytes=0-1023' } });
    assert.equal(response.status(), 206); assert.match(response.headers()['content-type'], /application\/pdf/); assert.match((await response.body()).subarray(0, 8).toString(), /^%PDF-/); assert.match(response.headers()['content-range'], /\/85739825$/);
    console.log('PASS: menu navigation, mobile layout, original 90-page PDF metadata, lazy reader, full-screen/download links, reload and PDF byte-range serving');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
