/* Shared Quran verse renderer: local ayah-level Bengali pronunciation text. */
(()=>{'use strict';
const n=Number(document.body.dataset.surah),root=document.getElementById('verses'),status=document.getElementById('load-status'),toggle=document.getElementById('show-translation'),pronunciationToggle=document.getElementById('show-pronunciation');
if(!root||!Number.isInteger(n)||n<1||n>114)return;
const digits=s=>String(s).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);
const makeText=(text,className,hidden=false)=>{const p=document.createElement('p');p.className=className;p.textContent=text||'';p.hidden=hidden;return p};
const render=(data,coverage)=>{
 if(data.surah!==n||!Array.isArray(data.verses)||!data.verses.length)throw Error('সূরার ডেটা সঠিক নয়');
 const verified=new Set();
 for(const group of coverage?.verified?.coverage||[]){
   if(group.surah!==n)continue;
   const range=/^(\\d+)(?:-(\\d+))?$/.exec(String(group.verses));
   if(!range)continue;
   const first=Number(range[1]),last=Number(range[2]||range[1]);
   for(let verse=first;verse<=last;verse++)verified.add(verse);
 }
 const fragment=document.createDocumentFragment();
 if(n!==9){
   const b=document.createElement('article');b.className='ayah basmala';
   const a=document.createElement('div');a.className='arabic';a.lang='ar';a.dir='rtl';a.textContent='بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
   const p=makeText(n===1?data.verses[0].pronunciation:'বিসমিল্লাহির রাহমানির রাহীম।','pronunciation basmala-pronunciation',!pronunciationToggle?.checked);
   const t=makeText('পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।','basmala-meaning',!(toggle&&toggle.checked));
   b.append(a,p,t);fragment.append(b)
 }
 let displayed=data.verses;
 if(n===1){
   const last=data.verses[6],split=last.arabic.indexOf('غَيۡرِ'),translationSplit=last.translation.indexOf('তাদের পথ নয়');
   if(split<0||translationSplit<0)throw Error('সূরা ফাতিহার শেষ আয়াত বিভাজন যাচাই করা যায়নি');
   displayed=[...data.verses.slice(1,6),
     {...last,arabic:last.arabic.slice(0,split).trim(),pronunciation:'সিরাতাল্লাযীনা আন‘আমতা ‘আলাইহিম।',translation:last.translation.slice(0,translationSplit).trim()},
     {...last,arabic:last.arabic.slice(split).trim(),pronunciation:'গইরিল মাগদূবি ‘আলাইহিম ওয়ালাদ্দল্লীন।',translation:last.translation.slice(translationSplit).trim()}
   ].map((v,i)=>({...v,verse:i+1}));
 }
 displayed.forEach((v,i)=>{
   if(v.verse!==i+1||!v.arabic||!v.translation||!v.pronunciation)throw Error('আয়াত '+(i+1)+' অসম্পূর্ণ');
   const card=document.createElement('article');card.className='ayah';card.id='ayah-'+v.verse;card.dataset.verse=String(v.verse);
   const number=document.createElement('div');number.className='ayah-number';number.textContent=digits(v.verse);
   const ar=document.createElement('div');ar.className='arabic';ar.lang='ar';ar.dir='rtl';ar.textContent=v.arabic;
   const isVerified=verified.has(v.verse);\n   const p=makeText(v.pronunciation,'pronunciation',!pronunciationToggle?.checked||!isVerified);\n   p.dataset.verified=String(isVerified);
   const t=makeText(v.translation.replace(/\s*\[\s*[0-9০-৯]+\s*\]/g,''),'translation',!(toggle&&toggle.checked));
   card.append(number,ar,p,t);fragment.append(card);
 });
 root.replaceChildren(fragment);
 if(status)status.textContent=digits(displayed.length)+'টি আয়াত · আরবি পাঠ';
};
const json=url=>fetch(url,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});\nPromise.all([json('/islam/quran/data/surah-'+String(n).padStart(3,'0')+'.json'),json('/islam/quran/data/pronunciation-coverage.json').catch(()=>null)]).then(([data,coverage])=>render(data,coverage)).catch(e=>{if(status)status.textContent='আয়াত লোড হয়নি: '+e.message});
toggle?.addEventListener('change',()=>root.querySelectorAll('.translation,.basmala-meaning').forEach(el=>el.hidden=!toggle.checked));
pronunciationToggle?.addEventListener('change',()=>root.querySelectorAll('.pronunciation,.basmala-pronunciation').forEach(el=>el.hidden=!pronunciationToggle.checked||(el.classList.contains('pronunciation')&&!el.classList.contains('basmala-pronunciation')&&el.dataset.verified!=='true')));
})();