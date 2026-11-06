const {execFileSync}=require('node:child_process');
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path'),{createHash}=require('node:crypto');
(async()=>{
 const root=path.resolve(__dirname,'../..'),prefix='/games/riddlex/',mime={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg'};
 const output=process.env.RIDDLEX_BROWSER_OUTPUT || path.join(__dirname,'knowledge');
 await fs.mkdir(path.join(output,'browser'),{recursive:true});
 const server=http.createServer(async(req,res)=>{try{let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(name.endsWith('/'))name+='index.html';const file=path.resolve(root,'.'+name);if(!file.startsWith(root+path.sep))throw Error();const bytes=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+prefix;
 const browser=await chromium.launch({headless:true,...(process.env.RIDDLEX_CHROME?{executablePath:process.env.RIDDLEX_CHROME}:{}),args:['--no-sandbox']});
 const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],requests=[];
 page.on('pageerror',e=>{console.error(e);errors.push(String(e))});page.on('response',async r=>{if(r.url().startsWith(url))requests.push({path:r.url().slice(url.length),bytes:(await r.body().catch(()=>Buffer.alloc(0))).length});});
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
 const visualBaseline=process.env.RIDDLEX_VISUAL_BASELINE;
 const visualComparison={};
 if(visualBaseline){
  const overrides=new Map(['index.html','app.js','style.css','engine-v2.js'].map(file=>[
   file,execFileSync('git',['show',visualBaseline+':games/riddlex/'+file],{cwd:root})
  ]));
  for(const [label,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
   const original=await browser.newPage({viewport,reducedMotion:'reduce'});
   await original.route(url+'*',async route=>{
    const file=new URL(route.request().url()).pathname.slice(prefix.length)||'index.html';
    if(overrides.has(file))await route.fulfill({body:overrides.get(file),contentType:mime[path.extname(file)]});
    else await route.continue();
   });
   await original.goto(url);
   await original.locator('#play').click();
   await original.evaluate(()=>document.fonts.ready);
   const baselineLabel=label+'-baseline';
   await captureQuestion(original,baselineLabel);
   const approved=await fs.readFile(path.join(output,'browser',baselineLabel+'-question.png'));
   const actual=await fs.readFile(path.join(output,'browser',label+'-question.png'));
   if(!approved.equals(actual))throw Error(label+' question screenshot differs from '+visualBaseline);
   visualComparison[label]={baseline:visualBaseline,identical:true,sha256:createHash('sha256').update(actual).digest('hex')};
   await original.close();
  }
 }
 await page.emulateMedia({reducedMotion:"no-preference"});
 const manifestBytes=await fs.readFile(path.join(__dirname,'runtime/manifest.json')),manifestSha256=createHash('sha256').update(manifestBytes).digest('hex');
 const data=category=>page.evaluate(category=>import("./runtime-loader.js").then(loader=>loader.loadCategory(category)),category);
 const {factValue}=await import('./engine-v2.js'),characters=await data('characters');
 const contextQuestion='Are you thinking of someone by their relationship to you, such as a relative or friend?';
 if((await page.locator('[data-category]').allTextContents()).join('|')!=='Characters|Animals|Objects'||await page.locator('#keyboard-hint').count())throw Error('Unexpected lobby controls');
 if((await page.locator('[data-answer]').allTextContents()).join('|')!=="Yes|No|Probably|Probably Not|Don't Know")throw Error('Unexpected answer labels');
 const specs=[['animals','cat'],['objects','phone'],['relationships','role-wife'],['characters','himu'],['characters','sheikh-mujibur-rahman']];
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
  await page.locator("#correct").waitFor({state:"visible"});
  const status=await page.locator('#status').innerText(),correct=await page.locator('#correct').isVisible()&&status==='Are you thinking of '+target.name+'?';
  games.push({language:'en',category,id,correct,questions:count,loadMs});if(!correct)throw Error('Gameplay failed '+JSON.stringify(games.at(-1)));
  await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(output,'browser','en-'+category+'.png'),fullPage:true});await page.locator('#correct').click();
  if(await page.locator('#case-note-name').innerText()!==target.name)throw Error('Result must use the English casebook name');
  const result=id==='cat'?'printed':'written';
  if(await page.locator('#case-note').getAttribute('data-result')!==result)throw Error('Expected '+result+' result for '+id);
  if(id==='cat'||id==='phone')await page.screenshot({path:path.join(output,'browser',id==='cat'?'printed-cat.png':'handwritten-result.png'),fullPage:true,animations:'disabled'});
 }
 await page.reload();if(await page.locator('html').getAttribute('lang')!=='en')throw Error('Saved language must not override English');
 await page.locator('#play').click();
 await page.route('**/runtime/animals-*.json',r=>r.abort());await page.locator('[data-category="animals"]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('could not load'));await page.unrouteAll({behavior:'wait'});
 await page.locator('[data-category="animals"]').click();await page.locator('#answers').waitFor({state:'visible'});
 for(const value of ['unknown','probably','probably-not']){await page.locator('[data-answer="'+value+'"]').click();await page.locator('#back').click();}
 const d=await data('animals'),cat=d.entries.find(e=>e.id==='cat');
 for(let i=0;i<60&&await page.locator('#answers').isVisible();i++){const text=await page.locator('#status').innerText(),key=Object.keys(d.questions).find(k=>d.questions[k]===text),fact=factValue(cat,key);await page.locator('[data-answer="'+(fact===undefined?'unknown':fact?'yes':'no')+'"]').click();}
 await page.locator('#wrong').click();
 if(await page.locator('#case-note').getAttribute('data-result')!=='rejected')throw Error('Missing rejected guess note');
 await page.screenshot({path:path.join(output,'browser','wrong-result.png'),fullPage:true,animations:'disabled'});
 await page.locator('#retry').click();await page.locator('#answers').waitFor({state:'visible'});if(await page.locator('#case-note').getAttribute('data-guess-id')==='cat')throw Error('Rejected identity repeated');
 await page.locator('#new').click();await page.route('**/runtime/characters-*.json',async r=>{await new Promise(resolve=>setTimeout(resolve,150));await r.continue();});await page.locator('[data-category="characters"]').click();await page.locator('#new').click();await page.evaluate(()=>import('./runtime-loader.js').then(m=>m.loadCategory('characters')).then(()=>true));await page.unrouteAll({behavior:'wait'});if(!await page.locator('#categories').isVisible())throw Error('Late load overwrote reset');
 const photoPage=await context.newPage();
 const photoRequests=[];
 photoPage.on("request",request=>photoRequests.push(request.url()));
 await photoPage.emulateMedia({reducedMotion:"no-preference"});
 photoPage.on('pageerror',e=>{console.error(e);errors.push(String(e))});
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
 await photoPage.locator('.office[data-reveal="feeding"]').waitFor();
 if(await photoPage.locator('#correct').isVisible())throw Error('Confirmation appeared during the feed');
 await photoPage.locator('.office[data-reveal="printed"]').waitFor();
 if(photoRequests.filter(request=>request.endsWith('/images/einstein.jpg')).length!==1)throw Error('Expected one verified Einstein photo request');
 await photoPage.locator('#correct').click();
 await photoPage.screenshot({path:path.join(output,'browser','printed-result.png'),fullPage:true,animations:'disabled'});
 await photoPage.close();
 await page.locator('[data-category="animals"]').click();
 await page.locator('#answers').waitFor({state:'visible'});
 for(let i=0;i<=Object.keys(d.questions).length&&await page.locator('#answers').isVisible();i++){
  await page.locator('[data-answer="unknown"]').click();
 }
 if(await page.locator('.office').getAttribute('data-mood')!=='unsure'){
  throw Error('Unknown-only case did not end unresolved');
 }
 await page.screenshot({path:path.join(output,'browser','unresolved.png'),fullPage:true,animations:'disabled'});
 await page.locator('#retry').click();
 await page.locator('#categories').waitFor({state:'visible'});
 if(await page.locator('#case-note').isVisible())throw Error('Unresolved Retry left an old result note');
 const animationChecks={},softTranscripts={};
 const objects=await data('objects');
 for(const [label,viewport] of [['desktop',{width:1280,height:900}],['mobile',{width:390,height:844}]]){
  const motionContext=await browser.newContext({
   viewport,reducedMotion:'no-preference',
   ...(process.env.RIDDLEX_VIDEO?{recordVideo:{dir:path.join(output,'video'),size:viewport}}:{})
  });
  const view=await motionContext.newPage();
  view.on('pageerror',e=>{console.error(e);errors.push(String(e))});
  const note=view.locator('#case-note'),reveal=view.locator('.guess-reveal'),office=view.locator('.office');
  const shot=(state,options={})=>view.screenshot({path:path.join(output,'browser',label+'-'+state+'.png'),fullPage:true,...options});
  async function playCase(category,bank,target){
   if(!await view.locator('#categories').isVisible())await view.locator('#new').click();
   await view.locator('[data-category="'+category+'"]').click();
   await view.locator('#answers').waitFor({state:'visible'});
   if(category==='characters')await view.locator('[data-answer="no"]').click();
   for(let i=0;i<110&&await view.locator('#answers').isVisible();i++){
    const question=await view.locator('#status').innerText();
    const key=Object.keys(bank).find(key=>bank[key]===question);
    if(!key)throw Error('Unmapped result question '+question);
    const fact=factValue(target,key);
    await view.locator('[data-answer="'+(fact===undefined?'unknown':fact?'yes':'no')+'"]').click();
   }
   if(await note.getAttribute('data-guess-id')!==target.id)throw Error(label+' failed to guess '+target.id);
  }
  await view.goto(url);
  await view.locator('#play').click();
  const sceneFrame=()=>view.locator(".scene-motion").evaluate(canvas=>canvas.toDataURL());
  await view.locator(".scene-motion").waitFor({state:"visible"});
  const initialPose=await sceneFrame();
  await view.waitForFunction(initial=>document.querySelector(".scene-motion").toDataURL()!==initial,initialPose);
  await view.waitForTimeout(1300);
  await shot("thinking-motion");
  const props=view.locator('.scene-props');
  await props.waitFor({state:'visible'});
  const propFrame=()=>props.evaluate(canvas=>canvas.toDataURL());
  const seated=await propFrame();
  await view.waitForFunction(initial=>document.querySelector('.scene-props').toDataURL()!==initial,seated);
  await shot('pipe-at-mouth');
  await view.waitForTimeout(3400);
  await shot('cat-walking-pipe-lowered');
  await view.waitForTimeout(10000);
  await shot('cat-lying-down');
  await view.emulateMedia({reducedMotion:'reduce'});
  await props.waitFor({state:'hidden'});
  await view.emulateMedia({reducedMotion:'no-preference'});
  await props.waitFor({state:'visible'});

  const transcripts=[];
  for(const style of ['recorded','repeated']){
   await view.locator('[data-category="objects"]').click();
   await view.locator('#answers').waitFor({state:'visible'});
   const answers=[],target=objects.entries.find(entry=>entry.id==='phone');
   while(answers.length<30&&await view.locator('#answers').isVisible()){
    const question=await view.locator('#status').innerText();
    const key=Object.keys(objects.questions).find(key=>objects.questions[key]===question);
    if(!key||answers.some(answer=>answer.question===question))throw Error('Unexpected soft-answer question '+question);
    const fact=factValue(target,key);
    const answer=style==='repeated'&&answers.length<8?'probably':fact===undefined?'unknown':fact?'probably':'probably-not';
    answers.push({question,answer});
    await view.locator('[data-answer="'+answer+'"]').click();
   }
   await view.locator('#correct').waitFor({state:'visible'});
   const status=await view.locator('#status').innerText();
   const guessId=await note.getAttribute('data-guess-id');
   if(!await view.locator('#correct').isVisible()||!status.startsWith('My best lead is ')){
    throw Error(label+' '+style+' soft round did not offer a tentative guess: '+status);
   }
   if(style==='recorded'&&guessId!==target.id)throw Error(label+' soft facts failed to identify phone: '+status);
   if(style==='repeated'&&(answers.length<3||answers.slice(0,3).some(({answer})=>answer!=='probably')))throw Error('Expected consecutive Probably answers');
   transcripts.push({style,answers,guessId,status});
   await view.locator('#new').click();
  }
  softTranscripts[label]=transcripts;
  await playCase('characters',characters.questions,einstein);
  await view.locator('.office[data-reveal="printed"]').waitFor();
  await shot('print-on-note');
  await view.locator('#correct').click();
  const catPhoto='**/images/reveal-cat.jpg';
  await view.route(catPhoto,route=>route.abort());
  await playCase('animals',d.questions,cat);
  await view.locator('.office[data-reveal="written"]').waitFor();
  await view.unroute(catPhoto);
  await view.locator('#correct').click();
  await view.waitForTimeout(750);
  const pleasedPose=await sceneFrame();
  await shot('name-written',{animations:'disabled'});
  await playCase('animals',d.questions,cat);
  await view.locator('#wrong').click();
  if(await note.getAttribute('data-result')!=='rejected')throw Error(label+' missing rejected note');
  await view.waitForTimeout(750);
  const disappointedPose=await sceneFrame();
  if(disappointedPose===pleasedPose)throw Error(label+' reactions use the same frame');
  await shot('guess-rejected');
  await view.locator('#retry').click();
  await view.waitForTimeout(750);
  if(await sceneFrame()===disappointedPose)throw Error(label+' Retry kept the rejected pose');
  await view.locator('#answers').waitFor({state:'visible'});
  await shot('retry-continued',{animations:'disabled'});
  if(await note.getAttribute('data-guess-id')==='cat')throw Error('Retry repeated rejected cat');
  await view.locator('#new').click();
  await view.locator('[data-category="animals"]').click();
  await view.locator('#answers').waitFor({state:'visible'});
  for(let i=0;i<=Object.keys(d.questions).length&&await view.locator('#answers').isVisible();i++){
   await view.locator('[data-answer="unknown"]').click();
  }
  if(await office.getAttribute('data-mood')!=='unsure')throw Error(label+' unknown answers did not end unresolved');
  await view.waitForTimeout(750);
  await shot('unresolved',{animations:'disabled'});
  await view.locator('#retry').click();
  await view.locator('#categories').waitFor({state:'visible'});
  if(await note.isVisible()||await reveal.isVisible())throw Error(label+' Retry left an old result');
  await shot('retry-reset');
  animationChecks[label]=['thinking movement','distinct solved and rejected poses','pose recovery after Retry','printer feed, pickup and placement','progressive handwriting','rejected guess and continuation','unresolved retry'];
  const video=view.video();
  await motionContext.close();
  if(video)await video.saveAs(path.join(output,'browser',label+'-gameplay.webm'));
 }
 const memory=await page.evaluate(()=>performance.memory?.usedJSHeapSize/1048576??null);
 const result={environment:'Chromium, local uncompressed HTTP; 390x844 viewport',browserVersion:browser.version(),manifestSha256,initialMs,initialBytes:initial.reduce((s,r)=>s+r.bytes,0),initialRequests:initial,games,visualComparison,animationChecks,softTranscripts,memory,errors,loadFailureRetry:true,answerCorrection:true,wrongGuessRetry:true,resetDuringLoading:true,photoPrint:true,unresolvedRetry:true};
 await fs.writeFile(path.join(output,'browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await browser.close();server.close();if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1);});
