// Exercise actual game controls. Only dice randomness is seeded for repeatability;
// no pawn nodes, positions, geometry, classes, or game state are injected.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const baseline=process.env.LUDO_CAPTURE_BASELINE==='1';
const output=process.env.LUDO_GAMEPLAY_OUTPUT||`tests/fixtures/ludo-readable-gameplay/${baseline?'before':'after'}`;
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const widths=process.env.LUDO_GAMEPLAY_WIDTHS?process.env.LUDO_GAMEPLAY_WIDTHS.split(',').map(Number):[360,390,1440];
async function tap(page,locator){
  await locator.waitFor({state:'visible'});
  const r=await locator.boundingBox();assert.ok(r);
  await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);
}
async function launch(browser,width){
  const page=await browser.newPage({viewport:{width,height:width===360?800:width===390?844:1000},deviceScaleFactor:width<600?3:2,isMobile:width<600,hasTouch:true,reducedMotion:'reduce'});
  page.setDefaultTimeout(20000);
  await page.addInitScript(()=>{window.__diceRoll=6;Math.random=()=>(window.__diceRoll-.5)/6});
  if(process.env.LUDO_LAYOUT_REFERENCE)await page.route('**/__ludu-reference-base.mjs',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync('games/ludo/pawn-layout.mjs','utf8')}));
  if(process.env.LUDO_LAYOUT_REFERENCE)await page.route('**/ludo/pawn-layout.mjs*',route=>route.fulfill({contentType:'text/javascript',body:fs.readFileSync(process.env.LUDO_LAYOUT_REFERENCE,'utf8')}));
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
  // A screenshot forces SVG paint completion before reading the painted path.
  await page.screenshot({path:`${output}/${name}-${width}.png`,fullPage:false});
  const data=await page.evaluate(token=>{
    const p=document.querySelector(`[data-token="${token}"]`),tile=p.parentElement;
    const a=p.querySelector('.pin-outline').getBoundingClientRect(),t=tile.getBoundingClientRect();
    const m=new DOMMatrix([a.width/54,0,0,a.height/74,a.left-5*a.width/54,a.top-3*a.height/74]);
    const tip=new DOMPoint(32,77+1.25*Math.hypot(10,12)/10).matrixTransform(m);
    const face=p.querySelector('.pin-face').getBoundingClientRect();
    return {token,step:p.dataset.step,tile:tile.className,cell:tile.style.gridArea,outline:a.toJSON(),face:face.toJSON(),tileRect:t.toJSON(),tip:{x:tip.x,y:tip.y},scale:m.a,pairCount:tile.querySelectorAll('.pin-pawn').length,viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio,zoom:getComputedStyle(document.body).zoom},svg:{viewBox:p.querySelector('svg').getAttribute('viewBox'),cssWidth:getComputedStyle(p.querySelector('svg')).width,cssHeight:getComputedStyle(p.querySelector('svg')).height,transform:getComputedStyle(p.querySelector('svg')).transform},expectedFaceColor:getComputedStyle(p.querySelector('.pin-face')).fill,tileZ:getComputedStyle(tile).zIndex,pawnZ:getComputedStyle(p).zIndex,headHit:document.elementFromPoint(face.x+face.width/2,face.y+face.height/2)?.closest('.pin-pawn')?.dataset.token};
  },token);
  const r=data.tileRect,a=data.outline;
  const clip={x:Math.max(0,Math.min(r.x,a.x)-r.width),y:Math.max(0,Math.min(r.y,a.y)-r.height*.4),width:r.width*3,height:r.height*2.8};
  await page.screenshot({path:`${output}/${name}-closeup-${width}.png`,clip});
  const screenshot=fs.readFileSync(`${output}/${name}-${width}.png`).toString('base64');
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
  if(!baseline)assert.ok(headPixels.every(p=>p.visible),'actual gameplay head pixels remain above tile fills, borders, and stars');
  if(!baseline&&data.pairCount===1){
    // User-facing readability contract, independent of the sizing formula.
    assert.ok(a.height/r.height>(width<600?.8:.7)&&a.width/r.width>(width<600?.6:.55),`prominent pawn: ${JSON.stringify(data)}`);
    if(width===360)assert.ok(a.height>=18&&data.face.width>=7,'360px pawn must remain readable in real play');
    assert.ok(Math.abs(data.tip.x-r.x-r.width/2)<.1&&Math.abs(data.tip.y-r.y-r.height/2)<.1,'visible pointed tip anchored to owning tile');
    assert.equal(data.headHit,token,'visible head receives the real touch target above neighboring tiles');
    assert.ok(Math.abs(a.height/a.width-74/54)<.001,'original pawn artwork proportions preserved');
    if(width===360){
      const old=JSON.parse(fs.readFileSync('tests/fixtures/ludo-readable-gameplay/before/measurements.json')).find(r=>r.name===name);
      const larger=JSON.parse(fs.readFileSync('tests/fixtures/ludo-readable-gameplay/larger-reference/measurements.json')).find(r=>r.name===name);
      assert.ok(a.height>old.outline.height*2,'real played single must reject the former tiny appearance');
      assert.ok(a.height>=larger.outline.height*.8&&a.height<=larger.outline.height*1.1,'readability remains comparable to previously approved larger artwork');
    }
    assert.equal(data.tileZ,'auto','tile cannot trap the pawn below neighboring backgrounds');
  }
  return {name,width,...data};
}
(async()=>{
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const results=[];
  try{for(const width of widths){
    const page=await launch(browser,width),errors=[];page.on('pageerror',e=>errors.push(e.message));
    const token=await move(page,6,'.yard .pin-pawn',0);
    results.push(await capture(page,width,'single-start-safe',token));
    await move(page,6,'.track .pin-pawn',6);
    const normal=await capture(page,width,'single-normal',token);assert.ok(!normal.tile.split(' ').includes('safe'));results.push(normal);
    await move(page,2,'.track .pin-pawn',8);
    const safe=await capture(page,width,'single-safe',token);assert.ok(safe.tile.split(' ').includes('safe'));results.push(safe);
    assert.deepEqual(errors,[]);await page.close();
    const pairPage=await launch(browser,width);
    await move(pairPage,6,'.yard .pin-pawn',0);
    const second=await move(pairPage,6,'.yard .pin-pawn',0);
    const pair=await capture(pairPage,width,'two-pawns',second);assert.equal(pair.pairCount,2);
    if(!baseline && width===360){
      const before=JSON.parse(fs.readFileSync('tests/fixtures/ludo-readable-gameplay/before/measurements.json'));
      const approved=before.find(p=>p.name==='two-pawns'&&p.width===360);
      assert.ok(Math.abs(pair.outline.width-approved.outline.width)<.1&&Math.abs(pair.outline.height-approved.outline.height)<.1,'real played pair keeps its approved artwork size');
    }
    results.push(pair);
    await pairPage.close();
  }
  fs.writeFileSync(`${output}/measurements.json`,JSON.stringify(results,null,2)+'\n');
  console.log(JSON.stringify(results.map(r=>({name:r.name,width:r.width,height:r.outline.height,tileHeight:r.tileRect.height,headWidth:r.face.width,tip:r.tip,pairCount:r.pairCount})),null,2));
  }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
