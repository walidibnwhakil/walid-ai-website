/* Walid AI English Grammar: deterministic, rule-based practice, not reproduced board questions. */
(function(){
'use strict';
const names=['Rafi','Mina','Sadia','Karim','Nila','Arif','Tania','Hasan','Rina','Imran','Farah','Nabil','Mitu','Sohan','Joya','Sami','Lima','Rifat','Nadia','Tuhin'];
const verbs=[
['visit','visits','visited','visiting','visited','the library'],
['write','writes','wrote','writing','written','a letter'],
['draw','draws','drew','drawing','drawn','a picture'],
['make','makes','made','making','made','a paper boat'],
['wash','washes','washed','washing','washed','the dishes'],
['clean','cleans','cleaned','cleaning','cleaned','the classroom'],
['cook','cooks','cooked','cooking','cooked','a meal'],
['paint','paints','painted','painting','painted','a wall'],
['open','opens','opened','opening','opened','the window']
];
const patterns=[
(n,v)=>['Every morning, '+n+' ___ '+v[5]+'.',v[1],[v[0],v[2],v[3]],'Simple present: third-person singular subject takes '+v[1]+'.'],
(n,v)=>['Yesterday, '+n+' ___ '+v[5]+'.',v[2],[v[0],v[1],v[3]],'Simple past: '+v[0]+' changes to '+v[2]+'.'],
(n,v)=>['Look! '+n+' ___ '+v[5]+' right now.','is '+v[3],[v[1],v[2],'has '+v[4]],'Present continuous: is + '+v[3]+'.'],
(n,v)=>[n+' has already ___ '+v[5]+'.',v[4],[v[0],v[1],v[3]],'Present perfect: has + past participle ('+v[4]+').'],
(n,v)=>['Tomorrow, '+n+' ___ '+v[5]+'.','will '+v[0],[v[1],v[2],'is '+v[3]],'Future: will + base verb ('+v[0]+').'],
(n,v)=>[n+' does not ___ '+v[5]+'.',v[0],[v[1],v[2],v[3]],'After does not, use the base form ('+v[0]+').'],
(n,v)=>['Does '+n+' ___ '+v[5]+' every day?',v[0],[v[1],v[2],v[3]],'After does, use the base form ('+v[0]+').'],
(n,v)=>['At 6 p.m. yesterday, '+n+' ___ '+v[5]+'.','was '+v[3],[v[1],v[2],'has '+v[4]],'Past continuous: was + '+v[3]+'.'],
(n,v)=>['Did '+n+' ___ '+v[5]+' yesterday?',v[0],[v[1],v[2],v[3]],'After did, use the base form '+v[0]+'.'],
(n,v)=>['Tomorrow, '+n+' will not ___ '+v[5]+'.',v[0],[v[1],v[2],v[3]],'After will not, use the base form '+v[0]+'.'],
(n,v)=>['Last week, '+n+' did not ___ '+v[5]+'.',v[0],[v[1],v[2],v[3]],'After did not, use the base form '+v[0]+'.'],
(n,v)=>['While we were waiting, '+n+' was ___ '+v[5]+'.',v[3],[v[0],v[1],v[2]],'Past continuous after was requires the -ing form '+v[3]+'.']
];
const PER_GRADE=patterns.length*names.length*verbs.length;
function make(grade,index){
 const p=Math.floor(index/(names.length*verbs.length)),rem=index%(names.length*verbs.length);
 const name=names[Math.floor(rem/verbs.length)],v=verbs[rem%verbs.length];
 const [q,correct,wrong,why]=patterns[p](name,v);
 const options=wrong.slice(),pos=(index+grade)%4;options.splice(pos,0,correct);
 return {id:'grammar-practice-'+grade+'-'+index,grade,subject:'ইংরেজি',q,options,answer:pos,why,topic:['Present simple','Past simple','Present continuous','Present perfect','Future simple','Negative sentences','Questions','Past continuous','Past questions','Future negative','Past negative','Past continuous forms'][p],practiceGenerated:true};
}
function audit(){
 let total=0,errors=[],unique=new Set();
 for(let grade=6;grade<=12;grade++)for(let i=0;i<PER_GRADE;i++){
  const q=make(grade,i),key=grade+'|'+q.q.toLowerCase();
  if(unique.has(key)||q.options.length!==4||new Set(q.options).size!==4||q.options[q.answer]===undefined)errors.push(q.id);
  unique.add(key);total++;
 }
 return {total,unique:unique.size,errors:errors.slice(0,10),perGrade:PER_GRADE};
}
function create(grade,setNumber,count,excluded){
 if(!Number.isInteger(grade)||grade<6||grade>12||count<=0)return [];
 const excludedStems=new Set((excluded||[]).map(q=>q.q.trim().toLowerCase()));
 const out=[],offset=(((setNumber-1)*Math.max(1,count))%PER_GRADE);
 for(let step=0;step<PER_GRADE&&out.length<count;step++){
  const index=(offset+step)%PER_GRADE,q=make(grade,index);
  if(!excludedStems.has(q.q.toLowerCase()))out.push(q);
 }
 return out;
}
window.WalidGrammarPractice={create,audit,perGrade:PER_GRADE};
})();