const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const output = process.env.RESPONSIVE_SCREENSHOT_DIR;
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5176, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(10000);
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    const me = { id: 'manager', role: 'manager', full_name: 'Trưởng phòng', email: 'manager@example.com', acc: null };
    await page.route('**/js/auth.js', r => r.fulfill({ contentType: 'application/javascript', body: 'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}' }));
    await page.route('**/js/api.js', r => r.fulfill({ contentType: 'application/javascript', body: 'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}' }));
    await page.route('**/js/app-gate.js', r => r.fulfill({ contentType: 'application/javascript', body: `window.IBB5_CURRENT_PROFILE=${JSON.stringify(me)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');const {renderPermissions}=await import('/js/permissions.js');renderPermissions(document.getElementById('accountPanelRoot'),window.IBB5_CURRENT_PROFILE);const {renderDailyReports}=await import('/js/dailyReports.js');renderDailyReports(document.getElementById('dailyReportsRoot'),window.IBB5_CURRENT_PROFILE,()=>null);` }));
    await page.route('**/api/daily-reports*', r => r.fulfill({ json: new URL(r.request().url()).searchParams.has('history') ? { reports: [] } : { profiles: [me], reports: [], metrics: {}, previous: null, serverTime: new Date().toISOString() } }));
    await page.route('https://**/*', r => r.abort());
    await page.goto('http://127.0.0.1:5176'); await page.locator('#perfRows tr').first().waitFor({ state: 'attached' });
    const today = await page.evaluate(() => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
    assert.equal(await page.locator('#to').inputValue(), today);
    assert.equal(await page.locator('#pendAsOf').inputValue(), today);
    // Pin the historical fixture only after verifying the live default.
    await page.evaluate(() => { for(const [id,value] of Object.entries({from:'2026-10-01',to:'2026-10-30',pendAsOf:'2026-10-30',pendDailyDate:'2026-10-30',psDay:'2026-10-30'})){const el=document.getElementById(id);el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));} });
    const tabs = await page.locator('.sidebar .nav a').evaluateAll(links => links.map(a => a.hash.slice(1)));
    const failures = [];
    for (const width of [360, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const id of tabs) {
        await page.evaluate(id => { location.hash = id; }, id); await page.locator('#' + id + '.page-active').waitFor();
        const layout = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth, panel: document.querySelector('.panel.page-active').getBoundingClientRect().width }));
        if (layout.page > width + 2) {
          const offenders = await page.evaluate(() => [...document.querySelectorAll('.panel.page-active *')].map(el => ({ tag: el.tagName, cls: el.className, id: el.id, right: Math.round(el.getBoundingClientRect().right), width: Math.round(el.getBoundingClientRect().width) })).filter(e => e.right > innerWidth + 10).slice(0, 12));
          failures.push({ width, tab: id, ...layout, offenders });
        }
        if (output && [390, 1440].includes(width) && ['overview', 'performance', 'pendingContracts', 'account', 'dailyReports', 'lookup'].includes(id)) await page.screenshot({ path: output + '/responsive-' + id + '-' + width + '.png' });
      }
    }
    console.log('LAYOUT', JSON.stringify(failures));
    await page.evaluate(()=>{location.hash='performance'});await page.locator('#performance.page-active').waitFor();
    const performanceValues=await page.locator('#perfRows').innerHTML();
    for(const width of [1440,390]){
      await page.setViewportSize({width,height:900});
      assert.ok(await page.locator('#perfRows tr:not(.perf-team-total)').first().locator('td').nth(2).evaluate(el=>parseFloat(getComputedStyle(el).fontSize))>=16);
      await page.locator('#perfExpand').click();
      assert.equal(await page.locator('#perfExpand').getAttribute('aria-expanded'),'true');
      const bounds=await page.locator('#performance').boundingBox();assert.ok(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=width+1&&bounds.y+bounds.height<=901);
      if(output)await page.screenshot({path:output+'/performance-expanded-'+width+'.png'});
      assert.equal(await page.locator('#perfRows').innerHTML(),performanceValues);
      if(width===390)assert.ok(await page.locator('#performance > .tablewrap').evaluate(el=>{el.scrollLeft=200;return el.scrollLeft>0}));
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#perfExpand').getAttribute('aria-expanded'),'false');
      assert.equal(await page.evaluate(()=>document.body.classList.contains('perf-table-expanded')),false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('#mobileMenuToggle').click(); assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'), 'true');
    await page.locator('.sidebar a[href="#pendingContracts"]').click(); assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'), 'false'); assert.equal(await page.locator('#pendingContracts').isVisible(), true);
    const scrolling = page.locator('#pendingContracts .pending-scroll');
    assert.equal(await scrolling.evaluate(el => { el.scrollLeft = 300; return el.scrollLeft > 0; }), true);
    assert.equal(await page.locator('#pendingContracts .pending-table th').nth(1).evaluate(el => getComputedStyle(el).position), 'sticky');
    assert.equal(await page.locator('#pendingContracts .pending-table th').nth(2).evaluate(el => getComputedStyle(el).position), 'sticky');
    assert.deepEqual(await page.locator('#pendingContracts .ph-label').allTextContents().then(values => values.slice(0, 3)), ['Mã HĐ', 'Nhân viên bán', 'Tên Khách Hàng']);
    const staffHeader = page.locator('#pendingContracts .pending-table th').nth(1);
    const pinnedBefore = (await staffHeader.boundingBox()).x;
    const customerHeader = page.locator('#pendingContracts .pending-table th').nth(2);
    const customerBefore = (await customerHeader.boundingBox()).x;
    await scrolling.evaluate(el => { el.scrollLeft = 600; });
    assert.ok(Math.abs((await staffHeader.boundingBox()).x - pinnedBefore) < 2);
    assert.ok(Math.abs((await customerHeader.boundingBox()).x - customerBefore) < 2);
    assert.ok((await customerHeader.boundingBox()).x >= (await staffHeader.boundingBox()).x + (await staffHeader.boundingBox()).width - 1);
    const staffCell = page.locator('#pendRows tr[data-id]').first().locator('td').nth(1);
    assert.ok(Math.abs((await staffCell.boundingBox()).x - pinnedBefore) < 2);
    const staffFilter = page.getByLabel('Lọc Nhân viên bán', { exact: true });
    const staffValue = await staffFilter.locator('option').evaluateAll(options => options.find(o => o.value && !o.value.startsWith('__SORT_'))?.value);
    if (staffValue) {
      await staffFilter.selectOption(staffValue);
      for (const cell of await page.locator('#pendRows tr[data-id] td:nth-child(2)').all()) assert.ok((await cell.textContent()).startsWith(staffValue));
    }
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#pendExport').click();
    const download = await downloadPromise;
    const csv = require('node:fs').readFileSync(await download.path(), 'utf8');
    assert.ok(csv.includes('"Mã HĐ","Nhân viên bán","Tên Khách Hàng"'));
    assert.ok((await staffHeader.boundingBox()).width <= 120);
    const firstRow = page.locator('#pendRows tr[data-id]').first();
    const contractId = await firstRow.getAttribute('data-id');
    await firstRow.locator('.p-mobile-edit').click();
    const editor = page.locator('#pendingMobileEditor');
    await editor.waitFor();
    assert.ok((await editor.boundingBox()).width <= 390 - 22);
    if (output) await page.screenshot({ path: output + '/pending-mobile-editor.png' });
    await editor.locator('[name="expected"]').fill('2026-11-10');
    for (const field of ['timeSlot', 'action', 'result', 'source']) {
      const select = editor.locator('[name="' + field + '"]');
      const value = await select.locator('option').nth(1).getAttribute('value');
      await select.selectOption(value);
    }
    await editor.getByRole('button', { name: 'Lưu cập nhật', exact: true }).click();
    assert.equal(await editor.isVisible(), false);
    const saved = await page.evaluate(id => JSON.parse(localStorage.getItem('ibb5_pending_followup_v1'))[id], contractId);
    assert.equal(saved.expected, '2026-11-10'); assert.ok(saved.timeSlot && saved.action && saved.result && saved.source);
    await page.locator('#pendRows tr[data-id="' + contractId + '"] .p-mobile-edit').click();
    assert.equal(await editor.locator('[name="expected"]').inputValue(), '2026-11-10');
    await editor.locator('[name="expected"]').fill('2026-11-12');
    await editor.getByRole('button', { name: 'Hủy', exact: true }).click();
    assert.equal(await page.evaluate(id => JSON.parse(localStorage.getItem('ibb5_pending_followup_v1'))[id].expected, contractId), '2026-11-10');
    await page.locator('#mobileMenuToggle').click(); await page.locator('.sidebar a[href="#account"]').click();
    await page.locator('#accAddBtn').click(); assert.equal(await page.locator('#accAddForm').isVisible(), true);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
    await page.locator('#mobileMenuToggle').click(); await page.keyboard.press('Escape'); assert.equal(await page.locator('#mobileMenuToggle').getAttribute('aria-expanded'), 'false');
    await page.locator('#mobileMenuToggle').click(); await page.setViewportSize({ width: 1440, height: 900 }); assert.equal(await page.locator('#dashboardSidebar').evaluate(el => el.inert), false); assert.equal(await page.locator('#appShell>main').evaluate(el => el.inert), false);
    assert.deepEqual(errors, []); assert.equal(failures.length, 0);
    console.log('PASS: ' + tabs.length + ' tabs at five screen sizes, mobile navigation, Escape and resize recovery');
  } finally { await browser.close(); await server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
