// Independent browser gameplay QA for 20 fresh target cases supplied by the owner.
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

const root = new URL("../../", import.meta.url);
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const questionInfo = new Map([...manifest.questions, ...EXTRA_SCREEN_QUESTIONS,
  ...EXTRA_HYPOTHESIS_QUESTIONS, ...EXTRA_POLITICS_QUESTIONS,
  ...PERSONAL_QUESTIONS, ...EXTRA_IDENTITY_QUESTIONS, ...DOMAIN_QUESTIONS, ...BROAD_QUESTIONS].map(q => [q.id,q]));
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
const people=[
{name:"Ghori",canonical:"Wristwatch (not wall clock)",category:"object",matches:["Watch","Wristwatch","হাতঘড়ি","ঘড়ি"],object:true,yes:["object","daily_use","obj_timekeeping","obj_worn_wrist"],maybe:["handheld","pocket","tool"],maybeNo:["electronic"],no:["vehicle","kitchen","clothing","food","furniture","cooking","music_item","sport_item","uses_pressure","bigger_than_person","obj_writes_paper","obj_uses_ink","obj_uses_graphite","obj_makes_calls","obj_moves_air_blades","obj_cools_room","obj_flower_from_plant","obj_hangs_wall","obj_times_events"]},
{name:"Koel Mallick",category:"character",matches:["Koel Mallick","Koyel Mullick","Koel Mullick","কোয়েল মল্লিক","কোয়েল মল্লিক"],sex:"female",life:"alive",country:"from_in",yes:["actor","screen_role_lead","career_bengali_films","screen_films_after_2000","screen_indian_bengali","broad_film_nater_guru","film_mitin_mashi"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s"]},
{name:"Payel Sarkar",category:"character",matches:["Payel Sarkar","পায়েল সরকার","পায়েল সরকার"],sex:"female",life:"alive",country:"from_in",yes:["actor","career_bengali_films","screen_films_after_2000","screen_indian_bengali","film_bojhena"],maybe:["politician"],no:["scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s"]},
{name:"Tridha Chowdhury",category:"character",matches:["Tridha Choudhury","Tridha Chowdhury","ত্রিধা চৌধুরী"],sex:"female",life:"alive",country:"from_in",yes:["actor","screen_films_after_2000","career_bengali_films","screen_indian_bengali","screen_web_series","film_aashram"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s"]},
{name:"Sanjay Leela Bansali",canonical:"Sanjay Leela Bhansali",category:"character",matches:["Sanjay Leela Bhansali","Sanjay Lila Bhansali","সঞ্জয় লীলা বানসালি"],sex:"male",life:"alive",country:"from_in",yes:["director","film_director_work","film_devdas_director","film_padmaavat_director"],maybe:["writer","business"],no:["actor","politician","scientist","cricketer","footballer","adult_ent"]},
{name:"Deepika Padukone",category:"character",matches:["Deepika Padukone","দীপিকা পাড়ুকোন","দীপিকা পাডুকোন"],sex:"female",life:"alive",country:"from_in",yes:["actor","screen_role_lead","screen_films_after_2000","screen_hindi_cinema","film_padmaavat_actor"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s","screen_indian_bengali"]},
{name:"Yash (Actor)",canonical:"Yash (KGF Kannada actor)",category:"character",matches:["Yash","Rocking Star Yash","Naveen Kumar Gowda","যশ"],sex:"male",life:"alive",country:"from_in",yes:["actor","screen_role_lead","screen_films_after_2000","screen_kannada_cinema","film_kgf"],maybe:["business"],no:["politician","scientist","cricketer","footballer","adult_ent","career_bengali_films","screen_star_pre1990","screen_star_1990s","screen_indian_bengali","screen_hindi_cinema","screen_telugu_cinema"]},
{name:"Prabhas",canonical:"Prabhas (Telugu actor)",category:"character",matches:["Prabhas","প্রভাস","Uppalapati Venkata Suryanarayana Prabhas Raju"],sex:"male",life:"alive",country:"from_in",yes:["actor","screen_role_lead","screen_films_after_2000","screen_telugu_cinema","broad_film_baahubali"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s","screen_indian_bengali","screen_hindi_cinema"]},
{name:"Virat Kohli",category:"character",matches:["Virat Kohli","বিরাট কোহলি"],sex:"male",life:"alive",country:"from_in",yes:["cricketer","athlete","batsman","cricket_indian_batsman","cricket_odis_2026"],no:["actor","politician","scientist","footballer","adult_ent","cricket_100_centuries"]},
{name:"Sachin Tendulkar",category:"character",matches:["Sachin Tendulkar","Sachin Ramesh Tendulkar","শচীন টেন্ডুলকার"],sex:"male",life:"alive",country:"from_in",yes:["cricketer","athlete","batsman","cricket_indian_batsman","cricket_100_centuries"],maybe:["politician"],no:["actor","scientist","footballer","adult_ent","cricket_odis_2026"]},
{name:"Mukesh Ambani",category:"character",matches:["Mukesh Ambani","Mukesh Dhirubhai Ambani","মুকেশ আম্বানি"],sex:"male",life:"alive",country:"from_in",yes:["business","business_reliance","business_jio"],maybe:["topic_technology_business"],no:["actor","scientist","cricketer","footballer","adult_ent"]},
{name:"Neha Sharma",canonical:"Neha Sharma (Indian actress)",category:"character",matches:["Neha Sharma","নেহা শর্মা"],sex:"female",life:"alive",country:"from_in",yes:["actor","screen_films_after_2000","screen_hindi_cinema","screen_telugu_cinema","film_crook"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s","screen_indian_bengali"]},
{name:"Nana Patekar",category:"character",matches:["Nana Patekar","নানা পাটেকার","Vishwanath Patekar"],sex:"male",life:"alive",country:"from_in",yes:["actor","screen_role_lead","screen_star_pre1990","screen_films_after_2000","screen_hindi_cinema","film_welcome"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_indian_bengali"]},
{name:"Meher Afroz Shaon",canonical:"Meher Afroz Shaon",category:"character",matches:["Meher Afroz Shaon","Meher Afroz Shawon","মেহের আফরোজ শাওন"],sex:"female",life:"alive",country:"from_bd",yes:["actor","director","career_bengali_films","screen_films_after_2000","screen_bangladesh_bengali","film_humayun_dramas"],maybe:["singer"],no:["politician","scientist","cricketer","footballer","adult_ent"]},
{name:"Arefin Shuvo",canonical:"Arifin Shuvoo",category:"character",matches:["Arifin Shuvoo","Arifin Shuvo","Arefin Shuvo","আরিফিন শুভ"],sex:"male",life:"alive",country:"from_bd",yes:["actor","screen_role_lead","career_bengali_films","screen_films_after_2000","screen_bangladesh_bengali","film_mujib"],no:["politician","scientist","cricketer","footballer","adult_ent","screen_star_pre1990","screen_star_1990s"]},
{name:"Rafsan The Chotovai",canonical:"Iftekhar Rafsan (Rafsan TheChotobhai)",category:"character",matches:["Rafsan TheChotobhai","Rafsan the Chotobhai","Iftekhar Rafsan","Rafsan The Chotovai","ইফতেখার রাফসান"],sex:"male",life:"alive",country:"from_bd",yes:["youtube","creator_food_vlogs","creator_online_entertainment"],maybe:["business"],no:["politician","scientist","cricketer","footballer","adult_ent","actor"]},
{name:"Aladin",canonical:"Aladdin, fictional folk/animated character",category:"character",matches:["Aladdin","Aladin","আলাদিন"],sex:"male",fiction:true,yes:["from_film","from_cartoon","fiction_magic_lamp","fiction_genie"],no:["from_novel","from_bengali_lit","from_game","by_humayun","by_zafar","by_ray","superhero","detective_role"]},
{name:"Hatim",canonical:"Hatim, fictional 2003 TV fantasy protagonist",category:"character",matches:["Hatim","Hatim Tai","হাতিম"],sex:"male",fiction:true,maybe:["from_film"],yes:["fiction_tv_fantasy","fiction_seven_riddles"],no:["from_cartoon","from_game","from_novel","from_comics","from_bengali_lit","from_anime","by_humayun","by_zafar","by_ray","detective_role","superhero"]},
{name:"Amir Hawlader",canonical:"Amir Hawlader (Elma Behrouz's Padmaja)",category:"character",matches:["Amir Hawlader","আমির হাওলাদার"],sex:"male",fiction:true,yes:["from_novel","from_bengali_lit","topic_modern_bengali_novel","topic_elma_behrouz","topic_novel_male_central"],no:["from_game","from_anime","from_comics","by_humayun","by_zafar","by_ray"]},
{name:"Dipjol",canonical:"Monowar Hossain Dipjol",category:"character",matches:["Dipjol","Monowar Hossain Dipjol","ডিপজল"],sex:"male",life:"alive",country:"from_bd",yes:["actor","screen_role_villain","career_bengali_films","screen_films_after_2000","screen_bangladesh_bengali","film_villain_dialogues"],maybe:["politician","screen_role_lead"],no:["scientist","cricketer","footballer","adult_ent"]}
];
const countries=new Set(["from_bd","from_in","from_pk","from_us","from_gb","from_jp","from_kr","from_cn","from_fr","from_de","from_ru","from_br","from_ca","from_au","from_es","from_it","from_mx","from_ng","from_eg","from_tr","from_id","from_sa","from_ar","from_za"]);
const regionMap={from_bd:"from_asia",from_in:"from_asia",from_pk:"from_asia",from_jp:"from_asia",from_gb:"from_europe",from_fr:"from_europe",from_de:"from_europe",from_it:"from_europe",from_us:"from_north_america",from_ca:"from_north_america",from_za:"from_africa"};
const regions=new Set(["from_asia","from_europe","from_africa","from_north_america","from_south_america"]);
const fictionTags=new Set(["from_novel","from_bengali_lit","from_film","from_cartoon","from_anime","from_comics","from_game","by_humayun","by_zafar","by_ray"]);
const objectNo=new Set(["vehicle","kitchen","clothing","food","furniture","cooking","uses_pressure","music_item","sport_item","obj_moves_air_blades","obj_cools_room","obj_keeps_food_cold","obj_mounted_ceiling","obj_flower_from_plant","obj_fragrant_flower","obj_five_spiral_waxy_petals","obj_frangipani_yellow_center"]);
const careers=new Set(["actor","politician","cricketer","footballer","athlete","scientist","singer","business","writer","youtube","adult_ent"]);
const common=new Set(["real","fictional","named","male","female","alive","dead","knows_you","your_family","your_partner","your_ex","your_friend","your_best_friend","handheld","pocket","electronic","daily_use"]);
function answerFor(person,q) {
 const yes=new Set(person.yes||[]), no=new Set(person.no||[]);
 const level=common.has(q)?"সাধারণ":/^screen_|^film_|^career_|^politics_|^party_|_minister|_premier|^born_/.test(q)?"বিশেষ তথ্য":"মাঝারি";
 const give=(answer,reason)=>({answer,level,reason});
 if(yes.has(q))return give("yes","independent persona fact");
 if(no.has(q))return give("no","independent persona fact");
 if((person.maybe||[]).includes(q))return give("probably","ambiguous origin/career");
 if((person.maybeNo||[]).includes(q))return give("probably_not","usually not");
 if(q==="real")return give(person.fiction||person.object?"no":"yes","real PERSON, not just a tangible item");
 if(q==="fictional")return give(person.fiction?"yes":"no","known category");
 if(q==="object")return give(person.object?"yes":"no","known category");
 if(q==="animal")return give("no","known category");
 if(q==="named")return give(person.object?"no":"yes","named character/person");
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
 for(const person of people) {
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const trace=[],wrong=[];
  let outcome="incomplete",error="",finalGuess="",tries=0;
  const seen=new Set();
  try {
   await page.route("**/*",route=>
     new URL(route.request().url()).origin===origin?route.continue():route.abort());
   const response=await page.goto(origin+"/games/riddlex/?autotest=1",
     {waitUntil:"load",timeout:45000});
   if(!response||response.status()!==200)throw Error("Game not served");
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
  const row={name:person.name,category:person.category,canonical:person.canonical||person.name,
    status:outcome,questions:trace.length,
    unknowns:trace.filter(t=>t.answer==="unknown").length,
    difficult:trace.filter(t=>t.level==="বিশেষ তথ্য").length,
    wrongGuesses:wrong,finalGuess,trace,error,
    diagnostic:diagnostic&&{count:diagnostic.count,alive:diagnostic.alive,loadedCount:diagnostic.loadedCount,best:diagnostic.best},
    candidateEvidence};
  results.push(row);
  console.log("RIDDLEX_20_CASE "+JSON.stringify(row));
  await page.close().catch(()=>{});
 }
 const counts={correct:results.filter(r=>r.status==="correct").length,
   defeat:results.filter(r=>r.status==="defeat").length,
   wrong:results.filter(r=>r.wrongGuesses.length).length,
   browserErrors:results.filter(r=>r.status==="browser-error").length};
 console.log("RIDDLEX_20_SUMMARY "+JSON.stringify({counts,
   cases:results.map(({name,canonical,status,questions,unknowns,difficult,
     wrongGuesses,finalGuess,error})=>({name,canonical,status,questions,
       unknowns,difficult,wrongGuesses,finalGuess,error}))}));
 const out=join(process.env.RUNNER_TEMP||process.cwd(),"riddlex-user-20.json");
 await writeFile(out,JSON.stringify({testedAt:new Date().toISOString(),
   game:"actual PR-head Riddlex browser game",answerMode:"independent cautious public facts; unverified questions=unknown",
   counts,results},null,2));
 console.log("RIDDLEX_20_ARTIFACT "+out);
 // Exploratory 20-target audit: all misses remain in the artifact;
 // do not claim success until the real-browser output confirms it.
 const minimumCorrect=15;
 if(counts.browserErrors || counts.correct<minimumCorrect) {
   console.error("RIDDLEX_20_QUALITY_GATE_FAILED "+JSON.stringify({
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
