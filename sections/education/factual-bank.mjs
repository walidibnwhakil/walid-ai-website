
/* Source-linked factual questions, snapshot 2026-11-21.
 * Each entry maps to one independent proposition, not numerical variants.
 * Dated Current Affairs are a static archive, NOT a live news feed.
 */
export const FACT_CHECKED_ON="2026-11-21";
const CAPITALS=[{"continent":"এশিয়া","country":"বাংলাদেশ","capital":"ঢাকা"},{"continent":"এশিয়া","country":"ভারত","capital":"নয়াদিল্লি"},{"continent":"এশিয়া","country":"পাকিস্তান","capital":"ইসলামাবাদ"},{"continent":"এশিয়া","country":"নেপাল","capital":"কাঠমান্ডু"},{"continent":"এশিয়া","country":"ভুটান","capital":"থিম্পু"},{"continent":"এশিয়া","country":"মালদ্বীপ","capital":"মালে"},{"continent":"এশিয়া","country":"চীন","capital":"বেইজিং"},{"continent":"এশিয়া","country":"জাপান","capital":"টোকিও"},{"continent":"এশিয়া","country":"দক্ষিণ কোরিয়া","capital":"সিউল"},{"continent":"এশিয়া","country":"উত্তর কোরিয়া","capital":"পিয়ংইয়ং"},{"continent":"এশিয়া","country":"মঙ্গোলিয়া","capital":"উলানবাটর"},{"continent":"এশিয়া","country":"মালয়েশিয়া","capital":"কুয়ালালামপুর"},{"continent":"এশিয়া","country":"সিঙ্গাপুর","capital":"সিঙ্গাপুর"},{"continent":"এশিয়া","country":"থাইল্যান্ড","capital":"ব্যাংকক"},{"continent":"এশিয়া","country":"ভিয়েতনাম","capital":"হ্যানয়"},{"continent":"এশিয়া","country":"লাওস","capital":"ভিয়েনতিয়েন"},{"continent":"এশিয়া","country":"কম্বোডিয়া","capital":"নমপেন"},{"continent":"এশিয়া","country":"মিয়ানমার","capital":"নেপিদো"},{"continent":"এশিয়া","country":"ফিলিপাইন","capital":"ম্যানিলা"},{"continent":"এশিয়া","country":"ব্রুনেই","capital":"বন্দর সেরি বেগাওয়ান"},{"continent":"এশিয়া","country":"তিমুর-লেস্তে","capital":"দিলি"},{"continent":"এশিয়া","country":"ইরান","capital":"তেহরান"},{"continent":"এশিয়া","country":"ইরাক","capital":"বাগদাদ"},{"continent":"এশিয়া","country":"সৌদি আরব","capital":"রিয়াদ"},{"continent":"এশিয়া","country":"কাতার","capital":"দোহা"},{"continent":"এশিয়া","country":"কুয়েত","capital":"কুয়েত সিটি"},{"continent":"এশিয়া","country":"বাহরাইন","capital":"মানামা"},{"continent":"এশিয়া","country":"সংযুক্ত আরব আমিরাত","capital":"আবুধাবি"},{"continent":"এশিয়া","country":"ওমান","capital":"মাসকাট"},{"continent":"এশিয়া","country":"জর্ডান","capital":"আম্মান"},{"continent":"এশিয়া","country":"লেবানন","capital":"বৈরুত"},{"continent":"এশিয়া","country":"সিরিয়া","capital":"দামেস্ক"},{"continent":"এশিয়া","country":"তুরস্ক","capital":"আঙ্কারা"},{"continent":"এশিয়া","country":"আজারবাইজান","capital":"বাকু"},{"continent":"এশিয়া","country":"আর্মেনিয়া","capital":"ইয়েরেভান"},{"continent":"এশিয়া","country":"জর্জিয়া","capital":"তিবলিসি"},{"continent":"এশিয়া","country":"উজবেকিস্তান","capital":"তাশখন্দ"},{"continent":"এশিয়া","country":"কাজাখস্তান","capital":"আস্তানা"},{"continent":"এশিয়া","country":"কিরগিজস্তান","capital":"বিশকেক"},{"continent":"এশিয়া","country":"তাজিকিস্তান","capital":"দুশানবে"},{"continent":"এশিয়া","country":"তুর্কমেনিস্তান","capital":"আশগাবাত"},{"continent":"এশিয়া","country":"আফগানিস্তান","capital":"কাবুল"},{"continent":"ইউরোপ","country":"যুক্তরাজ্য","capital":"লন্ডন"},{"continent":"ইউরোপ","country":"ফ্রান্স","capital":"প্যারিস"},{"continent":"ইউরোপ","country":"জার্মানি","capital":"বার্লিন"},{"continent":"ইউরোপ","country":"ইতালি","capital":"রোম"},{"continent":"ইউরোপ","country":"স্পেন","capital":"মাদ্রিদ"},{"continent":"ইউরোপ","country":"পর্তুগাল","capital":"লিসবন"},{"continent":"ইউরোপ","country":"রাশিয়া","capital":"মস্কো"},{"continent":"ইউরোপ","country":"ইউক্রেন","capital":"কিয়েভ"},{"continent":"ইউরোপ","country":"পোল্যান্ড","capital":"ওয়ারশ"},{"continent":"ইউরোপ","country":"চেকিয়া","capital":"প্রাগ"},{"continent":"ইউরোপ","country":"স্লোভাকিয়া","capital":"ব্রাতিস্লাভা"},{"continent":"ইউরোপ","country":"অস্ট্রিয়া","capital":"ভিয়েনা"},{"continent":"ইউরোপ","country":"হাঙ্গেরি","capital":"বুদাপেস্ট"},{"continent":"ইউরোপ","country":"রোমানিয়া","capital":"বুখারেস্ট"},{"continent":"ইউরোপ","country":"বুলগেরিয়া","capital":"সোফিয়া"},{"continent":"ইউরোপ","country":"গ্রিস","capital":"এথেন্স"},{"continent":"ইউরোপ","country":"ক্রোয়েশিয়া","capital":"জাগরেব"},{"continent":"ইউরোপ","country":"সার্বিয়া","capital":"বেলগ্রেড"},{"continent":"ইউরোপ","country":"বসনিয়া ও হার্জেগোভিনা","capital":"সারায়েভো"},{"continent":"ইউরোপ","country":"স্লোভেনিয়া","capital":"লিউব্লিয়ানা"},{"continent":"ইউরোপ","country":"আলবেনিয়া","capital":"তিরানা"},{"continent":"ইউরোপ","country":"উত্তর মেসিডোনিয়া","capital":"স্কোপিয়ে"},{"continent":"ইউরোপ","country":"মন্টিনেগ্রো","capital":"পোদগোরিৎসা"},{"continent":"ইউরোপ","country":"নরওয়ে","capital":"অসলো"},{"continent":"ইউরোপ","country":"সুইডেন","capital":"স্টকহোম"},{"continent":"ইউরোপ","country":"ফিনল্যান্ড","capital":"হেলসিঙ্কি"},{"continent":"ইউরোপ","country":"ডেনমার্ক","capital":"কোপেনহেগেন"},{"continent":"ইউরোপ","country":"আইসল্যান্ড","capital":"রেইকিয়াভিক"},{"continent":"ইউরোপ","country":"আয়ারল্যান্ড","capital":"ডাবলিন"},{"continent":"ইউরোপ","country":"বেলজিয়াম","capital":"ব্রাসেলস"},{"continent":"ইউরোপ","country":"নেদারল্যান্ডস","capital":"আমস্টারডাম"},{"continent":"ইউরোপ","country":"লুক্সেমবার্গ","capital":"লুক্সেমবার্গ সিটি"},{"continent":"ইউরোপ","country":"সুইজারল্যান্ড","capital":"বার্ন"},{"continent":"ইউরোপ","country":"এস্তোনিয়া","capital":"তাল্লিন"},{"continent":"ইউরোপ","country":"লাটভিয়া","capital":"রিগা"},{"continent":"ইউরোপ","country":"লিথুয়ানিয়া","capital":"ভিলনিয়ুস"},{"continent":"ইউরোপ","country":"বেলারুশ","capital":"মিনস্ক"},{"continent":"ইউরোপ","country":"মলদোভা","capital":"কিশিনাউ"},{"continent":"ইউরোপ","country":"সাইপ্রাস","capital":"নিকোসিয়া"},{"continent":"ইউরোপ","country":"মাল্টা","capital":"ভালেত্তা"},{"continent":"আফ্রিকা","country":"মিশর","capital":"কায়রো"},{"continent":"আফ্রিকা","country":"লিবিয়া","capital":"ত্রিপোলি"},{"continent":"আফ্রিকা","country":"তিউনিসিয়া","capital":"তিউনিস"},{"continent":"আফ্রিকা","country":"আলজেরিয়া","capital":"আলজিয়ার্স"},{"continent":"আফ্রিকা","country":"মরক্কো","capital":"রাবাত"},{"continent":"আফ্রিকা","country":"সুদান","capital":"খার্তুম"},{"continent":"আফ্রিকা","country":"দক্ষিণ সুদান","capital":"জুবা"},{"continent":"আফ্রিকা","country":"ইথিওপিয়া","capital":"আদ্দিস আবাবা"},{"continent":"আফ্রিকা","country":"ইরিত্রিয়া","capital":"আসমারা"},{"continent":"আফ্রিকা","country":"জিবুতি","capital":"জিবুতি সিটি"},{"continent":"আফ্রিকা","country":"সোমালিয়া","capital":"মোগাদিশু"},{"continent":"আফ্রিকা","country":"কেনিয়া","capital":"নাইরোবি"},{"continent":"আফ্রিকা","country":"তানজানিয়া","capital":"দোদোমা"},{"continent":"আফ্রিকা","country":"উগান্ডা","capital":"কাম্পালা"},{"continent":"আফ্রিকা","country":"রুয়ান্ডা","capital":"কিগালি"},{"continent":"আফ্রিকা","country":"বুরুন্ডি","capital":"গিতেগা"},{"continent":"আফ্রিকা","country":"কঙ্গো গণতান্ত্রিক প্রজাতন্ত্র","capital":"কিনশাসা"},{"continent":"আফ্রিকা","country":"কঙ্গো প্রজাতন্ত্র","capital":"ব্রাজাভিল"},{"continent":"আফ্রিকা","country":"অ্যাঙ্গোলা","capital":"লুয়ান্ডা"},{"continent":"আফ্রিকা","country":"জাম্বিয়া","capital":"লুসাকা"},{"continent":"আফ্রিকা","country":"জিম্বাবুয়ে","capital":"হারারে"},{"continent":"আফ্রিকা","country":"মোজাম্বিক","capital":"মাপুতো"},{"continent":"আফ্রিকা","country":"নামিবিয়া","capital":"উইন্ডহোক"},{"continent":"আফ্রিকা","country":"বতসোয়ানা","capital":"গ্যাবোরোন"},{"continent":"আফ্রিকা","country":"নাইজেরিয়া","capital":"আবুজা"},{"continent":"আফ্রিকা","country":"ঘানা","capital":"আক্রা"},{"continent":"আফ্রিকা","country":"সেনেগাল","capital":"ডাকার"},{"continent":"আফ্রিকা","country":"গাম্বিয়া","capital":"বানজুল"},{"continent":"আফ্রিকা","country":"মালি","capital":"বামাকো"},{"continent":"আফ্রিকা","country":"নাইজার","capital":"নিয়ামে"},{"continent":"আফ্রিকা","country":"চাদ","capital":"এনজামেনা"},{"continent":"আফ্রিকা","country":"ক্যামেরুন","capital":"ইয়াউন্দে"},{"continent":"আফ্রিকা","country":"গ্যাবন","capital":"লিব্রেভিল"},{"continent":"আফ্রিকা","country":"মরিশাস","capital":"পোর্ট লুইস"},{"continent":"আফ্রিকা","country":"মাদাগাস্কার","capital":"আন্তানানারিভো"},{"continent":"আমেরিকা","country":"যুক্তরাষ্ট্র","capital":"ওয়াশিংটন ডিসি"},{"continent":"আমেরিকা","country":"কানাডা","capital":"অটোয়া"},{"continent":"আমেরিকা","country":"মেক্সিকো","capital":"মেক্সিকো সিটি"},{"continent":"আমেরিকা","country":"কিউবা","capital":"হাভানা"},{"continent":"আমেরিকা","country":"জ্যামাইকা","capital":"কিংস্টন"},{"continent":"আমেরিকা","country":"হাইতি","capital":"পোর্ট-অ-প্রিন্স"},{"continent":"আমেরিকা","country":"ডোমিনিকান প্রজাতন্ত্র","capital":"সান্তো দোমিঙ্গো"},{"continent":"আমেরিকা","country":"বাহামাস","capital":"নাসাউ"},{"continent":"আমেরিকা","country":"বার্বাডোস","capital":"ব্রিজটাউন"},{"continent":"আমেরিকা","country":"গুয়াতেমালা","capital":"গুয়াতেমালা সিটি"},{"continent":"আমেরিকা","country":"বেলিজ","capital":"বেলমোপান"},{"continent":"আমেরিকা","country":"হন্ডুরাস","capital":"তেগুসিগালপা"},{"continent":"আমেরিকা","country":"এল সালভাদর","capital":"সান সালভাদর"},{"continent":"আমেরিকা","country":"নিকারাগুয়া","capital":"মানাগুয়া"},{"continent":"আমেরিকা","country":"কোস্টারিকা","capital":"সান হোসে"},{"continent":"আমেরিকা","country":"পানামা","capital":"পানামা সিটি"},{"continent":"আমেরিকা","country":"ব্রাজিল","capital":"ব্রাসিলিয়া"},{"continent":"আমেরিকা","country":"আর্জেন্টিনা","capital":"বুয়েনোস আইরেস"},{"continent":"আমেরিকা","country":"চিলি","capital":"সান্তিয়াগো"},{"continent":"আমেরিকা","country":"পেরু","capital":"লিমা"},{"continent":"আমেরিকা","country":"কলম্বিয়া","capital":"বোগোতা"},{"continent":"আমেরিকা","country":"ভেনেজুয়েলা","capital":"কারাকাস"},{"continent":"আমেরিকা","country":"ইকুয়েডর","capital":"কুইটো"},{"continent":"আমেরিকা","country":"উরুগুয়ে","capital":"মন্তেভিদেও"},{"continent":"আমেরিকা","country":"প্যারাগুয়ে","capital":"আসুনসিওন"},{"continent":"আমেরিকা","country":"গায়ানা","capital":"জর্জটাউন"},{"continent":"আমেরিকা","country":"সুরিনাম","capital":"পারামারিবো"},{"continent":"ওশেনিয়া","country":"অস্ট্রেলিয়া","capital":"ক্যানবেরা"},{"continent":"ওশেনিয়া","country":"নিউজিল্যান্ড","capital":"ওয়েলিংটন"},{"continent":"ওশেনিয়া","country":"ফিজি","capital":"সুভা"},{"continent":"ওশেনিয়া","country":"পাপুয়া নিউগিনি","capital":"পোর্ট মোরসবি"},{"continent":"ওশেনিয়া","country":"সামোয়া","capital":"আপিয়া"},{"continent":"ওশেনিয়া","country":"টোঙ্গা","capital":"নুকুয়ালোফা"},{"continent":"ওশেনিয়া","country":"ভানুয়াতু","capital":"পোর্ট ভিলা"},{"continent":"ওশেনিয়া","country":"সলোমন দ্বীপপুঞ্জ","capital":"হোনিয়ারা"}];
const SDGS=["দারিদ্র্য বিলোপ","ক্ষুধামুক্তি","সুস্বাস্থ্য ও কল্যাণ","মানসম্মত শিক্ষা","লিঙ্গসমতা","বিশুদ্ধ পানি ও স্যানিটেশন","সাশ্রয়ী ও পরিচ্ছন্ন জ্বালানি","শোভন কাজ ও অর্থনৈতিক প্রবৃদ্ধি","শিল্প, উদ্ভাবন ও অবকাঠামো","অসমতা হ্রাস","টেকসই নগর ও জনপদ","পরিমিত ভোগ ও উৎপাদন","জলবায়ু কার্যক্রম","জলজ জীবন","স্থলজ জীবন","শান্তি, ন্যায়বিচার ও কার্যকর প্রতিষ্ঠান","অভীষ্ট অর্জনে অংশীদারত্ব"];
const BODIES=[["WHO","বিশ্ব স্বাস্থ্য সংস্থা","জনস্বাস্থ্য"],["UNESCO","জাতিসংঘ শিক্ষা, বিজ্ঞান ও সংস্কৃতি সংস্থা","শিক্ষা, বিজ্ঞান ও সংস্কৃতি"],["UNICEF","জাতিসংঘ শিশু তহবিল","শিশুদের কল্যাণ"],["UNHCR","জাতিসংঘ শরণার্থী সংস্থা","শরণার্থী সুরক্ষা"],["UNDP","জাতিসংঘ উন্নয়ন কর্মসূচি","উন্নয়ন সহায়তা"],["FAO","জাতিসংঘের খাদ্য ও কৃষি সংস্থা","খাদ্য ও কৃষি"],["ILO","আন্তর্জাতিক শ্রম সংস্থা","শ্রমমান ও শ্রমিক অধিকার"],["IMF","আন্তর্জাতিক মুদ্রা তহবিল","আন্তর্জাতিক মুদ্রা ও অর্থনৈতিক স্থিতিশীলতা"],["World Bank","বিশ্বব্যাংক","উন্নয়ন অর্থায়ন"],["WTO","বিশ্ব বাণিজ্য সংস্থা","আন্তর্জাতিক বাণিজ্যব্যবস্থা"],["ICAO","আন্তর্জাতিক বেসামরিক বিমান চলাচল সংস্থা","বেসামরিক বিমান চলাচল"],["IMO","আন্তর্জাতিক সামুদ্রিক সংস্থা","নৌপরিবহন নিরাপত্তা"],["ITU","আন্তর্জাতিক টেলিযোগাযোগ ইউনিয়ন","টেলিযোগাযোগ"],["WMO","বিশ্ব আবহাওয়া সংস্থা","আবহাওয়া ও জলবায়ু"],["WIPO","বিশ্ব মেধাস্বত্ব সংস্থা","মেধাস্বত্ব"],["IAEA","আন্তর্জাতিক আণবিক শক্তি সংস্থা","শান্তিপূর্ণ পরমাণু শক্তি"],["UNEP","জাতিসংঘ পরিবেশ কর্মসূচি","পরিবেশ"],["UNFPA","জাতিসংঘ জনসংখ্যা তহবিল","জনসংখ্যা ও প্রজননস্বাস্থ্য"],["IFAD","আন্তর্জাতিক কৃষি উন্নয়ন তহবিল","গ্রামীণ উন্নয়ন"],["WFP","বিশ্ব খাদ্য কর্মসূচি","খাদ্য সহায়তা"]];
const DAYS=[["২১ ফেব্রুয়ারি","আন্তর্জাতিক মাতৃভাষা দিবস"],["৮ মার্চ","আন্তর্জাতিক নারী দিবস"],["২২ মার্চ","বিশ্ব পানি দিবস"],["৭ এপ্রিল","বিশ্ব স্বাস্থ্য দিবস"],["২২ এপ্রিল","আন্তর্জাতিক ধরিত্রী দিবস"],["১ মে","আন্তর্জাতিক শ্রমিক দিবস"],["৩ মে","বিশ্ব মুক্ত গণমাধ্যম দিবস"],["৫ জুন","বিশ্ব পরিবেশ দিবস"],["৮ জুন","বিশ্ব মহাসাগর দিবস"],["২০ জুন","বিশ্ব শরণার্থী দিবস"],["১১ জুলাই","বিশ্ব জনসংখ্যা দিবস"],["১২ আগস্ট","আন্তর্জাতিক যুব দিবস"],["৮ সেপ্টেম্বর","আন্তর্জাতিক সাক্ষরতা দিবস"],["২১ সেপ্টেম্বর","আন্তর্জাতিক শান্তি দিবস"],["৫ অক্টোবর","বিশ্ব শিক্ষক দিবস"],["১৬ অক্টোবর","বিশ্ব খাদ্য দিবস"],["২৪ অক্টোবর","জাতিসংঘ দিবস"],["১০ ডিসেম্বর","মানবাধিকার দিবস"]];
const CAP_SOURCE="https://www.mfa.gov.tr/data/Terminoloji/the-list-of-countries-and-their-capitals.pdf";
const SDG_SOURCE="https://sdgs.un.org/goals";
const UN_SOURCE="https://www.un.org/en/about-us";

const rows=[];
function add(subject,chapter,q,correct,wrong,why,source,eventDate=null,kind="factual"){
 if(!subject||!chapter||!q||!correct||!why||!source||!Array.isArray(wrong)||
  wrong.length!==3||new Set([correct,...wrong]).size!==4)throw Error("Invalid factual row "+q);
 rows.push({subject,chapter,q,correct,wrong,why,source,checkedOn:FACT_CHECKED_ON,eventDate,kind});
}
function alternatives(items,index,getValue){
 const correct=getValue(items[index]);const out=[];
 for(const at of [index+7,index+37,index+71,index+13,index+43]){
   const candidate=getValue(items[at%items.length]);
   if(candidate!==correct&&!out.includes(candidate))out.push(candidate);
   if(out.length===3)break;
 }
 if(out.length!==3)throw Error("Insufficient answer alternatives");
 return out;
}
CAPITALS.forEach((row,i)=>add(
 "আন্তর্জাতিক বিষয়াবলি","বিশ্বের রাজধানী — "+row.continent,
 row.country+"-এর রাজধানী কোনটি?",row.capital,
 alternatives(CAPITALS,i,x=>x.capital),
 row.country+"-এর রাজধানী "+row.capital+"; অঞ্চল: "+row.continent+"।",
 CAP_SOURCE
));
SDGS.forEach((goal,i)=>add(
 "আন্তর্জাতিক বিষয়াবলি","জাতিসংঘ: টেকসই উন্নয়ন অভীষ্ট",
 "জাতিসংঘের SDG "+(i+1)+"-এর মূল বিষয় কোনটি?",goal,
 [SDGS[(i+3)%17],SDGS[(i+7)%17],SDGS[(i+11)%17]],
 "২০৩০ এজেন্ডার SDG "+(i+1)+"-এর মূল লক্ষ্য "+goal+"।",SDG_SOURCE
));
BODIES.forEach(([abbr,name,role],i)=>add(
 "আন্তর্জাতিক বিষয়াবলি","আন্তর্জাতিক সংস্থা ও ভূমিকা",
 abbr+"-এর পরিচয় কোনটি?",name,
 [BODIES[(i+4)%BODIES.length][1],BODIES[(i+9)%BODIES.length][1],BODIES[(i+13)%BODIES.length][1]],
 abbr+" ("+name+") প্রধানত "+role+" নিয়ে কাজ করে।",
 "https://www.un.org/en/about-us/un-system"
));
DAYS.forEach(([date,name],i)=>add(
 "আন্তর্জাতিক বিষয়াবলি","আন্তর্জাতিক দিবস",
 name+" কবে পালিত হয়?",date,
 alternatives(DAYS,i,x=>x[0]),
 name+" পালন করা হয় "+date+"।",
 "https://www.un.org/en/observances/list-days-weeks"
));
function simple(chapter,rows,source,subject="আন্তর্জাতিক বিষয়াবলি"){
 for(const [q,correct,w1,w2,w3,why] of rows)
   add(subject,chapter,q,correct,[w1,w2,w3],why,source);
}
simple("জাতিসংঘ ও বৈশ্বিক প্রশাসন",[
["জাতিসংঘ প্রতিষ্ঠিত হয় কোন সালে?","১৯৪৫","১৯১৯","১৯৫৫","১৯৮৫","জাতিসংঘ ১৯৪৫ সালে প্রতিষ্ঠিত হয়।"],
["জাতিসংঘের সদস্যরাষ্ট্র সংখ্যা কত (২০২৬ সালে)?","১৯৩","১৯২","১৯৫","১৯৬","জাতিসংঘের মোট ১৯৩টি সদস্যরাষ্ট্র আছে।"],
["জাতিসংঘ নিরাপত্তা পরিষদের স্থায়ী সদস্য কতটি?","৫টি","১০টি","১৫টি","১৯৩টি","নিরাপত্তা পরিষদের পাঁচটি স্থায়ী সদস্য।"],
["জাতিসংঘের নিরাপত্তা পরিষদে মোট সদস্য কতটি?","১৫টি","৫টি","১০টি","১৯৩টি","পাঁচ স্থায়ী ও দশ অস্থায়ী সদস্য মিলে পনেরো।"]
],UN_SOURCE);
simple("টেকসই উন্নয়ন ও আন্তর্জাতিক চুক্তি",[
["SDG-এর মোট কয়টি অভীষ্ট?","১৭টি","১৫টি","১৮টি","২০টি","জাতিসংঘ ২০৩০ এজেন্ডায় ১৭টি অভীষ্ট।"],
["SDG কোন সালে গৃহীত হয়?","২০১৫","২০০০","২০১০","২০২০","২০১৫ সালে জাতিসংঘ ২০৩০ এজেন্ডা গ্রহণ করে।"],
["SDG বাস্তবায়নের লক্ষ্যবছর কত?","২০৩০","২০২৫","২০৪০","২০৫০","২০৩০ সালের মধ্যে SDG বাস্তবায়ন লক্ষ্য।"]
],SDG_SOURCE);
simple("আন্তর্জাতিক মানবাধিকার",[
["সর্বজনীন মানবাধিকার ঘোষণাপত্র (UDHR) কোন সালে গৃহীত হয়?","১৯৪৮","১৯৪৫","১৯৬৬","১৯৭১","UDHR ১৯৪৮ সালের ১০ ডিসেম্বর গৃহীত।"],
["সর্বজনীন মানবাধিকার ঘোষণাপত্র গৃহীত হয় কোন তারিখে?","১০ ডিসেম্বর ১৯৪৮","২৪ অক্টোবর ১৯৪৫","২১ ফেব্রুয়ারি ১৯৫২","১৬ ডিসেম্বর ১৯৭১","জাতিসংঘ সাধারণ পরিষদ UDHR গ্রহণ করে ১০ ডিসেম্বর ১৯৪৮।"]
],"https://www.un.org/en/about-us/universal-declaration-of-human-rights");
simple("জলবায়ু কূটনীতি",[
["প্যারিস জলবায়ু চুক্তি কোন সালে গৃহীত হয়?","২০১৫","১৯৯২","২০০৫","২০২০","UNFCCC-এর অধীনে প্যারিস চুক্তি ২০১৫ সালে গৃহীত হয়।"],
["COP-এর পূর্ণরূপ কী?","Conference of the Parties","Council of Peace","Commission of Parliaments","Committee of Presidents","COP মানে একটি চুক্তির পক্ষগুলোর সম্মেলন।"]
],"https://unfccc.int/process-and-meetings/the-paris-agreement");
simple("বাংলাদেশের ইতিহাস",[
["বাংলাদেশের স্বাধীনতা দিবস কবে?","২৬ মার্চ","১৬ ডিসেম্বর","২১ ফেব্রুয়ারি","১৪ এপ্রিল","২৬ মার্চ বাংলাদেশের স্বাধীনতা দিবস।"],
["বাংলাদেশের বিজয় দিবস কবে?","১৬ ডিসেম্বর","২৬ মার্চ","২১ ফেব্রুয়ারি","১৪ এপ্রিল","১৯৭১ সালের ১৬ ডিসেম্বর স্বাধীন বাংলাদেশের বিজয় হয়।"],
["বঙ্গভঙ্গ কার্যকর হয় কোন সালে?","১৯০৫","১৭৫৭","১৯১১","১৯৪৭","১৯০৫ সালে বঙ্গভঙ্গ কার্যকর হয়।"],
["বঙ্গভঙ্গ রদের ঘোষণা কোন সালে হয়?","১৯১১","১৯০৫","১৯৪৭","১৯৫২","১৯১১ সালে বঙ্গভঙ্গ রদের ঘোষণা দেওয়া হয়।"],
["ছয় দফা দাবি উত্থাপিত হয় কোন সালে?","১৯৬৬","১৯৫২","১৯৬৯","১৯৭১","ছয় দফা ১৯৬৬ সালের রাজনৈতিক কর্মসূচি।"]
],"https://en.banglapedia.org/index.php/Partition_of_Bengal,_1905","বাংলাদেশ বিষয়াবলি");
const recent=[
 ["আন্তর্জাতিক বিষয়াবলি","COP31 (২০২৬) কোন শহরে অনুষ্ঠিত হয়?","আন্তালিয়া",["বাকু","দুবাই","গ্লাসগো"],"COP31 ৯–২০ নভেম্বর ২০২৬ তুরস্কের আন্তালিয়ায় অনুষ্ঠিত হয়।","2026-11-09","https://unfccc.int/cop31/about"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ সালে COP31-এর আয়োজক দেশ কোনটি?","তুরস্ক",["আজারবাইজান","সংযুক্ত আরব আমিরাত","যুক্তরাজ্য"],"COP31 আয়োজিত হয় তুরস্কে।","2026-11-09","https://unfccc.int/cop31/about"],
 ["আন্তর্জাতিক বিষয়াবলি","COP31 ২০২৬-এর তারিখ কোনটি?","৯–২০ নভেম্বর ২০২৬",["১৮–২৩ মে ২০২৬","১–১২ ডিসেম্বর ২০২৬","১১–২২ নভেম্বর ২০২৫"],"UNFCCC-এর COP31 ৯–২০ নভেম্বর ২০২৬ অনুষ্ঠিত হয়।","2026-11-20","https://unfccc.int/cop31"],
 ["আন্তর্জাতিক বিষয়াবলি","৭৯তম World Health Assembly (২০২৬) কোন শহরে অনুষ্ঠিত হয়?","জেনেভা",["প্যারিস","নিউইয়র্ক","রোম"],"WHO-এর ৭৯তম World Health Assembly জেনেভায় ১৮–২৩ মে ২০২৬ অনুষ্ঠিত হয়।","2026-05-18","https://www.who.int/about/governance/world-health-assembly/seventy-ninth"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ সালের বিশ্ব স্বাস্থ্য সম্মেলন ছিল কততম?","৭৯তম",["৭৫তম","৭৭তম","৮০তম"],"WHO-এর ৭৯তম World Health Assembly ২০২৬ সালের মে মাসে হয়।","2026-05-18","https://www.who.int/about/governance/world-health-assembly/seventy-ninth"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ FIFA বিশ্বকাপ কয়টি দেশ যৌথভাবে আয়োজন করে?","৩টি",["১টি","২টি","৪টি"],"কানাডা, মেক্সিকো ও যুক্তরাষ্ট্র যৌথ আয়োজক।","2026-06-11","https://www.fifa.com/en/articles/fifa-world-cup-2026-hosts-cities-dates-usa-mexico-canada"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ FIFA বিশ্বকাপে কতটি দল অংশ নেয়?","৪৮টি",["৩২টি","৩৬টি","৪০টি"],"ফিফার ২০২৬ আসরে ৪৮টি দল অংশ নেয়।","2026-06-11","https://www.fifa.com/en/articles/world-cup-2026-who-has-qualified"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ সালে UNESCO-এর মহাপরিচালক হিসেবে দায়িত্ব পালন করছেন কে (নভেম্বর ২০২৬)?","খালেদ এল-এনানি",["অঁদ্রে আজুলে","আন্তোনিও গুতেরেস","টেড্রোস আধানম"],"তিনি ১৫ নভেম্বর ২০২৫ UNESCO-এর মহাপরিচালকের দায়িত্ব নেন।","2025-11-15","https://www.unesco.org/en/director-general"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ সালকে জাতিসংঘ কোন আন্তর্জাতিক স্বেচ্ছাসেবামূলক বছর ঘোষণা করে?","টেকসই উন্নয়নের জন্য স্বেচ্ছাসেবকদের আন্তর্জাতিক বছর",["শুধু পরিবহন বর্ষ","শুধু পর্যটন বর্ষ","শুধু চিকিৎসা বর্ষ"],"২০২৬ International Year of Volunteers for Sustainable Development।","2026-01-01","https://www.un.org/en/observances/international-years"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৬ সালে জাতিসংঘ ঘোষিত আন্তর্জাতিক বছরের একটি বিষয় কী?","তৃণভূমি ও পশুপালক",["শুধু মহাকাশ পর্যটন","শুধু বিমান চলাচল","শুধু বন্দর পরিচালনা"],"২০২৬ International Year of Rangelands and Pastoralists।","2026-01-01","https://www.un.org/en/observances/international-years"],
 ["আন্তর্জাতিক বিষয়াবলি","২০২৮ সালের গ্রীষ্মকালীন অলিম্পিকের আয়োজক শহর কোনটি?","লস অ্যাঞ্জেলেস",["প্যারিস","টোকিও","ব্রিসবেন"],"IOC-এর নির্ধারিত ২০২৮ অলিম্পিক আয়োজক শহর লস অ্যাঞ্জেলেস।","2026-11-21","https://www.olympics.com/ioc/faq/sports-programme-and-results/where-will-the-next-olympic-games-be-held"],
 ["বাংলাদেশ বিষয়াবলি","২০২৬ সালের ৫ নভেম্বর ECOSOC প্রতিবেদন নিয়ে জাতিসংঘ সাধারণ পরিষদে বাংলাদেশের বক্তব্য দেন কে?","আইরিন জুবাইদা খান",["অঁদ্রে আজুলে","ইরিনা বোকোভা","মিশেল বাশেলে"],"বাংলাদেশ স্থায়ী মিশনের প্রকাশিত ৫ নভেম্বর ২০২৬-এর বক্তব্যটি আইরিন জুবাইদা খানের।","2026-11-05","https://nypm.mofa.gov.bd/pages/static-pages/2026statementpr-plenery-agenda-items-9-report-of-the-ecosoc-4bpo06-6aecf45596fdaee72fa240f6"],
 ["বাংলাদেশ বিষয়াবলি","৫ নভেম্বর ২০২৬ জাতিসংঘে বাংলাদেশ কোন পরিষদের প্রতিবেদন নিয়ে বক্তব্য দেয়?","ECOSOC",["নিরাপত্তা পরিষদ","অছি পরিষদ","মানবাধিকার পরিষদ"],"উল্লিখিত বাংলাদেশ মিশনের বক্তব্যটি অর্থনৈতিক ও সামাজিক পরিষদের প্রতিবেদন নিয়ে।","2026-11-05","https://nypm.mofa.gov.bd/pages/static-pages/2026statementpr-plenery-agenda-items-9-report-of-the-ecosoc-4bpo06-6aecf45596fdaee72fa240f6"]
];
recent.forEach(([subject,q,correct,wrong,why,eventDate,source])=>add(subject,subject==="বাংলাদেশ বিষয়াবলি"?"সাম্প্রতিক বাংলাদেশ — ২০২৬":"সাম্প্রতিক আন্তর্জাতিক ঘটনাবলি — ২০২৬",
 q,correct,wrong,why,source,eventDate,"dated-current-affairs"));

/* 118 distinct chemical-element atomic number facts, per IUPAC periodic table. */
const ELEMENT_SYMBOLS=["H","He","Li","Be","B","C","N","O","F","Ne","Na","Mg","Al","Si","P","S","Cl","Ar","K","Ca","Sc","Ti","V","Cr","Mn","Fe","Co","Ni","Cu","Zn","Ga","Ge","As","Se","Br","Kr","Rb","Sr","Y","Zr","Nb","Mo","Tc","Ru","Rh","Pd","Ag","Cd","In","Sn","Sb","Te","I","Xe","Cs","Ba","La","Ce","Pr","Nd","Pm","Sm","Eu","Gd","Tb","Dy","Ho","Er","Tm","Yb","Lu","Hf","Ta","W","Re","Os","Ir","Pt","Au","Hg","Tl","Pb","Bi","Po","At","Rn","Fr","Ra","Ac","Th","Pa","U","Np","Pu","Am","Cm","Bk","Cf","Es","Fm","Md","No","Lr","Rf","Db","Sg","Bh","Hs","Mt","Ds","Rg","Cn","Nh","Fl","Mc","Lv","Ts","Og"];
const ELEMENT_SOURCE="https://iupac.org/what-we-do/periodic-table-of-elements/";
ELEMENT_SYMBOLS.forEach((symbol,index)=>{
 const atomicNumber=index+1;
 const alternatives=[(atomicNumber+1)%118+1,(atomicNumber+4)%118+1,(atomicNumber+9)%118+1];
 add("সাধারণ বিজ্ঞান","রসায়ন: মৌল ও পারমাণবিক সংখ্যা",
  "পর্যায় সারণিতে "+symbol+" চিহ্নের মৌলটির পারমাণবিক সংখ্যা কত?",
  String(atomicNumber),alternatives.map(String),
  "IUPAC-এর পর্যায় সারণিতে "+symbol+" চিহ্নের মৌলটির পারমাণবিক সংখ্যা "+atomicNumber+"।",
  ELEMENT_SOURCE);
});

export const FACT_ROWS=Object.freeze(rows);
export const FACT_COUNT=rows.length;
export const CURRENT_AFFAIRS_COUNT=rows.filter(r=>r.kind==="dated-current-affairs").length;
export function createFactQuestions(level="bcs"){
 if(level!=="bcs")return [];
 return FACT_ROWS.map((row,i)=>{
  const slot=(i+row.q.length)%4,options=row.wrong.slice();
  options.splice(slot,0,row.correct);
  return {id:"factual-bcs-"+i,grade:null,subject:row.subject,chapter:row.chapter,
    q:row.q,options,answer:slot,why:row.why,sourceUrl:row.source,
    checkedOn:row.checkedOn,eventDate:row.eventDate,contentKind:row.kind};
 });
}
export function createFactNotes(level="bcs"){
 if(level!=="bcs")return [];
 const groups=new Map();
 for(const row of FACT_ROWS){
  const key=row.subject+"|"+row.chapter;
  if(!groups.has(key))groups.set(key,[]);
  groups.get(key).push(row);
 }
 return [...groups.values()].map((items,i)=>({
  id:"factual-note-"+i,scope:"bcs",subject:items[0].subject,chapter:items[0].chapter,
  title:items[0].chapter,
  concept:items.map((r,j)=>(j+1)+". "+r.q+" — "+r.correct+"।").join("\n"),
  explanation:items.map(r=>r.why).join("\n"),
  example:"প্রশ্ন: "+items[0].q+"\nউত্তর: "+items[0].correct+"।",
  steps:"বিষয়টির মূল তথ্য, সময়কাল ও প্রাতিষ্ঠানিক ভূমিকা তুলনা করে পড়ুন। সাম্প্রতিক বিষয়গুলোতে ঘটনাটির নির্দিষ্ট তারিখ মনে রাখুন।",
  practice:items.at(-1).q,solution:items.at(-1).correct+"। "+items.at(-1).why,
  sourceUrl:items[0].source,checkedOn:FACT_CHECKED_ON,
  contentKind:items.some(r=>r.kind==="dated-current-affairs")?"dated-current-affairs":"factual"
 }));
}
