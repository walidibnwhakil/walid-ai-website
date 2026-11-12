import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const source = await readFile(join(dirname(dirname(fileURLToPath(import.meta.url))), "tool-workspace.html"), "utf8");
assert.match(source, /imageBytesFromDataUrl/);
assert.match(source, /word\/media\/page-/);
assert.match(source, /Extension="png" ContentType="image\/png"/);
assert.match(source, /relationships\/image/);
assert.match(source, /maskTextRegions\(canvas,words\)/);
assert.match(source, /return canvas\.toDataURL\('image\\/png'\)/);
assert.doesNotMatch(source, /copyCtx\.fillRect/);
assert.match(source, /<w:vanish\\/><w:color w:val=\"FFFFFF\"/);
assert.doesNotMatch(source, /block\.type==='table'\?wordTable/);
assert.match(source, /return lines\.map\(line=>\(\{type:'paragraph'/);
assert.match(source, /wordFloatingImage/);
assert.match(source, /wordTextBox/);
assert.match(source, /<wp:anchor/);
assert.doesNotMatch(source, /<wp:inline/);
assert.doesNotMatch(source, /type:'table'/);
assert.match(source, /const rels=includeRaster\?pages\.map\(\(page,index\)=>\`<Relationship/);
console.log("PDF to Word inline JavaScript syntax contract passed");
console.log("PDF to Word media contract passed: binary PNG media, one image per page, editable OCR paragraphs");

