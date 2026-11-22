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
  daily:[],
  countries:{
    US:{views:20,active_seconds:120},CA:{views:6,active_seconds:60},
    CL:{views:5,active_seconds:20},ID:{views:4,active_seconds:15},
    BD:{views:8,active_seconds:90},Unknown:{views:2,active_seconds:0}
  },
  divisions:{Unknown:{views:5,active_seconds:60},Dhaka:{views:3,active_seconds:30}},
  suspected_automated:{views:3,visitors:2,active_seconds:12,countries:{US:{views:3,active_seconds:12}}},
  api:{},provider_snapshots:{},notes:[]
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
  const submittedRoles=[],liveTasks=[{
    id:'expired-mock',role:'manager',created_at:'2020-01-01T00:00:00Z',
    instruction:'Old private conversation',status:'completed',result:{answer:'outdated private response'}
  }];
  await context.route('**/api/admin/tasks',route=>{
    if(route.request().method()==='POST'){
      const request=route.request().postDataJSON();
      submittedRoles.push(request.role);
      const when=new Date().toISOString();
      const task={id:'test-manager-1',role:request.role,created_at:when,updated_at:when,
        instruction:request.instruction,status:'completed',
        result:{answer:'জি স্যার, verified test response.',checked_at:when,
          delegations:[{role:'monitor',section:'monitor',status:'completed',checked_at:when,
            instruction:'Check real website and backend HTTP status.',
            outcome:'Website HTTP 200 and backend HTTP 200 were verified.'}]}};
      liveTasks.unshift(task);
      return route.fulfill({status:202,json:{task}});
    }
    return route.fulfill({status:200,json:{tasks:liveTasks,persistence:'temporary_filesystem'}});
  });
  await context.route('**/api/admin/staff/checks',route=>route.fulfill({status:200,json:{checks:[]}}));
  await context.route('**/api/admin/manager/notices',route=>route.fulfill({status:200,json:{
    notices:[{id:'morning-'+new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}),
      kind:'morning',role:'Manager',
      created_at:new Date(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'})+'T00:05:00+06:00').toISOString(),
      message:'আসসালামু আলাইকুম, স্যার। শুভ সকাল।'},
      {id:'daily-'+new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'}),
       kind:'daily_report',
       created_at:new Date(new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Dhaka'})+'T00:06:00+06:00').toISOString(),
       message:'আজকের অফিস রিপোর্ট: IT / Cyber / Admin / CSE প্রত্যেকে যাচাই করেছেন।',
       daily_delegations:[
         {role:'monitor',instruction:'Daily website check',outcome:'Website and Backend HTTP 200',status:'ok'},
         {role:'security',instruction:'Daily security signals',outcome:'No proven hacking; limited evidence',status:'limited'},
         {role:'mail',instruction:'Daily Help inbox check',outcome:'Help inbox: no messages',status:'ok'},
         {role:'code',instruction:'Daily function error scan',outcome:'Two anonymized PDF error events, cause unknown',status:'attention'}
       ]}],
    scheduled_monitor_checked:true
  }}));
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
  assert.equal(await page.locator('#manager-chat-head').isVisible(),false,'manager chat head hidden until authenticated');
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
  const headButton=page.locator('#manager-chat-head');
  assert.equal(await headButton.isVisible(),true,'independent robot chat head is available after sign-in');
  assert.equal(await headButton.evaluate(el=>el.parentElement.id),'workspace-shell','floating bot must not be attached to the sidebar');
  assert.equal(await headButton.evaluate(el=>getComputedStyle(el).position),'fixed','bot chat head floats independently');
  const headRect=await headButton.boundingBox(),menuRect=await page.locator('#sidebar-toggle').boundingBox();
  assert(headRect.y>menuRect.y+90,'bot head must be clearly below the sidebar menu button');
  assert.equal(await headButton.isEnabled(),true,'authenticated owner can open Manager');
  assert.equal(await headButton.locator('svg').count(),1,'sidebar uses a small bot icon, not a text link');
  assert.equal((await headButton.textContent()).trim(),'','bot head has no visible label');
  assert.equal(await page.locator('#manager-chat-shortcut').count(),0,'no redundant text menu entry');
  assert.equal(await page.locator('#manager-chat-open').count(),0,'no new button near the office');
  assert.equal(await page.locator('.manager-office-actions').count(),0,'original office remains free of extra toolbars');
  await headButton.click();
  await page.locator('#manager-chat-panel').waitFor({state:'visible'});
  assert.equal(await headButton.getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('#dashboard').isVisible(),true,'sidebar chat head overlays Analytics without switching sections');
  assert.equal(await page.locator('#staff-workspace').isVisible(),false,'staff office stays hidden behind sidebar chat opened from Analytics');
  assert.equal(await page.locator('#manager-chat-panel > .panel').count(),0,'no boxed Manager card above the chat');
  assert.equal(await page.locator('#manager-chat-panel .manager-chat-compose').count(),1,'one bottom-anchored message composer');
  const composer=await page.locator('.manager-chat-compose').boundingBox();
  const transcript=await page.locator('.manager-chat-transcript').boundingBox();
  assert(composer.y>=transcript.y+transcript.height-3,'message composer stays below the conversation');
  assert(composer.y+composer.height>height-35,'composer is near the bottom of the viewport');
  assert.equal(await page.locator('#ops-history').textContent().then(s=>s.includes('Old private conversation')),false,
    'messages older than three days are hidden from the conversation');
  await page.waitForFunction(()=>Boolean(document.querySelector('#ops-history .manager-chat-notice')));
  const initialBubble=await page.locator('#ops-history .ops-message').last().boundingBox();
  const initialTranscript=await page.locator('.manager-chat-transcript').boundingBox();
  assert(initialBubble.y+initialBubble.height>initialTranscript.y+initialTranscript.height-47,
    'When chat has one greeting, it must sit at bottom like Messenger, not at top');
  const welcomeText=await page.locator('.manager-chat-notice').first().textContent();
  assert.match(welcomeText,/আসসালামু আলাইকুম/);
  assert(!welcomeText.includes('আপনার কোনো নির্দেশ থাকলে বলুন'),
    'Unrequested command prompts must not appear in the daily greeting');
  await page.keyboard.press('Escape');
  await page.locator('#manager-chat-panel').waitFor({state:'hidden'});
  assert.equal(await headButton.getAttribute('aria-expanded'),'false');
  assert.equal(await page.locator('#dashboard').isVisible(),true,'closing Manager returns to the original Analytics view');
  const header=await page.locator('.admin-header').boundingBox();
  const brand=page.locator('.admin-header .header-brand img');
  const brandBox=await brand.boundingBox();
  const copy=page.locator('.admin-header .header-copy');
  const copyBox=await copy.boundingBox();
  const menuBox=await page.locator('#sidebar-toggle').boundingBox();
  assert.equal(await brand.getAttribute('src'),'/walid-ai-approved-logo.png','Header uses the original approved logo');
  assert.equal(await page.locator('#admin-sidebar .site-logo-link').count(),0,'Logo is on left of header, not duplicated in sidebar');
  assert.equal(await page.locator('.admin-header h1').textContent(),'Walid AI Admin');
  assert.match(await page.locator('.admin-header p').textContent(),/Analytics, team operations and approvals/);
  assert(brandBox.width>=85,'Official header logo must remain visible');
  assert(brandBox.x < copyBox.x+copyBox.width/2,'Logo placed to left of centered title');
  assert(menuBox.x < brandBox.x,'Collapsible sidebar menu is preserved left of the admin header');
  assert(Math.abs((copyBox.x+copyBox.width/2)-(header.x+header.width/2))<15,
    'Admin title and subtitle must be horizontally centered');
  const headerOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth);
  assert(headerOverflow<=3,'Header must not cause horizontal scrolling: '+headerOverflow);
  const regionText=await page.locator('#regions').textContent();
  for(const fullName of ['United States','Canada','Chile','Indonesia','Bangladesh','Unknown country','Dhaka Division']){
    assert(regionText.includes(fullName),'Full audience location label missing: '+fullName);
  }
  assert(!regionText.includes('Division unknown'),'Unknown Bangladesh division must not be a duplicate audience row');
  assert.equal((regionText.match(/Bangladesh/g)||[]).length,1,'Bangladesh must appear just once');
  for(const code of ['(US)','(BD)','(CA)','(CL)','(ID)'])assert(!regionText.includes(code),'No country abbreviations: '+code);
  assert.equal(await page.locator('#regions tbody tr').count(),7,'Six country entries and one known division; no unknown duplicate');
  assert.equal(await page.locator('#stats .card').count(),7,'Dashboard must show seven KPI cards after removing redundant Most Played Game');
  assert(!await page.locator('#stats').textContent().then(text=>text.includes('Most played game')),
    'Most Played Game must be removed; Top 5 remains available');
  const automatedText=await page.locator('#automation-summary').textContent();
  assert.match(automatedText,/Possible automated traffic/);
  assert.match(automatedText,/3 views/);
  assert.match(automatedText,/2 estimated browsers/);
  assert.match(automatedText,/Older traffic cannot be reliably classified/);
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
  const columnsFor=async(section)=>sections.nth(section).locator('.section-metrics-table thead th').allTextContents();
  const expectedColumns={
    chat:['Feature','Visitors ≈','Views','Answers','Errors','Active time'],
    tools:['Feature','Visitors ≈','Views','Starts','Completed','Errors','Active time'],
    learning:['Feature','Visitors ≈','Views','Starts','Completed','Active time'],
    reading:['Feature','Visitors ≈','Views','Active time'],
  };
  assert.deepEqual(await columnsFor(0),expectedColumns.chat,'AI Chat shows answers and errors, not starts/completed');
  assert.deepEqual(await columnsFor(1),expectedColumns.tools,'PDF shows tool starts/completions/errors, no answers');
  assert.deepEqual(await columnsFor(2),expectedColumns.tools,'Image shows tool starts/completions/errors, no answers');
  assert.deepEqual(await columnsFor(3),expectedColumns.learning,'Games show starts and completed only');
  assert.deepEqual(await columnsFor(4),expectedColumns.learning,'Education shows starts and completed only');
  assert.deepEqual(await columnsFor(5),expectedColumns.reading,'Quran is reading-only');
  assert.deepEqual(await columnsFor(6),expectedColumns.reading,'Sports has only visits, views and active time');
  const otherHeaders=sections.nth(7).locator('details.analytics-subsection .section-metrics-table thead th');
  assert.equal(await otherHeaders.count(),3*expectedColumns.reading.length,'All three Others subcategories use reading-only columns');
  for(const values of await otherHeaders.allTextContents())assert(expectedColumns.reading.includes(values),'Others books have no irrelevant columns: '+values);
  for(const i of [0,1,2,3,4,5,6]){
    const thCount=await sections.nth(i).locator('.section-metrics-table thead th').count();
    const tdCount=await sections.nth(i).locator('.section-metrics-table tbody tr').first().locator('td').count();
    assert.equal(tdCount,thCount,'Section '+i+' row values match context-specific header count');
  }
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
  // The menu opens over the document like a chapter drawer. Neither the content
  // grid nor any analytics card may get squeezed/pushed horizontally.
  const beforeMenu=await page.evaluate(()=>{
    const box=selector=>{
      const el=document.querySelector(selector),rect=el.getBoundingClientRect();
      return {x:rect.x,width:rect.width};
    };
    return {content:box('.admin-content'),dashboard:box('#dashboard'),
      header:box('.admin-header'),
      grid:getComputedStyle(document.querySelector('#workspace-shell')).gridTemplateColumns};
  });
  await page.locator('#sidebar-toggle').click();
  assert.equal(await page.locator('#sidebar-details').isVisible(),true,'menu items expand on click');
  assert.equal(await page.locator('#sidebar-toggle').getAttribute('aria-expanded'),'true');
  const expandedMenu=await page.evaluate(()=>{
    const box=selector=>{
      const rect=document.querySelector(selector).getBoundingClientRect();
      return {x:rect.x,width:rect.width};
    };
    return {content:box('.admin-content'),dashboard:box('#dashboard'),
      header:box('.admin-header'),sidebar:box('#admin-sidebar'),
      grid:getComputedStyle(document.querySelector('#workspace-shell')).gridTemplateColumns,
      overflow:document.documentElement.scrollWidth-innerWidth};
  });
  for(const selector of ['content','dashboard','header']){
    assert(Math.abs(expandedMenu[selector].x-beforeMenu[selector].x)<1,
      'Opening the sidebar must not move '+selector+' horizontally');
    assert(Math.abs(expandedMenu[selector].width-beforeMenu[selector].width)<1,
      'Opening the sidebar must not reduce '+selector+' width');
  }
  assert.equal(expandedMenu.grid,beforeMenu.grid,'Sidebar must never resize the Admin CSS grid');
  assert(expandedMenu.sidebar.width>=225,'Expanded navigation displays a readable overlay menu');
  assert(expandedMenu.sidebar.x+expandedMenu.sidebar.width>expandedMenu.content.x+20,
    'The expanded sidebar overlaps content instead of pushing it');
  assert(expandedMenu.overflow<=3,'Expanded sidebar must not cause horizontal overflow');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#sidebar-details').isVisible(),false,'Escape closes overlay');
  const closedContent=await page.locator('.admin-content').boundingBox();
  assert(Math.abs(closedContent.x-beforeMenu.content.x)<1,'Closing sidebar does not shift content');
  await page.locator('#sidebar-toggle').click();
  await page.locator('[data-admin-tab="staff"]').click();
  assert.equal(await page.locator('#sidebar-details').isVisible(),false,'menu collapses when section chosen');
  assert.equal(await page.locator('#dashboard').isVisible(),false,'analytics hidden in staff tab');
  assert.equal(await page.locator('#staff-workspace').isVisible(),true);
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),false);
  assert.equal(new URL(page.url()).pathname,'/admin/','menu must not change URL');
  assert.equal(new URL(page.url()).hash,'','no section hash');
  await page.frameLocator('#preserved-staff-office').locator('.desk-grid').waitFor({state:'visible',timeout:20000});
  const officeFrame=page.locator('#preserved-staff-office');
  assert.equal(await officeFrame.getAttribute('scrolling'),'no',
    'Embedded Office cannot scroll independently of the authenticated Admin page');
  await page.waitForFunction(()=>{
    const frame=document.querySelector('#preserved-staff-office');
    const doc=frame?.contentDocument;
    const content=doc?.querySelector('main');
    return content&&Math.abs(frame.getBoundingClientRect().height-content.getBoundingClientRect().height-2)<8;
  },null,{timeout:12000});
  const embedded=await officeFrame.evaluate(frame=>{
    const doc=frame.contentDocument;
    return {
      footer:doc.defaultView.getComputedStyle(doc.querySelector('.legal-footer')).display,
      header:doc.defaultView.getComputedStyle(doc.querySelector('.topbar')).display,
      htmlClass:doc.documentElement.className,
      frameHeight:frame.getBoundingClientRect().height,
      contentHeight:doc.querySelector('main').getBoundingClientRect().height,
      networkAnimation:doc.defaultView.getComputedStyle(doc.querySelector('.network path')).animationName
    };
  });
  assert.equal(embedded.footer,'none','Embedded Office footer is hidden; only the parent Admin footer appears');
  assert.equal(embedded.header,'none','Embedded Office cannot duplicate the Admin navigation');
  assert.match(embedded.htmlClass,/embedded-office/);
  assert.equal(embedded.networkAnimation,'none','Office network must not move by itself');
  assert(Math.abs(embedded.frameHeight-embedded.contentHeight-2)<8,
    'Embedded Office must fit actual content without a self-referential blank scroll area');
  const robotCount=await page.frameLocator('#preserved-staff-office').locator('.desk').count();
  assert.equal(robotCount,5,'all original five workstations remain');
  const heading=await page.frameLocator('#preserved-staff-office').locator('.intro h1').textContent();
  assert.equal(heading.trim(),'AI Staff Office','Office uses one professional, concise heading');
  assert.equal(await page.frameLocator('#preserved-staff-office').locator('.intro p').count(),0,
    'No redundant technical subtitle above the robots');
  for(const selector of ['.desk.manager','.desk.it','.desk.cyber','.desk.cse','.desk.admin']){
    const aligned=await page.frameLocator('#preserved-staff-office').locator(selector).evaluate(el=>{
      const name=el.querySelector('.desk-name'),role=el.querySelector('.desk-role');
      const desk=el.getBoundingClientRect(),nameBox=name.getBoundingClientRect();
      return {title:getComputedStyle(name).textAlign,subtitle:getComputedStyle(role).textAlign,
        centerDelta:Math.abs((nameBox.left+nameBox.width/2)-(desk.left+desk.width/2))};
    });
    assert.equal(aligned.title,'center','Staff desk title must be centered');
    assert.equal(aligned.subtitle,'center','Staff desk subtitle must be centered');
    assert(aligned.centerDelta<3,'Staff title box stays centered within the original desk');
  }

  assert.equal(await page.locator('#ops-checks').count(),0,'No duplicate Run real checks button below robots');
  assert.equal(await page.locator('#ops-reload').count(),0,'No duplicate Refresh history button below robots');
  assert.equal(await page.frameLocator('#preserved-staff-office').locator('.details').count(),0,
    'No redundant staff history panel underneath the original office');
  for(const role of ['it','cyber','cse','admin']){
    await page.frameLocator('#preserved-staff-office').locator('.desk.'+role).click();
    assert.equal(await page.frameLocator('#preserved-staff-office').locator('.greeting-bubble').count(),1,
      'Exactly one bubble after clicking '+role);
    assert.equal(await page.frameLocator('#preserved-staff-office').locator('.desk.'+role+' .greeting-bubble').textContent(),
      'Assalamu Alaykum, Sir');
    assert.equal(await page.locator('#manager-chat-panel').isVisible(),false,
      'Subordinate desk greeting must not open Manager messenger');
  }
  assert.equal(await page.locator('#manager-chat-panel').isVisible(),false,'Manager drawer initially closed');
  await page.frameLocator('#preserved-staff-office').locator('.desk.manager').click();
  await page.locator('#manager-chat-panel').waitFor({state:'visible'});
  assert.equal(await page.frameLocator('#preserved-staff-office').locator('.desk.manager .greeting-bubble').textContent(),
    'Assalamu Alaykum, Sir','Manager desk greets respectfully as well');
  assert.equal(await page.locator('#manager-chat-panel').getAttribute('aria-hidden'),'false');
  assert.equal(await page.locator('#ops-role-name').textContent(),'Manager');
  await page.locator('#ops-input').fill('আজকের visitor এবং সাইটের সমস্যা যাচাই করো');
  await page.locator('#ops-send').click();
  await page.waitForFunction(()=>{
    const messages=[...document.querySelectorAll('#ops-history .ops-message.answer p')];
    return Boolean(messages.at(-1)?.textContent.includes('verified test response'));
  },null,{timeout:10000});
  assert.deepEqual(submittedRoles,['manager'],'only Manager receives owner commands');
  const question=await page.locator('#ops-history .ops-message.question').last().boundingBox();
  const answer=await page.locator('#ops-history .ops-message.answer').last().boundingBox();
  assert(question.x>answer.x+25,'owner messages are aligned right of Manager replies');
  assert.match(await page.locator('#ops-history .ops-message.question').last().textContent(),/আজকের visitor/);
  assert.match(await page.locator('#ops-history .ops-message.answer').last().textContent(),/verified test response/);
  const finalBubble=await page.locator('#ops-history .ops-message').last().boundingBox();
  const fullTranscript=await page.locator('.manager-chat-transcript').boundingBox();
  assert(finalBubble.y+finalBubble.height>fullTranscript.y+fullTranscript.height-47,
    'Each new reply appears at bottom and earlier chat travels upward');
  assert.equal(await page.locator('.manager-delegations').count(),0,
    'Detailed staff tasks must never expand below owner Manager messages');
  assert.equal(await page.locator('#ops-history').textContent().then(t=>t.includes('Check real website and backend HTTP status')),false,
    'Manager must not narrate staff delegation in the owner conversation');
  assert.equal(await page.locator('#manager-staff-chats').isVisible(),true,
    'Dedicated Staff conversations are available only through the header');
  await page.locator('#manager-staff-chats').click();
  assert.equal(await page.locator('#ops-role-name').textContent(),'Staff chats');
  assert.equal(await page.locator('#manager-staff-list').isVisible(),true);
  assert.equal(await page.locator('.manager-chat-compose').isVisible(),false,
    'Staff conversations are read-only, owner can only message Manager');
  assert.equal(await page.locator('#ops-history').isVisible(),false,
    'Team conversation list is a separate Messenger view');
  await page.locator('.manager-staff-choice').filter({hasText:'IT Technician'}).click();
  assert.equal(await page.locator('#ops-role-name').textContent(),'IT Technician');
  assert.equal(await page.locator('#manager-staff-thread').isVisible(),true);
  assert.match(await page.locator('#manager-staff-thread .ops-message.question').first().textContent(),
    /Daily website check/);
  assert.match(await page.locator('#manager-staff-thread .ops-message.answer').first().textContent(),
    /Website and Backend HTTP 200/);
  assert.match(await page.locator('#manager-staff-thread .ops-message.question').last().textContent(),
    /Check real website and backend HTTP status/);
  assert.match(await page.locator('#manager-staff-thread .ops-message.answer').last().textContent(),
    /Website HTTP 200/);
  const sent=await page.locator('#manager-staff-thread .ops-message.question').first().boundingBox();
  const reported=await page.locator('#manager-staff-thread .ops-message.answer').first().boundingBox();
  assert(sent.x>reported.x+25,'Manager commands are on the right, verified staff outcomes on the left');
  await page.locator('#manager-thread-back').click();
  assert.equal(await page.locator('#manager-staff-list').isVisible(),true);
  await page.locator('.manager-staff-choice').filter({hasText:'Admin Staff'}).click();
  assert.match(await page.locator('#manager-staff-thread').textContent(),/Daily Help inbox check/);
  assert.match(await page.locator('#manager-staff-thread').textContent(),/Help inbox: no messages/);
  assert.equal(await page.locator('.manager-chat-compose').isVisible(),false,
    'Owner cannot directly instruct Admin Staff');
  await page.locator('#manager-thread-back').click();
  await page.locator('#manager-thread-back').click();
  assert.equal(await page.locator('#ops-history').isVisible(),true);
  assert.equal(await page.locator('.manager-chat-compose').isVisible(),true);
  assert.equal(await page.locator('#ops-role-name').textContent(),'Manager');
  await page.locator('#manager-chat-close').click();
  await page.locator('#manager-chat-panel').waitFor({state:'hidden'});
  assert.equal(await page.locator('#manager-chat-panel').getAttribute('aria-hidden'),'true','drawer closes without changing office');
  await page.frameLocator('#preserved-staff-office').locator('.desk.it').click();
  assert.equal(await page.locator('#manager-chat-panel').isVisible(),false,'subordinate desk cannot open direct chat');
  await headButton.click();
  await page.locator('#manager-chat-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('#manager-chat-panel').getAttribute('aria-hidden'),'false','sidebar robot chat head opens Manager from Staff tab');
  assert.equal(await page.locator('#staff-workspace').isVisible(),true,'office remains selected behind the chat head');
  await page.keyboard.press('Escape');
  await page.locator('#manager-chat-panel').waitFor({state:'hidden'});
  assert.equal(await page.locator('#manager-chat-panel').getAttribute('aria-hidden'),'true','Escape closes drawer');
  await page.locator('#sidebar-toggle').click();
  await page.locator('[data-admin-tab="riddlex"]').click();
  await headButton.click();
  await page.locator('#manager-chat-panel').waitFor({state:'visible'});
  assert.equal(await page.locator('#riddlex-workspace').isVisible(),true,'Manager overlay does not navigate away from Riddlex');
  await page.locator('#manager-chat-close').click();
  await page.locator('#manager-chat-panel').waitFor({state:'hidden'});
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
    await exercise(browser,1649,928);
    await exercise(browser,1366,768);
    await exercise(browser,390,844);
  }finally{await browser.close()}
})().catch(error=>{console.error(error);process.exit(1)});
