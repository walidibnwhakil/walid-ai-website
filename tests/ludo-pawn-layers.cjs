const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

// Use the real artwork and existing geometry resolver. Intentionally populate
// adjacent route tiles, including later DOM siblings and opaque custom tints.
async function fixture(page, count, celebration) {
  await page.evaluate(({count, celebration}) => {
    const template = window.layerTemplate ||= document.querySelector('.pin-pawn').cloneNode(true);
    document.querySelectorAll('.pin-pawn').forEach(p => p.remove());
    for (const tile of document.querySelectorAll('#board > .track, #board > .lane:not(.final-square)')) {
      tile.classList.add('custom-color');
      tile.classList.toggle('finish-celebration-0', celebration);
      tile.style.setProperty('--lane-tint', '#dd2222');
      for (let i=0; i<count; i++) {
        const p=template.cloneNode(true);
        p.className=`ludo-pawn sprite-pawn pin-pawn${count===2?' stacked-pawn pile-size-2':''}`;
        p.removeAttribute('style');
        p.style.setProperty('--piece-color', ['#ec202c','#ffdf00'][i]);
        if(count===2) p.style.zIndex=String(20+i);
        tile.append(p);
      }
    }
    window.__luduResolvePawnGeometry();
  }, {count, celebration});
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
}
async function inspect(page) {
  const screenshot=(await page.screenshot()).toString('base64');
  const clean=await page.addStyleTag({content:'#board > :is(.track,.lane)::before,#board > :is(.track,.lane)::after { visibility:hidden!important; }'});
  const reference=(await page.screenshot()).toString('base64');await clean.evaluate(e=>e.remove());
  return page.evaluate(async ({screenshot,reference}) => {
    const img=new Image();img.src='data:image/png;base64,'+screenshot;await img.decode();
    const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
    const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
    const ratio=img.width/innerWidth;
    const ref=new Image();ref.src='data:image/png;base64,'+reference;await ref.decode();
    const rc=document.createElement('canvas');rc.width=ref.width;rc.height=ref.height;const rx=rc.getContext('2d');rx.drawImage(ref,0,0);
    return [...document.querySelectorAll('#board > :is(.track,.lane) > .pin-pawn')].map(p => {
    const face=p.querySelector('.pin-face').getBoundingClientRect();
    const outline=p.querySelector('.pin-outline').getBoundingClientRect();
    const tile=p.parentElement.getBoundingClientRect();
    // Sample opaque interiors; antialiased outlines blend with the tile below.
    const points=[.4,.5,.6].map(f=>({x:face.left+face.width*f,y:face.top+face.height*.65}));
    return {
      tile:p.parentElement.style.gridArea,
      geometry:[...['x','y','width','height'].map(k=>outline[k]), ...['x','y','width','height'].map(k=>tile[k])],
      overhang:face.top<tile.top,
      visible:points.every(({x,y})=>{const actual=ctx.getImageData(Math.floor(x*ratio),Math.floor(y*ratio),1,1).data;const expected=rx.getImageData(Math.floor(x*ratio),Math.floor(y*ratio),1,1).data;return [0,1,2].every(i=>Math.abs(expected[i]-actual[i])<5);}),
      z:getComputedStyle(p.parentElement).zIndex,
      filter:getComputedStyle(p.parentElement).filter
    };
  });
  },{screenshot,reference});
}
async function closeup(page, path) {
  const clip=await page.evaluate(()=>{
    // A route/custom-lane junction makes the hidden head easy to inspect.
    const tile=[...document.querySelectorAll('#board > .lane:not(.final-square)')].find(t=>t.style.gridArea.startsWith('8 /'));
    const r=(tile||document.querySelector('.start-square.blue')).getBoundingClientRect();
    return {x:Math.max(0,r.x-r.width*1.5),y:Math.max(0,r.y-r.height*2),width:r.width*4,height:r.height*3.5};
  });
  await page.screenshot({path,clip,scale:'device'});
}
(async()=>{
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const out='tests/fixtures/ludo-layers';fs.mkdirSync(out,{recursive:true});
  const results=[];
  try {
    for(const width of [360,390,1440]) {
      const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:3,reducedMotion:'reduce'});
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=4&mode=friend`,{waitUntil:'networkidle'});
      for(const count of [1,2]) for(const celebration of [false,true]) {
        await page.route('**/pawn-layers.css*', route => route.fulfill({contentType:'text/css',body:''}));
        await page.reload({waitUntil:'networkidle'});
        await fixture(page,count,celebration);
        const before=await inspect(page);
        if(width!==390 && count===2 && !celebration) await closeup(page,`${out}/before-${width}.png`);
        // A fresh load avoids Chromium 136 retaining the disabled stylesheet's
        // composited brightness filter after a runtime link.disabled toggle.
        // Production loads this stylesheet from the start.
        await page.unroute('**/pawn-layers.css*');
        await page.reload({waitUntil:'networkidle'});
        await fixture(page,count,celebration);
        const after=await inspect(page);
        assert.deepEqual(after.map(p=>p.geometry),before.map(p=>p.geometry),'layer fix must not change artwork size, arrangement, or anchor');
        // PR #126 may contain single pawns inside their tiles; the approved
        // paired arrangement must continue exercising visible overhang.
        if(count===2) assert.ok(after.some(p=>p.overhang),'exercise paired heads extending outside their tiles');
        assert.ok(after.every(p=>p.visible),`heads hidden at ${width}px, count ${count}, celebration ${celebration}: ${JSON.stringify(after.filter(p=>!p.visible))}`);
        assert.ok(after.every(p=>p.z==='auto'&&p.filter==='none'),'route tiles share the board stacking context');
        if(width!==390 && count===2 && !celebration) await closeup(page,`${out}/after-${width}.png`);
        results.push({width,count,celebration,pawns:after.length,hiddenBefore:before.filter(p=>!p.visible).length,hiddenAfter:after.filter(p=>!p.visible).length,geometryUnchanged:true});
      }
      await page.emulateMedia({reducedMotion:'no-preference'});
      await fixture(page,2,true);
      await page.evaluate(()=>{
        for(const tile of document.querySelectorAll('#board > :is(.track,.lane)')) {
          for(const animation of tile.getAnimations({subtree:false})) {animation.pause();animation.currentTime=1050;}
        }
      });
      const peak=await inspect(page);
      assert.ok(peak.every(p=>p.visible && p.z==='auto' && p.filter==='none'),'animated finish peak must not recreate tile stacking contexts: '+JSON.stringify(peak.filter(p=>!p.visible||p.z!=="auto"||p.filter!=="none")));
      results.push({width,count:2,celebration:true,reducedMotion:false,animationPeak:true,pawns:peak.length,hiddenAfter:0});
      await page.close();
    }
    assert.ok(results.some(r=>r.hiddenBefore>0),'regression fixture must reproduce the original occlusion');
    fs.writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
