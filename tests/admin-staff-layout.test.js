const assert=require('node:assert/strict');
const fs=require('node:fs');
const original=fs.readFileSync('admin-staff.html','utf8');
const portal=fs.readFileSync('admin/index.html','utf8');
assert(!fs.existsSync('admin.html'),'The old /admin.html must not exist');
const ops=fs.readFileSync('admin-ops.js','utf8');

// Never substitute the hand-crafted robot workstations with generic cards.
assert.match(original,/<div class="intro"><h1>AI Staff Office<\/h1><\/div>/);
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
assert(!original.includes('id="selectedName"'),'Redundant workstation panel removed');
assert(!original.includes('id="history"'),'Redundant technical history panel removed');
assert(!original.includes('Run read-only checks'),'Unnecessary action above original robots removed');
assert.match(original,/function showGreeting\(role\)/);
assert.match(original,/Assalamu Alaykum, Sir/);
assert.match(original,/\.greeting-bubble/);
assert.match(original,/\.desk \.desk-name,\.desk \.desk-role\{text-align:center\}/,
  'Both staff title and subtitle must be centered without moving robot desks');
assert(!original.includes('Five desks. One protected network.'),'Verbose office slogan removed');
assert.match(portal,/id="preserved-staff-office"/);
assert.match(portal,/data-src="\/admin-staff\.html"/);
assert.match(ops,/originalOffice\.contentDocument/);
assert.match(original,/body\.in-portal \.topbar,body\.in-portal \.legal-footer\{display:none!important\}/,
  'Embedded office must not duplicate the parent Admin footer');
assert.match(original,/html\.embedded-office,html\.embedded-office body/,
  'Embedded office must not size itself to the viewport');
assert.match(portal,/scrolling="no"/,'The iframe must not create nested scrolling');
assert.match(ops,/content\?\.getBoundingClientRect\(\)\.height/,
  'Office frame height must be based on actual content, not its own viewport scrollHeight');
assert(!ops.includes('doc.documentElement.scrollHeight'),
  'Old viewport feedback loop must never return');


// The only added access point is an icon-only bot in the original Admin sidebar.
assert.match(portal,/id="manager-chat-head"/);
assert.match(portal,/aria-label="Open Manager chat"/);
assert.match(portal,/<svg viewBox="0 0 32 32"/);
assert(!portal.includes('id="manager-chat-open"'),'No new action beside the Manager robot or Office');
assert(!portal.includes('id="manager-chat-shortcut"'),'No extra text row in the existing sidebar menu');
assert(!portal.includes('manager-office-actions'),'No layout-changing toolbar above the original five robots');
assert.match(ops,/if\(match==='manager'\)openManagerChat\(\)/);
assert.match(ops,/#manager-chat-head/);
assert(!portal.includes('id="ops-checks"'),'Remove duplicate Run real checks panel below Office');
assert(!portal.includes('id="ops-reload"'),'Remove duplicate Refresh history panel below Office');
assert(!portal.includes('id="ops-connect"'),'Remove technical backend status under Office');
assert(!portal.includes('id="ops-capability"'),'Remove technical capability/status under Office');
assert(!ops.includes('createRoleCards'),'No hidden duplicate workstation controls');

assert.match(portal,/<\/aside>\s*<button type="button" id="manager-chat-head"/,
  'The standalone bot head must not be a child of the sidebar');
assert.match(portal,/class="ops-history manager-chat-transcript"/,
  'Manager conversation is an open transcript, not a form inside nested panels');
assert.match(portal,/class="manager-chat-compose"/,
  'Manager input is anchored at the bottom like a messenger');
assert(!portal.includes('Your instruction to Manager'),
  'No separate boxed question form remains in the overlay');

assert.match(portal,/id="manager-staff-chats"/,
  'Staff conversations must be opened from a separate chat navigation control');
assert.match(portal,/id="manager-staff-list"/);
assert.match(portal,/id="manager-staff-thread"/);
assert.match(portal,/id="manager-thread-back"/);
assert(!ops.includes("function appendDelegations("),
  'No staff delegation details may expand directly inside Manager messages');
assert.match(ops,/function renderStaffThread\(roleId\)/);
assert.match(ops,/function staffMessages\(roleId\)/);
assert.match(ops,/\.manager-chat-compose'\)\.hidden=view!=='manager'/,
  'Staff conversations must remain read-only; only Manager accepts messages');
console.log('Original five-desk SVG office preserved in unified portal.');
