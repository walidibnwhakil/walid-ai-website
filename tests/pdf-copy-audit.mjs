import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { chromium } from "playwright";

const root = new URL("../", import.meta.url);
const slugs = [
  "merge-pdf", "split-pdf", "compress-pdf", "pdf-to-word", "edit-pdf",
  "organize-pdf", "page-numbers", "watermark-pdf", "sign-pdf",
  "protect-pdf", "bengali-ocr"
];
const banned = /\b(?:backend|PDF\.js|Tesseract|jsDelivr|onrender|free-tier|sign-in token|provider libraries|API endpoints)\b/i;
let browser, server;
try {
  const files = ["pdf/index.html", ...slugs.map(slug => "pdf/" + slug + "/index.html")];
  for (const path of files) {
    const html = await readFile(new URL(path, root), "utf8");
    assert.ok(!/<a class="tool" href="\/tools\/image-to-pdf\/"/.test(html),
      "Image to PDF must not return to the PDF tool listing");
    const start=html.indexOf('<section class="panel"');
    const end=html.indexOf("</section>",start);
    const panelText=start<0?"":html.slice(start,end);
    assert.ok(!/Where the file is processed|Short FAQ|Troubleshooting|Formats and limits/.test(panelText),
      path+" contains legacy editorial sections");
  }
  for (const slug of slugs) {
    const legacy = await readFile(new URL("tools/" + slug + "/index.html",root),"utf8");
    assert.match(legacy,new RegExp("/pdf/"+slug+"/"),"Legacy URL must redirect to canonical PDF route");
  }
  const studio = await readFile(new URL("tools/pdf-browser/studio.html",root), "utf8");
  assert.ok(!/Tesseract|jsDelivr|raster fallback|embedded font|<code>ben\+eng<\/code>/.test(studio),
    "PDF workspace hints should explain tasks rather than implementation");
  const workspace = await readFile(new URL("tool-workspace/index.html",root), "utf8");
  assert.ok(!/<a class="tool-card" href="tools\/image-to-pdf\/"/.test(workspace),
    "Do not advertise the removed Image to PDF card");
  server = createServer(async(req,res)=>{
    const u = new URL(req.url, "http://localhost");
    let path = u.pathname.slice(1);
    if (path.endsWith("/")) path += "index.html";
    if (!path || path.includes("..")) { res.writeHead(404); res.end(); return; }
    try {
      const body = await readFile(new URL(path,root));
      res.writeHead(200, {"content-type":
        path.endsWith(".html") ? "text/html" :
        path.endsWith(".css") ? "text/css" :
        path.endsWith(".js") || path.endsWith(".mjs") ? "text/javascript" : "application/octet-stream"});
      res.end(body);
    } catch { res.writeHead(404); res.end("Not found"); }
  });
  server.listen(0,"127.0.0.1");
  await once(server,"listening");
  browser = await chromium.launch({headless:true});
  const origin="http://127.0.0.1:"+server.address().port;
  let total=0;
  for (const width of [360, 390, 1280]) {
    const page=await browser.newPage({viewport:{width,height:850},deviceScaleFactor:1});
    // Only local page assets: remote ads and converter iframes do not improve typography checks.
    await page.route("**/*",route=>{
      const url = route.request().url();
      if (!url.startsWith(origin) || url.includes("/tool-workspace/") || url.includes("/tools/pdf-browser/studio.html")) return route.abort();
      return route.continue();
    });
    for (const path of files) {
      const res=await page.goto(origin+"/"+path,{waitUntil:"domcontentloaded"});
      assert.equal(res?.status(),200,path+" failed to load");
      const state=await page.evaluate(()=>{
        const root=document.querySelector(".panel")||document.querySelector(".intro");
        const paragraphs=[...root.querySelectorAll("p")];
        const rect=root.getBoundingClientRect();
        return {
          text:root.textContent,
          heading:document.querySelector("h1")?.textContent||"",
          count:paragraphs.length,
          align:paragraphs.map(p=>getComputedStyle(p).textAlign),
          widths:paragraphs.map(p=>p.getBoundingClientRect().width),
          left:rect.left,right:rect.right,panelWidth:rect.width,
          viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth
        };
      });
      assert.ok(state.heading.trim(),path+" missing title");
      assert.ok(state.count>0,path+" missing instructions");
      const expectedAlignment=width<=700?(path==="pdf/index.html"?"center":"left"):"justify";
      assert.ok(state.align.every(v=>v===expectedAlignment),path+" copy alignment at "+width+"px should be "+expectedAlignment+": "+state.align.join(","));
      assert.ok(state.left>=-2 && state.right<=width+2,path+" content extends past viewport at "+width+"px: "+JSON.stringify(state));
      assert.ok(state.widths.every(v=>v>0 && v<=width),path+" paragraph does not fit "+width+"px");
      if (path!=="pdf/index.html") {
        assert.ok(!banned.test(state.text),path+" exposes internal implementation text");
        assert.ok(state.text.length<1000,path+" has excessive instructions");
      }
      if (path==="pdf/index.html") {
        const cards=await page.evaluate(()=>[...document.querySelectorAll(".grid a.tool")].map(card=>{
          const icon=card.querySelector(".icon"),rect=card.getBoundingClientRect(),ir=icon?.getBoundingClientRect();
          return {href:card.getAttribute("href"),centerOffset:ir?Math.abs((ir.left+ir.right)/2-(rect.left+rect.right)/2):Infinity,
            iconWidth:ir?.width||0,hasVector:!!icon?.querySelector("svg"),name:card.querySelector(".name")?.textContent?.trim()};
        }));
        assert.equal(cards.length,slugs.length,"PDF homepage must show exactly 11 tools");
        cards.forEach((card,index)=>{
          assert.equal(card.href,"/pdf/"+slugs[index]+"/","Tool card must use canonical PDF route");
          assert.ok(card.centerOffset<1.5,card.name+" icon must be centered ("+width+"px)");
          assert.ok(card.iconWidth>=50&&card.iconWidth<=65,card.name+" icon must be premium-sized");
          assert.ok(card.hasVector,card.name+" must use an SVG icon");
        });
      }
      total++;
    }
    if (width===1280) {
      for (const slug of ["merge-pdf","pdf-to-word","bengali-ocr"]) {
        await page.goto(origin+"/tools/"+slug+"/?legacy=1#check",{waitUntil:"domcontentloaded"}).catch(()=>{});
        await page.waitForURL(url=>url.pathname==="/pdf/"+slug+"/"&&url.search==="?legacy=1"&&url.hash==="#check");
        assert.ok(await page.locator("h1").count(),"Legacy URL must arrive on the real PDF tool page");
      }
    }
    await page.close();
  }
  console.log("PDF_COPY_AUDIT_PASS",JSON.stringify({pages:files.length,viewports:[360,390,1280],checks:total}));
} finally {
  await browser?.close();
  if (server) await new Promise(resolve=>server.close(resolve));
}
