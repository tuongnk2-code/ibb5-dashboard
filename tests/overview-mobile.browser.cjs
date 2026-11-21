const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5266, strictPort: true } });
  await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  try {
    for (const width of [320, 390, 430, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 950 } });
      await page.route('**/js/auth.js', r => r.fulfill({ contentType: 'application/javascript', body: 'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}' }));
      await page.route('**/js/api.js', r => r.fulfill({ contentType: 'application/javascript', body: 'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}' }));
      await page.route('**/js/app-gate.js', r => r.fulfill({ contentType: 'application/javascript', body: 'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");' }));
      await page.route('https://**/*', r => r.abort());
      await page.goto('http://127.0.0.1:5266/#overview');
      await page.waitForSelector('#overview .overview-efficiency .ov-metric');
      const layout = await page.evaluate(() => {
        const groups = ['.overview-five', '.overview-efficiency', '.dailygrid', '#ibbQualitySummary'].map(selector => {
          const el = document.querySelector('#overview ' + selector);
          return { selector, columns: getComputedStyle(el).gridTemplateColumns.split(' ').length };
        });
        const cards = [...document.querySelectorAll('#overview .ov-metric')].map(el => ({ height: el.getBoundingClientRect().height, overflow: el.scrollWidth > el.clientWidth + 1 }));
        const picker = document.querySelector('.previous-day-picker input');
        const priority = [...document.querySelector('.overview-priority').children].map(el => ({width: el.getBoundingClientRect().width, height:el.getBoundingClientRect().height, overflow:el.scrollWidth>el.clientWidth+1}));
        return { groups, cards, priority, pickerOverflow: picker.getBoundingClientRect().right > picker.parentElement.getBoundingClientRect().right + 1 };
      });
      if (width < 600) {
        for (const group of layout.groups) assert.equal(group.columns, 2, `${width}: ${group.selector}`);
        assert.ok(layout.cards.every(card => card.height < 220), `${width}: compact heights`);
        assert.ok(layout.cards.every(card => !card.overflow), `${width}: no clipped content`);
        assert.equal(layout.pickerOverflow, false, `${width}: date input fits`);
        assert.ok(layout.priority[0].width > layout.priority[1].width * 1.9, `${width}: plan spans both columns`);
        assert.equal(layout.priority[1].width, layout.priority[2].width, `${width}: forecast and gap share a row`);
        assert.ok(layout.priority.every(card => card.height < 200 && !card.overflow), `${width}: compact priority cards without clipping`);
      } else {
        assert.equal(layout.groups[0].columns, 5);
        assert.equal(layout.groups[1].columns, 6);
        assert.equal(layout.groups[2].columns, 4);
      }
      await page.locator('#overview .overview-priority').scrollIntoViewIfNeeded();
      if (process.env.OVERVIEW_SCREENSHOT_DIR) await page.screenshot({ path: `${process.env.OVERVIEW_SCREENSHOT_DIR}/overview-compact-${width}.png` });
      console.log(JSON.stringify({ width, ...layout }));
      for (const tab of ['pendingContracts', 'performance']) {
        await page.evaluate(tab => { location.hash = tab; }, tab);
        await page.waitForFunction(tab => document.getElementById(tab).classList.contains('page-active'), tab);
        const selector = tab === 'pendingContracts' ? '.pending-metrics' : '#dpKpis';
        await page.waitForSelector(`#${tab} ${selector}`);
        const summary = await page.locator(`#${tab} ${selector}`).evaluate(el => ({
          columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
          cards:[...el.children].map(card=>({height:card.getBoundingClientRect().height,overflow:card.scrollWidth>card.clientWidth+1})),
        }));
        if (width < 600) {
          assert.equal(summary.columns,2,`${width}: ${tab} two-column summary`);
          assert.ok(summary.cards.every(card=>card.height<240&&!card.overflow),`${width}: ${tab} compact readable cards`);
          const controls=await page.locator(tab==='performance'?'#performance .dp-controls':'#pendingContracts .pending-title').evaluate(el=>el.scrollWidth<=el.clientWidth+1);
          assert.ok(controls,`${width}: ${tab} controls fit`);
        }
        await page.locator(`#${tab} ${selector}`).scrollIntoViewIfNeeded();
        if(process.env.OVERVIEW_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.OVERVIEW_SCREENSHOT_DIR}/${tab}-compact-${width}.png`});
        console.log(JSON.stringify({width,tab,...summary}));
      }
      await page.close();
    }
    console.log('PASS: compact two-column phone KPIs, readable content/date input, unchanged desktop columns');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
