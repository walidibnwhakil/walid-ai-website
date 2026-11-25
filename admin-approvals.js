/* Owner-only Riddlex review. Firestore security rules authorize every write.
   The static casebook is read in bounded batches and is never overwritten. */
(() => {
  "use strict";
  const $=s=>document.querySelector(s), ROOT="/games/riddlex/";
  const scripts=["/firebase-config.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
    "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js"];
  const PAGE=24;
  const labels={yes:"Yes / হ্যাঁ",no:"No / না",probably:"Probably / সম্ভবত হ্যাঁ",
    probably_not:"Probably not / সম্ভবত না",unknown:"Don't know / জানি না"};
  const statusNames={pending:"Awaiting review",approved:"Approved",confirmed:"Confirmed",rejected:"Rejected"};
  const categories={real:"Real person",fictional:"Fictional character",animal:"Animal",object:"Object"};
  const jobNames={actor:"Actor / actress",singer:"Singer",politician:"Politician",writer:"Writer",
    cricketer:"Cricketer",footballer:"Footballer",athlete:"Athlete",scientist:"Scientist",
    musician:"Musician",director:"Director",business:"Businessperson",youtube:"YouTuber"};
  let started=false,auth=null,db=null,authorized=false,modern=false,generation=0;
  let view="suggestions",pageNo=0,cursors=[],lastDoc=null,more=false,request=0;
  let shared=null,source=null,questionMap=new Map(),browser=null,catalogPages=[],searchAbort=null;
  let link=null,editor=null,busy=false,authCheck=0;
  const regionNames=new Intl.DisplayNames(["en"],{type:"region"});
  const countryName=id=>{try{return regionNames.of(String(id).slice(5).toUpperCase())||id}catch{return id}};
  const stamp=()=>firebase.firestore.FieldValue.serverTimestamp();
  function el(tag,text,cls){const node=document.createElement(tag);if(text!==undefined)node.textContent=String(text);if(cls)node.className=cls;return node}
  function btn(text,fn,secondary=true){const b=el("button",text,secondary?"secondary-button":"");b.type="button";b.addEventListener("click",fn);return b}
  function message(text,error=false){const n=$("#riddlex-status");n.textContent=text;n.dataset.error=String(error)}
  function show(node,yes){node.classList.toggle("hidden",!yes)}
  function lock(){authorized=false;modern=false;request++;searchAbort?.abort();link=null;editor=null;show($("#riddlex-tools"),false);show($("#riddlex-editor"),false);show($("#riddlex-link-note"),false);show($("#riddlex-pagination"),false);$("#riddlex-pending").replaceChildren();$("#riddlex-editor").replaceChildren()}
  function loadScript(url){
    return new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src===new URL(url,location.href).href);
      if(existing&&(url==="/firebase-config.js"?window.WALID_FIREBASE_CONFIG:window.firebase)){
        if(url.includes("firebase-app")&&window.firebase?.apps!==undefined)return resolve();
        if(url.includes("firebase-auth")&&window.firebase?.auth)return resolve();
        if(url.includes("firebase-firestore")&&window.firebase?.firestore)return resolve();
        if(url==="/firebase-config.js"&&window.WALID_FIREBASE_CONFIG)return resolve();
      }
      const s=document.createElement("script");s.src=url;s.async=false;s.onload=resolve;
      s.onerror=()=>reject(Error("Could not load authentication tools."));document.head.append(s);
    });
  }
  async function modules(){
    if(!shared)shared=Promise.all([import(ROOT+"admin-catalog.js?v=74"),import(ROOT+"owner-records.js?v=riddlex-74")])
      .then(([cat,records])=>({cat,records})).catch(e=>{shared=null;throw e});
    const m=await shared;
    if(!source){source=await m.cat.catalogSource();questionMap=new Map(source.manifest.questions.map(q=>[q.id,q]));}
    const fill=(id,items,format)=>{const select=$(id);if(select.options.length>1)return;for(const value of items)select.append(new Option(format(value),value))};
    fill("#riddlex-country",m.cat.COUNTRIES,countryName);fill("#riddlex-occupation",m.cat.JOBS,x=>jobNames[x]||x);
    return m;
  }
  function safeImage(raw){
    if(typeof raw!=="string"||!raw)return "";
    if(/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(raw)&&raw.length<150000)return raw;
    if(raw.startsWith("data:"))return "";
    if(raw.startsWith("./images/approved/")&&!raw.includes("..",2))return new URL(raw,location.origin+ROOT).href;
    try{if(/^https?:\/\//i.test(raw)){const u=new URL(raw);return u.protocol==="https:"?u.href:""}}catch{return ""}
    if(raw.length>500||raw.includes("://"))return "";
    return "https://commons.wikimedia.org/wiki/Special:FilePath/"+encodeURIComponent(raw)+"?width=320";
  }
  function photo(raw,adult,cls="riddlex-thumb"){
    const url=!adult?safeImage(raw):"";
    if(!url)return el("p",adult?"Name-only record":"No image provided", "muted");
    const img=el("img",undefined,cls);img.src=url;img.loading="lazy";img.alt="Record image";img.referrerPolicy="no-referrer";
    img.onerror=()=>img.replaceWith(el("p","Image could not be loaded.","muted"));return img;
  }
  async function compress(file){
    if(!file||!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>15*1024*1024)throw Error("Choose a JPEG, PNG or WebP image under 15 MB.");
    const bitmap=await createImageBitmap(file), scale=Math.min(1,480/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext("2d").drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
    for(const quality of [.8,.65,.5,.4,.3]){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob&&blob.size<100000){const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});if(safeImage(data))return data;}
    }
    throw Error("Could not compress this image.");
  }
  function rawRows(data){return Array.isArray(data?.answers)?data.answers:[]}
  function answerMap(data){return new Map(rawRows(data).map(row=>[row?.q??row?.qid,row?.a??row?.value]))}
  function describe(data,rec){
    const m=answerMap(data), category=categories[data.category]||categories[rec.recordCategory(data.answers,data.category)]||categoryHint(data)||"Classification pending";
    return [category,m.get("male")==="yes"?"Male":m.get("female")==="yes"?"Female":"",
      m.get("alive")==="yes"?"Alive":m.get("dead")==="yes"||m.get("alive")==="no"?"Deceased":"",
      ...[...m].filter(([q,a])=>typeof q==="string"&&q.startsWith("from_")&&a==="yes"&&q.length===7).map(([q])=>countryName(q)),
      ...Object.keys(jobNames).filter(q=>m.get(q)==="yes").map(q=>jobNames[q])].filter(Boolean).join(" · ");
  }
  function categoryHint(data){
    const groups=new Set(rawRows(data).map(row=>questionMap.get(row?.q??row?.qid)?.group).filter(Boolean));
    if(groups.has("animal")&&!groups.has("object")&&!groups.has("job")&&!groups.has("country"))return "Likely animal — verify";
    if(groups.has("object")&&!groups.has("animal")&&!groups.has("job")&&!groups.has("country"))return "Likely object — verify";
    return "";
  }
  function pathTable(data){
    const wrap=el("div",undefined,"riddlex-path"), table=el("table"), head=el("thead"), hr=el("tr");
    ["#","Question (English / বাংলা)","Submitted answer"].forEach(x=>hr.append(el("th",x)));head.append(hr);table.append(head);
    const body=el("tbody");
    rawRows(data).forEach((row,i)=>{
      const id=row?.q??row?.qid, answer=row?.a??row?.value, q=questionMap.get(id);
      const tr=el("tr"),desc=el("td");desc.append(el("div",q?.en||String(id||"Invalid question")),el("small",q?.bn||""));
      tr.append(el("td",i+1),desc,el("td",labels[answer]||"Invalid answer"));body.append(tr);
    });
    if(!rawRows(data).length){const tr=el("tr"),td=el("td","No saved answers.");td.colSpan=3;tr.append(td);body.append(tr)}
    table.append(body);wrap.append(table);return wrap;
  }
  function paging(hasMore,description){
    show($("#riddlex-pagination"),true);$("#riddlex-prev").disabled=pageNo===0;$("#riddlex-next").disabled=!hasMore;
    $("#riddlex-page-info").textContent=description;more=hasMore;
  }
  function clearEditor(){editor=null;show($("#riddlex-editor"),false);$("#riddlex-editor").replaceChildren()}
  function clearLink(){link=null;show($("#riddlex-link-note"),false);$("#riddlex-link-note").replaceChildren()}
  function setLink(ctx){
    link=ctx;const note=$("#riddlex-link-note");note.replaceChildren(el("strong","Match an existing record"),
      el("p","Submission: "+ctx.data.nameEn+". Select the matching record to review a correction. Clear filters if the original answers are inaccurate."),
      btn("Return to suggestion",()=>{const old=link;clearLink();openEditor(old).catch(fail)}));
    show(note,true);
  }
  function fail(error){if(error?.name!=="AbortError")message(error?.message||"Operation failed. Verify Firebase permissions and try again.",true)}
  async function queryView(reset=true){
    if(!authorized)return;
    const token=++request;searchAbort?.abort();searchAbort=null;
    if(reset){pageNo=0;cursors=[null];lastDoc=null;}
    const list=$("#riddlex-pending");list.replaceChildren();show($("#riddlex-pagination"),false);
    if(view==="suggestions"&&!modern){message("New submissions are unavailable. Previous submissions remain accessible.",true);return}
    if(view==="reviewed"&&!modern){message("Verified records will be available once database publishing is enabled.",true);return}
    try{
      const m=await modules();if(token!==request||!authorized)return;
      let query=db.collection(view==="suggestions"?"riddlex_suggestions":view==="legacy"?"riddlex_entries":"riddlex_owner_records");
      const filter=$("#riddlex-review-status").value;
      if(view!=="reviewed"&&filter!=="all")query=query.where("status","==",filter);
      query=query.orderBy(firebase.firestore.FieldPath.documentId());
      if(cursors[pageNo])query=query.startAfter(cursors[pageNo]);
      message("Loading records…");
      const snapshot=await query.limit(PAGE+1).get();
      if(token!==request||!authorized)return;
      const docs=snapshot.docs.slice(0,PAGE);lastDoc=docs.at(-1)||null;
      for(const doc of docs){
        const data=doc.data(),isReviewed=view==="reviewed",type=view==="legacy"?"legacy":"suggestion";
        const item=el("article",undefined,"riddlex-item"),name=el("h3",data.nameEn||"Unnamed");item.append(name);
        if(data.nameBn&&data.nameBn!==data.nameEn)item.append(el("p",data.nameBn,"muted"));
        item.append(el("p",describe(data,m.records),"riddlex-record-meta"),photo(data.image,data.adult));
        item.append(el("p",isReviewed?"ID: "+doc.id+" · Revision "+(data.revision||1):
          (statusNames[data.status]||"Awaiting review")+" · "+rawRows(data).length+" answers"+(data.knownIds?.length?" · Possible existing record":""),"muted"));
        const actions=el("div",undefined,"toolbar");
        if(isReviewed){
          actions.append(btn("Edit",()=>openEditor({record:{...data,id:doc.id}}).catch(fail),false));
          if(link)actions.append(btn("Select Existing Record",()=>linkRecord({...data,id:doc.id}).catch(fail)));
        }else{
          actions.append(btn(data.status==="pending"?"Review Submission":"View Submission",()=>openEditor({type,id:doc.id,data}).catch(fail),false));
        }
        item.append(actions);list.append(item);
      }
      if(!docs.length)list.append(el("p","No records on this page.","muted"));
      paging(snapshot.size>PAGE,"Page "+(pageNo+1)+" · "+docs.length+" records");
      message(docs.length+" "+(view==="reviewed"?"verified records":"submissions")+" displayed. "+(modern?"":"Publishing is unavailable. You can review and compare records."));
    }catch(e){if(token===request)fail(e)}
  }
  async function allReviewed(){
    if(!modern)return [];
    let cursor=null,rows=[];
    while(true){
      let q=db.collection("riddlex_owner_records").orderBy(firebase.firestore.FieldPath.documentId());
      if(cursor)q=q.startAfter(cursor);
      const snap=await q.limit(100).get();rows.push(...snap.docs.map(d=>({...d.data(),id:d.id})));
      if(snap.size<100)return rows;cursor=snap.docs.at(-1);
    }
  }
  function filters(){return {query:$("#riddlex-query").value.trim(),category:$("#riddlex-category").value,gender:$("#riddlex-gender").value,life:$("#riddlex-life").value,country:$("#riddlex-country").value,job:$("#riddlex-occupation").value}}
  async function beginCatalog(){
    if(!authorized)return;
    const token=++request;searchAbort?.abort();searchAbort=new AbortController();
    pageNo=0;catalogPages=[];browser=null;$("#riddlex-pending").replaceChildren();show($("#riddlex-pagination"),false);
    try{
      message("Preparing database search…");
      const m=await modules(),rows=await allReviewed();
      if(token!==request||!authorized||searchAbort.signal.aborted)return;
      browser=new m.cat.CatalogBrowser(source,filters(),rows);
      await nextCatalog();
    }catch(e){if(token===request)fail(e)}
  }
  function renderCatalog(){
    const page=catalogPages[pageNo];if(!page)return;
    const list=$("#riddlex-pending");list.replaceChildren();
    for(const {record,summary,source:origin} of page.rows){
      const item=el("article",undefined,"riddlex-item");item.append(el("h3",record.nameEn));
      if(record.nameBn&&record.nameBn!==record.nameEn)item.append(el("p",record.nameBn,"muted"));
      item.append(photo(record.image,record.adult),el("p",summary,"riddlex-record-meta"),el("p","ID: "+record.id+" · "+origin,"muted"));
      const actions=el("div",undefined,"toolbar");actions.append(btn("View Record",()=>editCatalog(record).catch(fail),false));
      if(link)actions.append(btn("Select Existing Record",()=>linkRecord(record).catch(fail)));item.append(actions);list.append(item);
    }
    if(!page.rows.length)list.append(el("p",page.finished?"No matching records in the remaining casebook.":"No matches in this batch. Select Next to continue searching.","muted"));
    paging(pageNo<catalogPages.length-1||!page.finished,"Batch "+(pageNo+1)+" · "+page.rows.length+" matches · "+page.scanned.toLocaleString()+" records scanned");
    message(page.finished?"Search complete for the selected filters.":"Search in progress: "+page.filesRead+" of "+page.totalFiles+" sections checked. Select Next to continue.");
  }
  async function nextCatalog(){
    if(!browser||!authorized)return;
    const token=++request;searchAbort?.abort();const controller=new AbortController();searchAbort=controller;
    $("#riddlex-next").disabled=true;$("#riddlex-prev").disabled=true;
    try{
      const page=await browser.next(controller.signal,(n,total)=>{if(token===request)message("Searching database ("+n+" of "+total+")…")});
      if(token!==request||!authorized)return;
      catalogPages.push(page);pageNo=catalogPages.length-1;renderCatalog();
    }catch(e){
      if(token!==request)return;
      if(e?.name==="AbortError")message("Search stopped. Select Next to continue.",false);else fail(e);
      paging(true,"Search paused · "+browser.scanned.toLocaleString()+" records scanned");
    }
  }
  async function switchView(next,{keepLink=false,keepEditor=false}={}){
    if(!authorized)return;
    request++;searchAbort?.abort();view=next;if(!keepEditor)clearEditor();if(!keepLink)clearLink();
    for(const b of document.querySelectorAll("[data-riddlex-view]"))b.setAttribute("aria-pressed",String(b.dataset.riddlexView===view));
    show($("#riddlex-review-filters"),["suggestions","legacy"].includes(view));show($("#riddlex-search"),view==="catalog");
    if(view==="catalog")await beginCatalog();else await queryView(true);
  }
  async function latestRecord(record){
    if(!modern)return record;
    const snap=await db.collection("riddlex_owner_records").doc(record.id).get();
    return snap.exists?{...snap.data(),id:snap.id}:record;
  }
  async function editCatalog(record){await openEditor({record:await latestRecord(record)})}
  async function linkRecord(record){
    if(!link)return;
    const ctx=link;clearLink();
    await openEditor({...ctx,record:await latestRecord(record),linked:true});
  }
  function labelInput(title,input){const label=el("label");label.append(el("span",title),input);return label}
  function field(value,placeholder=""){const n=el("input");n.type="text";n.value=value||"";n.placeholder=placeholder;n.maxLength=80;return n}
  function draftFor(ctx,m){
    if(ctx.record)return {...ctx.record,answers:m.records.normalizeReviewAnswers(ctx.record.answers)};
    if(ctx.data){
      const data=ctx.data,cat=m.records.recordCategory(data.answers,data.category);
      return {id:ctx.type==="legacy"?"learn-"+ctx.id:"owner-"+ctx.id,nameEn:data.nameEn||"",nameBn:data.nameBn||"",
        adult:data.adult===true,category:cat,answers:m.records.normalizeReviewAnswers(data.answers),
        image:data.adult?"":data.image||"",credit:data.image&&!data.adult?"Player submission":"",mode:"new"};
    }
    return {id:db.collection("riddlex_owner_records").doc().id,nameEn:"",nameBn:"",category:"",adult:false,answers:[],image:"",credit:"",mode:"new"};
  }
  function prepareDuplicateSearch(ctx,query){
    const facts=answerMap(ctx.data);
    setLink({type:ctx.type,id:ctx.id,data:ctx.data});
    $("#riddlex-query").value=query;
    const category=sharedRecordCategory(ctx.data,facts);
    $("#riddlex-category").value=category;
    $("#riddlex-gender").value=facts.get("male")==="yes"?"male":facts.get("female")==="yes"?"female":"";
    $("#riddlex-life").value=facts.get("alive")==="yes"?"alive":facts.get("dead")==="yes"||facts.get("alive")==="no"?"dead":"";
    const countries=[...facts].filter(([key,value])=>typeof key==="string"&&key.startsWith("from_")&&key.length===7&&value==="yes").map(([key])=>key);
    $("#riddlex-country").value=countries.length===1?countries[0]:"";
    $("#riddlex-occupation").value="";
    if((ctx.data.knownIds||[]).includes(query)){
      for(const key of ["category","gender","life","country","occupation"])$("#riddlex-"+key).value="";
    }
    switchView("catalog",{keepLink:true}).catch(fail);
  }
  function sharedRecordCategory(data,facts){
    if(data.category==="animal"||data.category==="object")return data.category;
    if(facts.get("real")==="yes")return "real";
    if(facts.get("fictional")==="yes")return "fictional";
    return "";
  }
  async function openEditor(ctx){
    if(!authorized)return;
    const m=await modules();if(!authorized)return;
    const panel=$("#riddlex-editor");panel.replaceChildren();show(panel,true);
    const draft=draftFor(ctx,m);editor={ctx,draft};
    const isSubmission=!!ctx.data,unresolved=isSubmission&&ctx.data.status==="pending",
      archived=isSubmission&&!unresolved,canEdit=modern&&!archived;
    panel.append(el("h2",isSubmission?"Review submission: "+ctx.data.nameEn:ctx.record?"Edit record":"Add record"));
    panel.append(btn("Close",()=>clearEditor()));
    if(isSubmission){
      panel.append(el("p",describe(ctx.data,m.records),"riddlex-record-meta"),photo(ctx.data.image,ctx.data.adult,"riddlex-editor-photo"));
      if(ctx.data.knownIds?.length)panel.append(el("p","Possible existing record IDs (from player's loaded casebook): "+ctx.data.knownIds.map(String).join(", "),"muted"));
      panel.append(el("h3","Original play path — "+rawRows(ctx.data).length+" answers"),pathTable(ctx.data));
      if(ctx.type==="legacy")panel.append(el("p","Older submissions may contain only the first 36 saved answers or merged replies. Missing historical answers cannot be reconstructed.","muted"));
      if(archived){
        panel.append(el("p","Decision: "+ctx.data.status+(ctx.data.resolvedId?" · linked ID "+ctx.data.resolvedId:"")));
        if(ctx.data.resolvedId&&modern)panel.append(btn("Open published record",async()=>{try{const doc=await db.collection("riddlex_owner_records").doc(ctx.data.resolvedId).get();if(!doc.exists)throw Error("Published record not found.");await openEditor({record:{...doc.data(),id:doc.id}})}catch(e){fail(e)}}));
        else if(ctx.type==="legacy"&&["approved","confirmed"].includes(ctx.data.status)&&modern)panel.append(btn("Edit this approved legacy record",async()=>{try{await openEditor({record:await latestRecord({...draft,mode:"patch"}),legacyDoc:ctx.id})}catch(e){fail(e)}}));
        panel.scrollIntoView({block:"start",behavior:"smooth"});return;
      }
      {
        panel.append(btn(ctx.linked?"Choose a different existing record":"Check Existing Records",()=>{
          prepareDuplicateSearch(ctx,ctx.data.nameEn||"");
        }));
        for(const id of (ctx.data.knownIds||[]).filter(x=>typeof x==="string").slice(0,10)){
          panel.append(btn("Find ID "+id,()=>{
            prepareDuplicateSearch(ctx,id);
          }));
        }
        if(ctx.linked)panel.append(el("p","Matched record: "+draft.id+". Only the reviewed information will be updated; no duplicate will be created.","muted"));
      }
    }
    if(!canEdit){
      panel.append(el("p","Publishing is currently unavailable. Review the original answers and compare existing records; approval and editing require an active database connection with publishing permissions.","muted"));
      if(unresolved&&ctx.type==="legacy"){
        const actions=el("div",undefined,"toolbar");
        actions.append(btn("Reject Submission",()=>legacyDecision(ctx,"rejected")));panel.append(actions);
      }
      panel.scrollIntoView({block:"start",behavior:"smooth"});return;
    }
    const top=el("div",undefined,"riddlex-editor-top"),en=field(draft.nameEn),bn=field(draft.nameBn),cat=el("select");
    cat.append(new Option("Choose verified category",""));for(const [key,title] of Object.entries(categories))cat.append(new Option(title,key));cat.value=draft.category||"";
    top.append(labelInput("English name",en),labelInput("বাংলা নাম",bn),labelInput("Category",cat));
    const adult=el("input");adult.type="checkbox";adult.checked=draft.adult;adult.style.width="auto";
    const adultLabel=el("label");adultLabel.append(adult,el("span","Restricted image / name-only record"));top.append(adultLabel);panel.append(el("h3","Reviewed identity"),top);
    const preview=el("div");preview.append(photo(draft.image,draft.adult,"riddlex-editor-photo"));const credit=field(draft.credit);credit.maxLength=2000;
    const file=el("input");file.type="file";file.accept="image/jpeg,image/png,image/webp";file.disabled=adult.checked;
    file.onchange=async()=>{try{if(!file.files?.[0])return;draft.image=await compress(file.files[0]);if(adult.checked){draft.image="";return}preview.replaceChildren(photo(draft.image,false,"riddlex-editor-photo"));message("Replacement image ready. Save to publish.")}catch(e){fail(e)}};
    adult.onchange=()=>{file.disabled=adult.checked;if(adult.checked){draft.image="";credit.value="";file.value=""}preview.replaceChildren(photo(draft.image,adult.checked,"riddlex-editor-photo"))};
    const photoActions=el("div",undefined,"toolbar");photoActions.append(file,btn("Remove photo",()=>{draft.image="";credit.value="";preview.replaceChildren(photo("",adult.checked))}));
    if(ctx.linked&&ctx.data.image&&!ctx.data.adult)photoActions.append(btn("Use submitted photo",()=>{if(adult.checked)return;draft.image=ctx.data.image;credit.value="Player submission";preview.replaceChildren(photo(draft.image,false,"riddlex-editor-photo"))}));
    panel.append(preview,photoActions,labelInput("Image credit / source",credit));
    const facts=new Map(draft.answers.map(r=>[r.q,r.a]));
    const tools=el("div",undefined,"toolbar"),filter=field("","Search questions / facts");filter.type="search";
    const showAll=el("input");showAll.type="checkbox";showAll.style.width="auto";
    const allLabel=el("label");allLabel.append(showAll,el("span"," Show all available questions"));
    tools.append(filter,allLabel);
    const factsBox=el("div",undefined,"riddlex-facts");
    function renderFacts(){
      const needle=m.records.normalizeRecordName(filter.value);
      factsBox.replaceChildren();
      for(const q of source.manifest.questions){
        if(needle&&!m.records.normalizeRecordName(q.en+" "+q.bn+" "+q.id).includes(needle))continue;
        if(!needle&&!showAll.checked&&!facts.has(q.id))continue;
        const row=el("div",undefined,"riddlex-fact"),text=el("div");text.append(el("span",q.en||q.id),el("small",q.bn||q.id));
        const select=el("select");select.setAttribute("aria-label",q.en||q.id);
        select.append(new Option("Not recorded",""));for(const [value,label] of Object.entries(labels))select.append(new Option(label,value));
        select.value=facts.get(q.id)||"";
        select.onchange=()=>{if(select.value)facts.set(q.id,select.value);else facts.delete(q.id)};
        row.append(text,select);factsBox.append(row);
      }
      if(!factsBox.childElementCount)factsBox.append(el("p","Search for a question or enable Show all to add facts.","muted"));
    }
    filter.oninput=renderFacts;showAll.onchange=renderFacts;
    if(ctx.linked)tools.append(btn("Apply submitted definite answers",()=>{
      if(!confirm("Apply submitted Yes/No answers to the existing record? Verify all changes before approval."))return;
      for(const row of m.records.normalizeReviewAnswers(ctx.data.answers))if(row.a==="yes"||row.a==="no")facts.set(row.q,row.a);
      renderFacts();
    }));
    panel.append(el("h3","Editable verified answers"),tools,factsBox);
    renderFacts();
    if(ctx.record?.revision&&modern)panel.append(btn("View edit history",()=>showHistory(draft.id,panel).catch(fail)));
    const duplicateCheck=el("input");duplicateCheck.type="checkbox";duplicateCheck.style.width="auto";
    if(!ctx.record){
      panel.append(el("p","If this identity already exists, choose Check Existing Records and accept as an update. Only use a new record for a genuinely different identity.","muted"));
      if(isSubmission)duplicateCheck.disabled=(ctx.data.knownIds||[]).length>0;
      if(duplicateCheck.disabled)panel.append(el("p","An existing ID was reported. Match that record before approval.","muted"));
      const l=el("label");l.append(duplicateCheck,el("span"," I verified that this identity does not already exist in the database."));panel.append(l);
    }
    const save=btn(isSubmission?(ctx.record?"Accept as Update":"Accept as New Record"):"Save Changes",async()=>{
      if(busy||!authorized)return;
      try{
        if(!ctx.record&&(duplicateCheck.disabled||!duplicateCheck.checked))throw Error("Search for duplicate records and confirm this is a distinct identity, or link the existing record.");
        const nameEn=en.value.trim(),nameBn=bn.value.trim();
        if(nameEn.length<2||nameEn.length>80||!categories[cat.value])throw Error("Enter a valid name and choose the verified category.");
        if(/[<>]/.test(nameEn+nameBn))throw Error("Invalid name characters.");
        if(facts.get("male")==="yes"&&facts.get("female")==="yes")throw Error("Both male and female are marked Yes. Verify gender answers.");
        if(facts.get("alive")==="yes"&&facts.get("dead")==="yes")throw Error("Both alive and deceased are marked Yes. Verify life status.");
        const final=m.records.withCategory(m.records.normalizeReviewAnswers([...facts].map(([q,a])=>({q,a})),new Set(questionMap.keys())),cat.value);
        if(final.length>512)throw Error("Too many facts.");
        if(adult.checked)draft.image="";
        const payload={nameEn,nameBn,category:cat.value,adult:adult.checked,answers:final,
          image:draft.image||"",credit:adult.checked?"":credit.value.trim(),mode:draft.mode==="new"?"new":"patch"};
        if(payload.image&&!safeImage(payload.image))throw Error("Invalid image source.");
        busy=true;save.disabled=true;
        await publish(ctx,draft,payload);clearEditor();clearLink();message("Saved and published to Firestore.");
        if(view==="catalog")await beginCatalog();else await queryView(true);
      }catch(e){fail(e)}finally{busy=false;save.disabled=false}
    },false);
    const actions=el("div",undefined,"toolbar");actions.append(save);
    if(unresolved)actions.append(btn("Reject Submission",()=>reject(ctx).catch(fail)));
    panel.append(actions);
    panel.scrollIntoView({block:"start",behavior:"smooth"});
  }
  async function publish(ctx,draft,payload){
    if(!authorized||!modern)throw Error("Owner permissions or current Firestore rules unavailable.");
    const target=db.collection("riddlex_owner_records").doc(draft.id);
    const suggestion=ctx.type?db.collection(ctx.type==="legacy"?"riddlex_entries":"riddlex_suggestions").doc(ctx.id):null;
    const legacy=ctx.legacyDoc?db.collection("riddlex_entries").doc(ctx.legacyDoc):null;
    await db.runTransaction(async tx=>{
      const previous=await tx.get(target),original=suggestion?await tx.get(suggestion):null,old=legacy?await tx.get(legacy):null;
      const revision=previous.exists?Number(previous.data().revision||0):0;
      if(revision!==(draft.revision||0))throw Error("The record was changed in another session. Reopen it before saving.");
      if(original&&(!original.exists||original.data().status!=="pending"))throw Error("This suggestion has already been reviewed. Refresh the list.");
      if(old&&!old.exists)throw Error("Legacy record not found.");
      if(previous.exists)tx.set(target.collection("history").doc(String(revision)),{...previous.data(),archivedAt:stamp()});
      tx.set(target,{...payload,revision:revision+1,updatedAt:stamp()});
      if(suggestion){
        if(ctx.type==="legacy")tx.update(suggestion,{status:"approved",managed:true,updatedAt:stamp()});
        else tx.update(suggestion,{status:"approved",resolvedId:draft.id,reviewedAt:stamp()});
      }
      if(legacy)tx.update(legacy,{managed:true,updatedAt:stamp()});
    });
  }
  async function showHistory(id,panel){
    const result=await db.collection("riddlex_owner_records").doc(id).collection("history").orderBy("revision","desc").limit(20).get();
    const section=el("section");section.append(el("h3","Previous revisions"));
    for(const doc of result.docs){const old=doc.data();section.append(el("p","Revision "+old.revision+" · "+old.nameEn+" · "+rawRows(old).length+" answers"),
      btn("Load revision "+old.revision+" into editor",async()=>{try{const latest=await db.collection("riddlex_owner_records").doc(id).get();if(!latest.exists)throw Error("Record no longer exists.");await openEditor({record:{...old,id,revision:latest.data().revision}});message("Earlier revision loaded as a draft. Save only after verification.")}catch(e){fail(e)}}))}
    if(result.empty)section.append(el("p","No previous revisions."));
    panel.append(section);
  }
  async function legacyDecision(ctx,status){
    if(status!=="rejected"||!authorized||!confirm("Reject "+ctx.data.nameEn+"?"))return;
    try{await db.collection("riddlex_entries").doc(ctx.id).update({status,updatedAt:stamp()});clearEditor();await queryView(true)}catch(e){fail(e)}
  }
  async function reject(ctx){
    if(!authorized||!confirm("Reject "+ctx.data.nameEn+"? Its original answers will remain in review history."))return;
    const ref=db.collection(ctx.type==="legacy"?"riddlex_entries":"riddlex_suggestions").doc(ctx.id);
    await db.runTransaction(async tx=>{const latest=await tx.get(ref);if(!latest.exists||latest.data().status!=="pending")throw Error("This submission has already been reviewed. Refresh first.");tx.update(ref,ctx.type==="legacy"?{status:"rejected",updatedAt:stamp()}:{status:"rejected",reviewedAt:stamp()});});
    clearEditor();await queryView(true);
  }
  async function verifyOwner(user){
    const serial=++authCheck;lock();
    if(!user||user.isAnonymous){message("Sign in with the authorized Firebase owner account.");return}
    try{
      // A real server-authorized owner-only query, not a client-side email check.
      await db.collection("riddlex_entries").where("status","==","pending").limit(1).get({source:"server"});
      if(serial!==authCheck||!sessionStorage.getItem("walidAdminAccess"))return;
      authorized=true;
      try{await db.collection("riddlex_suggestions").limit(1).get({source:"server"});modern=true}catch{modern=false}
      if(serial!==authCheck||!authorized)return;
      show($("#riddlex-tools"),true);await modules();
      if(serial!==authCheck||!authorized)return;
      await switchView(modern?"suggestions":"legacy");
    }catch(e){if(serial===authCheck){lock();message("Owner access could not be verified. Sign in using the authorized Firebase account.",true)}}
  }
  function wire(){
    for(const b of document.querySelectorAll("[data-riddlex-view]"))b.onclick=()=>switchView(b.dataset.riddlexView,{keepLink:!!link&&["catalog","reviewed"].includes(b.dataset.riddlexView)}).catch(fail);
    $("#riddlex-reload").onclick=()=>authorized?(view==="catalog"?beginCatalog():queryView(true)):verifyOwner(auth.currentUser);
    $("#riddlex-review-status").onchange=()=>queryView(true);
    $("#riddlex-search").onsubmit=e=>{e.preventDefault();beginCatalog().catch(fail)};
    $("#riddlex-stop").onclick=()=>searchAbort?.abort();
    $("#riddlex-add").onclick=()=>openEditor({}).catch(fail);
    $("#riddlex-prev").onclick=()=>{if(!authorized||pageNo===0)return;if(view==="catalog"){pageNo--;renderCatalog()}else{pageNo--;queryView(false)}};
    $("#riddlex-next").onclick=()=>{if(!authorized||!more)return;if(view==="catalog"){if(pageNo<catalogPages.length-1){pageNo++;renderCatalog()}else nextCatalog().catch(fail)}else if(lastDoc){cursors[pageNo+1]=lastDoc;pageNo++;queryView(false)}};
  }
  async function activate(){
    if(!sessionStorage.getItem("walidAdminAccess"))return;
    if(started){if(auth?.currentUser&&!authorized)await verifyOwner(auth.currentUser);return}
    started=true;message("Connecting to Firebase…");
    try{
      for(const url of scripts)await loadScript(url);
      if(!firebase.apps.length)firebase.initializeApp(window.WALID_FIREBASE_CONFIG);
      auth=firebase.auth();db=firebase.firestore();wire();
      $("#riddlex-google").onclick=async()=>{try{await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())}catch{message("Google sign-in was cancelled or failed.",true)}};
      auth.onAuthStateChanged(user=>{$("#riddlex-google").textContent=user&&!user.isAnonymous?"Switch Google account":"Sign in with Google";void verifyOwner(user)});
    }catch(e){message(e.message,true);started=false;lock()}
  }
  function signOut(){generation++;authCheck++;lock();if(auth?.currentUser)void auth.signOut().catch(()=>{})}
  window.WalidAdminApprovals={activate,signOut};
})();
