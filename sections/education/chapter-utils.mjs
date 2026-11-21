/* Supplementary subject-and-chapter preparation. These are original practice
   explanations, NOT official or exhaustive NCTB textbook chapter transcripts. */
export function rowGroup(level,stream,chapter,body){
  return body.trim().split("\n").map((line,index)=>{
    const fields=line.split("|").map(v=>v.trim());
    if(fields.length!==7||fields.some(x=>!x))throw Error("Invalid "+level+"/"+chapter+" line "+index);
    const [subject,q,correct,d1,d2,d3,why]=fields;
    if(new Set([correct,d1,d2,d3]).size!==4)throw Error("Duplicate choices "+level+"/"+q);
    return {level:String(level),stream:stream||null,chapter,subject,q,correct,wrong:[d1,d2,d3],why};
  });
}
export function makeQuestion(row,index){
  const slot=(index+row.q.length)%4,options=row.wrong.slice();
  options.splice(slot,0,row.correct);
  return {id:"chapter-"+row.level+"-"+(row.stream||"common")+"-"+index,
    grade:Number(row.level)||null,stream:row.stream||null,subject:row.subject,chapter:row.chapter,
    q:row.q,answer:slot,options,why:row.why};
}
export function makeLesson(row,index){
  return {id:"lesson-"+row.level+"-"+(row.stream||"common")+"-"+index,
    scope:String(row.level),stream:row.stream||null,subject:row.subject,chapter:row.chapter,
    title:row.chapter+" — "+row.q.replace(/[?？]$/,""),
    concept:row.correct+"। "+row.why,
    explanation:row.why+" বিষয়টির পরিভাষা, প্রয়োগ এবং কাছাকাছি ধারণার পার্থক্য বুঝে তারপর উত্তর নির্বাচন করুন।",
    example:"প্রশ্ন: "+row.q+"\nধারণা/কারণ: "+row.why+"\nসঠিক উত্তর: "+row.correct+"।",
    steps:"১) প্রশ্নটি পড়ুন: "+row.q+"\n২) প্রাসঙ্গিক নিয়ম বা তথ্য: "+row.why+"\n৩) সেই কারণে সঠিক উত্তর: "+row.correct+"।\n৪) '"+row.wrong[0]+"' বিকল্পটি কেন এই প্রশ্নের জন্য উপযুক্ত নয়, মিলিয়ে দেখুন।",
    practice:"ব্যাখ্যা করুন: '"+row.correct+"' কেন সঠিক এবং '"+row.wrong[0]+"' কেন নয়?\nমূল প্রশ্ন: "+row.q,solution:"সঠিক: "+row.correct+"। "+row.why+"\nবিকল্পের অর্থ মিলিয়ে দেখার সময় প্রশ্নের নির্দিষ্ট শর্ত খেয়াল করুন।"};
}

/* One multi-concept overview per chapter and subject, so students can
   read several connected ideas before answering the chapter questions. */
export function makeChapterOverviews(rows){
  const grouped=new Map();
  for(const row of rows){
    const key=[row.level,row.stream||"common",row.chapter,row.subject].join("::");
    if(!grouped.has(key))grouped.set(key,[]);
    grouped.get(key).push(row);
  }
  return [...grouped.entries()].map(([key,items],index)=>{
    const first=items[0],last=items.at(-1);
    return {
      id:"overview-"+index+"-"+key,scope:first.level,stream:first.stream,subject:first.subject,
      chapter:first.chapter,title:first.chapter+" — বিষয়সংক্ষেপ",
      concept:items.map((item,i)=>(i+1)+". "+item.correct+" — "+item.why).join("\n"),
      explanation:"এই পাঠে "+items.length+"টি ধারণা একসঙ্গে তুলনা করা হয়েছে। প্রতিটি ধারণার সংজ্ঞা, প্রয়োগ ও মূল পার্থক্য বুঝে পড়ুন। বিষয়গুলো একই পাঠক্ষেত্রের হলেও তাদের অর্থ এক নয়; তাই প্রশ্নের মূল শব্দের সঙ্গে সঠিক ধারণা মিলিয়ে উত্তর নির্বাচন করুন।",
      example:"উদাহরণ ১: "+first.q+"\nব্যাখ্যা: "+first.why+"\nউত্তর: "+first.correct+"।"+(items.length>1?"\n\nউদাহরণ ২: "+items[1].q+"\nব্যাখ্যা: "+items[1].why+"\nউত্তর: "+items[1].correct+"।":""),
      steps:"১) উপরের ধারণাগুলো আলাদা করে পড়ুন। ২) প্রতিটির সঙ্গে বাস্তব বা পাঠ্য উদাহরণ মিলিয়ে দেখুন। ৩) নিচের অনুশীলনটি সমাধান করুন এবং উত্তরের কারণ ব্যাখ্যা করুন।",
      practice:last.q,solution:last.correct+"। "+last.why
    };
  });
}
