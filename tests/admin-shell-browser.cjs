/* End-to-end owner portal contract: no pre-auth navigation, one selected panel,
   collapsed sidebar by default, and original staff artwork preserved. */
const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const root='http://127.0.0.1:8765';
const usage={
  date:'2026-11-22',
  lifetime:{visitors:42},today:{visitors:3},
  period:{visitors:11,views:56,active_seconds:80},
  storage:{mode:'firestore',durable:true,last_error:'',dropped_server_events:0},
  features:[
    {feature:'surah_al_fatiha',visitors:1,views:7,starts:0,completions:0,answers:0,errors:0,active_seconds:90},
    {feature:'game_riddlex',visitors:2,views:3,starts:2,completions:0,answers:0,errors:0,active_seconds:66},
    {feature:'tool_merge_pdf',visitors:2,views:4,starts:2,completions:1,answers:0,errors:0,active_seconds:35},
    {feature:'book_history_roman_empire',visitors:3,views:4,starts:0,completions:0,answers:0,errors:0,active_seconds:30},
    {feature:'education_notes',visitors:2,views:6,starts:2,completions:0,answers:0,errors:0,active_seconds:15}
  ],
  sections:Object.fromEntries(['chat','pdf','image','games','education','islam','sports','others']
    .map(key=>[key,{visitors:4,views:8,starts:2,active_seconds:80,completions:1,answers:0,errors:0}])),
  subsections:{
    islam:{quran:{visitors:1,views:7,active_seconds:90}},
    others:{history:{visitors:3,views:4,active_seconds:30}}
  },
  daily:[],countries:{},divisions:{},api:{},provider_snapshots:{},notes:[]
};
async function exercise(browser, width, height){
  const context=await browser.newContext({viewport:{width,height}});
  await context.route('**/backend-config.js',route=>route.fulfill({
    status:200,contentType:'text/javascript',
    body:'window.WALID_AI_API="http://127.0.0.1:8765";'
  }));
  await context.route('**/api/admin/usage?days=*',route=>route.fulfill({status:200,json:usage}));
  await context.route('**/api/admin/help',route=>route.fulfill({status:200,json:{reports:[]}}));
  await context.route('**/api/admin/staff',route=>route.fulfill({status:200,json:{
    status:{
      staff_api:{configured:true},staff:[],capabilities:{ai_available:true},
      persistence:{mode:'temporary_filesystem',durable:false}
    },
    tasks:[]
  }}));
  await context.route('**/api/admin/tasks',route=>route.fulfill({status:200,json:{tasks:[],persistence:'temporary_filesystem'}}));
  await context.route('**/api/admin/staff/checks',route=>route.fulfill({status:200,json:{checks:[]}}));
  // Approval UI is tested for section isolation only, not external Firebase sign-in.
  await context.route('**/www.gstatic.com/firebasejs/**',route=>route.abort());
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  const retired=await context.request.get(root+'/admin.html',{maxRedirects:0});
  assert.equal(retired.status(),404,'The retired .html route must 404, without redirect');
  await page.goto(root+'/admin/',{waitUntil:'domcontentloaded'});
  assert.equal(new URL(page.url()).pathname,'/admin/');
  await page.locator('.login-logo').waitFor({state:'visible'});
  assert.equal(await page.locator('#workspace-shell').isVisible(),false,'all navigation hidden before auth');
  assert.equal(await page.locator('#sidebar-toggle').isVisible(),false,'menu button hidden before auth');
  assert.equal(await page.locator('#dashboard').isVisible(),false,'analytics hidden before auth');
  assert.equal(await page.locator('#staff-workspace').isVisible(),false,'staff hidden before auth');
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),false,'approvals hidden before auth');
  const logo=await page.locator('.login-logo').boundingBox();
  const login=await page.locator('.auth-card').boundingBox();
  assert(logo.width>=195,'original logo is prominent on sign-in');
  assert(Math.abs(login.x+login.width/2-width/2)<25,'login centered horizontally');
  assert(Math.abs(login.y+login.height/2-height/2)<135,'login centered vertically');
  const theme=await page.evaluate(()=>getComputedStyle(document.body).color);
  assert.equal(theme,'rgb(232, 244, 255)','navy/cyan design uses consistent readable text');
  await page.locator('#key').fill('test-owner-key');
  await page.locator('#enter').click();
  await page.locator('#workspace-shell').waitFor({state:'visible'});
  assert.equal(await page.locator('#auth-screen').isVisible(),false,'sign-in card hidden after login');
  assert.equal(await page.locator('#dashboard').isVisible(),true);
  const topButton=page.locator('#top-feature-toggle');
  const topPanel=page.locator('#top-five-features');
  assert.equal(await topButton.count(),1,'Most Active Feature card is clickable');
  assert.equal(await topPanel.isVisible(),false,'Top 5 remains hidden initially');
  assert.match(await topButton.textContent(),/সূরা আল-ফাতিহা/);
  await topButton.click();
  assert.equal(await topPanel.isVisible(),true,'Click opens Top 5 ranking');
  assert.equal(await topButton.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#top-five-list > li').count(),5,'Exactly five ranked features');
  const first=await page.locator('#top-five-list > li').first().textContent();
  assert.match(first,/01/);
  assert.match(first,/সূরা আল-ফাতিহা/,'Popular surah must appear by name');
  assert.match(first,/Active time: 0h 1m/);
  assert.match(await topPanel.textContent(),/রোমান সাম্রাজ্য/,'Popular book must appear by name');
  assert.match(await topPanel.textContent(),/Riddlex/);
  await page.locator('#top-five-close').click();
  assert.equal(await topPanel.isVisible(),false,'Close hides the ranking');
  assert.equal(await topButton.getAttribute('aria-expanded'),'false');
  const sections=page.locator('#features > details.analytics-section');
  assert.equal(await sections.count(),8,'Current homepage sections only');
  assert.deepEqual(await page.locator('#features > details.analytics-section > summary .section-title').allTextContents(),[
    'AI Chat','PDF Tools','Image Tools','Games','Education','Al-Quran & Islam','Sports','Others'
  ],'Dashboard section names and order must match the homepage');
  assert.equal(await page.locator('#features details[open]').count(),0,'All details start closed');
  await sections.nth(1).locator('summary').first().click();
  assert.equal(await sections.nth(1).getAttribute('open'),'','PDF opens with the arrow');
  assert.match(await sections.nth(1).textContent(),/Merge PDF/);
  assert.match(await sections.nth(1).textContent(),/Bengali OCR/);
  await sections.nth(1).locator('summary').first().click();
  await sections.nth(5).locator('summary').first().click();
  assert.match(await sections.nth(5).textContent(),/আল-কুরআন/);
  assert.doesNotMatch(await sections.nth(5).textContent(),/আল-ফাতিহা|আল-বাকারা/,
    'Quran must never show a 114-surah list in the section');
  assert.match(await page.locator('#stats').textContent(),/সূরা আল-ফাতিহা/,
    'Most Active Feature may identify one popular surah');
  await sections.nth(7).locator('summary').first().click();
  const history=sections.nth(7).locator('details.analytics-subsection').first();
  await history.locator('summary').first().click();
  assert.match(await history.textContent(),/রোমান সাম্রাজ্য/);
  assert.equal(await page.locator('#notes').count(),0,'Technical privacy essay removed from admin dashboard');
  await sections.nth(5).locator('summary').first().click();
  await sections.nth(7).locator('summary').first().click();
  assert.equal(await page.locator('#sidebar-details').isVisible(),false,'sidebar items collapsed after login');
  assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'false');
  await page.locator('#sidebar-toggle').click();
  assert.equal(await page.locator('#sidebar-details').isVisible(),true,'menu items expand on click');
  assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
  await page.locator('[data-admin-tab="staff"]').click();
  assert.equal(await page.locator('#sidebar-details').isVisible(),false,'menu collapses when section chosen');
  assert.equal(await page.locator('#dashboard').isVisible(),false,'analytics hidden in staff tab');
  assert.equal(await page.locator('#staff-workspace').isVisible(),true);
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),false);
  assert.equal(new URL(page.url()).pathname,'/admin/','menu must not change URL');
  assert.equal(new URL(page.url()).hash,'','no section hash');
  await page.frameLocator('#preserved-staff-office').locator('.desk-grid').waitFor({state:'visible',timeout:20000});
  const robotCount=await page.frameLocator('#preserved-staff-office').locator('.desk').count();
  assert.equal(robotCount,5,'all original five workstations remain');
  const heading=await page.frameLocator('#preserved-staff-office').locator('.intro h1').textContent();
  assert.match(heading,/Five desks\. One protected network\./);
  await page.locator('#sidebar-toggle').click();
  await page.locator('[data-admin-tab="riddlex"]').click();
  assert.equal(await page.locator('#staff-workspace').isVisible(),false);
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),true);
  assert.equal(await page.locator('#dashboard').isVisible(),false);
  await page.locator('#sidebar-toggle').click();
  await page.locator('[data-admin-tab="dashboard"]').click();
  assert.equal(await page.locator('#dashboard').isVisible(),true);
  assert.equal(await page.locator('#staff-workspace').isVisible(),false);
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),false);
  if(width<600){
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
    assert(overflow<=3,'mobile layout must not overflow horizontally, overflow='+overflow);
  }
  assert.equal(new URL(page.url()).pathname,'/admin/','navigating tabs keeps the clean URL');
  assert.equal(new URL(page.url()).hash,'');
  await page.locator('#exit').click();
  assert.equal(await page.locator('#auth-screen').isVisible(),true,'sign-out returns to login');
  assert.equal(await page.locator('#workspace-shell').isVisible(),false,'no sidebar after sign-out');
  assert.equal(await page.locator('#sidebar-toggle').isVisible(),false);
  assert.deepEqual(errors.filter(message=>!message.includes('Firebase')),[],'no unhandled JS errors');
  await context.close();
  console.log('Admin portal browser passed for '+width+'×'+height);
}
(async()=>{
  const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  try{
    await exercise(browser,1366,768);
    await exercise(browser,390,844);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
