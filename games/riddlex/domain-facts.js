// Cross-domain public-knowledge facts: use observable career, work and
// character-type clues, not an if(targetName) cheat in the guesser.
// Sources (examples):
// https://www.mizanurrahmanazhari.net/profile
// https://www.dhakatribune.com/bangladesh/people/361270/who-is-mizanur-rahman-azhari
// https://en.prothomalo.com/bangladesh/politics/lfgaui1osm
// https://en.prothomalo.com/bangladesh/politics/oybch68jug
// https://en.prothomalo.com/bangladesh/politics/c2gaik3e39
// https://www.nvidia.com/en-us/about-nvidia/board-of-directors/jensen-huang/
// https://ir.tesla.com/corporate/elon-musk
// https://golpohub.com/series/ami-padmaja
// https://www.wikidata.org/wiki/Q935
// https://en.wikipedia.org/wiki/Mr._Bean_(character)
// Missing public attributes stay UNKNOWN. Never invent "no" by omission.
export const DOMAIN_QUESTIONS = Object.freeze([
 {id:"topic_islamic_speaker",parent:"real",group:"job",
  en:"Is this person known for delivering Islamic religious lectures?",
  bn:"এই ব্যক্তি কি ইসলাম বিষয়ে বক্তৃতা বা ওয়াজ করার জন্য পরিচিত?"},
 {id:"topic_online_lectures",parent:"topic_islamic_speaker",group:"job",
  en:"Are their religious lectures widely shared online?",
  bn:"তাঁর ধর্মীয় বক্তৃতা কি অনলাইনে ব্যাপকভাবে প্রচারিত হয়?"},
 {id:"topic_religious_author",parent:"topic_islamic_speaker",group:"job",
  en:"Have they published books about religion?",
  bn:"তিনি কি ধর্মীয় বিষয়ে বই লিখেছেন বা প্রকাশ করেছেন?"},
 {id:"topic_speaker_election_candidate",parent:"topic_islamic_speaker",group:"politics",
  en:"Has this religious speaker also stood as a parliamentary election candidate?",
  bn:"এই ধর্মীয় বক্তা কি জাতীয় সংসদ নির্বাচনের প্রার্থীও হয়েছেন?"},
 {id:"topic_jamaat_mp",parent:"party_jamaat",group:"politics",
  en:"Has this person been elected a member of Bangladesh's Parliament?",
  bn:"তিনি কি বাংলাদেশের জাতীয় সংসদের সদস্য নির্বাচিত হয়েছেন?"},
 {id:"topic_jamaat_dhaka_south",parent:"party_jamaat",group:"politics",
  en:"Have they held a senior Jamaat leadership position in Dhaka South?",
  bn:"তিনি কি ঢাকার দক্ষিণ অঞ্চলে জামায়াতের নেতৃত্বের দায়িত্বে ছিলেন?"},
 {id:"topic_physics",parent:"scientist",group:"job",
  en:"Is this person especially known for work in physics?",
  bn:"এই ব্যক্তি কি মূলত পদার্থবিজ্ঞানে কাজ করার জন্য পরিচিত?"},
 {id:"topic_classical_motion",parent:"topic_physics",group:"job",
  en:"Are they associated with the classical laws of motion?",
  bn:"তাঁর কাজ কি গতির ধ্রুপদি সূত্রের সঙ্গে জড়িত?"},
 {id:"topic_gravity",parent:"topic_physics",group:"job",
  en:"Are they known for major work explaining gravity?",
  bn:"তিনি কি মহাকর্ষ ব্যাখ্যার গুরুত্বপূর্ণ কাজের জন্য পরিচিত?"},
 {id:"topic_technology_business",parent:"business",group:"job",
  en:"Is their business career mainly in modern technology?",
  bn:"তাঁর ব্যবসায়িক পরিচয় কি মূলত আধুনিক প্রযুক্তির সঙ্গে সম্পর্কিত?"},
 {id:"topic_semiconductors",parent:"topic_technology_business",group:"job",
  en:"Is this person associated with a major computer-chip or graphics processor company?",
  bn:"তিনি কি কম্পিউটার চিপ বা গ্রাফিক্স প্রসেসর নির্মাতা বড় প্রতিষ্ঠানের সঙ্গে যুক্ত?"},
 {id:"topic_ai_computing",parent:"topic_technology_business",group:"job",
  en:"Is their company especially known for AI computing hardware?",
  bn:"তাঁর প্রতিষ্ঠান কি এআই কম্পিউটিং হার্ডওয়্যারের জন্য বিশেষভাবে পরিচিত?"},
 {id:"topic_electric_vehicles",parent:"topic_technology_business",group:"job",
  en:"Are they strongly associated with electric vehicles?",
  bn:"তিনি কি বৈদ্যুতিক গাড়ির ব্যবসার সঙ্গে বিশেষভাবে যুক্ত?"},
 {id:"topic_space_rockets",parent:"topic_technology_business",group:"job",
  en:"Are they also associated with a company building launch rockets?",
  bn:"তিনি কি মহাকাশে উৎক্ষেপণের রকেট নির্মাতা প্রতিষ্ঠানের সঙ্গেও যুক্ত?"},
 {id:"topic_tv_comedy_fiction",parent:"fictional",group:"fiction",
  en:"Is this a fictional character primarily known from television comedy?",
  bn:"এই কাল্পনিক চরিত্র কি মূলত টেলিভিশনের হাস্যরসাত্মক অনুষ্ঠানের জন্য পরিচিত?"},
 {id:"topic_visual_comedy",parent:"topic_tv_comedy_fiction",group:"fiction",
  en:"Does the character mostly make people laugh through actions rather than dialogue?",
  bn:"এই চরিত্র কি সংলাপের চেয়ে শারীরিক অভিনয় দিয়ে বেশি হাসায়?"},
 {id:"topic_teddy_bear",parent:"topic_tv_comedy_fiction",group:"fiction",
  en:"Is the character known for keeping a teddy bear?",
  bn:"এই চরিত্র কি নিজের সঙ্গে একটি টেডি বিয়ার রাখার জন্য পরিচিত?"},
 {id:"topic_modern_bengali_novel",parent:"from_bengali_lit",group:"fiction",
  en:"Is this character from a modern Bengali novel?",
  bn:"এই চরিত্র কি আধুনিক বাংলা উপন্যাসের?"},
 {id:"topic_elma_behrouz",parent:"topic_modern_bengali_novel",group:"fiction",
  en:"Was the character created by the writer Elma Behrouz?",
  bn:"চরিত্রটির স্রষ্টা কি লেখিকা ইলমা বেহরোজ?"},
 {id:"topic_novel_male_central",parent:"topic_modern_bengali_novel",group:"fiction",
  en:"Is the character one of the central male figures in the novel?",
  bn:"চরিত্রটি কি উপন্যাসের কেন্দ্রীয় পুরুষ চরিত্রগুলোর একজন?"},
]);

// Wikidata IDs are used where verified; local IDs for regional/literary
// figures not reliably represented in the prepacked corpus.
export const DOMAIN_PEOPLE=Object.freeze([
 {id:"Q84597994",en:"Mizanur Rahman Azhari",bn:"মিজানুর রহমান আজহারী",pop:1450,
  yes:["real","named","male","alive","from_bd","writer","youtube"],
  no:["fictional","actor","politician","cricketer","footballer","scientist"]},
 {id:"riddlex-topic-mufti-amir-hamza",en:"Mufti Amir Hamza",bn:"মুফতি আমির হামজা",pop:900,
  yes:["real","named","male","alive","from_bd","youtube"],
  no:["fictional","actor","scientist","cricketer","footballer"]},
 {id:"Q5254959",en:"Delwar Hossain Sayeedi",bn:"দেলাওয়ার হোসাইন সাঈদী",pop:1300,
  yes:["real","named","male","dead","from_bd","politician","party_jamaat","career_bd_mp"],
  no:["fictional","alive","actor","scientist","cricketer","footballer"]},
 {id:"riddlex-topic-shafiqul-masud",en:"Shafiqul Islam Masud",bn:"শফিকুল ইসলাম মাসুদ",pop:830,
  yes:["real","named","male","alive","from_bd","politician","party_jamaat","career_bd_mp"],
  no:["fictional","dead","actor","cricketer","footballer"]},
 {id:"Q935",en:"Isaac Newton",bn:"আইজ্যাক নিউটন",pop:20000,
  yes:["real","named","male","dead","from_gb","scientist","writer"],
  no:["fictional","alive","actor","politician","footballer","cricketer"]},
 {id:"Q305177",en:"Jensen Huang",bn:"জেনসেন হুয়াং",pop:5400,
  yes:["real","named","male","alive","business","from_us"],
  no:["fictional","dead","actor","footballer","cricketer","politician"]},
 {id:"Q317521",en:"Elon Musk",bn:"ইলন মাস্ক",pop:19000,
  yes:["real","named","male","alive","business","from_za","from_africa"],
  no:["fictional","dead","actor","footballer","cricketer"]},
 {id:"riddlex-topic-mr-bean",en:"Mr. Bean",bn:"মিস্টার বিন",pop:6500,
  yes:["fictional","named","male","from_cartoon","from_film"],
  no:["real","from_novel","from_comics","from_anime","from_game","superhero","detective_role"]},
 {id:"riddlex-topic-amir-hawlader",en:"Amir Hawlader",bn:"আমির হাওলাদার",pop:850,
  yes:["fictional","named","male","from_novel","from_bengali_lit"],
  no:["real","from_game","from_anime","from_comics","by_humayun","by_zafar","by_ray"]},
 // Non-target comparators ensure shared broad traits alone do not prove a name.
 {id:"Q937",en:"Albert Einstein",bn:"আলবার্ট আইনস্টাইন",pop:13000,
  yes:["real","named","male","dead","scientist","from_de"],
  no:["fictional","alive","actor","cricketer","footballer"]},
 {id:"Q307",en:"Galileo Galilei",bn:"গ্যালিলিও গ্যালিলেই",pop:6500,
  yes:["real","named","male","dead","scientist","from_it"],
  no:["fictional","alive","actor","cricketer","footballer"]},
 {id:"riddlex-topic-lisa-su",en:"Lisa Su",bn:"লিসা সু",pop:3500,
  yes:["real","named","female","alive","business","from_us"],
  no:["fictional","dead","actor","footballer","cricketer"]},
 {id:"riddlex-topic-mamunul-haque",en:"Mamunul Haque",bn:"মামুনুল হক",pop:890,
  yes:["real","named","male","alive","from_bd"],
  no:["fictional","dead","cricketer","footballer","actor"]},
]);
const yesFacts={
 Q84597994:["topic_islamic_speaker","topic_online_lectures","topic_religious_author"],
 "riddlex-topic-mufti-amir-hamza":["topic_islamic_speaker","topic_online_lectures","topic_speaker_election_candidate"],
 Q5254959:["topic_islamic_speaker","topic_online_lectures","topic_religious_author","topic_jamaat_mp"],
 "riddlex-topic-shafiqul-masud":["topic_jamaat_mp","topic_jamaat_dhaka_south"],
 Q935:["topic_physics","topic_classical_motion","topic_gravity"],
 Q937:["topic_physics","topic_gravity"],
 Q307:["topic_physics"],
 Q305177:["topic_technology_business","topic_semiconductors","topic_ai_computing"],
 Q317521:["topic_technology_business","topic_electric_vehicles","topic_space_rockets"],
 "riddlex-topic-lisa-su":["topic_technology_business","topic_semiconductors"],
 "riddlex-topic-mr-bean":["topic_tv_comedy_fiction","topic_visual_comedy","topic_teddy_bear"],
 "riddlex-topic-amir-hawlader":["topic_modern_bengali_novel","topic_elma_behrouz","topic_novel_male_central"],
 "riddlex-topic-mamunul-haque":["topic_islamic_speaker","topic_online_lectures"],
};
const noFacts={
 Q84597994:["topic_jamaat_mp","topic_technology_business"],
 "riddlex-topic-mufti-amir-hamza":["topic_technology_business"],
 "riddlex-topic-shafiqul-masud":["topic_technology_business"],
 Q935:["topic_technology_business"],
 Q937:["topic_classical_motion"],
 Q305177:["topic_electric_vehicles","topic_space_rockets"],
 Q317521:["topic_semiconductors","topic_ai_computing"],
 "riddlex-topic-lisa-su":["topic_electric_vehicles","topic_space_rockets"],
 "riddlex-topic-amir-hawlader":["topic_tv_comedy_fiction"],
 "riddlex-topic-mr-bean":["topic_elma_behrouz","topic_modern_bengali_novel"],
};
const facts={};
for(const row of DOMAIN_QUESTIONS)facts[row.id]={};
for(const [id,questions] of Object.entries(yesFacts))
 for(const qid of questions) facts[qid][id]=2;
for(const [id,questions] of Object.entries(noFacts))
 for(const qid of questions) facts[qid][id]=1;
export const DOMAIN_FACTS=Object.freeze(Object.fromEntries(
  Object.entries(facts).map(([qid,entries])=>
    [qid,Object.freeze(entries)])));
