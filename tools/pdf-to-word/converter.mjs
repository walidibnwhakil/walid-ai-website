/*
 * Walid AI: browser-only PDF to editable DOCX conversion.
 * Text -> real Word text runs; aligned tabular rows -> Word tables;
 * recoverable image XObjects -> movable/resizable Word images; scanned text -> OCR.
 *
 * No PDF converter can make pixels or arbitrary vector graphics editable as
 * original Word text without reconstruction. Never label a scan "perfect".
 */
export const PDF_WORD_MAX_PAGES = 80;
const EMU_PER_POINT = 12700;
const TWI_PER_POINT = 20;
const xml = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;");
const clamp = (v, min, max) => Math.min(max, Math.max(min,v));
const nativeFontSize = item => Math.max(8,Math.hypot(item.transform?.[0]||0,item.transform?.[1]||0)||item.height||12);
const hasBn = value => /[\u0980-\u09ff]/.test(value||"");
function median(numbers) {const values=[...numbers].sort((a,b)=>a-b);return values.length?values[Math.floor(values.length/2)]:12;}
function fontRun(text,size=12,bold=false) {
  const bn=hasBn(text),font=bn?"Noto Sans Bengali":"Aptos";
  return '<w:r><w:rPr><w:rFonts w:ascii="'+font+'" w:hAnsi="'+font+'" w:eastAsia="Noto Sans Bengali"/><w:sz w:val="'+Math.round(clamp(size,8,42)*2)+'"/>'+(bold?'<w:b/>':'')+(bn?'<w:lang w:eastAsia="bn-BD"/>':'')+'</w:rPr><w:t xml:space="preserve">'+xml(text)+'</w:t></w:r>';
}
function paragraph(block,page) {
  const left=clamp(Math.round((block.x??page.margin)*TWI_PER_POINT),0,1400);
  const indent=Math.max(0,left-page.margin*TWI_PER_POINT);
  const pr='<w:pPr><w:spacing w:after="70" w:line="270" w:lineRule="auto"/>'+(indent?'<w:ind w:left="'+indent+'"/>':'')+(block.heading?'<w:keepNext/>':'')+'</w:pPr>';
  return '<w:p>'+pr+fontRun(block.text||"",block.size||12,!!block.heading)+'</w:p>';
}
function table(block,page) {
  const rows=block.rows||[];const cols=Math.max(1,...rows.map(row=>row.length));
  const usable=clamp(page.width-2*page.margin,160,700);
  const colWidths=Array.from({length:cols},()=>Math.max(450,Math.round(usable*TWI_PER_POINT/cols)));
  const grid=colWidths.map(w=>'<w:gridCol w:w="'+w+'"/>').join('');
  const trs=rows.map(row=>'<w:tr>'+colWidths.map((width,i)=>'<w:tc><w:tcPr><w:tcW w:w="'+width+'" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:after="20"/></w:pPr>'+fontRun(row[i]||"",clamp(block.size||11,9,15))+'</w:p></w:tc>').join('')+'</w:tr>').join('');
  return '<w:tbl><w:tblPr><w:tblW w:w="'+colWidths.reduce((a,b)=>a+b,0)+'" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="3"/><w:insideV w:val="single" w:sz="3"/></w:tblBorders></w:tblPr><w:tblGrid>'+grid+'</w:tblGrid>'+trs+'</w:tbl>';
}
function drawing(block,page,index,rId) {
  const maxW=page.width-2*page.margin;
  const displayW=clamp(block.width||120,12,maxW),displayH=displayW*(block.height||120)/(block.width||120);
  const cx=Math.round(displayW*EMU_PER_POINT),cy=Math.round(Math.min(displayH,page.height-2*page.margin)*EMU_PER_POINT);
  return '<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"><wp:extent cx="'+cx+'" cy="'+cy+'"/><wp:docPr id="'+index+'" name="PDF image '+index+'"/><a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture"><pic:nvPicPr><pic:cNvPr id="'+index+'" name="PDF image '+index+'.png"/><pic:cNvPicPr/></pic:nvPicPr><pic:blipFill><a:blip r:embed="'+rId+'"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill><pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="'+cx+'" cy="'+cy+'"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r></w:p>';
}
function pageSection(width,height,margin=36) {
  return '<w:sectPr><w:pgSz w:w="'+Math.round(width*TWI_PER_POINT)+'" w:h="'+Math.round(height*TWI_PER_POINT)+'"/><w:pgMar w:top="'+Math.round(margin*TWI_PER_POINT)+'" w:right="'+Math.round(margin*TWI_PER_POINT)+'" w:bottom="'+Math.round(margin*TWI_PER_POINT)+'" w:left="'+Math.round(margin*TWI_PER_POINT)+'" w:header="0" w:footer="0" w:gutter="0"/></w:sectPr>';
}

export async function assembleDocx(pages, filename, ZipClass) {
  if(!pages.length) throw Error("No pages to convert.");
  const zip=new ZipClass(),media=[],rels=[],body=[];
  let imageIndex=0;
  for(let pageIndex=0;pageIndex<pages.length;pageIndex++){
    const page=pages[pageIndex];
    if(pageIndex)body.push('<w:p><w:r><w:br w:type="page"/></w:r></w:p>');
    for(const block of page.blocks){
      if(block.type==="table")body.push(table(block,page));
      else if(block.type==="image" && block.bytes?.length) {
        const index=++imageIndex,rId="rId"+(index+1),name="image"+index+".png";
        media.push({name,bytes:block.bytes});
        rels.push('<Relationship Id="'+rId+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/'+name+'"/>');
        body.push(drawing(block,page,index,rId));
      }else if(block.type==="paragraph")body.push(paragraph(block,page));
    }
  }
  body.push(pageSection(pages[pages.length-1].width,pages[pages.length-1].height,pages[pages.length-1].margin));
  const root='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
  const documentXml=root+'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>'+body.join('')+'</w:body></w:document>';
  zip.file('[Content_Types].xml',root+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels',root+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/_rels/document.xml.rels',root+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+rels.join('')+'</Relationships>');
  zip.file('word/document.xml',documentXml);
  for(const item of media)zip.file('word/media/'+item.name,item.bytes);
  return {bytes:await zip.generateAsync({type:'uint8array',compression:'DEFLATE'}),filename,stats:{pages:pages.length,tables:pages.flatMap(p=>p.blocks).filter(b=>b.type==="table").length,images:media.length,paragraphs:pages.flatMap(p=>p.blocks).filter(b=>b.type==="paragraph").length}};
}
function lineClusters(spans) {
  const lines=[];
  const sorted=[...spans].filter(s=>String(s.text||"").trim()).sort((a,b)=>(a.y+a.h*.5)-(b.y+b.h*.5)||a.x-b.x);
  for(const span of sorted){
    const mid=span.y+span.h*.5;
    let line=lines.find(l=>Math.abs(l.center-mid)<=Math.max(3,Math.min(9,span.h*.45)));
    if(!line){line={center:mid,spans:[]};lines.push(line);}
    line.spans.push(span);
    line.center=line.spans.reduce((sum,s)=>sum+s.y+s.h*.5,0)/line.spans.length;
  }
  return lines.map(line=>{
    const ordered=line.spans.sort((a,b)=>a.x-b.x);
    const cellParts=[];
    for(const s of ordered){
      let last=cellParts[cellParts.length-1];
      const gap=last?s.x-last.end:Infinity;
      if(!last||gap>Math.max(18,s.h*1.55)){
        last={x:s.x,end:s.x+s.w,text:s.text};cellParts.push(last);
      }else{
        last.text+=(gap>Math.max(2,s.h*.22)?" ":"")+s.text;
        last.end=Math.max(last.end,s.x+s.w);
      }
    }
    return {y:Math.min(...ordered.map(x=>x.y)),x:Math.min(...ordered.map(x=>x.x)),h:Math.max(...ordered.map(x=>x.h)),size:median(ordered.map(x=>x.size)),cells:cellParts,text:cellParts.map(c=>c.text).join('    ').trim()};
  }).sort((a,b)=>a.y-b.y||a.x-b.x);
}
function columnsMatch(left,right) {
  if(left.cells.length<2 || right.cells.length!==left.cells.length)return false;
  return left.cells.every((c,i)=>Math.abs(c.x-right.cells[i].x)<=Math.max(12,left.h*1.15))
    && Math.abs(right.y-left.y)<Math.max(50,left.h*4.5);
}
export function recognizeStructure(spans,images=[],pageWidth=595,pageHeight=842) {
  const lines=lineClusters(spans),fontMedian=median(lines.map(l=>l.size));
  const blocks=[];
  let i=0;
  while(i<lines.length){
    let j=i+1;
    while(j<lines.length&&columnsMatch(lines[j-1],lines[j]))j++;
    if(j-i>=2){
      const rows=lines.slice(i,j).map(l=>l.cells.map(c=>c.text.trim()));
      blocks.push({type:"table",rows,y:lines[i].y,x:lines[i].x,size:fontMedian});
      i=j;continue;
    }
    const line=lines[i];
    blocks.push({type:"paragraph",text:line.text.replace(/\s{3,}/g," "),x:line.x,y:line.y,size:line.size,heading:line.size>fontMedian*1.3&&line.text.length<90});
    i++;
  }
  for(const image of images)if(image?.bytes?.length)blocks.push({type:"image",...image});
  blocks.sort((a,b)=>a.y-b.y||a.x-b.x);
  return blocks;
}
function fromTextContent(content,height){
  return content.items.filter(item=>typeof item.str==="string"&&item.str.trim()).map(item=>{
    const size=nativeFontSize(item),w=Math.max(item.width||0,size*.35),h=Math.max(item.height||size,size*.75);
    return {text:item.str,x:item.transform[4],y:height-item.transform[5]-h,w,h,size};
  });
}
function matMult([a,b,c,d,e,f],[g,h,i,j,k,l]){return [a*g+c*h,b*g+d*h,a*i+c*j,b*i+d*j,a*k+c*l+e,b*k+d*l+f];}
function imageRect(ctm,height){
  const [a,b,c,d,e,f]=ctm;
  const xs=[e,e+a,e+c,e+a+c],ys=[f,f+b,f+d,f+b+d];
  const left=Math.min(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
  return {x:left,y:height-top,width:Math.max(...xs)-left,height:top-bottom};
}
async function imageToPng(info){
  const width=info.width|0,height=info.height|0;
  if(width<4||height<4||width*height>16_000_000)return null;
  const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext("2d");const pixels=ctx.createImageData(width,height);
  if(info.bitmap){ctx.drawImage(info.bitmap,0,0);return new Uint8Array(await (await new Promise(resolve=>canvas.toBlob(resolve,"image/png"))).arrayBuffer());}
  const input=info.data;
  if(!input)return null;
  const size=width*height;
  if(info.kind===3 || input.length>=size*4) pixels.data.set(input.subarray(0,size*4));
  else if(info.kind===2 || input.length>=size*3) {
    for(let i=0;i<size;i++){pixels.data[i*4]=input[i*3];pixels.data[i*4+1]=input[i*3+1];pixels.data[i*4+2]=input[i*3+2];pixels.data[i*4+3]=255;}
  }else if(input.length>=size) {
    for(let i=0;i<size;i++){const g=input[i];pixels.data.set([g,g,g,255],i*4);}
  }else return null;
  ctx.putImageData(pixels,0,0);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));
  return blob?new Uint8Array(await blob.arrayBuffer()):null;
}
async function resolveObject(page,id) {
  const store=String(id).startsWith("g_")?page.commonObjs:page.objs;
  return new Promise(resolve=>{
    try{
      let settled=false;
      const timer=setTimeout(()=>{if(!settled){settled=true;resolve(null);}},1800);
      const got=store.get(id,value=>{if(!settled){settled=true;clearTimeout(timer);resolve(value||null);}});
      if(got && !settled){settled=true;clearTimeout(timer);resolve(got);}
    }catch{resolve(null);}
  });
}
async function extractImages(page,pdfjs,height) {
  const list=await page.getOperatorList(),out=[],stack=[];let ctm=[1,0,0,1,0,0];
  const cached=new Map();
  for(let i=0;i<list.fnArray.length;i++){
    const fn=list.fnArray[i],args=list.argsArray[i]||[];
    if(fn===pdfjs.OPS.save){stack.push(ctm.slice());continue;}
    if(fn===pdfjs.OPS.restore){ctm=stack.pop()||[1,0,0,1,0,0];continue;}
    if(fn===pdfjs.OPS.transform){ctm=matMult(ctm,args);continue;}
    if(fn!==pdfjs.OPS.paintImageXObject && fn!==pdfjs.OPS.paintJpegXObject && fn!==pdfjs.OPS.paintInlineImageXObject)continue;
    const name=args[0],raw=fn===pdfjs.OPS.paintInlineImageXObject?name:await resolveObject(page,name);
    if(!raw)continue;
    const rect=imageRect(ctm,height);
    if(rect.width<25||rect.height<25||rect.width*rect.height<1800)continue;
    let png=cached.get(name);
    if(!png){png=await imageToPng(raw);if(png)cached.set(name,png);}
    if(png)out.push({bytes:png,x:rect.x,y:rect.y,width:rect.width,height:rect.height});
    if(out.length>=28)break;
  }
  return out;
}
async function ocrPage(page,createWorkerHolder,onProgress,index,total) {
  if(!createWorkerHolder.worker){
    const {createWorker}=await import("https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/+esm");
    createWorkerHolder.worker=await createWorker("ben+eng",1,{logger:info=>onProgress?.(info)});
  }
  const viewport=page.getViewport({scale:Math.min(2.4,1800/Math.max(page.view[2]-page.view[0],page.view[3]-page.view[1]))});
  const canvas=document.createElement("canvas");
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  const ctx=canvas.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
  await page.render({canvasContext:ctx,viewport}).promise;
  const res=await createWorkerHolder.worker.recognize(canvas);
  const scale=viewport.scale;
  let spans=(res.data.words||[]).filter(w=>w.text?.trim()).map(w=>({text:w.text.trim(),x:w.bbox.x0/scale,y:w.bbox.y0/scale,w:(w.bbox.x1-w.bbox.x0)/scale,h:(w.bbox.y1-w.bbox.y0)/scale,size:Math.max(10,(w.bbox.y1-w.bbox.y0)/scale)}));
  if(!spans.length && res.data.text?.trim())spans=[{text:res.data.text.trim(),x:36,y:36,w:300,h:20,size:12}];
  onProgress?.({status:"OCR",page:index,pages:total});
  return spans;
}
export async function convertPdfToDocx(file,onProgress) {
  const pdfjs=await import("https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";
  const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  if(pdf.numPages>PDF_WORD_MAX_PAGES)throw Error("For browser conversion, split this PDF into groups of at most "+PDF_WORD_MAX_PAGES+" pages.");
  const pages=[],holder={worker:null};
  try{
    for(let n=1;n<=pdf.numPages;n++){
      onProgress?.({status:"Extracting page",page:n,pages:pdf.numPages});
      const page=await pdf.getPage(n),v=page.getViewport({scale:1});
      const content=await page.getTextContent();
      let spans=fromTextContent(content,v.height);
      const scan=spans.map(s=>s.text).join("").replace(/\s/g,"").length<8;
      if(scan)spans=await ocrPage(page,holder,onProgress,n,pdf.numPages);
      let images=[];
      try{images=await extractImages(page,pdfjs,v.height);}catch(error){console.warn("Image extraction skipped",n,error);}
      // Full-page scan is a photographic substrate, not an independently editable illustration.
      if(scan)images=images.filter(im=>im.width*im.height<v.width*v.height*.45);
      const blocks=recognizeStructure(spans,images,v.width,v.height);
      if(!blocks.length)blocks.push({type:"paragraph",text:"[This page has no recoverable text or images]",x:36,y:36,size:12});
      pages.push({width:v.width,height:v.height,margin:36,blocks});
    }
  }finally{await holder.worker?.terminate();await pdf.destroy();}
  const JSZip=(await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm")).default;
  return assembleDocx(pages,file.name.replace(/\.pdf$/i,"")+".docx",JSZip);
}
