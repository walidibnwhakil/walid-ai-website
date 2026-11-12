// Run with NODE_PATH pointing to an installation of playwright, and a local HTTP server.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const output=process.env.EVIDENCE_DIR||'work/2048-evidence';fs.mkdirSync(output,{recursive:true});
const base=process.env.GAME_BASE||'http://127.0.0.1:8080';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],checks=[];
 page.on('pageerror',e=>errors.push(e.message));
 const check=(name,condition)=>{assert.ok(condition,name);checks.push(name);};
 const shot=async name=>{await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`${output}/${name}.jpg`,type:'jpeg',quality:85,fullPage:true});};
 const fixture=async(board,extra={})=>page.evaluate(({board,extra})=>{window.__2048.setState({...window.__2048.state,size:Math.sqrt(board.length),board,score:0,status:'playing',achieved:false,continued:false,moves:0,merges:0,undoUsed:false,mode:'classic',target:512,...extra});},{board,extra});
 const settled=()=>page.waitForFunction(()=>!window.__2048.busy);
 await page.goto(`${base}/games/2048/`);await page.evaluate(()=>document.fonts.ready);await shot('menu-desktop');
 check('only one disabled Coming Soon leaderboard',await page.locator('.menu-tools button:disabled').count()===1);
 for(const width of [320,360,390,412,430,768,1024,1440]){
  await page.setViewportSize({width,height:width<800?950:1100});await page.evaluate(()=>window.__2048.menu());
  check(`menu ${width} no horizontal scroll`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  if(width===390)await shot('menu-mobile');
  for(const size of [4,5,6]){
   await page.click(`[data-size="${size}"]`);await page.click('#start');await page.waitForTimeout(50);
   const dims=await page.locator('#board').boundingBox();
   check(`${size}×${size} at ${width}: square and fits`,Math.abs(dims.width-dims.height)<1&&dims.x>=0&&dims.x+dims.width<=width+1);
   check(`${size}×${size} at ${width}: no page overflow`,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   check(`${size}×${size} at ${width}: two real tiles`,await page.locator('.tile').count()===2);
   const sections=await page.evaluate(()=>Object.fromEntries(['.game-controls','.information','.board-frame'].map(s=>{const r=document.querySelector(s).getBoundingClientRect();return[s,{x:r.x,y:r.y,right:r.right,bottom:r.bottom}]})));
   const a=sections['.board-frame'];for(const s of ['.game-controls','.information']){const b=sections[s];check(`${size}×${size} at ${width}: ${s} no overlap`,a.right<=b.x||b.right<=a.x||a.bottom<=b.y||b.bottom<=a.y);}
   if(width===1440||width===390)await shot(`board-${size}-${width}`);
   await page.evaluate(()=>window.__2048.menu());
  }
 }
 await page.setViewportSize({width:1440,height:1100});await page.click('#start');
 await fixture([0,2,0,0,...Array(12).fill(0)]);
 await page.keyboard.press('ArrowLeft');await settled();check('actual keyboard input moves board',await page.evaluate(()=>window.__2048.state.moves===1&&window.__2048.state.board[0]===2));
 await page.click('#undo');check('actual Undo button restores previous state',await page.evaluate(()=>window.__2048.state.board[1]===2&&window.__2048.state.moves===0&&window.__2048.state.undoUsed));
 await fixture([0,2,0,0,...Array(12).fill(0)]);
 const b=await page.locator('#board').boundingBox();await page.mouse.move(b.x+b.width*.7,b.y+b.height*.5);await page.mouse.down();await page.mouse.move(b.x+b.width*.2,b.y+b.height*.5);await page.mouse.up();await settled();
 check('pointer swipe moves left',await page.evaluate(()=>window.__2048.state.board[0]===2&&window.__2048.state.moves===1));
 await fixture([0,2,0,0,...Array(12).fill(0)]);
 await page.evaluate(()=>{window.__2048.move('left');window.__2048.move('down');window.__2048.move('right');});await settled();
 check('animation locks overlapping moves',await page.evaluate(()=>window.__2048.state.moves===1));
 await fixture([256,256,2,0,...Array(12).fill(0)]);
 // Non-awaited move allows screenshots of actual animation frames.
 await page.evaluate(()=>{window.__2048.move('left')});await page.waitForSelector('.target-lit',{timeout:5000});check('actual winning tile activation',await page.locator('.target-lit').count()===1);await shot('win-1-target-activation');
 await page.waitForFunction(()=>document.querySelectorAll('.ember').length>0);
 const origins=await page.evaluate(()=>{const r=document.querySelector('#board').getBoundingClientRect();return [...document.querySelectorAll('.ember')].filter(e=>e.textContent!=='✦').every(e=>[...document.querySelectorAll('.tile')].some(t=>{const b=t.getBoundingClientRect();return Math.abs(parseFloat(e.style.left)-(b.left-r.left+b.width/2))<2&&Math.abs(parseFloat(e.style.top)-(b.top-r.top+b.height/2))<2;}));});
 check('fire trail origins align with actual numbered tile centers',origins);await page.waitForTimeout(100);await shot('win-2-number-fire-trails');
 await page.waitForFunction(()=>document.querySelector('.burst'));await shot('win-3-convergence');
 await page.waitForSelector('#result[open]');await page.waitForTimeout(400);await shot('win-4-text-formation');await page.waitForTimeout(1000);await shot('win-5-final-winner');await settled();
 check('winner final text',await page.locator('#result-title').textContent()==='WINNER');const wonState=await page.evaluate(()=>window.__2048.state);
 await page.click('[data-action="continue"]');check('Continue preserves exact board and score',await page.evaluate(s=>JSON.stringify(window.__2048.state.board)===JSON.stringify(s.board)&&window.__2048.state.score===s.score,wonState));
 await page.keyboard.press('ArrowRight');await settled();check('no second celebration after Continue',await page.locator('#result[open]').count()===0);
 const last=[0,2,8,16,4,16,32,64,8,32,64,128,16,64,128,256];
 for(const [mode,achieved,title,name] of [['classic',false,'You Lose','lose'],['challenge',false,'Game Over','challenge-game-over'],['classic',true,'Game Over','post-victory-game-over']]){
  await fixture(last,{mode,achieved});await page.keyboard.press('ArrowLeft');await settled();await page.waitForTimeout(600);
  check(`${name}: correct result`,await page.locator('#result-title').textContent()===title);
  check(`${name}: no fire elements or winner class`,await page.locator('.ember,.burst,#result.winner').count()===0);await shot(name);
 }
 await page.click('#result [data-action="menu"]');await page.click('[data-action="settings"]');await page.uncheck('[data-setting="animation"]');await page.uncheck('[data-setting="sound"]');await page.click('#close-dialog');await page.reload();
 check('settings persisted',await page.evaluate(()=>document.body.classList.contains('no-motion')&&document.querySelector('.sound-label').textContent==='Sound Off'));
 await page.click('#start');check('Best persisted across reload',Number(await page.locator('#best').textContent())>=512);
 await fixture([256,256,0,0,...Array(12).fill(0)]);await page.keyboard.press('ArrowLeft');await settled();check('animation disabled still wins without particles',await page.locator('#result.winner[open]').count()===1&&await page.locator('.ember').count()===0);
 
 await page.click('#result [data-action="undo"]');check('Undo accessible from winning result',await page.evaluate(()=>window.__2048.state.status==='playing'&&!window.__2048.state.achieved&&window.__2048.state.undoUsed));
 const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const touchPage=await mobile.newPage();await touchPage.goto(`${base}/games/2048/`);await touchPage.click('#start');await touchPage.evaluate(()=>{const s=window.__2048.state;window.__2048.setState({...s,board:[0,2,0,0,...Array(12).fill(0)]});});
 const tb=await touchPage.locator('#board').boundingBox(),cdp=await mobile.newCDPSession(touchPage);const tx=tb.x+tb.width*.8,ty=tb.y+tb.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:tx,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:tx-90,y:ty}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await touchPage.waitForFunction(()=>!window.__2048.busy);
 check('Android-style real touch swipe moves board',await touchPage.evaluate(()=>window.__2048.state.board[0]===2&&window.__2048.state.moves===1));await mobile.close();
 const accessible=await browser.newContext({reducedMotion:'reduce'});const rp=await accessible.newPage();await rp.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw Error('storage blocked')}})});await rp.goto(`${base}/games/2048/`);await rp.click('#start');check('blocked storage still starts real game',await rp.locator('.tile').count()===2);check('system reduced motion respected',await rp.locator('body.no-motion').count()===1);await accessible.close();
check('no browser JavaScript errors',errors.length===0);
 fs.writeFileSync(`${output}/results.json`,JSON.stringify({passed:checks.length,checks,errors},null,2));console.log(`${checks.length} browser checks passed; screenshots in ${output}`);await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
