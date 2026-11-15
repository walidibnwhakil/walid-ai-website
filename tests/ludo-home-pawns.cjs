// Real controls produce the requested scene: one home pawn, a route single,
// and a played pair. Only the dice RNG is seeded; no pawn/game state is injected.
const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
const output=process.env.LUDO_HOME_OUTPUT||'tests/fixtures/ludo-home-pawns';
const base=process.env.BASE_URL||'http://127.0.0.1:4173';
const configs=[{label:'320',width:320,height:740,dpr:2,mobile:true},{label:'360',width:360,height:800,dpr:3,mobile:true},{label:'390',width:390,height:844,dpr:3,mobile:true},{label:'desktop',width:1440,height:1000,dpr:1,mobile:false}];
async function tap(page,locator,mobile){await locator.waitFor();await locator.evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'}));const r=await locator.boundingBox();assert.ok(r);if(mobile)await page.touchscreen.tap(r.x+r.width/2,r.y+r.height/2);else await page.mouse.click(r.x+r.width/2,r.y+r.height/2)}
async function move(page,token,step,mobile){await page.evaluate(()=>{window.__roll=6});await tap(page,page.locator('.player-dice.active .die-face'),mobile);const p=token?page.locator(`[data-token="${token}"].playable-token`):page.locator('.yard .playable-token').first();await p.waitFor();const id=await p.getAttribute('data-token');await tap(page,p.locator('.pin-face'),mobile);await page.waitForFunction(({id,step})=>{const p=document.querySelector(`[data-token="${id}"]`);return p?.dataset.step===String(step)&&!p.classList.contains('moving')},{id,step},{timeout:20000});return id}
async function capture(page,config,mode){
 await page.waitForFunction(()=>[...document.querySelectorAll('.pin-pawn svg')].every(s=>s.classList.contains('tile-anchored')&&getComputedStyle(s).transform==='none'));
 await page.evaluate(()=>{for(const a of document.getAnimations()){a.pause();a.currentTime=0}});await page.screenshot();
 const path=`${output}/${mode}-${config.label}.png`;await page.screenshot({path});
 const data=await page.evaluate(()=>{
  const measure=p=>{const r=p.querySelector('.pin-outline').getBoundingClientRect(),f=p.querySelector('.pin-face').getBoundingClientRect(),t=p.parentElement.getBoundingClientRect();const scale=r.width/54;return {token:p.dataset.token,rect:r.toJSON(),head:f.toJSON(),slot:t.toJSON(),scale,center:{x:r.left+(32-5)*scale,y:r.top+(40.875-3)*scale},envelope:{left:r.left-1.25*scale,right:r.right+1.25*scale,top:r.top-1.25*scale,bottom:r.top+77*scale},headHit:document.elementFromPoint(f.x+f.width/2,f.y+f.height/2)?.closest('.pin-pawn')?.dataset.token}};
  const home=[...document.querySelectorAll('.yard .pin-pawn')].filter(p=>p.dataset.token.startsWith('2-')).map(measure);
  const single=[...document.querySelectorAll('.track .pin-pawn')].find(p=>p.dataset.token==='2-2');
  const pair=[...document.querySelectorAll('.track .pin-pawn')].filter(p=>['2-0','2-1'].includes(p.dataset.token)).map(measure);
  const base=document.querySelector('.base-2').getBoundingClientRect();
  return {home,single:measure(single),pair,base:base.toJSON(),board:document.querySelector('#board').getBoundingClientRect().toJSON(),viewport:{width:innerWidth,height:innerHeight,dpr:devicePixelRatio},scrollWidth:document.documentElement.scrollWidth};
 });
 const clip={x:data.base.x-3,y:Math.max(0,data.base.y-data.single.slot.height*1.5),width:data.base.width+6,height:data.base.height+data.single.slot.height*3};
 await page.screenshot({path:`${output}/${mode}-home-closeup-${config.label}.png`,clip});
 assert.equal(data.home.length,1,'three real releases leave one home pawn');assert.equal(data.pair.length,2,'approved pair remains on start');
 return data;
}
async function playScene(browser,config,mode){
 const page=await browser.newPage({viewport:{width:config.width,height:config.height},deviceScaleFactor:config.dpr,isMobile:config.mobile,hasTouch:config.mobile,reducedMotion:'reduce'});page.setDefaultTimeout(20000);page.sceneErrors=[];page.on('pageerror',e=>page.sceneErrors.push(e.message));
 await page.route('**/ludo/pawn-layout.mjs*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync(mode==='before'?'tests/fixtures/ludo-home-pawns/baseline-layout.mjs':'games/ludo/pawn-layout.mjs','utf8')}));
 await page.addInitScript(()=>{window.__roll=1;Math.random=()=>(window.__roll-.5)/6});
 await page.goto(`${base}/games/ludo/?screen=board&players=4&mode=friend`,{waitUntil:'networkidle'});await page.locator('.yard .pin-pawn').first().waitFor();
 if(mode==='after'&&config.mobile){
  await page.waitForFunction(()=>[...document.querySelectorAll('.yard svg')].every(s=>s.classList.contains('tile-anchored')));await page.screenshot();
  const fit=await page.evaluate(()=>{const pieces=[...document.querySelectorAll('.yard .pin-pawn')].map(p=>{const r=p.querySelector('.pin-outline').getBoundingClientRect(),s=r.width/54,b=document.querySelector(`.base-${p.parentElement.dataset.ludoSeat}`).getBoundingClientRect();return {left:r.left-1.25*s,right:r.right+1.25*s,top:r.top-1.25*s,bottom:r.top+77*s,base:b.toJSON()}});return {count:pieces.length,inside:pieces.every(p=>p.left>=p.base.left&&p.right<=p.base.right&&p.top>=p.base.top&&p.bottom<=p.base.bottom),separate:pieces.every((p,i)=>pieces.slice(i+1).every(q=>p.right<=q.left||q.right<=p.left||p.bottom<=q.top||q.bottom<=p.top))}});
  assert.equal(fit.count,16);assert.ok(fit.inside&&fit.separate,'all sixteen initial home pawns fit their bases without overlapping');
 }
 for(let i=0;i<3;i++){const panel=await page.locator('.player-dice.active').getAttribute('id');await tap(page,page.locator(`#${panel} .die-face`),config.mobile);await page.waitForFunction(panel=>!document.querySelector(`#${panel}`).classList.contains('active'),panel,{timeout:20000})}
 assert.equal(await page.locator('.player-dice.active').getAttribute('id'),'dice-green');
 await move(page,null,0,config.mobile);await move(page,null,0,config.mobile);const third=await move(page,null,0,config.mobile);assert.equal(third,'2-2');await move(page,third,6,config.mobile);
 return page;
}
(async()=>{fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});const results=[];try{for(const config of configs){const modes={};
 const page=await playScene(browser,config,'before');modes.before=await capture(page,config,'before');assert.deepEqual(page.sceneErrors,[]);
 if(config.mobile){
  await page.close();const afterPage=await playScene(browser,config,'after');modes.after=await capture(afterPage,config,'after');assert.deepEqual(afterPage.sceneErrors,[]);await afterPage.close();
 }else{
  await page.unroute('**/ludo/pawn-layout.mjs*');await page.route('**/ludo/pawn-layout.mjs*',r=>r.fulfill({contentType:'text/javascript',body:fs.readFileSync('games/ludo/pawn-layout.mjs','utf8')}));
  await page.evaluate(async()=>{const m=await import('/games/ludo/pawn-layout.mjs?home-size-after');m.layoutBoardPawns(document.querySelector('#board'))});
  modes.after=await capture(page,config,'after');assert.deepEqual(page.sceneErrors,[]);await page.close();
 }
 const {before,after}=modes;fs.writeFileSync(`${output}/case-${config.label}.json`,JSON.stringify(modes,null,2));
 assert.deepEqual(after.board,before.board,'board unchanged');assert.deepEqual(after.single.rect,before.single.rect,'route single unchanged');assert.deepEqual(after.pair.map(p=>p.rect),before.pair.map(p=>p.rect),'played pair unchanged');
 if(config.mobile){
  assert.ok(Math.abs(after.home[0].rect.height-after.single.rect.height)<.01,'home and route singles have the same visible size: '+JSON.stringify({home:after.home[0].rect.height,route:after.single.rect.height}));
  assert.ok(after.home[0].rect.height>before.home[0].rect.height*1.15,'home pawn is noticeably larger');
  const p=after.home[0],b=after.base;assert.ok(p.envelope.left>=b.left&&p.envelope.right<=b.right&&p.envelope.top>=b.top&&p.envelope.bottom<=b.bottom,'full home artwork stays inside own base');
  assert.ok(Math.abs(p.center.x-p.slot.x-p.slot.width/2)<.1&&Math.abs(p.center.y-p.slot.y-p.slot.height/2)<.1,'home pawn keeps original slot center');assert.equal(p.headHit,p.token,'home head stays visible and hittable');
 }else{
  assert.ok(fs.readFileSync(`${output}/before-${config.label}.png`).equals(fs.readFileSync(`${output}/after-${config.label}.png`)),'desktop screenshot byte-identical');
 }
 results.push({config,...modes,scriptErrors:[]});fs.writeFileSync(`${output}/measurements.json`,JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({width:config.width,beforeHome:before.home[0].rect.height,afterHome:after.home[0].rect.height,track:after.single.rect.height,desktopUnchanged:!config.mobile}));
 }}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
