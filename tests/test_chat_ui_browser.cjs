// Run with Playwright installed and this repository served at http://127.0.0.1:8765.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ executablePath:'/usr/bin/chromium', headless:true, args:['--no-sandbox'] });
  const context = await browser.newContext({ viewport:{width:1365,height:900} });
  const page = await context.newPage(); const errors=[]; const requests=[]; let fail=false, count=0;
  page.on('pageerror', e => errors.push(e.message));
  await context.addInitScript(() => { window.copied=''; Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.copied=text}}}); });
  await context.route('**/*', async route => {
    const url=new URL(route.request().url());
    if (url.hostname!=='127.0.0.1') return route.abort();
    if (url.pathname==='/backend-config.js') return route.fulfill({contentType:'application/javascript',body:'window.WALID_AI_API="http://127.0.0.1:8765";'});
    if (url.pathname==='/firebase-config.js') return route.fulfill({contentType:'application/javascript',body:'window.WALID_FIREBASE_CONFIG={};'});
    if (url.pathname==='/api/chat') {
      requests.push(route.request().postDataJSON()); count++;
      if(fail){fail=false;return route.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Test failure'})});}
      const wiki='https://en.wikipedia.org/wiki/Minister_of_Home_Affairs_(Bangladesh)';
      const answer=`Reply ${count} ([Minister of Home Affairs (Bangladesh)](${wiki})).\n\nSources:\n- [Example report](https://example.com/news)`;
      return route.fulfill({contentType:'application/x-ndjson',body:[{event:'delta',text:answer.slice(0,50)},{event:'delta',text:answer.slice(50)},{event:'done',answer,answering_mode:'web',sources:[{title:'Minister of Home Affairs (Bangladesh)',url:wiki},{title:'Example report',url:'https://example.com/news'}]}].map(x=>JSON.stringify(x)).join('\n')+'\n'});
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  async function send(q){await page.locator('#question').fill(q);await page.locator('#form').evaluate(f=>f.requestSubmit());await page.waitForFunction(()=>!document.querySelector('.chat-busy'));}
  await send('first question');
  assert.equal(await page.locator('.msg.user').count(),1);assert.equal(await page.locator('.msg.ai').count(),1);
  assert.equal(await page.locator('.message-body').last().innerText(),'Reply 1.');
  assert.equal(await page.locator('.source-cards').isVisible(),false);
  assert.equal(await page.getByRole('button',{name:'Share answer',exact:true}).count(),0);
  await page.locator('.answer-sources summary').click(); assert.equal(await page.locator('.source-cards').isVisible(),true);
  assert.equal(await page.locator('.source-cards a').first().getAttribute('href'),'https://en.wikipedia.org/wiki/Minister_of_Home_Affairs_(Bangladesh)');
  await page.getByRole('button',{name:'Regenerate answer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.chat-busy'));
  assert.equal(await page.locator('.msg.user').count(),1);assert.equal(await page.locator('.msg.ai').count(),1);
  await page.locator('.answer-actions button').first().click();assert.match(await page.evaluate(()=>window.copied),/Reply 2/);
  assert.doesNotMatch(await page.evaluate(()=>window.copied),/Sources:/);
  await send('second question');
  const second=await page.locator('.msg.ai').nth(1).locator('.message-body').innerText();
  await page.getByRole('button',{name:'Regenerate answer',exact:true}).first().click();await page.waitForFunction(()=>!document.querySelector('.chat-busy'));
  assert.equal(await page.locator('.msg.user').count(),2);assert.equal(await page.locator('.msg.ai').count(),2);
  assert.equal(await page.locator('.msg.ai').nth(1).locator('.message-body').innerText(),second);
  assert.deepEqual(requests.at(-1).history,[]);
  await page.locator('.msg.user').first().hover();await page.getByRole('button',{name:'Edit question',exact:true}).first().click();
  await page.getByRole('button',{name:'Cancel',exact:true}).click(); assert.equal(await page.locator('.msg.ai').count(),2);
  await page.locator('.msg.user').first().hover();await page.getByRole('button',{name:'Edit question',exact:true}).first().click();
  await page.locator('.question-editor textarea').fill('revised question');await page.locator('.question-editor button[type=submit]').click();await page.waitForFunction(()=>!document.querySelector('.chat-busy'));
  assert.equal(await page.locator('.msg.user').count(),1);assert.equal(await page.locator('.msg.ai').count(),1);
  assert.equal(await page.locator('.msg.user .message-body').innerText(),'revised question');
  const saved=await page.locator('.msg.ai .message-body').innerText(); fail=true;
  await page.getByRole('button',{name:'Regenerate answer',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.chat-busy'));
  assert.equal(await page.locator('.msg.ai .message-body').innerText(),saved);assert.equal(await page.locator('.msg.user').count(),1);
  await page.waitForTimeout(200);await page.reload({waitUntil:'networkidle'});
  assert.equal(await page.locator('.msg.ai').count(),1);assert.equal(await page.locator('.answer-sources summary').count(),1);

  assert.deepEqual(errors,[]);
  const mobile=await browser.newContext({viewport:{width:375,height:812},isMobile:true,hasTouch:true});
  await mobile.route('**/*',async route=>{const u=new URL(route.request().url()); if(u.hostname!=='127.0.0.1')return route.abort(); if(u.pathname==='/backend-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_AI_API="http://127.0.0.1:8765";'}); if(u.pathname==='/firebase-config.js')return route.fulfill({contentType:'application/javascript',body:'window.WALID_FIREBASE_CONFIG={};'});return route.continue();});
  await mobile.addInitScript(()=>{sessionStorage.setItem('walidGuestChats',JSON.stringify([{id:'mobile-test',title:'mobile',messages:[{kind:'user',text:'test question'},{kind:'ai',text:'Test answer.\n\nSources:\n- [News](https://example.com/news)'}]}]));sessionStorage.setItem('walidActiveChatId','mobile-test');});
  const m=await mobile.newPage();await m.goto('http://127.0.0.1:8765/',{waitUntil:'networkidle'});
  assert.equal(await m.locator('.question-actions').isVisible(),false);await m.locator('.msg.user .message-body').tap();assert.equal(await m.locator('.question-actions').isVisible(),true);
  await m.getByRole('button',{name:'Edit question',exact:true}).tap();assert.equal(await m.locator('.question-editor').isVisible(),true);await m.getByRole('button',{name:'Cancel',exact:true}).tap();
  assert.ok(await m.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));

  console.log('PASS desktop/mobile: compact citations, balanced URLs, streamed copy, same-slot regeneration, earlier-turn regeneration, edit/cancel, failure rollback, persistence, touch controls, no overflow or runtime errors.');
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
