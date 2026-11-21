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
    example:"প্রশ্ন: "+row.q+" — সঠিক উত্তর: "+row.correct+"।",
    steps:"প্রথমে প্রশ্নের মূল বিষয় শনাক্ত করুন; সংজ্ঞাটি উদাহরণে প্রয়োগ করুন; বিকল্পের মধ্যে অর্থের পার্থক্য মিলিয়ে নিন।",
    practice:row.q,solution:row.correct+"। "+row.why};
}
