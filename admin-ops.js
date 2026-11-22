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
  let selected='manager', currentTab='dashboard', busy=false, ready=false;
  const fmt = date => {try{return new Date(date).toLocaleString('en-BD',{timeZone:'Asia/Dhaka'})}catch{return String(date||'')}};
  const token = () => sessionStorage.getItem('walidAdminAccess') || '';
  const auth = () => ({Authorization:'Bearer '+token()});
  const panels = ['dashboard','staff-workspace','riddlex-workspace'];
  const tabNames = {dashboard:'dashboard',staff:'staff-workspace',riddlex:'riddlex-workspace'};
  function status(text, bad=false) {
    const el=$('#ops-status'); if(el){el.textContent=text;el.dataset.error=bad?'true':'false'}
  }
  function selectTab(tab, writeHash=true) {
    if(!tabNames[tab])tab='dashboard';
    currentTab=tab;
    if(writeHash)history.replaceState(null,'','#'+tab);
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
      button.onclick=()=>{selected=role.id;updateSelected();void loadHistory()};
      host.append(button);
    });
    updateSelected();
  }
  function updateSelected(){
    const item=roles.find(x=>x.id===selected);
    $('#ops-role-name').textContent=item.name;
    $('#ops-role-description').textContent=item.desc;
    $('#ops-send').textContent=selected==='manager'?'Ask Manager':'Ask '+item.name;
    document.querySelectorAll('.ops-desk').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===selected)));
  }
  function appendMessage(container,kind,heading,body,extra=''){
    const card=document.createElement('article');card.className='ops-message '+kind;
    const h=document.createElement('strong');h.textContent=heading;
    const p=document.createElement('p');p.textContent=body||'No response text was returned.';
    card.append(h,p);
    if(extra){const small=document.createElement('small');small.textContent=extra;card.append(small)}
    container.append(card);return card;
  }
  function renderHistory(tasks){
    const host=$('#ops-history');host.replaceChildren();
    const filtered=tasks.filter(x=>selected==='manager'?x.role==='manager':x.role===selected);
    if(!filtered.length){const p=document.createElement('p');p.className='muted';p.textContent='No recorded conversation for this workstation.';host.append(p);return}
    filtered.slice(0,40).reverse().forEach(task=>{
      appendMessage(host,'question','You · '+fmt(task.created_at),task.instruction||task.title);
      const result=task.result||{};
      const role=result.delegated_to ? 'Manager → '+(roles.find(x=>x.id===result.delegated_to)?.name||result.delegated_to)
        : roles.find(x=>x.id===task.role)?.name||'Staff';
      appendMessage(host,'answer',role+' · '+(task.status||'unknown'),
        result.answer||'No verifiable result is available.', result.limitation||
          (task.status==='running'?'Processing…':''));
    });
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
      $('#ops-capability').textContent=state.persistence?.durable?
        'Task history is stored in Firestore. Code writes, merges and deployments require separate authorization.':
        'Task history is temporary on Render. For durable history configure the server Firestore task store. Code changes are not automated.';
    }catch(error){status(error.message,true)}
  }
  async function loadHistory(){
    if(!ready)return;
    try{const data=await request('/api/admin/tasks');renderHistory(data.tasks||[]);
      $('#ops-history-note').textContent='History source: '+(data.persistence||'not reported');
    }catch(error){status('History: '+error.message,true)}
  }
  async function submit(){
    if(!ready||busy)return;
    const input=$('#ops-input'),instruction=input.value.trim();
    if(!instruction){status('Write a question or task first.',true);return}
    if(instruction.length>2000){status('Maximum 2,000 characters per task.',true);return}
    busy=true;$('#ops-send').disabled=true;status('Working on the request using available tools…');
    const role=selected;
    try{
      const data=await request('/api/admin/tasks',{
        method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':crypto.randomUUID()},
        body:JSON.stringify({role,title:instruction.slice(0,100),instruction})
      });
      input.value='';
      const result=data.task?.result||{};
      status('Task: '+(data.task?.status||'unknown')+' · '+(result.delegated_to?'Assigned to '+result.delegated_to:'Processed by '+role));
      await loadHistory();
    }catch(error){status('Could not complete task: '+error.message,true)}
    finally{busy=false;$('#ops-send').disabled=false}
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
    ready=false;$('#staff-workspace').classList.add('hidden');$('#riddlex-workspace').classList.add('hidden');
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.disabled=true);
    window.WalidAdminApprovals?.signOut();
  }
  addEventListener('walid-admin-authenticated',()=>{
    ready=true;
    document.querySelectorAll('[data-admin-tab]').forEach(b=>b.disabled=false);
    selectTab(location.hash.slice(1)||currentTab,false);
  });
  addEventListener('walid-admin-signed-out',logout);
  addEventListener('hashchange',()=>selectTab(location.hash.slice(1),false));
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
        if(match){
          selected=mapping[match];updateSelected();void loadHistory();
        }
      });
    }catch{ /* The original office remains functional if the host cannot inspect it. */ }
  });
  $('#ops-send')?.addEventListener('click',submit);
  $('#ops-input')?.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();void submit()}});
  $('#ops-checks')?.addEventListener('click',runChecks);
  $('#ops-reload')?.addEventListener('click',()=>{void loadStaff();void loadHistory()});
  createRoleCards();
  window.WalidAdminOps={activate:selectTab};
})();
