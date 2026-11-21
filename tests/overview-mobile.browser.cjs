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
      const assertHidden=async selectors=>{
        for(const selector of selectors){
          const elements=page.locator(selector);
          assert.ok(await elements.count(),`caption exists: ${selector}`);
          for(const element of await elements.all())assert.equal(await element.isVisible(),false,`${width}: hidden caption ${selector}`);
        }
      };
      await assertHidden(['#appShell .top .ibb-top-subtitle','#appShell .footer','#rangeLabel','#overview .ibb-kpi-section-title:not(.ibb-kpi-quality-title)>small','#ibbCaptureOverview>p.note','#ibb5Analytics>.ana-muted','#ibb5Analytics .ana-card:has(>#anaTrend)>.ana-muted','#ibb5Analytics .trk-description','#ibb5Analytics .ana-overdue-card>.ana-muted','#anaOldScope','#anaShareScope','#ibb5Analytics .ana-card:has(>#anaChannelBars)>.ana-muted','#anaMonthlyScope']);
      assert.ok(await page.locator('#anaMonth').isVisible());
      if(width===1440)assert.ok(await page.locator('#overview .ibb-kpi-quality-title>small').isVisible(),'unselected quality caption remains on desktop');
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
        if(tab==='pendingContracts'){
      await page.addInitScript(() => {
        const OriginalDate=Date;
        window.Date=class extends OriginalDate {constructor(...args){super(...(args.length?args:['2026-11-21T06:00:00Z']));}static now(){return OriginalDate.parse('2026-11-21T06:00:00Z');}};
        window.IBB5_IMPORTED_DATA=['THAAR8980','DAAAR1234','DAAAR5678'].map(id=>({id,staff:'DNG.ChuongHM',type:'Internet',created:'2026-11-01',date:'',status:'Bình thường',customer:'Khách thử nghiệm'}));
        window.IBB5_PENDING_NOTES=Object.fromEntries(window.IBB5_IMPORTED_DATA.map(row=>[row.id,{result:'Chưa Online',expected:'2026-11-21',timeSlot:'10h - 12h',action:'Chờ lắp',source:'Web',updated:'2026-11-21T05:00:00Z'}]));
      });
          await page.goto('http://127.0.0.1:5266/#pendingContracts');
          await page.reload();
        }
        await page.evaluate(tab => { location.hash = tab; }, tab);
        await page.waitForFunction(tab => document.getElementById(tab).classList.contains('page-active'), tab);
        const selector = tab === 'pendingContracts' ? '.pending-metrics' : '#dpKpis';
        await page.waitForSelector(`#${tab} ${selector}`);
        await assertHidden(tab==='performance'?['#performance>.heading .sub','#performance>p.note','#performance .dp-heading>p']:['#pendingContracts .pending-title>div>p','#psSummary','#pendingContracts .ps-note','#remainingOnlineSchedule .rc-summary']);
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
        if(tab==='performance'){
          assert.equal(await page.locator('#perfFontSize').textContent(),width<600?'12px':'20px');
          const cells=page.locator('#perfRows .perf-person-cell');
          const row=cells.first().locator('..');
          if(width<600){
            assert.ok((await row.boundingBox()).height<=40,'compact staff row including wrapped missing-data note');
            assert.equal(await page.locator('.perf-table').evaluate(el=>getComputedStyle(el).minWidth),'900px');
            await page.locator('#perfFontIncrease').click();
            assert.equal(await page.locator('#perfFontSize').textContent(),'14px');
            await page.setViewportSize({width:1440,height:950});
            await page.waitForFunction(()=>document.querySelector('#perfFontSize').textContent==='20px');
            await page.setViewportSize({width,height:950});
            await page.waitForFunction(()=>document.querySelector('#perfFontSize').textContent==='14px');
            await page.locator('#perfFontDecrease').click();
            assert.equal(await page.locator('#perfFontSize').textContent(),'12px');
            await page.locator('#perfTableCapture').evaluate(el=>{el.scrollLeft=350});
            assert.ok(await cells.first().evaluate(el=>Math.abs(el.getBoundingClientRect().left-el.closest('.tablewrap').getBoundingClientRect().left)<5),'staff identifier stays pinned');
            await page.locator('#perfTableCapture').evaluate(el=>{el.scrollLeft=0});
          }
          await page.locator('#perfTableCapture').scrollIntoViewIfNeeded();
          if(process.env.OVERVIEW_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.OVERVIEW_SCREENSHOT_DIR}/staff-table-compact-${width}.png`});
        }
        if(tab==='pendingContracts'){
          const reasonFilter=page.locator('.ph-filter[data-field="action"]');
          assert.equal(await reasonFilter.locator('option[value="Hủy lên lại"]').count(),1,'standard re-sign reason remains available');
          assert.equal(await page.locator('#pendRows .p-note').first().locator('option[value="Hủy lên lại"]').count(),1,'editable reason retained');
          await reasonFilter.selectOption('Hủy lên lại');
          assert.equal(await page.locator('#pendRows tr[data-id]').count(),0,'no matching contracts yields empty list');
          assert.equal(await reasonFilter.inputValue(),'Hủy lên lại','selected empty reason remains available');
          assert.equal(await reasonFilter.locator('option[value="KH chưa đồng ý PHM"]').count(),1,'other standard reasons remain');
          await reasonFilter.selectOption('Chờ lắp');
          assert.equal(await page.locator('#pendRows tr[data-id]').count(),3,'previously saved custom reason still filters');
          await reasonFilter.selectOption('');
          const appointments=page.locator('#psRows tr:not(.ps-team):not(.ps-total)');
          assert.equal(await appointments.count(),1);
          assert.equal(await appointments.locator('[data-schedule-id]').count(),3);
          if(width<600){
            assert.ok((await appointments.boundingBox()).height<160,`${width}: only occupied appointment slots take space`);
            assert.equal(await appointments.locator('.ps-blank').isVisible(),false);
            assert.ok(await appointments.locator('td[data-label="10h - 12h"]').isVisible());
            for(const label of ['8h - 10h','13h30 - 15h30','15h30 - 17h30','Chưa chọn mốc'])assert.equal(await appointments.locator(`td[data-label="${label}"]`).isVisible(),false);
            for(const cell of await page.locator('#psRows .ps-empty-slot').all())assert.equal(await cell.isVisible(),false);
            for(const row of await page.locator('#psRows .ps-team,#psRows .ps-total').all())assert.ok((await row.boundingBox()).height<200,`${width}: compact totals`);
          }else{
            for(const cell of await page.locator('#psRows .ps-empty-slot').all())assert.ok(await cell.isVisible(), 'desktop retains all time columns');
          }
          await page.locator('#pendingSchedule').scrollIntoViewIfNeeded();
          if(process.env.OVERVIEW_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.OVERVIEW_SCREENSHOT_DIR}/schedule-compact-${width}.png`});
        }
      }
      await page.close();
    }
    console.log('PASS: compact two-column phone KPIs, readable content/date input, unchanged desktop columns');
  } finally { await browser.close(); await server.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
