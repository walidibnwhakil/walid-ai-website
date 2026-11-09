const test = require('node:test');
const assert = require('node:assert/strict');
const ui = require('../chat-ui.js');
test('citation URLs with balanced parentheses survive and footers are collapsed', () => {
  const url = 'https://en.wikipedia.org/wiki/Minister_of_Home_Affairs_(Bangladesh)';
  const result = ui.splitAnswer(`A name ([Wikipedia](${url})).\n\nSources:\n- [News](https://example.com/news)`, [{title:'Office',url}]);
  assert.equal(result.body, `A name ([Wikipedia](${url})).`);
  assert.equal(result.sources.length, 2);
  assert.equal(result.sources[0].url, url);
  assert.equal(ui.markdownLinks(result.body)[0].url, url);
  assert.equal(ui.normalizeSources([{url:'javascript:alert(1)'}]).length, 0);
});
test('regenerate replaces the selected answer without repeating its question or later turns', () => {
  const messages = [{kind:'user',text:'one'}, {kind:'ai',text:'first'}, {kind:'user',text:'two'}, {kind:'ai',text:'second'}];
  const turn = ui.prepareTurn(messages, {kind:'regenerate',index:1}, '');
  assert.equal(turn.answerIndex, 1);
  assert.equal(turn.question, 'one');
  assert.deepEqual(turn.history, []);
  turn.messages[turn.answerIndex] = {kind:'ai',text:'replacement'};
  assert.equal(turn.messages.length, 4);
  assert.equal(turn.messages[2].text, 'two');
  assert.equal(messages[1].text, 'first');
});
test('editing creates a revised branch at the same question position', () => {
  const messages = [{kind:'user',text:'one'}, {kind:'ai',text:'first'}, {kind:'user',text:'two'}, {kind:'ai',text:'second'}];
  const turn = ui.prepareTurn(messages, {kind:'edit',index:2}, 'revised');
  assert.equal(turn.messages.length, 3);
  assert.equal(turn.messages[2].text, 'revised');
  assert.equal(turn.answerIndex, 3);
  assert.deepEqual(turn.history, messages.slice(0,2));
  assert.equal(messages[2].text, 'two');
});
