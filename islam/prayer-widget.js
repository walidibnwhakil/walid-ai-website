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
    let title,caption,end;
    if(now<t.Fajr){title='এশার ওয়াক্ত';caption='ফজর শুরু হতে বাকি';end=t.Fajr;}
    else if(now<t.Sunrise){title='ফজরের ওয়াক্ত';caption='সূর্যোদয় হতে বাকি';end=t.Sunrise;}
    else if(now<t.Dhuhr){title='এখন ফরজ নামাজের ওয়াক্ত নয়';caption='যোহর শুরু হতে বাকি';end=t.Dhuhr;}
    else if(now<t.Asr){title='যোহরের ওয়াক্ত';caption='আসর শুরু হতে বাকি';end=t.Asr;}
    else if(now<t.Maghrib){title='আসরের ওয়াক্ত';caption='মাগরিব শুরু হতে বাকি';end=t.Maghrib;}
    else if(now<t.Isha){title='মাগরিবের ওয়াক্ত';caption='এশা শুরু হতে বাকি';end=t.Isha;}
    else {title='এশার ওয়াক্ত';caption='পরবর্তী ফজর শুরু হতে বাকি';end=tm.Fajr;}
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