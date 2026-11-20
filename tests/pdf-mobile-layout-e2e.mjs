import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";

const root = new URL("../",import.meta.url);
const slugs=["merge-pdf","split-pdf","compress-pdf","pdf-to-word","edit-pdf",
  "organize-pdf","page-numbers","watermark-pdf","sign-pdf","protect-pdf","bengali-ocr"];
const types={".html":"text/html",".css":"text/css",".js":"text/javascript",
  ".mjs":"text/javascript",".svg":"image/svg+xml",".png":"image/png",
  ".jpg":"image/jpeg",".webp":"image/webp",".woff2":"font/woff2"};
const server=createServer(async(req,res)=>{
  let pathname;
  try {pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);}catch{res.writeHead(400).end();return;}
  if(pathname.includes("..")){res.writeHead(404).end();return;}
  if(pathname.endsWith("/"))pathname+="index.html";
  const file=pathname.slice(1);
  const extension=file.match(/\.[^.]+$/)?.[0]||"";
  try{
    const bytes=await readFile(new URL(file,root));
    res.writeHead(200,{"content-type":types[extension]||"application/octet-stream"});
    res.end(bytes);
  }catch{res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
let browser;
let checked=0;
const bodyState=()=>({
  viewport:innerWidth,scrollWidth:document.documentElement.scrollWidth,
  bodyWidth:document.body.scrollWidth
});
try{
  browser=await chromium.launch({headless:true});
  for(const width of [320,360,390,430,1280]){
    const page=await browser.newPage({viewport:{width,height:780},deviceScaleFactor:1});
    await page.route("**/*",route=>{
      if(new URL(route.request().url()).origin!==origin)return route.abort();
      return route.continue();
    });
    const landing=await page.goto(origin+"/pdf/",{waitUntil:"domcontentloaded"});
    assert.equal(landing.status(),200);
    const cards=await page.locator(".grid .tool").evaluateAll(elements=>elements.map(el=>{
      const r=el.getBoundingClientRect();
      return {x:r.x,y:r.y,width:r.width};
    }));
    assert.equal(cards.length,11);
    const firstRow=Math.round(cards[0].y);
    const firstRowCount=cards.filter(x=>Math.abs(x.y-firstRow)<2).length;
    assert.equal(firstRowCount,width<=430?2:5,
      "PDF listing should have "+(width<=430?2:5)+" cards per row at "+width);
    const listingState=await page.evaluate(bodyState);
    assert.ok(listingState.scrollWidth<=width+2,
      "PDF listing horizontally overflows at "+width+": "+JSON.stringify(listingState));
    checked++;
    const paths=width===1280?["merge-pdf"]:slugs;
    for(const slug of paths){
      const response=await page.goto(origin+"/pdf/"+slug+"/",{waitUntil:"domcontentloaded"});
      assert.equal(response.status(),200);
      const nav=await page.locator("header .nav").evaluate(el=>getComputedStyle(el).display);
      assert.equal(nav,width<=430?"none":"flex",
        slug+" phone-only nav behavior at "+width);
      const state=await page.evaluate(bodyState);
      assert.ok(state.scrollWidth<=width+2,
        slug+" parent has sideways overflow at "+width+": "+JSON.stringify(state));
      if(width<=430){
        const paragraph=await page.locator(".panel p").first().evaluate(el=>getComputedStyle(el).textAlign);
        assert.equal(paragraph,"left",slug+" mobile copy must not have stretched words");
      }
      checked++;
    }
    if(width<=430){
      await page.goto(origin+"/pdf/merge-pdf/",{waitUntil:"domcontentloaded"});
      const frame=page.frameLocator("iframe.tool-frame");
      await frame.locator("#pdfFiles").waitFor({state:"attached",timeout:15000});
      const filenames=[
        "first-long-document-name-without-any-spaces-2026-official-completed-file.pdf",
        "second-long-document-name-without-any-spaces-2026-official-completed-file.pdf",
        "third-long-document-name-without-any-spaces-2026-official-completed-file.pdf",
        "fourth-long-document-name-without-any-spaces-2026-official-completed-file.pdf"
      ];
      await frame.locator("#pdfFiles").setInputFiles(filenames.map(name=>({
        name,mimeType:"application/pdf",buffer:Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF")
      })));
      await frame.locator(".picked-file").first().waitFor({state:"visible"});
      const values=await frame.locator("body").evaluate(el=>{
        const b=el.querySelector("#pdfPanel").getBoundingClientRect();
        const fileBox=el.querySelector("#pdfFileNames").getBoundingClientRect();
        const items=[...el.querySelectorAll("#pdfFileNames .picked-file")].map(node=>{
          const r=node.getBoundingClientRect();
          return {left:r.left,right:r.right,width:r.width};
        });
        const order=[...el.querySelectorAll("#mergeOrderList li")].map(node=>{
          const r=node.getBoundingClientRect();
          return {left:r.left,right:r.right,width:r.width};
        });
        return {
          documentWidth:document.documentElement.scrollWidth,viewport:innerWidth,
          panel:{left:b.left,right:b.right},
          fileBox:{left:fileBox.left,right:fileBox.right},
          items,order,selected:el.querySelector("#selectedCount")?.textContent,
          summaryDisplay:getComputedStyle(el.querySelector("#selectedSummary")).display
        };
      });
      assert.equal(values.items.length,4,"All four added files must remain visible");
      assert.equal(values.order.length,4,"All four file order controls must remain visible");
      assert.match(values.selected,/4 PDFs selected/);
      assert.ok(values.documentWidth<=values.viewport+2,"Merge iframe must not scroll sideways: "+JSON.stringify(values));
      for(const item of [...values.items,...values.order]){
        assert.ok(item.left>=-2&&item.right<=values.viewport+2,
          "File row extends outside the phone screen: "+JSON.stringify(item));
      }
      checked++;
      await page.goto(origin+"/pdf/edit-pdf/",{waitUntil:"domcontentloaded"});
      const editor=page.frameLocator("iframe.tool-frame");
      await editor.locator("#choose").waitFor({state:"attached",timeout:15000});
      const editorWidth=await editor.locator("body").evaluate(el=>({
        scroll:document.documentElement.scrollWidth,viewport:innerWidth
      }));
      assert.ok(editorWidth.scroll<=editorWidth.viewport+2,
        "PDF editor iframe must not overflow: "+JSON.stringify(editorWidth));
      checked++;
    }
    await page.close();
  }
  console.log("PDF_MOBILE_LAYOUT_PASS",JSON.stringify({checks:checked,
    testedWidths:[320,360,390,430,1280],toolPages:slugs.length,
    multiFileMerge:true,desktopNavPreserved:true}));
}finally{
  await browser?.close();
  await new Promise(resolve=>server.close(resolve));
}
