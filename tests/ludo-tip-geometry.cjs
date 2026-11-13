const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require('playwright');

// Read the painted outline itself. Its original fill bounds are (5,3)..(59,77).
// Raster bounds include stroke/miter pixels; wrapper rectangles never prove fit.
async function measure(page) {
  return page.evaluate(async () => {
    const first = document.querySelector('.track svg.pin-pawn-art');
    const source = first.cloneNode(true);
    source.querySelector('.pin-shape')?.removeAttribute('transform');
    for (const el of source.querySelectorAll('path,circle,ellipse')) {
      const css = getComputedStyle(first.querySelector('.' + el.getAttribute('class')));
      for (const prop of ['fill','stroke','stroke-width','opacity']) el.style.setProperty(prop, css.getPropertyValue(prop));
    }
    source.removeAttribute('style');
    for (const [key,value] of Object.entries({xmlns:'http://www.w3.org/2000/svg', viewBox:'0 0 64 81', width:640, height:810, preserveAspectRatio:'none'})) source.setAttribute(key,value);
    const img = new Image();
    img.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(source));
    await img.decode();
    const canvas = document.createElement('canvas'); canvas.width=640; canvas.height=810;
    const ctx=canvas.getContext('2d'); ctx.drawImage(img,0,0);
    const pixels=ctx.getImageData(0,0,640,810).data;
    let left=640,top=810,right=0,bottom=0;
    for(let y=0;y<810;y++) for(let x=0;x<640;x++) if(pixels[(y*640+x)*4+3]) {
      left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);
    }
    return [...document.querySelectorAll('.track, .lane:not(.final-square)')].map(tile => ({
      tile:tile.getBoundingClientRect().toJSON(),board:document.querySelector("#board").getBoundingClientRect().toJSON(),phone:matchMedia("(max-width:620px)").matches,
      pawns:[...tile.querySelectorAll('svg.pin-pawn-art')].map(svg => {
        const r=svg.querySelector('.pin-outline').getBoundingClientRect();
        const m=new DOMMatrix([r.width/54,0,0,r.height/74,r.left-5*r.width/54,r.top-3*r.height/74]);
        const tip=new DOMPoint(32,77+1.25*Math.hypot(10,12)/10).matrixTransform(m);
        const a=new DOMPoint(left/10,top/10).matrixTransform(m),b=new DOMPoint(right/10,bottom/10).matrixTransform(m);
        const pathTip=new DOMPoint(32,77).matrixTransform(m);
        const face=svg.querySelector('.pin-face').getBoundingClientRect();
        return {scale:m.a,pathTip:{x:pathTip.x,y:pathTip.y},head:{left:face.left-m.a,right:face.right+m.a,top:face.top-m.d,bottom:face.bottom+m.d},tip:{x:tip.x,y:tip.y},bounds:{left:a.x,top:a.y,right:b.x,bottom:b.y}};
      })
    }));
  });
}

function verify(data,count) {
  const eps=.1;
  const heads=[];
  for(const {tile,board,phone,pawns} of data) {
    assert.equal(pawns.length,count);
    const cx=(tile.left+tile.right)/2,cy=(tile.top+tile.bottom)/2;
    const approvedScale=Math.min(tile.width/64,tile.height/77)*(phone?(count===2?1.1:1.2):1);
    for(const [i,p] of pawns.entries()) {
      const {tip,bounds:b}=p;
      assert.ok(tip.x>=tile.left-eps && tip.x<=tile.right+eps && tip.y>=tile.top-eps && tip.y<=tile.bottom+eps,JSON.stringify({tile,tip}));
      assert.ok(b.left>=board.left-eps && b.right<=board.right+eps && b.top>=board.top-eps && b.bottom<=board.bottom+eps,'painted bounds inside board');
      if(count<=2) {
        const x=tile.left+tile.width*(count===1?.5:i?.74:.26);
        const edgeFit=Math.min((x-board.left)/28.25,(board.right-x)/28.25,(cy-board.top)/75.25,(board.bottom-cy)/3);
        // Every pawn on a tile uses the same scale; only board-edge overflow may reduce it.
        const allEdgeFits=pawns.map((_,j)=>{
          const tx=tile.left+tile.width*(count===1?.5:j?.74:.26);
          return Math.min((tx-board.left)/28.25,(board.right-tx)/28.25,(cy-board.top)/75.25,(board.bottom-cy)/3);
        });
        const expected=Math.min(approvedScale,edgeFit,...allEdgeFits);
        assert.ok(Math.abs(p.scale-expected)<.003,'preserve approved artwork size except actual board-edge overflow');
        assert.ok(Math.abs(p.pathTip.x-x)<eps && Math.abs(p.pathTip.y-cy)<eps,'approved path-tip anchor');
        heads.push(p.head);
      } else {
        assert.ok(b.left>=tile.left-eps && b.right<=tile.right+eps && b.top>=tile.top-eps && b.bottom<=tile.bottom+eps,JSON.stringify({tile,b}));
      }
    }
    assert.ok(Math.abs(pawns.reduce((s,p)=>s+p.pathTip.x,0)/count-cx)<eps,'tip x symmetry');
    const anchors=pawns.map(p=>count<=2?p.pathTip:p.tip);
    assert.ok(Math.abs(anchors.reduce((s,p)=>s+p.y,0)/count-cy)<eps,'tip y symmetry');
    if(count>=3) for(let i=0;i<count;i++) for(let j=i+1;j<count;j++) {
      const a=pawns[i].bounds,b=pawns[j].bounds;
      assert.ok(a.right<=b.left+eps || b.right<=a.left+eps || a.bottom<=b.top+eps || b.bottom<=a.top+eps,'compact painted artwork does not overlap');
    }
  }
  for(let i=0;i<heads.length;i++) for(let j=i+1;j<heads.length;j++) {
    const a=heads[i],b=heads[j];
    assert.ok(a.right<=b.left+eps || b.right<=a.left+eps || a.bottom<=b.top+eps || b.bottom<=a.top+eps,'approved artwork overhang does not obscure another head');
  }
}

async function approvedReference(page) {
  await page.setViewportSize({width:360,height:800});
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=2&mode=friend`,{waitUntil:'networkidle'});
  await page.evaluate(()=>{
    const tile=document.querySelector('.track.start-square.blue'),template=document.querySelector('.pin-pawn').cloneNode(true);
    document.querySelectorAll('.pin-pawn').forEach(p=>p.remove());
    for(let i=0;i<2;i++) {
      const p=template.cloneNode(true);p.className='ludo-pawn sprite-pawn pin-pawn stacked-pawn pile-size-2';
      p.style.setProperty('--piece-color',i?'#ec202c':'#ffdf00');tile.append(p);
    }
    window.__luduResolvePawnGeometry();
  });
  const actual=await page.screenshot({path:'screenshots/ludo-approved-mobile.png',fullPage:true});
  const reference=fs.readFileSync('tests/fixtures/ludo-tip/before-mobile.png');
  // Chromium versions rasterize the same subpixel SVG edges differently.
  // Normalize only that 1px antialias fringe; retain the pixel threshold and
  // independent 0.1px path-anchor/footprint assertions below.
  const diff=await page.evaluate(async ({actual,reference})=>{
    async function pixels(base64){const img=new Image();img.src='data:image/png;base64,'+base64;await img.decode();const c=document.createElement('canvas');c.width=360;c.height=800;const ctx=c.getContext('2d');ctx.filter='blur(1px)';ctx.drawImage(img,0,0);return ctx.getImageData(140,382,36,34).data;}
    const a=await pixels(actual),r=await pixels(reference);let error=0;
    for(let i=0;i<a.length;i++)if(i%4!==3)error+=Math.abs(a[i]-r[i]);
    return error/(36*34*3);
  },{actual:actual.toString('base64'),reference:reference.toString('base64')});
  assert.ok(diff<4,`approved pawn crop mean channel difference ${diff}; reference must never be regenerated`);
  const data=(await measure(page)).filter(t=>t.pawns.length);
  verify(data,2);
  return {scenario:'approved before-mobile.png visual reference',meanChannelDifference:diff,status:'passed'};
}

(async () => {
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  fs.mkdirSync('screenshots',{recursive:true}); fs.mkdirSync('test-results',{recursive:true});
  const results=[];
  try {
    const approved=await browser.newPage();
    results.push(await approvedReference(approved));await approved.close();
    for(const width of [360,390,1440]) {
      const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=2&mode=friend`,{waitUntil:'networkidle'});
      await page.evaluate(() => {window.pawnTemplate=document.querySelector('.pin-pawn').cloneNode(true);});
      for(const zoom of [1,1.25,.8]) for(const count of [1,2,3,4]) {
        await page.evaluate(({count,zoom}) => {
          document.body.style.zoom=zoom;
          document.querySelectorAll('.pin-pawn').forEach(p=>p.remove());
          for(const tile of document.querySelectorAll('.track, .lane:not(.final-square)')) for(let i=0;i<count;i++) {
            const p=window.pawnTemplate.cloneNode(true);
            p.className=`ludo-pawn sprite-pawn pin-pawn ${count>1?'stacked-pawn pile-size-'+count:''}`;
            p.removeAttribute('style');p.style.setProperty('--piece-color',['#ffdf00','#ec202c','#1685ef','#23b544'][i]);
            tile.append(p);
          }
          window.__luduResolvePawnGeometry();
        },{count,zoom});
        await page.waitForFunction(() => [...document.querySelectorAll('.track svg, .lane:not(.final-square) svg')].every(svg=>svg.classList.contains('tile-anchored') && getComputedStyle(svg).transform==='none'));
        // Force a complete rendered browser frame before measuring path bounds.
        await page.locator('#board').screenshot({path:`screenshots/ludo-tip-${width}-${zoom}-${count}.png`});
        const data=await measure(page); verify(data,count);
        fs.writeFileSync(`test-results/ludo-tip-${width}-${zoom}-${count}.json`,JSON.stringify(data,null,2));
        results.push({width,zoom,count,tiles:data.length,status:'passed'});
      }
      await page.setViewportSize({width:width===360?600:360,height:850});
      await page.locator('#board').screenshot({path:`screenshots/ludo-tip-resized-${width}.png`});
      await page.waitForTimeout(100);
      verify(await measure(page),4);
      results.push({width,scenario:'live resize without manual resolver',status:'passed'});
      const cdp=await page.context().newCDPSession(page);
      await cdp.send('Emulation.setPageScaleFactor',{pageScaleFactor:1.25});
      await page.locator('#board').screenshot({path:`screenshots/ludo-tip-browser-zoom-${width}.png`});
      verify(await measure(page),4);
      results.push({width,scenario:'Chromium visual viewport zoom 125%',status:'passed'});
      await page.close();
    }
  } finally {
    fs.writeFileSync('test-results/ludo-tip-geometry.json',JSON.stringify(results,null,2));
    await browser.close();
  }
  console.log(`${results.length} rendered scenarios passed`);
})().catch(e=>{console.error(e);process.exit(1)});
