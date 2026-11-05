const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const { createServer } = await import('../node_modules/vite/dist/node/index.js');
  const { unpackState, stateSignature, validateSnapshot } = await import('../js/dashboardStateModel.js');
  const server = await createServer({ server: { host: '127.0.0.1', port: 5177, strictPort: true } }); await server.listen();
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const records = new Map(), reports = new Map(), errors = [];
  const profiles=[{id:'manager',role:'manager',acc:'DNG.Manager'}, {id:'lead',role:'lead',acc:'DNG.HoaNTB6',team:3}, {id:'staff',role:'staff',acc:'DNG.ManLM3',team:3}, {id:'outside',role:'staff',acc:'DNG.Vypv',team:1}];
  const date = new Intl.DateTimeFormat('en-CA', { timeZone:'Asia/Ho_Chi_Minh', year:'numeric',month:'2-digit',day:'2-digit' }).format(new Date());
  const legacy = { snapshot: { data: [{ id:'SYNC1',type:'Internet',staff:'DNG.ManLM3',created:date,date,room:'IBB5',customer:'Khách đồng bộ' }], meta:{} }, commitments: { [date.slice(0,7)]: { __ALL__: { manager:{value:400,status:'signed'},staff:{'DNG.ManLM3':{value:40,status:'approved'}} } } }, notes: { SYNC1:{expected:date,action:'Hẹn KH',result:'Chờ',source:'Zalo',timeSlot:'8h - 10h'} } };
  legacy.snapshot.data.push(
    { id:'SYNC1',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' },
    { id:'CAM_ONLY',type:'Camera',staff:'DNG.ManLM3',created:date,date,room:'IBB5' }
  );
  legacy.snapshot.data[0].netClbh='Tra truoc 3T 615k/3T';
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
      if(body.kind==='migrate') { records.set('snapshot',{key:'snapshot',revision:1,data:body.snapshot});for(const [m,rooms]of Object.entries(body.commitments))for(const [room,data]of Object.entries(rooms))records.set('commit:'+m+':'+room,{key:'commit:'+m+':'+room,revision:1,data});for(const [id,data]of Object.entries(body.notes))records.set('pending:'+id,{key:'pending:'+id,revision:1,data});return route.fulfill({json:{ok:true}}); }
      if(body.kind==='snapshot'){const row={key:'snapshot',revision:body.revision+1,data:validateSnapshot(body.snapshot)};records.set('snapshot',row);return route.fulfill({json:{row}});}
      const key=body.kind==='commit'?'commit:'+body.month+':'+(body.room||'__ALL__'):'pending:'+body.id;
      if((records.get(key)?.revision||0)!==body.revision)return route.fulfill({status:409,json:{error:'Dữ liệu đã thay đổi trên thiết bị khác. Nội dung đang nhập được giữ lại; bấm Bỏ sửa để lấy bản mới.'}});
      let data=body.value;
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
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5177');await page.locator('#dashboardSyncBtn').waitFor();return {context,page};
  }
  try {
    const desktop=await device(true),mobile=await device(false),lead=await device(false,'lead');
    const loads=new Map([desktop,mobile,lead].map(device=>[device.page,0]));for(const {page}of[desktop,mobile,lead])page.on('load',()=>loads.set(page,loads.get(page)+1));
    for(const {page} of [desktop,mobile,lead]) {
      assert.equal(await page.locator('#to').inputValue(),date);
      assert.equal(await page.evaluate(()=>window.IBB5_IMPORTED_DATA[0].id),'SYNC1');
      assert.equal(await page.evaluate(d=>window.IBB5_MONTHLY_TARGET(d.slice(0,7),'DNG.ManLM3'),date),40);
      assert.equal(await page.evaluate(()=>window.IBB5_PENDING_NOTES.SYNC1.action),'Hẹn KH');
      // New Camera imports must work even though the old metadata lacks these IDs.
      assert.equal(await page.locator('#cameraKpi').textContent(),'2');
      assert.equal(await page.locator('[data-k="camera"]').textContent(),'1 / 1');
      assert.equal(await page.locator('[data-k="coverage"]').textContent(),'100%');
      assert.equal(await page.locator('[data-k="prepaid"]').textContent(),'100%');
      assert.equal(await page.locator('#anaStaffBars .ana-share-value small').textContent(),'100%');
      assert.match(await page.locator('#anaOldRows').textContent(),/OVERDUE1.*Khách hẹn cuối tuần.*Đã gọi/s);
      assert.ok((await page.locator('#psRows .ps-person').allTextContents()).includes('DNG.ManLM3'));
      assert.equal(await page.locator('#psRows .ps-acc').count(),0);
      const originalSchedule=await page.locator('#psRows .ps-id').allTextContents();
      await page.evaluate(({date,created})=>{for(let i=0;i<36;i++){const id='FULLSCHEDULE'+i;window.IBB5_IMPORTED_DATA.push({id,type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created,date:''});window.IBB5_PENDING_NOTES[id]={expected:date,timeSlot:'8h - 10h'};}window.dispatchEvent(new Event('storage'));},{date,created:oldDate});
      assert.equal(await page.locator('#psRows .ps-id').count(),originalSchedule.length+36);
      const scheduleFit=await page.locator('.pending-schedule-scroll').evaluate(el=>({width:el.scrollWidth-el.clientWidth,height:el.scrollHeight-el.clientHeight,max:getComputedStyle(el).maxHeight}));
      assert.equal(scheduleFit.max,'none');assert.ok(scheduleFit.width<=2&&scheduleFit.height<=2);
      await page.evaluate(()=>{const rows=window.IBB5_IMPORTED_DATA;for(let i=rows.length-1;i>=0;i--)if(rows[i].id.startsWith('FULLSCHEDULE')){delete window.IBB5_PENDING_NOTES[rows[i].id];rows.splice(i,1);}window.dispatchEvent(new Event('storage'));});
      assert.deepEqual(await page.locator('#psRows .ps-id').allTextContents(),originalSchedule);
      assert.equal((await page.locator('#anaOldRows').textContent()).includes('PRIVATE1'),page===desktop.page);
      assert.ok(await page.locator('.ana-monthly-table thead th').count()>=14);
      assert.equal(await page.locator('#anaChannelMonth').inputValue(),date.slice(0,7));
      assert.equal(await page.locator('#anaMonthlyRows tr[data-acc]').count(),17);
      assert.equal(await page.locator('#anaMonthlyRows tr.ana-channel-team').count(),3);
      assert.equal(await page.locator('#anaMonthlyRows tr[data-acc="DNG.ManLM3"] td[data-channel="Top Zalo"]').textContent(),'1');
      await page.locator('#anaStaff').selectOption('DNG.Vypv');
      assert.equal(await page.locator('#anaMonthlyRows tr[data-acc]').count(),1);
      assert.equal(await page.locator('#anaMonthlyRows tr[data-acc="DNG.Vypv"] td[data-channel="Face Book"]').textContent(),'0');
      await page.locator('#anaStaff').selectOption('');
      assert.equal(await page.locator('#staffProductivity').textContent(),'0');
      assert.ok((await page.locator('#staffProductivityNote').textContent()).startsWith('1 HĐ NET Online / 17 nhân sự'));
      await page.evaluate(date=>{for(let i=0;i<59;i++)window.IBB5_IMPORTED_DATA.push({id:'PRODUCTIVITYTEST'+i,type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created:date,date});document.getElementById('to').dispatchEvent(new Event('change',{bubbles:true}));},date);
      assert.equal(await page.locator('#staffProductivity').textContent(),'4');
      assert.ok((await page.locator('#staffProductivityNote').textContent()).startsWith('60 HĐ NET Online / 17 nhân sự'));
      await page.evaluate(()=>{const rows=window.IBB5_IMPORTED_DATA;for(let i=rows.length-1;i>=0;i--)if(rows[i].id.startsWith('PRODUCTIVITYTEST'))rows.splice(i,1);document.getElementById('to').dispatchEvent(new Event('change',{bubbles:true}));});
      assert.equal(await page.locator('#priorityOnlinePace').textContent(),await page.locator('#todayOnline').textContent());
      assert.equal(await page.locator('#paceEfficiency').textContent(),await page.locator('#pace').textContent());
      const { dailyPace } = await import('../js/dailyPace.js');
      const benchmark=dailyPace(399,date).pace;
      assert.equal(await page.locator('#remainingDailyOnline').textContent(),benchmark===null?'—':benchmark.toLocaleString('vi-VN',{maximumFractionDigits:0}));
      assert.equal(await page.locator('#todayOnline').textContent(),'1 / '+(benchmark===null?'—':benchmark.toLocaleString('vi-VN',{maximumFractionDigits:0}))+' HĐ');
      assert.deepEqual(await page.locator('#dpTableHead tr').nth(1).locator('th').allTextContents(),['Bán','Online']);
      assert.equal(await page.locator('#dpTableHead tr').first().locator('th').nth(1).getAttribute('colspan'),'2');
      assert.equal(await page.locator('#dpTableBody .dp-subtotal .dp-below-one,#dpTableBody .dp-grand .dp-below-one').count(),0);
      assert.equal(await page.evaluate(()=>[...document.querySelectorAll('#dpTableBody tr')].filter(row=>row.querySelector('.dp-staff-acc-only')).every(row=>[...row.cells].slice(1).every(cell=>(Number(cell.textContent)<1)===cell.classList.contains('dp-below-one')))),true);
      await page.evaluate(({date,created})=>{window.IBB5_IMPORTED_DATA.push({id:'ONLINE_ONLY_TEST',type:'Internet',staff:'DNG.Vypv',room:'IBB5',created,date});window.IBB5_RENDER_DAILY_PERFORMANCE();},{date,created:previousDate.toISOString().slice(0,10)});
      assert.equal(await page.locator('#dpKpis .staff-sold small').textContent(),'Nhân sự có bán mới');
      assert.equal(await page.locator('#dpKpis .staff-sold strong').textContent(),'1 NV');
      assert.equal(await page.locator('#dpKpis .staff-online strong').textContent(),'2 NV');
      await page.evaluate(()=>{const rows=window.IBB5_IMPORTED_DATA;rows.splice(rows.findIndex(row=>row.id==='ONLINE_ONLY_TEST'),1);window.IBB5_RENDER_DAILY_PERFORMANCE();});
      assert.deepEqual(await page.locator('.overview-priority .name').allTextContents(),['↗ Tiến độ kế hoạch tháng','◉ Dự trù kết thúc tháng','HD Online còn thiếu']);
      assert.deepEqual(await page.locator('.overview-efficiency .name').allTextContents(),['Tồn từ 7 ngày','VVIP','Camera','Trung Bình Online 7 ngày gần nhất','Tỷ lệ P/N','PTTB CNQL','NSLĐ trung bình / 1 NS']);
      assert.deepEqual(await page.locator('.overview-focus .name').allTextContents(),['Tăng trưởng','Online trung bình ngày còn lại của tháng']);
      assert.deepEqual(await page.locator('.overview-support .name').allTextContents(),['HĐ tồn (chưa Online)','Trung Bình Online 7 ngày gần nhất','↗ Online / Pace ngày']);
      const sectionOrder=await page.evaluate(()=>[...document.querySelector('#ibbCaptureOverview').children].filter(el=>el.matches('.overview-priority,.overview-secondary,.overview-support,.daily,.overview-efficiency,#ibbQualitySummary')).map(el=>el.id||el.className));
      assert.deepEqual(sectionOrder,['executive overview-priority','subkpis overview-secondary overview-focus','subkpis overview-support','daily','subkpis overview-efficiency','ibbQualitySummary']);
      assert.equal(await page.locator('#growth').textContent(),'-50%');
      assert.match(await page.locator('#growthNote').textContent(),/2 HĐ · Giảm 1 HĐ/);
      await page.locator('#to').evaluate(el=>{el.value='2001-01-04';el.dispatchEvent(new Event('change',{bubbles:true}));});
      assert.equal(await page.locator('#growth').textContent(),'—');
      assert.match(await page.locator('#growthNote').textContent(),/Chưa có dữ liệu NET tháng 2000-12/);
      await page.locator('#to').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},date);
    }
    assert.equal(await mobile.page.evaluate(()=>localStorage.getItem('ibb5_three_source_snapshot_v1')),null);
    await desktop.page.evaluate(async()=>{await window.IBB5_SYNC.pending('SYNC1',{expected:'2026-11-10',action:'Đã gọi',result:'Chờ',source:'Zalo',timeSlot:'8h - 10h'});});
    await desktop.page.evaluate(async date=>{await window.IBB5_SYNC.pending('OVERDUE1',{expected:date,action:'Khách đổi lịch',result:'Đã xác nhận',source:'Facebook',timeSlot:'8h - 10h'});},date);
    assert.match(await desktop.page.locator('#anaOldRows').textContent(),/Khách đổi lịch.*Đã xác nhận/s);
    await desktop.page.locator('#anaChannelMonth').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},oldDate.slice(0,7));
    assert.equal(await desktop.page.locator('#anaMonthlyRows tr[data-acc="DNG.ManLM3"] td[data-channel="Face Book"]').textContent(),'1');
    await desktop.page.locator('#anaChannelMonth').evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},date.slice(0,7));
    await mobile.page.waitForFunction(()=>window.IBB5_PENDING_NOTES.SYNC1?.action==='Đã gọi',null,{timeout:15000});
    await lead.page.waitForFunction(()=>window.IBB5_PENDING_NOTES.OVERDUE1?.action==='Khách đổi lịch',null,{timeout:15000});
    assert.equal(await mobile.page.evaluate(()=>window.IBB5_PENDING_NOTES.SYNC1.action),'Đã gọi');
    assert.match(await mobile.page.locator('#anaOldRows').textContent(),/Khách đổi lịch.*Đã xác nhận/s);
    // An active desktop edit survives a remote save and retains its original revision.
    await desktop.page.evaluate(()=>{location.hash='pendingContracts'});
    const reason=desktop.page.locator('#pendRows tr[data-id="OVERDUE1"] .p-note');await reason.selectOption('Đang còn cước đối thủ');
    await mobile.page.evaluate(async date=>{await window.IBB5_SYNC.pending('OVERDUE1',{expected:date,action:'KH chưa đồng ý PHM',result:'Chưa Online',source:'Web',timeSlot:'10h - 12h'});},date);
    await desktop.page.waitForFunction(()=>window.IBB5_PENDING_NOTES.OVERDUE1?.action==='KH chưa đồng ý PHM',null,{timeout:15000});
    assert.equal(await reason.inputValue(),'Đang còn cước đối thủ');
    const conflict=desktop.page.waitForEvent('dialog').then(async alert=>{assert.match(alert.message(),/đã thay đổi/);await alert.accept();});await desktop.page.locator('#pendRows tr[data-id="OVERDUE1"] .p-save').click();await conflict;
    assert.equal(records.get('pending:OVERDUE1').data.action,'KH chưa đồng ý PHM');
    await desktop.page.locator('#pendRows tr[data-id="OVERDUE1"] .p-discard').click();assert.equal(await reason.inputValue(),'KH chưa đồng ý PHM');
    // Manager target draft is retained while a new staff commitment arrives.
    await desktop.page.evaluate(()=>{const input=document.getElementById('ckManagerGoal');input.value='777';input.dispatchEvent(new Event('input',{bubbles:true}));});
    await mobile.page.evaluate(async month=>{await window.IBB5_SYNC.commit({action:'submit',month,room:'__ALL__',acc:'DNG.ManLM3',value:55,plan:'Kế hoạch mới'});},date.slice(0,7));
    await desktop.page.waitForFunction(month=>window.IBB5_SHARED_STATE.commitments[month].__ALL__.staff['DNG.ManLM3'].value===55,date.slice(0,7),{timeout:15000});
    assert.equal(await desktop.page.locator('#ckManagerGoal').inputValue(),'777');assert.match(await lead.page.locator('#anaOldRows').textContent(),/KH chưa đồng ý PHM/);
    await desktop.page.locator('#ckDiscard').evaluate(button=>button.click());
    // New contract snapshots refresh charts and lists without navigation.
    await desktop.page.evaluate(async date=>{const snapshot=structuredClone(window.IBB5_SHARED_STATE.snapshot);snapshot.data.push({id:'NEWLIVE',type:'Internet',staff:'DNG.ManLM3',room:'IBB5',created:date,date,netClbh:'Tra truoc 3T'});await window.IBB5_SYNC.snapshot(snapshot,['Internet']);},date);
    await mobile.page.waitForFunction(()=>window.IBB5_IMPORTED_DATA.some(row=>row.id==='NEWLIVE'),null,{timeout:15000});
    assert.equal(await mobile.page.locator('#online').textContent(),'2');
    // Submitted reports appear on both supervisor boards without replacing their drafts.
    for(const {page}of[desktop,mobile,lead]){await page.evaluate(()=>{location.hash='dailyReports'});await page.waitForFunction(()=>!document.getElementById('drFields').disabled);}
    await desktop.page.locator('[name="actual"]').fill('9');
    await lead.page.locator('[name="difficulty"]').fill('Nội dung đang nhập');
    assert.match(await desktop.page.locator('#drRows').textContent(),/DNG.Vypv/);
    assert.doesNotMatch(await lead.page.locator('#drRows').textContent(),/DNG.Vypv/);
    assert.doesNotMatch(await mobile.page.locator('#drRows').textContent(),/DNG.HoaNTB6|DNG.Vypv/);
    await mobile.page.locator('[name="actual"]').fill('4');await mobile.page.locator('[name="commitment"]').fill('1');
    await mobile.page.locator('#drSubmit').click();await mobile.page.waitForFunction(()=>document.getElementById('drMessage').textContent==='Đã gửi báo cáo.');
    for(const {page}of[desktop,lead])await page.waitForFunction(()=>[...document.querySelectorAll('#drRows tr')].some(row=>row.textContent.includes('DNG.ManLM3')&&row.textContent.includes('4/1')) ,null,{timeout:15000});
    assert.equal(await desktop.page.locator('[name="actual"]').inputValue(),'9');assert.equal(await lead.page.locator('[name="difficulty"]').inputValue(),'Nội dung đang nhập');
    // A second submission also refreshes the board while the manager keeps editing.
    await mobile.page.locator('[name="actual"]').fill('5');await mobile.page.locator('#drSubmit').click();
    await desktop.page.waitForFunction(()=>[...document.querySelectorAll('#drRows tr')].some(row=>row.textContent.includes('DNG.ManLM3')&&row.textContent.includes('5/1')),null,{timeout:15000});
    assert.equal(await desktop.page.locator('[name="actual"]').inputValue(),'9');
    for(const count of loads.values())assert.equal(count,0);
    if(process.env.NET_IMPORT_TEST_FILE){
      await desktop.page.evaluate(()=>{location.hash='datahub'});
      await desktop.page.locator('#ibbUploadNet').setInputFiles(process.env.NET_IMPORT_TEST_FILE);
      await desktop.page.locator('#ibbImportBtn').click();
      await desktop.page.waitForFunction(()=>window.IBB5_IMPORTED_DATA?.filter(r=>r.type==='Internet').length===956);
      for(const [id,value] of Object.entries({from:'2026-11-01',to:'2026-11-04'}))await desktop.page.locator('#'+id).evaluate((el,value)=>{el.value=value;el.dispatchEvent(new Event('change',{bubbles:true}));},value);
      assert.equal(await desktop.page.locator('[data-k="prepaid"]').textContent(),'47%');
      assert.match(await desktop.page.locator('[data-k="prepaid"]').getAttribute('title'),/^28 \/ 60 HĐ/);
      assert.equal(records.get('snapshot').data.data.filter(r=>r.type==='Internet'&&typeof r.netClbh==='string').length,956);
      console.log('PASS: real NET Excel import retains CLBH for 956 contracts and computes 28/60 = 47%');
    }
    assert.deepEqual(errors,[]);console.log('PASS: automatic manager/lead/staff updates without reload, draft preservation, conflict protection, contract snapshot refresh and existing dashboard checks');
  } finally {await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
