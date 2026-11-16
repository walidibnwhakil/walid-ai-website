/* Walid AI: 60 deterministic sets of unique grade-scoped mathematics practice.
   33,000 generated exercises in total across grades 6–12. This is NOT a
   curriculum-reviewed, multi-subject 33,000-MCQ question bank. */
(function(){
'use strict';
const LIMIT=60;
function targetFor(grade){return grade>=9?100:50}
function make(grade,set,index){
 if(!Number.isInteger(grade)||grade<6||grade>12||!Number.isInteger(set)||set<1||set>LIMIT||!Number.isInteger(index)||index<0||index>=targetFor(grade))throw Error('Invalid grade/set/question');
 const key=(set-1)*targetFor(grade)+index;
 // The first operand encodes the unique question number. Consequently no two
 // generated stems for a given grade can coincide, even across different sets.
 const a=20+key,b=3+(key%23),kind=index%5;
 let q,answer,why;
 if(grade<=8){
  if(kind===0){q=a+' + '+b+' = কত?';answer=a+b;why=a+' ও '+b+' যোগ করলে '+answer+'।'}
  else if(kind===1){q=(a+b)+' − '+b+' = কত?';answer=a;why=(a+b)+' থেকে '+b+' বিয়োগ করলে '+a+'।'}
  else if(kind===2){q=a+' × '+b+' = কত?';answer=a*b;why=a+' কে '+b+' দিয়ে গুণ করলে '+answer+'।'}
  else if(kind===3){q=(a*b)+' ÷ '+b+' = কত?';answer=a;why=(a*b)+' কে '+b+' দিয়ে ভাগ করলে '+a+'।'}
  else{q=a+' টাকার '+b+'টি জিনিসের মোট দাম কত টাকা?';answer=a*b;why='একটির দাম × সংখ্যা = '+a+' × '+b+' = '+answer+' টাকা।'}
 }else if(grade<=10){
  if(kind===0){q='x + '+b+' = '+(a+b)+' হলে x কত?';answer=a;why='উভয় পাশ থেকে '+b+' বিয়োগ করলে x='+a+'।'}
  else if(kind===1){q=b+'x = '+(a*b)+' হলে x কত?';answer=a;why='উভয় পাশকে '+b+' দিয়ে ভাগ করলে x='+a+'।'}
  else if(kind===2){q='2x + '+b+' = '+(2*a+b)+' হলে x কত?';answer=a;why='প্রথমে '+b+' বিয়োগ, পরে ২ দিয়ে ভাগ করলে x='+a+'।'}
  else if(kind===3){q='x − '+b+' = '+(a-b)+' হলে x কত?';answer=a;why='উভয় পাশে '+b+' যোগ করলে x='+a+'।'}
  else{q='x/2 + '+b+' = '+(a+b)+' হলে x কত?';answer=2*a;why='প্রথমে '+b+' বিয়োগ, পরে ২ দিয়ে গুণ করলে x='+answer+'।'}
 }else{
  if(kind===0){q='f(x)='+a+'x² হলে f′(1) কত?';answer=2*a;why='f′(x)='+2*a+'x, তাই f′(1)='+answer+'।'}
  else if(kind===1){q='f(x)='+a+'x³ হলে f′(1) কত?';answer=3*a;why='f′(x)='+3*a+'x², তাই f′(1)='+answer+'।'}
  else if(kind===2){q='f(x)='+a+'x²+'+b+'x হলে f′(1) কত?';answer=2*a+b;why='f′(x)='+2*a+'x+'+b+', তাই f′(1)='+answer+'।'}
  else if(kind===3){q='f(x)='+a+'x² হলে f′(2) কত?';answer=4*a;why='f′(x)='+2*a+'x, তাই f′(2)='+answer+'।'}
  else{q='f(x)='+a+'x³+'+b+'x হলে f′(1) কত?';answer=3*a+b;why='f′(x)='+3*a+'x²+'+b+', তাই f′(1)='+answer+'।'}
 }
 const candidates=[answer,answer+b,answer-b,answer+2*b];
 const pos=(key+grade)%4,wrong=candidates.slice(1),options=wrong.slice();
 options.splice(pos,0,answer);
 return {id:'math-'+grade+'-'+set+'-'+index,grade,subject:'গণিত',q,options:options.map(String),answer:pos,why,generated:true};
}
function create(grade,set,count,existing=[]){
 const out=[],seen=new Set(existing.map(q=>q.q));
 for(let i=0;i<targetFor(grade)&&out.length<count;i++){
  const q=make(grade,set,i);if(!seen.has(q.q)){seen.add(q.q);out.push(q)}
 }
 return out;
}
function audit(){
 const stats={},all=new Set();
 for(let g=6;g<=12;g++){
  let n=0;const seen=new Set();
  for(let set=1;set<=LIMIT;set++)for(let i=0;i<targetFor(g);i++){
   const q=make(g,set,i);if(seen.has(q.q))throw Error('Duplicate stem: '+g+'/'+set+'/'+i);
   if(new Set(q.options).size!==4||q.options[q.answer]!==String(Number(q.options[q.answer])))throw Error('Bad options');
   seen.add(q.q);all.add(g+'|'+q.q);n++;
  }
  stats[g]=n;
 }
 return {total:all.size,byGrade:stats};
}
window.WalidEducationVariants={create,make,audit,targetFor};
})();