const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');
const {chromium} = require('playwright');

(async () => {
 const output = process.env.RIDDLEX_BROWSER_OUTPUT || path.join(__dirname, 'knowledge', 'cinematic');
 await fs.mkdir(output, {recursive:true});
 const types = {'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg'};
 const server = http.createServer(async (request, response) => {
  try {
   const url = new URL(request.url, 'http://localhost');
   const file = path.resolve(__dirname, '.' + (url.pathname === '/' ? '/index.html' : url.pathname));
   if (!file.startsWith(__dirname + path.sep)) throw Error('Outside game root');
   const contents = await fs.readFile(file);
   response.writeHead(200, {'Content-Type':types[path.extname(file)] || 'application/octet-stream'});
   response.end(contents);
  } catch {
   response.writeHead(404).end();
  }
 });
 await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
 const url = process.env.RIDDLEX_TEST_URL || 'http://127.0.0.1:' + server.address().port + '/';
 const reduced = process.env.RIDDLEX_REDUCED === '1';
 const browser = await chromium.launch({
  headless:true,
  ...(process.env.RIDDLEX_CHROME ? {executablePath:process.env.RIDDLEX_CHROME} : {}),
 });
 try {
  for (const [label, viewport] of [['desktop',{width:1280,height:900}], ['mobile',{width:390,height:844}]]) {
   for (const [category, id, final] of [['characters','einstein','printed'], ['animals','cat','written']]) {
    const context = await browser.newContext({
     viewport, reducedMotion:reduced ? "reduce" : "no-preference",
     ...(process.env.RIDDLEX_VIDEO ? {recordVideo:{dir:path.join(output,'video'),size:viewport}} : {}),
    });
    const page = await context.newPage();
    const photoRequests = [], errors = [];
    page.on('pageerror', error => { console.error(error); errors.push(error.message); });
    page.on('request', request => {
     if (request.url().endsWith('/images/einstein.jpg')) photoRequests.push(request.url());
    });
    await page.goto(url);
    await page.locator('#play').click();
    const data = await page.evaluate(async ({category,id}) => {
     const {loadCategory} = await import('./runtime-loader.js');
     const {factValue} = await import('./engine-v2.js');
     const {entries,questions} = await loadCategory(category);
     const entry = entries.find(row => row.id === id);
     return Object.fromEntries(Object.entries(questions).map(([key,text]) => {
      const fact = factValue(entry,key);
      return [text, fact === undefined ? 'unknown' : fact ? 'yes' : 'no'];
     }));
    }, {category,id});
    await page.locator('[data-category="'+category+'"]').click();
    const answers = page.locator('#answers');
    await answers.waitFor();
    if (category === 'characters') await page.locator('[data-answer="no"]').click();
    await page.evaluate(() => {
     const office = document.querySelector('.office');
     const reveal = office.querySelector('.guess-reveal');
     window.cinematicFrames = {};
     const captured = {};
     const hold = {feeding:880, reaching:225, carrying:575, writing:640};
     let last, started;
     function record(now) {
      const phase = office.dataset.reveal;
      if (phase !== last) {
       last = phase;
       started = now;
      }
      if (phase in hold && !captured[phase] && now - started >= hold[phase]) {
       captured[phase] = true;
       const frame = document.createElement('canvas');
       frame.width = 724;
       frame.height = 404;
       const context = frame.getContext('2d');
       context.drawImage(office.querySelector('.scene-art'), 0, 0);
       const motion = office.querySelector('.scene-motion');
       if (!motion.hidden) context.drawImage(motion, 146, 27);
       const props = office.querySelector('.scene-props');
       if (!props.hidden) context.drawImage(props, 0, 0);
       context.drawImage(reveal, 0, 0);
       window.cinematicFrames[phase] = frame.toDataURL();
      }
      if (phase !== 'printed' && phase !== 'written') requestAnimationFrame(record);
     }
     requestAnimationFrame(record);
    });
    await page.evaluate(data => {
     for (let count = 0; count < 110 && !document.querySelector('#answers').hidden; count++) {
      const question = document.querySelector('#status').textContent;
      const answer = data[question];
      if (!answer) throw Error('Unmapped question '+question);
      document.querySelector('[data-answer="'+answer+'"]').click();
     }
    }, data);
    const phase = value => page.locator('.office[data-reveal="'+value+'"]').waitFor({timeout:10000});
    const shot = value => page.screenshot({path:path.join(output,label+'-'+id+'-'+value+'.png')});
    assert.equal(await page.locator('#case-note').getAttribute('data-guess-id'), id);
    await phase(final);
    const frames = await page.evaluate(() => window.cinematicFrames);
    const expected = reduced ? [] : final === 'printed' ? ['feeding','reaching','carrying'] : ['writing'];
    for (const step of expected) {
     assert.ok(frames[step], 'Missing frame during ' + step);
     await fs.writeFile(path.join(output,label+'-'+id+'-'+step+'.png'), Buffer.from(frames[step].split(',')[1], 'base64'));
    }
    assert.equal(new Set(Object.values(frames)).size, expected.length);
    assert.equal(photoRequests.length, final === 'printed' ? 1 : 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await shot(reduced ? final+'-reduced' : final);
    await page.locator('#correct').click();
    await page.waitForTimeout(700);
    await page.locator('#new').click();
    assert.equal(await page.locator('.guess-reveal').isVisible(), false);
    assert.deepEqual(errors, []);
    const video = page.video();
    await context.close();
    if (video) await video.saveAs(path.join(output,label+'-'+final+'.webm'));
    console.log(label, id, final, reduced ? 'reduced-motion passed' : 'passed');
   }
  }
 } finally {
  await browser.close();
  server.close();
 }
})().catch(error => { console.error(error); process.exitCode = 1; });
