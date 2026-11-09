/* Aggregate usage only. Never reads message text, file names, account details or form values. */
(()=>{'use strict';
if(window.WalidUsage)return;
// Local previews and automated game checks must not send production visitor traffic.
if(['localhost','127.0.0.1','::1'].includes(location.hostname)&&window.WALID_USAGE_TEST_ENABLED!==true)return;
const disabled=()=>navigator.doNotTrack==='1'||navigator.globalPrivacyControl===true||localStorage.getItem('walidUsageOptOut')==='1';
try{if(disabled())return}catch{return}
const toolMap={'merge-pdf':'merge_pdf','split-pdf':'split_pdf','compress-pdf':'compress_pdf','pdf-word':'pdf_to_word','pdf-to-word':'pdf_to_word','image-resize':'resize_image','image-compress':'compress_image','image-convert':'convert_image','background-remove':'background_remover','signature-remove':'signature_remover','watermark-remove':'watermark_remover'};
const id=()=>crypto.randomUUID?.()||'event-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
const toolFeature=t=>toolMap[t]?'tool_'+toolMap[t]:null;
if(window.top!==window){let lastSignal=0;for(const name of ['pointerdown','keydown','scroll'])addEventListener(name,()=>{if(Date.now()-lastSignal>5000){lastSignal=Date.now();parent.postMessage({type:'walid-usage-activity'},location.origin)}},{passive:true});window.WalidUsage={tool(event,tool){const feature=toolFeature(tool);if(feature)parent.postMessage({type:'walid-usage-tool',event,feature},location.origin)}};return}
let visitor;try{visitor=localStorage.getItem('walidGuestId');if(!visitor){visitor=id();localStorage.setItem('walidGuestId',visitor)}}catch{return}
const path=location.pathname,game=path.match(/^\/games\/(riddlex|ludo|chess|penalty|tic-tac-toe|snakes-and-ladders|2048|snake)(?:\/|$)/)?.[1];
let feature=path==='/tool-workspace.html'?(toolFeature(new URLSearchParams(location.search).get('tool'))||'tools'):game?'game_'+game.replaceAll('-','_'):path.includes('/tools/')?'tool_'+path.split('/')[2].replaceAll('-','_'):path==='/tools.html'?'tools':path==='/games.html'||path==='/games/'||path==='/games/index.html'?'games':path==='/zip.html'?'tool_'+(location.hash.includes('extract')?'extract_zip':'create_zip'):path==='/'||path==='/index.html'?'chat':'site_info';
let country='Unknown',division='Unknown',queue=[],sending=false,retryAt=0,retryDelay=5000,seconds=0,lastTick=performance.now(),lastInteraction=Date.now();
const endpoint=(window.WALID_AI_API||'https://walid-ai-backend.onrender.com').replace(/\/$/,'')+'/api/usage';
function backoff(){retryAt=Date.now()+retryDelay;retryDelay=Math.min(300000,retryDelay*2)}
async function flush(){if(sending||!queue.length||disabled()||Date.now()<retryAt)return;sending=true;try{while(queue.length){const item=queue[0];const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item),keepalive:true,credentials:'omit',signal:AbortSignal.timeout(4000)});if(!response.ok){if(response.status>=500||response.status===429){backoff();break;}queue.shift();continue}queue.shift();retryAt=0;retryDelay=5000}}catch{backoff()}finally{sending=false}}
function event(name,selected=feature,active=0){if(disabled())return;queue.push({event:name,feature:selected,visitor_id:visitor,event_id:id(),active_seconds:active,country,division});if(queue.length>40)queue.shift();void flush()}
function heartbeat(){if(seconds>0){event('active_time',feature,Math.min(65,seconds));seconds=0}}
window.WalidUsage={event,tool(name,tool){const selected=toolFeature(tool);if(selected)event(name,selected)},optOut(){heartbeat();localStorage.setItem('walidUsageOptOut','1');queue=[]}};
addEventListener('message',e=>{if(e.origin!==location.origin||!['walid-usage-tool','walid-usage-activity'].includes(e.data?.type))return;if(![...document.querySelectorAll('iframe')].some(f=>f.contentWindow===e.source))return;if(e.data.type==='walid-usage-activity'){lastInteraction=Date.now();return;}if(!['tool_start','tool_success','tool_error'].includes(e.data.event)||!Object.values(toolMap).includes(String(e.data.feature).replace(/^tool_/,'')))return;event(e.data.event,e.data.feature)});
for(const name of ['pointerdown','keydown','scroll'])addEventListener(name,()=>{lastInteraction=Date.now()},{passive:true});
setInterval(()=>{const now=performance.now(),elapsed=Math.min(5,(now-lastTick)/1000);lastTick=now;if(document.visibilityState==='visible'&&document.hasFocus()&&Date.now()-lastInteraction<60000)seconds+=elapsed;if(seconds>=55)heartbeat();void flush()},5000);
document.addEventListener('visibilitychange',()=>{if(document.hidden)heartbeat();lastTick=performance.now()});
addEventListener('pagehide',()=>{heartbeat();if(!disabled())for(const item of queue.slice(0,5))navigator.sendBeacon?.(endpoint,new Blob([JSON.stringify(item)],{type:'application/json'}))});
let penaltyStarted=false;
if(game){const selectors={'ludo':'#start-game','riddlex':'#play, #new','chess':'#start','tic-tac-toe':'#start','snakes-and-ladders':'#start','2048':'#start, [data-action="restart"]','penalty':'#restart'};document.addEventListener('click',e=>{if(e.target.closest(selectors[game]||'[data-usage-start]')){event('game_start');penaltyStarted=game==='penalty'}else if(game==='penalty'&&!penaltyStarted&&e.target.closest('#actions button')){penaltyStarted=true;event('game_start')}})}
addEventListener('hashchange',()=>{if(path==='/zip.html'){heartbeat();feature='tool_'+(location.hash.includes('extract')?'extract_zip':'create_zip')}});
(async()=>{try{const cached=JSON.parse(sessionStorage.getItem('walidUsageRegion')||'null');if(cached&&Date.now()-cached.time<86400000){country=cached.country;division=cached.division}else{const response=await fetch('https://get.geojs.io/v1/ip/geo.json',{credentials:'omit',signal:AbortSignal.timeout(2500)});if(response.ok){const data=await response.json();country=/^[A-Z]{2}$/.test(data.country_code)?data.country_code:'Unknown';division=country==='BD'?String(data.region||'Unknown').replace(/ Division$/i,''):'Unknown';sessionStorage.setItem('walidUsageRegion',JSON.stringify({country,division,time:Date.now()}))}}}catch{}event('page_view')})();
})();
