/* Walid AI Islam hub — one current prayer countdown; no persistent location tracking. */
(() => {
  'use strict';
  const card = document.getElementById('prayer-widget');
  if (!card) return;
  const $ = id => document.getElementById(id);
  const divisions = {
    dhaka: {name:'ঢাকা',lat:23.8103,lon:90.4125},
    chattogram: {name:'চট্টগ্রাম',lat:22.3569,lon:91.7832},
    rajshahi: {name:'রাজশাহী',lat:24.3745,lon:88.6042},
    khulna: {name:'খুলনা',lat:22.8456,lon:89.5403},
    barishal: {name:'বরিশাল',lat:22.7010,lon:90.3535},
    sylhet: {name:'সিলেট',lat:24.8949,lon:91.8687},
    rangpur: {name:'রংপুর',lat:25.7439,lon:89.2752},
    mymensingh: {name:'ময়মনসিংহ',lat:24.7471,lon:90.4203}
  };
  const prayerNames = {Fajr:'ফজর',Dhuhr:'যোহর',Asr:'আসর',Maghrib:'মাগরিব',Isha:'এশা'};
  const numeral = value => String(value).replace(/[0-9]/g,d=>'০১২৩৪৫৬৭৮৯'[Number(d)]);
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Dhaka',year:'numeric',month:'2-digit',day:'2-digit'}); 
  const dhakaDay = date => {
    const p=Object.fromEntries(parts.formatToParts(date).filter(x=>x.type!=='literal').map(x=>[x.type,x.value]));
    return p.year+'-'+p.month+'-'+p.day;
  };
  const dhakaTimestamp = (day, clock) => {
    const match=String(clock).match(/^(\d{1,2}):(\d{2})/);
    if(!match)throw Error('Invalid prayer time');
    return new Date(day+'T'+match[1].padStart(2,'0')+':'+match[2]+':00+06:00').getTime();
  };
  const nextDay = day => new Date(Date.parse(day+'T00:00:00Z')+86400000).toISOString().slice(0,10);
  const displayDuration = milli => {
    const s=Math.max(0,Math.ceil(milli/1000));
    return numeral([Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':'));
  };
  let point={...divisions.dhaka}, label='ঢাকা', source='division', version=0, schedule=null, minuteDay='', pending=null;
  const dropdown=$('prayer-divisions');
  const locationButton=$('prayer-location');
  const gpsButton=$('prayer-gps');
  const warning=$('prayer-warning');
  const prayerSymbol = card.querySelector('.prayer-spark');
  // Restrained, scalable vector artwork. Each icon corresponds to the current
  // solar period, never a decorative cartoon or an unrelated prayer symbol.
  const iconBase = '<svg viewBox="0 0 48 48" width="44" height="44" fill="none" xmlns="http://www.w3.org/2000/svg">';
  const iconPaths = {
    isha: '<defs><linearGradient id="prayer-moon-gold" x1="8" y1="4" x2="41" y2="43" gradientUnits="userSpaceOnUse"><stop stop-color="#E1C995"/><stop offset=".56" stop-color="#B38C48"/><stop offset="1" stop-color="#86662E"/></linearGradient></defs><path d="M35.2 38.6A19 19 0 0 1 28.8 3.2 19.6 19.6 0 1 0 44 30.1a19 19 0 0 1-8.8 8.5Z" fill="url(#prayer-moon-gold)" stroke="#927239" stroke-width=".45" stroke-linejoin="round"/>',
    fajr: '<path d="M7 30h34" stroke="#6A7E91" stroke-width="1.6" stroke-linecap="round"/><path d="M14 30a10 10 0 0 1 20 0" fill="#E2BD7B" stroke="#C99A59" stroke-width="1"/><path d="M24 6v6M10.8 13.7l4.1 4.1M37.2 13.7l-4.1 4.1M5 23h5M38 23h5" stroke="#859AB0" stroke-width="1.7" stroke-linecap="round"/><path d="M9 36h30M15 41h18" stroke="#A0ACB5" stroke-width="1.3" stroke-linecap="round" opacity=".65"/>',
    sunrise: '<path d="M6 31h36" stroke="#947E5F" stroke-width="1.7" stroke-linecap="round"/><path d="M12 31a12 12 0 0 1 24 0" fill="#E6BD71" stroke="#B78646" stroke-width=".8"/><path d="M24 6v7M10 15l5 5M38 15l-5 5M4 24h6M38 24h6" stroke="#D4A057" stroke-width="1.7" stroke-linecap="round"/>',
    dhuhr: '<circle cx="24" cy="24" r="10.5" fill="#D8AF62" stroke="#B88F49" stroke-width="1"/><path d="M24 4v7M24 37v7M4 24h7M37 24h7M9.9 9.9l5 5M33.1 33.1l5 5M38.1 9.9l-5 5M14.9 33.1l-5 5" stroke="#BE9854" stroke-width="2" stroke-linecap="round"/>',
    asr: '<circle cx="28" cy="21" r="10" fill="#D5A35D" stroke="#AC7D42" stroke-width="1"/><path d="M28 5v5M28 32v4M12 21h6M38 21h5M16.5 9.5l4.3 4.3M35.2 28.2l4 4M40 9l-4.2 4.2" stroke="#B68C54" stroke-width="1.8" stroke-linecap="round"/><path d="M8 37h32M13 42h22" stroke="#9B8A73" stroke-width="1.5" stroke-linecap="round"/>',
    maghrib: '<path d="M6 29h36" stroke="#9B7D65" stroke-width="1.8" stroke-linecap="round"/><path d="M13 29a11 11 0 0 1 22 0" fill="#C88157" stroke="#AD6E49" stroke-width=".9"/><path d="M24 9v6M9.5 17l5.1 5M38.5 17l-5.1 5M4 24h6M38 24h6" stroke="#B67856" stroke-width="1.8" stroke-linecap="round"/><path d="M11 35h26M16 40h16" stroke="#B49B8A" stroke-width="1.3" stroke-linecap="round"/>'
  };
  let activeIcon = '';
  function showPrayerIcon(phase) {
    if (!prayerSymbol || !Object.hasOwn(iconPaths,phase) || activeIcon===phase) return;
    activeIcon=phase;
    prayerSymbol.dataset.phase=phase;
    prayerSymbol.innerHTML=iconBase+iconPaths[phase]+'</svg>';
  }
  function showError(message) {
    $('prayer-current').textContent='সময়সূচি পাওয়া যাচ্ছে না';
    $('prayer-countdown').textContent='—';
    $('prayer-countdown-caption').textContent=message;
    warning.hidden=true;
  }
  async function readDay(day,lat,lon) {
    const date=day.split('-').reverse().join('-');
    const url='https://api.aladhan.com/v1/timings/'+date+'?latitude='+encodeURIComponent(lat)+'&longitude='+encodeURIComponent(lon)+'&method=1&school=1&timezonestring=Asia%2FDhaka';
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),8500);
    try {
      const response=await fetch(url,{signal:controller.signal,cache:'no-store'});
      if(!response.ok)throw Error('HTTP '+response.status);
      const json=await response.json();
      if(json.code!==200||!json.data?.timings)throw Error('Invalid response');
      const t=json.data.timings;
      return Object.fromEntries(['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].map(k=>[k,dhakaTimestamp(day,t[k])]));
    } finally {clearTimeout(timeout);}
  }
  async function load() {
    const request=++version, day=dhakaDay(new Date());
    minuteDay=day;
    $('prayer-place').textContent=label;
    $('prayer-current').textContent='ওয়াক্তের সময় নির্ণয় হচ্ছে…';
    $('prayer-countdown').textContent='--:--:--';
    $('prayer-countdown-caption').textContent='বাংলাদেশ সময়';
    warning.hidden=true;
    const lat=point.lat,lon=point.lon;
    try {
      const [today,tomorrow]=await Promise.all([readDay(day,lat,lon),readDay(nextDay(day),lat,lon)]);
      if(request!==version)return;
      schedule={today,tomorrow,day};tick();
    } catch(error) {
      if(request!==version)return;
      schedule=null;
      showError('ইন্টারনেট সংযোগ বা সময়ের উৎস পরীক্ষা করুন');
    }
  }
  function tick() {
    if(!schedule)return;
    if(dhakaDay(new Date())!==schedule.day){schedule=null;load();return;}
    const now=Date.now(),t=schedule.today,tm=schedule.tomorrow;
    // Only the three widely noted solar prohibition windows. Approximate
    // boundaries; do not present these estimates as binding religious rulings.
    const prohibited=[
      {start:t.Sunrise,end:t.Sunrise+15*60000,title:'সূর্যোদয়ের নিষিদ্ধ সময়'},
      {start:t.Dhuhr-10*60000,end:t.Dhuhr,title:'মধ্যাহ্নের নিষিদ্ধ সময়'},
      {start:t.Maghrib-15*60000,end:t.Maghrib,title:'সূর্যাস্তের নিষিদ্ধ সময়'}
    ].find(x=>now>=x.start&&now<x.end);
    warning.hidden=!prohibited;
    if(prohibited){
      $('prayer-warning-title').textContent=prohibited.title;
      $('prayer-warning-description').textContent='আনুমানিক সময় · শেষ হতে '+displayDuration(prohibited.end-now)+' বাকি';
    }
    let title,caption,end,phase;
    if(now<t.Fajr){phase='isha';title='এশা';caption='ফজর শুরু হতে বাকি';end=t.Fajr;}
    else if(now<t.Sunrise){phase='fajr';title='ফজর';caption='সূর্যোদয় হতে বাকি';end=t.Sunrise;}
    else if(now<t.Dhuhr){phase='sunrise';title='এখন ফরজ নামাজের ওয়াক্ত নয়';caption='যোহর শুরু হতে বাকি';end=t.Dhuhr;}
    else if(now<t.Asr){phase='dhuhr';title='যোহর';caption='আসর শুরু হতে বাকি';end=t.Asr;}
    else if(now<t.Maghrib){phase='asr';title='আসর';caption='মাগরিব শুরু হতে বাকি';end=t.Maghrib;}
    else if(now<t.Isha){phase='maghrib';title='মাগরিব';caption='এশা শুরু হতে বাকি';end=t.Isha;}
    else {phase='isha';title='এশা';caption='পরবর্তী ফজর শুরু হতে বাকি';end=tm.Fajr;}
    showPrayerIcon(phase);
    $('prayer-current').textContent=title;
    $('prayer-countdown-caption').textContent=caption;
    $('prayer-countdown').textContent=displayDuration(end-now);
  }
  function chooseDivision(key){
    if(!Object.hasOwn(divisions,key))return;
    point={...divisions[key]};label=point.name;source='division';
    dropdown.hidden=true;locationButton.setAttribute('aria-expanded','false');
    load();
  }
  dropdown.querySelectorAll('button[data-division]').forEach(b=>b.addEventListener('click',()=>chooseDivision(b.dataset.division)));
  locationButton.addEventListener('click',()=>{
    dropdown.hidden=!dropdown.hidden;
    locationButton.setAttribute('aria-expanded',String(!dropdown.hidden));
  });
  document.addEventListener('click',event=>{
    if(!dropdown.hidden&&!dropdown.contains(event.target)&&!locationButton.contains(event.target)){
      dropdown.hidden=true;locationButton.setAttribute('aria-expanded','false');
    }
  });
  function useGPS() {
    if(!navigator.geolocation){$('prayer-gps-status').textContent='এই ব্রাউজারে GPS পাওয়া যায়নি';return;}
    $('prayer-gps-status').textContent='অবস্থান নির্ণয় হচ্ছে…';
    navigator.geolocation.getCurrentPosition(position=>{
      const {latitude,longitude}=position.coords;
      if(latitude<20||latitude>27||longitude<87||longitude>93){
        $('prayer-gps-status').textContent='বাংলাদেশের বাইরে অবস্থান পাওয়া গেছে; বিভাগ বেছে নিন';
        return;
      }
      point={lat:latitude,lon:longitude};label='বর্তমান অবস্থান';source='gps';
      $('prayer-gps-status').textContent='GPS অবস্থান সক্রিয়';
      load();
    },()=>{
      $('prayer-gps-status').textContent='GPS অনুমতি পাওয়া যায়নি · ঢাকা ব্যবহার হচ্ছে';
    },{enableHighAccuracy:false,timeout:9000,maximumAge:300000});
  }
  gpsButton.addEventListener('click',useGPS);
  load();
  // Previously granted location permissions can be used automatically.
  // Never open a permission prompt on page load.
  if(navigator.permissions?.query){
    navigator.permissions.query({name:'geolocation'}).then(permission=>{
      if(permission.state==='granted'&&source==='division')useGPS();
    }).catch(()=>{});
  }
  setInterval(tick,1000);
})();