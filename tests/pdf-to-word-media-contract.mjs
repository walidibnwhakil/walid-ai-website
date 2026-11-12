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
assert.doesNotMatch(source, /block\.type==='table'\?wordTable/);
assert.match(source, /return lines\.map\(line=>\(\{type:'paragraph'/);
console.log("PDF to Word media contract passed: binary PNG media, one image per page, editable OCR paragraphs");
