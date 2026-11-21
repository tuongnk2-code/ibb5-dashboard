const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5249,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const staff={id:randomUUID(),role:'staff',acc:'DNG.ChuongHM',created_at:'2020-01-01'},manager={id:randomUUID(),role:'manager',acc:''},comments=[],notifications=[],errors=[];
 let failNext=false;
 const report={user_id:staff.id,report_date:'2026-11-20',status:'submitted',updated_at:'2026-11-20T12:00:00Z',submitted_at:'2026-11-20T12:00:00Z',revision:1,data:{actual:1,commitment:2,online:0,monthlyOnline:14,monthlyTarget:30,tomorrowPttb:2,tomorrowOnline:2,sources:[{name:'Zalo',leads:3,closed:1}],support:'Cần hỗ trợ',focus:'Chăm khách',difficulty:'Khách đang cân nhắc'}};
 async function open(profile,width,height){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/comments-check',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><header><button id="topLogoutBtn">Đăng xuất</button></header><section id="dailyReports" class="panel page-active"><div id="root"></div></section>'}));
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
  await page.route('**/api/daily-reports?**',r=>{const query=new URL(r.request().url()).searchParams;r.fulfill({json:query.get('history')?{reports:[report]}:{profiles:[staff],reports:[report],metrics:{[staff.id]:{online:0,monthlyOnline:14}},previous:null,serverTime:'2026-11-20T13:00:00Z'}});});
  await page.route('**/api/report-comments**',async r=>{
   assert.equal(r.request().headers().authorization,'Bearer test');
   const input=r.request().method()==='GET'?Object.fromEntries(new URL(r.request().url()).searchParams):r.request().postDataJSON();
   if(input.inbox){return r.fulfill({json:{notifications:notifications.filter(n=>n.recipient===profile.id)}});}
   if(input.action==='read'){notifications.filter(n=>n.recipient===profile.id&&input.comment_ids.includes(n.comment_id)).forEach(n=>n.read_at=new Date().toISOString());return r.fulfill({json:{ok:true}});}
   if(input.action==='comment'){
    if(failNext){failNext=false;return r.fulfill({status:500,json:{error:'Thử lại kết nối'}});}
    const row={...input,id:randomUUID(),author_id:profile.id,author:profile.acc||'Trưởng phòng',created_at:new Date().toISOString()};
    const recipients=new Set([staff.id,...comments.map(c=>c.author_id)]);comments.push(row);
    for(const recipient of recipients)if(recipient!==profile.id)notifications.push({id:randomUUID(),comment_id:row.id,comment:row,recipient,author:row.author,subject:staff.acc,created_at:row.created_at,read_at:null});
    return r.fulfill({status:201,json:{comment:row}});
   }
   return r.fulfill({json:{report,subject:staff,comments}});
  });
  await page.goto('http://127.0.0.1:5249/comments-check');
  await page.evaluate(async profile=>{await import('/css/style.css');await import('/css/responsive.css');await import('/css/dailyReports.css');const {renderDailyReports}=await import('/js/dailyReports.js');const {installReportNotifications}=await import('/js/reportComments.js');window.IBB5_CURRENT_PROFILE=profile;renderDailyReports(document.getElementById('root'),profile,()=>30);installReportNotifications();},profile);
  // Select an existing submitted report instead of the current live date.
  await page.locator('#drDate').fill('2026-11-20');await page.locator('#drDate').dispatchEvent('change');await page.locator('[data-dr-view]').first().waitFor();return page;
 }
 try{
  const boss=await open(manager,1440,1000);await boss.locator('#drRows [data-dr-view]').click();
  const thread=boss.locator('#drDetail .rc-thread');await thread.locator('.rc-empty').waitFor();
  failNext=true;await thread.locator('textarea').fill('Ưu tiên gọi khách theo lịch <img src=x onerror=alert(1)>');await thread.getByRole('button',{name:'Gửi bình luận',exact:true}).click();await thread.locator('.rc-status').filter({hasText:'Nội dung vẫn được giữ'}).waitFor();assert.match(await thread.locator('textarea').inputValue(),/Ưu tiên/);
  await thread.getByRole('button',{name:'Gửi bình luận',exact:true}).click();await thread.locator('article').waitFor();assert.equal(await thread.locator('article img').count(),0);assert.equal(comments.length,1);
  await boss.locator('#drClose').click();
  const employee=await open(staff,390,844);await employee.locator('#reportNotificationButton b').filter({hasText:'1'}).waitFor();
  await employee.locator('#reportNotificationButton').click();await employee.locator('.rc-notification').click();const discussion=employee.locator('.rc-dialog:not(.rc-inbox)');await discussion.locator('.rc-comments article').waitFor();
  assert.match(await discussion.locator('h3').innerText(),/20\/11\/2026/);assert.equal(await discussion.locator('img').count(),0);
  await employee.waitForFunction(()=>document.querySelector('#reportNotificationButton b').hidden);
  await discussion.locator('textarea').fill('Em đã liên hệ và xác nhận lại lịch.');await discussion.getByRole('button',{name:'Gửi bình luận',exact:true}).click();await discussion.locator('.rc-comments article').nth(1).waitFor();
  assert.equal(await discussion.evaluate(el=>el.scrollWidth<=el.clientWidth),true);
  if(process.env.COMMENTS_SCREENSHOT_DIR)await employee.screenshot({path:process.env.COMMENTS_SCREENSHOT_DIR+'/report-comment-mobile.png'});
  await discussion.getByRole('button',{name:'Đóng bình luận'}).click();
  await employee.locator('#reportNotificationButton').click();assert.equal(await employee.locator('.rc-inbox .rc-notification').count(),0);await employee.locator('.rc-inbox header button').click();
  await boss.evaluate(()=>window.dispatchEvent(new Event('focus')));await boss.locator('#reportNotificationButton b').filter({hasText:'1'}).waitFor();await boss.locator('#reportNotificationButton').click();await boss.locator('.rc-notification').click();await boss.locator('.rc-dialog:not(.rc-inbox) .rc-comments article').nth(1).waitFor();
  if(process.env.COMMENTS_SCREENSHOT_DIR)await boss.screenshot({path:process.env.COMMENTS_SCREENSHOT_DIR+'/report-comment-desktop.png'});
  assert.deepEqual(errors,[]);console.log('PASS: report detail comment, failed-send draft retention, staff unread notification, exact report opening, safe rendering, read sync and reply notification to manager; desktop/mobile');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
