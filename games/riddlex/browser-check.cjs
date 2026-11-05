const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'../..'),prefix='/games/riddlex/',mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
 const output=process.env.RIDDLEX_BROWSER_OUTPUT || path.join(__dirname,'knowledge');
 await fs.mkdir(path.join(output,'browser'),{recursive:true});
 const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error();const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+prefix;
 const browser=await chromium.launch({headless:true,...(process.env.RIDDLEX_CHROME?{executablePath:process.env.RIDDLEX_CHROME}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',async r=>{if(r.url().startsWith(url))requests.push({path:r.url().slice(url.length),bytes:(await r.body().catch(()=>Buffer.alloc(0))).length});});
 await page.addInitScript(()=>localStorage.setItem('riddlex-language','bn'));
 const start=performance.now();await page.goto(url);
 if(await page.locator('#categories').isVisible()||await page.locator('.scene-art').getAttribute('src'))throw Error('Gameplay leaked onto splash');
 if(await page.locator('html').getAttribute('lang')!=='en'||await page.locator('#language').count()||await page.locator('#play').innerText()!=='Play')throw Error('Splash must be English-only');
 await page.locator('#splash-art img').evaluate(img=>img.decode());
 await page.screenshot({path:path.join(output,'browser-splash.png'),fullPage:true});
 await page.locator('#play').click();await page.locator('#categories').waitFor({state:'visible'});await page.evaluate(()=>document.fonts.ready);
 await page.locator('.scene-art').evaluate(img=>img.decode());
 if(await page.locator('#splash-art').isVisible())throw Error('Splash visible in the office');
 const initialMs=performance.now()-start,initial=requests.slice();if(initial.some(r=>/runtime\/|casebook|knowledge/.test(r.path)))throw Error('Eager data payload');
 const desktop=await browser.newPage({viewport:{width:1280,height:900},reducedMotion:'reduce'});
 await desktop.goto(url);
 await desktop.locator('#splash-art img').evaluate(img=>img.decode());
 await desktop.screenshot({path:path.join(output,'browser','desktop-splash.png'),fullPage:true});
 await desktop.locator('#play').click();
 await desktop.locator('.scene-art').evaluate(img=>img.decode());
 await desktop.screenshot({path:path.join(output,'browser','desktop-office.png'),fullPage:true});
 async function captureQuestion(view, label){
  await view.locator('[data-category="characters"]').click();
  await view.locator('#answers').waitFor({state:'visible'});
  await view.locator('.scene-art').evaluate(img=>img.decode());
  if(await view.locator('.office #status').innerText()!=='Are you thinking of someone by their relationship to you, such as a relative or friend?')throw Error('Question is missing from the office');
  const overflow=await view.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(overflow)throw Error(label+' question overflows the viewport');
  const buttons=view.locator('#answers button');
  for(const button of await buttons.all()){
   const bounds=await button.boundingBox();
   if(!bounds||bounds.height<44)throw Error(label+' answer target is too small');
  }
  await view.screenshot({path:path.join(output,'browser',label+'-question.png'),fullPage:true,animations:'disabled'});
 }
 await captureQuestion(desktop,'desktop');
 await desktop.close();
 await captureQuestion(page,'mobile');
 const manifestBytes=await fs.readFile(path.join(__dirname,'runtime/manifest.json')),manifest=JSON.parse(manifestBytes),manifestSha256=createHash('sha256').update(manifestBytes).digest('hex');
 async function data(category){const parts=await Promise.all(manifest.categories[category].shards.map(s=>fs.readFile(path.join(__dirname,'runtime',s.path),'utf8').then(JSON.parse)));return{entries:parts.flatMap(p=>p.entries),questions:Object.assign({},...parts.map(p=>p.questions))};}
 const {factValue}=await import('./engine-v2.js'),characters=await data('characters'),fresh=characters.entries.find(e=>e.id.startsWith('v2-'));
 const contextQuestion='Are you thinking of someone by their relationship to you, such as a relative or friend?';
 if((await page.locator('[data-category]').allTextContents()).join('|')!=='Characters|Animals|Objects'||await page.locator('#keyboard-hint').count())throw Error('Unexpected lobby controls');
 if((await page.locator('[data-answer]').allTextContents()).join('|')!=="Yes|No|Probably|Probably Not|Don't Know")throw Error('Unexpected answer labels');
 const specs=[['animals','cat'],['objects','phone'],['relationships','role-wife'],['characters','himu']];if(fresh)specs.push(['characters',fresh.id]);
 const games=[];
 for(const [category,id] of specs){
  await page.locator('#new').click();
  const d=await data(category),target=d.entries.find(e=>e.id===id),bank=d.questions,started=performance.now();
  await page.locator('[data-category="'+(category==='relationships'?'characters':category)+'"]').click();
  await page.locator('#answers').waitFor({state:'visible'});
  if(category==='characters'||category==='relationships'){
   if(await page.locator('#status').innerText()!==contextQuestion)throw Error('Missing relationship context');
   if(category==='relationships'){
    await page.locator('[data-answer="no"]').click();
    await page.locator('#back').click();
    if(await page.locator('#status').innerText()!==contextQuestion)throw Error('Cannot correct relationship context');
   }
   await page.locator('[data-answer="'+(category==='relationships'?'yes':'no')+'"]').click();
  }
  const loadMs=performance.now()-started;
  let count=0;while(count<60&&await page.locator('#answers').isVisible()){
   const text=await page.locator('#status').innerText(),key=Object.keys(bank).find(k=>bank[k]===text);if(!key)throw Error('Unmapped English question '+text);
   const fact=factValue(target,key);await page.locator('[data-answer="'+(fact===undefined?'unknown':fact?'yes':'no')+'"]').click();count++;
  }
  const status=await page.locator('#status').innerText(),correct=await page.locator('#correct').isVisible()&&status==='Are you thinking of '+target.name+'?';
  games.push({language:'en',category,id,correct,questions:count,loadMs});if(!correct)throw Error('Gameplay failed '+JSON.stringify(games.at(-1)));
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'browser','en-'+category+'.png'),fullPage:true});await page.locator('#correct').click();
  if(await page.locator('#case-note-name').innerText()!==target.name)throw Error('Result must use the English casebook name');
  if(await page.locator('#case-note').getAttribute('data-result')!=='written')throw Error('Expected handwritten fallback');
  if(id==='cat')await page.screenshot({path:path.join(output,'browser','handwritten-result.png'),fullPage:true,animations:'disabled'});
 }
 await page.reload();if(await page.locator('html').getAttribute('lang')!=='en')throw Error('Saved language must not override English');
 await page.locator('#play').click();
 await page.route('**/runtime/animals-*.json',r=>r.abort());await page.locator('[data-category="animals"]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not load'));await page.unrouteAll({behavior:'wait'});
 await page.locator('[data-category="animals"]').click();await page.locator('#answers').waitFor({state:'visible'});
 for(const value of ['unknown','probably','probably-not']){await page.locator('[data-answer="'+value+'"]').click();await page.locator('#back').click();}
 const d=await data('animals'),cat=d.entries.find(e=>e.id==='cat');
 for(let i=0;i<60&&await page.locator('#answers').isVisible();i++){const text=await page.locator('#status').innerText(),key=Object.keys(d.questions).find(k=>d.questions[k]===text),fact=factValue(cat,key);await page.locator('[data-answer="'+(fact===undefined?'unknown':fact?'yes':'no')+'"]').click();}
 await page.locator('#wrong').click();if(!await page.locator('.discarded-note').isVisible()||!await page.locator('.cat-resting').isVisible())throw Error('Missing resting cat');await page.locator('#retry').click();if(await page.locator('#case-note').getAttribute('data-guess-id')==='cat')throw Error('Rejected identity repeated');
 await page.locator('#new').click();await page.route('**/runtime/characters-*.json',async r=>{await new Promise(resolve=>setTimeout(resolve,150));await r.continue();});await page.locator('[data-category="characters"]').click();await page.locator('#new').click();await page.evaluate(()=>import('./runtime-loader.js').then(m=>m.loadCategory('characters')).then(()=>true));await page.unrouteAll({behavior:'wait'});if(!await page.locator('#categories').isVisible())throw Error('Late load overwrote reset');
 const photoPage=await context.newPage();
 photoPage.on('pageerror',e=>errors.push(String(e)));
 await photoPage.goto(url);
 await photoPage.locator('#play').click();
 await photoPage.locator('[data-category="characters"]').click();
 await photoPage.locator('#answers').waitFor({state:'visible'});
 await photoPage.locator('[data-answer="no"]').click();
 const einstein=characters.entries.find(entry=>entry.id==='einstein');
 for(let i=0;i<110&&await photoPage.locator('#answers').isVisible();i++){
  const text=await photoPage.locator('#status').innerText();
  const key=Object.keys(characters.questions).find(k=>characters.questions[k]===text);
  if(!key)throw Error('Unmapped photo-case question '+text);
  const fact=factValue(einstein,key);
  await photoPage.locator('[data-answer="'+(fact===undefined?'unknown':fact?'yes':'no')+'"]').click();
 }
 if(await photoPage.locator('#case-note').getAttribute('data-guess-id')!=='einstein')throw Error('Wrong identity in photo case');
 if(await photoPage.locator('#case-photo').isVisible())throw Error('Photo appeared before confirmation');
 await photoPage.locator('#correct').click();
 await photoPage.waitForFunction(()=>document.querySelector('#case-note').dataset.result==='printed');
 const motion=await photoPage.locator('#case-note').evaluate(note=>note.getAnimations().some(animation=>animation.animationName==='feed-and-lift'));
 if(!motion||await photoPage.locator('#case-photo').getAttribute('src')!=='./images/einstein.jpg')throw Error('Matching photo did not enter the print animation');
 await photoPage.screenshot({path:path.join(output,'browser','printed-result.png'),fullPage:true,animations:'disabled'});
 await photoPage.close();
 await page.locator('[data-category="animals"]').click();
 await page.locator('#answers').waitFor({state:'visible'});
 for(let i=0;i<=Object.keys(d.questions).length&&await page.locator('#answers').isVisible();i++){
  await page.locator('[data-answer="unknown"]').click();
 }
 if(await page.locator('.office').getAttribute('data-mood')!=='unsure'||!await page.locator('.cat-resting').isVisible()){
  throw Error('Unknown-only case did not end unresolved');
 }
 await page.screenshot({path:path.join(output,'browser','unresolved.png'),fullPage:true,animations:'disabled'});
 await page.locator('#retry').click();
 if(!await page.locator('#categories').isVisible()||await page.locator('.cat-resting').isVisible())throw Error('Unresolved Retry did not reset the room');
 const memory=await page.evaluate(()=>performance.memory?.usedJSHeapSize/1048576??null);
 const result={environment:'Chromium, local uncompressed HTTP; 390x844 viewport',browserVersion:browser.version(),manifestSha256,initialMs,initialBytes:initial.reduce((s,r)=>s+r.bytes,0),initialRequests:initial,games,memory,errors,loadFailureRetry:true,answerCorrection:true,wrongGuessRetry:true,resetDuringLoading:true,photoPrint:true,unresolvedRetry:true};
 await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await browser.close();server.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
