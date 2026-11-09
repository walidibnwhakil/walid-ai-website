// Requires Playwright and this repository served at http://127.0.0.1:8765.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const firebaseStub = `(() => {
 const listeners=[]; const metrics={signOut:0,persistence:'',historyLoads:0,forcedRefresh:0}; let token='header.initial.signature';
 function makeUser(){return {uid:'persistent-user',email:'user@example.com',displayName:'Persistent User',isAnonymous:false,getIdToken:async force=>{if(force){metrics.forcedRefresh++;token='header.forced.signature';}return token}}}
 const auth={currentUser:localStorage.getItem('fixture-user')?makeUser():null,
  setPersistence:async value=>{metrics.persistence=value;localStorage.setItem('fixture-persistence',value)},
  onIdTokenChanged:callback=>{listeners.push(callback);queueMicrotask(()=>callback(auth.currentUser));return()=>{}},
  isSignInWithEmailLink:()=>false,
  signOut:async()=>{metrics.signOut++;auth.currentUser=null;localStorage.removeItem('fixture-user');listeners.forEach(f=>f(null))},
  signInWithPopup:async()=>{auth.currentUser=makeUser();localStorage.setItem('fixture-user','1');listeners.forEach(f=>f(auth.currentUser));return {user:auth.currentUser}}
 };
 const record={id:'saved-account-chat',title:'Kept chat',messages:[{kind:'user',text:'kept question'},{kind:'ai',text:'kept answer'}],updatedAt:1};
 const db={collection:()=>({doc:()=>({collection:()=>({get:async()=>{metrics.historyLoads++;return {docs:[{id:record.id,data:()=>record}]}},doc:()=>({set:async()=>{}})})})})};
 const authFunction=()=>auth;authFunction.Auth={Persistence:{LOCAL:'local'}};authFunction.GoogleAuthProvider=function(){};
 window.firebase={initializeApp:()=>{},auth:authFunction,firestore:()=>db};
 window.authFixture={auth,metrics,refresh(){token='header.refreshed.signature';listeners.forEach(f=>f(auth.currentUser))}};
})();`;
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
 const context=await browser.newContext();let backendOffline=true, rejectOnce=false, calls=0, hold=false, heldRoute;
 await context.addInitScript(()=>{if(!localStorage.getItem('fixture-initialized')){localStorage.setItem('fixture-initialized','1');localStorage.setItem('fixture-user','1')}});
 await context.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.hostname==='www.gstatic.com'&&u.pathname.includes('firebase-app-compat'))return route.fulfill({contentType:'application/javascript',body:firebaseStub});
  if(u.hostname!=='127.0.0.1')return route.abort();
  if(u.pathname==='/backend-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_AI_API="http://127.0.0.1:8765";window.WALID_AI_GOOGLE_CLIENT_ID="test-client";'});
  if(u.pathname==='/firebase-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_FIREBASE_CONFIG={apiKey:"test",authDomain:"test.invalid",projectId:"test",appId:"test"};'});
  if(u.pathname==='/api/hello'){
   calls++;if(hold){heldRoute=route;return;}
   if(rejectOnce){rejectOnce=false;return route.fulfill({status:401,contentType:'application/json',body:'{"error":"Refresh token"}'});}
   return route.fulfill({status:backendOffline?503:200,contentType:'application/json',body:JSON.stringify(backendOffline?{error:'Backend waking'}:{auth_role:'user',email:'user@example.com'})});
  }
  if(u.pathname==='/health')return route.fulfill({contentType:'application/json',body:'{"status":"ok"}'});
  return route.continue();
 });
 const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.authFixture?.metrics.persistence==='local');
 assert.equal(await page.locator('#accountMenuWrap').isVisible(),true,'Firebase identity must stay visible while backend is offline');
 assert.equal(await page.evaluate(()=>authFixture.metrics.signOut),0);
 backendOffline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 await page.waitForFunction(()=>document.querySelector('.msg.ai .message-body')?.textContent==='kept answer');
 const historyLoads=await page.evaluate(()=>authFixture.metrics.historyLoads);
 rejectOnce=true;await page.evaluate(()=>authFixture.refresh());await page.waitForFunction(()=>authFixture.metrics.forcedRefresh===1);await page.waitForTimeout(150);
 assert.equal(await page.locator('#accountMenuWrap').isVisible(),true,'A 401 refresh must not log the user out');
 await page.evaluate(()=>authFixture.refresh());await page.waitForTimeout(250);
 assert.equal(await page.evaluate(()=>authFixture.metrics.historyLoads),historyLoads,'Token refresh must not reopen/reset chat history');
 assert.equal(await page.locator('.msg.ai .message-body').innerText(),'kept answer');
 assert.equal(await page.evaluate(()=>authFixture.metrics.signOut),0);
 await page.reload({waitUntil:'networkidle'});await page.waitForFunction(()=>document.querySelector('.msg.ai .message-body')?.textContent==='kept answer');
 assert.equal(await page.locator('#accountMenuWrap').isVisible(),true,'Reload must restore the persisted session');
 const second=await context.newPage();await second.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});await second.waitForFunction(()=>document.querySelector('.msg.ai .message-body')?.textContent==='kept answer');
 assert.equal(await second.locator('#accountMenuWrap').isVisible(),true,'New tab must restore the session without sessionStorage');await second.close();
 hold=true;await page.evaluate(()=>authFixture.refresh());await page.waitForTimeout(100);assert.ok(heldRoute);
 await page.locator('#accountAvatar').click();await page.locator('#logout').click();
 await heldRoute.fulfill({contentType:'application/json',body:'{"auth_role":"user","email":"user@example.com"}'});hold=false;
 await page.waitForTimeout(200);assert.equal(await page.locator('#accountMenuWrap').isVisible(),false,'Late authorization must not sign the user back in after explicit logout');
 assert.equal(await page.evaluate(()=>authFixture.metrics.signOut),1);
 await page.reload({waitUntil:'networkidle'});assert.equal(await page.locator('#accountMenuWrap').isVisible(),false,'Explicit sign-out must persist');
 assert.deepEqual(errors,[]);assert.ok(calls>=3);
 await browser.close();console.log('PASS: explicit LOCAL persistence, backend outage recovery, forced 401 token refresh without chat reset, reload/new-tab restoration, explicit logout and late-request race. Firebase SDK is mocked; real-account persistence still requires live verification.');
})().catch(error=>{console.error(error);process.exit(1)});
