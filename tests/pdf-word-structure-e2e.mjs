import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {chromium} from "playwright";
import {PDFDocument,rgb} from "pdf-lib";
import JSZip from "jszip";

const root=new URL("../",import.meta.url);
const mime=p=>p.endsWith(".mjs")||p.endsWith(".js")?"text/javascript":p.endsWith(".html")?"text/html":p.endsWith(".css")?"text/css":p.endsWith(".png")?"image/png":p.endsWith(".ttf")?"font/ttf":"application/octet-stream";
const server=createServer(async(req,res)=>{
  const u=new URL(req.url,"http://127.0.0.1");
  if(req.method==="POST"&&/^\/api\/tools\/(merge-pdf|split-pdf)$/.test(u.pathname)){
    try{
      let jsonText="";
      for await(const chunk of req)jsonText+=chunk;
      const body=JSON.parse(jsonText);
      const name=u.pathname.endsWith("merge-pdf")?"merged.pdf":"split.pdf";
      const doc=await PDFDocument.create();
      if(name==="merged.pdf"){
        for(const encoded of body.files){
          const src=await PDFDocument.load(Buffer.from(encoded,"base64"));
          const copied=await doc.copyPages(src,src.getPageIndices());
          copied.forEach(p=>doc.addPage(p));
        }
      }else{
        const src=await PDFDocument.load(Buffer.from(body.file,"base64"));
        const indexes=String(body.pages||"1").split(",").flatMap(part=>{
          const nums=part.split("-").map(Number);
          return nums.length===2?Array.from({length:Math.max(0,nums[1]-nums[0]+1)},(_,i)=>nums[0]+i-1):[nums[0]-1];
        });
        const copied=await doc.copyPages(src,indexes);
        copied.forEach(p=>doc.addPage(p));
      }
      res.writeHead(200,{"content-type":"application/json","access-control-allow-origin":"*"});
      res.end(JSON.stringify({type:"application/pdf",name,file:Buffer.from(await doc.save()).toString("base64")}));
    }catch(err){res.writeHead(500);res.end(JSON.stringify({error:String(err)}));}
    return;
  }
  let path=u.pathname==="/tool-workspace/"?"tool-workspace/index.html":u.pathname.slice(1);
  if(!path||path.endsWith("/"))path+="index.html";
  if(path.includes("..")){res.writeHead(403);res.end();return;}
  try{const body=await readFile(new URL(path,root));res.writeHead(200,{"content-type":mime(path)});res.end(body);}
  catch(error){res.writeHead(404);res.end("not found "+path);}
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const base="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1100,height:900}});
context.setDefaultTimeout(25000);
const errors=[];
context.on("page",p=>p.on("pageerror",e=>errors.push(String(e))));
async function download(page,selector){
  const event=page.waitForEvent("download",{timeout:30000});
  await page.locator(selector).click();
  const dl=await event,path=await dl.path();assert.ok(path);
  return readFile(path);
}
async function fixturePdf(){
  const page=await context.newPage();
  await page.goto(base+"/tools/pdf-browser/studio.html?tool=edit",{waitUntil:"domcontentloaded"});
  const image=await page.evaluate(async()=>{
    const canvas=document.createElement("canvas");canvas.width=260;canvas.height=120;
    const c=canvas.getContext("2d");c.fillStyle="#d5f2c7";c.fillRect(0,0,260,120);
    c.fillStyle="#173a34";c.font="bold 26px Arial";c.fillText("CHART",40,65);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  await page.close();
  const pdf=await PDFDocument.create(),png=await pdf.embedPng(Buffer.from(image,"base64"));
  const first=pdf.addPage([595,842]);
  first.drawText("REPORT TITLE",{x:60,y:775,size:27,color:rgb(0,0,0)});
  const table=[
    ["NAME","ITEM","AMOUNT"],
    ["ALPHA","PENCIL","100"],
    ["BETA","BOOK","200"]
  ];
  table.forEach((row,i)=>row.forEach((word,j)=>first.drawText(word,{x:60+j*145,y:700-i*40,size:16,color:rgb(0,0,0)})));
  first.drawText("TRAILING TEXT AFTER TABLE",{x:60,y:525,size:15});
  first.drawImage(png,{x:60,y:340,width:205,height:95});
  const second=pdf.addPage([595,842]);
  second.drawText("SECOND PAGE CONTENT",{x:60,y:750,size:18});
  return Buffer.from(await pdf.save());
}
const fixture=await fixturePdf();
async function docx(xmlBytes){
  const zip=await JSZip.loadAsync(xmlBytes);
  const xml=await zip.file("word/document.xml").async("string");
  const pictures=Object.keys(zip.files).filter(n=>n.startsWith("word/media/")&&!zip.files[n].dir);
  return {xml,pictures,zip};
}
async function convert(pdf,name="mixed-content.pdf"){
  const p=await context.newPage();
  try{
    await p.goto(base+"/tool-workspace/?tool=pdf-to-word&standalone=1",{waitUntil:"domcontentloaded"});
    await p.waitForTimeout(900);
    await p.locator("#pdfFiles").setInputFiles({name,mimeType:"application/pdf",buffer:pdf});
    await p.locator("#runPdf").waitFor({state:"visible"});
    await p.locator("#runPdf").click();
    await p.locator("#pdfDownload").waitFor({state:"visible",timeout:100000});
    return await download(p,"#pdfDownload");
  }finally{await p.close();}
}
try {
  console.log("RICH_E2E START",base);

  async function serverTool(slug,files,pages){
    const p=await context.newPage();
    try{
      await p.goto(base+"/tool-workspace/?tool="+slug+"&standalone=1",{waitUntil:"domcontentloaded"});
      // Test the page's recovery startup (no double reset after fast file selection).
      await p.evaluate(()=>{window.WALID_AI_API=location.origin;});
      await p.locator("#pdfFiles").setInputFiles(files.map((bytes,i)=>({name:"part"+i+".pdf",mimeType:"application/pdf",buffer:bytes})));
      if(pages)await p.locator("#pages").fill(pages);
      await p.locator("#runPdf").waitFor({state:"visible",timeout:16000});
      await p.locator("#runPdf").click();
      await p.locator("#pdfDownload").waitFor({state:"visible",timeout:20000});
      return await download(p,"#pdfDownload");
    }finally{await p.close();}
  }
  const merged=await serverTool("merge-pdf",[fixture,fixture]);
  assert.equal((await PDFDocument.load(merged)).getPageCount(),4);
  console.log("RICH_E2E MERGE_PASS");
  const split=await serverTool("split-pdf",[fixture],"2");
  assert.equal((await PDFDocument.load(split)).getPageCount(),1);
  console.log("RICH_E2E SPLIT_PASS");


  const bytes=await convert(fixture);
  const output=await docx(bytes);
  assert.match(output.xml,/REPORT TITLE/);
  assert.match(output.xml,/TRAILING TEXT AFTER TABLE/,"Trailing text must not disappear when a table exists");
  assert.match(output.xml,/SECOND PAGE CONTENT/);
  assert.match(output.xml,/<w:tbl>/,"Table must be a real Word table");
  assert.match(output.xml,/<w:tr>/,"Table rows must be editable");
  assert.match(output.xml,/<w:br w:type="page"/,"Separate PDF pages must be separate Word pages");
  assert.match(output.xml,/<w:drawing>/,"Image must be an editable movable Word image object");
  assert.ok(output.pictures.length>=1,"PDF picture must be a real Word media asset");
  assert.match(output.zip.file("word/_rels/document.xml.rels")?await output.zip.file("word/_rels/document.xml.rels").async("string"):"",/relationships\/image/);
  console.log("RICH_E2E WORD_PASS",JSON.stringify({bytes:bytes.length,images:output.pictures.length,tables:(output.xml.match(/<w:tbl>/g)||[]).length}));

  // A mislabeled or corrupted upload must never show a stale DOCX download link.
  const invalidWord=await context.newPage();
  await invalidWord.goto(base+"/tool-workspace/?tool=pdf-to-word&standalone=1",{waitUntil:"domcontentloaded"});
  await invalidWord.locator("#pdfFiles").setInputFiles({
    name:"not-really-a-pdf.pdf",mimeType:"application/pdf",
    buffer:Buffer.from("this upload is not a PDF")
  });
  await invalidWord.locator("#runPdf").click();
  await invalidWord.locator("#status").filter({hasText:"not a valid PDF"}).waitFor({state:"visible",timeout:15000});
  assert.equal(await invalidWord.locator("#pdfDownload").isVisible(),false,
    "Invalid PDF input must not expose a DOCX download");
  await invalidWord.close();
  console.log("RICH_E2E INVALID_PDF_WORD_REJECTED");



  const scanPng=await readFile("tests/fixtures/bengali-mixed.png");
  const scanDoc=await PDFDocument.create();
  const scanImage=await scanDoc.embedPng(scanPng);
  const scannedPage=scanDoc.addPage([595,842]);
  scannedPage.drawImage(scanImage,{x:40,y:650,width:520,height:85});
  const scanPdfBytes=Buffer.from(await scanDoc.save());
  const scanOut=await docx(await convert(scanPdfBytes,"scanned-bengali.pdf"));
  assert.match(scanOut.xml,/[\u0980-\u09ff]/,"Scanned Bengali page must create editable text runs");
  assert.match(scanOut.xml,/<w:t\b/);
  console.log("RICH_E2E SCANNED_BENGALI_WORD_PASS");

  const longDoc=await PDFDocument.create();
  for(let n=1;n<=11;n++)longDoc.addPage([595,842]).drawText("PAGE "+n+" EXTENDED",{x:55,y:750,size:20});
  const longResult=await docx(await convert(Buffer.from(await longDoc.save()),"eleven-pages.pdf"));
  assert.match(longResult.xml,/PAGE 11 EXTENDED/,"Must include content beyond the old ten page limit");
  assert.equal((longResult.xml.match(/w:type="page"/g)||[]).length,10,"Keep explicit Word page breaks");
  console.log("RICH_E2E ELEVEN_PAGE_WORD_PASS");

  const edit=await context.newPage();
  await edit.goto(base+"/tools/pdf-browser/studio.html?tool=edit",{waitUntil:"domcontentloaded"});
  await edit.locator("#file").setInputFiles({name:"editor.pdf",mimeType:"application/pdf",buffer:fixture});
  await edit.locator("#pageLabel").filter({hasText:"1 / 2"}).waitFor({state:"visible"});
  await edit.locator('[data-edit="replace"]').click();
  const hits=edit.locator(".source-text-hit");
  await hits.first().waitFor({state:"visible",timeout:20000});
  await hits.first().click();
  const chosen=edit.locator(".ann-replacement.selected");
  await chosen.waitFor({state:"visible"});
  await chosen.fill("UPDATED EDITABLE TITLE");
  await edit.locator("#saveEdit").click();
  await edit.locator("#download").waitFor({state:"visible"});
  const edited=await download(edit,"#download");
  const restored=await PDFDocument.load(edited);
  assert.equal(restored.getPageCount(),2);
  console.log("RICH_E2E EDIT_PASS",JSON.stringify({sourceTextHits:await hits.count(),bytes:edited.length}));

  const smallPdf=await PDFDocument.create();const pg=smallPdf.addPage([595,842]);pg.drawText("SEARCHABLE CONTENT",{x:60,y:750,size:22});
  const small=Buffer.from(await smallPdf.save());
  const comp=await context.newPage();
  await comp.goto(base+"/tools/pdf-browser/studio.html?tool=compress",{waitUntil:"domcontentloaded"});
  await comp.locator("#file").setInputFiles({name:"text.pdf",mimeType:"application/pdf",buffer:small});
  await comp.locator("#status").filter({hasText:"page ready."}).waitFor({state:"visible"});
  await comp.locator("#applyCompress").click();
  await comp.locator("#download").waitFor({state:"visible"});
  const compressed=await download(comp,"#download");
  assert.ok(compressed.length<=small.length,"Text compression must never enlarge PDF");
  const extracted=await comp.evaluate(async bytes=>{
    const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const parsed=await pdfjs.getDocument({data:Uint8Array.from(bytes)}).promise;
    const extracted=(await (await parsed.getPage(1)).getTextContent()).items.map(i=>i.str).join(" ");
    await parsed.destroy();
    return extracted;
  },Array.from(compressed));
  assert.match(extracted,/SEARCHABLE CONTENT/,"Compression must preserve selectable text");
  console.log("RICH_E2E COMPRESS_PASS",JSON.stringify({original:small.length,output:compressed.length,textSelectable:true}));

  const opened=[];
  async function toolPage(tool,pdf=fixture){
    const p=await context.newPage();opened.push(p);
    await p.goto(base+"/tools/pdf-browser/studio.html?tool="+tool,{waitUntil:"domcontentloaded"});
    await p.locator("#file").setInputFiles({name:"audit.pdf",mimeType:"application/pdf",buffer:pdf});
    await p.locator("#work").waitFor({state:"visible"});
    if(tool==="numbers"||tool==="watermark")await p.locator("#status").filter({hasText:"2 pages ready."}).waitFor({state:"visible",timeout:25000});
    return p;
  }
  const secure=await toolPage("edit");
  await secure.locator("#pageLabel").filter({hasText:"1 / 2"}).waitFor({state:"visible"});
  await secure.locator('[data-edit="replace"]').click();
  await secure.locator(".source-text-hit").first().waitFor({state:"visible",timeout:15000});
  await secure.locator(".source-text-hit").first().click();
  await secure.locator(".ann-replacement.selected").fill("SECURE NEW TITLE");
  await secure.locator("#flattenReplacements").check();
  await secure.locator("#saveEdit").click();
  await secure.locator("#download").waitFor({state:"visible",timeout:30000});
  const secured=await download(secure,"#download");
  assert.equal((await PDFDocument.load(secured)).getPageCount(),2);
  const secureText=await secure.evaluate(async bytes=>{
    const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
    pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
    const pdf=await pdfjs.getDocument({data:Uint8Array.from(bytes)}).promise;
    const text=(await (await pdf.getPage(1)).getTextContent()).items.map(i=>i.str).join(" ");
    await pdf.destroy();return text;
  },Array.from(secured));
  assert.doesNotMatch(secureText,/REPORT TITLE/,"Secure edit must remove original text, not merely cover it");
  console.log("RICH_E2E SECURE_EDIT_PASS",{bytes:secured.length,originalTextRemoved:true});


  const scannedEditor=await toolPage("edit",scanPdfBytes);
  await scannedEditor.locator("#pageLabel").filter({hasText:"1 / 1"}).waitFor({state:"visible"});
  await scannedEditor.locator("#recognizeEditText").click();
  await scannedEditor.locator(".source-text-hit").first().waitFor({state:"visible",timeout:50000});
  const hitsCount=await scannedEditor.locator(".source-text-hit").count();
  assert.ok(hitsCount>0,"Scanned Bengali page must yield clickable OCR text hits");
  await scannedEditor.locator(".source-text-hit").first().click();
  await scannedEditor.locator(".ann-replacement.selected").fill("সংশোধিত");
  await scannedEditor.locator("#flattenReplacements").check();
  await scannedEditor.locator("#saveEdit").click();
  await scannedEditor.locator("#download").waitFor({state:"visible",timeout:30000});
  const editedScan=await download(scannedEditor,"#download");
  assert.equal((await PDFDocument.load(editedScan)).getPageCount(),1);
  console.log("RICH_E2E SCANNED_EDIT_OCR_PASS",{words:hitsCount,bytes:editedScan.length});

  const organize=await toolPage("organize");
  await organize.locator("#organizeGrid .page-card").first().waitFor({state:"visible"});
  await organize.locator("#organizeGrid .page-card").first().getByRole("button",{name:"Right"}).click();
  await organize.locator("#saveOrganize").click();
  const organized=await download(organize,"#download");
  assert.equal((await PDFDocument.load(organized)).getPage(0).getRotation().angle,90);
  console.log("RICH_E2E ORGANIZE_PASS");

  const num=await toolPage("numbers");
  await num.locator("#numberStart").fill("7");
  await num.locator("#numberBengali").check();
  await num.locator("#applyNumbers").click();
  const numbered=await download(num,"#download");
  assert.equal((await PDFDocument.load(numbered)).getPageCount(),2);
  console.log("RICH_E2E NUMBERS_PASS");

  const water=await toolPage("watermark");
  await water.locator("#watermarkText").fill("WALID TEST");
  await water.locator("#applyWatermark").click();
  const watermarked=await download(water,"#download");
  assert.equal((await PDFDocument.load(watermarked)).getPageCount(),2);
  console.log("RICH_E2E WATERMARK_PASS");

  const sign=await toolPage("sign");
  await sign.locator("#pageLabel").filter({hasText:"1 / 2"}).waitFor({state:"visible"});
  const rect=await sign.locator("#signPad").boundingBox();
  assert.ok(rect);
  await sign.mouse.move(rect.x+30,rect.y+40);
  await sign.mouse.down();await sign.mouse.move(rect.x+100,rect.y+80,{steps:6});
  await sign.mouse.up();
  await sign.locator("#placeSign").click();
  await sign.locator("#saveSign").click();
  const signed=await download(sign,"#download");
  assert.equal((await PDFDocument.load(signed)).getPageCount(),2);
  console.log("RICH_E2E SIGN_PASS");

  const protect=await toolPage("protect");
  await protect.locator("#protectPassword").fill("AuditPass123");
  await protect.locator("#protectConfirm").fill("AuditPass123");
  await protect.locator("#applyProtect").click();
  const locked=await download(protect,"#download");
  let failedWithoutPassword=false;
  try{await PDFDocument.load(locked);}catch{failedWithoutPassword=true;}
  assert.ok(failedWithoutPassword,"Password must be required to open protected PDF");
  const unlock=await toolPage("protect",locked);
  await unlock.locator('input[name="protectMode"][value="unlock"]').check();
  await unlock.locator("#protectPassword").fill("AuditPass123");
  await unlock.locator("#applyProtect").click();
  const unlocked=await download(unlock,"#download");
  assert.equal((await PDFDocument.load(unlocked)).getPageCount(),2);
  console.log("RICH_E2E PROTECT_UNLOCK_PASS");

  const pngInput=await readFile("tests/fixtures/bengali-mixed.png");
  const ocr=await context.newPage();opened.push(ocr);
  await ocr.goto(base+"/tools/pdf-browser/studio.html?tool=ocr",{waitUntil:"domcontentloaded"});
  await ocr.locator("#file").setInputFiles({name:"bengali.png",mimeType:"image/png",buffer:pngInput});
  await ocr.locator("#applyOcr").click();
  await ocr.locator("#downloadText").waitFor({state:"visible",timeout:90000});
  await ocr.locator("#ocrOutput").fill("বাংলা সংশোধিত পরীক্ষা 123");
  const corrected=await download(ocr,"#downloadText");
  assert.equal(corrected.toString("utf8"),"বাংলা সংশোধিত পরীক্ষা 123");
  console.log("RICH_E2E OCR_CORRECTION_PASS");

  for(const p of opened)await p.close();

  await edit.close();await comp.close();
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("RICH_E2E SUCCESS");
}catch(error){console.error("RICH_E2E FAILURE",error?.stack||error);process.exitCode=1;}
finally{
  // Close browser clients first. Terminate lingering HTTP keep-alive connections so
  // Node does not exit with code 13 from an unresolved top-level await.
  await Promise.allSettled([context.close(),browser.close()]);
  const closed=new Promise(resolve=>server.close(resolve));
  server.closeAllConnections();
  await closed;
}
