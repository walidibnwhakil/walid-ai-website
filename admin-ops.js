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
  const CHAT_RETENTION_MS=5*24*60*60*1000;
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
  const fmt = date => {try{return new Date(date).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}catch{return String(date||'')}};
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
    for(const selector of ['#ops-status','#manager-chat-status']){
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
      if(frame&&!frame.getAttribute('src'))frame.setAttribute('src',frame.dataset.src);
      void loadStaff();void loadHistory();
    }
    if(tab==='riddlex')window.WalidAdminApprovals?.activate();
    requestAnimationFrame(positionChatHead);
  }
  function createRoleCards(){
    const host=$('#ops-desks'); if(!host)return; host.replaceChildren();
    roles.forEach(role=>{
      const button=document.createElement('button');
      button.type='button';button.className='ops-desk';
      button.dataset.role=role.id;
      const glyph=document.createElement('span');glyph.className='ops-desk-icon';glyph.textContent=role.icon;
      const copy=document.createElement('span'),title=document.createElement('strong'),description=document.createElement('small');
      title.textContent=role.name;description.textContent=role.desc;copy.append(title,description);
      button.append(glyph,copy);
      button.onclick=()=>openManagerChat();
      host.append(button);
    });
    updateSelected();
  }
  function updateSelected(){
    const item=roles.find(x=>x.id===selected);
    $('#ops-role-name').textContent=item.name;
    $('#ops-role-description').textContent=item.desc;
    // Preserve the SVG send icon. TextContent would replace it with a wrapped label.
    $('#ops-send').setAttribute('aria-label','Send message to Manager');
    $('#ops-send').setAttribute('title','Send message');
    document.querySelectorAll('.ops-desk').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===selected)));
  }
  function appendMessage(container,kind,heading,body,extra=''){
    const bubble=document.createElement('article');
    bubble.className='ops-message '+kind;
    const name=document.createElement('strong');name.textContent=heading;
    const text=document.createElement('p');text.textContent=body||'No verified response was returned.';
    bubble.append(name,text);
    if(extra){const meta=document.createElement('small');meta.textContent=extra;bubble.append(meta)}
    container.append(bubble);return bubble;
  }
  function appendDelegations(bubble,result){
    const rows=Array.isArray(result?.delegations)?result.delegations.filter(item=>item&&typeof item==='object'):[];
    if(!rows.length)return;
    const details=document.createElement('details');details.className='manager-delegations';
    const summary=document.createElement('summary');
    summary.textContent='কাকে কী দায়িত্ব দেওয়া হয়েছে · '+rows.length+'টি রিপোর্ট';
    details.append(summary);
    for(const entry of rows){
      const node=document.createElement('div');node.className='manager-workorder';
      const role=roles.find(item=>item.id===entry.role);
      const title=document.createElement('strong');
      title.textContent=(role?.name||entry.role||'Staff')+' · '+(entry.status||'unknown');
      node.append(title);
      if(entry.instruction){
        const work=document.createElement('p');work.textContent='Manager-এর নির্দেশ: '+entry.instruction;node.append(work);
      }
      if(entry.outcome){
        const answer=document.createElement('p');answer.textContent='যাচাইয়ের ফল: '+entry.outcome;node.append(answer);
      }
      if(entry.checked_at){
        const time=document.createElement('small');time.textContent='যাচাই: '+fmt(entry.checked_at);node.append(time);
      }
      details.append(node);
    }
    bubble.append(details);
  }
  function renderHistory(tasks){
    const host=$('#ops-history');host.replaceChildren();
    const cutoff=Date.now()-CHAT_RETENTION_MS;
    const filtered=(Array.isArray(tasks)?tasks:[])
      .filter(item=>item?.role==='manager'&&Date.parse(item.created_at||'')>=cutoff)
      .sort((a,b)=>(a.created_at||'').localeCompare(b.created_at||'')).slice(-65);
    if(!filtered.length){
      // A non-persisted greeting is shown only when there are no previous commands.
      const greeting=appendMessage(host,'answer','Manager',
        'আসসালামু আলাইকুম, স্যার। Walid AI Office-এ স্বাগতম। আমি আপনার Manager। আপনার কী নির্দেশ আছে?');
      greeting.classList.add('manager-chat-greeting');
      return;
    }
    for(const task of filtered){
      appendMessage(host,'question','আপনি · '+fmt(task.created_at),task.instruction||task.title||'');
      const result=task.result||{};
      const bubble=appendMessage(host,'answer','Manager · '+fmt(result.checked_at||task.updated_at),
        result.answer||(task.status==='running'?'আপনার নির্দেশ যাচাই করা হচ্ছে…':'এই অনুরোধের যাচাইকৃত উত্তর পাওয়া যায়নি।'),
        result.limitation||(['queued','running'].includes(task.status)?'প্রক্রিয়াধীন':task.status||'unknown'));
      appendDelegations(bubble,result);
      const privateRows=transientHelp.get(task.id)||[];
      for(const item of privateRows){
        appendMessage(host,'answer','Admin Staff · '+fmt(item.received_at),item.message||'(Empty Help message)',
          'শুধু এই সেশনে দৃশ্যমান; ইতিহাসে সংরক্ষিত নয়');
      }
    }
    host.scrollTop=host.scrollHeight;
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
  async function loadStaff(){
    if(!ready)return;
    try{
      const data=await request('/api/admin/staff');
      const state=data.status||{},cap=state.capabilities||{};
      $('#ops-connect').textContent='Backend: authenticated · AI: '+(cap.ai_available?'configured':'unavailable')+
        ' · History: '+(state.persistence?.durable?'Firestore':'temporary');
      const coder=cap.coding||{};
      $('#ops-capability').textContent=
        'History: '+(state.persistence?.durable?'durable Firestore':'temporary Render filesystem')+
        ' · CSE draft-PR runner: '+(coder.draft_pr_workflow_configured?'configured (subject to Actions access)':'not configured')+
        ' · Approval-gated Merge: '+(coder.merge_executor_configured?'configured':'disabled')+
        ' · Automatic Merge/Deploy: disabled.';
    }catch(error){status(error.message,true)}
  }
  async function loadHistory(){
    if(!ready)return;
    try{
      const data=await request('/api/admin/tasks');
      renderHistory(data.tasks||[]);
    }catch(error){status('চ্যাটের আগের বার্তা দেখানো যাচ্ছে না: '+error.message,true)}
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
  async function runChecks(){
    if(!ready||busy)return;
    const button=$('#ops-checks');busy=true;button.disabled=true;status('Running real HTTP and security-header checks…');
    try{
      const data=await request('/api/admin/staff/checks');
      const host=$('#ops-check-results');host.replaceChildren();
      for(const item of data.checks||[]){
        const card=document.createElement('article');card.className='ops-check';
        const h=document.createElement('strong');h.textContent=item.staff+' — '+(item.result?.ok?'PASS':'ATTENTION');
        const pre=document.createElement('pre');pre.textContent=JSON.stringify(item.result?.details||item.result?.detail||item.result,null,2);
        card.append(h,pre);host.append(card);
      }
      status('Completed actual read-only checks at '+fmt(data.checked_at)+'.');
      void loadStaff();
    }catch(error){status('Checks could not finish: '+error.message,true)}
    finally{busy=false;button.disabled=false}
  }
  function logout(){
    closeManagerChat();
    transientHelp.clear();
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
        const measured=doc.documentElement.scrollHeight;
        if(measured>700&&measured<9000)originalOffice.style.height=measured+'px';
        positionChatHead();
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
  addEventListener('scroll',positionChatHead,{passive:true});
  $('#ops-checks')?.addEventListener('click',runChecks);
  $('#ops-reload')?.addEventListener('click',()=>{void loadStaff();void loadHistory()});
  createRoleCards();
  window.WalidAdminOps={activate:selectTab};
})();
