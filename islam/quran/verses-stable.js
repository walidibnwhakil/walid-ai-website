/* Shared Quran verse renderer: canonical Arabic and Bengali translation remain untouched. */
(()=>{'use strict';
const n=Number(document.body.dataset.surah),root=document.getElementById('verses'),status=document.getElementById('load-status'),toggle=document.getElementById('show-translation');
if(!root||!Number.isInteger(n)||n<1||n>114)return;
const digits=s=>String(s).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);
const render=data=>{if(data.surah!==n||!Array.isArray(data.verses)||!data.verses.length)throw Error('সূরার ডেটা সঠিক নয়');const fragment=document.createDocumentFragment();
if(n!==9){const b=document.createElement('article');b.className='ayah basmala';const a=document.createElement('div');a.className='arabic';a.lang='ar';a.dir='rtl';a.textContent='بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';const p=document.createElement('p');p.className='basmala-pronunciation';p.textContent='বিসমিল্লাহির রাহমানির রাহীম।';p.hidden=true;const t=document.createElement('p');t.className='basmala-meaning';t.textContent='পরম করুণাময়, অসীম দয়ালু আল্লাহর নামে।';t.hidden=!(toggle&&toggle.checked);b.append(a,p,t);fragment.append(b)}
const displayed=n===1?(()=>{const last=data.verses[6];const split=last.arabic.indexOf('غَيۡرِ');if(split<0)throw Error('সূরা ফাতিহার শেষ আয়াত বিভাজন যাচাই করা যায়নি');const translationSplit=last.translation.indexOf('তাদের পথ নয়');if(translationSplit<0)throw Error('সূরা ফাতিহার বাংলা অর্থ বিভাজন যাচাই করা যায়নি');return [...data.verses.slice(1,6),{...last,arabic:last.arabic.slice(0,split).trim(),pronunciation:'সিরাতাল্লাযীনা আন‘আমতা ‘আলাইহিম।',translation:last.translation.slice(0,translationSplit).trim()},{...last,arabic:last.arabic.slice(split).trim(),pronunciation:'গইরিল মাগদূবি ‘আলাইহিম ওয়ালাদ্দল্লীন।',translation:last.translation.slice(translationSplit).trim()}].map((v,i)=>({...v,verse:i+1}))})():data.verses;
displayed.forEach((v,i)=>{if(v.verse!==i+1||!v.arabic||!v.translation)throw Error('আয়াত '+(i+1)+' অসম্পূর্ণ');const card=document.createElement('article');card.className='ayah';card.id='ayah-'+v.verse;card.dataset.verse=String(v.verse);const number=document.createElement('div');number.className='ayah-number';number.textContent=digits(v.verse);const ar=document.createElement('div');ar.className='arabic';ar.lang='ar';ar.dir='rtl';ar.textContent=v.arabic;card.append(number,ar);if(v.pronunciation){const p=document.createElement('p');p.className='pronunciation';p.dataset.verified='true';p.textContent=v.pronunciation;p.hidden=true;card.append(p)}const t=document.createElement('p');t.className='translation';t.textContent=v.translation.replace(/\s*\[\s*[0-9০-৯]+\s*\]/g,'');t.hidden=!(toggle && toggle.checked);card.append(t);fragment.append(card)});root.replaceChildren(fragment);if(status)status.textContent=digits(displayed.length)+'টি আয়াত · আরবি পাঠ';};
const fetchJSON=async url=>{const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);return r.json();};
const sourceURL='/islam/quran/data/surah-'+String(n).padStart(3,'0')+'.json';
const approvedPronunciationSurahs=new Set([3,5,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49]);
const attachPronunciation=async data=>{
  if(!approvedPronunciationSurahs.has(n))return data;
  try{
    const extra=await fetchJSON('/islam/quran/data/pronunciation-'+String(n).padStart(3,'0')+'.json');
    if(extra.surah!==n||!Array.isArray(extra.verses)||extra.verses.length!==data.verses.length)throw Error('Mismatched pronunciation dataset');
    for(let i=0;i<extra.verses.length;i++){
      const row=extra.verses[i];
      if(row.verse!==i+1||typeof row.pronunciation!=='string'||!row.pronunciation.trim().endsWith('।'))
        throw Error('Incomplete pronunciation dataset');
    }
    return {...data,verses:data.verses.map((verse,i)=>({...verse,pronunciation:extra.verses[i].pronunciation}))};
  }catch(error){
    console.warn('Bengali pronunciation unavailable; keeping canonical Quran readable',error);
    return data;
  }
};
fetchJSON(sourceURL).then(attachPronunciation).then(render).catch(e=>{if(status)status.textContent='আয়াত লোড হয়নি: '+e.message});
toggle?.addEventListener('change',()=>root.querySelectorAll('.translation,.basmala-meaning').forEach(el=>el.hidden=!toggle.checked));
})();