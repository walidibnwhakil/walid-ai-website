/* Private reporting presentation. Uses only aggregate data from the authenticated backend.
   Homepage card order and names are deliberately fixed to current public navigation. */
(() => {
  "use strict";
  const catalog = window.WalidAnalyticsCatalog || {surahs:{}, books:{}, pdf:[], image:[], games:[]};
  const toolNames = {
    merge_pdf:"Merge PDF",split_pdf:"Split PDF",compress_pdf:"Compress PDF",pdf_to_word:"PDF to Word",
    edit_pdf:"Edit PDF",organize_pdf:"Organize PDF",page_numbers:"Page Numbers",
    watermark_pdf:"Watermark PDF",sign_pdf:"Sign PDF",protect_pdf:"Protect PDF",bengali_ocr:"Bengali OCR",
    resize_image:"Resize Image",compress_image:"Compress Image",convert_image:"Convert Image",
    background_remover:"Background Remover",signature_remover:"Signature Remover",
    watermark_remover:"Watermark Remover",
  };
  const gameNames = {
    riddlex:"Riddlex",ludo:"Ludu Mahir",chess:"Chess",tic_tac_toe:"Tic Tac Toe",
    snakes_and_ladders:"Snakes & Ladders",2048:"2048",
  };
  const fallbackNames = {
    home:"Homepage",chat:"AI Chat",tools_pdf:"PDF Tools",tools_image:"Image Tools",
    games:"Games",education:"Education",education_mcq:"MCQ Practice",
    education_notes:"Study Notes",islam:"Al-Quran & Islam",quran:"আল-কুরআন",
    quran_stories:"কুরআনে বর্ণিত কাহিনি",zikr_dua:"জিকির ও দোয়া",
    sports:"Sports",sports_football:"Football",sports_cricket:"Cricket",
    others:"Others",history:"ইতিহাস",folklore:"লোককথা ও মহাকাব্য",
    islamic_literature:"আরবি–ফারসি লোকসাহিত্য",site_info:"Information pages",
  };
  for(const code of Object.keys(toolNames))fallbackNames["tool_"+code]=toolNames[code];
  for(const code of Object.keys(gameNames))fallbackNames["game_"+code]=gameNames[code];
  for(const [group,books] of Object.entries(catalog.books)){
    for(const book of books)fallbackNames[book.id]=book.name;
  }
  Object.assign(fallbackNames,catalog.surahs);
  const sectionDefs=[
    {id:"chat",name:"AI Chat",entries:[["chat","AI Chat"]]},
    {id:"pdf",name:"PDF Tools",entries:[
      ["tools_pdf","PDF Tools"],
      ...catalog.pdf.map(slug=>["tool_"+slug.replace(/-/g,"_"),toolNames[slug.replace(/-/g,"_")]||slug]),
    ]},
    {id:"image",name:"Image Tools",entries:[
      ["tools_image","Image Tools"],
      ...catalog.image.map(slug=>["tool_"+slug.replace(/-/g,"_"),toolNames[slug.replace(/-/g,"_")]||slug]),
    ]},
    {id:"games",name:"Games",entries:[
      ["games","Games"],
      ...catalog.games.map(slug=>["game_"+slug.replace(/-/g,"_"),gameNames[slug.replace(/-/g,"_")]||slug]),
    ]},
    {id:"education",name:"Education",entries:[
      ["education","Education"],["education_mcq","MCQ Practice"],["education_notes","Study Notes"],
    ]},
    {id:"islam",name:"Al-Quran & Islam",entries:[
      ["islam","Al-Quran & Islam"],["quran-group","আল-কুরআন"],
      ["quran_stories","কুরআনে বর্ণিত কাহিনি"],["zikr_dua","জিকির ও দোয়া"],
    ]},
    {id:"sports",name:"Sports",entries:[
      ["sports","Sports"],["sports_football","Football"],["sports_cricket","Cricket"],
    ]},
    {id:"others",name:"Others",entries:[
      ["others","Others"],["category-history","ইতিহাস"],["category-folklore","লোককথা ও মহাকাব্য"],
      ["category-literature","আরবি–ফারসি লোকসাহিত্য"],
    ]},
  ];
  const num=n=>Number(n||0).toLocaleString("en-BD");
  const duration=n=>{const total=Math.round(Number(n)||0);return Math.floor(total/3600)+"h "+Math.floor(total%3600/60)+"m"};
  const empty={visitors:0,views:0,starts:0,completions:0,answers:0,errors:0,active_seconds:0};
  const fields=[
    ["visitors","Visitors ≈",num],["views","Views",num],["starts","Starts",num],
    ["completions","Completed",num],["answers","Answers",num],["errors","Errors",num],
    ["active_seconds","Active time",duration],
  ];
  const el=(tag,cls,text)=>{
    const node=document.createElement(tag);
    if(cls)node.className=cls;
    if(text!==undefined)node.textContent=text;
    return node;
  };
  function rowMetrics(host,metrics){
    const fieldsUsed=[["visitors","Visitors ≈",num],["views","Views",num],["active_seconds","Active time",duration]];
    for(const [key,caption,format] of fieldsUsed){
      const box=el("span","section-stat");
      box.append(el("small","section-stat-label",caption),el("strong","section-stat-value",format(metrics[key])));
      host.append(box);
    }
  }
  function makeTable(items){
    if(!items.length)return el("p","muted","No recorded activity.");
    const wrap=el("div","table-wrap"),table=el("table","section-metrics-table");
    const headings=el("tr");
    for(const name of ["Feature","Visitors ≈","Views","Starts","Completed","Answers","Errors","Active time"]){
      const th=el("th",null,name);th.scope="col";headings.append(th);
    }
    table.append(headings);
    const body=el("tbody");
    for(const {name,metrics} of items){
      const tr=el("tr");
      const textValues=[name,...fields.map(([key,,format])=>format(metrics[key]))];
      for(const value of textValues)tr.append(el("td",null,value));
      body.append(tr);
    }
    table.append(body);wrap.append(table);return wrap;
  }
  function details(title,metrics,children,cssClass){
    const parent=el("details",cssClass||"analytics-section");
    const summary=el("summary","section-summary");
    const label=el("span","section-title",title);
    summary.append(label);
    rowMetrics(summary,metrics);
    summary.append(el("span","section-chevron",""));
    parent.append(summary);
    const body=el("div","section-body");
    if(children)body.append(children);
    parent.append(body);
    return parent;
  }
  function featureRow(featureData,id,name){
    return {name,metrics:featureData.get(id)||empty};
  }
  function createOthersTree(def,featureData,data){
    const root=el("div","other-categories");
    const home=featureData.get("others");
    if(home?.views||home?.active_seconds||home?.starts){
      root.append(makeTable([{name:"Others",metrics:home}]));
    }
    for(const [group,id,title] of [
      ["history","history","ইতিহাস"],
      ["folklore","folklore","লোককথা ও মহাকাব্য"],
      ["literature","islamic_literature","আরবি–ফারসি লোকসাহিত্য"],
    ]){
      const metrics=data.subsections?.others?.[group]||empty;
      const rows=[featureRow(featureData,id,title)];
      const bookEntries=catalog.books[group]||[];
      for(const book of bookEntries)rows.push(featureRow(featureData,book.id,book.name));
      const inner=details(title,metrics,makeTable(rows),"analytics-subsection");
      inner.dataset.metricKey="others-"+group;
      root.append(inner);
    }
    return root;
  }
  function sectionChildren(def,featureData,data){
    if(def.id==="others")return createOthersTree(def,featureData,data);
    const rows=def.entries.map(([id,name])=>{
      if(id==="quran-group")return {name,metrics:data.subsections?.islam?.quran||empty};
      return featureRow(featureData,id,name);
    });
    return makeTable(rows);
  }
  function render(host,data){
    if(!host)return;
    const previouslyOpen=new Set([...host.querySelectorAll("details[open]")].map(x=>x.dataset.metricKey));
    const featureData=new Map((data.features||[]).map(item=>[item.feature,item]));
    host.replaceChildren();
    for(const def of sectionDefs){
      const metrics=data.sections?.[def.id]||empty;
      const node=details(def.name,metrics,sectionChildren(def,featureData,data));
      node.dataset.metricKey=def.id;
      if(previouslyOpen.has(def.id))node.open=true;
      for(const nested of node.querySelectorAll("[data-metric-key]")){
        if(previouslyOpen.has(nested.dataset.metricKey))nested.open=true;
      }
      host.append(node);
    }
  }
  function label(feature){
    return fallbackNames[feature]||String(feature||"No data").replace(/_/g," ");
  }
  window.WalidSectionMetrics={render,label,order:sectionDefs.map(x=>x.name)};
})();
