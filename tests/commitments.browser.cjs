const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const { unpackState, stateSignature, mergeNetSnapshot, validateNote, isCancellationResult, commitmentTarget } = await import('../js/dashboardStateModel.js');
  const { importAudit } = await import('../api/_dashboardState.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const records = new Map(), reports = new Map(), errors = [];let failCancellation=false;
  const profiles=[{id:'manager',role:'manager',acc:'DNG.Manager'}, {id:'lead',role:'lead',acc:'DNG.HoaNTB6',team:3}, {id:'staff',role:'staff',acc:'DNG.ManLM3',team:3}, {id:'outside',role:'staff',acc:'DNG.Vypv',team:1}];
  const date = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const legacy = { snapshot: { data: [{ id:'SYNC1',type:'Internet',staff:'DNG.ManLM3',created:date,date,room:'IBB5',customer:'Khách đồng bộ' }], meta:{} }, commitments: { [date.slice(0,7)]: { __ALL__: { manager:{value:400,status:'signed'},staff:{'DNG.ManLM3':{value:40,status:'approved'}} } } }, notes: { SYNC1:{expected:date,action:'Hẹn KH',result:'Chờ',source:'Zalo',timeSlot:'8h - 10h'} } };
  legacy.snapshot.data.push(
    { id:'SYNC1',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' },
    { id:'CAM_ONLY',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' }
  );
  legacy.snapshot.data[0].status='Đã chấm dứt hợp đồng';
  legacy.snapshot.data[0].netClbh='Tra truoc 3T 615k/3T';
  legacy.snapshot.meta={files:{Internet:{name:'net-old.xlsx',count:1,acc:'DNG.OldNet',updated:'2026-11-01T01:00:00Z'},Camera:{name:'cam-old.xlsx',count:2,acc:'DNG.OldCam',updated:'2026-11-02T02:00:00Z'},'Truyền hình':{name:'tv-old.xlsx',count:1,acc:'DNG.OldTv',updated:'2026-11-03T03:00:00Z'}}};
  legacy.snapshot.data[0].prepaid=0; // The CLBH policy is authoritative.
  const oldDate=new Date(Date.parse(date+'T12:00:00Z')-8*86400000).toISOString().slice(0,10);
  legacy.snapshot.data.push({id:'OVERDUE1',type:'Internet',staff:'DNG.ManLM3',created:oldDate,date:'',room:'IBB5',sourceExcel:'IBB'},
    {id:'PRIVATE1',type:'Internet',staff:'DNG.Vypv',created:oldDate,date:'',room:'IBB5',sourceExcel:'IBB'});
  legacy.notes.OVERDUE1={expected:date,action:'Khách hẹn cuối tuần',result:'Đã gọi',source:'Zalo',timeSlot:'8h - 10h'};
  const previousDate = new Date(date.slice(0,7)+'-01T12:00:00Z');
  previousDate.setUTCMonth(previousDate.getUTCMonth()-1);
  for(const id of ['PREV1','PREV2']) legacy.snapshot.data.push({id,type:'Internet',staff:'DNG.ManLM3',created:previousDate.toISOString().slice(0,10),date:previousDate.toISOString().slice(0,10),room:'IBB5'});
  async function device(manager,role=manager?'manager':'staff') {
    const context = await browser.newContext({ viewport: {width:manager?1440:390,height:844} });
    if(manager) await context.addInitScript(old => { localStorage.setItem('ibb5_three_source_snapshot_v1',JSON.stringify(old.snapshot));localStorage.setItem('fpt_ibb_monthly_commitments_v2',JSON.stringify(old.commitments));localStorage.setItem('ibb5_pending_followup_v1',JSON.stringify(old.notes)); },legacy);
    await context.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:`export async function getSession(){return {access_token:'test'}};export async function signOut(){};export async function signIn(){};export async function fetchMyProfile(){return {id:'${role}',role:'${role}',acc:'DNG.ManLM3'}};export async function callAdminUsersApi(){return {profiles:[]}}`}));
    await context.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
    await context.route('**/api/dashboard-sync*',async route=>{
      const req=route.request();
      if(req.method()==='GET'){
        const query=new URL(req.url()).searchParams,rows=[...records.values()];
        return route.fulfill({json:query.has('keys')?{rows:JSON.parse(query.get('keys')).map(key=>records.get(key)).filter(Boolean)}:query.has('versions')?{signature:stateSignature(rows),revisions:Object.fromEntries(rows.map(row=>[row.key,row.revision]))}:unpackState(rows)});
      }
      const body=req.postDataJSON();
      if(body.kind==='cancelPending'&&role!=='manager')return route.fulfill({status:403,json:{error:'Chỉ Trưởng phòng được duyệt hủy hợp đồng.'}});
      if(body.kind==='cancelPending'&&failCancellation){failCancellation=false;return route.fulfill({status:500,json:{error:'Không lưu được dữ liệu thử nghiệm'}});}
      if(body.kind==='migrate') { records.set('snapshot',{key:'snapshot',revision:1,data:body.snapshot});for(const [m,rooms]of Object.entries(body.commitments))for(const [room,data]of Object.entries(rooms))records.set('commit:'+m+':'+room,{key:'commit:'+m+':'+room,revision:1,data});for(const [id,data]of Object.entries(body.notes))records.set('pending:'+id,{key:'pending:'+id,revision:1,data});return route.fulfill({json:{ok:true}}); }
      if(body.kind==='snapshot'&&!['manager','lead'].includes(role))return route.fulfill({status:403,json:{error:'Không có quyền nhập dữ liệu'}});
      if(body.kind==='snapshot'&&(records.get('snapshot')?.revision||0)!==body.revision)return route.fulfill({status:409,json:{error:'Dữ liệu đã thay đổi'}});
      if(body.kind==='snapshot'){const previous=records.get('snapshot')?.data,row={key:'snapshot',revision:body.revision+1,data:mergeNetSnapshot(previous,body.snapshot)};row.data.meta=importAudit(previous?.meta,row.data.meta,body.types||[],{id:role,acc:profiles.find(p=>p.id===role).acc},new Date().toISOString(),row.data.data);records.set('snapshot',row);return route.fulfill({json:{row}});}
      const key=body.kind==='commit'?'commit:'+body.month+':'+(body.room||'__ALL__'):'pending:'+body.id;
      if(body.kind==='commit'&&Object.hasOwn(body,'expectedTarget')){
        const previous=records.get(key),data=structuredClone(previous?.data||{manager:null,staff:{}});
        if(JSON.stringify(commitmentTarget(data,body.action,body.acc))!==JSON.stringify(body.expectedTarget))return route.fulfill({status:409,json:{error:'Cam kết này vừa được sửa hoặc duyệt trên thiết bị khác.',row:previous}});
        if(body.action==='sign')data.manager={value:body.value,status:'signed',signedAt:new Date().toISOString()};
        else if(body.action==='submit')data.staff[body.acc]={value:body.value,plan:body.plan,status:'pending',submittedAt:new Date().toISOString()};
        else data.staff[body.acc]={...data.staff[body.acc],status:body.action==='approve'?'approved':'rejected',reviewedAt:new Date().toISOString()};
        const row={key,revision:(previous?.revision||0)+1,data};records.set(key,row);await new Promise(resolve=>setTimeout(resolve,250));return route.fulfill({json:{row}});
      }
      if((records.get(key)?.revision||0)!==body.revision)return route.fulfill({status:409,json:{error:'Dữ liệu đã thay đổi trên thiết bị khác. Nội dung đang nhập được giữ lại; bấm Bỏ sửa để lấy bản mới.'}});
      let data=body.value;
      if(body.kind==='pending'){try{data={...validateNote(body.value),updated:new Date().toISOString()}}catch(err){return route.fulfill({status:400,json:{error:err.message}})}}
      if(body.kind==='cancelPending'&&(!isCancellationResult(records.get(key)?.data.result)||!records.get(key)?.data.cancelReason))return route.fulfill({status:400,json:{error:'Cần kết quả Hủy và lý do hủy trước khi duyệt'}});
      if(body.kind==='cancelPending')data={...records.get(key)?.data,cancellationApproved:true,cancellationApprovedBy:role,cancellationApprovedAt:new Date().toISOString()};
      if(body.kind==='commit'){data=structuredClone(records.get(key)?.data||{manager:null,staff:{}});data.staff[body.acc]={value:body.value,plan:body.plan,status:'pending'};}
      const row={key,revision:body.revision+1,data};records.set(key,row);return route.fulfill({json:{row}});
    });
    await context.route('**/api/daily-reports*',route=>{
      const request=route.request(),query=new URL(request.url()).searchParams;
      if(request.method()==='POST'){
        const body=request.postDataJSON(),report={user_id:role,report_date:body.date,status:'submitted',data:{...body.data,online:2,monthlyOnline:2},revision:(reports.get(role)?.revision||0)+1,submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()};reports.set(role,report);return route.fulfill({json:{report}});
      }
      const visible=profiles.filter(p=>role==='manager'||p.id===role||(role==='lead'&&p.team===3));
      const visibleReports=[...reports.values()].filter(r=>query.has('history')?r.user_id===role:visible.some(p=>p.id===r.user_id));
      return route.fulfill({json:{profiles:visible,reports:visibleReports,metrics:Object.fromEntries(visible.map(p=>[p.id,{online:2,monthlyOnline:2}])),previous:null,serverTime:new Date().toISOString()}});
    });
    await context.route('https://**/*',r=>r.abort());
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5177');await page.locator('#dashboardSyncBtn').waitFor({state:'attached'});await page.waitForFunction(()=>document.getElementById('ckRows')?.children.length>0);await page.evaluate(()=>document.querySelector('.staff-encouragement')?.close());return {context,page};
  }
  try {
    const desktop=await device(true),mobile=await device(false),lead=await device(false,'lead');
    await desktop.page.evaluate(()=>{const input=document.getElementById('ckManagerGoal');input.value='777';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await mobile.page.evaluate(async month=>{await window.IBB5_SYNC.commit({action:'submit',month,room:'__ALL__',acc:'DNG.ManLM3',value:55,plan:'Kế hoạch mới'});},date.slice(0,7));
    // Permission rows: manager sees all, staff sees self, lead sees own team.
    assert.equal(await desktop.page.locator('#ckRows tr').count(),17);
    assert.equal(await mobile.page.locator('#ckRows tr').count(),1);
    assert.equal(await mobile.page.locator('.ck-manager').isVisible(),false);assert.equal(await mobile.page.locator('[data-approve]').count(),0);
    assert.equal(await lead.page.locator('#ckRows tr').count(),8);
    for(const {page} of [desktop,mobile])await page.evaluate(()=>{location.hash='commitments'});
    await mobile.page.locator('[data-goal="DNG.ManLM3"]').fill('56');
    desktop.page.once('dialog',dialog=>dialog.accept());
    await Promise.all([desktop.page.locator('#ckSign').click(),mobile.page.locator('[data-submit="DNG.ManLM3"]').click()]);
    await Promise.all([desktop.page.waitForFunction(()=>document.getElementById('ckSaveStatus').textContent==='Đã lưu cam kết thành công.'),mobile.page.waitForFunction(()=>document.getElementById('ckSaveStatus').textContent==='Đã lưu cam kết thành công.')]);
    assert.equal(records.get('commit:'+date.slice(0,7)+':__ALL__').data.manager.value,777);
    assert.equal(records.get('commit:'+date.slice(0,7)+':__ALL__').data.staff['DNG.ManLM3'].value,56);
    assert.equal(await mobile.page.locator('[data-submit="DNG.ManLM3"]').isEnabled(),true);
    // A real conflict preserves typed content and loads the new saved value.
    await mobile.page.locator('[data-goal="DNG.ManLM3"]').fill('57');
    await desktop.page.evaluate(async month=>{await window.IBB5_SYNC.refresh();await window.IBB5_SYNC.commit({action:'submit',month,acc:'DNG.ManLM3',value:58,plan:'Remote edit'});},date.slice(0,7));
    mobile.page.once('dialog',dialog=>dialog.accept());await mobile.page.locator('[data-submit="DNG.ManLM3"]').click();
    await mobile.page.waitForFunction(()=>document.getElementById('ckSaveStatus').textContent.startsWith('Chưa lưu được.'));
    assert.equal(await mobile.page.locator('[data-goal="DNG.ManLM3"]').inputValue(),'57');
    assert.equal(records.get('commit:'+date.slice(0,7)+':__ALL__').data.staff['DNG.ManLM3'].value,58);
    await mobile.page.locator('[data-submit="DNG.ManLM3"]').click();await mobile.page.waitForFunction(()=>document.getElementById('ckSaveStatus').textContent==='Đã lưu cam kết thành công.');
    assert.equal(records.get('commit:'+date.slice(0,7)+':__ALL__').data.staff['DNG.ManLM3'].value,57);

    assert.deepEqual(errors,[]);
    await mobile.page.screenshot({path:process.env.COMMITMENT_SCREENSHOT||'commitments-mobile-test.png',fullPage:false});
    console.log('PASS: manager/team/own views; unrelated simultaneous saves; same-target conflict; draft preservation and deliberate retry; no page errors');
  } finally {await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exit(1)});
