const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5296, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } }); const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      let canConfirmPayment=false,payments=[],savedBody=null;
      await page.route('**/js/auth.js', r => r.fulfill({ contentType: 'application/javascript', body: 'export async function getSession(){return {access_token:"test"}}' }));
      await page.route('**/api/daily-reports*', r => {
        if(r.request().method()==='POST'){
          savedBody=r.request().postDataJSON(); payments=[{revision:1,data:{month:savedBody.month,userId:'staff',dates:savedBody.dates,confirmedAt:'2026-11-11T15:01:00Z',confirmedBy:'DNG.HoaNTB6'}}];return r.fulfill({json:{payment:payments[0]}});
        }
        const query = new URL(r.request().url()).searchParams; assert.equal(query.get('summary'), 'late'); const start = query.get('from');
        assert.equal(r.request().headers().authorization, 'Bearer test');
        const plus=n=>new Date(Date.parse(start+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
        if(start.startsWith('2026-11'))assert.equal(start,'2026-11-09');
        r.fulfill({ json: { payments,canConfirmPayment,profiles: [{ id: 'staff', acc: 'DNG.ManLM3', role: 'staff' }, { id: 'ctv', role: 'ctv' }], reports: [{ user_id: 'staff', report_date: start, status: 'submitted', submitted_at: start + 'T22:00:00+07:00', data: {} }, { user_id: 'staff', report_date: plus(1), status: 'submitted', submitted_at: plus(1) + 'T22:00:01+07:00', data: {} }], trackingStart: start, serverTime: plus(2) + 'T15:00:01Z' } });
      });
      await page.route('**/late-check', r => r.fulfill({ contentType: 'text/html', body: '<link rel="stylesheet" href="/css/style.css"><link rel="stylesheet" href="/css/dailyReports.css"><section id="dailyReports" class="panel page-active"><article class="dr-card" id="root"></article></section><script type="module">import {installDailyLateSummary} from "/js/dailyLateSummary.js";installDailyLateSummary(document.getElementById("root"),"2026-11-27");import {installTableZoom} from "/js/tableZoom.js";installTableZoom(document.body);</script>' }));
      await page.goto('http://127.0.0.1:5296/late-check');
      await page.waitForFunction(() => document.querySelector('[data-late-total]').textContent.includes('40.000đ'));
      assert.equal(await page.locator('[data-late-rows] tr').count(), 1);
      await page.locator('.dr-late-tools .table-zoom-controls').waitFor();
      if(width===1440){const header=await page.locator('.dr-late-tools').boundingBox();const title=await page.locator('#root>.dr-card-head').boundingBox();assert.ok(header.y<title.y+title.height);assert.ok((await page.locator('[data-late-rows] tr').boundingBox()).height<=30);}
      assert.deepEqual(await page.locator('[data-late-rows] td').evaluateAll(cells=>cells.slice(0,5).map(cell=>cell.textContent)), ['DNG.ManLM3', '1', '1', '2', '40.000đ']);
      assert.match(await page.locator('[data-late-calendar]').textContent(), /không tính thứ Bảy và Chủ nhật/);
      await page.locator('[data-late-rows] [data-late-detail="late"]').click();
      assert.equal(await page.locator('[data-late-detail-rows] tr').count(), 1);
      assert.match(await page.locator('[data-late-detail-rows]').textContent(), /10\/11\/2026/);
      assert.match(await page.locator('[data-late-detail-rows]').textContent(), /22:00:01/);
      assert.match(await page.locator('[data-late-detail-rows]').textContent(), /1 giây/);
      await page.locator('[data-late-close]').click();
      await page.locator('[data-late-rows] [data-late-detail="overdue"]').click();
      assert.match(await page.locator('[data-late-detail-rows]').textContent(), /11\/11\/2026.*Chưa gửi.*1 giây/);
      await page.keyboard.press('Escape');
      await page.locator('[data-late-footer] [data-late-detail="count"]').first().click();
      assert.equal(await page.locator('[data-late-detail-rows] tr').count(), 2);
      await page.screenshot({path:'C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/daily-late-details-'+width+'.png'});
      await page.locator('[data-late-close]').click();
      await page.locator('[data-late-month]').fill('2026-10'); await page.locator('[data-late-month]').dispatchEvent('change');
      await page.waitForFunction(() => document.querySelector('[data-late-total]').textContent.includes('01/10/2026'));
      assert.match(await page.locator('[data-late-total]').textContent(), /2 lần × 20.000đ = 40.000đ/);
      assert.equal(await page.locator('[data-late-paid]').count(),0);
      canConfirmPayment=true; await page.reload(); await page.locator('[data-late-paid]').waitFor();
      await page.locator('[data-late-paid]').click(); await page.waitForFunction(()=>document.querySelector('[data-late-rows]').textContent.includes('Đã nộp đủ'));
      assert.equal(savedBody.action,'late-payment');assert.equal(savedBody.month,'2026-11');assert.deepEqual(savedBody.dates,['2026-11-10','2026-11-11']);
      assert.match(await page.locator('[data-late-rows]').textContent(),/Đã nộp 40.000đ/);assert.match(await page.locator('.dr-paid-label').getAttribute('title'),/DNG.HoaNTB6/);
      assert.equal(await page.locator('[data-late-paid]').count(),0);
      canConfirmPayment=false; await page.reload(); await page.waitForFunction(()=>document.querySelector('[data-late-rows]').textContent.includes('Đã nộp đủ'));
      assert.equal(await page.locator('[data-late-paid]').count(),0);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/daily-late-${width}.png` }); await page.close();
    }
    console.log('PASS: desktop/mobile monthly late counts, exact 22:00 exclusion, overdue inclusion, CTV exclusion and month switching');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
