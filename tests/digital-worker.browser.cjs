const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {fixture}=require('./digital-worker-fixture.cjs');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5272,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const [width,role] of [[390,'staff'],[320,'staff'],[1440,'manager']]){
  const {people,tables,request,ids}=await fixture(),me=people.find(p=>p.id===ids[role]),page=await browser.newPage({viewport:{width,height:950}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));page.on('dialog',dialog=>dialog.accept());
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:`export async function getSession(){return {access_token:'${me.id}'}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}`}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(me)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
  await page.route('**/api/digital-worker',async r=>{const req=r.request(),result=await request(me.id,req.method(),req.method()==='POST'?req.postDataJSON():undefined);await r.fulfill({status:result.status,json:result.body});});
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5272/#digitalWorker');await page.locator('.dw-empty').waitFor();
  const root=page.locator('#digitalWorker');await root.locator('[data-tab="devices"]').click();await root.locator('[data-dw="connect"]').click();
  const device=page.locator('[data-dialog="device"]');await device.locator('[name="owner_id"]').selectOption(ids.staff);await device.locator('[name="name"]').fill('Máy nhân sự');await device.locator('[type="submit"]').click();await device.locator('.dw-connection').waitFor();
  assert.equal(tables.worker_devices.length,1);assert.equal(tables.worker_devices[0].token_hash.length,64);assert.equal(await page.locator('body').textContent().then(s=>s.includes(tables.worker_devices[0].token_hash)),false);
  const downloadPromise=page.waitForEvent('download');await device.locator('[data-dw="download-config"]').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'ibb5-worker.local.json');await device.getByRole('button',{name:'Đóng',exact:true}).click();
  await root.locator('[data-dw="new"]').click();const form=page.locator('[data-dialog="task"]');await form.locator('[name="owner_id"]').selectOption(ids.staff);await form.locator('[name="name"]').fill('Chăm khách cũ');await form.locator('[name="channel"]').selectOption('zalo_campaign');await form.locator('[name="device_id"]').selectOption(tables.worker_devices[0].id);await form.locator('[name="keywords"]').fill('nhà mới, căn hộ');await form.locator('[name="content"]').fill('Nội dung <img src=x onerror=alert(1)> đã duyệt');await form.locator('[name="when"]').fill('2027-01-01T08:00');await form.locator('[name="repeat_days"]').selectOption('1');await form.locator('[type="submit"]').click();await form.waitFor({state:'hidden'});
  await root.locator('[data-tab="tasks"]').click();assert.equal(tables.worker_tasks.length,1);assert.equal(tables.worker_tasks[0].enabled,false);assert.equal(tables.worker_runs.length,0);assert.equal(await root.locator('[data-action="run"]').isDisabled(),true);assert.equal(await root.locator('.dw-card img').count(),0);
  tables.worker_devices[0].capabilities=['zalo_campaign'];tables.worker_devices[0].last_seen_at=new Date().toISOString();await root.locator('[data-dw="reload"]').click();await root.locator('[data-action="run"]').waitFor();await page.waitForFunction(()=>!document.querySelector('#digitalWorker [data-action="run"]').disabled);
  await root.locator('#dwCommand').fill('Chạy Chăm khách cũ');await root.locator('[data-dw="command"]').click();const confirm=page.locator('[data-dialog="confirm"]');await confirm.waitFor();assert.equal(tables.worker_runs.length,0);assert.match(await confirm.textContent(),/Máy nhân sự/);await confirm.locator('[data-dw="confirm"]').click();await confirm.waitFor({state:'hidden'});assert.equal(tables.worker_runs.length,1);assert.equal(tables.worker_runs[0].status,'queued');assert.match(await root.locator('.dw-message').textContent(),/chưa ghi nhận hoàn tất/);
  await root.locator('[data-action="results"]').click();assert.match(await root.locator('.dw-body').textContent(),/Chờ máy thực hiện/);await root.locator('[data-action="cancel"]').click();await confirm.locator('[data-dw="confirm"]').click();await confirm.waitFor({state:'hidden'});assert.equal(tables.worker_runs[0].status,'cancelled');
  await root.locator('[data-tab="tasks"]').click();await root.locator('[data-action="enable"]').click();await confirm.locator('[data-dw="confirm"]').click();await confirm.waitFor({state:'hidden'});assert.equal(tables.worker_tasks[0].enabled,true);
  await root.locator('[data-action="pause"]').click();await confirm.locator('[data-dw="confirm"]').click();await confirm.waitFor({state:'hidden'});assert.equal(tables.worker_tasks[0].enabled,false);
  assert.ok(await root.evaluate(el=>el.scrollWidth<=el.clientWidth+2),'worker fits phone width');assert.deepEqual(errors,[]);
  if(process.env.WORKER_SCREENSHOTS){await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:process.env.WORKER_SCREENSHOTS+'/digital-worker-'+width+'.png',fullPage:false});}
  await page.close();
 }console.log('PASS: real scoped API + UI, 320/390/1440px, enrollment, private config download, drafts, capability gating, command preview, queue/cancel, enable/pause, escaped content');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exit(1)});
