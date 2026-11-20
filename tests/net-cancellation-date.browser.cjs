const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const {validateSnapshot}=await import('../js/dashboardStateModel.js');
 const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:1050}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   const row=(id,fields={})=>({id,type:'Internet',staff:'DNG.ManLM3',created:'2026-11-01',date:'',room:'IBB5',customer:id,status:'Bình thường',...fields});
   window.IBB5_IMPORTED_DATA=[row('CANCEL1',{status:'Đã chấm dứt hợp đồng',netCancelledAt:'2026-11-18T09:30:00'}),row('MISSING',{status:'Đã chấm dứt hợp đồng',created:'2026-09-19'}),row('LOCALONLY'),row('REACTIVATED')];
   window.IBB5_CANCELLED_NET=[row('REACTIVATED',{status:'Đã chấm dứt hợp đồng',netCancelledAt:'2026-11-10'})];
   window.IBB5_PENDING_NOTES=Object.fromEntries(window.IBB5_IMPORTED_DATA.map(row=>[row.id,{cancellationApproved:true,cancellationApprovedAt:'2026-11-19T10:00:00Z',result:'Hủy',cancelReason:'Lý do đã lưu'}]));
   window.IBB5_SHARED_STATE={notes:window.IBB5_PENDING_NOTES,commitments:{},revisions:{}};
  });
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:'window.IBB5_CURRENT_PROFILE={id:"manager",role:"manager",acc:"DNG.Manager"};document.getElementById("loginScreen").style.display="none";document.getElementById("appShell").style.display="";await import("/js/main.js");'}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#pendingContracts');await page.waitForFunction(()=>typeof window.IBB5_MONTHLY_TARGET==='function');await page.locator('#pendStatus').selectOption('hidden-cancelled');
  const badge=id=>page.locator('#pendRows tr[data-id="'+id+'"] .p-net-cancelled');
  assert.equal(await badge('CANCEL1').innerText(),'Đã hủy · 18/11/2026');assert.equal(await badge('MISSING').innerText(),'Đã hủy · Chưa có ngày hủy trong NET');assert.equal(await badge('LOCALONLY').count(),0);assert.equal(await badge('REACTIVATED').count(),0);
  if(width===390){await page.locator('#pendRows tr[data-id="CANCEL1"] .p-mobile-edit').click();assert.equal(await page.locator('#pendingMobileEditor .p-net-cancelled').innerText(),'Đã hủy · 18/11/2026');await page.locator('#pendingMobileEditor .pm-close').first().click();}
  await page.evaluate(()=>{Object.assign(window.IBB5_IMPORTED_DATA.find(row=>row.id==='LOCALONLY'),{status:'Đã chấm dứt hợp đồng',netCancelledAt:'2026-11-20'});document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));});assert.equal(await badge('LOCALONLY').innerText(),'Đã hủy · 20/11/2026');
  if(width===1440){
   await page.exposeFunction('validateImportedNet',snapshot=>validateSnapshot(snapshot));
   await page.evaluate(()=>{window.IBB5_SYNC={snapshot:async value=>{const snapshot=await window.validateImportedNet(value);window.importedNet=snapshot;window.IBB5_SHARED_STATE.snapshot=snapshot;window.IBB5_IMPORTED_DATA=snapshot.data;window.IBB5_CANCELLED_NET=snapshot.cancelledNet;window.IBB5_IMPORT_META=snapshot.meta;document.dispatchEvent(new Event('ibb5-snapshot-updated'));document.dispatchEvent(new CustomEvent('ibb5-shared-updated',{detail:{keys:['snapshot']}}));}};location.hash='datahub';});
   const xlsx=await page.evaluate(async()=>{
    // Match the supplied NET layout: M=status, O=created, P=Online, Q=service cancellation, R=staff.
    const headers=Array.from({length:18},(_,i)=>'Cột '+i);Object.assign(headers,{0:'Hợp đồng',1:'CLBH Net Thời điểm hiện tại',2:'Ngày hủy HĐ',12:'Tình trạng',13:'Tên khách hàng',14:'Ngày tạo HĐ',15:'Ngày Online',16:'Ngày hủy dịch vụ',17:'Acc nhân viên bán'});
    const row=(id,date)=>{const values=Array(18).fill('');Object.assign(values,{0:id,1:'3T',2:'2026-11-01',12:'Đã chấm dứt hợp đồng',13:'Khách '+id,14:'01/11/2026',16:date,17:'DNG.ManLM3'});return values;};
    const rows=[headers,row('IMPORTED','19/11/2026 07:30'),row('IMPNODATE','')];
    const xml='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+rows.map((row,i)=>'<row r="'+(i+1)+'">'+row.map((value,j)=>'<c r="'+String.fromCharCode(65+j)+(i+1)+'" t="inlineStr"><is><t>'+value+'</t></is></c>').join('')+'</row>').join('')+'</sheetData></worksheet>';
    return new JSZip().file('xl/worksheets/sheet1.xml',xml).generateAsync({type:'base64'});
   });
   await page.locator('#ibbUploadNet').setInputFiles({name:'net-cancellation.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(xlsx,'base64')});await page.locator('#ibbImportBtn').click();await page.waitForFunction(()=>!!window.importedNet);
   assert.equal(await page.evaluate(()=>window.importedNet.data.find(row=>row.id==='IMPORTED').netCancelledAt),'2026-11-19T07:30:00');assert.equal(await page.evaluate(()=>window.importedNet.cancelledNet.find(row=>row.id==='IMPORTED').netCancelledAt),'2026-11-19T07:30:00');
   await page.evaluate(()=>{location.hash='pendingContracts';});await page.locator('#pendStatus').selectOption('all');assert.equal(await badge('IMPORTED').innerText(),'Đã hủy · 19/11/2026');assert.match(await badge('IMPNODATE').innerText(),/Chưa có ngày hủy/);
   if(process.env.NET_CANCELLATION_TEST_FILE){
    const source=JSON.parse(require('node:fs').readFileSync(process.env.NET_CANCELLATION_SOURCE_JSON,'utf8'));
    const terminated=source.rows.filter(row=>row.values.M==='Đã chấm dứt hợp đồng');
    const expected=terminated.map(({values})=>{const serial=Number(values.Q),day=new Date(Date.UTC(1899,11,30)+Math.floor(serial)*86400000).toISOString().slice(0,10),seconds=Math.round((serial-Math.floor(serial))*86400);return {id:values.J,date:day+(seconds?'T'+new Date(seconds*1000).toISOString().slice(11,19):'')};});
    assert.equal(expected.length,300);assert.ok(expected.every(row=>row.date));
    await page.evaluate(()=>{delete window.importedNet;location.hash='datahub';});
    await page.locator('#ibbUploadNet').setInputFiles(process.env.NET_CANCELLATION_TEST_FILE);await page.locator('#ibbImportBtn').click();await page.waitForFunction(()=>!!window.importedNet);
    const actual=await page.evaluate(()=>window.importedNet.data);
    for(const row of expected)assert.equal(actual.find(item=>item.id===row.id)?.netCancelledAt,row.date,row.id+' must match column Q in the latest NET file');
    // A historical cancellation date must not override the latest NET source.
    const sample=expected[0];await page.evaluate(sample=>{window.IBB5_PENDING_NOTES[sample.id]={cancellationApproved:true,result:'Hủy',cancelReason:'Test'};window.IBB5_CANCELLED_NET.find(row=>row.id===sample.id).netCancelledAt='2026-01-01';location.hash='pendingContracts';},sample);
    await page.locator('#pendStatus').selectOption('hidden-cancelled');
    assert.equal(await badge(sample.id).innerText(),'Đã hủy · '+sample.date.slice(0,10).split('-').reverse().join('/'));
    console.log('PASS: all '+expected.length+' terminated contracts match cancellation dates in the supplied latest NET workbook');
   }
  }
  assert.deepEqual(errors,[]);await page.close();
 }console.log('PASS: latest NET cancellation badges, actual/missing source date, approval date separation, reactivation, mobile and XLSX/shared-state round-trip');}
 finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
