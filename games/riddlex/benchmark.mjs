// Reproducible factual/noisy-answer benchmarks; these are not user studies.
import {writeFile} from 'node:fs/promises';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
import {scoreCandidates,nextQuestion,selectGuess} from './engine.js';
export function noiseBucket(id,key){
 let h=2166136261;for(const c of id+'/'+key){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return (h>>>0)%100;
}
export function simulate(target,pool,bank,{noisy=false,maxQuestions=Infinity}={}){
 const answers=[],rejected=new Set();let firstGuess=null;
 for(let turn=0;turn<Object.keys(bank).length+pool.length+2;turn++){
  const ranked=scoreCandidates(pool,answers,rejected),guess=selectGuess(ranked,answers,bank);
  if(guess){
   firstGuess??=guess.id;
   if(guess.id===target.id)return {id:target.id,correct:true,questions:answers.length,rejected:rejected.size,firstGuessCorrect:firstGuess===target.id};
   rejected.add(guess.id);continue;
  }
  if(answers.length>=maxQuestions)break;
  const key=nextQuestion(ranked,answers,bank);if(!key)break;
  const fact=target.facts[key];let value=fact===undefined?'unknown':fact?'yes':'no';
  if(noisy&&fact!==undefined){
   const n=noiseBucket(target.id,key);
   if(n<25)value='unknown';
   else if(n<40)value=fact?'probably':'probably-not';
   else if(n<45)value=fact?'no':'yes';
  }
  answers.push({key,value});
 }
 return {id:target.id,correct:false,questions:answers.length,rejected:rejected.size,firstGuessCorrect:firstGuess===target.id};
}
export function summarize(rows){
 const sorted=rows.map(r=>r.questions).sort((a,b)=>a-b);
 return {targets:rows.length,correct:rows.filter(r=>r.correct).length,unresolved:rows.filter(r=>!r.correct).length,
  firstGuessCorrect:rows.filter(r=>r.firstGuessCorrect).length,
  averageQuestions:rows.reduce((a,r)=>a+r.questions,0)/rows.length,medianQuestions:sorted[Math.floor(sorted.length/2)],
  p95Questions:sorted[Math.min(sorted.length-1,Math.floor(sorted.length*.95))],maxQuestions:sorted.at(-1),
  wrongGuesses:rows.reduce((a,r)=>a+r.rejected,0),maxRejected:Math.max(...rows.map(r=>r.rejected))};
}
if(process.argv[1]?.endsWith('/benchmark.mjs')){
 const started=performance.now(),result={dataset:entries.length,roles:roles.length,seed:'FNV1a(target-id/question-key) modulo 100',
  noisyPolicy:'Known answers: 25% unknown, 15% same-sign probable, 5% flipped, 55% correct definite. Missing facts always unknown. 60-question cap; wrong guesses rejected.',categories:{}};
 for(const category of ['characters','animals','objects']){
  const pool=entries.filter(e=>e.category===category),ideal=[],noisy=[];
  for(const [i,e] of pool.entries()){ideal.push(simulate(e,pool,questions));noisy.push(simulate(e,pool,questions,{noisy:true,maxQuestions:60}));if((i+1)%100===0)console.log('Progress',category,i+1,'/',pool.length,'seconds',Math.round((performance.now()-started)/1000));}
  result.categories[category]={ideal:summarize(ideal),noisy60:summarize(noisy),longestIdeal:ideal.sort((a,b)=>b.questions-a.questions).slice(0,5)};
  console.log(category,JSON.stringify(result.categories[category]));
 }
 result.relationships=summarize(roles.map(r=>simulate(r,roles,relationshipQuestions)));
 result.elapsedSeconds=(performance.now()-started)/1000;
 const output=process.argv.indexOf('--output');if(output>=0)await writeFile(process.argv[output+1],JSON.stringify(result,null,2)+'\n');
 console.log('Benchmark seconds:',result.elapsedSeconds);
}
