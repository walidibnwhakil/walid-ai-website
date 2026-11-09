// Requires Playwright and this repository served at http://127.0.0.1:8765.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox'] });
  for (const mobile of [false,true]) {
    const context = await browser.newContext({viewport:mobile?{width:375,height:812}:{width:1365,height:900},isMobile:mobile,hasTouch:mobile});
    await context.addInitScript(()=>sessionStorage.setItem('walidAdminAccess','test-menu-owner'));
    await context.route('**/*',route=>{
      const u=new URL(route.request().url());
      if(u.hostname!=='127.0.0.1')return route.abort();
      if(u.pathname==='/backend-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_AI_API="http://127.0.0.1:8765";'});
      if(u.pathname==='/firebase-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_FIREBASE_CONFIG={};'});
      if(u.pathname==='/api/hello')return route.fulfill({contentType:'application/json',body:JSON.stringify({auth_role:'admin',email:'test@example.com'})});
      if(u.pathname.startsWith('/api/')||u.pathname==='/health')return route.fulfill({contentType:'application/json',body:'{"status":"ok"}'});
      return route.continue();
    });
    const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
    await page.waitForFunction(()=>!document.querySelector('#accountMenuWrap').classList.contains('hidden'));
    assert.equal(await page.locator('#chatToolsBtn,#chatToolsModal').count(),0);
    await page.locator('#attachBtn').click();
    assert.equal(await page.getByRole('menuitem',{name:'Files',exact:true}).count(),1);
    assert.equal(await page.getByRole('menuitem',{name:'Photos',exact:true}).count(),1);
    assert.equal(await page.locator('#attachMenu svg').count(),2);
    assert.equal(await page.locator('#attachBtn').getAttribute('aria-expanded'),'true');
    let chooser=page.waitForEvent('filechooser');await page.getByRole('menuitem',{name:'Files',exact:true}).click();
    assert.match(await (await chooser).element().getAttribute('accept'),/application\/pdf/);
    await page.locator('#attachBtn').click();chooser=page.waitForEvent('filechooser');await page.getByRole('menuitem',{name:'Photos',exact:true}).click();
    assert.equal(await (await chooser).element().getAttribute('accept'),'image/png,image/jpeg,image/webp,image/gif');
    await page.locator('#attachBtn').focus();await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(()=>document.activeElement.dataset.uploadKind),'file');
    await page.keyboard.press('ArrowDown');assert.equal(await page.evaluate(()=>document.activeElement.dataset.uploadKind),'photo');
    await page.keyboard.press('Escape');assert.equal(await page.locator('#attachMenu').isVisible(),false);assert.equal(await page.locator('#attachBtn').evaluate(e=>e===document.activeElement),true);
    await page.locator('#languageSelect').evaluate(el=>{el.value='bn';el.dispatchEvent(new Event('change'));});
    await page.locator('#attachBtn').click();assert.equal(await page.getByRole('menuitem',{name:'ফাইল',exact:true}).count(),1);assert.equal(await page.locator('#attachMenu svg').count(),2);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    if(process.env.WALID_MENU_SCREENSHOT)await page.screenshot({path:`/workspace/work/attachment-menu-${mobile?'mobile':'desktop'}.png`});
    await page.locator('#question').click();assert.equal(await page.locator('#attachMenu').isVisible(),false);
    assert.deepEqual(errors,[]);await context.close();
  }
  const guest=await browser.newContext();await guest.route('**/*',route=>{
    const u=new URL(route.request().url());if(u.hostname!=='127.0.0.1')return route.abort();
    if(u.pathname==='/firebase-config.js'||u.pathname==='/backend-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_FIREBASE_CONFIG={};'});
    return route.continue();
  });
  const page=await guest.newPage();await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  await page.locator('#attachBtn').click();await page.getByRole('menuitem',{name:'Files',exact:true}).click();assert.equal(await page.locator('#loginModal').isVisible(),true);
  await browser.close();console.log('PASS: signed-in desktop/mobile icon menus, file/photo pickers, BN labels, keyboard, outside/Escape dismissal, guest login gate, no extra composer Tools button or overflow.');
})().catch(error=>{console.error(error);process.exit(1)});
