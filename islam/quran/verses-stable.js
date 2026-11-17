/* Independent, minimal Quran text renderer. Prioritizes full Arabic visibility. */
(()=>{'use strict';
const n=Number(document.body.dataset.surah),root=document.getElementById('verses'),status=document.getElementById('load-status'),toggle=document.getElementById('show-translation');
if(!root||!Number.isInteger(n)||n<1||n>114)return;
const digits=s=>String(s).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);
const render=data=>{
 if(data.surah!==n||!Array.isArray(data.verses)||!data.verses.length)throw Error('সূরার ডেটা সঠিক নয়');
 const fragment=document.createDocumentFragment();
 if(n!==1&&n!==9){const b=document.createElement('article');b.className='ayah basmala';const a=document.createElement('div');a.className='arabic';a.lang='ar';a.dir='rtl';a.textContent='بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';const p=document.createElement('p');p.className='pronunciation';p.textContent='বিসমিল্লাহির রাহমানির রাহীম।';const t=document.createElement('p');t.className='translation';t.textContent='পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।';t.hidden=toggle?.checked===false;b.append(a,p,t);fragment.append(b)}
 data.verses.forEach((v,i)=>{if(v.verse!==i+1||!v.arabic||!v.translation)throw Error('আয়াত '+(i+1)+' অসম্পূর্ণ');const card=document.createElement('article');card.className='ayah';card.id='ayah-'+v.verse;card.dataset.verse=String(v.verse);const number=document.createElement('div');number.className='ayah-number';number.textContent=digits(v.verse);const ar=document.createElement('div');ar.className='arabic';ar.lang='ar';ar.dir='rtl';ar.textContent=v.arabic;card.append(number,ar);if(v.pronunciation){const p=document.createElement('p');p.className='pronunciation';p.textContent=v.pronunciation;card.append(p)}const t=document.createElement('p');t.className='translation';t.textContent=n===1&&v.verse===1?'পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।':v.translation.replace(/\s*\[\s*[0-9০-৯]+\s*\]/g,'');t.hidden=toggle?.checked===false;card.append(t);fragment.append(card)});
 root.replaceChildren(fragment);if(status)status.textContent=digits(data.verses.length)+'টি আয়াত · আরবি পাঠ ও বাংলা অর্থ';
 };
 fetch('/islam/quran/data/surah-'+String(n).padStart(3,'0')+'.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(render).catch(e=>{if(status)status.textContent='আয়াত লোড হয়নি: '+e.message;console.error('Quran verse renderer:',e)});
 toggle?.addEventListener('change',()=>root.querySelectorAll('.translation').forEach(el=>el.hidden=!toggle.checked));
})();