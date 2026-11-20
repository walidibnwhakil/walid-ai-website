import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {chromium} from 'playwright';
import {PDFDocument, rgb} from 'pdf-lib';
import JSZip from 'jszip';

const BASE='https://walid-ai.com';
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({acceptDownloads:true,viewport:{width:1366,height:900},locale:'en-US'});
context.setDefaultTimeout(22000);
context.setDefaultNavigationTimeout(35000);
const results=[];
const issues=[];
const capture=page=>page.on('pageerror',e=>issues.push(page.url()+' '+String(e).slice(0,200)));
async function test(name,fn){
  const start=Date.now();
  try { const details=await fn(); console.log('AUDIT_PASS',name,JSON.stringify(details||{}),'ms='+ (Date.now()-start));results.push({name,status:'PASS',details:details||{},ms:Date.now()-start}); }
  catch(e){console.error('AUDIT_FAIL',name,String(e?.stack||e).slice(0,1800));results.push({name,status:'FAIL',reason:String(e?.message||e),ms:Date.now()-start});}
}
function fileArg(name,bytes,type='application/pdf'){return {name,mimeType:type,buffer:Buffer.from(bytes)};}
async function makePdf(prefix,count){
  const d=await PDFDocument.create();
  for(let i=1;i<=count;i++){
    const p=d.addPage([595,842]);
    p.drawText(prefix+' PAGE '+i,{x:72,y:750,size:26,color:rgb(0.05,0.12,0.22)});
    p.drawText('Walid AI end-to-end fixture - sample text '+i,{x:72,y:700,size:14});
    p.drawRectangle({x:72,y:560,width:390,height:70,color:rgb(0.87,0.92,0.99)});
  }
  return Buffer.from(await d.save());
}
async function checkPdf(bytes,n){
  assert.ok(Buffer.from(bytes).subarray(0,5).toString()==='%PDF-','Expected PDF signature');
  const pdf=await PDFDocument.load(bytes);
  if(n!=null)assert.equal(pdf.getPageCount(),n,'Downloaded page count mismatch');
  return {pages:pdf.getPageCount(),bytes:bytes.length};
}
async function pageFor(slug,selector){
  const p=await context.newPage();capture(p);
  const response=await p.goto(BASE+'/tools/'+slug+'/',{waitUntil:'domcontentloaded',timeout:35000});
  assert.ok(response && response.status()<400,'Tool page returned '+response?.status());
  assert.ok(!p.url().includes('/404'),'Unexpected 404 page');
  const f=p.frameLocator('iframe.tool-frame');
  await f.locator(selector).waitFor({state:'attached',timeout:35000});
  return {p,f};
}
async function studio(slug){
  const f=await pageFor(slug,'#file');
  const acc=slug==='image-to-pdf'?'image/png':slug==='bengali-ocr'?'image/png':'application/pdf';
  await f.f.locator('#file[accept*="'+acc+'"]').waitFor({state:'attached',timeout:40000});
  return f;
}
async function uploadStudio(f,bytes,name,mime='application/pdf'){
  await f.locator('#file').setInputFiles(fileArg(name,bytes,mime));
  await f.locator('#work').waitFor({state:'visible',timeout:40000});
}
async function saveDownload(p,f,link='#download',timeout=50000){
  await f.locator(link).waitFor({state:'visible',timeout});
  const promise=p.waitForEvent('download',{timeout:18000});
  await f.locator(link).click();
  const dl=await promise;
  const path=await dl.path();
  assert.ok(path,'No downloaded file');
  return {name:dl.suggestedFilename(),bytes:await readFile(path)};
}
async function workspacePdf(slug,inputs,opts={}){
  const {p,f}=await pageFor(slug,'#pdfFiles');
  try{
    await f.locator('#pdfFiles').setInputFiles(inputs);
    if(opts.pages)await f.locator('#pages').fill(opts.pages);
    await f.locator('#runPdf').click();
    const out=await saveDownload(p,f,'#pdfDownload',opts.timeout||100000);
    return out;
  }finally{await p.close();}
}

const inputA=await makePdf('ALPHA',3);
const inputB=await makePdf('BETA',2);
const imagePage=await context.newPage();
await imagePage.setContent('<html><body style="margin:0;padding:16px;background:#fff;font:32px Arial">IMAGE TEST 123</body></html>');
const png=await imagePage.screenshot({type:'png'});
await imagePage.close();

await test('PDF index / all 11 cards',async()=>{
  const p=await context.newPage();capture(p);
  try{const r=await p.goto(BASE+'/pdf/',{waitUntil:'domcontentloaded',timeout:35000});assert.equal(r.status(),200);
    const cards=await p.locator('a.tool[data-kind="pdf"]').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('.name')?.textContent,href:n.getAttribute('href')})));
    assert.equal(cards.length,11,'PDF index card count');
    for(const item of cards) assert.ok(item.href?.startsWith('/tools/'),'Invalid PDF tool URL '+item.href);
    return {count:cards.length,links:cards};
  }finally{await p.close();}
});
await test('Merge PDF / actual backend / 3+2 pages',async()=>{
  const out=await workspacePdf('merge-pdf',[fileArg('alpha.pdf',inputA),fileArg('beta.pdf',inputB)],{timeout:120000});
  return {filename:out.name,...await checkPdf(out.bytes,5)};
});
await test('Split PDF / pages 2,3',async()=>{
  const out=await workspacePdf('split-pdf',[fileArg('alpha.pdf',inputA)],{pages:'2-3',timeout:120000});
  return {filename:out.name,...await checkPdf(out.bytes,2)};
});
await test('PDF to Word / editable DOCX / selectable PDF',async()=>{
  const out=await workspacePdf('pdf-to-word',[fileArg('alpha.pdf',inputA)],{timeout:120000});
  assert.match(out.name,/\.docx$/i);
  const zip=await JSZip.loadAsync(out.bytes);
  const xml=await zip.file('word/document.xml')?.async('string');
  assert.ok(xml,'DOCX missing Word document XML');
  assert.match(xml,/ALPHA/,'Source text not found in DOCX');
  assert.match(xml,/<w:t\b/,'DOCX lacks editable text runs');
  assert.doesNotMatch(xml,/<w:drawing|<w:pict/,'Converted document is an image instead of editable text');
  return {filename:out.name,bytes:out.bytes.length,sourceTextPresent:true,editable:true};
});
await test('Compress PDF / valid output and original page count',async()=>{
  const {p,f}=await studio('compress-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelCompress').waitFor({state:'visible'});
    await f.locator('#compressQuality').selectOption('small');await f.locator('#applyCompress').click();
    const out=await saveDownload(p,f);
    return {filename:out.name,originalBytes:inputA.length,...await checkPdf(out.bytes,3),actuallySmaller:out.bytes.length<inputA.length};
  }finally{await p.close();}
});
await test('Edit PDF / rotate, delete page, export',async()=>{
  const {p,f}=await studio('edit-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelEdit').waitFor({state:'visible'});
    await f.locator('#rotateRight').click();
    await f.locator('#pageNext').click();
    await f.locator('#deletePage').click();
    await f.locator('#saveEdit').click();
    const out=await saveDownload(p,f);const v=await checkPdf(out.bytes,2);const d=await PDFDocument.load(out.bytes);
    assert.equal(d.getPage(0).getRotation().angle,90);
    return {filename:out.name,...v,rotation:d.getPage(0).getRotation().angle};
  }finally{await p.close();}
});
await test('Organize PDF / rotate and delete',async()=>{
  const {p,f}=await studio('organize-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelOrganize').waitFor({state:'visible'});
    await f.locator('#organizeGrid .page-card').first().waitFor({state:'visible',timeout:25000});
    await f.locator('#organizeGrid .page-card').first().getByRole('button',{name:'Right'}).click();
    await f.locator('#organizeGrid .page-card').last().getByRole('button',{name:'Delete'}).click();
    await f.locator('#saveOrganize').click();
    const out=await saveDownload(p,f);const v=await checkPdf(out.bytes,2);const d=await PDFDocument.load(out.bytes);
    assert.equal(d.getPage(0).getRotation().angle,90);
    return {filename:out.name,...v,rotation:d.getPage(0).getRotation().angle};
  }finally{await p.close();}
});
await test('Page Numbers / Bengali numbers ৭–৯ / exported PDF',async()=>{
  const {p,f}=await studio('page-numbers');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelNumbers').waitFor({state:'visible'});
    await f.locator('#numberStart').fill('7');await f.locator('#numberBengali').check();
    await f.locator('#applyNumbers').click();
    const out=await saveDownload(p,f);
    assert.notEqual(out.bytes.length,inputA.length);
    return {filename:out.name,...await checkPdf(out.bytes,3),differentFromInput:true};
  }finally{await p.close();}
});
await test('Watermark PDF / text stamp / exported PDF',async()=>{
  const {p,f}=await studio('watermark-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelWatermark').waitFor({state:'visible'});
    await f.locator('#watermarkText').fill('WALID TEST WATERMARK');await f.locator('#watermarkTile').check();
    await f.locator('#applyWatermark').click();
    const out=await saveDownload(p,f);
    assert.notEqual(out.bytes.length,inputA.length);
    return {filename:out.name,...await checkPdf(out.bytes,3),differentFromInput:true};
  }finally{await p.close();}
});
await test('Sign PDF / drawn signature / output',async()=>{
  const {p,f}=await studio('sign-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelSign').waitFor({state:'visible'});
    const rect=await f.locator('#signPad').boundingBox();
    assert.ok(rect,'Signature canvas not visible');
    await p.mouse.move(rect.x+40,rect.y+60);await p.mouse.down();await p.mouse.move(rect.x+115,rect.y+110,{steps:8});await p.mouse.move(rect.x+200,rect.y+55,{steps:8});await p.mouse.up();
    await f.locator('#placeSign').click();await f.locator('#saveSign').click();
    const out=await saveDownload(p,f);return {filename:out.name,...await checkPdf(out.bytes,3)};
  }finally{await p.close();}
});
await test('Protect PDF / password encryption',async()=>{
  const {p,f}=await studio('protect-pdf');
  try{
    await uploadStudio(f,inputA,'alpha.pdf');await f.locator('#panelProtect').waitFor({state:'visible'});
    await f.locator('#protectPassword').fill('AuditPass123');
    await f.locator('#protectConfirm').fill('AuditPass123');
    await f.locator('#applyProtect').click();
    const out=await saveDownload(p,f);
    assert.equal(out.bytes.subarray(0,5).toString(),'%PDF-');
    let blocked=false;try{await PDFDocument.load(out.bytes);}catch(e){blocked=true;}
    assert.ok(blocked,'Output PDF was readable without a password; protection not verified');
    return {filename:out.name,bytes:out.bytes.length,passwordRequired:true};
  }finally{await p.close();}
});
await test('Bangla and English OCR / real image recognition and text download',async()=>{
  const img=await readFile('tests/fixtures/bengali-mixed.png');
  const {p,f}=await studio('bengali-ocr');
  try{
    await uploadStudio(f,img,'bengali-mixed.png','image/png');await f.locator('#panelOcr').waitFor({state:'visible'});
    await f.locator('#applyOcr').click();
    await f.locator('#downloadText').waitFor({state:'visible',timeout:120000});
    const recognized=await f.locator('#ocrOutput').inputValue();
    assert.ok(recognized.length>=5,'OCR produced empty/unreadable output');
    const d=await saveDownload(p,f,'#downloadText',18000);
    assert.match(d.bytes.toString('utf8'),/[\u0980-\u09ff]/,'OCR failed to recover any Bengali script');
    return {filename:d.name,recognized:recognized.slice(0,200),bytes:d.bytes.length};
  }finally{await p.close();}
});
await test('Image to PDF / PNG to PDF / one page',async()=>{
  const {p,f}=await studio('image-to-pdf');
  try{
    await uploadStudio(f,png,'fixture.png','image/png');await f.locator('#panelImage').waitFor({state:'visible'});
    await f.locator('#imagePageSize').selectOption('a4');await f.locator('#applyImages').click();
    const out=await saveDownload(p,f);
    return {filename:out.name,...await checkPdf(out.bytes,1)};
  }finally{await p.close();}
});
await test('Mobile page / PDF index + PDF to Word UI load',async()=>{
  const p=await context.newPage({viewport:{width:390,height:844}});
  try{
    const resp=await p.goto(BASE+'/pdf/',{waitUntil:'domcontentloaded',timeout:35000});assert.equal(resp.status(),200);
    assert.equal(await p.locator('a.tool').count(),11);
    await p.goto(BASE+'/tools/pdf-to-word/',{waitUntil:'domcontentloaded',timeout:35000});
    await p.frameLocator('iframe.tool-frame').locator('#pdfFiles').waitFor({state:'attached',timeout:35000});
    return {viewport:'390x844',toolIframeAvailable:true};
  }finally{await p.close();}
});

console.log('===== WALID AI LIVE PDF E2E SUMMARY =====');
for(const r of results)console.log(JSON.stringify(r));
console.log('PASS',results.filter(r=>r.status==='PASS').length,'FAIL',results.filter(r=>r.status==='FAIL').length,'PAGE_ERRORS',issues.slice(0,15));
await browser.close();
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
