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

  // Atmospheric sky illustrations: realistic gradient light, soft horizons and
  // shaded sun/moon. These are display-only and do not rely on image services.
  const skyThemes={
    fajr:{top:'#162A49',mid:'#667D96',bottom:'#E8B68D',sunX:49,sunY:74,sunR:19,land:'#41596A'},
    sunrise:{top:'#507A9A',mid:'#E6A47D',bottom:'#FFD6A5',sunX:50,sunY:74,sunR:20,land:'#5F6C71'},
    dhuhr:{top:'#287DB1',mid:'#83C2E1',bottom:'#DAEEF4',sunX:50,sunY:36,sunR:18,land:'#6B8B95'},
    asr:{top:'#547F9C',mid:'#D6B28D',bottom:'#F4D5A8',sunX:68,sunY:54,sunR:18,land:'#677E7A'},
    maghrib:{top:'#323C68',mid:'#C86E63',bottom:'#F3AD79',sunX:50,sunY:76,sunR:20,land:'#4E536A'},
    isha:{top:'#0C1830',mid:'#2B3F61',bottom:'#516785',land:'#233850',moon:true}
  };
  let activeIcon='';
  function showPrayerIcon(phase){
    const t=skyThemes[phase];
    if(!prayerSymbol||!t||activeIcon===phase)return;
    activeIcon=phase;
    prayerSymbol.dataset.phase=phase;
    const id='prayer-sky-'+phase;
    const defs='<defs>'+
      '<linearGradient id="'+id+'-sky" x1="0" y1="0" x2="0" y2="1">'+
        '<stop stop-color="'+t.top+'"/><stop offset=".57" stop-color="'+t.mid+'"/><stop offset="1" stop-color="'+t.bottom+'"/></linearGradient>'+
      '<radialGradient id="'+id+'-sun" cx=".34" cy=".28" r=".77"><stop stop-color="#FFFFFC"/><stop offset=".54" stop-color="#FFF0C2"/><stop offset="1" stop-color="#EFA85F"/></radialGradient>'+
      '<linearGradient id="'+id+'-moon" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFDEF"/><stop offset=".57" stop-color="#E7E1D6"/><stop offset="1" stop-color="#BBC1C8"/></linearGradient>'+
      '<radialGradient id="'+id+'-glow"><stop stop-color="#FFE7AD" stop-opacity=".3"/><stop offset="1" stop-color="#FFE7AD" stop-opacity="0"/></radialGradient>'+
      '<clipPath id="'+id+'-clip"><circle cx="50" cy="50" r="47"/></clipPath>'+
      '</defs>';
    const sun=t.moon?'':(
      '<circle cx="'+t.sunX+'" cy="'+t.sunY+'" r="'+(t.sunR*2.2)+'" fill="url(#'+id+'-glow)"/>'+
      '<circle cx="'+t.sunX+'" cy="'+t.sunY+'" r="'+t.sunR+'" fill="url(#'+id+'-sun)"/>'
    );
    const moon=t.moon?(
      '<path d="M65 20a17.5 17.5 0 1 0 11 29A17 17 0 0 1 65 20Z" fill="url(#'+id+'-moon)"/>'+
      '<circle cx="26" cy="25" r="1.1" fill="#DDE7F3" opacity=".8"/>'+
      '<circle cx="38" cy="38" r=".75" fill="#DDE7F3" opacity=".65"/>'+
      '<circle cx="80" cy="23" r=".8" fill="#DDE7F3" opacity=".8"/>'
    ):'';
    const horizon=t.moon?84:phase==='dhuhr'?90:phase==='asr'?85:75;
    const cloudColor=t.moon?'#A2B0C7':'#FFF0DE';
    prayerSymbol.innerHTML='<svg viewBox="0 0 100 100" width="72" height="72" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'+defs+
      '<g clip-path="url(#'+id+'-clip)">'+
        '<circle cx="50" cy="50" r="47" fill="url(#'+id+'-sky)"/>'+
        sun+moon+
        '<path d="M3 66c14-7 25 3 40-1 20-5 36-7 54-1v10c-17-4-32 5-51 4C25 76 15 80 3 76Z" fill="'+cloudColor+'" opacity="'+(t.moon?.15:.32)+'"/>'+
        '<path d="M3 '+horizon+'q24-4 47 0t47-2v30H3Z" fill="'+t.land+'" opacity=".77"/>'+
        '<path d="M3 '+(horizon+10)+'q24-4 47 0t47-3v24H3Z" fill="#26394B" opacity=".52"/>'+
        '<circle cx="50" cy="50" r="46.5" stroke="#FFFFFF" stroke-width=".9" stroke-opacity=".34"/>'+
      '</g></svg>';
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
      return Object.fromEntries(['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Sunset','Isha'].map(k=>[k,dhakaTimestamp(day,t[k])]));
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
    // The Hanafi prohibited periods are related to the sun's position, not
    // three identical fixed prayer intervals. Use the API's solar events.
    // Sunrise / sunset margins are conservative twenty-minute approximations.
    // Zenith follows the midpoint of sunrise and sunset, capped at Dhuhr.
    const minute=60000;
    const sunset=Number.isFinite(t.Sunset)?t.Sunset:t.Maghrib;
    const solarNoon=(t.Sunrise+sunset)/2;
    const middayEnd=Math.min(t.Dhuhr,solarNoon+5*minute);
    const prohibited=[
      {start:t.Sunrise,end:t.Sunrise+20*minute,title:'সূর্যোদয়ের নিষিদ্ধ সময়'},
      {start:solarNoon-5*minute,end:middayEnd,title:'মধ্যাহ্নের নিষিদ্ধ সময়'},
      {start:sunset-20*minute,end:sunset,title:'সূর্যাস্তের নিষিদ্ধ সময়'}
    ].find(x=>x.end>x.start&&now>=x.start&&now<x.end);
    warning.hidden=!prohibited;
    if(prohibited){
      $('prayer-warning-title').textContent=prohibited.title;
      $('prayer-warning-description').textContent='শেষ হতে '+displayDuration(prohibited.end-now)+' বাকি';
    }
    let title,caption,end,phase;
    if(now<t.Fajr){phase='isha';title='এশা';caption='ফজর শুরু হতে বাকি';end=t.Fajr;}
    else if(now<t.Sunrise){phase='fajr';title='ফজর';caption='সূর্যোদয় হতে বাকি';end=t.Sunrise;}
    else if(now<t.Dhuhr){phase='sunrise';title='এখন কোনো ফরজ নামাজের ওয়াক্ত নয়';caption='যোহর শুরু হতে বাকি';end=t.Dhuhr;}
    else if(now<t.Asr){phase='dhuhr';title='যোহর';caption='আসর শুরু হতে বাকি';end=t.Asr;}
    else if(now<t.Maghrib){phase='asr';title='আসর';caption='মাগরিব শুরু হতে বাকি';end=t.Maghrib;}
    else if(now<t.Isha){phase='maghrib';title='মাগরিব';caption='এশা শুরু হতে বাকি';end=t.Isha;}
    else {phase='isha';title='এশা';caption='পরবর্তী ফজর শুরু হতে বাকি';end=tm.Fajr;}
    showPrayerIcon(prohibited && prohibited.title==='সূর্যাস্তের নিষিদ্ধ সময়' ? 'maghrib' : phase);
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