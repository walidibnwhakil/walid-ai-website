const assert=require('node:assert/strict');
const fs=require('node:fs');
const original=fs.readFileSync('admin-staff.html','utf8');
const portal=fs.readFileSync('admin/index.html','utf8');
assert(!fs.existsSync('admin.html'),'The old /admin.html must not exist');
const ops=fs.readFileSync('admin-ops.js','utf8');

// Never substitute the hand-crafted robot workstations with generic cards.
assert.match(original,/Five desks\. One protected network\./);
assert.match(original,/function robot\(color\)/);
assert.match(original,/grid-template-rows:repeat\(3,minmax\(244px,auto\)\)/);
assert.match(original,/min-height:732px/);
assert.match(original,/\.manager\{grid-column:3\/5;grid-row:1\}/);
assert.match(original,/\.it\{grid-column:2\/4;grid-row:2\}/);
assert.match(original,/\.cyber\{grid-column:4\/6;grid-row:2\}/);
assert.match(original,/\.cse\{grid-column:1\/3;grid-row:3\}/);
assert.match(original,/\.admin\{grid-column:5\/7;grid-row:3\}/);
for(const role of ['Manager','IT Technician','Cyber Security Engineer','CSE Engineer','Admin Staff'])
  assert(original.includes(role),role);
assert.match(original,/\.desk-grid\{height:auto;min-height:0/);
assert.match(original,/id="selectedName"/);
assert.match(original,/id="history"/);
assert.match(portal,/id="preserved-staff-office"/);
assert.match(portal,/data-src="\/admin-staff\.html"/);
assert.match(ops,/originalOffice\.contentDocument/);
console.log('Original five-desk SVG office preserved in unified portal.');
