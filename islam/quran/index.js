(()=>{const root='/islam/quran/',list=document.querySelector('#surah-list'),input=document.querySelector('#surah-search'),status=document.querySelector('#list-status');let surahs=[];const bn=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);function render(){const query=input.value.trim().toLocaleLowerCase();list.replaceChildren();const matches=surahs.filter(s=>`${s.number} ${bn(s.number)} ${s.banglaName} ${s.transliteration} ${s.arabicName} ${s.meaning}`.toLocaleLowerCase().includes(query));if(!matches.length){const p=document.createElement('p');p.className='empty-state';p.textContent='এই নামে কোনো সূরা পাওয়া যায়নি।';list.append(p);return}for(const s of matches){const a=document.createElement('a');a.className='surah-card';a.href=`${root}${s.slug}/`;const number=document.createElement('span');number.className='surah-number';number.textContent=bn(s.number);const copy=document.createElement('span');const title=document.createElement('strong');title.textContent=s.banglaName||s.transliteration;const sub=document.createElement('small');sub.textContent=`${s.arabicName} · ${bn(s.verseCount)} আয়াত · ${s.revelation==='meccan'?'মাক্কি':'মাদানি'}`;copy.append(title,sub);a.append(number,copy);list.append(a)}}input.addEventListener('input',render);fetch(`${root}data/metadata.json`).then(r=>{if(!r.ok)throw Error('metadata unavailable');return r.json()}).then(d=>{if(!Array.isArray(d)||d.length!==114)throw Error('expected 114 surahs');surahs=d;status.textContent=`মোট ${bn(d.length)}টি সূরা`;render()}).catch(()=>{status.textContent='সূরার তালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।'})})();

/* Shared reading-session enhancement: device-only bookmarks + best-effort screen wake lock. */
(() => {
  if (document.getElementById("walid-reading-session-script")) return;
  const script = document.createElement("script");
  script.id = "walid-reading-session-script";
  script.src = "/assets/reading-session.js?v=20261122";
  script.async = true;
  document.head.append(script);
})();

/* Anonymous aggregate page-view and active-time counters; never inspect reading content. */
(() => {
  if (document.querySelector('script[src^="/usage.js"]') || document.getElementById('walid-section-usage')) return;
  const script = document.createElement('script');
  script.id = 'walid-section-usage';
  script.src = '/usage.js?v=20261122-section-analytics';
  script.async = true;
  document.head.append(script);
})();
