/* Original, lightweight SVG illustrations for worked Study Notes.
   Every figure is an explicitly labeled example, not an exact rendering of
   every numerical question. Unrelated topics intentionally show no diagram. */
const NS="http://www.w3.org/2000/svg";
function node(tag,attrs={},value){
  const el=document.createElementNS(NS,tag);
  for(const [key,v] of Object.entries(attrs))el.setAttribute(key,String(v));
  if(value!==undefined)el.textContent=value;
  return el;
}
function text(svg,x,y,value,opts={}){
  svg.append(node("text",{x,y,"font-size":opts.size||14,
    "font-weight":opts.bold?700:500,fill:opts.fill||"#234937",
    "text-anchor":opts.anchor||"middle"},value));
}
function line(svg,x1,y1,x2,y2,{dash,color,width}={}){
  svg.append(node("line",{x1,y1,x2,y2,stroke:color||"#518873",
    "stroke-width":width||2.5,...(dash?{"stroke-dasharray":"5 5"}:{})}));
}
function box(svg,x,y,w,h,{fill="#e8f3ec",stroke="#41876b",rx=8,width=2}={}){
  svg.append(node("rect",{x,y,width:w,height:h,rx,fill,stroke,"stroke-width":width}));
}
const illustrations=[
  {
    match:/ত্রিভুজের ক্ষেত্রফল/,
    title:"ত্রিভুজের ক্ষেত্রফল",
    caption:"উদাহরণ: ভূমি ৬ এবং উচ্চতা ৪ হলে ক্ষেত্রফল = ½ × ৬ × ৪ = ১২ বর্গ একক।",
    draw(svg){
      svg.append(node("polygon",{points:"85,143 270,143 168,35",fill:"#e8f3ec",stroke:"#20734f","stroke-width":3}));
      line(svg,168,35,168,143,{dash:true,color:"#b58a36"});
      text(svg,174,83,"উচ্চতা ৪",{size:13,anchor:"start"});
      text(svg,175,163,"ভূমি ৬",{size:14,bold:true});
      text(svg,176,185,"A = ½ × ভূমি × উচ্চতা",{size:15,bold:true});
    }
  },
  {
    match:/আয়তক্ষেত্রের ক্ষেত্রফল|আয়তক্ষেত্রের পরিসীমা/,
    title:"আয়তক্ষেত্রের বাহু ও ক্ষেত্রফল",
    caption:"উদাহরণ: দৈর্ঘ্য ৫ ও প্রস্থ ৩ হলে ক্ষেত্রফল ১৫ বর্গ একক, পরিসীমা ১৬ একক।",
    draw(svg){
      box(svg,92,36,190,108,{fill:"#edf6ef",stroke:"#20734f",rx:2,width:3});
      for(let i=1;i<5;i++)line(svg,92+i*38,36,92+i*38,144,{color:"#bbd7c6",width:1});
      for(let i=1;i<3;i++)line(svg,92,36+i*36,282,36+i*36,{color:"#bbd7c6",width:1});
      text(svg,187,29,"দৈর্ঘ্য ৫",{size:14,bold:true});
      text(svg,76,95,"৩",{size:14,bold:true});
      text(svg,188,173,"৫ × ৩ = ১৫ বর্গ একক",{size:15,bold:true});
    }
  },
  {
    match:/শতকরা নির্ণয়|জরিপ ও শতকরা|ভোটের শতকরা হিসাব|লাভের শতাংশ|মূল্যছাড়ের পর দাম|করসহ মোট মূল্য/,
    title:"শতকরা অংশ",
    caption:"উদাহরণ: ১০টি সমান ভাগের মধ্যে ৩টি অংশ রঙিন হলে সেটি ৩০ শতাংশ।",
    draw(svg){
      for(let i=0;i<10;i++)box(svg,33+i*31,70,25,31,{
        fill:i<3?"#308563":"#e9f2ed",stroke:i<3?"#1e6b4d":"#a6c8b4",rx:4,width:1.5});
      text(svg,185,49,"৩ / ১০ = ৩০%",{size:21,bold:true});
      text(svg,185,134,"শতাংশ = অংশ ÷ মোট × ১০০",{size:14});
    }
  },
  {
    match:/অনুপাতে ভাগ/,
    title:"অনুপাতের তুলনা",
    caption:"উদাহরণ: ২টি সবুজ ও ৩টি সোনালি বৃত্তের অনুপাত ২ : ৩।",
    draw(svg){
      for(let i=0;i<5;i++)svg.append(node("circle",{
        cx:88+i*49,cy:90,r:19,fill:i<2?"#2e8761":"#ead5a4",
        stroke:i<2?"#206e4e":"#b68e43","stroke-width":2}));
      text(svg,185,45,"অনুপাত ২ : ৩",{size:20,bold:true});
      text(svg,185,147,"২ + ৩ = ৫টি সমান অংশ",{size:14});
    }
  },
  {
    match:/সমান্তর ধারা/,
    title:"সমান ব্যবধানের ধারা",
    caption:"উদাহরণ: প্রতিবার ৩ যোগ করলে ২, ৫, ৮, ১১, ১৪... ধারাটি পাওয়া যায়।",
    draw(svg){
      const values=["২","৫","৮","১১","১৪"];
      for(let i=0;i<values.length;i++){
        box(svg,30+i*66,69,47,49,{fill:i===4?"#f8edce":"#e7f3eb",rx:10});
        text(svg,53+i*66,98,values[i],{size:21,bold:true});
        if(i<4)text(svg,86+i*66,100,"›",{size:23});
      }
      text(svg,185,45,"প্রতিটি ধাপে +৩",{size:17,bold:true});
      text(svg,185,149,"পরের পদ = আগের পদ + সাধারণ অন্তর",{size:12});
    }
  },
  {
    match:/ভর ও ঘনত্ব/,
    title:"ভর ও আয়তনের সম্পর্ক",
    caption:"উদাহরণ: ২০ গ্রাম ভর ও ৫ ঘনসেমি আয়তন হলে ঘনত্ব = ৪ g/cm³।",
    draw(svg){
      box(svg,45,57,123,77,{fill:"#e9f4ed"});
      box(svg,204,57,123,77,{fill:"#fff2d7",stroke:"#aa8b4b"});
      text(svg,107,79,"ভর",{size:14});
      text(svg,107,111,"২০ g",{size:20,bold:true});
      text(svg,265,79,"আয়তন",{size:14});
      text(svg,265,111,"৫ cm³",{size:20,bold:true});
      text(svg,185,162,"২০ ÷ ৫ = ৪ g/cm³",{size:16,bold:true});
    }
  },
  {
    match:/রাসায়নিক সংকেতে পরমাণু/,
    title:"পানির অণুর গঠন",
    caption:"উদাহরণ: H₂O অণুতে ২টি হাইড্রোজেন ও ১টি অক্সিজেন পরমাণু থাকে।",
    draw(svg){
      line(svg,160,90,93,58,{color:"#789c89",width:8});
      line(svg,208,90,274,58,{color:"#789c89",width:8});
      svg.append(node("circle",{cx:185,cy:109,r:40,fill:"#d8eafb",stroke:"#477da4","stroke-width":2}));
      svg.append(node("circle",{cx:95,cy:57,r:25,fill:"#f7ead0",stroke:"#ad915c","stroke-width":2}));
      svg.append(node("circle",{cx:275,cy:57,r:25,fill:"#f7ead0",stroke:"#ad915c","stroke-width":2}));
      text(svg,185,117,"O",{size:25,bold:true,fill:"#225579"});
      text(svg,95,63,"H",{size:19,bold:true});
      text(svg,275,63,"H",{size:19,bold:true});
      text(svg,185,182,"H₂O = ২ H + ১ O",{size:16,bold:true});
    }
  },
  {
    match:/বল ও ত্বরণ/,
    title:"নিউটনের দ্বিতীয় সূত্র",
    caption:"উদাহরণ: ২ kg ভরে ৩ m/s² ত্বরণ হলে বল = ৬ N।",
    draw(svg){
      box(svg,80,81,110,78,{fill:"#e7f1eb",stroke:"#2d7c5d"});
      text(svg,135,125,"m = ২ kg",{size:15,bold:true});
      line(svg,191,121,303,121,{color:"#a77b29",width:5});
      svg.append(node("polygon",{points:"307,121 293,110 293,132",fill:"#a77b29"}));
      text(svg,250,106,"F = ৬ N",{size:15,bold:true});
      text(svg,185,42,"F = m × a",{size:21,bold:true});
    }
  },
  {
    match:/সম্পদ, দায় ও মালিকানা স্বত্ব/,
    title:"হিসাব সমীকরণ",
    caption:"উদাহরণ: সম্পদ ১০০ টাকা হলে দায় ৪০ ও মালিকানা স্বত্ব ৬০ টাকায় সমীকরণ মিলে।",
    draw(svg){
      box(svg,38,59,106,74,{fill:"#e8f3ed"});
      text(svg,91,85,"সম্পদ",{size:14});
      text(svg,91,110,"১০০",{size:20,bold:true});
      text(svg,165,101,"=",{size:26,bold:true});
      box(svg,188,59,62,74,{fill:"#fff3d9",stroke:"#ad925d"});
      text(svg,219,84,"দায়",{size:13});
      text(svg,219,110,"৪০",{size:19,bold:true});
      text(svg,270,101,"+",{size:24,bold:true});
      box(svg,290,59,69,74,{fill:"#e8f3ed"});
      text(svg,325,83,"স্বত্ব",{size:13});
      text(svg,325,110,"৬০",{size:19,bold:true});
      text(svg,185,165,"সম্পদ = দায় + মালিকানা স্বত্ব",{size:13});
    }
  }
];
export function buildStudyVisual(note){
  const label=(note.title||"")+" "+(note.chapter||"");
  const config=illustrations.find(item=>item.match.test(label));
  if(!config)return null;
  const figure=document.createElement("figure");
  figure.className="lesson-illustration";
  const svg=node("svg",{viewBox:"0 0 375 200",role:"img","aria-label":config.title,
    xmlns:NS,preserveAspectRatio:"xMidYMid meet"});
  svg.append(node("title",{},config.title));
  config.draw(svg);
  const caption=document.createElement("figcaption");
  caption.textContent=config.caption;
  figure.append(svg,caption);
  return figure;
}
