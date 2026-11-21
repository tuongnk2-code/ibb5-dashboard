const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5260,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],actions=[];let registered=false;page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   window.permissionCalls=0;window.pushPermission='default';Object.defineProperty(Notification,'permission',{get:()=>window.pushPermission,configurable:true});Notification.requestPermission=async()=>{window.permissionCalls++;window.pushPermission='granted';return 'granted'};
   window.deviceSub=null;PushManager.prototype.getSubscription=async()=>window.deviceSub;PushManager.prototype.subscribe=async()=>{window.deviceSub={endpoint:'https://web.push.apple.com/test-device',toJSON:()=>({endpoint:'https://web.push.apple.com/test-device',keys:{p256dh:'A'.repeat(87),auth:'B'.repeat(22)}}),unsubscribe:async()=>{window.deviceSub=null;return true}};return window.deviceSub;};
   navigator.setAppBadge=async n=>{window.appBadge=n};navigator.clearAppBadge=async()=>{window.appBadge=0};
  });
  await page.route('**/push-check**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>'}));
  await page.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}}'}));
  await page.route('**/api/phone-push**',r=>{
   assert.equal(r.request().headers().authorization,'Bearer test');if(r.request().method()==='GET')return r.fulfill({json:{enabled:true,publicKey:'B'.repeat(87),registered}});
   const input=r.request().postDataJSON();actions.push(input.action);if(input.action==='subscribe')registered=true;if(input.action==='unsubscribe')registered=false;return r.fulfill({json:{ok:true}});
  });
  await page.goto('http://127.0.0.1:5260/push-check?inbox=1');
  await page.evaluate(async()=>{await import('/js/reportComments.css');window.phone=await import('/js/phonePush.js');window.opened=0;window.phone.installPhonePush(document.getElementById('root'),()=>window.opened++,{compact:true});});
  assert.equal(await page.evaluate(()=>window.permissionCalls),0,'Do not prompt automatically');assert.equal(await page.evaluate(()=>window.opened),1);assert.equal(new URL(page.url()).searchParams.has('inbox'),false);
  assert.equal(await page.locator('[data-phone-enable]').isVisible(),true);assert.equal(await page.locator('.rc-phone-compact h4').count(),0);await page.locator('[data-phone-enable]').click();await page.locator('[data-phone-enable]').waitFor({state:'hidden'});assert.equal(await page.locator('[data-phone-test]').isVisible(),false);await page.locator('summary').click();await page.locator('[data-phone-test]').waitFor({state:'visible'});assert.deepEqual(actions,['subscribe']);assert.equal(await page.evaluate(()=>window.permissionCalls),1);
  await page.locator('[data-phone-test]').click();await page.locator('[data-phone-state]').filter({hasText:'Đã yêu cầu gửi thử'}).waitFor();assert.equal(actions.at(-1),'test');
  await page.evaluate(()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'IBB5_PUSH_RECEIVED',kind:'test'}})));assert.match(await page.locator('[data-phone-state]').innerText(),/đã nhận/);
  await page.evaluate(()=>window.phone.updatePhoneBadge(41));assert.equal(await page.evaluate(()=>window.appBadge),41);
  await page.locator('[data-phone-disable]').click();await page.locator('[data-phone-test]').waitFor({state:'hidden'});assert.equal(actions.at(-1),'unsubscribe');assert.equal(await page.evaluate(()=>window.appBadge),0);
  await page.evaluate(()=>navigator.serviceWorker.dispatchEvent(new MessageEvent('message',{data:{type:'IBB5_OPEN_NOTIFICATIONS'}})));assert.equal(await page.evaluate(()=>window.opened),2);
  assert.deepEqual(errors,[]);await page.close();
  const denied=await browser.newPage();await denied.route('**/push-check',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));await denied.route('**/js/auth.js',r=>r.fulfill({contentType:'application/javascript',body:'export async function getSession(){return null}'}));await denied.addInitScript(()=>Object.defineProperty(Notification,'permission',{get:()=> 'denied',configurable:true}));await denied.goto('http://127.0.0.1:5260/push-check');await denied.evaluate(async()=>{const {installPhonePush}=await import('/js/phonePush.js');installPhonePush(document.getElementById('root'),()=>{});});assert.equal(await denied.locator('[data-phone-enable]').isDisabled(),true);assert.match(await denied.locator('[data-phone-state]').innerText(),/Cài đặt điện thoại/);await denied.close();
  console.log('PASS: permission only after tap, authenticated device opt-in, explicit server test, badge update, opt-out, notification opening and denied-permission guidance (simulated device; no real push sent)');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
