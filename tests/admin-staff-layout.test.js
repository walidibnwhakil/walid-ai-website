const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync('admin-staff.html', 'utf8');

assert.match(html, /grid-template-rows:repeat\(3,minmax\(244px,auto\)\)/);
assert.match(html, /min-height:732px/);
assert.match(html, /padding:12px 12px 20px/);
assert.match(html, /\.desk-grid\{height:auto;min-height:0/);
assert.match(html, /\.desk-meta\{[^}]*min-height:2\.2em/);

console.log('Virtual AI Office cards reserve space for robot artwork and all text.');
