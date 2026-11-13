// Mixed single/pair evidence on the actual renderer after sizing and layering fixes.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const output = 'tests/fixtures/ludo-combined';
(async () => {
  fs.mkdirSync(output, {recursive:true});
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']});
  const results=[];
  try {
    for (const width of [360,390,1440]) {
      const page=await browser.newPage({viewport:{width,height:width===390?844:1000},deviceScaleFactor:3,reducedMotion:'reduce'});
      await page.goto(`${process.env.BASE_URL||'http://127.0.0.1:4173'}/games/ludo/?screen=board&players=4&mode=friend`,{waitUntil:'networkidle'});
      await page.evaluate(() => {
        const template=document.querySelector('.pin-pawn').cloneNode(true);
        document.querySelectorAll('.pin-pawn').forEach(p=>p.remove());
        const colors=['#ec202c','#1685ef','#23b544','#ffdf00'];
        const tiles=[...document.querySelectorAll('#board > :is(.track,.lane,.yard)')];
        tiles.forEach((tile,index)=>{
          const pair=['8 / 2','9 / 2'].includes(tile.style.gridArea);
          for(let i=0;i<(pair?2:1);i++) {
            const pawn=template.cloneNode(true);
            pawn.className=`ludo-pawn sprite-pawn pin-pawn${tile.matches('.yard')?' yard-pawn':''}${pair?' stacked-pawn pile-size-2':''}`;
            if(tile.matches('.final-square'))pawn.classList.add('finished-pawn','finished-pawn-slot','final-slot-1');
            pawn.removeAttribute('style');pawn.style.setProperty('--piece-color',colors[pair?i:index%4]);
            if(pair)pawn.style.zIndex=String(20+i);
            tile.append(pawn);
          }
        });
        window.__luduResolvePawnGeometry();
      });
      await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
      // Force a rendered SVG frame, as in the established sizing suite.
      await page.locator('#board').screenshot({path:`${output}/board-${width}.png`});
      const geometry=await page.evaluate(()=>[...document.querySelectorAll('#board > :is(.track,.lane)')].map(tile=>{
        const r=tile.getBoundingClientRect(),pawns=[...tile.querySelectorAll('.pin-pawn-art')];
        return pawns.map(svg=>{
          const outline=svg.querySelector('.pin-outline').getBoundingClientRect();
          const m=new DOMMatrix([outline.width/54,0,0,outline.height/74,outline.left-5*outline.width/54,outline.top-3*outline.height/74]);
          const point=new DOMPoint(32,pawns.length===2?77:77+1.25*Math.hypot(10,12)/10).matrixTransform(m);
          const rect=svg.querySelector('.pin-outline').getBoundingClientRect();
          return {cell:tile.style.gridArea,count:pawns.length,height:rect.height,tip:{x:point.x,y:point.y},center:{x:r.x+r.width/2,y:r.y+r.height/2},rect:rect.toJSON()};
        });
      }).flat());
      const singles=geometry.filter(p=>p.count===1),pairs=geometry.filter(p=>p.count===2);
      const spread=Math.max(...singles.map(p=>p.height))-Math.min(...singles.map(p=>p.height));
      assert.ok(spread<.001,'single sizes remain uniform with approved pairs present');
      assert.ok(singles.every(p=>Math.abs(p.tip.x-p.center.x)<.1&&Math.abs(p.tip.y-p.center.y)<.1),'single pointed tips stay centered: '+JSON.stringify(singles.filter(p=>Math.abs(p.tip.x-p.center.x)>=.1||Math.abs(p.tip.y-p.center.y)>=.1)));
      assert.equal(pairs.length,4,'two adjacent tiles retain paired pawns');
      const clips=await page.evaluate(()=>{
        const groups={upper:[...document.querySelectorAll('.track')].filter(t=>parseInt(t.style.gridRowStart)<=3),
          'home-path':[...document.querySelectorAll('.lane.red')],
          bottom:[...document.querySelectorAll('.track')].filter(t=>parseInt(t.style.gridRowStart)>=13),
          'adjacent-pairs':[...document.querySelectorAll('#board > :is(.track,.lane)')].filter(t=>['8 / 2','9 / 2'].includes(t.style.gridArea))};
        return Object.fromEntries(Object.entries(groups).map(([name,tiles])=>{
          const rects=tiles.flatMap(t=>[t.getBoundingClientRect(),...[...t.querySelectorAll('.pin-outline')].map(p=>p.getBoundingClientRect())]);
          const x=Math.min(...rects.map(r=>r.left))-3,y=Math.min(...rects.map(r=>r.top))-3;
          return [name,{x,y,width:Math.max(...rects.map(r=>r.right))-x+3,height:Math.max(...rects.map(r=>r.bottom))-y+3}];
        }));
      });
      for(const [name,clip] of Object.entries(clips))await page.screenshot({path:`${output}/${name}-${width}.png`,clip});
      results.push({width,singles:singles.length,pairs:pairs.length,singlePaintedHeight:singles[0].height,singleHeightSpread:spread,centeredSingleTips:true,geometry});
      await page.close();
    }
    fs.writeFileSync(`${output}/measurements.json`,JSON.stringify(results,null,2)+'\n');
    console.log('Mixed single/pair evidence passed at 360, 390, and 1440px');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
