// Independent browser gameplay QA for 50 fresh user targets (5 shards of 10).
// Diagnostic only: never alter engine, casebook, menu, or game answers.
// All claims to success come from playing the real PR-head game, not an oracle
// that knows the hidden casebook's exact answer to every question.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { once } from "node:events";
import { chromium } from "playwright";
import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js?v=riddlex-55";
import { EXTRA_HYPOTHESIS_QUESTIONS } from "./hypothesis-facts.js?v=riddlex-55";
import { EXTRA_POLITICS_QUESTIONS } from "./politics-extra.js?v=riddlex-55";
import { PERSONAL_QUESTIONS } from "./personal-facts.js";
import { EXTRA_IDENTITY_QUESTIONS } from "./identity-facts.js";
import { DOMAIN_QUESTIONS } from "./domain-facts.js";
import { BROAD_QUESTIONS } from "./broad-facts.js";
import { NARRATIVE_QUESTIONS } from "./narrative-facts.js";
import { EVERYDAY_QUESTIONS } from "./everyday-facts.js";
import { RECOGNITION_QUESTIONS } from "./recognition-facts.js";

const root = new URL("../../", import.meta.url);
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const questionInfo = new Map([...manifest.questions, ...EXTRA_SCREEN_QUESTIONS,
  ...EXTRA_HYPOTHESIS_QUESTIONS, ...EXTRA_POLITICS_QUESTIONS,
  ...PERSONAL_QUESTIONS, ...EXTRA_IDENTITY_QUESTIONS, ...DOMAIN_QUESTIONS, ...BROAD_QUESTIONS, ...NARRATIVE_QUESTIONS, ...EVERYDAY_QUESTIONS, ...RECOGNITION_QUESTIONS].map(q => [q.id,q]));
// Isolated regression harness serves PR-head files, never production.
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",
  ".mjs":"text/javascript",".json":"application/json",".bin":"application/octet-stream",
  ".webp":"image/webp",".jpg":"image/jpeg",".png":"image/png",
  ".woff2":"font/woff2",".svg":"image/svg+xml"};
const server=createServer(async(req,res)=>{
  const path=new URL(req.url,"http://127.0.0.1").pathname;
  if (path.includes("..")) {res.writeHead(404).end();return;}
  const file=path.endsWith("/")?path+"index.html":path;
  try {
    const data=await readFile(new URL(file.slice(1),root));
    res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"});
    res.end(data);
  } catch {res.writeHead(404).end("Not found");}
});
server.listen(0,"127.0.0.1");
await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;



// "Minami Ozawa" is a user-claimed retired JAV identity without an
// independently verified match. Keep the claim visible as an inconclusive
// stress test, not as a source-backed person's biography. In particular,
// never transfer this claim to the documented Japanese voice actress by that
// name or to Minami Aizawa.

// Persona responses are prepared independently of the Riddlex database.
// Unknown for specific facts a typical user cannot safely answer.
// Distinct sessions, including the deliberate duplicate drinking-glass test.
// Epic characters mean their narrative depictions; this is not a theological
// claim about whether a religious account is historically real.
// For Isa and Jesus, status of death/aliveness is left UNKNOWN due differing
// traditions. "Glass" is a drinking vessel in BOTH owner-list positions.
const obj=(name,canonical,matches,yes=[],no=[],maybe=[],maybeNo=[])=>({
 name,canonical,category:"object",matches,object:true,
 yes:["object",...yes],no:["real","fictional","animal","named",...no],
 maybe,maybeNo,
});
const epic=(name,canonical,matches,yes=[],no=[])=>({
 name,canonical,category:"character",matches,fiction:true,sex:"male",
 yes:["fictional","from_novel","talks",...yes],
 no:["real","animal","object","from_bengali_lit","from_anime","from_game",
   "by_humayun","by_zafar","by_ray",...no],
});
const human=(name,canonical,matches,sex,country,life,yes=[],no=[])=>({
 name,canonical,category:"character",matches,sex,country,life,
 yes:["real","named",...yes],
 no:["fictional","animal","object",...no],
});
const bookNo=["from_anime","from_comics","from_game","from_bengali_lit",
  "by_humayun","by_zafar","by_ray"];
const nonKitchen=["kitchen","cooking","uses_pressure","food","vehicle","sport_item","music_item"];
const goodsNo=["vehicle","sport_item","music_item","uses_pressure"];
const people=[
 human("Kate Winslet","Kate Winslet, English actress",["Kate Winslet","Kate Elizabeth Winslet","কেট উইন্সলেট"],"female","from_gb","alive",
  ["actor","screen_role_lead","screen_star_1990s","screen_films_after_2000","born_1970_1979"],
  ["politician","cricketer","footballer","scientist","from_anime","screen_indian_bengali","screen_telugu_cinema"]),
 human("Monica Belucci","Monica Bellucci, Italian actress",["Monica Bellucci","Monica Belucci","মনিকা বেলুচ্চি"],"female","from_it","alive",
  ["actor","screen_role_lead","screen_star_1990s","screen_films_after_2000","born_1960_1969"],
  ["politician","cricketer","footballer","scientist","screen_indian_bengali","screen_telugu_cinema"]),
 {name:"Murgi",canonical:"Domestic hen / chicken",category:"animal",matches:["Chicken","Hen","Domestic chicken","মুরগি","মুরগী"],animal:true,sex:"female",
  yes:["animal","bird","farm"],no:["real","fictional","object","named","mammal","fish","reptile","insect","wild","water_life","is_dog","is_cat","is_mouse","animal_makes_honey","animal_pollen_baskets","animal_visits_flowers"],
  maybeNo:["can_fly"],maybe:["pet"]},
 human("Newazuddin Siddique","Nawazuddin Siddiqui, Indian actor",["Nawazuddin Siddiqui","Nawazuddin Siddique","নওয়াজউদ্দিন সিদ্দিকী"],"male","from_in","alive",
  ["actor","screen_hindi_cinema","screen_role_supporting","screen_web_series","screen_films_after_2000"],
  ["politician","cricketer","footballer","scientist","screen_indian_bengali","screen_star_pre1990"]),
 human("Keerthy Suresh","Keerthy Suresh, Indian actress",["Keerthy Suresh","Keerthi Suresh","কীর্তি সুরেশ"],"female","from_in","alive",
  ["actor","screen_role_lead","screen_films_after_2000","screen_telugu_cinema","screen_national_film_award","born_1990_1999"],
  ["politician","cricketer","footballer","scientist","screen_star_pre1990","screen_star_1990s","screen_indian_bengali"]),
 human("Tridha Chowdhury","Tridha Choudhury, Indian actress",["Tridha Choudhury","Tridha Chowdhury","ত্রিধা চৌধুরী"],"female","from_in","alive",
  ["actor","screen_films_after_2000","screen_indian_bengali","screen_web_series","film_aashram","born_1980_1989"],
  ["politician","cricketer","footballer","scientist","screen_star_pre1990","screen_star_1990s"]),
 human("Boby Deol","Bobby Deol, Indian actor",["Bobby Deol","Boby Deol","ববি দেওল"],"male","from_in","alive",
  ["actor","screen_hindi_cinema","screen_role_lead","screen_role_villain","screen_web_series","film_aashram","screen_star_1990s","screen_films_after_2000","born_1960_1969"],
  ["politician","cricketer","footballer","scientist","screen_indian_bengali","screen_star_pre1990"]),
 {name:"Hatim",canonical:"Hatim, fictional Indian fantasy TV protagonist",category:"character",matches:["Hatim","Hatim Tai","Hatim al-Tai (fictional character)","হাতিম"],fiction:true,sex:"male",
  yes:["fictional","named","fiction_tv_fantasy","fiction_seven_riddles"],
  no:["real","animal","object","actor","politician","cricketer","footballer","from_novel","from_anime","from_game","from_comics","from_bengali_lit","from_cartoon","story_indian_epic"]},
 human("Rahul Azim","Rahil Azam, Indian TV actor portraying Hatim (interpreted name)",["Rahil Azam","Rahul Azim","রাহিল আজম"],"male","from_in","alive",
  ["actor","screen_role_lead","born_1980_1989"],
  ["politician","cricketer","footballer","scientist","screen_star_pre1990","screen_star_1990s","screen_indian_bengali","screen_telugu_cinema"],
  ["screen_hindi_cinema"]),
 human("Zobaida Rahman","Dr Zubaida Rahman, Bangladeshi physician",["Zubaida Rahman","Zobaida Rahman","Dr Zubaida Rahman","জুবাইদা রহমান","জোবাইদা রহমান"],"female","from_bd","alive",
  ["doctor"],
  ["actor","cricketer","footballer","scientist","screen_star_1990s"],
  ["politician"]),
 human("Zaima Rahman","Zaima Zarnaz Rahman, Bangladeshi barrister",["Zaima Rahman","Zaima Zarnaz Rahman","Barrister Zaima Rahman","জাইমা রহমান"],"female","from_bd","alive",
  ["lawyer","born_1990_1999"],
  ["actor","cricketer","footballer","scientist","screen_star_1990s"],
  ["politician"]),
 human("John Cena","John Cena, American actor and professional wrestler",["John Cena","John Felix Anthony Cena","জন সিনা"],"male","from_us","alive",
  ["athlete","wrestler","actor","screen_films_after_2000","born_1970_1979"],
  ["politician","cricketer","footballer","scientist","screen_star_1990s","screen_star_pre1990"]),
 human("Priyanka Chopra","Priyanka Chopra Jonas, Indian actress",["Priyanka Chopra","Priyanka Chopra Jonas","প্রিয়াঙ্কা চোপড়া"],"female","from_in","alive",
  ["actor","screen_hindi_cinema","screen_role_lead","screen_films_after_2000","screen_national_film_award","born_1980_1989"],
  ["politician","cricketer","footballer","scientist","screen_indian_bengali","screen_star_pre1990"]),
];

const countries=new Set(["from_bd","from_in","from_pk","from_us","from_gb","from_jp","from_kr","from_cn","from_fr","from_de","from_ru","from_br","from_ca","from_au","from_es","from_it","from_mx","from_ng","from_eg","from_tr","from_id","from_sa","from_ar","from_za"]);
const regionMap={from_bd:"from_asia",from_in:"from_asia",from_pk:"from_asia",from_jp:"from_asia",from_gb:"from_europe",from_fr:"from_europe",from_de:"from_europe",from_it:"from_europe",from_es:"from_europe",from_us:"from_north_america",from_ca:"from_north_america",from_za:"from_africa"};
const regions=new Set(["from_asia","from_europe","from_africa","from_north_america","from_south_america"]);
const fictionTags=new Set(["from_novel","from_bengali_lit","from_film","from_cartoon","from_anime","from_comics","from_game","by_humayun","by_zafar","by_ray"]);
const objectNo=new Set(["vehicle","kitchen","clothing","food","furniture","cooking","uses_pressure","music_item","sport_item","obj_moves_air_blades","obj_cools_room","obj_keeps_food_cold","obj_mounted_ceiling","obj_flower_from_plant","obj_fragrant_flower","obj_five_spiral_waxy_petals","obj_frangipani_yellow_center"]);
const careers=new Set(["actor","politician","cricketer","footballer","athlete","scientist","singer","business","writer","youtube","adult_ent"]);
// Independent, human-readable observable functions for these real-world
// test objects. This table belongs ONLY to browser QA; it never loads in the
// game's reasoning engine and does not read the Riddlex candidate casebook.
// Questions are broad physical/use traits, not 'is it NAME?' shortcuts.
const everydayQuestionIds=new Set(EVERYDAY_QUESTIONS.map(q=>q.id));
const independentEverydayFacts={
  "Computer": [
    "obj_family_electric",
    "obj_computes_data"
  ],
  "TV": [
    "obj_family_electric",
    "obj_shows_television"
  ],
  "Glass #11": [
    "obj_family_kitchen",
    "obj_family_container",
    "obj_drinking_glass"
  ],
  "Tissue": [
    "obj_family_paper",
    "obj_family_cleaning",
    "obj_wiping_tissue"
  ],
  "Tablet (Medicine)": [
    "obj_family_medicine",
    "obj_oral_tablet"
  ],
  "Ladder": [
    "obj_family_climbing",
    "obj_climbing_ladder"
  ],
  "Perfume": [
    "obj_family_personal_care",
    "obj_skin_perfume"
  ],
  "Potty (Gu)": [
    "obj_family_waste",
    "obj_fecal_matter"
  ],
  "Ear Ring": [
    "obj_family_worn",
    "obj_ear_jewellery"
  ],
  "Nose Ring": [
    "obj_family_worn",
    "obj_nose_jewellery"
  ],
  "Kopaler Tip": [
    "obj_family_worn",
    "obj_forehead_dot"
  ],
  "Calender": [
    "obj_family_paper",
    "obj_dates_calendar"
  ],
  "Blender": [
    "obj_family_electric",
    "obj_family_kitchen",
    "obj_blends_liquids"
  ],
  "Mixer": [
    "obj_family_electric",
    "obj_family_kitchen",
    "obj_whisks_mixture"
  ],
  "Cream": [
    "obj_family_personal_care",
    "obj_skin_moisturizer",
    "obj_skin_cream"
  ],
  "Lotion": [
    "obj_family_personal_care",
    "obj_skin_moisturizer",
    "obj_skin_lotion"
  ],
  "Vaseline": [
    "obj_family_personal_care",
    "obj_skin_moisturizer",
    "obj_skin_jelly"
  ],
  "Door": [
    "obj_family_house",
    "obj_room_door"
  ],
  "Window": [
    "obj_family_house",
    "obj_glazed_window"
  ],
  "Bag": [
    "obj_family_container",
    "obj_carries_items"
  ],
  "Key": [
    "obj_family_lock",
    "obj_metal_key"
  ],
  "Tala": [
    "obj_family_lock",
    "obj_padlock"
  ],
  "Bank": [
    "obj_family_financial",
    "obj_banking_service"
  ],
  "Bottle": [
    "obj_family_container",
    "obj_sealable_bottle"
  ],
  "Plate": [
    "obj_family_kitchen",
    "obj_food_plate"
  ],
  "Glass #35": [
    "obj_family_kitchen",
    "obj_family_container",
    "obj_drinking_glass"
  ],
  "Dictionary": [
    "obj_family_paper",
    "obj_reference_dictionary"
  ],
  "Diary": [
    "obj_family_paper",
    "obj_personal_diary"
  ],
  "Sound Box": [
    "obj_family_electric",
    "obj_amplifies_sound"
  ],
  "Remote": [
    "obj_family_electric",
    "obj_remote_control"
  ],
  "Charger": [
    "obj_family_electric",
    "obj_recharges_battery"
  ],
  "Gas cylinder": [
    "obj_family_container",
    "obj_family_kitchen",
    "obj_stores_cooking_gas"
  ],
  "Salt": [
    "obj_family_kitchen",
    "obj_family_consumable",
    "obj_table_salt"
  ],
  "jharu": [
    "obj_family_cleaning",
    "obj_sweeping_broom"
  ],
  "Tupi": [
    "obj_family_worn",
    "obj_cap_head"
  ],
  "Jaynamaj": [
    "obj_family_prayer",
    "obj_prayer_mat"
  ]
};


// Independent QA facts, maintained separately from the shipped casebook.
const independentlyConfirmed={
  "Kate Winslet": [
    "profile_film_titanic",
    "profile_film_oscar_lead"
  ],
  "Monica Belucci": [
    "profile_film_malena",
    "profile_film_spectre"
  ],
  "Murgi": [
    "profile_animal_poultry",
    "profile_animal_eggs",
    "profile_animal_comb"
  ],
  "Newazuddin Siddique": [
    "profile_film_sacred_games",
    "profile_film_gangs_wasseypur"
  ],
  "Keerthy Suresh": [
    "profile_film_south_india",
    "profile_film_mahanati",
    "profile_film_national_award"
  ],
  "Tridha Chowdhury": [
    "profile_film_south_india",
    "profile_film_aashram"
  ],
  "Boby Deol": [
    "profile_film_aashram",
    "profile_film_animal_2023"
  ],
  "Rahul Azim": [
    "profile_film_indian_tv",
    "profile_film_hatim_role"
  ],
  "Zobaida Rahman": [
    "profile_bd_physician",
    "profile_bd_public_family",
    "profile_bd_leader_spouse"
  ],
  "Zaima Rahman": [
    "profile_bd_barrister",
    "profile_bd_public_family",
    "profile_bd_leader_daughter",
    "profile_bd_uk_bar"
  ],
  "John Cena": [
    "profile_sports_wrestling",
    "profile_sports_wwe",
    "profile_sports_record_champion",
    "profile_sports_peacemaker"
  ],
  "Priyanka Chopra": [
    "profile_film_miss_world",
    "profile_film_quantico",
    "profile_film_national_award"
  ]
};
const independentlyExcluded={
  "Kate Winslet": [
    "profile_film_malena",
    "profile_film_spectre"
  ],
  "Monica Belucci": [
    "profile_film_titanic"
  ],
  "Newazuddin Siddique": [
    "profile_film_indian_tv",
    "profile_film_aashram",
    "profile_film_animal_2023"
  ],
  "Keerthy Suresh": [
    "profile_film_miss_world",
    "profile_film_quantico"
  ],
  "Tridha Chowdhury": [
    "profile_film_mahanati",
    "profile_film_national_award",
    "profile_film_miss_world",
    "profile_film_quantico"
  ],
  "Boby Deol": [
    "profile_film_indian_tv",
    "profile_film_sacred_games",
    "profile_film_gangs_wasseypur"
  ],
  "Rahul Azim": [
    "profile_film_animal_2023",
    "profile_film_aashram"
  ],
  "Zobaida Rahman": [
    "profile_bd_barrister",
    "profile_bd_leader_daughter"
  ],
  "Zaima Rahman": [
    "profile_bd_physician",
    "profile_bd_leader_spouse"
  ],
  "Priyanka Chopra": [
    "profile_film_south_india",
    "profile_film_mahanati"
  ]
};
const recognitionQuestionIds=new Set(RECOGNITION_QUESTIONS.map(q=>q.id));

const common=new Set(["real","fictional","named","male","female","alive","dead","knows_you","your_family","your_partner","your_ex","your_friend","your_best_friend","handheld","pocket","electronic","daily_use"]);
function answerFor(person,q) {
 const yes=new Set(person.yes||[]), no=new Set(person.no||[]);
 const level=common.has(q)?"সাধারণ":/^screen_|^film_|^career_|^politics_|^party_|_minister|_premier|^born_/.test(q)?"বিশেষ তথ্য":"মাঝারি";
 const give=(answer,reason)=>({answer,level,reason});
 if(recognitionQuestionIds.has(q)) {
   if((independentlyConfirmed[person.name]||[]).includes(q))
     return give("yes","verified career or animal fact in independent QA");
   if((independentlyExcluded[person.name]||[]).includes(q))
     return give("no","independently excluded fact");
   return give("unknown","identity's specific fact not independently confirmed");
 }
 if(person.object && everydayQuestionIds.has(q)) {
   const affirmed=independentEverydayFacts[person.name];
   if(!affirmed) return give("unknown","object not characterized independently");
   return give(affirmed.includes(q)?"yes":"no","observable object class or use");
 }
 if(yes.has(q))return give("yes","independent persona fact");
 if(no.has(q))return give("no","independent persona fact");
 if((person.maybe||[]).includes(q))return give("probably","ambiguous origin/career");
 if((person.maybeNo||[]).includes(q))return give("probably_not","usually not");
 if(q==="real")return give(person.fiction||person.object||person.animal?"no":"yes","real PERSON, not just a tangible item");
 if(q==="fictional")return give(person.fiction?"yes":"no","known category");
 if(q==="object")return give(person.object?"yes":"no","known category");
 if(q==="animal")return give(person.animal?"yes":"no","known category");
 if(q==="named")return give(person.object||person.animal?"no":"yes","named character/person");
 if((q==="male"||q==="female")&&person.sex)return give(q===person.sex?"yes":"no","known person/character gender");
 if((q==="male"||q==="female")&&person.personal)return give("unknown","player gender not supplied");
 if((q==="alive"||q==="dead")&&person.life)return give(q===person.life?"yes":"no","known life state");
 if((q==="alive"||q==="dead")&&person.fiction)return give("unknown","fictional life state not supplied");
 if(q==="knows_you")return give(person.personal?"yes":"no","simulated user relation");
 if(q.startsWith("your_")&&person.personal)return give("no","not that personal relation");
 if(fictionTags.has(q))return give("no","unrelated literary/fiction category");
 if(person.country===q)return give("yes","known origin");
 if(countries.has(q))return give(person.country?"no":"unknown",person.country?"different known country":"origin ambiguous");
 if(regions.has(q)) {
   const region=regionMap[person.country];
   return give(region?region===q?"yes":"no":"unknown",region?"known region":"region not specified");
 }
 if(person.object&&objectNo.has(q))return give("no","unrelated object function");
 if(person.fiction&&careers.has(q))return give("no","fictional character not human-world occupation");
 if(person.personal&&careers.has(q))return give("unknown","private career not disclosed");
 if(person.object&&careers.has(q))return give("no","not a person");
 return give("unknown","public detail not confidently known to ordinary player");
}

const results=[];
let browser;
try {
 browser=await chromium.launch({headless:true});
 for(const person of people.filter((_,i)=>i%3===Number(process.env.RIDDLEX_SHARD||0))) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const trace=[],wrong=[];
  let outcome="incomplete",error="",finalGuess="",tries=0;
  const seen=new Set();
  try {
   await page.route("**/*",route=>
     new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const response=await page.goto(origin+"/games/riddlex/?autotest=1",
     {waitUntil:"load",timeout:45000});
   if(!response||response.status()!==200)throw Error("PR-head game not served; HTTP "+response?.status());
   if(!response.url().startsWith(origin+"/games/riddlex/"))throw Error("Unexpected live URL "+response.url());
   if(!(await page.locator("#play").isVisible()))throw Error("Play Now missing on published site");
   await page.click("#play");
   await page.waitForFunction(()=>!document.getElementById("categories").hidden,
     null,{timeout:25000});
   await page.click(`[data-cat="${person.category}"]`);
   await page.waitForFunction(()=>window.__riddlex?.state()?.mode==="ask",
     null,{timeout:50000});
   for(let turn=0;turn<72;turn++) {
    await page.waitForFunction(()=>["ask","guess","learn"].includes(
      window.__riddlex?.state()?.mode),null,{timeout:50000});
    const state=await page.evaluate(()=>window.__riddlex.state());
    if(state.mode==="learn"){outcome="defeat";break;}
    if(state.mode==="guess"){
      const label=(await page.locator("#guess-line").textContent())?.trim()||"";
      const exact=label.replace(/^Are you thinking of\s*/i,"").replace(/\?$/,"").trim();
      finalGuess=exact;
      const normalize=value=>String(value).toLocaleLowerCase().replace(/[.!?()]+/g," ").replace(/\s+/g," ").trim();
      const correct=person.matches.some(alias=>normalize(exact)===normalize(alias));
      if(correct){outcome="correct";break;}
      wrong.push({question:trace.length,name:exact,id:state.best});
      tries++;
      if(tries>=4){outcome="four-wrong-guesses";break;}
      await page.evaluate(()=>window.__riddlex.wrong());
      await page.waitForFunction(()=>window.__riddlex?.state()?.mode==="wrong",
        null,{timeout:40000});
      await page.evaluate(()=>window.__riddlex.retry());
      continue;
    }
    const q=state.question;
    if(seen.has(q)){outcome="repeated-question";error=q;break;}
    seen.add(q);
    const qinfo=questionInfo.get(q)||{};
    const response=answerFor(person,q);
    trace.push({index:trace.length+1,id:q,
      en:qinfo.en||q,bn:qinfo.bn||q,...response});
    await page.evaluate(value=>window.__riddlex.answer(value),response.answer);
   }
   if(outcome==="incomplete")error="72-turn audit limit";
  } catch(e) {outcome="browser-error";error=String(e?.stack||e).slice(0,1000);}
  const diagnostic=await page.evaluate(()=>window.__riddlex?.diagnose?.()||null).catch(()=>null);
  const ids=person.name==="Amir Hawlader"?["riddlex-topic-amir-hawlader"]:[];
  const candidateEvidence=await page.evaluate(
    keys=>keys.flatMap(k=>window.__riddlex?.candidate?.(k)||[]),
    ids).catch(()=>[]);
  const row={sequence:people.indexOf(person)+1,name:person.name,category:person.category,canonical:person.canonical||person.name,
    status:outcome,questions:trace.length,
    unknowns:trace.filter(t=>t.answer==="unknown").length,
    difficult:trace.filter(t=>t.level==="বিশেষ তথ্য").length,
    wrongGuesses:wrong,finalGuess,trace,error,
    diagnostic:diagnostic&&{count:diagnostic.count,alive:diagnostic.alive,loadedCount:diagnostic.loadedCount,best:diagnostic.best},
    candidateEvidence};
  results.push(row);
  console.log("RIDDLEX_OWNER13_CASE "+JSON.stringify(row));
  await page.close().catch(()=>{});
 }
 if(results.length!==people.filter((_,i)=>i%3===Number(process.env.RIDDLEX_SHARD||0)).length) throw Error("Missing games from shard");
 const counts={correct:results.filter(r=>r.status==="correct").length,
   defeat:results.filter(r=>r.status==="defeat").length,
   wrong:results.filter(r=>r.wrongGuesses.length).length,
   browserErrors:results.filter(r=>r.status==="browser-error").length};
 console.log("RIDDLEX_OWNER13_SUMMARY "+JSON.stringify({counts,
   cases:results.map(({name,canonical,status,questions,unknowns,difficult,
     wrongGuesses,finalGuess,error})=>({name,canonical,status,questions,
       unknowns,difficult,wrongGuesses,finalGuess,error}))}));
 const out=join(process.env.RUNNER_TEMP||process.cwd(),"riddlex-owner-13-part-"+(process.env.RIDDLEX_SHARD||"0")+".json");
 await writeFile(out,JSON.stringify({testedAt:new Date().toISOString(),
   game:"13 new target gameplay against actual PR-head locally served Riddlex",answerMode:"independent cautious public facts; unverified questions=unknown",
   counts,results},null,2));
 console.log("RIDDLEX_50_ARTIFACT "+out);
 // Exploratory 20-target audit: all misses remain in the artifact;
 // do not claim success until the real-browser output confirms it.
 const minimumCorrect=0;
 if(counts.browserErrors || counts.correct<minimumCorrect) {
   console.error("RIDDLEX_50_QUALITY_GATE_FAILED "+JSON.stringify({
     correct:counts.correct,minimumCorrect,browserErrors:counts.browserErrors,
     missed:results.filter(row=>row.status!=="correct")
       .map(row=>({name:row.name,status:row.status,questions:row.questions}))
   }));
   process.exitCode=1;
 }
} finally {
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
