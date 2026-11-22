/* Owner-only unified operations interface. Every result is from an authenticated backend. */
(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const base = (window.WALID_AI_API || '').replace(/\/$/, '');
  const roles = [
    {id:'manager', name:'Manager', desc:'Coordination and delegation', icon:'◇'},
    {id:'monitor', name:'IT Technician', desc:'Real website and backend checks', icon:'◉'},
    {id:'security', name:'Cyber Security Engineer', desc:'Security-header inspection', icon:'⬡'},
    {id:'code', name:'CSE Engineer', desc:'GitHub inspection and proposals', icon:'⌘'},
    {id:'mail', name:'Admin Staff', desc:'Read-only mail when authorized', icon:'✉'}
  ];
  const selected='manager';
  let currentTab='dashboard', busy=false, ready=false, previousManagerFocus=null;
  // Private Help messages are displayed only for this session, never localStorage.
  const transientHelp=new Map();
  const CHAT_RETENTION_MS=3*24*60*60*1000;
  let managerNotices=[],lastManagerTasks=[],chatView='manager',selectedStaffRole=null;
  const NOTICE_SEEN_KEY='walid-manager-notice-ids';
  function seenNotices(){
    try{
      const items=JSON.parse(sessionStorage.getItem(NOTICE_SEEN_KEY)||'[]');
      return Array.isArray(items)?items.filter(x=>typeof x==='string').slice(-100):[];
    }catch{return []}
  }
  function updateNoticeHead(){
    const head=$('#manager-chat-head');if(!head||!ready)return;
    const seen=new Set(seenNotices());
    const unread=managerNotices.filter(n=>n?.id&&!seen.has(n.id)).length;
    head.dataset.unread=unread?'true':'false';
    head.setAttribute('aria-label',unread?'Open Manager chat, '+unread+' unread messages':'Open Manager chat');
    head.title=unread?'Manager-এর '+unread+'টি নতুন বার্তা':'Chat with Manager';
  }
  function acknowledgeNotices(){
    const saved=new Set(seenNotices());
    managerNotices.forEach(n=>{if(n?.id)saved.add(n.id)});
    try{sessionStorage.setItem(NOTICE_SEEN_KEY,JSON.stringify([...saved].slice(-100)))}catch{}
    updateNoticeHead();
  }
  function positionChatHead(){
    const head=$('#manager-chat-head'),anchor=$('#sidebar-toggle');
    if(!head||!anchor||!ready)return;
    const anchorBox=anchor.getBoundingClientRect();
    const headSize=head.getBoundingClientRect().width||52;
    const x=Math.max(8,Math.min(innerWidth-headSize-8,anchorBox.left+anchorBox.width/2-headSize/2));
    let centerY=innerHeight*.49;
    if(currentTab==='staff'){
      try{
        const frame=$('#preserved-staff-office'),desk=frame?.contentDocument?.querySelector('.desk.manager');
        if(desk){
          const frameBox=frame.getBoundingClientRect(),deskBox=desk.getBoundingClientRect();
          const measured=frameBox.top+deskBox.top+deskBox.height/2;
          if(measured>115&&measured<innerHeight-65)centerY=measured;
        }
      }catch{/* Keep the independent floating head at its safe fallback position. */}
    }
    head.style.left=Math.round(x)+'px';
    head.style.top=Math.round(Math.max(95,Math.min(innerHeight-headSize-12,centerY-headSize/2)))+'px';
  }
  function fitComposer(){
    const input=$('#ops-input');if(!input)return;
    input.style.height='auto';
    input.style.height=Math.min(150,Math.max(40,input.scrollHeight))+'px';
  }
  const fmt = date => {
    const instant=new Date(date);
    if(!Number.isFinite(instant.getTime()))return String(date||'');
    const format=new Intl.DateTimeFormat('en-GB',{
      timeZone:'Asia/Dhaka',day:'2-digit',month:'2-digit',year:'numeric',
      weekday:'long',hour:'numeric',minute:'2-digit',second:'2-digit',hour12:true
    });
    const parts=Object.fromEntries(format.formatToParts(instant)
      .filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
    return parts.day+'-'+parts.month+'-'+parts.year+', '+parts.weekday+', '+
      parts.hour+':'+parts.minute+':'+parts.second+' '+(parts.dayPeriod||'').toUpperCase();
  };
  const token = () => sessionStorage.getItem('walidAdminAccess') || '';
  const auth = () => ({Authorization:'Bearer '+token()});
  const panels = ['dashboard','staff-workspace','riddlex-workspace'];
  const tabNames = {dashboard:'dashboard',staff:'staff-workspace',riddlex:'riddlex-workspace'};
  function setSidebarOpen(open){
    const shell=$('#workspace-shell'),button=$('#sidebar-toggle'),details=$('#sidebar-details');
    if(!shell||!button||!details)return;
    shell.classList.toggle('nav-expanded',Boolean(open));
    button.setAttribute('aria-expanded',String(Boolean(open)));
    button.setAttribute('aria-label',open?'Close sidebar':'Open sidebar');
    button.setAttribute('title',open?'Close menu':'Open menu');
    details.setAttribute('aria-hidden',String(!open));
  }
  function openManagerChat(){
    if(!ready)return;
    // This is a Messenger-style overlay: opening it never changes the active Admin tab.
    const panel=$('#manager-chat-panel');if(!panel)return;
    setSidebarOpen(false);
    previousManagerFocus=document.activeElement;
    panel.inert=false;
    panel.setAttribute('aria-hidden','false');
    panel.classList.add('is-open');
    $('#manager-chat-backdrop').hidden=false;
    document.body.classList.add('manager-chat-open');
    $('#manager-chat-head')?.setAttribute('aria-expanded','true');
    positionChatHead();
    showChatView('manager');
    $('#ops-input')?.focus();
    fitComposer();
    void loadHistory();
  }
  function closeManagerChat(){
    const panel=$('#manager-chat-panel');if(!panel)return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden','true');
    panel.inert=true;
    $('#manager-chat-backdrop').hidden=true;
    document.body.classList.remove('manager-chat-open');
    $('#manager-chat-head')?.setAttribute('aria-expanded','false');
    if(previousManagerFocus?.isConnected)previousManagerFocus.focus();
    previousManagerFocus=null;
  }
  function status(text, bad=false) {
    for(const selector of ['#manager-chat-status']){
      const el=$(selector);if(el){el.textContent=text;el.dataset.error=bad?'true':'false'}
    }
  }
  function selectTab(tab, writeHash=true) {
    if(!tabNames[tab])tab='dashboard';
    currentTab=tab;
    if(writeHash)setSidebarOpen(false); // Section state is internal; the URL always stays /admin/.
    if(!ready)return;
    panels.forEach(id=>$('#'+id)?.classList.toggle('hidden',tabNames[tab]!==id));
    document.querySelectorAll('[data-admin-tab]').forEach(button=>{
      const on=button.dataset.adminTab===tab;
      button.setAttribute('aria-current',on?'page':'false');
      button.setAttribute('aria-selected',String(on));
    });
    if(tab==='staff'){
      const frame=$('#preserved-staff-office');
      if(frame&&!frame.getAttribute('src'))frame.setAttribute('src',frame.dataset.src+'?embedded=20261122-footerfix');
      void loadHistory();
    }
    if(tab==='riddlex')window.WalidAdminApprovals?.activate();
    requestAnimationFrame(positionChatHead);
  }
  function appendMessage(container,kind,heading,body,extra=''){
    const bubble=document.createElement('article');
    bubble.className='ops-message '+kind;
    const name=document.createElement('strong');name.textContent=heading;
    const text=document.createElement('p');text.textContent=body||'যাচাই করা উত্তর পাওয়া যায়নি।';
    bubble.append(name,text);
    if(extra){const meta=document.createElement('small');meta.textContent=extra;bubble.append(meta)}
    container.append(bubble);return bubble;
  }
  function staffMessages(roleId){
    const cutoff=Date.now()-CHAT_RETENTION_MS;
    const messages=[];
    for(const task of lastManagerTasks){
      if(task?.role!=='manager'||Date.parse(task.created_at||'')<cutoff)continue;
      for(const entry of task.result?.delegations||[]){
        if(!entry||entry.role!==roleId)continue;
        messages.push({
          sent:task.created_at,
          received:entry.checked_at||task.updated_at||task.created_at,
          command:entry.instruction,
          outcome:entry.outcome,
          status:entry.status,
        });
      }
    }
    // Read-only daily audits are actual role checks, not fabricated AI dialogue.
    for(const notice of managerNotices){
      if(notice?.kind!=='daily_report'||!Array.isArray(notice.daily_delegations)||
         Date.parse(notice.created_at||'')<cutoff)continue;
      for(const work of notice.daily_delegations){
        if(!work||work.role!==roleId)continue;
        messages.push({
          sent:notice.created_at,
          received:work.checked_at||notice.created_at,
          command:work.instruction||'Read-only daily verification',
          outcome:work.outcome||'যাচাইয়ের ফল পাওয়া যায়নি।',
          status:work.status||'unknown',
          daily:true,
        });
      }
    }
    return messages.sort((a,b)=>String(a.sent).localeCompare(String(b.sent)));
  }
  function renderStaffList(){
    const host=$('#manager-staff-list');if(!host)return;
    host.replaceChildren();
    for(const role of roles.filter(item=>item.id!=='manager')){
      const entries=staffMessages(role.id);
      const button=document.createElement('button');
      button.type='button';button.className='manager-staff-choice';
      const titleBox=document.createElement('span');
      const name=document.createElement('strong');name.textContent=role.name;
      const caption=document.createElement('small');
      caption.textContent=entries.length
        ?'সর্বশেষ কাজ: '+fmt(entries.at(-1).received)
        :'এখনো কোনো সংরক্ষিত কাজের কথোপকথন নেই';
      const arrow=document.createElement('span');arrow.className='chevron';arrow.textContent='›';
      titleBox.append(name,caption);button.append(titleBox,arrow);
      button.addEventListener('click',()=>showChatView('thread',role.id));
      host.append(button);
    }
  }
  function renderStaffThread(roleId){
    const host=$('#manager-staff-thread');if(!host)return;
    host.replaceChildren();
    const role=roles.find(item=>item.id===roleId);
    const entries=staffMessages(roleId);
    if(!entries.length){
      const empty=document.createElement('p');empty.className='manager-chat-no-history';
      empty.textContent='এই কর্মীর সঙ্গে এখনো কোনো যাচাইকৃত কাজের বার্তা নেই।';
      host.append(empty);return;
    }
    for(const entry of entries){
      if(entry.command){
        appendMessage(host,'question',(entry.daily?'Manager · দৈনিক পর্যবেক্ষণ · ':'Manager · ')+fmt(entry.sent),entry.command);
      }
      appendMessage(host,'answer',(role?.name||'Staff')+' · '+fmt(entry.received),
        entry.outcome||'এই কাজের যাচাইকৃত ফল এখনো পাওয়া যায়নি।',
        entry.status&&entry.status!=='completed'?entry.status:'');
    }
    host.scrollTop=host.scrollHeight;
    requestAnimationFrame(()=>{if(host.isConnected)host.scrollTop=host.scrollHeight});
  }
  function showChatView(view,roleId=null){
    if(!['manager','list','thread'].includes(view))view='manager';
    if(view==='thread'&&!roles.some(item=>item.id===roleId&&item.id!=='manager'))view='list';
    chatView=view;selectedStaffRole=view==='thread'?roleId:null;
    $('#ops-history').hidden=view!=='manager';
    $('#manager-staff-list').hidden=view!=='list';
    $('#manager-staff-thread').hidden=view!=='thread';
    $('.manager-chat-compose').hidden=view!=='manager';
    $('#manager-thread-back').hidden=view==='manager';
    $('#manager-thread-back').setAttribute('aria-label',view==='thread'?'Back to Staff chats':'Back to Manager');
    $('#manager-staff-chats').hidden=view!=='manager';
    const role=roles.find(item=>item.id===roleId);
    $('#ops-role-name').textContent=view==='manager'?'Manager':view==='list'?'Staff chats':role?.name||'Staff';
    $('#ops-role-description').textContent=view==='manager'?'Walid AI · Private Office'
      :view==='list'?'Manager-এর কর্মীদের সঙ্গে কথোপকথন':'Manager-এর সঙ্গে কাজের বার্তা';
    if(view==='list')renderStaffList();
    if(view==='thread')renderStaffThread(roleId);
    if(view==='manager'){
      const host=$('#ops-history');
      host.scrollTop=host.scrollHeight;
      $('#ops-input')?.focus();
    }else{$('#manager-thread-back')?.focus()}
  }
  function renderHistory(tasks,notices=managerNotices){
    const host=$('#ops-history');host.replaceChildren();
    const cutoff=Date.now()-CHAT_RETENTION_MS;
    const filtered=(Array.isArray(tasks)?tasks:[])
      .filter(item=>item?.role==='manager'&&Date.parse(item.created_at||'')>=cutoff)
      .sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||'')).slice(-65);
    const taskIds=new Set(filtered.map(item=>item.id));
    const messageItems=filtered.map(task=>({type:'task',created_at:task.created_at,task}));
    for(const notice of Array.isArray(notices)?notices:[]){
      if(!notice?.id||Date.parse(notice.created_at||'')<cutoff)continue;
      if(notice.task_id&&taskIds.has(notice.task_id))continue; // No duplicate alert next to its failed command.
      messageItems.push({type:'notice',created_at:notice.created_at,notice});
    }
    messageItems.sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||''));
    if(!messageItems.length){
      const greeting=appendMessage(host,'answer','Manager',
        'আসসালামু আলাইকুম, স্যার।');
      greeting.classList.add('manager-chat-greeting');
      host.scrollTop=host.scrollHeight;
      return;
    }
    for(const item of messageItems){
      if(item.type==='notice'){
        const notice=item.notice;
        const bubble=appendMessage(host,'answer','Manager · '+fmt(notice.created_at),
          (notice.kind==='daily_report'
            ?String(notice.message||'').replace(/\\n/g,'\n')
            :notice.message)||'একটি নতুন অফিস বার্তা এসেছে।');
        bubble.classList.add('manager-chat-notice');
        if(notice.kind==='alert')bubble.classList.add('manager-chat-alert');
        if(typeof notice.source_url==='string'&&/^https:\/\/github\.com\/walidibnwhakil\/walid-ai-(?:website|backend)\/actions\/runs\/\d+$/.test(notice.source_url)){
          const link=document.createElement('a');link.href=notice.source_url;link.target='_blank';link.rel='noopener noreferrer';
          link.textContent='যাচাইয়ের রিপোর্ট';bubble.append(link);
        }
        continue;
      }
      const task=item.task;
      appendMessage(host,'question','আপনি · '+fmt(task.created_at),task.instruction||task.title||'');
      const result=task.result||{};
      const bubble=appendMessage(host,'answer','Manager · '+fmt(result.checked_at||task.updated_at),
        result.answer||(task.status==='running'?'আপনার নির্দেশ যাচাই করা হচ্ছে…':'এই অনুরোধের যাচাইকৃত উত্তর পাওয়া যায়নি।'),
        ['queued','running'].includes(task.status)?'প্রক্রিয়াধীন':'');
      // Private Help text stays in this owner's session and appears only when
      // the owner actually requested Help; no technical storage disclaimer.
      const recentHelp=transientHelp.get(task.id)||[];
      if(recentHelp.length){
        const detail=recentHelp.map(row=>'Help মেসেজ ('+fmt(row.received_at)+'): '+(row.message||'(খালি মেসেজ)')).join('\n');
        const text=bubble.querySelector('p');
        if(text)text.textContent+='\n'+detail;
      }
    }
    // Always open on the newest message; older messages remain scrollable above.
    host.scrollTop=host.scrollHeight;
    requestAnimationFrame(()=>{if(host.isConnected)host.scrollTop=host.scrollHeight});
  }
  async function request(path,init={}){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),55000);
    try{
      const response=await fetch(base+path,{cache:'no-store',...init,headers:{...auth(),...(init.headers||{})},signal:controller.signal});
      let body={};try{body=await response.json()}catch{}
      if(!response.ok)throw Error(body.error||'Request failed ('+response.status+').');
      return body;
    }finally{clearTimeout(timer)}
  }
  async function loadHistory(){
    if(!ready)return;
    try{
      const [data,brief]=await Promise.all([
        request('/api/admin/tasks'),
        request('/api/admin/manager/notices').catch(()=>({notices:managerNotices})),
      ]);
      lastManagerTasks=data.tasks||[];
      managerNotices=Array.isArray(brief.notices)?brief.notices:[];
      renderHistory(lastManagerTasks,managerNotices);
      if(chatView==='list')renderStaffList();
      if(chatView==='thread')renderStaffThread(selectedStaffRole);
      if($('#manager-chat-panel')?.classList.contains('is-open'))acknowledgeNotices();
      else updateNoticeHead();
    }catch(error){status('চ্যাটের আগের বার্তা দেখানো যাচ্ছে না: '+error.message,true)}
  }
  async function refreshNotices(){
    if(!ready)return;
    try{
      const brief=await request('/api/admin/manager/notices');
      managerNotices=Array.isArray(brief.notices)?brief.notices:[];
      updateNoticeHead();
      if($('#manager-chat-panel')?.classList.contains('is-open')){
        renderHistory(lastManagerTasks,managerNotices);
        if(chatView==='list')renderStaffList();
        if(chatView==='thread')renderStaffThread(selectedStaffRole);
        acknowledgeNotices();
      }
    }catch{/* A monitoring outage must not interrupt the owner's conversation. */}
  }
  async function submit(){
    if(!ready||busy)return;
    const input=$('#ops-input'),instruction=input.value.trim();
    if(!instruction){status('Manager-কে একটি নির্দেশ লিখুন।',true);return}
    if(instruction.length>2000){status('প্রতি বার্তার সর্বোচ্চ দৈর্ঘ্য ২,০০০ অক্ষর।',true);return}
    busy=true;$('#ops-send').disabled=true;
    input.value='';fitComposer();
    const host=$('#ops-history');
    host.querySelector('.manager-chat-greeting')?.remove();
    appendMessage(host,'question','আপনি · '+fmt(new Date().toISOString()),instruction);
    const pending=appendMessage(host,'answer','Manager','আপনার নির্দেশ যাচাই করা হচ্ছে…');
    host.scrollTop=host.scrollHeight;
    status('Manager যাচাই করছে…');
    try{
      const data=await request('/api/admin/tasks',{
        method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({role:'manager',title:instruction.slice(0,100),instruction})
      });
      const result=data.task?.result||{};
      if(data.task?.id&&Array.isArray(result.private_messages)&&result.private_messages.length){
        transientHelp.set(data.task.id,result.private_messages.slice(0,3));
        if(transientHelp.size>10)transientHelp.delete(transientHelp.keys().next().value);
      }
      status('');
      await loadHistory();
    }catch(error){
      pending.querySelector('p').textContent='নির্দেশটি সম্পন্ন হয়েছে বলে নিশ্চিত করা যায়নি।';
      status('সংযোগ/প্রক্রিয়াকরণ সমস্যা: '+error.message,true);
      input.value=instruction;fitComposer();
    }finally{busy=false;$('#ops-send').disabled=false}
  }
  function logout(){
    closeManagerChat();
    transientHelp.clear();
    managerNotices=[];lastManagerTasks=[];
    ready=false;setSidebarOpen(false);
    $('#manager-chat-head').disabled=true;$('#staff-workspace').classList.add('hidden');$('#riddlex-workspace').classList.add('hidden');
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.disabled=true);
    window.WalidAdminApprovals?.signOut();
  }
  addEventListener('walid-admin-authenticated',()=>{
    ready=true;setSidebarOpen(false);
    $('#manager-chat-head').disabled=false;
    requestAnimationFrame(positionChatHead);
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.disabled=false);
    selectTab(currentTab,false);
    void refreshNotices();
  });
  addEventListener('walid-admin-signed-out',logout);
  // No section hashes or alternate admin URLs.
  if(location.pathname==='/admin/'&&(location.hash||location.search))history.replaceState(null,'','/admin/');
  $('#sidebar-toggle')?.addEventListener('click',()=>{
    if(!ready)return;
    setSidebarOpen(!$('#workspace-shell').classList.contains('nav-expanded'));
  });
  document.addEventListener('keydown',event=>{
    const panel=$('#manager-chat-panel');
    if(event.key==='Escape'&&panel?.classList.contains('is-open')){closeManagerChat();return}
    if(event.key==='Escape')setSidebarOpen(false);
    if(event.key==='Tab'&&panel?.classList.contains('is-open')){
      const controls=[...panel.querySelectorAll('button:not(:disabled),textarea:not(:disabled),input:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);
      const first=controls[0],last=controls.at(-1);if(!first||!last)return;
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
    }
  });
  document.addEventListener('click',event=>{
    if(!ready||!$('#workspace-shell').classList.contains('nav-expanded'))return;
    if(event.target.closest('#admin-sidebar'))return;
    setSidebarOpen(false);
  });

  document.querySelectorAll('[data-admin-tab]').forEach(b=>{
    b.disabled=true;b.addEventListener('click',()=>selectTab(b.dataset.adminTab));
  });
  // Keep the original staff office HTML and SVG completely unchanged.
  // Synchronize its selected desk with the existing conversation controls below.
  const originalOffice=$('#preserved-staff-office');
  originalOffice?.addEventListener('load',()=>{
    try{
      const doc=originalOffice.contentDocument;
      if(!doc)return;
      const synchronize=()=>{
        // The iframe viewport itself must not contribute to the measurement;
        // otherwise a 1350px initial height traps the page in a blank scroll area.
        const content=doc.querySelector('main');
        const measured=Math.ceil(content?.getBoundingClientRect().height||0)+2;
        if(measured>500&&measured<9000&&Math.abs(originalOffice.getBoundingClientRect().height-measured)>3){
          originalOffice.style.height=measured+'px';
        }
      };
      synchronize();
      if(typeof ResizeObserver!=='undefined'){
        const observer=new ResizeObserver(synchronize);
        observer.observe(doc.body);
      }
      doc.addEventListener('click',event=>{
        const desk=event.target.closest('.desk');
        if(!desk)return;
        const mapping={manager:'manager',it:'monitor',cyber:'security',cse:'code',admin:'mail'};
        const match=Object.keys(mapping).find(name=>desk.classList.contains(name));
        if(match==='manager')openManagerChat();
        // Other desks remain selectable for their read-only details inside the original office.
      });
    }catch{ /* The original office remains functional if the host cannot inspect it. */ }
  });
  $('#manager-staff-chats')?.addEventListener('click',()=>showChatView('list'));
  $('#manager-thread-back')?.addEventListener('click',()=>{
    if(chatView==='thread')showChatView('list');
    else showChatView('manager');
  });
  $('#manager-chat-head')?.addEventListener('click',openManagerChat);
  $('#manager-chat-close')?.addEventListener('click',closeManagerChat);
  $('#manager-chat-backdrop')?.addEventListener('click',closeManagerChat);
  $('#ops-send')?.addEventListener('click',submit);
  $('#ops-input')?.addEventListener('input',fitComposer);
  $('#ops-input')?.addEventListener('keydown',event=>{
    if(event.key==='Enter'&&!event.shiftKey){
      event.preventDefault();void submit();
    }
  });
  addEventListener('resize',positionChatHead);
  // Keep the floating bot head fixed on the screen while the Office scrolls.
  addEventListener('focus',()=>{if(ready)void refreshNotices()});
  document.addEventListener('visibilitychange',()=>{if(ready&&!document.hidden)void refreshNotices()});
  setInterval(()=>{if(ready&&!document.hidden)void refreshNotices()},4*60*1000);
  window.WalidAdminOps={activate:selectTab};
})();
