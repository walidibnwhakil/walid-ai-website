/*
 * 103,000 deterministic, distinct multi-subject practice items across 19
 * education scopes. Every item contains numeric inputs, an independently
 * checkable answer, four distinct choices and a worked explanation.
 *
 * These are *problem variants*, not 103,000 independently authored textbook
 * facts, official past exam questions or a claim of chapter completeness.
 */
export const DEFAULT_VARIANTS_PER_FAMILY = 500;
const MATH_10=["operation","unknown","percent","ratio","average","perimeter","area","triangle","travel","centimetres"];
const MATH_7=["operation","unknown","percent","ratio","average","perimeter","area","triangle","travel","gcd"];
const MATH_8=["operation","unknown","percent","ratio","average","perimeter","area","triangle","travel","sequence"];
const SCIENCE_9=["unknown","percent","ratio","average","perimeter","area","travel","force","electricalPower","density","oxygenCount"];
const SCIENCE_10=["unknown","quadratic","ratio","average","perimeter","area","travel","force","electricalPower","density","oxygenCount"];
const SCIENCE_HIGH=["unknown","quadratic","ratio","average","travel","force","electricalPower","density","oxygenCount","kineticEnergy","pressure"];
const COMMERCE_LOW=["unknown","percent","ratio","average","sale","interest","profit","discount","vat","equity","inventory"];
const COMMERCE_HIGH=["unknown","average","sale","interest","profit","discount","vat","equity","inventory","breakEven","commission"];
const ARTS_LOW=["unknown","percent","ratio","average","population","mapScale","votes","speed","calendar","sequence","centimetres"];
const ARTS_HIGH=["unknown","percent","ratio","average","population","mapScale","votes","speed","calendar","sequence","survey"];
const BCS=["unknown","percent","ratio","average","perimeter","area","sequence","travel","population","calendar","gcd"];
const familiesByScope={
  "6:common":MATH_10,"7:common":MATH_7,"8:common":MATH_8,
  "9:science":SCIENCE_9,"9:commerce":COMMERCE_LOW,"9:arts":ARTS_LOW,
  "10:science":SCIENCE_10,"10:commerce":COMMERCE_LOW,"10:arts":ARTS_LOW,
  "11:science":SCIENCE_HIGH,"11:commerce":COMMERCE_HIGH,"11:arts":ARTS_HIGH,
  "12:science":SCIENCE_HIGH,"12:commerce":COMMERCE_HIGH,"12:arts":ARTS_HIGH,
  "admission:science":SCIENCE_HIGH,"admission:commerce":COMMERCE_HIGH,
  "admission:arts":ARTS_HIGH,"bcs:common":BCS
};
export const SKILL_SCOPES=Object.freeze(Object.keys(familiesByScope));
export const EXPECTED_SKILL_COUNT=SKILL_SCOPES.reduce(
  (n,key)=>n+familiesByScope[key].length*DEFAULT_VARIANTS_PER_FAMILY,0);
export function skillKinds(level,stream) {
  return familiesByScope[String(level)+":"+(stream||"common")]?.slice()||[];
}
const p=(q,answer,why)=>({q,answer,why});
const formulas={
  operation:({a,b,c})=>p("("+a+" + "+b+") × "+c+" = কত?",(a+b)*c,
    "আগে বন্ধনীর যোগ "+(a+b)+"; এরপর "+c+" দিয়ে গুণ করলে "+((a+b)*c)+"।"),
  unknown:({a,b,c})=>p(b+"x + "+c+" = "+(a*b+c)+" হলে x কত?",a,
    "উভয় পাশ থেকে "+c+" বিয়োগ করে "+b+" দিয়ে ভাগ: x="+a+"।"),
  percent:({a,b})=>p((a*100)+" টাকার "+b+"% কত টাকা?",a*b,
    "মূল টাকার সঙ্গে শতকরা হার গুণ করে ১০০ দিয়ে ভাগ: "+(a*100)+"×"+b+"/১০০="+(a*b)+"।"),
  ratio:({a,b,c})=>p("একটি পরিমাণকে "+b+":"+c+" অনুপাতে ভাগ করা হলো। মোট "+((b+c)*a)+" হলে প্রথম অংশ কত?",b*a,
    "প্রথম অংশ = মোট × "+b+"/("+b+"+"+c+") = "+(b*a)+"।"),
  average:({a,b})=>p(a+", "+(a+b)+" ও "+(a+2*b)+" সংখ্যার গড় কত?",a+b,
    "যোগফল "+(3*(a+b))+"; তিন দিয়ে ভাগ করলে "+(a+b)+"।"),
  perimeter:({a,b})=>p("দৈর্ঘ্য "+a+" মিটার ও প্রস্থ "+b+" মিটার আয়তক্ষেত্রের পরিসীমা কত মিটার?",2*(a+b),
    "পরিসীমা = ২×(দৈর্ঘ্য+প্রস্থ) = "+(2*(a+b))+" মিটার।"),
  area:({a,b})=>p("দৈর্ঘ্য "+a+" মিটার ও প্রস্থ "+b+" মিটার আয়তক্ষেত্রের ক্ষেত্রফল কত বর্গমিটার?",a*b,
    "ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ = "+(a*b)+" বর্গমিটার।"),
  triangle:({a,b})=>p("ত্রিভুজের ভূমি "+(2*a)+" মিটার এবং লম্ব উচ্চতা "+b+" মিটার। ক্ষেত্রফল কত বর্গমিটার?",a*b,
    "ত্রিভুজের ক্ষেত্রফল = ১/২ × "+(2*a)+" × "+b+" = "+(a*b)+" বর্গমিটার।"),
  travel:({a,b})=>p("একটি গাড়ির গড় দ্রুতি ঘণ্টায় "+a+" কিমি। "+b+" ঘণ্টায় একই দ্রুতিতে কত কিমি যাবে?",a*b,
    "দূরত্ব = দ্রুতি × সময় = "+a+"×"+b+" = "+(a*b)+" কিমি।"),
  centimetres:({a,b})=>p(a+" মিটার ও "+b+" সেন্টিমিটার মিলে মোট কত সেন্টিমিটার?",a*100+b,
    "১ মিটার = ১০০ সেন্টিমিটার; তাই "+a+"×১০০+"+b+"="+(a*100+b)+" সেন্টিমিটার।"),
  gcd:({a,b})=>p("সংখ্যা "+(a*b)+" ও "+((a+1)*b)+"-এর গসাগু কত?",b,
    "সংখ্যাগুলো ধারাবাহিক দুই পূর্ণসংখ্যার "+b+" গুণিতক; তাই গসাগু "+b+"।"),
  sequence:({a,b})=>p(a+", "+(a+b)+", "+(a+2*b)+", "+(a+3*b)+", … ধারার পরের পদ কত?",a+4*b,
    "প্রতি ধাপে "+b+" যোগ হচ্ছে; পরের পদ "+(a+4*b)+"।"),
  quadratic:({a,b})=>p("(x−"+a+")(x−"+b+")=০ সমীকরণের বৃহত্তর মূল কোনটি?",a,
    "দুটি মূল "+a+" ও "+b+"; "+a+" বড় হওয়ায় সেটিই বৃহত্তর মূল।"),
  force:({a,b})=>p("ভর "+a+" kg ও ত্বরণ "+b+" m/s² হলে বল কত নিউটন?",a*b,
    "নিউটনের দ্বিতীয় সূত্র F=ma = "+a+"×"+b+" = "+(a*b)+" N।"),
  electricalPower:({a,b})=>p("বিভব পার্থক্য "+a+" V এবং তড়িৎপ্রবাহ "+b+" A হলে বৈদ্যুতিক ক্ষমতা কত ওয়াট?",a*b,
    "P=VI = "+a+"×"+b+" = "+(a*b)+" ওয়াট।"),
  density:({a,b})=>p("একটি বস্তুর ভর "+(a*b)+" গ্রাম ও আয়তন "+a+" ঘনসেমি। ঘনত্ব কত g/cm³?",b,
    "ঘনত্ব = ভর/আয়তন = "+(a*b)+"/"+a+" = "+b+" g/cm³।"),
  oxygenCount:({a,b})=>p(a+"টি H₂O অণু এবং "+b+"টি CO₂ অণুতে মোট অক্সিজেন পরমাণু কয়টি?",a+2*b,
    "প্রতিটি H₂O-তে একটি ও প্রতিটি CO₂-তে দুটি অক্সিজেন; মোট "+a+"+২×"+b+"="+(a+2*b)+"।"),
  kineticEnergy:({a,b})=>p("ভর "+(2*a)+" kg ও দ্রুতি "+b+" m/s হলে গতিশক্তি কত জুল?",a*b*b,
    "E=১/২ mv² = ১/২×"+(2*a)+"×"+b+"² = "+(a*b*b)+" জুল।"),
  pressure:({a,b})=>p("একটি পৃষ্ঠে "+(a*b)+" N বল "+a+" m² ক্ষেত্রফলে সমভাবে প্রয়োগ করলে গড় চাপ কত Pa?",b,
    "চাপ = লম্ব বল/ক্ষেত্রফল = "+(a*b)+"/"+a+" = "+b+" Pa।"),
  sale:({a,b})=>p("এক দোকানে "+a+"টি পণ্য প্রতিটি "+b+" টাকায় বিক্রি হলে মোট বিক্রয় কত টাকা?",a*b,
    "মোট বিক্রয় = পণ্যের সংখ্যা × একক মূল্য = "+(a*b)+" টাকা।"),
  interest:({a,b})=>p((a*100)+" টাকা মূলধনে বার্ষিক "+b+"% সরল সুদে এক বছরে সুদ কত টাকা?",a*b,
    "সরল সুদ = মূলধন×হার×সময়/১০০ = "+(a*b)+" টাকা।"),
  profit:({a,b})=>p((a*100)+" টাকা ক্রয়মূল্যের পণ্য "+b+"% লাভে বিক্রি করলে লাভ কত টাকা?",a*b,
    "লাভ = ক্রয়মূল্য × লাভের হার/১০০ = "+(a*b)+" টাকা।"),
  discount:({a,b})=>p((a*100)+" টাকার পণ্যে "+b+"% ছাড় দিলে ছাড়ের পর দাম কত টাকা?",a*(100-b),
    "বিক্রয়মূল্য = "+(a*100)+"×(১০০−"+b+")/১০০ = "+(a*(100-b))+" টাকা।"),
  vat:({a,b})=>p((a*100)+" টাকার পণ্যে "+b+"% কর যোগ করলে মোট মূল্য কত টাকা?",a*(100+b),
    "মোট = মূল দাম×(১০০+"+b+")/১০০ = "+(a*(100+b))+" টাকা। এটি অনুশীলনের কাল্পনিক হার।"),
  equity:({a,b})=>p("প্রতিষ্ঠানের মোট সম্পদ "+(a*1000)+" টাকা ও দায় "+(b*1000)+" টাকা হলে মালিকানা স্বত্ব কত?",(a-b)*1000,
    "স্বত্ব = সম্পদ − দায় = "+((a-b)*1000)+" টাকা।"),
  inventory:({a,b})=>p("মজুদে "+a+"টি অভিন্ন পণ্য, প্রতিটির ক্রয়মূল্য "+b+" টাকা। মোট ক্রয়মূল্য কত?",a*b,
    "মোট ক্রয়মূল্য = "+a+"×"+b+" = "+(a*b)+" টাকা।"),
  breakEven:({a,b})=>p("স্থির ব্যয় "+(a*b*10)+" টাকা এবং প্রতিটি পণ্য বিক্রয়ে অবদান "+(b*10)+" টাকা হলে সমচ্ছেদ বিন্দুতে কতটি পণ্য?",a,
    "সমচ্ছেদ পরিমাণ = স্থির ব্যয়/একক অবদান = "+(a*b*10)+"/"+(b*10)+" = "+a+"।"),
  commission:({a,b})=>p("মোট বিক্রয় "+(a*100)+" টাকা এবং কমিশন "+b+"% হলে কমিশন কত টাকা?",a*b,
    "কমিশন = বিক্রয়×হার/১০০ = "+(a*b)+" টাকা।"),
  population:({a,b})=>p("একটি অঞ্চলের আয়তন "+b+" বর্গকিমি ও জনসংখ্যা "+(a*b*100)+" জন। জনঘনত্ব কত জন/বর্গকিমি?",a*100,
    "জনঘনত্ব = জনসংখ্যা/আয়তন = "+(a*b*100)+"/"+b+" = "+(a*100)+"।"),
  mapScale:({a,b})=>p("মানচিত্রে "+(a/10)+" সেমি দূরত্ব। প্রতি সেমিতে "+(b*10)+" কিমি হলে বাস্তব দূরত্ব কত কিমি?",a*b,
    "বাস্তব দূরত্ব = মানচিত্র দূরত্ব × স্কেল = "+(a/10)+"×"+(b*10)+" = "+(a*b)+" কিমি।"),
  votes:({a,b})=>p("এক নির্বাচনে মোট "+(a*100)+"টি ভোটের "+b+"% এক প্রার্থী পেলে তিনি কতটি ভোট পান?",a*b,
    "ভোটসংখ্যা = মোট ভোট×শতকরা হার/১০০ = "+(a*b)+"।"),
  speed:({a,b})=>p("একটি যান "+(a*b)+" কিমি পথ "+b+" ঘণ্টায় অতিক্রম করল। গড় দ্রুতি কত কিমি/ঘণ্টা?",a,
    "গড় দ্রুতি = দূরত্ব/সময় = "+(a*b)+"/"+b+" = "+a+" কিমি/ঘণ্টা।"),
  calendar:({a,b})=>p(a+" সপ্তাহের পর আরও "+b+" দিন অতিবাহিত হলে মোট কত দিন?",a*7+b,
    "এক সপ্তাহে ৭ দিন; মোট "+a+"×৭+"+b+"="+(a*7+b)+" দিন।"),
  survey:({a,b})=>p("এক জরিপে "+(a*100)+" জনের "+b+"% সমর্থন জানিয়েছেন। সমর্থনকারীর সংখ্যা কত?",a*b,
    "সমর্থনকারীর সংখ্যা = "+(a*100)+"×"+b+"/১০০ = "+(a*b)+"।")
};
const SKILL_LESSON_METADATA={
  "operation":["বন্ধনীর হিসাব","একাধিক গাণিতিক ক্রিয়া একসঙ্গে থাকলে বন্ধনীর ভেতরের হিসাব আগে করতে হয়।"],
  "unknown":["এক চলকের সমীকরণ","সমীকরণের উভয় পাশে সমান গাণিতিক কাজ করে অজানা চলককে আলাদা করতে হয়।"],
  "percent":["শতকরা নির্ণয়","কোনো পরিমাণের p শতাংশ = পরিমাণ × p ÷ ১০০।"],
  "ratio":["অনুপাতে ভাগ","অনুপাতের মোট পদের যোগফল দিয়ে মোট পরিমাণ ভাগ করে প্রয়োজনীয় অংশ বের করতে হয়।"],
  "average":["গাণিতিক গড়","গাণিতিক গড় = সব রাশির যোগফল ÷ রাশির সংখ্যা।"],
  "perimeter":["আয়তক্ষেত্রের পরিসীমা","আয়তক্ষেত্রের পরিসীমা = ২ × (দৈর্ঘ্য + প্রস্থ)।"],
  "area":["আয়তক্ষেত্রের ক্ষেত্রফল","আয়তক্ষেত্রের ক্ষেত্রফল = দৈর্ঘ্য × প্রস্থ। ক্ষেত্রফল বর্গ এককে প্রকাশিত হয়।"],
  "triangle":["ত্রিভুজের ক্ষেত্রফল","ত্রিভুজের ক্ষেত্রফল = ১/২ × ভূমি × লম্ব উচ্চতা।"],
  "travel":["দ্রুতি, সময় ও দূরত্ব","ধ্রুব দ্রুতি হলে অতিক্রান্ত দূরত্ব = দ্রুতি × সময়।"],
  "centimetres":["মিটার ও সেন্টিমিটার","১ মিটার = ১০০ সেন্টিমিটার। ছোট এককে রূপান্তরের সময় উপযুক্ত গুণ করতে হয়।"],
  "gcd":["গরিষ্ঠ সাধারণ গুণনীয়ক","দুটি সংখ্যার সব সাধারণ গুণনীয়কের মধ্যে সর্ববৃহৎটি গসাগু।"],
  "sequence":["সমান্তর ধারা","সমান্তর ধারায় পরপর পদের পার্থক্য অপরিবর্তিত থাকে।"],
  "quadratic":["দ্বিঘাত সমীকরণের মূল","দুটি উৎপাদকের গুণফল শূন্য হলে অন্তত একটি উৎপাদক শূন্য হয়।"],
  "force":["বল ও ত্বরণ","ধ্রুব ভরের ক্ষেত্রে নিউটনের দ্বিতীয় সূত্রে F = ma।"],
  "electricalPower":["বৈদ্যুতিক ক্ষমতা","বৈদ্যুতিক ক্ষমতা P = VI; এখানে V বিভব পার্থক্য এবং I তড়িৎপ্রবাহ।"],
  "density":["ভর ও ঘনত্ব","ঘনত্ব = ভর ÷ আয়তন। সঠিক একক ব্যবহার করা অপরিহার্য।"],
  "oxygenCount":["রাসায়নিক সংকেতে পরমাণু","রাসায়নিক সংকেতের নিচের সংখ্যাটি ওই মৌলের পরমাণুর সংখ্যা বোঝায়।"],
  "kineticEnergy":["গতিশক্তির সূত্র","বেগ v ও ভর m হলে গতিশক্তি = ১/২ mv²।"],
  "pressure":["বল ও চাপ","প্রতি একক ক্ষেত্রফলে লম্ব বলের পরিমাণকে চাপ বলে: P = F/A।"],
  "sale":["মোট বিক্রয়ের হিসাব","মোট বিক্রয় = বিক্রীত পণ্যের সংখ্যা × একক বিক্রয়মূল্য।"],
  "interest":["সরল সুদের সূত্র","সরল সুদ = মূলধন × সুদের হার × সময় ÷ ১০০।"],
  "profit":["লাভের শতাংশ","ক্রয়মূল্যের ওপর নির্দিষ্ট হারে লাভের পরিমাণ বের করতে ক্রয়মূল্য × হার ÷ ১০০।"],
  "discount":["মূল্যছাড়ের পর দাম","শতকরা ছাড় বাদ দিলে মূল্য = মূলদাম × (১০০ − ছাড়ের হার) ÷ ১০০।"],
  "vat":["করসহ মোট মূল্য","এই অনুশীলনে প্রদত্ত কাল্পনিক করের হার যোগ করে মোট মূল্য হিসাব করা হয়; বাস্তব করহার ভিন্ন হতে পারে।"],
  "equity":["সম্পদ, দায় ও মালিকানা স্বত্ব","মৌলিক হিসাব সমীকরণ: সম্পদ = দায় + মালিকানা স্বত্ব।"],
  "inventory":["মজুদের মোট ক্রয়মূল্য","একই দামের পণ্যের মোট ক্রয়মূল্য = একক দাম × পণ্যের সংখ্যা।"],
  "breakEven":["সমচ্ছেদ বিন্দু","স্থির ব্যয়কে প্রতি এককের অবদান দিয়ে ভাগ করলে সরল সমচ্ছেদ পরিমাণ পাওয়া যায়।"],
  "commission":["বিক্রয় কমিশন","বিক্রয় কমিশন = মোট বিক্রয় × কমিশনের হার ÷ ১০০।"],
  "population":["জনসংখ্যার ঘনত্ব","জনঘনত্ব = জনসংখ্যা ÷ আয়তন; সাধারণ একক জন/বর্গকিলোমিটার।"],
  "mapScale":["মানচিত্রের স্কেল","মানচিত্রের দূরত্ব × প্রতি একক দৈর্ঘ্যের বাস্তব দূরত্ব = প্রকৃত দূরত্ব।"],
  "votes":["ভোটের শতকরা হিসাব","মোট ভোটের নির্দিষ্ট শতকরা অংশ = মোট ভোট × হার ÷ ১০০।"],
  "speed":["গড় দ্রুতি নির্ণয়","গড় দ্রুতি = মোট অতিক্রান্ত দূরত্ব ÷ মোট সময়।"],
  "calendar":["সপ্তাহ ও দিনের হিসাব","এক সপ্তাহে ৭ দিন; সপ্তাহকে দিনে রূপান্তর করে বাকি দিন যোগ করতে হয়।"],
  "survey":["জরিপ ও শতকরা","জরিপের মোট ব্যক্তির নির্দিষ্ট শতকরা অংশের সংখ্যা = মোট × হার ÷ ১০০।"]
};
const SUBJECT={
  operation:"গণিত",unknown:"গণিত",percent:"গণিত",ratio:"গণিত",average:"গণিত",
  perimeter:"গণিত",area:"গণিত",triangle:"গণিত",travel:"গণিত",
  centimetres:"গণিত",gcd:"গণিত",sequence:"গণিত",quadratic:"উচ্চতর গণিত",
  force:"পদার্থবিজ্ঞান",electricalPower:"পদার্থবিজ্ঞান",density:"পদার্থবিজ্ঞান",
  oxygenCount:"রসায়ন",kineticEnergy:"পদার্থবিজ্ঞান",pressure:"পদার্থবিজ্ঞান",
  sale:"হিসাববিজ্ঞান",interest:"ফিন্যান্স ও ব্যাংকিং",profit:"হিসাববিজ্ঞান",
  discount:"ফিন্যান্স ও ব্যাংকিং",vat:"ফিন্যান্স ও ব্যাংকিং",
  equity:"হিসাববিজ্ঞান",inventory:"হিসাববিজ্ঞান",breakEven:"ব্যবসায় সংগঠন",
  commission:"ফিন্যান্স ও ব্যাংকিং",population:"ভূগোল",mapScale:"ভূগোল",
  votes:"পৌরনীতি ও সুশাসন",speed:"ভূগোল",calendar:"যুক্তিবিদ্যা",survey:"পৌরনীতি ও সুশাসন"
};
function subjectFor(level,stream,kind){
  if(level==="bcs"){
    if(["population"].includes(kind))return "ভূগোল ও পরিবেশ";
    if(["sequence","calendar"].includes(kind))return "মানসিক দক্ষতা";
    if(["travel"].includes(kind))return "সাধারণ বিজ্ঞান";
    return "গাণিতিক যুক্তি";
  }
  if(!stream)return ["travel","centimetres"].includes(kind)?"বিজ্ঞান":"গণিত";
  if(stream==="science"){
    if(SUBJECT[kind]==="গণিত")return ["9","10"].includes(level)?"গণিত":"উচ্চতর গণিত";
    return SUBJECT[kind];
  }
  if(stream==="commerce"){
    if(["unknown","average"].includes(kind))return ["9","10"].includes(level)?"গণিত":"অর্থনীতি";
    if(["percent","ratio"].includes(kind))return "গণিত";
    return SUBJECT[kind];
  }
  if(stream==="arts"){
    if(["unknown","percent","ratio","average","centimetres"].includes(kind))
      return ["9","10"].includes(level)?"গণিত":(kind==="centimetres"?"ভূগোল":"অর্থনীতি");
    if(["sequence","calendar","gcd"].includes(kind))return "যুক্তিবিদ্যা";
    if(kind==="speed")return "ভূগোল";
    return SUBJECT[kind];
  }
  return SUBJECT[kind];
}
export function numericInputs(scopeIndex,index){
  return {a:50+index,b:3+scopeIndex,c:2+(index%7)};
}
export function createSkillItem(level,stream,kind,index){
  const scope=String(level)+":"+(stream||"common");
  const scopeIndex=SKILL_SCOPES.indexOf(scope);
  if(scopeIndex<0||!familiesByScope[scope].includes(kind)||!Number.isInteger(index)||index<0||
    index>=DEFAULT_VARIANTS_PER_FAMILY)throw Error("Invalid scope/family/index");
  const vars=numericInputs(scopeIndex,index);
  const {q,answer,why}=formulas[kind](vars);
  if(!Number.isSafeInteger(answer)||answer<=0)throw Error("Invalid numeric solution for "+kind);
  const {a,b}=vars;
  const wrong=[answer+b,answer+2*b+1,answer>b+3?answer-b-3:answer+3*b+5].map(String);
  const correct=String(answer);
  if(new Set([correct,...wrong]).size!==4)throw Error("Duplicate choices "+kind+"/"+index);
  const slot=(scopeIndex+index+kind.length)%4;
  const options=wrong.slice();options.splice(slot,0,correct);
  return {id:"skill-"+scope+"-"+kind+"-"+index,grade:Number(level)||null,
    scope,subject:subjectFor(String(level),stream,kind),
    chapter:"দক্ষতাভিত্তিক অনুশীলন: "+SKILL_LESSON_METADATA[kind][0],kind:"worked-skill",family:kind,
    variables:vars,q,options,answer:slot,why,generated:true};
}
export function createSkillPractice(level,stream,perFamily=DEFAULT_VARIANTS_PER_FAMILY){
  const families=skillKinds(level,stream);
  if(!Number.isInteger(perFamily)||perFamily<0||perFamily>DEFAULT_VARIANTS_PER_FAMILY)throw Error("Invalid variant count");
  const output=[];
  for(const family of families){
    for(let i=0;i<perFamily;i++)output.push(createSkillItem(level,stream,family,i));
  }
  return output;
}
export function createSkillNotes(level,stream){
  return skillKinds(level,stream).map((kind,i)=>{
    const item=createSkillItem(level,stream,kind,i+2);
    return {id:"skill-note-"+level+"-"+(stream||"common")+"-"+kind,
      scope:String(level),stream:stream||null,subject:item.subject,chapter:item.chapter,
      title:SKILL_LESSON_METADATA[kind][0]+" — উদাহরণ ও অনুশীলন",
      concept:SKILL_LESSON_METADATA[kind][1],
      explanation:item.why,
      example:item.q+" উত্তর: "+item.options[item.answer]+"। "+item.why,
      steps:"১. প্রশ্নে দেওয়া রাশিগুলো আলাদা করুন। ২. প্রাসঙ্গিক সূত্র নির্বাচন করুন। ৩. এককসহ হিসাব করুন। ৪. বিপরীত পদ্ধতিতে বা অন্যভাবে ফল যাচাই করুন।",
      practice:item.q,solution:item.options[item.answer]+"। "+item.why};
  });
}
