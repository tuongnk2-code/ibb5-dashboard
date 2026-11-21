const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

(async()=>{
  const {createServer}=await import('../node_modules/vite/dist/node/index.js');
  const server=await createServer({server:{host:'127.0.0.1',port:5267,strictPort:true}});
  await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    for(const width of [320,390,430,1440]){
      const page=await browser.newPage({viewport:{width,height:1000}});
      const profiles=Array.from({length:18},(_,i)=>({id:'staff'+i,role:'staff',acc:i===0?'DNG.ChuongHM':'DNG.NhanSu'+i,team:i%3+1,created_at:'2026-11-01T00:00:00Z'}));
      await page.addInitScript(()=>{
        const OriginalDate=Date;
        window.Date=class extends OriginalDate{constructor(...args){super(...(args.length?args:['2026-11-21T06:00:00Z']));}static now(){return OriginalDate.parse('2026-11-21T06:00:00Z');}};
        window.IBB5_IMPORTED_DATA=[{id:'NET1',type:'Internet',staff:'DNG.ChuongHM',status:'Bình thường',created:'2026-11-20',date:'2026-11-21'}];
      });
      await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
      await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
      await page.route('**/api/daily-reports?**',r=>r.fulfill({json:{profiles,reports:[],metrics:{},trackingStart:'2026-11-01',serverTime:'2026-11-21T06:00:00Z'}}));
      await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'const profile={id:"manager",role:"manager",acc:"DNG.Manager"};window.IBB5_CURRENT_PROFILE=profile;document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");const {renderDailyReports}=await import("/js/dailyReports.js");renderDailyReports(document.getElementById("dailyReports"),profile,()=>null);'}));
      await page.route('https://**/*',r=>r.abort());
      await page.goto('http://127.0.0.1:5267/#dailyReports');
      await page.waitForSelector('.dr-person-alert');
      assert.equal(await page.locator('.dr-person-alert').count(),18,'all pending people retained');
      if(width<600){
        assert.ok(await page.locator('.dr-controls').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'date controls fit');
        assert.ok(await page.locator('#drAlerts>div').evaluate(el=>el.clientHeight<=150&&el.scrollHeight>el.clientHeight),'long pending list scrolls within compact area');
        assert.ok((await page.locator('.dr-stat').first().boundingBox()).height<100,'daily KPI compact');
      }
      await page.locator('[data-dr-filter="pending"]').click();
      assert.equal(await page.locator('#drFilter').inputValue(),'pending');
      await page.locator('.dr-person-alert').last().scrollIntoViewIfNeeded();
      await page.locator('.dr-person-alert').last().click();
      await page.locator('#drDetail').waitFor({state:'visible'});
      assert.match(await page.locator('#drDetailText').innerText(),/NhanSu17/);
      await page.locator('#drClose').click();
      await page.locator('#drDate').scrollIntoViewIfNeeded();
      if(process.env.REPORT_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.REPORT_SCREENSHOT_DIR}/daily-compact-${width}.png`});
      await page.evaluate(()=>{location.hash='weeklyReports'});
      await page.waitForSelector('#weeklyReports.page-active .wr-summary');
      if(width<600){
        assert.equal(await page.locator('.wr-summary').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),2);
        assert.ok(await page.locator('.wr-head .wr-tools').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'weekly date/team fit');
        assert.ok((await page.locator('.wr-summary').boundingBox()).height<200,'weekly summary compact');
      }
      const dateBefore=await page.locator('[data-week-date]').inputValue();
      await page.locator('[data-week-move="-7"]').click();
      assert.notEqual(await page.locator('[data-week-date]').inputValue(),dateBefore);
      await page.locator('[data-week-today]').click();
      assert.equal(await page.locator('[data-week-date]').inputValue(),'2026-11-21');
      await page.locator('[data-week-team]').selectOption('1');
      assert.match(await page.locator('[data-week-scope]').textContent(),/Bầy 1/);
      await page.locator('.wr-summary [data-week-kind="online"]').click();
      await page.locator('#weeklyContractDialog').waitFor({state:'visible'});
      await page.locator('#weeklyContractDialog [data-aged-close]').click();
      await page.locator('.wr-head').scrollIntoViewIfNeeded();
      if(process.env.REPORT_SCREENSHOT_DIR)await page.screenshot({path:`${process.env.REPORT_SCREENSHOT_DIR}/weekly-compact-${width}.png`});
      await page.close();
      console.log(`PASS ${width}px: compact daily/weekly summaries, filters, week navigation, pending-person detail and contract drilldown`);
    }
  }finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
