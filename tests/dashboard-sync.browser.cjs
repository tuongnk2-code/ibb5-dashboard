const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const { unpackState, stateSignature } = await import('../js/dashboardStateModel.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const records = new Map(), errors = [];
  const date = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const legacy = { snapshot: { data: [{ id:'SYNC1',type:'Internet',staff:'DNG.ManLM3',created:date,date,room:'IBB5',customer:'Khách đồng bộ' }], meta:{} }, commitments: { [date.slice(0,7)]: { __ALL__: { manager:{value:400,status:'signed'},staff:{'DNG.ManLM3':{value:40,status:'approved'}} } } }, notes: { SYNC1:{expected:date,action:'Hẹn KH',result:'Chờ',source:'Zalo',timeSlot:'8h - 10h'} } };
  legacy.snapshot.data.push(
    { id:'SYNC1',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' },
    { id:'CAM_ONLY',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' }
  );
  const previousDate = new Date(date.slice(0,7)+'-01T12:00:00Z');
  previousDate.setUTCMonth(previousDate.getUTCMonth()-1);
  for(const id of ['PREV1','PREV2']) legacy.snapshot.data.push({id,type:'Internet',staff:'DNG.ManLM3',created:previousDate.toISOString().slice(0,10),date:previousDate.toISOString().slice(0,10),room:'IBB5'});
  async function device(manager) {
    const context = await browser.newContext({ viewport: {width:manager?1440:390,height:844} });
    if(manager) await context.addInitScript(old => { localStorage.setItem('ibb5_three_source_snapshot_v1',JSON.stringify(old.snapshot));localStorage.setItem('fpt_ibb_monthly_commitments_v2',JSON.stringify(old.commitments));localStorage.setItem('ibb5_pending_followup_v1',JSON.stringify(old.notes)); },legacy);
    await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:`export async function getSession(){return {access_token:'test'}};export async function signOut(){};export async function signIn(){};export async function fetchMyProfile(){return {id:'${manager?'manager':'staff'}',role:'${manager?'manager':'staff'}',acc:'DNG.ManLM3'}};export async function callAdminUsersApi(){return {profiles:[]}}`}));
    await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
    await context.route('**/api/dashboard-sync*',async route=>{
      const req=route.request();
      if(req.method()==='GET')return route.fulfill({json:req.url().includes('versions=1')?{signature:stateSignature([...records.values()])}:unpackState([...records.values()])});
      const body=req.postDataJSON();
      if(body.kind==='migrate') { records.set('snapshot',{key:'snapshot',revision:1,data:body.snapshot});for(const [m,rooms]of Object.entries(body.commitments))for(const [room,data]of Object.entries(rooms))records.set('commit:'+m+':'+room,{key:'commit:'+m+':'+room,revision:1,data});for(const [id,data]of Object.entries(body.notes))records.set('pending:'+id,{key:'pending:'+id,revision:1,data});return route.fulfill({json:{ok:true}}); }
      const key='pending:'+body.id,row={key,revision:body.revision+1,data:body.value};records.set(key,row);return route.fulfill({json:{row}});
    });
    await context.route('**/api/daily-reports*',r=>r.fulfill({json:{profiles:[],reports:[],metrics:{},previous:null}}));
    await context.route('https://**/*',r=>r.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5177');await page.locator('#dashboardSyncBtn').waitFor();return {context,page};
  }
  try {
    const desktop=await device(true),mobile=await device(false);
    for(const {page} of [desktop,mobile]) {
      assert.equal(await page.locator('#to').inputValue(),date);
      assert.equal(await page.evaluate(()=>window.IBB5_IMPORTED_DATA[0].id),'SYNC1');
      assert.equal(await page.evaluate(d=>window.IBB5_MONTHLY_TARGET(d.slice(0,7),'DNG.ManLM3'),date),40);
      assert.equal(await page.evaluate(()=>window.IBB5_PENDING_NOTES.SYNC1.action),'Hẹn KH');
      // New Camera imports must work even though the old metadata lacks these IDs.
      assert.equal(await page.locator('#cameraKpi').textContent(),'2');
      assert.equal(await page.locator('[data-k="camera"]').textContent(),'1 / 1');
      assert.equal(await page.locator('[data-k="coverage"]').textContent(),'100%');
      assert.equal(await page.locator('#growth').textContent(),'-50%');
      assert.match(await page.locator('#growthNote').textContent(),/2 HĐ · Giảm 1 HĐ/);
      await page.locator('#to').evaluate(el=>{el.value='2001-01-04';el.dispatchEvent(new Event('change',{bubbles:true}));});
      assert.equal(await page.locator('#growth').textContent(),'—');
      assert.match(await page.locator('#growthNote').textContent(),/Chưa có dữ liệu NET tháng 2000-12/);
      await page.locator('#to').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},date);
    }
    assert.equal(await mobile.page.evaluate(()=>localStorage.getItem('ibb5_three_source_snapshot_v1')),null);
    await desktop.page.evaluate(async()=>{await window.IBB5_SYNC.pending('SYNC1',{expected:'2026-11-10',action:'Đã gọi',result:'Chờ',source:'Zalo',timeSlot:'8h - 10h'});});
    await mobile.page.reload();await mobile.page.locator('#dashboardSyncBtn').waitFor();
    assert.equal(await mobile.page.evaluate(()=>window.IBB5_PENDING_NOTES.SYNC1.action),'Đã gọi');
    assert.deepEqual(errors,[]);console.log('PASS: true login bootstrap migrates desktop data; fresh mobile reads the same contracts, targets and saved notes; Vietnam today default');
  } finally {await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
