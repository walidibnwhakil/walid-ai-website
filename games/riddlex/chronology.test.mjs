import assert from 'node:assert/strict';
import test from 'node:test';
import {nextQuestion, scoreCandidates} from './engine-v2.js';

const entries = [
  {id:'a', facts:{real:true, fictional:false, actor:true, v2_occupation_q33999:true, male:true, female:false, born_before_1980:true}},
  {id:'b', facts:{real:false, fictional:true, actor:false, v2_occupation_q33999:false, male:false, female:true, born_before_1980:false}},
];
const ask = (answers, questions) => nextQuestion(scoreCandidates(entries, answers), answers, questions);

test('historical birth data remains readable but cannot generate a question', () => {
  const bank = {born_before_1980:'Born before 1980?', birth_first_half:'Born in the first half of the century?', cue_wd_x:'An exact date clue?'};
  assert.equal(ask([], bank), null);
  assert.equal(ask([{key:'born_before_1970', value:'yes'}], bank), null);
});

test('skips inverse existence questions and occupations with equivalent wording', () => {
  assert.equal(ask([{key:'real', value:'unknown'}], {fictional:'Fictional?'}), null);
  assert.equal(ask([{key:'actor', value:'yes'}], {v2_occupation_q33999:'Worked as an actor?'}), null);
});

test('a definite answer suppresses implied follow-ups, while unknown adds no evidence', () => {
  assert.equal(ask([{key:'male', value:'yes'}], {female:'Female?'}), null);
  const answers = [{key:'male', value:'unknown'}];
  assert.deepEqual(scoreCandidates(entries, answers), scoreCandidates(entries, []));
  assert.equal(ask(answers, {female:'Female?'}), 'female');
});
