const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5244,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const contacts=[
  {name:'Đội trưởng',role:'Đội trưởng',group:'DNG',source:'TIN',ext:'123',note:'Block Hải Châu'},
  {name:'Phó Giám đốc',role:'Phó Giám đốc & TP KT',group:'DNG',source:'TIN'},
  {name:'Giám đốc',role:'Giám đốc Chi nhánh',group:'DNG',source:'TIN',email:'director@example.com'},
  {name:'Trưởng phòng',role:'Trưởng phòng Quản lý đối tác 1',group:'DNG',source:'TIN'},
  {name:'Kế toán',role:'Kế toán trưởng',group:'DNG',source:'TIN'},
  {name:'Chưa rõ',role:'Quản lý',group:'DNG',source:'TIN'},
  {name:'GLI trong tên',role:'Nhân viên',group:'DNG',section:'GLI',source:'TIN'},
  {name:'Người PNC',role:'Giám Đốc',group:'GLI',source:'PNC',phone:'0901234567'},
 ];
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
  await page.route('**/js/api.js',r=>r.fulfill({contentType:'application/javascript',body:`import * as data from '/js/mockData.sample.js';export async function fetchDashboardData(){return {...data,CONTACT_DATA:${JSON.stringify(contacts)}}}`}));
  await page.route('**/js/app-gate.js',r=>r.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE={id:'test',role:'staff',acc:'DNG.ManLM3'};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
  await page.route('https://**/*',r=>r.abort());await page.goto('http://127.0.0.1:5244/#contacts');await page.waitForFunction(()=>document.getElementById('ctCount').textContent.includes('8 / 8'));
  const region=page.locator('.ct-region[data-region="dng"]');assert.equal(await region.getAttribute('open'),'');
  assert.deepEqual(await region.locator('.ct-lead-people strong').allTextContents(),['Giám đốc','Phó Giám đốc']);
  const ops=region.locator('.ct-rank-department[data-department="Đối tác · Triển khai"]');
  assert.deepEqual(await ops.locator('.ct-level-people strong').allTextContents(),['Trưởng phòng','Đội trưởng']);
  assert.equal(await ops.locator('.ct-person').filter({hasText:'Đội trưởng'}).isVisible(),false);
  await region.locator('.ct-expand-all').click();
  const positions=await region.locator('.ct-contact-level').evaluateAll(levels=>levels.map(el=>({level:Number(el.dataset.level),top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom})));
  for(let i=1;i<positions.length;i++){assert.ok(positions[i].level>positions[i-1].level);assert.ok(positions[i].top>=positions[i-1].bottom);}
  if(width===1440&&process.env.DIRECTORY_SCREENSHOT_DIR)await page.locator('#contacts').screenshot({path:process.env.DIRECTORY_SCREENSHOT_DIR+'/contact-directory-final.png'});
  await ops.locator('.ct-person').filter({hasText:'Đội trưởng'}).click();
  assert.match(await page.locator('.ct-contact-dialog').innerText(),/Block Hải Châu/);assert.match(await page.locator('.ct-contact-dialog').innerText(),/123/);
  await page.getByRole('button',{name:'Đóng thông tin liên hệ'}).click();assert.equal(await page.locator('.ct-contact-dialog').isVisible(),false);
  await page.locator('#ctSearch').fill('gli');assert.equal(await page.locator('.ct-region').count(),1);assert.match(await page.locator('#ctCount').innerText(),/1 \/ 8/);
  await page.locator('.ct-person').click();assert.equal(await page.locator('.ct-contact-dialog a[href="tel:0901234567"]').count(),1);await page.keyboard.press('Escape');
  await page.locator('#ctSearch').fill('missing');assert.match(await page.locator('#ctDiagram').innerText(),/Không tìm thấy/);
  await page.locator('#ctSearch').fill('');assert.equal(await page.locator('.ct-region').count(),2);
  const box=await page.locator('#contacts').boundingBox();assert.equal(await page.locator('#ctDiagram').evaluate(el=>el.scrollWidth<=el.clientWidth),true);assert.ok(box.width<=width);assert.deepEqual(errors,[]);
  await page.close();
 }console.log('PASS: role hierarchy, original fields, department expansion, contact modal and region-only search on desktop/mobile');}
 finally{await browser.close();await server.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
