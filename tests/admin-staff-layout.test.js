const assert=require('node:assert/strict');
const fs=require('node:fs');

const html=fs.readFileSync('admin.html','utf8');
const js=fs.readFileSync('admin-ops.js','utf8');
assert.match(html,/\.ops-desk-grid\{display:grid/);
assert.match(html,/@media\(max-width:800px\)/);
assert.match(html,/@media\(max-width:540px\)/);
assert.match(html,/ops-history/);
assert.match(html,/riddlex-pending/);
for(const role of ['Manager','IT Technician','Cyber Security Engineer','CSE Engineer','Admin Staff'])
  assert(js.includes(role),role);
assert.match(js,/aria-pressed/);
assert.match(js,/task\.result/);
console.log('Unified staff portal has responsive desks, conversations and approvals.');
