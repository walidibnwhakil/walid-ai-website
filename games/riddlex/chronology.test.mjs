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

test('asks one gender question without inferring another gender', () => {
  const openWorld = [
    ...entries,
    {id:'other', facts:{male:false, female:false}},
    {id:'unrecorded', facts:{}},
  ];
  for (const [key, inverse] of [['male','female'], ['female','male'], ['boy','girl'], ['girl','boy']]) {
    const pool = openWorld.map(entry => ({...entry, facts:{
      ...entry.facts, boy:entry.facts.male, girl:entry.facts.female,
    }}));
    for (const value of ['yes','no','probably','probably-not','unknown']) {
      const answers = [{key,value}];
      assert.equal(nextQuestion(scoreCandidates(pool, answers), answers, {[inverse]:'Opposite?'}), null);
    }
  }
  const negative = scoreCandidates(openWorld, [{key:'male',value:'no'}]);
  assert.equal(negative.find(row=>row.entry.id==='b').score, negative.find(row=>row.entry.id==='other').score);
  assert.equal(negative.find(row=>row.entry.id==='unrecorded').score, 0);
  const unknown = [{key:'male',value:'unknown'}];
  assert.deepEqual(scoreCandidates(openWorld, unknown), scoreCandidates(openWorld, []));
  assert.equal(ask(unknown, {female:'Female?', actor:'Actor?'}), 'actor');
});
