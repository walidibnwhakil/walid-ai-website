/* Shared Quran verse renderer: Arabic and Bengali translation stay local and unchanged. */
(()=>{'use strict';
const n=Number(document.body.dataset.surah),root=document.getElementById('verses'),status=document.getElementById('load-status'),toggle=document.getElementById('show-translation'),pronunciationToggle=document.getElementById('show-pronunciation');
if(!root||!Number.isInteger(n)||n<1||n>114)return;
const digits=s=>String(s).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);
const pronunciationBase='https://quranapibn.sayed.app/images/bengaliP/';
const announcePronunciation=()=>root.dispatchEvent(new Event('quran-pronunciation-update'));
const requestPronunciation=()=>{
 root.querySelectorAll('img.pronunciation').forEach(image=>{
  if(image.dataset.verified==='true'||image.dataset.loading==='true')return;
  image.dataset.loading='true';
  image.dataset.error='';
  image.addEventListener('load',()=>{delete image.dataset.loading;delete image.dataset.error;if(image.naturalWidth>0)image.dataset.verified='true';else image.dataset.error='true';announcePronunciation()},{once:true});
  image.addEventListener('error',()=>{delete image.dataset.loading;image.dataset.error='true';announcePronunciation()},{once:true});
  const surah=image.dataset.sourceSurah,ayah=image.dataset.sourceAyah;
  image.src=pronunciationBase+surah+'/'+surah+'-'+ayah+'.png?retry='+Date.now();
 });
};
pronunciationToggle?.addEventListener('change',()=>{if(pronunciationToggle.checked)requestPronunciation()});
const makePronunciation=(ayah,alt)=>{
 const image=document.createElement('img');
 image.className='pronunciation pronunciation-image';
 image.alt=alt;
 image.loading='lazy';
 image.decoding='async';
 image.hidden=true;
 image.dataset.sourceSurah=String(n);
 image.dataset.sourceAyah=String(ayah);
 
 image.style.maxWidth='100%';
 image.style.height='auto';
 image.style.margin='10px auto 0';
 image.style.objectFit='contain';
 return image;
};
const render=data=>{if(data.surah!==n||!Array.isArray(data.verses)||!data.verses.length)throw Error('সূরার ডেটা সঠিক নয়');const fragment=document.createDocumentFragment();
if(n!==9){const b=document.createElement('article');b.className='ayah basmala';const a=document.createElement('div');a.className='arabic';a.lang='ar';a.dir='rtl';a.textContent='بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';const p=makePronunciation(0,'বিসমিল্লাহির বাংলা উচ্চারণ, সরকারি উৎস');const t=document.createElement('p');t.className='basmala-meaning';t.textContent='পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।';t.hidden=!(toggle&&toggle.checked);b.append(a,p,t);fragment.append(b)}
const displayed=n===1?(()=>{const last=data.verses[6];const split=last.arabic.indexOf('غَيۡرِ');if(split<0)throw Error('সূরা ফাতিহার শেষ আয়াত বিভাজন যাচাই করা যায়নি');const translationSplit=last.translation.indexOf('তাদের পথ নয়');if(translationSplit<0)throw Error('সূরা ফাতিহার বাংলা অর্থ বিভাজন যাচাই করা যায়নি');return [...data.verses.slice(1,6),{...last,arabic:last.arabic.slice(0,split).trim(),translation:last.translation.slice(0,translationSplit).trim()},{...last,arabic:last.arabic.slice(split).trim(),translation:last.translation.slice(translationSplit).trim()}].map((v,i)=>({...v,verse:i+1}))})():data.verses;
displayed.forEach((v,i)=>{if(v.verse!==i+1||!v.arabic||!v.translation)throw Error('আয়াত '+(i+1)+' অসম্পূর্ণ');const card=document.createElement('article');card.className='ayah';card.id='ayah-'+v.verse;card.dataset.verse=String(v.verse);const number=document.createElement('div');number.className='ayah-number';number.textContent=digits(v.verse);const ar=document.createElement('div');ar.className='arabic';ar.lang='ar';ar.dir='rtl';ar.textContent=v.arabic;card.append(number,ar);card.append(makePronunciation(v.verse,'আয়াত '+digits(v.verse)+'-এর বাংলা উচ্চারণ, সরকারি উৎস'));const t=document.createElement('p');t.className='translation';t.textContent=v.translation.replace(/\s*\[\s*[0-9০-৯]+\s*\]/g,'');t.hidden=!(toggle && toggle.checked);card.append(t);fragment.append(card)});root.replaceChildren(fragment);if(status)status.textContent=digits(displayed.length)+'টি আয়াত · আরবি পাঠ';if(pronunciationToggle?.checked)requestPronunciation();};
fetch('/islam/quran/data/surah-'+String(n).padStart(3,'0')+'.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()}).then(render).catch(e=>{if(status)status.textContent='আয়াত লোড হয়নি: '+e.message});
toggle?.addEventListener('change',()=>root.querySelectorAll('.translation,.basmala-meaning').forEach(el=>el.hidden=!toggle.checked));
})();