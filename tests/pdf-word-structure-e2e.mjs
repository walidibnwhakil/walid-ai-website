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
  const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const parsed=await pdfjs.getDocument({data:Uint8Array.from(compressed)}).promise;
  const extracted=(await (await parsed.getPage(1)).getTextContent()).items.map(i=>i.str).join(" ");
  assert.match(extracted,/SEARCHABLE CONTENT/,"Compression must preserve selectable text");
  await parsed.destroy();
  console.log("RICH_E2E COMPRESS_PASS",JSON.stringify({original:small.length,output:compressed.length,textSelectable:true}));
  await edit.close();await comp.close();
  assert.equal(errors.length,0,errors.join("\n"));
  console.log("RICH_E2E SUCCESS");
}catch(error){console.error("RICH_E2E FAILURE",error?.stack||error);process.exitCode=1;}
finally{await Promise.allSettled([context.close(),browser.close(),new Promise(resolve=>server.close(resolve))]);}
