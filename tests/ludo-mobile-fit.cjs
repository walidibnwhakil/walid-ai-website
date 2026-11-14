// Exercise actual game controls. Only dice randomness is seeded for repeatability;
// no pawn nodes, positions, geometry, classes, or game state are injected.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.LUDO_MOBILE_OUTPUT||'tests/fixtures/ludo-mobile-fit';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
async function tap(page,locator){
  await locator.waitFor({state:'visible'});
  await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
  const r=await locator.boundingBox();assert.ok(r);
  if(page.mobileInput)await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
  else await page.mouse.click(r.x+r.width/2,r.y+r.height/2);
}
async function launch(browser,config,mode){
  const width=config.width;
  const page=await browser.newPage({viewport:{width,height:config.height},deviceScaleFactor:config.dpr,isMobile:config.mobile,hasTouch:config.mobile,...(config.mobile?{userAgent:'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36'}:{}),reducedMotion:'reduce'});
  page.fixtureTag=`${mode}-${config.label}`;page.mobileInput=config.mobile;
  page.setDefaultTimeout(20000);
  await page.route('**/ludo/layout.css*',r=>r.fulfill({contentType:'text/css',body:fs.readFileSync(mode==='before'?'tests/fixtures/ludo-mobile-fit/baseline-layout.css':'games/ludo/layout.css','utf8')}));
  await page.route('**/ludo/pawn-layout.mjs*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(mode==='before'?'tests/fixtures/ludo-mobile-fit/baseline-pawns.mjs':'games/ludo/pawn-layout.mjs','utf8')}));
  await page.addInitScript(()=>{window.__diceRoll=6;Math.random=()=>(window.__diceRoll-.5)/6});
  await page.goto(`${base}/games/ludo/`,{waitUntil:'networkidle'});
  await page.locator('#mode-buttons [data-value="friend"]').click();
  await page.locator('#player-buttons [data-value="4"]').click();
  await page.locator('#start-game').click();
  await page.waitForURL(url=>url.searchParams.get('screen')==='board');
  await page.locator('.yard .pin-pawn').first().waitFor();
  return page;
}
async function move(page,roll,source,step){
  await page.evaluate(roll=>{window.__diceRoll=roll},roll);
  await tap(page,page.locator('.player-dice.active .die-face'));
  const pawn=page.locator(`${source}.playable-token`).first();await pawn.waitFor();
  const token=await pawn.getAttribute('data-token');
  await tap(page,pawn.locator('.pin-face'));
  await page.waitForFunction(({token,step})=>{const p=document.querySelector(`[data-token="${token}"]`);return p?.dataset.step===String(step)&&!p.classList.contains('moving')},{token,step},{timeout:20000});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  return token;
}
async function capture(page,width,name,token){
  await page.locator(`[data-token="${token}"] .pin-face`).evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));
  await page.waitForFunction(token=>{const pawn=document.querySelector(`[data-token="${token}"]`);return pawn&&[...pawn.parentElement.querySelectorAll('svg')].every(svg=>svg.classList.contains('tile-anchored')&&getComputedStyle(svg).transform==='none')},token,{timeout:20000});
  // Freeze animation clocks equally for exact desktop image comparisons.
  await page.evaluate(async()=>{for(const a of document.getAnimations()){a.pause();a.currentTime=0}await Promise.all([...document.images].filter(i=>i.complete&&i.naturalWidth>0).map(i=>i.decode().catch(()=>{})))});
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  await page.screenshot(); // Flush compositor updates before the comparison frame.
  // A screenshot forces SVG paint completion before reading the painted path.
  await page.screenshot({path:`${output}/${name}-${page.fixtureTag}.png`,fullPage:false});
  const data=await page.evaluate(token=>{
    const p=document.querySelector(`[data-token="${token}"]`),tile=p.parentElement;
    const a=p.querySelector('.pin-outline').getBoundingClientRect(),t=tile.getBoundingClientRect();
    const m=new DOMMatrix([a.width/54,0,0,a.height/74,a.left-5*a.width/54,a.top-3*a.height/74]);
    const tip=new DOMPoint(32,77+1.25*Math.hypot(10,12)/10).matrixTransform(m);
    const face=p.querySelector('.pin-face').getBoundingClientRect();
    return {token,step:p.dataset.step,tile:tile.className,cell:tile.style.gridArea,outline:a.toJSON(),face:face.toJSON(),tileRect:t.toJSON(),tip:{x:tip.x,y:tip.y},scale:m.a,pairCount:tile.querySelectorAll('.pin-pawn').length,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,zoom:getComputedStyle(document.body).zoom},svg:{viewBox:p.querySelector('svg').getAttribute('viewBox'),cssWidth:getComputedStyle(p.querySelector('svg')).width,cssHeight:getComputedStyle(p.querySelector('svg')).height,transform:getComputedStyle(p.querySelector('svg')).transform},pairAnchors:[...tile.querySelectorAll('.pin-outline')].map(path=>{const r=path.getBoundingClientRect();return {x:r.left+27*r.width/54,y:r.bottom}}),expectedFaceColor:getComputedStyle(p.querySelector('.pin-face')).fill,tileZ:getComputedStyle(tile).zIndex,pawnZ:getComputedStyle(p).zIndex,headHit:document.elementFromPoint(face.x+face.width/2,face.y+face.height/2)?.closest('.pin-pawn')?.dataset.token};
  },token);
  const r=data.tileRect,a=data.outline;
  const clip={x:Math.max(0,Math.min(r.x,a.x)-r.width),y:Math.max(0,Math.min(r.y,a.y)-r.height*.4),width:r.width*3,height:r.height*2.8};
  await page.screenshot({path:`${output}/${name}-closeup-${page.fixtureTag}.png`,clip});
  const screenshot=fs.readFileSync(`${output}/${name}-${page.fixtureTag}.png`).toString('base64');
  const headPixels=await page.evaluate(async({screenshot,face,expected})=>{
    const img=new Image();img.src='data:image/png;base64,'+screenshot;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);const ratio=img.width/innerWidth;
    const color=expected.match(/[\d.]+/g).slice(0,3).map(Number);
    return [.4,.5,.6].map(f=>{
      const actual=[...ctx.getImageData(Math.floor((face.x+face.width*f)*ratio),Math.floor((face.y+face.height*.7)*ratio),1,1).data].slice(0,3);
      return {actual,expected:color,visible:actual.every((v,i)=>Math.abs(v-color[i])<5)};
    });
  },{screenshot,face:data.face,expected:data.expectedFaceColor});
  data.headPixels=headPixels;
  const metrics=await page.evaluate(()=>{
    const b=document.querySelector('#board').getBoundingClientRect();
    const normalized=[...document.querySelectorAll('#board > :is(.track,.lane,.yard)')].map(t=>{const r=t.getBoundingClientRect();return {cell:t.style.gridArea,x:(r.x-b.x)/b.width,y:(r.y-b.y)/b.height,w:r.width/b.width,h:r.height/b.height}});
    return {board:b.toJSON(),normalized,styles:Object.fromEntries(['body','main','.ludo-stage','#board','.home-base','.yard'].map(selector=>{const e=document.querySelector(selector),s=getComputedStyle(e);return [selector,{rect:e.getBoundingClientRect().toJSON(),values:Object.fromEntries([...s].map(k=>[k,s.getPropertyValue(k)]))}]})),viewport:{cssWidth:innerWidth,cssHeight:innerHeight,dpr:devicePixelRatio,visualWidth:visualViewport.width,visualScale:visualViewport.scale,screenWidth:screen.width},scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,meta:document.querySelector('meta[name=viewport]').content};
  });
  const image=fs.readFileSync(`${output}/${name}-${page.fixtureTag}.png`).toString('base64');
  const pixels=await page.evaluate(async image=>{const i=new Image();i.src='data:image/png;base64,'+image;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);const bytes=ctx.getImageData(0,0,i.width,i.height).data;const hash=await crypto.subtle.digest('SHA-256',bytes);return {width:i.width,height:i.height,sha256:[...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('')}},image);
  return {name,width,...data,...metrics,pixels};
}

// Compare desktop sources on the same played state and compositor surface.
// Independent browser pages can rasterize isolated gradient edge pixels differently.
async function applyCurrentDesktopLayout(page,config){
  const current=fs.readFileSync('games/ludo/layout.css','utf8');
  const baseline=fs.readFileSync('tests/fixtures/ludo-mobile-fit/baseline-layout.css','utf8');
  const start=current.indexOf('/* Phones use width');
  const end=current.indexOf('/* Grid boundaries',start);
  assert.ok(start>=0&&end>start);
  // Lock all pre-existing CSS byte-for-byte. Only the mobile block may differ.
  assert.equal(current.slice(0,start)+current.slice(end),baseline,'desktop CSS remains unchanged');
  await page.addStyleTag({content:current.slice(start,end)});
  await page.unroute('**/ludo/pawn-layout.mjs*');
  await page.route('**/ludo/pawn-layout.mjs*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('games/ludo/pawn-layout.mjs','utf8')}));
  await page.evaluate(async()=>{
    const layout=await import('/games/ludo/pawn-layout.mjs?desktop-after-comparison');
    layout.layoutBoardPawns(document.querySelector('#board'));
  });
  page.fixtureTag=`after-${config.label}`;
}

(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const configs=[
    {label:'320',width:320,height:740,dpr:2,mobile:true},
    {label:'360',width:360,height:800,dpr:3,mobile:true},
    {label:'360-dpr1',width:360,height:800,dpr:1,mobile:true},
    {label:'390',width:390,height:844,dpr:3,mobile:true},
    // Representative Android configuration, not the missing user screenshot.
    {label:'android-representative',width:412,height:915,dpr:2.625,mobile:true},
    {label:'landscape',width:640,height:360,dpr:3,mobile:true},
    {label:'desktop-800',width:800,height:700,dpr:1,mobile:false},
    {label:'desktop-1024',width:1024,height:600,dpr:1,mobile:false},
    {label:'desktop-1440',width:1440,height:1000,dpr:1,mobile:false}
  ];
  const selected=process.env.LUDO_MOBILE_CASES?configs.filter(c=>process.env.LUDO_MOBILE_CASES.split(',').includes(c.label)):configs;
  const results=[];
  try{for(const config of selected){
    const modes={};
    if(!config.mobile){
      for(const scenario of ['single-normal','two-pawns']){
        const page=await launch(browser,config,'before');
        await move(page,6,'.yard .pin-pawn',0);
        const token=scenario==='single-normal'?await move(page,6,'.track .pin-pawn',6):await move(page,6,'.yard .pin-pawn',0);
        const before=await capture(page,config.width,scenario,token);
        await applyCurrentDesktopLayout(page,config);
        const after=await capture(page,config.width,scenario,token);
        const key=scenario==='single-normal'?'single':'pair';
        (modes.before||={})[key]=before;(modes.after||={})[key]=after;
        await page.close();
      }
    }else{
    for(const mode of ['before','after']){
      const page=await launch(browser,config,mode);const errors=[];page.on('pageerror',e=>errors.push(e.message));
      const token=await move(page,6,'.yard .pin-pawn',0);
      await move(page,6,'.track .pin-pawn',6);
      const single=await capture(page,config.width,'single-normal',token);
      // A fresh real game creates a played pair without manipulating board DOM.
      await page.close();
      const pairPage=await launch(browser,config,mode);pairPage.on('pageerror',e=>errors.push(e.message));
      await move(pairPage,6,'.yard .pin-pawn',0);const second=await move(pairPage,6,'.yard .pin-pawn',0);
      const pair=await capture(pairPage,config.width,'two-pawns',second);
      assert.equal(pair.pairCount,2);assert.deepEqual(errors,[]);await pairPage.close();
      modes[mode]={single,pair};
    }
    }
    fs.writeFileSync(`${output}/case-${config.label}.json`,JSON.stringify({config,...modes},null,2));
    const {before,after}=modes;
    if(config.mobile){
      for(const result of [after.single,after.pair]){
        assert.ok(Math.abs(result.board.width-result.board.height)<.1,'square board');
        assert.ok(result.board.x>=-.1&&result.board.right<=result.clientWidth+.1,'complete frame stays inside viewport');
        const main=result.styles.main;
        const available=main.rect.width-parseFloat(main.values['padding-left'])-parseFloat(main.values['padding-right']);
        assert.ok(Math.abs(result.board.width-available)<.1,'board uses all width remaining inside safe-area gutters');
        assert.ok(result.scrollWidth<=result.clientWidth,'no horizontal scrolling');
        assert.ok(result.headPixels.every(p=>p.visible),'heads paint above adjacent tiles');
      }
      assert.ok(after.single.face.width>before.single.face.width*1.08,'mobile single head readability improves');
      assert.ok(Math.abs(after.single.tip.x-after.single.tileRect.x-after.single.tileRect.width/2)<.1&&Math.abs(after.single.tip.y-after.single.tileRect.y-after.single.tileRect.height/2)<.1,'single pointed tip retains tile anchor');
      // Approved pair scale relative to its tile is preserved while the board grows.
      assert.ok(Math.abs(after.pair.outline.width/after.pair.tileRect.width-before.pair.outline.width/before.pair.tileRect.width)<.003,'pair keeps its relative artwork size');
      after.pair.pairAnchors.forEach((tip,i)=>{const tile=after.pair.tileRect;assert.ok(Math.abs(tip.x-tile.x-tile.width*[.26,.74][i])<.1&&Math.abs(tip.y-tile.y-tile.height/2)<.1,'both pair path tips retain their approved side-by-side anchors')});
      for(let i=0;i<before.single.normalized.length;i++)for(const key of ['x','y','w','h'])assert.ok(Math.abs(before.single.normalized[i][key]-after.single.normalized[i][key])<.003,'tile geometry stays proportional to board artwork');
    }else{
      assert.equal(after.single.pixels.sha256,before.single.pixels.sha256,'desktop single gameplay pixel-identical');
      assert.equal(after.pair.pixels.sha256,before.pair.pixels.sha256,'desktop pair gameplay pixel-identical');
    }
    results.push({config,...modes});console.log(JSON.stringify({config,before:{board:before.single.board.width,tile:before.single.tileRect.width,pawn:before.single.outline.height,head:before.single.face.width},after:{board:after.single.board.width,tile:after.single.tileRect.width,pawn:after.single.outline.height,head:after.single.face.width},desktopPixelIdentical:!config.mobile}));
    fs.writeFileSync(`${output}/measurements.json`,JSON.stringify(results,null,2)+'\n');
  }
  const low=results.find(r=>r.config.label==='360-dpr1'),high=results.find(r=>r.config.label==='360');
  if(low&&high)for(const mode of ['before','after']){
    assert.ok(Math.abs(low[mode].single.board.width-high[mode].single.board.width)<.001,'DPR does not change CSS board width');
    assert.ok(Math.abs(low[mode].single.outline.height-high[mode].single.outline.height)<.001,'DPR does not change CSS pawn size');
  }
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
