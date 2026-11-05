import {scoreCandidates,nextQuestion,selectGuess,factValue} from './engine-v2.js';
export function noiseBucket(id,key){let h=2166136261;for(const c of id+'/'+canonical(key)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return(h>>>0)%100;}
const canonical=key=>key.replace(/^wd_(occupation|birthplace|award|work|sport)_/,'v2_$1_');
export function simulate(target,pool,bank,{noisy=false,maxQuestions=60}={}){
 const answers=[];
 for(let turn=0;turn<=maxQuestions;turn++){
  const ranked=scoreCandidates(pool,answers),guess=selectGuess(ranked,answers,bank);
  if(guess)return {id:target.id,correct:guess.id===target.id,wrong:guess.id!==target.id,questions:answers.length,support:ranked[0].support,probability:ranked[0].probability};
  if(answers.length===maxQuestions)break;const key=nextQuestion(ranked,answers,bank);if(!key)break;
  const fact=factValue(target,key);let value=fact===undefined?'unknown':fact?'yes':'no';
  if(noisy&&fact!==undefined){const n=noiseBucket(target.id,key);if(n<25)value='unknown';else if(n<40)value=fact?'probably':'probably-not';else if(n<45)value=fact?'no':'yes';}
  answers.push({key,value});
 }
 return {id:target.id,correct:false,wrong:false,questions:answers.length};
}
