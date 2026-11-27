const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5294, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }); const errors = [], forbidden = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('request', request => { if (/\/js\/(main|dashboardSync|api)\.js|\/api\/(?!dashboard-sync\?document=(?:sales-procedure|sales-channels))/.test(request.url())) forbidden.push(request.url()); });
      await page.route('**/js/auth.js', r => r.fulfill({ contentType: 'application/javascript', body: 'export async function getSession(){return {access_token:"test"}};export async function fetchMyProfile(){return {id:"ctv",role:"ctv"}};export async function signIn(){};export async function signOut(){};export async function callAdminUsersApi(method,body){if(body)window.testAccountBody=body;return {profiles:[]}}' }));
      await page.route('**/api/dashboard-sync?document=sales-procedure*', r => r.fulfill({ json: { document: { code: 'QT', title: 'Quy trình bán hàng', version: '1', originalHtml: '<p>Nội dung tài liệu</p>' }, documents: [{ code: 'QT', title: 'Quy trình bán hàng' }, { code: 'QD', title: 'Quy định lên hợp đồng' }] } }));
      await page.route('**/api/dashboard-sync?document=sales-channels*',r=>r.fulfill({json:{documents:[],canUpload:false}}));
      await page.route('https://**/*', r => r.abort());
      await page.goto('http://127.0.0.1:5294/#performance'); await page.locator('#spSearch').waitFor();
      assert.equal(new URL(page.url()).hash, '#scripts'); assert.equal(await page.locator('.content > section').count(), 3);
      assert.equal(await page.locator('.nav a').count(), 3); assert.equal(await page.locator('#sidebarAppActions').isVisible(), false);
      if (width < 1000) await page.locator('#mobileMenuToggle').click();
      await page.locator('.nav a[href="#regulations"]').click(); await page.locator('.qr-document-frame').waitFor();
      assert.equal(await page.locator('.qr-document-frame').getAttribute('sandbox'), '');
      if (width < 1000) assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'), 'false');
      if(width<1000)await page.locator('#mobileMenuToggle').click();
      await page.locator('.nav a[href="#channelDocuments"]').click();await page.locator('[data-chdoc-read]').waitFor();assert.equal(await page.locator('[data-chdoc-upload]').isVisible(),false);
      await page.evaluate(() => { location.hash = '#account'; }); await page.waitForFunction(() => location.hash === '#scripts');
      await page.screenshot({ path: `C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/ctv-${width}.png` });
      assert.deepEqual(errors, []); assert.deepEqual(forbidden, []);
      if (width === 1440) {
        await page.evaluate(async () => { document.body.innerHTML = '<div id="testAccounts"></div>'; const { renderPermissions } = await import('/js/permissions.js'); await renderPermissions(document.getElementById('testAccounts'), { id: 'manager', role: 'manager', full_name: 'TP', email: 'tp@example.test' }); });
        await page.locator('#accAddBtn').click(); await page.locator('[name="role"]').selectOption('ctv');
        assert.equal(await page.locator('#accAccWrap').isVisible(), false);
        await page.locator('[name="full_name"]').fill('CTV Test'); await page.locator('[name="username"]').fill('ctv.test'); await page.locator('[name="password"]').fill('test-password');
        await page.locator('#accForm button[type="submit"]').click(); await page.waitForFunction(() => window.testAccountBody?.role === 'ctv');
        assert.equal(await page.evaluate(() => window.testAccountBody.acc), null);
      }
      await page.close();
    }
    console.log('PASS: CTV desktop/mobile login, three permitted modules only, direct-link guard, full document, mobile menu, no operational requests');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

