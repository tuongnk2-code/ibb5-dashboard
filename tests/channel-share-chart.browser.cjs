const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const {createServer}=await import('../node_modules/vite/dist/node/index.js');const server=await createServer({server:{host:'127.0.0.1',port:5246,strictPort:true}});await server.listen();
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/chart-check',r=>r.fulfill({contentType:'text/html',body:'<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{font-family:Arial;background:#f6f9ff;padding:16px}.card{background:white;border:1px solid #d5e3f5;border-radius:16px;padding:24px;color:#173b60}h3{margin-top:0}</style><div class="card"><h3>Biểu đồ thống kê kênh bán</h3><p>Tỷ trọng toàn phòng hoặc theo nhân viên; chỉ tính hợp đồng có nguồn thông tin đã cập nhật</p><div id="root"></div></div><script type="module">import {renderChannelShareChart} from "/js/channelShareChart.js";window.draw=items=>renderChannelShareChart(document.getElementById("root"),items);draw([["Top ZaLo",91],["Đại Lý",64],["FaceBook ADS",59],["Thị Trường",45],["KH Cũ",40],["Khác",8],["Tờ Dán",6],["IBB",5],["Web",4],["FaceBook Free",4]]);</script>'}));
  await page.goto('http://127.0.0.1:5246/chart-check');await page.waitForSelector('.channel-share-row');
  assert.equal(await page.locator('.channel-share-center strong').innerText(),'326');assert.equal(await page.locator('.channel-share-row').count(),10);assert.match(await page.locator('.channel-share-insight').innerText(),/65,6%/);assert.match(await page.locator('.channel-share-row').first().innerText(),/27,9%/);
  const colors=await page.locator('svg circle').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke')));assert.equal(new Set(colors).size,10);
  const lengths=await page.locator('svg circle').evaluateAll(nodes=>nodes.reduce((sum,n)=>sum+Number(n.getAttribute('stroke-dasharray').split(' ')[0]),0));assert.ok(Math.abs(lengths-2*Math.PI*92)<0.001);
  await page.screenshot({path:'C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/channel-share-desktop.png'});
  await page.setViewportSize({width:390,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:'C:/Users/ADMIN/.codex/visualizations/2026/11/03/01a19ee8-12dd-7e41-8be4-5a08e724d1f7/channel-share-mobile.png',fullPage:true});
  await page.evaluate(()=>draw([['Web',2]]));assert.equal(await page.locator('.channel-share-row').count(),1);assert.match(await page.locator('.channel-share-row').innerText(),/100%/);assert.equal(await page.locator('.channel-share-center strong').innerText(),'2');
  await page.evaluate(()=>draw([]));assert.equal(await page.locator('svg').count(),0);assert.match(await page.locator('#root').innerText(),/Chưa có/);
  await page.evaluate(()=>draw([['<img src=x onerror=alert(1)>',3]]));assert.equal(await page.locator('#root img').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS: channel totals, percentage shares, SVG segments, distinct colors, mobile fit, filter updates, empty data and safe labels');
 }finally{await browser.close();await server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
