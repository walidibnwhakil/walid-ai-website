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
    return [...document.querySelectorAll('.track, .lane, .yard')].map(tile => ({
      region:tile.classList.contains('yard')?'yard':tile.classList.contains('final-square')?'finish':tile.classList.contains('lane')?'lane':tile.classList.contains('safe')?'safe':'track',
      seat:tile.dataset.ludoSeat,cell:tile.style.gridArea,
      base:tile.classList.contains('yard')?document.querySelector(`.base-${tile.dataset.ludoSeat}`).getBoundingClientRect().toJSON():null,
      tile:tile.getBoundingClientRect().toJSON(),board:document.querySelector("#board").getBoundingClientRect().toJSON(),phone:matchMedia("(max-width:620px)").matches,
      pawns:[...tile.querySelectorAll('svg.pin-pawn-art')].map(svg => {
        const r=svg.querySelector('.pin-outline').getBoundingClientRect();
        const m=new DOMMatrix([r.width/54,0,0,r.height/74,r.left-5*r.width/54,r.top-3*r.height/74]);
        const tip=new DOMPoint(32,77+1.25*Math.hypot(10,12)/10).matrixTransform(m);
        const a=new DOMPoint(left/10,top/10).matrixTransform(m),b=new DOMPoint(right/10,bottom/10).matrixTransform(m);
        const pathTip=new DOMPoint(32,77).matrixTransform(m);
        const face=svg.querySelector('.pin-face').getBoundingClientRect();
        return {color:svg.parentElement.style.getPropertyValue("--piece-color"),scale:m.a,pathTip:{x:pathTip.x,y:pathTip.y},head:{left:face.left-m.a,right:face.right+m.a,top:face.top-m.d,bottom:face.bottom+m.d},tip:{x:tip.x,y:tip.y},bounds:{left:a.x,top:a.y,right:b.x,bottom:b.y}};
      })
    }));
  });
}

function verify(data,count) {
  const eps=.1,heads=[],singleSizes=[],homeScales=[],homeCounts=new Map();
  const routeCells=data.filter(t=>t.region!=='yard');
  const singleScale=data[0].phone?Math.min(...routeCells.map(({tile})=>tile.width*.9/56.5)):Math.min(...routeCells.map(({tile})=>Math.min(tile.width/64,tile.height/77)));
  const homeCells=data.filter(t=>t.region==='yard');
  const homeScale=Math.min(...homeCells.flatMap(({tile})=>[tile.width*.9/56.5,tile.height*.9/78.25]))*(phone?1.01:1);
  for(const {tile,board,phone,pawns,region,base,seat} of data) {
    if(region==='yard') {
      assert.ok(pawns.length<=1,'one pawn per deliberate home slot');
      homeCounts.set(seat,(homeCounts.get(seat)||0)+pawns.length);
    } else assert.equal(pawns.length,count);
    const cx=(tile.left+tile.right)/2,cy=(tile.top+tile.bottom)/2;
    const pair=count===2 && !['yard','finish'].includes(region);
    for(const [i,p] of pawns.entries()) {
      const {tip,bounds:b}=p;
      assert.ok(tip.x>=tile.left-eps && tip.x<=tile.right+eps && tip.y>=tile.top-eps && tip.y<=tile.bottom+eps,JSON.stringify({region,tile,tip}));
      if(count===1 && region!=='yard') assert.ok(b.left>=board.left-eps && b.right<=board.right+eps && b.top>=0,'readable single overhang remains visible');
      else assert.ok(b.left>=board.left-eps && b.right<=board.right+eps && b.top>=board.top-eps && b.bottom<=board.bottom+eps,'painted bounds inside board');
      if(pair) {
        const x=tile.left+tile.width*(i?.74:.26);
        const approvedScale=Math.min(tile.width/64,tile.height/77)*(phone?1.1:1);
        const allEdgeFits=[.26,.74].map(f=>Math.min((tile.left+tile.width*f-board.left)/28.25,(board.right-tile.left-tile.width*f)/28.25,(cy-board.top)/75.25,(board.bottom-cy)/3));
        assert.ok(Math.abs(p.scale-Math.min(approvedScale,...allEdgeFits))<.003,'approved two-pawn size');
        assert.ok(Math.abs(p.pathTip.x-x)<eps && Math.abs(p.pathTip.y-cy)<eps,'approved two-pawn path anchor');
        heads.push(p.head);
      } else {
        if(count!==1 || region==='yard') assert.ok(b.left>=tile.left-eps && b.right<=tile.right+eps && b.top>=tile.top-eps && b.bottom<=tile.bottom+eps,JSON.stringify({region,tile,b}));
        if(region==='yard') {
          assert.ok(b.left>=base.left-eps && b.right<=base.right+eps && b.top>=base.top-eps && b.bottom<=base.bottom+eps,'home artwork inside its color base');
          assert.ok(Math.abs(p.scale-homeScale)<.003,JSON.stringify({reason:'deliberate shared home-slot size',p,homeScale,tile,base}));
          const expectedY=cy+(77+1.25*Math.hypot(10,12)/10-40.875)*homeScale;
          assert.ok(Math.abs(tip.x-cx)<eps && Math.abs(tip.y-expectedY)<eps,'home slot painted-center alignment');
          homeScales.push(p.scale);
        } else if(count===1) {
          assert.ok(Math.abs(tip.x-cx)<eps && Math.abs(tip.y-cy)<eps,'visible single tip at tile center');
          assert.ok(Math.abs(p.scale-singleScale)<.003,'one shared single scale from actual route-cell dimensions');
          assert.ok((b.bottom-b.top)/tile.height>(phone?.8:.7),'single pawn remains visually prominent relative to its tile');
          singleSizes.push({w:b.right-b.left,h:b.bottom-b.top});
        }
      }
    }
    if(region==='yard')continue;
    const anchors=pawns.map(p=>pair?p.pathTip:p.tip);
    assert.ok(Math.abs(anchors.reduce((s,p)=>s+p.x,0)/count-cx)<eps,'tip x symmetry');
    assert.ok(Math.abs(anchors.reduce((s,p)=>s+p.y,0)/count-cy)<eps,'tip y symmetry');
    if(!pair)for(let i=0;i<count;i++)for(let j=i+1;j<count;j++) {
      const a=pawns[i].bounds,b=pawns[j].bounds;
      assert.ok(a.right<=b.left+eps||b.right<=a.left+eps||a.bottom<=b.top+eps||b.bottom<=a.top+eps,'compact artwork does not overlap');
    }
  }
  if(singleSizes.length)for(const axis of ['w','h'])assert.ok(Math.max(...singleSizes.map(s=>s[axis]))-Math.min(...singleSizes.map(s=>s[axis]))<eps,'all single artwork has identical size across track, star, home-path, finish, color and orientation');
  if(homeScales.length)assert.ok(Math.max(...homeScales)-Math.min(...homeScales)<.003,'all four bases share the same home-slot size');
  for(const n of homeCounts.values())assert.equal(n,count,'requested home pawn count distributed across existing slots');
  for(let i=0;i<heads.length;i++)for(let j=i+1;j<heads.length;j++) {
    const a=heads[i],b=heads[j];assert.ok(a.right<=b.left+eps||b.right<=a.left+eps||a.bottom<=b.top+eps||b.bottom<=a.top+eps,'approved pairs retain visible heads');
  }
}

async function populate(page,count,colorOffset=0,zoom=1) {
  await page.evaluate(({count,colorOffset,zoom})=>{
    document.body.style.zoom=zoom;
    window.pawnTemplate??=document.querySelector('.pin-pawn').cloneNode(true);
    document.querySelectorAll('.pin-pawn').forEach(p=>p.remove());
    const colors=['#ed0010','#0064ff','#00c600','#ffdf00'];
    function add(tile,index,color) {
      const p=window.pawnTemplate.cloneNode(true);p.className=`ludo-pawn sprite-pawn pin-pawn ${count>1?'stacked-pawn pile-size-'+count:''}`;
      if(tile.classList.contains('yard'))p.className='ludo-pawn sprite-pawn pin-pawn yard-pawn';
      if(tile.classList.contains('final-square'))p.classList.add('finished-pawn','finished-pawn-slot',`final-slot-${index+1}`);
      p.removeAttribute('style');p.style.setProperty('--piece-color',colors[color%4]);tile.append(p);
    }
    [...document.querySelectorAll('.track, .lane')].forEach((tile,n)=>{for(let i=0;i<count;i++)add(tile,i,n+i+colorOffset);});
    for(let seat=0;seat<4;seat++)[...document.querySelectorAll(`.yard-seat-${seat}`)].slice(0,count).forEach((tile,i)=>add(tile,i,seat+colorOffset));
    window.__luduResolvePawnGeometry();
  },{count,colorOffset,zoom});
}

async function approvedReference(page) {
  await page.setViewportSize({width:360,height:800});
  await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=2&mode=friend`,{waitUntil:'networkidle'});
  // Compare the immutable pair reference at its original board geometry.
  // Mobile board width is tested separately at the new edge-to-edge dimensions.
  await page.addStyleTag({content:'body.ludo-game.playing-ludo main{padding:3px!important}body.ludo-game.playing-ludo .ludo-stage{width:354px!important}'});
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
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=4&mode=friend`,{waitUntil:'networkidle'});
      await page.evaluate(() => {window.pawnTemplate=document.querySelector('.pin-pawn').cloneNode(true);});
      for(const zoom of [1,1.25,.8]) for(const count of [1,2,3,4]) {
        await populate(page,count,0,zoom);
        await page.waitForFunction(() => [...document.querySelectorAll('.track svg, .lane svg, .yard svg')].every(svg=>svg.classList.contains('tile-anchored') && getComputedStyle(svg).transform==='none'));
        // Force a complete rendered browser frame before measuring path bounds.
        await page.locator('#board').screenshot({path:`screenshots/ludo-tip-${width}-${zoom}-${count}.png`});
        const data=await measure(page); verify(data,count);
        fs.writeFileSync(`test-results/ludo-tip-${width}-${zoom}-${count}.json`,JSON.stringify(data,null,2));
        results.push({width,zoom,count,tiles:data.length,status:'passed'});
      }
      for(const offset of [1,2,3]) {
        await populate(page,1,offset);
        await page.locator('#board').screenshot({path:`screenshots/ludo-single-colors-${width}-${offset}.png`});
        const data=await measure(page);verify(data,1);
        fs.writeFileSync(`test-results/ludo-single-colors-${width}-${offset}.json`,JSON.stringify(data,null,2));
        results.push({width,scenario:'all colors across all regions',offset,status:'passed'});
      }
      await populate(page,4,0,.8);
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
    for(const width of [360,1440]) {
      const page=await browser.newPage({viewport:{width,height:1000},deviceScaleFactor:width===360?3:2,reducedMotion:'reduce'});
      await page.goto(`${process.env.BASE_URL || 'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=4&mode=friend`,{waitUntil:'networkidle'});
      await populate(page,1);
      await page.locator('#board').screenshot({path:`screenshots/ludo-single-board-${width}.png`});
      verify(await measure(page),1);
      const clips=await page.evaluate(()=>{
        const cells=[...document.querySelectorAll('#board .track')];
        const groups={upper:cells.filter(t=>parseInt(t.style.gridRowStart)<=3),bottom:cells.filter(t=>parseInt(t.style.gridRowStart)>=13),'red-path':[...document.querySelectorAll('.lane.red')],home:[...document.querySelectorAll('.yard-seat-3')]};
        return Object.fromEntries(Object.entries(groups).map(([name,tiles])=>{
          const r=tiles.map(t=>t.getBoundingClientRect());const x=Math.min(...r.map(t=>t.left))-2,y=Math.min(...r.map(t=>t.top))-2;
          return [name,{x,y,width:Math.max(...r.map(t=>t.right))-x+2,height:Math.max(...r.map(t=>t.bottom))-y+2}];
        }));
      });
      for(const [name,clip]of Object.entries(clips))await page.screenshot({path:`screenshots/ludo-single-${name}-${width}.png`,clip});
      results.push({width,scenario:'high-DPI single-pawn closeups across regions',status:'passed'});
      await page.emulateMedia({reducedMotion:'no-preference'});
      await page.evaluate(()=>{
        for(const pawn of document.querySelectorAll('.track>.single-tile-pawn, .lane:not(.final-square)>.single-tile-pawn')) {
          pawn.classList.add('pawn-ready-hint','playable-token');
          for(const animation of pawn.getAnimations()){animation.pause();animation.currentTime=310;}
        }
      });
      await page.locator('#board').screenshot({path:`screenshots/ludo-single-ready-hints-${width}.png`});
      verify(await measure(page),1);
      results.push({width,scenario:'single-pawn ready hint at peak retains readable size, centered tip and visible overhang',status:'passed'});
      await page.close();
    }
  } finally {
    fs.writeFileSync('test-results/ludo-tip-geometry.json',JSON.stringify(results,null,2));
    await browser.close();
  }
  console.log(`${results.length} rendered scenarios passed`);
})().catch(e=>{console.error(e);process.exit(1)});
