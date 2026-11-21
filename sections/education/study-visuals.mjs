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
    match:/ভগ্নাংশের ধারণা|দশমিক ভগ্নাংশ/,
    title:"সমান ভাগে ভগ্নাংশ",
    caption:"উদাহরণ: চার ভাগের তিন ভাগ = ৩/৪; এটি দশমিকে ০.৭৫।",
    draw(svg){
      text(svg,185,44,"৩/৪ = ০.৭৫",{size:22,bold:true});
      for(let i=0;i<4;i++)box(svg,48+i*72,68,61,70,{
        fill:i<3?"#a7dcc0":"#eef3ef",stroke:i<3?"#2c805b":"#9bbdab",rx:6});
      text(svg,185,172,"৪ ভাগের মধ্যে ৩ ভাগ নেওয়া হয়েছে",{size:14});
    }
  },
  {
    match:/খাদ্যশৃঙ্খল/,
    title:"খাদ্যশৃঙ্খলে শক্তি স্থানান্তর",
    caption:"উদাহরণ: ঘাস উৎপাদক; ঘাসফড়িং, ব্যাঙ ও সাপ ধারাবাহিক খাদ্যগ্রাহক।",
    draw(svg){
      const names=["ঘাস","ঘাসফড়িং","ব্যাঙ","সাপ"];
      for(let i=0;i<names.length;i++){
        box(svg,19+i*91,69,74,67,{fill:i===0?"#d9f1e0":"#fff5df",rx:9});
        text(svg,56+i*91,109,names[i],{size:i===1?12:15,bold:true});
        if(i<3)text(svg,101+i*91,108,"→",{size:19,bold:true,fill:"#aa7e2f"});
      }
      text(svg,185,42,"উৎপাদক থেকে খাদ্যগ্রাহক",{size:17,bold:true});
      text(svg,185,163,"তীরচিহ্ন খাদ্যের মাধ্যমে শক্তির প্রবাহ দেখায়",{size:12});
    }
  },
  {
    match:/সালোকসংশ্লেষণ/,
    title:"সালোকসংশ্লেষণের উপাদান",
    caption:"সূর্যালোকের শক্তিতে উদ্ভিদ পানি ও CO₂ থেকে শর্করা তৈরি করে এবং অক্সিজেন ছাড়ে।",
    draw(svg){
      svg.append(node("circle",{cx:70,cy:55,r:24,fill:"#f8e6ae",stroke:"#c49a39","stroke-width":2}));
      text(svg,70,61,"☀",{size:26,fill:"#986e25"});
      svg.append(node("ellipse",{cx:178,cy:105,rx:49,ry:35,fill:"#d9f1dd",stroke:"#2d8356","stroke-width":2}));
      line(svg,155,125,200,88,{color:"#388559",width:3});
      text(svg,178,110,"পাতা",{size:18,bold:true});
      text(svg,105,119,"পানি",{size:13,anchor:"end"});
      text(svg,250,80,"CO₂",{size:15,anchor:"start"});
      text(svg,250,121,"O₂",{size:16,anchor:"start"});
      line(svg,105,113,126,113,{color:"#b58a36"});
      line(svg,226,85,250,85,{color:"#b58a36"});
      line(svg,226,119,245,119,{color:"#2d8356"});
      text(svg,185,167,"আলো + পানি + CO₂ → শর্করা + O₂",{size:13,bold:true});
    }
  },
  {
    match:/পদার্থের অবস্থা/,
    title:"কঠিন, তরল ও গ্যাস",
    caption:"তাপমাত্রা ও চাপের পরিবর্তনে পদার্থের অবস্থা বদলাতে পারে; বরফ গলে পানি হয়।",
    draw(svg){
      const labels=["কঠিন","তরল","গ্যাস"];
      for(let k=0;k<3;k++){
        const x=29+k*123;
        box(svg,x,60,101,88,{fill:"#f3f8f5",stroke:"#92bca8"});
        text(svg,x+50,47,labels[k],{size:15,bold:true});
        for(let i=0;i<9;i++){
          const px=k===0?x+28+(i%3)*21:k===1?x+18+(i%3)*31+(i%2)*5:x+16+(i%3)*34+(i%2)*9;
          const py=k===0?83+Math.floor(i/3)*20:k===1?88+Math.floor(i/3)*20:72+Math.floor(i/3)*30;
          svg.append(node("circle",{cx:px,cy:py,r:5,fill:k===2?"#e0bb78":"#58a483"}));
        }
      }
      text(svg,185,177,"কণাগুলোর অবস্থান একটি ধারণামূলক চিত্র",{size:12});
    }
  },
  {
    match:/ওহমের সূত্র|বিদ্যুৎপ্রবাহ|বৈদ্যুতিক ক্ষমতা/,
    title:"বিভব, প্রবাহ ও রোধের সম্পর্ক",
    caption:"উদাহরণ: ৩ A প্রবাহ এবং ২ Ω রোধ হলে V = IR = ৬ V। বৈদ্যুতিক ক্ষমতায় P = VI।",
    draw(svg){
      const heads=[["V","বিভব"],["I","প্রবাহ"],["R","রোধ"]];
      for(let i=0;i<heads.length;i++){
        const x=41+i*114;
        box(svg,x,63,87,80,{fill:i===1?"#fff2d5":"#e9f5ed",stroke:i===1?"#b5914e":"#41876b"});
        text(svg,x+43,102,heads[i][0],{size:26,bold:true});
        text(svg,x+43,129,heads[i][1],{size:12});
      }
      text(svg,185,42,"V = I × R",{size:23,bold:true});
      text(svg,185,171,"৬ V = ৩ A × ২ Ω",{size:16,bold:true});
    }
  },
  {
    match:/বৃত্তের পরিমাপ/,
    title:"বৃত্তের ব্যাসার্ধ ও ক্ষেত্রফল",
    caption:"উদাহরণ: ব্যাসার্ধ ৩ একক হলে ক্ষেত্রফল = π × ৩² = ৯π বর্গ একক।",
    draw(svg){
      svg.append(node("circle",{cx:185,cy:97,r:65,fill:"#e8f3eb",stroke:"#2b845e","stroke-width":3}));
      line(svg,185,97,250,97,{color:"#b78d3e",width:3});
      svg.append(node("circle",{cx:185,cy:97,r:4,fill:"#1c684a"}));
      text(svg,223,86,"r = ৩",{size:13,bold:true});
      text(svg,185,182,"A = πr²",{size:18,bold:true});
    }
  },
  {
    match:/ফাংশনের ধারণা/,
    title:"ফাংশনের ইনপুট ও আউটপুট",
    caption:"উদাহরণ: f(x) = ২x + ১; x = ৩ দিলে ফলাফল ৭।",
    draw(svg){
      box(svg,34,69,85,74,{fill:"#eef5ee"});
      box(svg,255,69,85,74,{fill:"#fff3df",stroke:"#ae8a45"});
      text(svg,76,95,"x = ৩",{size:16,bold:true});
      text(svg,76,121,"ইনপুট",{size:12});
      text(svg,297,95,"৭",{size:21,bold:true});
      text(svg,297,121,"আউটপুট",{size:12});
      line(svg,125,105,247,105,{color:"#367a58",width:3});
      svg.append(node("polygon",{points:"247,105 235,98 235,112",fill:"#367a58"}));
      text(svg,185,90,"f(x)=২x+১",{size:13,bold:true});
    }
  },
  {
    match:/তরঙ্গ/,
    title:"তরঙ্গদৈর্ঘ্যের ধারণা",
    caption:"একটি পর্যাবৃত্ত তরঙ্গের গতি, কম্পাঙ্ক ও তরঙ্গদৈর্ঘ্যের সম্পর্ক v = fλ।",
    draw(svg){
      svg.append(node("path",{d:"M25 108 C49 44 73 44 97 108 S145 172 169 108 S217 44 241 108 S289 172 313 108 S349 44 365 77",
        fill:"none",stroke:"#358666","stroke-width":4,"stroke-linecap":"round"}));
      line(svg,25,108,365,108,{dash:true,color:"#c1d8c9",width:1.5});
      line(svg,57,56,200,56,{color:"#b18a43",width:2});
      text(svg,129,45,"λ",{size:22,bold:true});
      text(svg,185,187,"v = f × λ",{size:18,bold:true});
    }
  },
  {
    match:/বাংলাদেশের ইতিহাসের গুরুত্বপূর্ণ ধাপ|বাংলাদেশের ইতিহাস ও রাষ্ট্রব্যবস্থা|ভাষা আন্দোলন/,
    title:"বাংলাদেশের ইতিহাস: ঘটনাক্রম",
    caption:"সময়ক্রমে: ১৯৫২ ভাষা আন্দোলন, ১৯৬৬ ছয় দফা, ১৯৬৯ গণঅভ্যুত্থান, ১৯৭১ মুক্তিযুদ্ধ।",
    draw(svg){
      line(svg,34,96,341,96,{color:"#5a9775",width:3});
      const years=["১৯৫২","১৯৬৬","১৯৬৯","১৯৭১"];
      const names=["ভাষা","ছয় দফা","গণঅভ্যুত্থান","মুক্তিযুদ্ধ"];
      for(let i=0;i<4;i++){
        const x=44+i*97;
        svg.append(node("circle",{cx:x,cy:96,r:8,fill:"#267852"}));
        text(svg,x,70,years[i],{size:14,bold:true});
        text(svg,x,121,names[i],{size:i===2?10.5:12});
      }
      text(svg,185,161,"ঐতিহাসিক ঘটনাগুলো সময়ক্রমে পড়ুন",{size:13});
    }
  },
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
