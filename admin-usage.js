'use strict';
(()=>{const $=s=>document.querySelector(s),base=(window.WALID_AI_API||'').replace(/\/$/,''),key='walidAdminAccess';let token=sessionStorage.getItem(key)||'',busy=false;
const number=n=>Number(n||0).toLocaleString(),duration=n=>{n=Math.round(n||0);return `${Math.floor(n/3600)}h ${Math.floor(n%3600/60)}m`},label=s=>({home:'Homepage',chat:'AI Chat',education:'Education',islam:'Al-Quran & Islam',jobs:'Government Jobs',sports:'Sports',history:'History',others:'History & Literature',tools_pdf:'PDF Tools',tools_image:'Image Tools',sections:'Explore Sections',games:'Games',site_info:'Information pages'}[s]||String(s).replace(/^(game|tool)_/,'').replaceAll('_',' '));
function card(name,value){
 const box=document.createElement('div'),title=document.createElement('div'),amount=document.createElement('div');
 box.className='card';title.className='label';title.textContent=name;amount.className='big';amount.textContent=value;
 if(name==='Most active feature'){
   box.classList.add('top-feature-card');
   const toggle=document.createElement('button'),arrow=document.createElement('span');
   toggle.type='button';toggle.id='top-feature-toggle';toggle.className='top-feature-toggle';
   toggle.setAttribute('aria-controls','top-five-features');toggle.setAttribute('aria-expanded','false');
   toggle.setAttribute('aria-label','Most active feature: '+value+'. Show top 5 most active features');
   arrow.className='top-feature-arrow';arrow.textContent='View top 5 ↓';
   toggle.append(title,amount,arrow);
   toggle.onclick=()=>setTopFiveOpen($('#top-five-features').classList.contains('hidden'));
   box.append(toggle);
 }else box.append(title,amount);
 $('#stats').append(box);
}
function setTopFiveOpen(open){
 const panel=$('#top-five-features'),toggle=$('#top-feature-toggle');
 if(!panel||!toggle)return;
 panel.classList.toggle('hidden',!open);
 toggle.setAttribute('aria-expanded',String(open));
 toggle.querySelector('.top-feature-arrow').textContent=open?'Hide top 5 ↑':'View top 5 ↓';
}
function topFive(features){
 return [...(features||[])].filter(item=>item&&(
   Number(item.active_seconds)>0||Number(item.views)>0||Number(item.starts)>0||Number(item.answers)>0
 )).sort((a,b)=>(Number(b.active_seconds||0)-Number(a.active_seconds||0))||
   (Number(b.views||0)-Number(a.views||0))||
   (Number(b.starts||0)-Number(a.starts||0))).slice(0,5);
}
function renderTopFive(ranked){
 const list=$('#top-five-list');
 if(!list)return;
 list.replaceChildren();setTopFiveOpen(false);
 if(!ranked.length){
   const li=document.createElement('li');li.textContent='No activity recorded yet.';list.append(li);return;
 }
 ranked.forEach((item,index)=>{
   const li=document.createElement('li'),rank=document.createElement('span'),description=document.createElement('div');
   const name=document.createElement('strong'),meta=document.createElement('small');
   rank.className='rank-number';rank.textContent=String(index+1).padStart(2,'0');
   name.textContent=window.WalidSectionMetrics?.label(item.feature)||label(item.feature);
   meta.textContent='Active time: '+duration(item.active_seconds)+' · Visitors ≈ '+number(item.visitors)+' · Views: '+number(item.views);
   description.append(name,meta);li.append(rank,description);list.append(li);
 });
}
function table(host,headers,rows){host.replaceChildren();if(!rows.length){host.textContent='No activity recorded yet.';return}const wrap=document.createElement('div'),t=document.createElement('table'),head=document.createElement('tr');wrap.className='table-wrap';for(const title of headers){const th=document.createElement('th');th.scope='col';th.textContent=title;head.append(th)}const thead=document.createElement('thead');thead.append(head);t.append(thead);const body=document.createElement('tbody');for(const values of rows){const tr=document.createElement('tr');for(const value of values){const td=document.createElement('td');td.textContent=value;tr.append(td)}body.append(tr)}t.append(body);wrap.append(t);host.append(wrap)}
async function load(){if(busy)return;busy=true;const requestToken=token;$('#status').textContent='Loading…';try{const headers={Authorization:'Bearer '+token};const response=await fetch(base+'/api/admin/usage?days='+$('#period').value,{headers,cache:'no-store'});if(response.status===401||response.status===403)throw Error('Check your admin access key.');if(!response.ok)throw Error('Usage storage is unavailable. Try again shortly.');const d=await response.json();if(token!==requestToken)return;$('#login').classList.add('hidden');$('#auth-screen').classList.add('hidden');$('#workspace-shell').classList.remove('hidden');document.body.classList.remove('admin-locked');$('#dashboard').classList.remove('hidden');$('#exit').classList.remove('hidden');$('#date').textContent=d.date+' · Asia/Dhaka';$('#stats').replaceChildren();const ranked=topFive(d.features);[
['Total visitors (estimated browsers)',number(d.lifetime.visitors)],['Visitors today (estimated)',number(d.today.visitors)],['Visitors in period (estimated)',number(d.period.visitors)],['Page views in period',number(d.period.views)],['Active time in period',duration(d.period.active_seconds)],['Most played game (starts)',(window.WalidSectionMetrics?.label(d.features.filter(x=>x.feature.startsWith('game_')&&x.starts>0).sort((a,b)=>b.starts-a.starts)[0]?.feature||'No data')||'No data')],['Most active feature',(window.WalidSectionMetrics?.label(ranked[0]?.feature||'No data')||'No data')],['API calls in period',number(Object.values(d.api).reduce((n,x)=>n+x.calls,0))]
].forEach(x=>card(...x));renderTopFive(ranked);const storage=$('#storage');storage.classList.toggle('warning',!d.storage.durable||!!d.storage.last_error);storage.textContent=d.storage.durable?'Persistent storage: Firebase Firestore.':'Temporary storage: Render can erase these counts on redeploy/restart. Configure the server Firebase credential to retain analytics.';if(d.storage.mode==='temporary_invalid_firebase_configuration')storage.textContent+=' Firebase credential configuration is invalid.';if(d.storage.last_error)storage.textContent+=' Storage error: '+d.storage.last_error;if(d.storage.dropped_server_events)storage.textContent+=' Dropped server events: '+d.storage.dropped_server_events;
table($('#daily'),['Date','Estimated visitors','Views','Active time'],d.daily.map(x=>[x.date,number(x.visitors),number(x.views),duration(x.active_seconds)]));
window.WalidSectionMetrics.render($('#features'),d);
const regionRows=Object.entries(d.countries).sort((a,b)=>b[1].views-a[1].views).map(([name,x])=>[name==='BD'?'Bangladesh (BD)':name,number(x.views),duration(x.active_seconds)]);for(const [name,x]of Object.entries(d.divisions))regionRows.push(['BD · '+name,number(x.views),duration(x.active_seconds)]);table($('#regions'),['Region','Views','Active time'],regionRows);
table($('#api'),['Provider','Calls','Errors','Reported input tokens','Reported output tokens','Latest quota headers'],Object.entries(d.api).map(([name,x])=>{const snap=d.provider_snapshots[name],remaining=snap?.rate_limits||{};return[name,number(x.calls),number(x.errors),x.token_usage_reported_calls?number(x.input_tokens)+' ('+x.token_usage_reported_calls+'/'+x.calls+' calls)':'Unknown',x.token_usage_reported_calls?number(x.output_tokens)+' ('+x.token_usage_reported_calls+'/'+x.calls+' calls)':'Unknown',Object.keys(remaining).length?Object.entries(remaining).map(([k,v])=>k.replace('x-ratelimit-','').replaceAll('-',' ')+': '+v).join(' · ')+' (observed '+snap.observed_at+')':'Remaining quota unknown']}));$('#status').textContent='';
window.dispatchEvent(new CustomEvent('walid-admin-authenticated'));
try{const help=await fetch(base+'/api/admin/help',{headers});if(help.ok&&token===requestToken){const data=await help.json();if(token!==requestToken)return;renderHelp(data.reports||[])}}catch{$('#helpInbox').textContent='Help inbox temporarily unavailable.'}
}catch(e){$('#status').textContent=e.message;if(e.message.startsWith('Check')){$('#workspace-shell').classList.add('hidden');$('#auth-screen').classList.remove('hidden');$('#login').classList.remove('hidden');document.body.classList.add('admin-locked');$('#dashboard').classList.add('hidden');$('#exit').classList.add('hidden');sessionStorage.removeItem(key);token='';window.dispatchEvent(new CustomEvent('walid-admin-signed-out'))}else if($('#workspace-shell').classList.contains('hidden')){$('#auth-screen').classList.remove('hidden');$('#login').classList.remove('hidden')}}finally{busy=false}}
function renderHelp(records){const host=$('#helpInbox');host.replaceChildren();if(!records.length){host.textContent='No help messages.';return}for(const x of records){const item=document.createElement('article'),time=document.createElement('time'),message=document.createElement('p');item.className='report';time.textContent=new Date(x.received_at).toLocaleString();message.className='report-message';message.textContent=x.message||'';item.append(time,message);host.append(item)}}
$('#top-five-close')?.addEventListener('click',()=>{setTopFiveOpen(false);$('#top-feature-toggle')?.focus()});
$('#enter').onclick=()=>{token=$('#key').value.trim();if(!token){$('#status').textContent='Enter your admin key.';return}sessionStorage.setItem(key,token);$('#key').value='';void load()};$('#key').addEventListener('keydown',e=>{if(e.key==='Enter')$('#enter').click()});$('#refresh').onclick=load;$('#period').onchange=load;$('#exit').onclick=()=>{sessionStorage.removeItem(key);token='';$('#dashboard').classList.add('hidden');$('#exit').classList.add('hidden');$('#workspace-shell').classList.add('hidden');$('#auth-screen').classList.remove('hidden');$('#login').classList.remove('hidden');document.body.classList.add('admin-locked');$('#key').value='';window.dispatchEvent(new CustomEvent('walid-admin-signed-out'));$('#status').textContent=''};if(token)void load();})();
