import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PDFDocument} from "pdf-lib";
import {parsePdfPageRanges,processLocalPdf} from "../tools/pdf-browser/local-merge-split.mjs";

const loader=async()=>({PDFDocument});
const mockFile=(name,bytes)=>({
  name,
  size:bytes.byteLength,
  arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)
});
async function fixture(widths) {
  const doc=await PDFDocument.create();
  for(const w of widths)doc.addPage([w,600]);
  return mockFile("sample.pdf",await doc.save());
}
const a=await fixture([320,321]),b=await fixture([420,421,422]);
const merge=await processLocalPdf("merge-pdf",[a,b],"",loader);
assert.equal(merge.type,"application/pdf");
assert.equal(merge.pages,5);
assert.equal(merge.name,"merged.pdf");
const parsed=await PDFDocument.load(merge.bytes);
assert.deepEqual(parsed.getPages().map(p=>p.getWidth()),[320,321,420,421,422]);
const split=await processLocalPdf("split-pdf",[b],"3,1-2,3",loader);
assert.equal(split.pages,3);
assert.deepEqual((await PDFDocument.load(split.bytes)).getPages().map(p=>p.getWidth()),[422,420,421]);
assert.deepEqual(parsePdfPageRanges("1-2,3",3),[0,1,2]);

for(const pages of ["","0","4","1--2","1,invalid","3-1","1,2,4"]) {
  await assert.rejects(()=>processLocalPdf("split-pdf",[b],pages,loader),
    Error,"Bad page range "+pages+" must fail");
}
const corrupt=mockFile("broken.pdf",new TextEncoder().encode("this is not a PDF"));
await assert.rejects(()=>processLocalPdf("merge-pdf",[a,corrupt],"",loader),/not a valid PDF/);
await assert.rejects(()=>processLocalPdf("split-pdf",[corrupt],"1",loader),/not a valid PDF/);
await assert.rejects(()=>processLocalPdf("merge-pdf",[a],"",loader),/at least two/);
await assert.rejects(()=>processLocalPdf("split-pdf",[a,b],"1",loader),/one PDF/);
await assert.rejects(()=>processLocalPdf("split-pdf",[], "1", loader),/Choose a PDF/);
const tooLarge={name:"too-large.pdf",size:21*1024*1024,arrayBuffer:async()=>{throw Error("Should not read oversize file")}};
await assert.rejects(()=>processLocalPdf("split-pdf",[tooLarge],"1",loader),/under 20 MB/);
const workspace=await readFile(new URL("../tool-workspace/index.html",import.meta.url),"utf8");
assert.match(workspace,/import\('\/tools\/pdf-browser\/local-merge-split\.mjs'\)/);
assert.match(workspace,/pdfLink\.hidden=true;pdfLink\.removeAttribute\('href'\)/);
console.log("PDF_LOCAL_MERGE_SPLIT_PASS",JSON.stringify({mergePages:5,splitPages:3,verifiedFailures:12}));
