const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5299, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.addInitScript(() => {
        window.IBB5_IMPORTED_DATA = ['A','B','C','OUT'].map(id => ({ id, type:'Internet', created:'2026-11-01', date:'', staff:id==='OUT'?'DNG.Vypv':'DNG.ManLM3', room:'IBB5', customer:id, status:'Bình thường' }));
        window.IBB5_PENDING_NOTES = { A:{expected:'2026-11-27',source:'Web'}, B:{expected:'2026-11-28',source:'FaceBook ADS'}, C:{expected:'2026-12-04',source:'Web'}, OUT:{expected:'2026-11-27',source:'Web'} };
        window.IBB5_SHARED_STATE = { notes:window.IBB5_PENDING_NOTES, commitments:{}, revisions:{} };
      });
      await page.route('**/js/auth.js', r => r.fulfill({ contentType:'application/javascript', body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}' }));
      await page.route('**/js/api.js', r => r.fulfill({ contentType:'application/javascript', body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}' }));
      await page.route('**/js/app-gate.js', r => r.fulfill({ contentType:'application/javascript', body:'window.IBB5_CURRENT_PROFILE={id:"staff",role:"staff",acc:"DNG.ManLM3"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");' }));
      await page.route('https://**/*', r => r.abort());
      await page.goto('http://127.0.0.1:5299/#pendingContracts'); await page.waitForFunction(() => typeof window.IBB5_MONTHLY_TARGET === 'function');
      const filter = page.locator('.ph-filter[data-field="expected"]'), dialog = page.locator('.pending-expected-dialog');
      const ids = () => page.locator('#pendRows tr[data-id]').evaluateAll(rows => rows.map(row => row.dataset.id).sort());
      assert.deepEqual(await ids(), ['A','B','C']);
      await filter.selectOption('__EXPECTED_MONTH__'); await dialog.locator('[data-expected-month]').fill('2026-11'); await dialog.locator('button[type=submit]').click();
      assert.deepEqual(await ids(), ['A','B']); assert.match(await filter.locator('option:checked').textContent(), /11\/2026/);
      await page.locator('.ph-filter[data-field="source"]').selectOption('Web'); assert.deepEqual(await ids(), ['A']);
      await page.locator('.ph-filter[data-field="source"]').selectOption('');
      await filter.selectOption('__EXPECTED_DAYS__'); await dialog.locator('input[value="2026-11-28"]').check(); await dialog.locator('input[value="2026-12-04"]').check(); await dialog.locator('button[type=submit]').click();
      assert.deepEqual(await ids(), ['B','C']); assert.equal(await filter.locator('option:checked').textContent(), '2 ngày đã chọn');
      await filter.selectOption('__EXPECTED_MONTH__'); await page.keyboard.press('Escape'); assert.deepEqual(await ids(), ['B','C']);
      await filter.selectOption('__EXPECTED_ACTIVE__'); await dialog.locator('[data-expected-clear]').click(); assert.deepEqual(await ids(), ['A','B','C']);
      await filter.selectOption('2026-11-27'); assert.deepEqual(await ids(), ['A']);
      assert.equal(await page.locator('#pendRows .p-date').inputValue(), '2026-11-27');
      await filter.selectOption(''); await filter.selectOption('__SORT_ZA__'); assert.deepEqual(await page.locator('#pendRows tr[data-id]').evaluateAll(rows => rows.map(row => row.dataset.id)), ['C','B','A']);
      await filter.selectOption('__EXPECTED_DAYS__');
      await page.screenshot({ path:`C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/pending-expected-filter-${width}.png` });
      assert.deepEqual(errors, []); await page.close();
    }
    console.log('PASS: month, multiple dates across months, cancel/reset, intersecting column filters, single date, sort and staff scope on desktop/mobile');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode=1; });
