// Source-supported, reusable discriminating features for broad careers,
// physical objects, and fictional narratives. Different professions share
// traits; a single broad YES never establishes anyone's identity.
// Sources:
// https://www.icc-cricket.com/news/virat-kohli-scales-another-remarkable-odi-record
// https://www.ril.com/about/chairman-managing-director
// https://www.thedailystar.net/star-youth/news/the-chotobhai-comes-age-1802455
// https://production.sagarworld.com/hatim
// https://d23.com/a-to-z/aladdin-film/
// https://www.thedailystar.net/entertainment/tv-film/news/mujib-receives-uncut-censor-certificate-3383801
// https://www.thedailystar.net/entertainment/tv-film/news/meher-afroz-shaon-returns-screen-after-17-years-neel-jochona-3648726
// https://www.rottentomatoes.com/celebrity/sanjay_leela_bhansali
// https://www.ndtv.com/entertainment/neha-sharma-survival-of-outsiders-tough-in-bollywood-637551
// https://in.bookmyshow.com/person/payel-sarkar/11726/filmography
// https://timesofindia.indiatimes.com/topic/-koel-mallick
// https://www.thenationalnews.com/arts-culture/film-tv/2026/10/08/nana-patekars-most-memorable-roles-from-krantiveer-to-dubai-shot-welcome/
// Additional well-established biographies: film credits, ICC cricket
// archives and publicly credited television casts. Do not add family, health,
// allegation or personal-life facts. Missing bits are UNKNOWN, not false.
const q=(id,group,parent,en,bn)=>({id,group,parent,en,bn});
export const BROAD_QUESTIONS=Object.freeze([
 q("obj_timekeeping","object","object","Is its main purpose to tell or measure time?","এটির প্রধান কাজ কি সময় দেখানো বা মাপা?"),
 q("obj_worn_wrist","object","obj_timekeeping","Is it normally worn on the wrist?","এটি কি সাধারণত হাতে কবজিতে পরা হয়?"),
 q("obj_hangs_wall","object","obj_timekeeping","Is it usually mounted on a wall?","এটি কি সাধারণত দেয়ালে ঝোলানো থাকে?"),
 q("obj_sets_alarm","object","obj_timekeeping","Is it designed to sound an alarm at a chosen time?","এটি কি নির্দিষ্ট সময়ে অ্যালার্ম দেওয়ার জন্য তৈরি?"),
 q("obj_times_events","object","obj_timekeeping","Is it especially used to time races or events?","এটি কি দৌড় বা অন্য কোনো ঘটনার সময় মাপতে বিশেষভাবে ব্যবহৃত হয়?"),
 q("screen_indian_bengali","job","actor","Are they particularly known for Indian Bengali-language cinema?","তিনি কি বিশেষভাবে ভারতের বাংলা চলচ্চিত্রে কাজ করার জন্য পরিচিত?"),
 q("screen_bangladesh_bengali","job","actor","Are they particularly known for Bangladesh's Bengali cinema or TV drama?","তিনি কি মূলত বাংলাদেশের বাংলা চলচ্চিত্র বা নাটকে অভিনয়ের জন্য পরিচিত?"),
 q("screen_hindi_cinema","job","actor","Are they particularly known for Hindi-language films?","তিনি কি প্রধানত হিন্দি চলচ্চিত্রে অভিনয়ের জন্য পরিচিত?"),
 q("screen_telugu_cinema","job","actor","Are they particularly known for Telugu-language films?","তিনি কি বিশেষভাবে তেলুগু চলচ্চিত্রে অভিনয়ের জন্য পরিচিত?"),
 q("screen_kannada_cinema","job","actor","Are they particularly known for Kannada-language films?","তিনি কি মূলত কন্নড় চলচ্চিত্রে অভিনয়ের জন্য পরিচিত?"),
 q("screen_web_series","job","actor","Have web series been a notable part of their acting career?","ওয়েব সিরিজে অভিনয় কি তাঁর পরিচিত কাজগুলোর একটি?"),
 q("film_director_work","job","real","Are they primarily known for directing films?","তিনি কি মূলত চলচ্চিত্র পরিচালনার জন্য পরিচিত?"),
 q("broad_film_nater_guru","job","screen_indian_bengali","Did they act in the Bengali film Nater Guru?","তিনি কি ‘নাটের গুরু’ বাংলা চলচ্চিত্রে অভিনয় করেছেন?"),
 q("film_bojhena","job","screen_indian_bengali","Did they act in the film Bojhena Shey Bojhena?","তিনি কি ‘বোঝেনা সে বোঝেনা’ চলচ্চিত্রে অভিনয় করেছেন?"),
 q("film_mitin_mashi","job","screen_indian_bengali","Did they play detective Mitin Mashi on screen?","তিনি কি চলচ্চিত্রে গোয়েন্দা মিতিন মাসির চরিত্রে অভিনয় করেছেন?"),
 q("film_aashram","job","screen_web_series","Did they act in the web series Aashram?","তিনি কি ‘আশ্রম’ ওয়েব সিরিজে অভিনয় করেছেন?"),
 q("film_devdas_director","job","film_director_work","Did they direct the 2002 Hindi film Devdas?","তিনি কি ২০০২ সালের হিন্দি ‘দেবদাস’ চলচ্চিত্রটি পরিচালনা করেছেন?"),
 q("film_padmaavat_director","job","film_director_work","Did they direct the film Padmaavat?","তিনি কি ‘পদ্মাবত’ চলচ্চিত্রটি পরিচালনা করেছেন?"),
 q("film_padmaavat_actor","job","screen_hindi_cinema","Did they act in the film Padmaavat?","তিনি কি ‘পদ্মাবত’ চলচ্চিত্রে অভিনয় করেছেন?"),
 q("film_crook","job","screen_hindi_cinema","Did they act in the Hindi film Crook?","তিনি কি ‘ক্রুক’ হিন্দি চলচ্চিত্রে অভিনয় করেছেন?"),
 q("film_welcome","job","screen_hindi_cinema","Did they act in the comedy film Welcome?","তিনি কি ‘ওয়েলকাম’ চলচ্চিত্রে অভিনয় করেছেন?"),
 q("film_kgf","job","screen_kannada_cinema","Did they play a lead character in the KGF films?","তিনি কি ‘কেজিএফ’ চলচ্চিত্রগুলোতে প্রধান চরিত্রে অভিনয় করেছেন?"),
 q("broad_film_baahubali","job","screen_telugu_cinema","Did they play the title hero in the Baahubali films?","তিনি কি ‘বাহুবলী’ চলচ্চিত্রগুলোতে প্রধান চরিত্রে অভিনয় করেছেন?"),
 q("film_mujib","job","screen_bangladesh_bengali","Did they portray Sheikh Mujibur Rahman in the film Mujib: The Making of a Nation?","তিনি কি ‘মুজিব: একটি জাতির রূপকার’ চলচ্চিত্রে শেখ মুজিবুর রহমানের চরিত্রে অভিনয় করেছেন?"),
 q("film_humayun_dramas","job","screen_bangladesh_bengali","Were they known for working in Humayun Ahmed's dramas or films?","তিনি কি হুমায়ূন আহমেদের নাটক বা চলচ্চিত্রে কাজের জন্য পরিচিত?"),
 q("film_villain_dialogues","job","screen_bangladesh_bengali","Are distinctive villain roles and dialogues a major part of their fame?","খলচরিত্র ও স্বতন্ত্র সংলাপ কি তাঁর জনপ্রিয়তার একটি প্রধান কারণ?"),
 q("cricket_indian_batsman","job","cricketer","Is the player an Indian batting specialist?","এই ক্রিকেটার কি ভারতের ব্যাটিংয়ের জন্য বিশেষভাবে পরিচিত?"),
 q("cricket_100_centuries","job","cricket_indian_batsman","Have they scored one hundred centuries in international cricket?","তাঁর কি আন্তর্জাতিক ক্রিকেটে একশটি সেঞ্চুরি আছে?"),
 q("cricket_odis_2026","job","cricket_indian_batsman","Were they still playing international one-day cricket during 2026?","তিনি কি ২০২৬ সালেও আন্তর্জাতিক একদিনের ক্রিকেট খেলেছেন?"),
 q("business_reliance","job","business","Are they associated with leading the Reliance business group?","তিনি কি রিলায়েন্স ব্যবসায়িক গোষ্ঠীর নেতৃত্বের সঙ্গে যুক্ত?"),
 q("business_jio","job","business_reliance","Are they associated with the Jio telecommunications business?","তিনি কি জিও টেলিযোগাযোগ ব্যবসার সঙ্গে যুক্ত?"),
 q("creator_food_vlogs","job","youtube","Are they especially known for food-review or food-vlogging videos?","তিনি কি খাবারের রিভিউ বা ফুড ভ্লগ ভিডিওর জন্য বিশেষভাবে পরিচিত?"),
 q("creator_online_entertainment","job","youtube","Are entertainment and challenge videos a notable part of their online content?","বিনোদন বা চ্যালেঞ্জ ভিডিও কি তাঁর অনলাইন কনটেন্টের উল্লেখযোগ্য অংশ?"),
 q("creator_large_scale_giveaways","job","creator_online_entertainment","Is this creator known for very large giveaway or prize-based challenge videos?","এই নির্মাতা কি বড় পুরস্কার বা উপহারভিত্তিক চ্যালেঞ্জ ভিডিওর জন্য পরিচিত?"),
 q("fiction_magic_lamp","fiction","fictional","Is a magical lamp a central part of this character's story?","এই চরিত্রের গল্পে কি একটি জাদুর প্রদীপ গুরুত্বপূর্ণ?"),
 q("fiction_genie","fiction","fiction_magic_lamp","Does a genie from the lamp help the central character?","প্রদীপের জিন কি গল্পের মূল চরিত্রকে সাহায্য করে?"),
 q("fiction_seven_riddles","fiction","fictional","Must this character solve seven riddles during an adventure?","অভিযানের সময় কি এই চরিত্রকে সাতটি ধাঁধার সমাধান করতে হয়?"),
 q("fiction_tv_fantasy","fiction","fictional","Is this character central to an Indian fantasy television series?","এই চরিত্র কি ভারতীয় ফ্যান্টাসি টিভি সিরিজের কেন্দ্রীয় চরিত্র?"),
]);
const person=(id,en,bn,pop,yes,no=[])=>({id,en,bn,pop,yes:["real","named",...yes],no:["fictional","animal","object",...no]});
const fictional=(id,en,bn,pop,yes,no=[])=>({id,en,bn,pop,yes:["fictional","named","male",...yes],no:["real","animal","object",...no]});
export const BROAD_PEOPLE=Object.freeze([
 person("riddlex-broad-koel","Koel Mallick","কোয়েল মল্লিক",520,
  ["female","alive","from_in","actor","screen_role_lead","screen_films_after_2000","screen_indian_bengali","broad_film_nater_guru","film_mitin_mashi"]),
 person("riddlex-broad-payel","Payel Sarkar","পায়েল সরকার",320,
  ["female","alive","from_in","actor","screen_films_after_2000","screen_indian_bengali","film_bojhena"]),
 {...person("riddlex-broad-tridha","Tridha Choudhury","ত্রিধা চৌধুরী",410,
  ["female","alive","from_in","actor","screen_films_after_2000","screen_indian_bengali","screen_web_series","film_aashram"]),
  image:"Tridha Choudhury - Kolkata 2014-01-19 5710.JPG",
  credit:"Biswarup Ganguly — CC BY 3.0 · Wikimedia Commons"},
 person("riddlex-broad-bhansali","Sanjay Leela Bhansali","সঞ্জয় লীলা বানসালি",900,
  ["male","alive","from_in","film_director_work","film_devdas_director","film_padmaavat_director"]),
 person("riddlex-broad-deepika","Deepika Padukone","দীপিকা পাড়ুকোন",2000,
  ["female","alive","from_in","actor","screen_role_lead","screen_films_after_2000","screen_hindi_cinema","film_padmaavat_actor"]),
 person("riddlex-broad-yash","Yash","যশ",950,
  ["male","alive","from_in","actor","screen_role_lead","screen_films_after_2000","screen_kannada_cinema","film_kgf"]),
 person("riddlex-broad-prabhas","Prabhas","প্রভাস",1550,
  ["male","alive","from_in","actor","screen_role_lead","screen_films_after_2000","screen_telugu_cinema","broad_film_baahubali"]),
 person("riddlex-broad-virat","Virat Kohli","বিরাট কোহলি",1700,
  ["male","alive","from_in","athlete","cricketer","batsman","cricket_indian_batsman","cricket_odis_2026"],
  ["cricket_100_centuries"]),
 person("riddlex-broad-sachin","Sachin Tendulkar","শচীন টেন্ডুলকার",1750,
  ["male","alive","from_in","athlete","cricketer","batsman","cricket_indian_batsman","cricket_100_centuries"],
  ["cricket_odis_2026"]),
 person("riddlex-broad-mukesh","Mukesh Ambani","মুকেশ আম্বানি",1300,
  ["male","alive","from_in","business","business_reliance","business_jio"]),
 person("riddlex-broad-neha","Neha Sharma","নেহা শর্মা",400,
  ["female","alive","from_in","actor","screen_films_after_2000","screen_hindi_cinema","screen_telugu_cinema","film_crook"]),
 person("riddlex-broad-nana","Nana Patekar","নানা পাটেকার",800,
  ["male","alive","from_in","actor","screen_hindi_cinema","film_welcome"]),
 person("riddlex-broad-shaon","Meher Afroz Shaon","মেহের আফরোজ শাওন",500,
  ["female","alive","from_bd","actor","director","screen_bangladesh_bengali","film_humayun_dramas"]),
 person("riddlex-broad-shuvo","Arifin Shuvoo","আরিফিন শুভ",650,
  ["male","alive","from_bd","actor","screen_role_lead","screen_films_after_2000","screen_bangladesh_bengali","film_mujib"]),
 person("riddlex-broad-rafsan","Rafsan TheChotobhai","রাফসান দ্য ছোটভাই",350,
  ["male","alive","from_bd","youtube","creator_food_vlogs","creator_online_entertainment"]),
 person("riddlex-broad-dipjol","Dipjol","ডিপজল",670,
  ["male","alive","from_bd","actor","screen_role_villain","screen_bangladesh_bengali","film_villain_dialogues"]),
 fictional("riddlex-broad-aladdin","Aladdin","আলাদিন",1100,
  ["from_film","from_cartoon","fiction_magic_lamp","fiction_genie"]),
 fictional("riddlex-broad-hatim","Hatim","হাতিম",660,
  ["fiction_tv_fantasy","fiction_seven_riddles"],["from_cartoon"]),
 // Comparators prevent one broad YES from determining a name by popularity.
 person("riddlex-broad-adani","Gautam Adani","গৌতম আদানি",650,
  ["male","alive","from_in","business"],["business_reliance"]),
 person("riddlex-broad-rohit","Rohit Sharma","রোহিত শর্মা",1200,
  ["male","alive","from_in","athlete","cricketer","batsman","cricket_indian_batsman"],
  ["cricket_100_centuries"]),
 fictional("riddlex-broad-genie","Genie of the Lamp","প্রদীপের জিন",400,
  ["from_film","from_cartoon","fiction_magic_lamp"],[]),
]);
const object=(id,en,bn,yes,no=[])=>({
 id,en,bn,pop:160,yes:["object","daily_use","obj_timekeeping",...yes],
 no:["real","fictional","animal","food","vehicle","cooking","kitchen",...no],
});
export const BROAD_OBJECTS=Object.freeze([
 object("riddlex-broad-wristwatch","Wristwatch","হাতঘড়ি",["obj_worn_wrist","handheld"],["obj_hangs_wall","obj_times_events"]),
 object("riddlex-broad-wallclock","Wall clock","দেয়ালঘড়ি",["obj_hangs_wall"],["obj_worn_wrist","obj_times_events"]),
 object("riddlex-broad-alarmclock","Alarm clock","অ্যালার্ম ঘড়ি",["obj_sets_alarm"],["obj_worn_wrist","obj_times_events"]),
 object("riddlex-broad-stopwatch","Stopwatch","স্টপওয়াচ",["obj_times_events","handheld"],["obj_worn_wrist","obj_hangs_wall"]),
]);
const values={};for(const q of BROAD_QUESTIONS)values[q.id]={};
 // Existing established Bengali-cinema actors are comparators for the
 // industry question, not duplicate celebrity records or instant guesses.
 values.screen_indian_bengali["riddlex-profile-deb"]=2;
 values.screen_indian_bengali["riddlex-profile-jeet"]=2;
const sources=[...BROAD_PEOPLE,...BROAD_OBJECTS];
for(const item of sources){
 for(const qid of item.yes||[])if(values[qid])values[qid][item.id]=2;
 for(const qid of item.no||[])if(values[qid])values[qid][item.id]=1;
}
export const BROAD_FACTS=Object.freeze(Object.fromEntries(
 Object.entries(values).map(([qid,data])=>[qid,Object.freeze(data)])));
export const BROAD_PROFILE_FACTS=Object.freeze((()=>{
 const m={};for(const item of BROAD_PEOPLE) {
   for(const qid of item.yes||[])(m[qid] ||= {})[item.id]=2;
   for(const qid of item.no||[])(m[qid] ||= {})[item.id]=1;
 }
 // Sourced distinctions on existing packed public profiles. These IDs
 // belong to the original casebook; do not create duplicate people.
 // MrBeast: large prize/challenge video formats. John Green: educational
 // video essays/vlogs, not prize-based challenge programming.
 for(const qid of ["creator_online_entertainment","creator_large_scale_giveaways"]) {
   (m[qid] ||= {})["Q57618112"]=2;
   m[qid]["Q630446"]=1;
 }
 return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,Object.freeze(v)]));
})());
