import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";
import { join } from "node:path";

// The test serves the actual Riddlex files. It does not replace mobile artwork
// with desktop assets or mock the knowledge engine.
const root = new URL("../../", import.meta.url);
const mime = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".mjs": "text/javascript", ".json": "application/json",
  ".bin": "application/octet-stream", ".webp": "image/webp",
  ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2",
};
const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  if (pathname.includes("..")) { response.writeHead(404).end(); return; }
  const route = pathname.endsWith("/") ? pathname + "index.html" : pathname;
  try {
    const bytes = await readFile(new URL(route.slice(1), root));
    response.writeHead(200, {
      "content-type": mime[route.match(/\.[^.]+$/)?.[0]] || "application/octet-stream",
    });
    response.end(bytes);
  } catch {
    response.writeHead(404).end("Not found");
  }
});
server.listen(0, "127.0.0.1");
await once(server, "listening");
const origin = "http://127.0.0.1:" + server.address().port;

const shotFolder = process.env.RIDDLEX_SCREENSHOT_DIR || "";
if (shotFolder) await mkdir(shotFolder, { recursive: true });

let browser;
try {
  browser = await chromium.launch({ headless: true });
  // Cold-load the real portrait menu with deliberately delayed artwork.
  // Effects must stay invisible until the selected image has been painted.
  {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
    let unblock, requested;
    const release=new Promise(resolve=>{unblock=resolve;});
    const started=new Promise(resolve=>{requested=resolve;});
    await page.route("**/*",async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==origin)return route.abort();
      if(url.pathname.endsWith("/menu-portrait.webp")){requested();await release;}
      return route.continue();
    });
    await page.goto(origin+"/games/riddlex/?autotest=1",{waitUntil:"domcontentloaded"});
    await started;
    try {
      assert.equal(await page.locator("#menu").evaluate(el=>el.classList.contains("art-ready")),false);
      assert.equal(await page.locator(".menu-ambient-portrait").evaluate(el=>getComputedStyle(el).visibility),"hidden");
      assert.equal(await page.locator(".menu-ambient-portrait path").first().evaluate(el=>getComputedStyle(el).animationPlayState),"paused");
      assert.equal(await page.locator("#menu-cat").evaluate(el=>getComputedStyle(el).visibility),"hidden");
    } finally {unblock();}
    await page.waitForFunction(()=>document.getElementById("menu").classList.contains("art-ready"),null,{timeout:15000});
    for(const [width,height] of [[320,568],[360,640],[390,570],[390,844],[412,915],[430,932]]){
      await page.setViewportSize({width,height});
      await page.waitForTimeout(100);
      const g=await page.evaluate(()=>{
        const rect=sel=>document.querySelector(sel).getBoundingClientRect().toJSON();
        const art=document.querySelector(".menu-port");
        window.scrollTo(0,500);
        return {image:rect(".menu-port"),frame:rect(".menu-frame"),play:rect("#play"),
          back:rect(".menu-back"),guides:[...document.querySelectorAll(".riddlex-guide-actions button")].map(el=>el.getBoundingClientRect().toJSON()),
          natural:[art.naturalWidth,art.naturalHeight],fit:getComputedStyle(art).objectFit,
          scroll:[document.documentElement.scrollWidth,document.documentElement.scrollHeight,window.scrollX,window.scrollY],
          effects:getComputedStyle(document.querySelector(".menu-ambient-portrait")).visibility};
      });
      const inside=r=>r.left>=-2&&r.top>=-2&&r.right<=width+2&&r.bottom<=height+2;
      assert.ok([g.image,g.frame,g.play,g.back,...g.guides].every(inside),"menu clipped "+JSON.stringify({width,height,g}));
      assert.equal(g.fit,"contain");
      assert.ok(Math.abs(g.image.width/g.image.height-g.natural[0]/g.natural[1])<.015,"portrait artwork aspect ratio not preserved");
      assert.ok(g.scroll[0]<=width+2&&g.scroll[1]<=height+2&&g.scroll[2]===0&&g.scroll[3]===0,"menu is scrollable "+JSON.stringify(g));
      assert.ok(g.play.height>=44&&g.guides.every(b=>b.height>=44),"menu tap target too small");
      assert.ok(g.play.bottom<=g.guides[0].top+1,"menu controls overlap");
      assert.equal(g.effects,"visible","ambient effects did not resume after art");
      if(shotFolder)await page.screenshot({path:join(shotFolder,"menu-fit-"+width+"x"+height+".png")});
      console.log("MENU_VIEWPORT_ART_READY_PASS",width,height);
    }
    await page.click('[data-riddlex-guide="rules"]');
    await page.waitForFunction(()=>document.getElementById("menu").classList.contains("ambient-paused"));
    await page.click(".guide-close");
    await page.waitForFunction(()=>!document.getElementById("menu").classList.contains("ambient-paused"));
    await page.click("#play");
    await page.waitForFunction(()=>!document.getElementById("game").hidden);
    await page.close();
  }


  // Verify the actual integrated approved sprites, both languages, layout and
  // render budget on the same real game. Existing gameplay tests remain below.
  {
    const page = await browser.newPage({viewport:{width:390,height:844},deviceScaleFactor:1});
    const errors=[],requests=[];
    page.on("pageerror",e=>errors.push(e.message));
    page.on("request",r=>requests.push(r.url()));
    await page.route("**/*",r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
    await page.goto(origin+"/games/riddlex/?autotest=1",{waitUntil:"load"});
    await page.click("#play");
    await page.waitForFunction(()=>document.querySelector(".stage-wrap").classList.contains("portrait-art-ready")&&[...document.querySelectorAll(".approved-portrait-art img")].every(i=>i.complete&&i.naturalWidth>0),null,{timeout:15000});
    await page.waitForFunction(()=>window.__riddlex?.expression().plates.length===6,null,{timeout:15000});
    assert.equal(await page.locator("html").getAttribute("lang"),"en");
    const dims=[[1440,900],[1649,825],[1024,768],[667,375],[320,568],[390,844],[412,915]];
    async function layout(mode,lang){
      for(const [width,height] of dims){
        await page.setViewportSize({width,height});
        await page.waitForFunction(()=>!matchMedia("(max-aspect-ratio:4/5)").matches||document.querySelector(".stage-wrap").classList.contains("portrait-art-ready"));
        await page.waitForTimeout(130);
        const g=await page.evaluate(({mode,lang})=>{
          const rect=node=>node.getBoundingClientRect().toJSON();
          const stage=document.querySelector(".stage-wrap"), canvas=document.getElementById("stage");
          const buttons=[...document.querySelectorAll(mode==="pick"?"#categories .cat-row button":"#answers button")];
          const mobile=matchMedia("(max-aspect-ratio:4/5)").matches;
          const wall=rect(document.querySelector(".approved-wall-plaque"));
          const portraitArt=rect(document.querySelector(".approved-actors"));
          const logo=mobile?{x:wall.x+wall.width*.59,y:wall.y,left:wall.x+wall.width*.59,right:wall.x+wall.width*.96,top:wall.top,bottom:wall.bottom,width:wall.width*.37,height:wall.height}:rect(document.querySelector(".room-logo"));
          return {stage:rect(stage),portraitArt,bubble:rect(document.getElementById("speech")),buttons:buttons.map(rect),
            cat:rect(document.querySelector(".room-cat")),actor:rect(document.querySelector(".room-detective")),
            logo,desk:rect(document.querySelector(mobile?".approved-table":".room-desk")),
            frontHidden:getComputedStyle(document.querySelector(".room-front")).display==="none",
            number:document.getElementById("q-badge").hidden?null:rect(document.getElementById("q-badge")),
            status:rect(document.getElementById("status")),
            rows:[...document.querySelectorAll("#answers .answer-row")].map(row=>[...row.querySelectorAll("button")].map(rect)),
            canvasPixels:canvas.width*canvas.height,alpha:canvas.getContext("2d").getContextAttributes().alpha,
            font:getComputedStyle(document.getElementById("status")).fontFamily,
            scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,
            lang:document.documentElement.lang};
        },{mode,lang});
        const inside=b=>b.x>=-2&&b.y>=-2&&b.right<=width+2&&b.bottom<=height+2;
        assert.ok(g.scrollWidth<=width+2&&g.scrollHeight<=height+2,"page overflow "+JSON.stringify({width,height,mode,g}));
        assert.ok(g.buttons.every(b=>inside(b)&&b.width>=40&&b.height>=40),"clipped controls "+JSON.stringify({width,height,mode,g}));
        assert.ok(inside(g.bubble),"speech outside screen "+JSON.stringify({width,height,mode,g}));
        assert.ok(inside(g.logo)&&g.logo.bottom<g.desk.top,"logo must be mounted on the back wall "+JSON.stringify({width,height,g}));
        if(width/height<=.8){
          assert.ok(g.bubble.left>=g.portraitArt.left+g.portraitArt.width*.55,"speech covers detective face "+JSON.stringify({width,height,lang,mode,g}));
          assert.ok(g.frontHidden,"mobile desk front must be hidden");
          assert.ok(g.desk.bottom>=g.stage.bottom-2,"tabletop must extend to bottom of mobile stage");
          assert.ok(g.buttons.every(b=>b.top>=g.desk.top&&b.bottom<=g.desk.bottom+1),"all mobile controls must be on tabletop");
          assert.ok(g.desk.height<=g.stage.height*.36+2,"mobile tabletop is too deep");
        }
        assert.ok(g.buttons.every(b=>g.logo.bottom<=b.top+2||g.logo.right<=b.left||g.logo.left>=b.right),"nameplate/controls overlap");
        assert.ok(g.logo.left>=g.stage.left+g.stage.width*.55,"wall plaque must sit right of the detective");
        if(mode==="ask"){
          assert.equal(g.buttons.length,5,"all five answers must remain available");
          assert.ok(g.number&&Math.abs(g.status.left-g.number.right)<=8,"number separated from question");
          if(width/height<=.8){
            assert.deepEqual(g.rows.map(row=>row.length),[3,2],"portrait answer rows must contain three then two");
            const [upper,lower]=g.rows;
            assert.ok(Math.abs(upper[0].left-lower[0].left)<=2&&Math.abs(upper[2].right-lower[1].right)<=2,"row edges must align");
            assert.ok(upper.every(b=>Math.abs(b.width-upper[0].width)<=2)&&lower.every(b=>Math.abs(b.width-lower[0].width)<=2),"balanced columns within each row");
            assert.ok(lower[0].width>=upper[0].width*1.35&&upper[0].width>=80,"bottom pair wider and top buttons comfortably wide");

            assert.ok(g.rows[0].every(b=>Math.abs(b.y-g.rows[0][0].y)<=4)&&g.rows[1].every(b=>Math.abs(b.y-g.rows[1][0].y)<=4)&&Math.max(...g.rows[0].map(b=>b.bottom))<=Math.min(...g.rows[1].map(b=>b.top))+2,"incorrect portrait answer rows");
          }
        }
        assert.ok(g.buttons.every(b=>g.bubble.bottom<=b.top+2||g.bubble.right<=b.left||g.bubble.left>=b.right),"speech/controls overlap");
        assert.ok(g.canvasPixels<=1810000&&g.alpha,"effects canvas budget");
        assert.equal(g.lang,lang);
        assert.match(g.font,lang==="bn"?/SolaimanLipi/:/Times New Roman/);
        if(shotFolder)await page.screenshot({path:join(shotFolder,"layered-"+mode+"-"+lang+"-"+width+"x"+height+".png"),animations:"disabled"});
        console.log("APPROVED_LAYERED_LAYOUT_PASS",mode,lang,width,height,g.canvasPixels);
      }
    }
    await layout("pick","en");
    await page.click('#game [data-set-lang="bn"]');
    await page.evaluate(async()=>{await document.fonts.load('400 19px SolaimanLipi','তুমি কী নিয়ে ভাবছ?');});
    await layout("pick","bn");
    await page.click('#game [data-set-lang="en"]');
    await page.click('[data-cat="animal"]');
    await page.waitForFunction(()=>window.__riddlex?.state()?.mode==="ask",null,{timeout:30000});
    await layout("ask","en");
    // Real click: verify controls remain reachable when Back appears on question two.
    await page.click("#answer-yes");
    await page.waitForFunction(()=>document.getElementById("progress").textContent.includes("Question 2") && !document.getElementById("back").hidden,null,{timeout:20000});
    await layout("ask","en");
    await page.setViewportSize({width:1440,height:900});
    await page.waitForFunction(()=>!window.__riddlex.expression().portrait&&window.__riddlex.expression().plates.includes("serious"));
    const startedNo=Date.now();
    await page.click("#answer-no");
    await page.waitForFunction(()=>document.getElementById("progress").textContent.includes("Question 3"),null,{timeout:20000});
    const responseNo=Date.now()-startedNo;
    await page.waitForTimeout(90);
    assert.equal(await page.evaluate(()=>window.__riddlex.expression().expression.key),"serious");
    const polish=await page.evaluate(()=>{
      const logo=document.querySelector(".room-logo"),bubble=document.querySelector("#speech");
      const style=getComputedStyle(logo);
      return {clip:style.clipPath,logoSrc:logo.getAttribute("data-src"),logoWidth:logo.naturalWidth,logoBackground:style.backgroundColor,logoBorder:style.borderTopWidth,logoShadow:style.boxShadow,shadow:getComputedStyle(bubble).filter,tail:getComputedStyle(bubble,"::after").backgroundColor,body:getComputedStyle(bubble).backgroundColor};
    });
    assert.equal(polish.logoSrc,"images/layered/logo.webp","use the original transparent logo, not a separate plaque");
    assert.equal(polish.logoWidth,321,"original logo did not load");
    assert.equal(polish.clip,"none","no clipped wooden backing");
    assert.equal(polish.logoBackground,"rgba(0, 0, 0, 0)");
    assert.equal(polish.logoBorder,"0px");
    assert.equal(polish.logoShadow,"none");
    assert.equal(polish.tail,polish.body,"speech tail color mismatch");
    if(shotFolder)await page.screenshot({path:join(shotFolder,"desktop-real-no-polished.png")});
    console.log("DESKTOP_NO_POLISH_PASS",JSON.stringify({responseNo,polish}));
    await page.click('#game [data-set-lang="bn"]');
    await page.evaluate(async()=>{const fonts=await document.fonts.load('400 19px SolaimanLipi','বাংলা প্রশ্ন হ্যাঁ না');if(!fonts.length||!fonts.every(f=>f.status==="loaded"))throw Error("SolaimanLipi did not load");});
    await layout("ask","bn");
    // Exercise short and long questions with the existing visible DOM and
    // ResizeObserver: prove width adapts instead of stretching to a fixed board.
    for(const [width,height] of [[1366,768],[390,844],[320,568]]){
      await page.setViewportSize({width,height});
      await page.waitForTimeout(150);
      const original=await page.locator("#status").textContent();
      const getBubble=()=>page.locator("#speech").boundingBox();
      await page.locator("#status").evaluate(el=>el.textContent="কে?");
      await page.waitForTimeout(150);
      const short=await getBubble();
      await page.locator("#status").evaluate(el=>el.textContent="আপনি যে চরিত্রটির কথা ভাবছেন, তিনি কি বাংলা চলচ্চিত্রে প্রধান চরিত্রে অভিনয়ের জন্য বিখ্যাত?");
      await page.waitForTimeout(150);
      const long=await getBubble();
      assert.ok(long.width>short.width+15||long.height>short.height+15,"speech does not adapt to question length");
      assert.ok(short.x>=0&&long.x>=0&&long.x+long.width<=width+1&&long.y>=0&&long.y+long.height<=height,"adaptive question outside viewport");
      if(width/height<=.8){
        const art=await page.locator(".approved-actors").boundingBox();
        assert.ok(short.x>=art.x+art.width*.55&&long.x>=art.x+art.width*.55,"short or long speech covers face");
      }
      if(shotFolder)await page.screenshot({path:join(shotFolder,"speech-long-"+width+"x"+height+".png"),animations:"disabled"});
      await page.locator("#status").evaluate((el,value)=>el.textContent=value,original);
      await page.waitForTimeout(150);
    }
    const artBytes=(await Promise.all(["approved-wall-top","approved-wall-plaque","approved-actors-clean","approved-table","portrait-happy","portrait-sad","portrait-serious","portrait-worried","portrait-confused","portrait-cat"].map(n=>readFile(new URL("games/riddlex/images/layered/"+n+".webp",root))))).reduce((total,b)=>total+b.byteLength,0);
    assert.ok(artBytes<300000,"static art exceeds 300KB");
    assert.ok(!requests.some(u=>/images\/approved\/(game-desk|portrait-neutral|face-portrait|cat-portrait)/.test(u)),"old gameplay art unexpectedly loaded");
    // Capture all five existing expression states at the integrated sprite.
    await page.setViewportSize({width:390,height:844});
    for(const [answer,key] of [["yes","happy"],["no","serious"],["unknown","confused"]]){
      await page.evaluate(answer=>window.__riddlex.react(answer),answer);
      await page.waitForTimeout(110);
      assert.equal(await page.evaluate(()=>window.__riddlex.expression().expression.key),key);
      if(shotFolder)await page.screenshot({path:join(shotFolder,"layered-expression-"+key+".png"),animations:"disabled"});
    }
    for(const mood of ["sad","worried"]){
      await page.evaluate(mood=>window.__riddlex.setMood(mood),mood);
      await page.waitForTimeout(350);
      if(shotFolder)await page.screenshot({path:join(shotFolder,"layered-mood-"+mood+".png"),animations:"disabled"});
    }
    await page.waitForFunction(()=>window.__riddlex.expression().portraitMotion.poses.length===9,null,{timeout:15000});
    await page.evaluate(()=>window.__riddlex.setMood("curious"));
    await page.waitForTimeout(2200);
    const snap=()=>page.evaluate(()=>{
      const c=document.getElementById("stage");
      const pixels=c.getContext("2d").getImageData(0,0,c.width,c.height).data;
      let hash=2166136261;for(let i=0;i<pixels.length;i+=16)hash=Math.imul(hash^pixels[i],16777619)^pixels[i+3];
      return {hash,stats:window.__riddlex.expression().portraitMotion};
    });
    const beforeMotion=await snap();
    await page.waitForTimeout(650);
    const afterMotion=await snap();
    assert.notEqual(afterMotion.hash,beforeMotion.hash,"portrait animation canvas is static");
    assert.ok(afterMotion.stats.smoke>beforeMotion.stats.smoke&&afterMotion.stats.idle>beforeMotion.stats.idle&&afterMotion.stats.cat>beforeMotion.stats.cat,"idle/smoke/cat did not render");
    for(const key of ["happy","sad","worried","confused","surprised"]){
      await page.evaluate(key=>window.__riddlex.setMood(key),key);
      await page.waitForTimeout(2400);
      const current=await snap();
      assert.ok(current.stats.face>afterMotion.stats.face&&current.stats.activePose===key,"face pose did not render "+key+" "+JSON.stringify(current.stats));
      if(shotFolder)await page.screenshot({path:join(shotFolder,"portrait-live-"+key+".png")});
    }
    console.log("PORTRAIT_LIVE_MOTION_PASS",JSON.stringify(afterMotion.stats));
    const client=await page.context().newCDPSession(page);
    await client.send("Emulation.setCPUThrottlingRate",{rate:4});
    await client.send("Performance.enable");
    const before=await client.send("Performance.getMetrics");
    await page.waitForTimeout(3000);
    const after=await client.send("Performance.getMetrics");
    const value=(m,n)=>m.metrics.find(x=>x.name===n)?.value||0;
    console.log("LAYERED_PERFORMANCE_EMULATED_4X",JSON.stringify({artBytes,taskMs:(value(after,"TaskDuration")-value(before,"TaskDuration"))*1000,scriptMs:(value(after,"ScriptDuration")-value(before,"ScriptDuration"))*1000,layoutCount:value(after,"LayoutCount")-value(before,"LayoutCount"),windowMs:3000}));
    assert.deepEqual(errors,[],"layered gameplay browser errors");
    await page.close();
  }

  for (const { width, height, orient } of [
    { width: 390, height: 844, orient: "portrait" },
    { width: 1366, height: 768, orient: "landscape" },
  ]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("Riddlex knowledge"))
        errors.push(message.text());
    });
    await page.route("**/*", (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });
    const response = await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("html").getAttribute("data-orient"), orient);
    const menuArt = await page.locator(orient === "portrait" ? ".menu-port" : ".menu-card").getAttribute("src");
    assert.ok(menuArt?.includes(orient === "portrait" ? "menu-portrait" : "menu-user-approved"), menuArt);
    assert.equal(await page.locator("#menu .lang-switch").count(), 0, "language selector must not appear on the landing screen");
    assert.equal(await page.locator("#menu .menu-privacy").count(), 0, "privacy belongs on the site's legal pages");
    assert.equal(await page.locator("#play").getAttribute("aria-label"), "Play Now");
    if (orient === "portrait")
      assert.equal((await page.locator("#play").innerText()).trim(), "Play Now");
    else {
      const art = await page.evaluate(async () => {
        const img = document.querySelector(".menu-card");
        await img.decode();
        const picture = img.getBoundingClientRect();
        const button = document.getElementById("play").getBoundingClientRect();
        return {
          naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight,
          fit: getComputedStyle(img).objectFit,
          imageAspect: picture.width / picture.height,
          playCenterX: (button.left + button.width/2 - picture.left) / picture.width,
          playCenterY: (button.top + button.height/2 - picture.top) / picture.height,
          decorationHidden: getComputedStyle(document.getElementById("play-label")).visibility,
        };
      });
      assert.deepEqual([art.naturalWidth, art.naturalHeight], [1670, 942],
        "the uploaded menu illustration is used unchanged in composition");
      assert.equal(art.fit, "contain", "show the complete gold frame, artwork and Play Game button");
      assert.ok(Math.abs(art.playCenterX - .642) < .035 &&
        Math.abs(art.playCenterY - .7695) < .035,
        "transparent Play hit target must align with painted button: " + JSON.stringify(art));
      assert.equal(art.decorationHidden, "hidden",
        "do not draw a second Play Now button over the supplied artwork");
    }
    assert.equal(await page.locator("#menu-floor").count(), 0,
      "the old translucent retouch overlay must not return");
    if (orient === "portrait") {
      await page.locator(".menu-port").evaluate((img) => img.decode());
    }
    const menuLayout = await page.evaluate(() => {
      const play = document.getElementById("play").getBoundingClientRect();
      return {
        play: { x: play.x, y: play.y, right: play.right, bottom: play.bottom, width: play.width, height: play.height },
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(menuLayout.play.width >= 150 && menuLayout.play.height >= 44, "Play Now should be comfortably tappable");
    assert.ok(menuLayout.play.x >= -1 && menuLayout.play.right <= width + 1, "Play Now outside screen");
    assert.ok(menuLayout.play.y >= -1 && menuLayout.play.bottom <= height + 1, "Play Now clipped vertically");
    assert.ok(menuLayout.scrollWidth <= width + 2, "menu horizontal overflow");
    if (orient === "portrait") {
      const art = await page.evaluate(() => {
        const img = document.querySelector(".menu-port");
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0);
        const measure = (y) => {
          const data = ctx.getImageData(80, y, 570, 1).data;
          let total = 0;
          for (let i = 0; i < data.length; i += 4)
            total += data[i] + data[i+1] + data[i+2];
          return total / (data.length / 4) / 3;
        };
        return { woodRows: [1195, 1225, 1235, 1250].map(measure), goldenFrame: measure(1270) };
      });
      assert.ok(art.woodRows.every((luma) => luma > 42 && luma < 105),
        "table has returned to a black patch or gold stripes: " + art.woodRows);
      assert.ok(art.goldenFrame > 50, "gold bottom frame must be preserved");
    }
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "menu-" + orient + ".png") });

    await page.click("#play");
    assert.equal(await page.locator("#game .lang-switch").isVisible(), true,
      "language option must be available after Play Now");
    await page.waitForFunction(() => !document.getElementById("categories").hidden);
    await page.click('[data-cat="animal"]');
    await page.waitForFunction(() =>
      !document.getElementById("answers").hidden
      && document.getElementById("progress").textContent.includes("Question"),
      null, { timeout: 30000 });
    const geometry = await page.evaluate(() => {
      const controls = [...document.querySelectorAll("#answers button")];
      return {
        stage: document.getElementById("stage").getBoundingClientRect().toJSON(),
        buttons: controls.map((button) => button.getBoundingClientRect().toJSON()),
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    assert.ok(geometry.stage.width > 100 && geometry.stage.height > 100);
    if (shotFolder) await page.screenshot({ path: join(shotFolder, "game-" + orient + ".png") });
    assert.ok(geometry.scrollWidth <= width + 2, "horizontal overflow");
    for (const rect of geometry.buttons) {
      assert.ok(rect.width >= 44 && rect.height >= 44, "tiny answer control");
      assert.ok(rect.x >= -2 && rect.right <= width + 2, "answer outside screen horizontally");
      assert.ok(rect.y >= -2 && rect.bottom <= height + 2, "answer outside screen vertically");
    }
    await page.click("#answer-yes");
    await page.waitForFunction(() =>
      document.getElementById("progress").textContent.includes("Question 2"),
      null, { timeout: 20000 });
    await page.click('#game [data-set-lang="bn"]');
    assert.equal(await page.locator("html").getAttribute("lang"), "bn");
    assert.equal(await page.locator("#answer-yes").textContent(), "হ্যাঁ");

    // Render actual canvas guess photos in both extreme aspect ratios. The
    // synthetic picture has a bright border and edge markers, making cropping
    // or oversized cards immediately visible in the captured screenshot.
    console.log("PHOTO_TEST_START", orient);
    await page.evaluate(() => { document.getElementById("answers").hidden = true; });
    for (const [shape, imageWidth, imageHeight] of [
      ["tall-photo", 180, 690],
      ["wide-photo", 920, 160],
    ]) {
      const pictureState = await page.evaluate(async ({ imageWidth, imageHeight }) => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${imageWidth}" height="${imageHeight}" viewBox="0 0 ${imageWidth} ${imageHeight}">
          <rect width="100%" height="100%" fill="#c1dde8"/>
          <rect x="3" y="3" width="${imageWidth - 6}" height="${imageHeight - 6}" rx="1" fill="none" stroke="#ef1c18" stroke-width="6"/>
          <rect x="8" y="8" width="${imageWidth - 16}" height="20" fill="#fadd1c"/>
          <rect x="8" y="${imageHeight - 28}" width="${imageWidth - 16}" height="20" fill="#2343ff"/>
          <circle cx="${imageWidth / 2}" cy="${imageHeight / 2}" r="26" fill="#3b8021"/>
        </svg>`;
        const src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        const result = await Promise.race([
          window.__riddlex.reveal("সম্পূর্ণ ছবি", src),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Guess reveal stalled")), 12000)),
        ]);
        return { result, bounds: window.__riddlex.expression().revealBounds };
      }, { imageWidth, imageHeight });
      assert.equal(pictureState.result.printed, true, "test photo failed to load");
      const bounds = pictureState.bounds;
      assert.ok(bounds && bounds.w > 60 && bounds.h > 60, "missing photo card");
      assert.ok(bounds.x >= -1 && bounds.y >= -1, "photo card starts outside stage");
      assert.ok(bounds.x + bounds.w <= bounds.canvasW + 1, "photo card clipped horizontally");
      assert.ok(bounds.y + bounds.h <= bounds.canvasH + 1, "photo card clipped vertically");
      console.log("PHOTO_TEST_PASS", orient, shape, pictureState.bounds.w, pictureState.bounds.h);
      if (shotFolder) await page.screenshot({
        path: join(shotFolder, "guess-" + orient + "-" + shape + ".png"),
      });
    }
    await page.click("#to-menu");
    assert.equal(await page.locator("#menu").isVisible(), true);
    const opposite = orient === "portrait" ? { width: 1366, height: 768, art: "menu-user-approved" }
      : { width: 390, height: 844, art: "menu-portrait" };
    await page.setViewportSize({ width: opposite.width, height: opposite.height });
    await page.waitForFunction((art) =>
      [...document.querySelectorAll("#menu img")].some((img) => img.getAttribute("src")?.includes(art)),
      opposite.art);
    if (orient === "portrait") {
      await page.setViewportSize({ width, height });
      await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
      await page.click("#play");
      await page.waitForFunction(() => !document.getElementById("categories").hidden);
      await page.click('[data-cat="character"]');
      console.log("CHARACTER_START", orient);
      try {
        await page.waitForFunction(() => !document.getElementById("answers").hidden &&
          /Question|প্রশ্ন/.test(document.getElementById("progress").textContent),
          null, { timeout: 18000 });
      } catch (error) {
        const snapshot = await page.evaluate(() => ({
          status: document.getElementById("status")?.textContent,
          progress: document.getElementById("progress")?.textContent,
          loadRetry: !document.getElementById("load-retry")?.hidden,
          answersHidden: document.getElementById("answers")?.hidden,
          categoriesHidden: document.getElementById("categories")?.hidden,
          loadTrace: window.__riddlexLoadTrace || [],
        }));
        throw new Error("Character gameplay did not open: " + JSON.stringify(snapshot) +
          "; pageErrors=" + errors.join(" | ") + "; " + error.message);
      }
      console.log("CHARACTER_FIRST_QUESTION_PASS");
      await page.click("#answer-yes"); // Real person
      await page.waitForFunction(() => /know you personally|ব্যক্তিগতভাবে চেনেন/i.test(
        document.getElementById("status").textContent), null, { timeout: 18000 });
      await page.click("#answer-yes"); // Knows the player
      await page.waitForFunction(() => /member of your family|পরিবারের সদস্য/i.test(
        document.getElementById("status").textContent), null, { timeout: 18000 });
      if (shotFolder) await page.screenshot({ path: join(shotFolder, "personal-question-portrait.png") });
      console.log("RIDDLEX_PERSONAL_QUESTIONS_PASS");
    }
    assert.deepEqual(errors, [], "uncaught browser errors");
    console.log("RIDDLEX_GAMEPLAY_PASS", width, height, orient);
    await page.close();
  }

  // Drive the actual packed knowledge database through the same browser UI as
  // a player, not a tiny mock casebook. Log every question, answer and guess.
  async function replay(label, policy) {
    const targets = {
      fridge: "c-fridge", ceiling_fan: "c-ceiling-fan",
      air_conditioner: "c-air-conditioner", butterfly: "c-butterfly",
      honeybee: "c-honeybee",
    };
    const category = ["butterfly","honeybee"].includes(policy) ? "animal"
      : targets[policy] ? "object" : "character";
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const trace = [];
    try {
      await page.goto(origin + "/games/riddlex/?autotest=1", { waitUntil: "load" });
      await page.click("#play");
      await page.waitForFunction(() => !document.getElementById("categories").hidden);
      await page.click('[data-cat="' + category + '"]');
      await page.waitForFunction(() => window.__riddlex?.state()?.mode === "ask", null, { timeout: 35000 });
      const seen = new Set();
      let confirmedCountry = false;
      let knowsNo = false;
      let cricketNo = false;
      let parentYes = false;
      let guesses = 0;
      let lastGuessQuestionCount = -1;
      let filmFollowUpsAfterGuess = 0;
      for (let turn = 0; turn < (["actor_male_1990s","chaplin","dildar","amin"].includes(policy) || targets[policy] ? 55 : 32); turn++) {
        await page.waitForFunction(() =>
          ["ask", "guess", "learn"].includes(window.__riddlex?.state()?.mode),
          null, { timeout: 35000 });
        const state = await page.evaluate(() => window.__riddlex.state());
        if (state.mode === "learn") {
          trace.push("END: learn / defeat");
          if (targets[policy]) assert.fail(
            "Could not identify the " + policy + " after verification questions");
          if (policy === "shakib") {
            const info = await page.evaluate(() => ({
              ...window.__riddlex.diagnose(),
              shakibIndex: window.__riddlex.find("Q266104"),
            }));
            console.log("RIDDLEX_SHAKIB_UNCERTAINTY_DIAG " + JSON.stringify(info));
          }
          if (policy === "actor_female_1990s") {
            assert.ok(seen.size >= 10, "Stopped before actor/decade investigation");
            // Exhausting sparse verified facts is preferable to guessing four
            // more actors the player did not describe.
            if (lastGuessQuestionCount >= 0)
              assert.ok(seen.size > lastGuessQuestionCount,
                "No relevant follow-up was asked after rejecting a film star");
          }
          if (policy === "public") assert.ok(seen.size >= 15,
            "The real knowledge engine surrendered before asking enough questions: " + seen.size);
          // A test with many deliberately unknown personal and career facts
          // may exhaust meaningful acting questions sooner. Require it to
          // ask follow-up questions after actor=yes, rather than forcing a
          // misleading celebrity guess from sparse facts.
          if (policy === "actor") assert.ok(seen.size >= 12,
            "The engine gave up immediately on actor=yes: " + seen.size);
          if ((policy === "actor_1990s" || policy === "actor_female_1990s")) {
            const info = await page.evaluate(() => window.__riddlex.diagnose());
            console.log("RIDDLEX_OWNER_ACTOR_1990S_DIAG " + JSON.stringify(info));
            assert.ok(info.loadedCount > 1, "regional Bangladesh shards were never loaded");
            assert.ok(info.bdActorCount > 0, "regional Bangladesh actor records were never added");
            if (lastGuessQuestionCount >= 0) {
              assert.ok(seen.size > lastGuessQuestionCount,
                "Game surrendered without trying any new relevant question");
            } else {
              assert.ok(seen.size >= 13, "Game surrendered before the initial 1990s film questions");
            }
          }
          break;
        }
        if (state.mode === "guess") {
          const name = await page.locator("#guess-line").textContent();
          if (lastGuessQuestionCount >= 0) {
            assert.ok(seen.size - lastGuessQuestionCount >= 5,
              "Guessed another name without five new questions: " +
              (seen.size-lastGuessQuestionCount));
          }
          lastGuessQuestionCount = seen.size;
          if (policy === "actor_female_1990s") {
            const maleBit = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "male"), state.best);
            assert.notEqual(maleBit, "yes", "Guess contradicts male=no: " + state.best);
          }
          if (policy === "actor_male_1990s") {
            assert.ok(seen.has("screen_star_1990s"),
              "Actor was guessed before confirming fame in 1990–1999");
            const maleBit = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "male"), state.best);
            assert.equal(maleBit, "yes", "Guessed a woman or unknown-gender actor after male=yes: "+state.best);
            const era = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "screen_star_1990s"), state.best);
            assert.equal(era, "yes", "Guessed someone without verified 1990–1999 fame: "+state.best);
          }
          trace.push("GUESS: " + name + " [" + state.best + "]");
          assert.ok(!knowsNo || !state.best.startsWith("riddlex-role-"),
            "A no-personal-contact answer guessed a personal role");
          if ((policy === "actor_1990s" || policy === "actor_female_1990s")) {
            const contradictedEra = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "screen_star_pre1990"), state.best);
            assert.notEqual(contradictedEra, "yes",
              "Known pre-1990s star guessed despite firm NO: " + state.best);
            const denied1990s = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "screen_star_1990s"), state.best);
            assert.notEqual(denied1990s, "no",
              "Known NOT-1990s star guessed despite firm YES: " + state.best);
          }
          if (policy === "actor" || policy === "actor_1990s" || policy === "actor_female_1990s") {
            const recordedActing = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "actor"), state.best);
            assert.equal(recordedActing, "yes",
              "actor YES guessed someone with no acting evidence: " + state.best);
            const recordedBangladesh = await page.evaluate((id) =>
              window.__riddlex.replyFor(id, "from_bd"), state.best);
            assert.equal(recordedBangladesh, "yes",
              "Bangladesh YES guessed an actor without verified Bangladesh fact: " + state.best);
          }
          if (policy === "chaplin" && state.best === "Q882") {
            trace.push("CORRECT: Charlie Chaplin by silent comedy and moustache");
            break;
          }
          if (policy === "dildar" && state.best === "Q18987612") {
            trace.push("CORRECT: Dildar by supporting comedy role");
            break;
          }
          if (policy === "amin" && state.best === "Q21066842") {
            trace.push("CORRECT: Amin Khan by film career and Walton role");
            break;
          }
          if (targets[policy] && state.best === targets[policy]) {
            trace.push("CORRECT: " + policy + " after candidate-specific function clues");
            break;
          }
          if (policy === "family") {
            assert.equal(state.best, "riddlex-role-mother",
              "A confirmed mother must not be replaced by a public celebrity or wrong relative");
            break;
          }
          if (policy === "public") {
            assert.fail("Guessed an unsupported public celebrity from country and negative jobs: " + name);
          }
          if (policy === "shakib" && state.best === "Q266104") {
            trace.push("CORRECT: real packed Shakib target");
            break;
          }
          guesses++;
          if (guesses >= (policy === "actor_female_1990s" ? 5 : 3)) break;
          await page.click("#wrong");
          await page.waitForFunction(() => window.__riddlex?.state()?.mode === "wrong", null, { timeout: 20000 });
          await page.click("#retry");
          await page.waitForFunction(() => ["ask","learn","guess"].includes(window.__riddlex?.state()?.mode),
            null, { timeout: 25000 });
          continue;
        }
        const q = state.question;
        if (seen.has(q)) throw new Error("Question repeated: " + q);
        if (policy === "actor_male_1990s" && lastGuessQuestionCount >= 0 &&
            q.startsWith("screen_")) filmFollowUpsAfterGuess++;
        if (seen.has("real") && q === "fictional" && knowsNo)
          assert.fail("Riddlex reopened fictional status after real=yes");
        if (policy === "actor_female_1990s" && seen.has("male") && q === "female")
          assert.fail("Redundant female question after male=no");
        assert.ok(!(q === "dead" && seen.has("alive")), "Alive/dead question duplicated");
        if (policy === "public" && seen.has("actor"))
          assert.ok(!q.startsWith("screen_star_"), "Actor-only trivia after actor NO");
        seen.add(q);
        if (knowsNo) assert.ok(!q.startsWith("your_"), "Family question after knows-you NO: " + q);
        if (parentYes) assert.ok(!["your_sibling","your_spouse","your_child","your_baby"].includes(q),
          "Contradictory family question after parent YES: " + q);
        if (!seen.has("cricketer") || cricketNo)
          assert.ok(!["does_bat","does_bowl","batsman","bowler","all_rounder","cricket_opener"].includes(q),
            "Cricket role asked without affirmative cricket answer: " + q);
        let a = "unknown";
        if (targets[policy]) {
          // Use the full real packed casebook, not a synthetic fixture.
          a = await page.evaluate(({id,qid}) => window.__riddlex.replyFor(id,qid),
            {id:targets[policy],qid:q});
        }
        else if (q === "real") a = "yes";
        else if (q === "knows_you") a = policy === "family" ? "yes" : "no";
        else if (policy === "chaplin" && q === "from_bd") a = "no";
        else if (policy === "chaplin" && q !== "from_bd")
          a = await page.evaluate((qid) =>
            window.__riddlex.replyFor("Q882", qid), q);
        else if (policy === "dildar") {
          // User-supplied true clues must remain truthful BEFORE the
          // relevant regional shard has downloaded the person. Do not
          // derive the user's answers from an unloaded pool entry.
          const clues = {
            real:"yes", male:"yes", female:"no", alive:"no", dead:"yes",
            from_bd:"yes", named:"yes", actor:"yes", politician:"no",
            screen_role_lead:"no", screen_role_villain:"no",
            screen_role_comedy:"yes", screen_role_supporting:"yes",
            screen_silent_comedy:"no", screen_comedy_award:"yes",
          };
          a = clues[q] || await page.evaluate((qid) =>
            window.__riddlex.replyFor("Q18987612", qid), q);
        }
        else if (policy === "amin") {
          // User's affirmative facts are independent of whether regional
          // film shards have downloaded the actor yet.
          const clues = {
            real:"yes", knows_you:"no", male:"yes", female:"no",
            alive:"yes", dead:"no", from_bd:"yes", named:"yes",
            actor:"yes", screen_role_lead:"yes",
            screen_star_pre1990:"no", screen_star_1990s:"yes",
            screen_walton_executive:"yes",
            screen_return_after_long_break:"yes",
            screen_debut_abujh_duti_mon:"yes",
            screen_film_debut_pre1995:"yes",
            screen_over_100_films:"yes",
            screen_films_after_2000:"yes",
            screen_new_film_announced_2026:"yes",
            cricketer:"no", footballer:"no", politician:"no",
          };
          a = clues[q] || await page.evaluate(qid =>
            window.__riddlex.replyFor("Q21066842", qid), q);
        }
        else if (q === "from_bd") a = "yes";
        else if (policy === "actor_male_1990s" && q === "male") a = "yes";
        else if (policy === "actor_male_1990s" && ["real","alive","named","actor","screen_star_1990s"].includes(q)) a = "yes";
        else if (policy === "actor_male_1990s" && [
          "politician","writer","singer","musician","director","athlete",
          "screen_star_pre1990","cricketer","footballer"
        ].includes(q)) a = "no";
        else if (policy === "actor_female_1990s" && q === "male") a = "no";
        else if ((policy === "actor_1990s" || policy === "actor_female_1990s") && ["named","alive","actor","screen_star_1990s"].includes(q)) a = "yes";
        else if ((policy === "actor_1990s" || policy === "actor_female_1990s") && [
          "politician","writer","singer","musician","director","athlete",
          "screen_star_pre1990","cricketer","footballer"
        ].includes(q)) a = "no";
        else if (policy === "shakib" && q !== "knows_you")
          a = await page.evaluate(() =>
            window.__riddlex.find("Q266104") >= 0
              ? window.__riddlex.replyFor("Q266104") : "unknown");
        else if (policy === "actor" && q === "actor") a = "yes";
        else if (policy === "actor" && [
          "politician", "singer", "writer", "athlete", "cricketer",
          "footballer", "director", "musician", "business", "youtube",
          "does_bat", "does_bowl"
        ].includes(q)) a = "no";
        else if (q === "cricketer" || q === "does_bat" || q === "does_bowl") a = "no";
        else if (policy === "family" && q === "your_family") a = "yes";
        else if (policy === "family" && q === "your_parent") a = "yes";
        else if (policy === "family" && q === "female") a = "yes";
        else if (policy === "family" && q === "male") a = "no";
        else if (policy === "public" && ["politician","actor","singer","writer","footballer","scientist"].includes(q))
          a = "no";
        if (q === "from_bd" && a === "yes") confirmedCountry = true;
        if (q === "knows_you" && a === "no") knowsNo = true;
        if (q === "cricketer" && a === "no") cricketNo = true;
        if (q === "your_parent" && a === "yes") parentYes = true;
        trace.push("Q" + (turn+1) + " " + q + " = " + a);
        await page.evaluate((value) => window.__riddlex.answer(value), a);
      }
      console.log("RIDDLEX_OWNER_REPLAY_" + policy.toUpperCase() + " " + JSON.stringify(trace));
      if (category === "character")
        assert.ok(seen.has("knows_you"), "Personal-contact question was not asked");
      if (policy === "family") assert.ok(parentYes, "The family/parent route was not reached");
      if (policy === "public" || policy === "actor")
        assert.ok(confirmedCountry, "Bangladesh question was not asked");
      if (policy === "actor") {
        assert.ok(seen.has("actor"), "Actor yes was never exercised");
        assert.ok(knowsNo, "Personal acquaintance no was never exercised");
      }
      if (policy === "actor_male_1990s" && guesses >= 2)
        assert.ok(filmFollowUpsAfterGuess >= 3,
          "After wrong guesses, Riddlex did not ask meaningful cinema follow-ups");
      if (policy === "chaplin" || policy === "dildar") {
        const loadedTarget = await page.evaluate((id) =>
          window.__riddlex.find(id) >= 0, policy==="chaplin" ? "Q882" : "Q18987612");
        if (!loadedTarget) console.error("RIDDLEX_OWNER_TARGET_MISSING "+policy);
        assert.ok(trace.some((item) => item.startsWith("CORRECT:")),
          "Target not recognized in the real game: "+label);
      }
      if (policy === "shakib") assert.ok(trace.some((item) => item.startsWith("CORRECT:")),
        "The real Shakib entry was not guessed after real answers");
      if (targets[policy]) {
        assert.ok(trace.some(item=>item.startsWith("CORRECT:")),
          "The candidate-hypothesis replay did not identify " + policy);
        const signature = {
          fridge:"obj_keeps_food_cold", ceiling_fan:"obj_mounted_ceiling",
          air_conditioner:"obj_cools_room", butterfly:"animal_patterned_wings",
          honeybee:"animal_makes_honey",
        };
        assert.ok(seen.has(signature[policy]),
          "Game guessed without checking the unique " + policy + " function");
      }
      if (policy === "amin") {
        assert.ok(trace.some((item) => item.startsWith("CORRECT:")),
          "Amin Khan was not recognized after corroborated career and Walton answers");
        assert.ok(seen.has("screen_walton_executive") ||
          seen.has("screen_debut_abujh_duti_mon"),
          "No identifying career question was asked about Amin Khan");
      }
      return trace;
    } catch (error) {
      console.error("RIDDLEX_OWNER_REPLAY_FAILED_" + policy.toUpperCase() + " " + JSON.stringify(trace));
      throw error;
    } finally {
      await page.close();
    }
  }
  await replay("Bangladeshi ordinary person", "public");
  await replay("Bangladeshi family member", "family");
  await replay("Shakib Al Hasan with the real database answers", "shakib");
  await replay("Bangladeshi actor who does not know the player", "actor");
  await replay("1990s Bangladeshi actor, 12 real user answers", "actor_1990s");
  await replay("Female Bangladesh actress with male=no", "actor_female_1990s");
  await replay("Male Bangladesh actor 1990–1999 with multiple rejected guesses", "actor_male_1990s");
  await replay("Amin Khan with verified film and Walton career clues", "amin");
  await replay("Refrigerator: keeps food fresh and cold", "fridge");
  await replay("Ceiling fan: moving air overhead", "ceiling_fan");
  await replay("Air conditioner: cools a room", "air_conditioner");
  await replay("Butterfly: colourful wings, not just shared flower visits", "butterfly");
  await replay("Honeybee: collects nectar but makes honey", "honeybee");
  await replay("Charlie Chaplin: global silent comic with moustache", "chaplin");
  await replay("Dildar: late Bangladeshi supporting comedian", "dildar");
  // User-requested reality check: play TEN independent sessions in Chromium
  // against the exact PR-head site served from local files. Never seed extra identities or alter
  // the game's knowledge: this is QA-only and logs failures honestly.
  const ownerTrials = [
    { name:"Mirza Fakhrul Islam Alamgir", category:"character", id:"Q6874839", sex:"male",
      facts:{politician:"yes",party_bnp:"yes",party_al:"no",head_of_state:"yes",
        been_minister:"yes",led_gov:"no",been_premier:"no",party_secretary:"no"} },
    { name:"Rashed Khan (former Gono Odhikar secretary)", category:"character", id:"riddlex-rashed-khan",
      sex:"male", facts:{politician:"yes",party_bnp:"yes",party_al:"no",
        party_secretary:"no",head_of_state:"no",been_premier:"no",
        been_minister:"no",led_gov:"no",party_chief:"no",
        zia_family:"no",mujib_family:"no",lives_abroad:"no",athlete:"no"} },
    { name:"Obaidul Quader", category:"character", id:"Q14325293", sex:"male",
      facts:{politician:"yes",party_al:"yes",party_bnp:"no",head_of_state:"no",
        been_minister:"yes",party_secretary:"yes",led_gov:"no",been_premier:"no"} },
    { name:"Hero Alom", category:"character", id:"Q26923194", sex:"male",
      facts:{actor:"yes",singer:"yes",youtube:"yes",politician:"yes",
        business:"yes",cricketer:"no",footballer:"no",led_gov:"no",
        head_of_state:"no",been_premier:"no",been_minister:"no",
        party_al:"no",party_bnp:"no",party_jp:"no",party_jamaat:"no",
        party_secretary:"no",zia_family:"no",mujib_family:"no",
        lives_abroad:"no",athlete:"no"} },
    { name:"Ananta Jalil", category:"character", id:"Q5299478", sex:"male",
      facts:{actor:"yes",director:"yes",business:"yes",politician:"no",
        cricketer:"no",footballer:"no",screen_role_lead:"yes",
        screen_star_pre1990:"no",screen_star_1990s:"no",
        screen_film_debut_pre1995:"no",screen_films_after_2000:"yes",
        screen_over_100_films:"no",screen_debut_anonto_bhalobasha:"no",
        screen_air_force_before_films:"no",
        screen_first_film_banglar_nayok:"no",screen_800_plus_films:"no"} },
    { name:"Apu Biswas", category:"character", id:"Q14301448", sex:"female",
      facts:{actor:"yes",politician:"no",cricketer:"no",footballer:"no",
        screen_role_lead:"yes",screen_star_pre1990:"no",screen_star_1990s:"no",
        screen_film_debut_pre1995:"no",screen_films_after_2000:"yes"} },
    { name:"Shobnom Bubly", category:"character", id:"Q31176164", sex:"female",
      facts:{actor:"yes",politician:"no",cricketer:"no",footballer:"no",
        screen_role_lead:"yes",screen_star_pre1990:"no",screen_star_1990s:"no",
        screen_film_debut_pre1995:"no",screen_films_after_2000:"yes"} },
    { name:"Dog", category:"animal", id:"Q144",
      facts:{mammal:"yes",pet:"yes",is_dog:"yes",is_cat:"no",is_mouse:"no",
        bird:"no",fish:"no",reptile:"no",insect:"no",can_fly:"no",
        bigger_than_person:"no",water_life:"no",wild:"no",
        animal_visits_flowers:"no",animal_patterned_wings:"no",
        animal_makes_honey:"no",animal_pollen_baskets:"no"} },
    { name:"Riddlex", category:"character", id:"riddlex-detective",
      fiction:true, facts:{fictional:"yes",real:"no",from_game:"yes",
        detective_role:"yes",named:"yes",animal:"no",object:"no",
        from_novel:"no",from_film:"no",from_comics:"no",from_anime:"no",
        from_cartoon:"no",superhero:"no",from_bengali_lit:"no",
        talks:"yes"} },
    { name:"Kathgolap (frangipani flower)", category:"object", id:"c-kathgolap",
      flower:true, facts:{electronic:"no",vehicle:"no",clothing:"no",
        kitchen:"no",cooking:"no",food:"no",metal:"no",music_item:"no",
        sport_item:"no",uses_pressure:"no",obj_uses_electricity:"no",
        obj_moves_air_blades:"no",obj_keeps_food_cold:"no",obj_cools_room:"no",
        pocket:"no",bigger_than_person:"no"} },
  ];
  const qaResults = [];
  for (const trial of ownerTrials) {
    const page = await browser.newPage({
      viewport:{width:390,height:844}, deviceScaleFactor:1,
    });
    const trace = [];
    const seen = new Set();
    const wrongGuesses = [];
    let outcome = "incomplete";
    let loadedAtEnd = false;
    let note = "";
    try {
      // The deployed app, rather than an engine mock or an invented casebook.
      const response = await page.goto(
        origin + "/games/riddlex/?autotest=1",
        {waitUntil:"load",timeout:45000});
      if (response?.status() !== 200)
        throw new Error("LIVE_HTTP_" + response?.status());
      await page.click("#play");
      await page.waitForFunction(() =>
        !document.getElementById("categories").hidden,
        null,{timeout:25000});
      await page.click('[data-cat="' + trial.category + '"]');
      await page.waitForFunction(() =>
        window.__riddlex?.state()?.mode === "ask",
        null,{timeout:45000});
      for (let turn=0;turn<65;turn++) {
        await page.waitForFunction(()=>
          ["ask","guess","learn"].includes(window.__riddlex?.state()?.mode),
          null,{timeout:35000});
        const state = await page.evaluate(()=>window.__riddlex.state());
        if (state.mode==="learn") {outcome="defeat";break;}
        if (state.mode==="guess") {
          const label=(await page.locator("#guess-line").textContent())?.trim() || "";
          const guessRecord={questionCount:trace.length,id:state.best,label};
          const correctById=trial.id && state.best===trial.id;
          const correctByName=trial.name.startsWith("Rashed Khan") &&
            /^Are you thinking of (Md\.? |Muhammad )?Rashed Khan\??$/i.test(label);
          const correctFlower=trial.flower &&
            /kathgolap|frangipani|plumeria|কাঠগোলাপ/i.test(label);
          if (correctById || correctByName || correctFlower) {
            // Confirm the real guess; the name/photo must disappear, while
            // the detective's own speech and replay button remain.
            await page.click("#correct");
            await page.waitForFunction(()=>window.__riddlex.state().mode==="solved");
            assert.equal(await page.locator("#speech").isVisible(),true);
            assert.equal(await page.locator("#solved-line").isVisible(),false);
            assert.equal(await page.locator("#again").isVisible(),true);
            assert.equal(await page.evaluate(()=>window.__riddlex.expression().revealActive),false,"name-only or photo card must be removed");
            assert.equal(await page.evaluate(()=>window.__riddlex.expression().revealBounds),null);
            assert.equal(await page.locator("#guess-line").textContent(),"");
            assert.equal(await page.locator("#speech").evaluate(e=>getComputedStyle(e).opacity),"1","victory speech must be visible immediately");
            assert.match(await page.locator("#status").textContent(),/Great! I guessed it\.|দারুণ! আমি ঠিক ধরেছি।/);
            await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
            if(shotFolder)await page.screenshot({path:join(shotFolder,"solved-no-name.png")});
            await page.click('#game [data-set-lang="bn"]');
            assert.equal(await page.locator("#status").textContent(),"দারুণ! আমি ঠিক ধরেছি।");
            assert.equal(await page.evaluate(()=>window.__riddlex.expression().revealActive),false);
            await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
            if(shotFolder)await page.screenshot({path:join(shotFolder,"solved-bn-no-name.png")});
            await page.click('#game [data-set-lang="en"]');
            console.log("SOLVED_ATOMIC_VISUAL_PASS");
            outcome="correct";break;
          }
          wrongGuesses.push(guessRecord);
          if (wrongGuesses.length>=5) {outcome="wrong-guesses";break;}
          await page.evaluate(()=>window.__riddlex.wrong());
          await page.waitForFunction(()=>
            window.__riddlex?.state()?.mode==="wrong",
            null,{timeout:25000});
          await page.evaluate(()=>window.__riddlex.retry());
          await page.waitForFunction(()=>
            ["ask","guess","learn"].includes(window.__riddlex?.state()?.mode),
            null,{timeout:35000});
          continue;
        }
        const q=state.question;
        if(seen.has(q)) {
          note="Question repeated: "+q;
          outcome="repeated-question";break;
        }
        seen.add(q);
        const known=trial.facts[q];
        let a=known||"unknown";
        if(!known) {
          if(q==="named" && trial.category==="character")a="yes";
          else if(trial.category==="character" && !trial.fiction) {
            if(q==="real")a="yes";
            else if(q==="fictional")a="no";
            else if(q==="knows_you")a="no";
            else if(q==="male" && trial.sex)a=trial.sex==="male"?"yes":"no";
            else if(q==="female" && trial.sex)a=trial.sex==="female"?"yes":"no";
            else if(q==="alive")a="yes";
            else if(q==="dead")a="no";
            else if(q==="from_bd")a="yes";
            else if(q.startsWith("from_") && q!=="from_asia")a="no";
          }
          if(a==="unknown" && trial.id) {
            a=await page.evaluate(({id,q})=>window.__riddlex.replyFor(id,q),
              {id:trial.id,q});
          }
        }
        trace.push({q,a});
        await page.evaluate(value=>window.__riddlex.answer(value),a);
      }
      if (trial.id) loadedAtEnd=await page.evaluate(
        id=>window.__riddlex.find(id)>=0,trial.id);
      if(outcome==="incomplete")note="Reached 65 turns without a terminal result";
    } catch(error) {
      outcome="browser-error";
      note=String(error?.stack || error).slice(0,700);
    } finally {
      const item={name:trial.name,category:trial.category,targetId:trial.id,
        outcome,loadedAtEnd,questions:trace.length,
        unknowns:trace.filter(row=>row.a==="unknown").length,
        wrongGuesses,trace,note};
      qaResults.push(item);
      console.log("OWNER_TEN_RESULT "+JSON.stringify(item));
      await page.close().catch(()=>{});
    }
  }
  console.log("OWNER_TEN_SUMMARY "+JSON.stringify(qaResults.map(
    ({name,category,outcome,loadedAtEnd,questions,unknowns,wrongGuesses,note})=>({
      name,category,outcome,loadedAtEnd,questions,unknowns,
      wrongGuessCount:wrongGuesses.length,note
    }))));
  assert.deepEqual(qaResults.filter(row=>row.outcome!=="correct").map(
    row=>row.name+": "+row.outcome),[],
    "All ten independently played owner cases must be identified correctly");

} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
