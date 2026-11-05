const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
(async()=>{
  const {createServer}=await import('../node_modules/vite/dist/node/index.js');
  const server=await createServer({server:{host:'127.0.0.1',port:5178,strictPort:true}});await server.listen();
  const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[];
    const profile={id:'quote-staff',role:'staff',acc:'DNG.DatBTH',full_name:'Nhân viên báo giá'};
    await context.route('**/js/auth.js',route=>route.fulfill({contentType:'application/javascript',body:'export async function getSession(){return {access_token:"test"}};export async function signOut(){};export async function callAdminUsersApi(){return {profiles:[]}}'}));
    await context.route('**/js/api.js',route=>route.fulfill({contentType:'application/javascript',body:'import * as data from "/js/mockData.sample.js";export async function fetchDashboardData(){return data}'}));
    await context.route('**/js/app-gate.js',route=>route.fulfill({contentType:'application/javascript',body:`window.IBB5_CURRENT_PROFILE=${JSON.stringify(profile)};document.getElementById('loginScreen').style.display='none';document.getElementById('appShell').style.display='';await import('/js/main.js');`}));
    await context.route('https://**/*',route=>route.abort());
    await context.route('https://apis.fpt.vn/ecp/public/**',route=>{const url=route.request().url(),data=url.endsWith('/provinces/list')?[{id:511,text:'Đà Nẵng'}]:url.endsWith('/wards/list')?[{id:101,text:'Hòa Xuân'}]:[{code:'GIGA',name:'Giga 300 Mbps',type:'internet',price:{price:195000},tagline:'Gói Internet gia đình',product_spec_characteristics:[{name:'Download',value:'300 Mbps'}]}];return route.fulfill({json:{data}});});
    const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',err=>{errors.push(err.message);console.log(err.stack);});page.on('console',msg=>{if(msg.type()==='error')console.log('BROWSER:',msg.text());});
    await page.goto('http://127.0.0.1:5178/#pricing');await page.locator('#qForm').waitFor();
    await page.locator('#qChoose').click();await page.locator('#priceProvinceSearch').fill('da nang');await page.getByRole('option',{name:'Đà Nẵng',exact:true}).click();
    await page.waitForFunction(()=>!document.getElementById('priceWardSearch').disabled);await page.locator('#priceWardSearch').fill('hoa xuan');await page.getByRole('option',{name:'Hòa Xuân',exact:true}).click();
    await page.locator('[data-quote="GIGA"]').click();await page.locator('#pricing.page-active').waitFor();
    const field=name=>page.locator('#qForm [name="'+name+'"]');
    assert.equal(await field('monthly').inputValue(),'195000');assert.equal(await field('province').inputValue(),'Đà Nẵng');assert.equal(await field('ward').inputValue(),'Hòa Xuân');
    assert.equal(await field('fee').inputValue(),'');assert.equal(await field('futureMonthly').inputValue(),'');
    await page.locator('#qPng').click();assert.match(await page.locator('#qMessage').textContent(),/Phí hòa mạng/);
    for(const [name,value]of Object.entries({customer:'Nguyễn Văn A <Khách>',address:'123 Đường A',need:'Làm việc và giải trí',months:'6',giftMonths:'1',fee:'300000',discount:'70000',futureMonthly:'250000',contact:'0900000000',validUntil:'2099-11-12'}))await field(name).fill(value);
    await field('vat').selectOption('included');
    for(const item of [{name:'Camera ngoài trời',price:'500000',billing:'once'},{name:'Cloud',price:'50000',billing:'monthly'}]){await page.locator('#qAdd').click();const row=page.locator('.q-extra').last();await row.locator('[data-field="name"]').fill(item.name);await row.locator('[data-field="price"]').fill(item.price);await row.locator('[data-field="billing"]').selectOption(item.billing);}
    assert.match(await page.locator('.q-doc-total').textContent(),/2\.200\.000/);
    await field('vat').selectOption('excluded');await field('vatRate').fill('10');assert.match(await page.locator('.q-doc-total').textContent(),/2\.420\.000/);
    await field('vat').selectOption('included');await field('confirmed').check();
    assert.equal(await page.locator('.q-doc-draft').count(),0);
    assert.equal(await page.locator('#qDocument .q-doc-logo').count(),1);
    assert.match(await page.locator('.q-doc-logo').getAttribute('src'),/^data:image\/webp;base64,/);
    assert.match(await page.locator('.q-doc-region').textContent(),/Đà Nẵng · Hòa Xuân/);
    await field('province').fill('Hà Nội');await field('ward').fill('Hà Đông');
    assert.match(await page.locator('.q-doc-region').textContent(),/Hà Nội · Hà Đông/);
    assert.doesNotMatch(await page.locator('#qDocument footer').textContent(),/Đà Nẵng/);
    await field('province').fill('Đà Nẵng');await field('ward').fill('Hòa Xuân');await field('confirmed').check();
    await page.locator('#qSave').click();const key='ibb5-quotes-v1:quote-staff';
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0].quote.monthly,key),'195000');
    await field('monthly').fill('210000');assert.equal(await field('confirmed').isChecked(),false);
    assert.equal(await page.evaluate(key=>JSON.parse(localStorage.getItem(key))[0].quote.monthly,key),'195000');
    if(!await page.locator('.q-history').evaluate(el=>el.open))await page.locator('.q-history summary').click();page.once('dialog',dialog=>dialog.accept());await page.locator('[data-open="0"]').click();assert.equal(await field('monthly').inputValue(),'195000');
    const download=page.waitForEvent('download');await page.locator('#qPng').click();const png=await download;assert.match(png.suggestedFilename(),/IBB5.*V1.*\.png$/);
    const bytes=fs.readFileSync(await png.path());assert.equal(bytes.subarray(1,4).toString(),'PNG');
    const output=process.env.QUOTE_SCREENSHOT_DIR;if(output)await png.saveAs(output+'/fpt-bao-gia-demo.png');
    const printWindow=page.waitForEvent('popup');await page.locator('#qPrint').click();const popup=await printWindow;await popup.locator('#qDocument').waitFor();
    assert.match(await popup.locator('#qDocument').textContent(),/Nguyễn Văn A <Khách>/);
    assert.match(await popup.locator('.q-doc-region').textContent(),/Đà Nẵng · Hòa Xuân/);
    assert.equal(await popup.locator('.q-doc-logo').evaluate(image=>image.complete&&image.naturalWidth===3840),true);
    const pdf=await popup.pdf({format:'A4',printBackground:true});assert.equal(pdf.subarray(0,4).toString(),'%PDF');if(output)fs.writeFileSync(output+'/fpt-bao-gia-demo.pdf',pdf);await popup.close();
    for(const width of [1440,390]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2));if(output)await page.screenshot({path:output+'/quote-builder-'+width+'.png'});}
    await page.reload();await page.locator('#qForm').waitFor();if(!await page.locator('.q-history').evaluate(el=>el.open))await page.locator('.q-history summary').click();assert.equal(await page.locator('[data-open]').count(),1);
    page.once('dialog',dialog=>dialog.accept());await page.locator('[data-open="0"]').click();assert.equal(await field('monthly').inputValue(),'195000');
    profile.id='other-staff';await page.reload();await page.locator('#qForm').waitFor();assert.equal(await page.locator('[data-open]').count(),0);
    assert.deepEqual(errors,[]);console.log('PASS: select real catalogue shape, financial validation, local version snapshots, PNG download, PDF content and desktop/mobile layout');
  }finally{await browser.close();await server.close();}
})().catch(err=>{console.error(err);process.exitCode=1;});
