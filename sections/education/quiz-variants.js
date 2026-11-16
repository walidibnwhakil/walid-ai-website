/* Grade-aware deterministic practice variants. Generated arithmetic is supplementary, not independently curriculum-reviewed questions. */
(function(){
'use strict';
function make(grade,set,index){
 const key=(set-1)*100+index, a=7+(key%97),b=3+(Math.floor(key/97)%67), kind=grade<=8?index%4:grade<=10?index%3:index%3;
 let q,answer,why,subject='গণিত';
 if(grade<=8){
  if(kind===0){answer=a+b;q=a+' + '+b+' = কত?';why=a+' ও '+b+' যোগ করলে '+answer+' হয়।'}
  if(kind===1){answer=a+b;q=(a+b)+' − '+a+' = কত?';why=(a+b)+' থেকে '+a+' বিয়োগ করলে '+b+' হয়।';answer=b}
  if(kind===2){const n=2+(a%12),m=2+(b%12);answer=n*m;q=n+' × '+m+' = কত?';why=n+' কে '+m+' বার যোগ করলে '+answer+' হয়।'}
  if(kind===3){const n=2+(a%12),m=2+(b%12);answer=n;q=(n*m)+' ÷ '+m+' = কত?';why=m+' দিয়ে '+(n*m)+' ভাগ করলে '+n+' হয়।'}
 }else if(grade<=10){
  if(kind===0){answer=a;q='x + '+b+' = '+(a+b)+' হলে x কত?';why='উভয় পাশ থেকে '+b+' বিয়োগ করলে x = '+a+'।'}
  if(kind===1){answer=b;q=a+'x = '+(a*b)+' হলে x কত?';why='উভয় পাশকে '+a+' দিয়ে ভাগ করলে x = '+b+'।'}
  if(kind===2){answer=a;q='2x + '+b+' = '+(2*a+b)+' হলে x কত?';why='প্রথমে '+b+' বিয়োগ, তারপর ২ দিয়ে ভাগ করলে x = '+a+'।'}
 }else{
  if(kind===0){answer=a*2;q='f(x) = '+a+'x² হলে f′(1) কত?';why='f′(x) = '+(a*2)+'x, তাই x=১ বসালে '+answer+'।'}
  if(kind===1){answer=a*3;q='f(x) = '+a+'x³ হলে f′(1) কত?';why='f′(x) = '+(a*3)+'x², তাই x=১ বসালে '+answer+'।'}
  if(kind===2){answer=a+b;q='f(x) = '+a+'x² + '+b+'x হলে f′(১/২) কত?';why='f′(x) = '+(2*a)+'x + '+b+'; x=১/২ বসালে '+answer+'।'}
 }
 const distractors=[answer+1,answer+2,answer+3];const pos=(key+grade)%4;const options=distractors.slice();options.splice(pos,0,answer);return {id:'v-'+grade+'-'+set+'-'+index,grade,subject,q,options:options.map(String),answer:pos,why,generated:true};
}
function create(grade,set,count,existing){
 const out=[],seen=new Set(existing.map(q=>q.q));for(let i=0;out.length<count&&i<count*4;i++){const q=make(grade,set,i);if(!seen.has(q.q)){seen.add(q.q);out.push(q)}}return out;
}
window.WalidEducationVariants={create};
})();