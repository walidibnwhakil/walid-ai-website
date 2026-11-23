// Independent browser gameplay QA for the 25 identities supplied by the owner.
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
import { EXTRA_IDENTITY_QUESTIONS } from "./identity-facts.js";

const root = new URL("../../", import.meta.url);
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const questionInfo = new Map([...manifest.questions, ...EXTRA_SCREEN_QUESTIONS,
  ...EXTRA_HYPOTHESIS_QUESTIONS, ...EXTRA_POLITICS_QUESTIONS,
  ...PERSONAL_QUESTIONS, ...EXTRA_IDENTITY_QUESTIONS].map(q => [q.id,q]));
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
 {name:"Mr Beast",category:"character",matches:["MrBeast","Mr Beast","Jimmy Donaldson"],sex:"male",life:"alive",country:"from_us",yes:["youtube","business"],no:["actor","politician","scientist","cricketer","footballer"]},
 {name:"Poddoja",category:"character",matches:["Padmaja","Poddoja","পদ্মজা"],sex:"female",fiction:true,yes:["from_novel","from_bengali_lit"],no:["from_game","from_anime","from_comics","by_humayun","by_zafar","by_ray"]},
 {name:"Amir Hawlader",category:"character",matches:["Amir Hawlader","আমির হাওলাদার"],sex:"male",fiction:true,yes:["from_novel","from_bengali_lit"],no:["from_game","from_anime","from_comics","by_humayun","by_zafar","by_ray"]},
 {name:"Mizanur Rahman Azhari",category:"character",matches:["Mizanur Rahman Azhari","Mizanur Rahman Azhar","মিজানুর রহমান আজহারী"],sex:"male",life:"alive",country:"from_bd",yes:["writer","youtube"],no:["actor","politician","scientist","cricketer","footballer","adult_ent"]},
 {name:"Amir Hamza",canonical:"Mufti Amir Hamza (Bangladesh preacher)",category:"character",matches:["Mufti Amir Hamza","মুফতি আমির হামজা"],sex:"male",life:"alive",country:"from_bd",yes:["youtube"],maybe:["politician"],no:["actor","scientist","cricketer","footballer","head_of_state","been_premier","led_gov"]},
 {name:"Shafikul Islam (Jamat Leader)",canonical:"Shafiqul Islam Masud (assumed match, name ambiguous)",category:"character",matches:["Shafiqul Islam Masud","Shafikul Islam Masud","শফিকুল ইসলাম মাসুদ"],sex:"male",life:"alive",country:"from_bd",yes:["politician","party_jamaat"],no:["actor","scientist","cricketer","footballer","led_gov","been_premier","head_of_state"]},
 {name:"Delowar Hossain Saidi",canonical:"Delwar Hossain Sayeedi",category:"character",matches:["Delwar Hossain Sayeedi","Delowar Hossain Saidi","দেলাওয়ার হোসাইন সাঈদী"],sex:"male",life:"dead",country:"from_bd",yes:["politician","party_jamaat","career_bd_mp"],no:["actor","scientist","cricketer","footballer","head_of_state","been_premier","led_gov"]},
 {name:"Aijek Newton",canonical:"Isaac Newton",category:"character",matches:["Isaac Newton","আইজ্যাক নিউটন"],sex:"male",life:"dead",country:"from_gb",yes:["scientist","writer"],no:["actor","politician","youtube","cricketer","footballer","led_gov","been_premier","head_of_state"]},
 {name:"Ami (nijeke niye vabse)",canonical:"Yourself (player thinking of themselves)",category:"character",matches:["Yourself","Your self","নিজেকে","আপনি নিজে"],personal:"self",life:"alive",yes:["knows_you"],no:["your_family","your_partner","your_ex","your_best_friend","your_friend","your_parent","your_sibling","your_spouse","your_child","your_baby"]},
 {name:"Best Friend",canonical:"Your best friend (relationship type)",category:"character",matches:["Your best friend","আপনার সবচেয়ে কাছের বন্ধু"],personal:"friend",life:"alive",yes:["knows_you","your_friend","your_best_friend"],no:["your_family","your_partner","your_ex","your_parent","your_sibling","your_spouse","your_child","your_baby"]},
 {name:"Kolom",canonical:"Pen",category:"object",matches:["Pen","কলম"],object:true,yes:["object","tool","handheld","pocket","daily_use"],no:["named","electronic","kitchen","clothing","vehicle","food","furniture","cooking","uses_pressure","music_item","sport_item","soft","bigger_than_person","obj_uses_electricity"]},
 {name:"Mobile",canonical:"Mobile phone / Smartphone",category:"object",matches:["Mobile","Smartphone","Phone","Cellphone","মোবাইল"],object:true,yes:["object","electronic","handheld","pocket","daily_use","obj_uses_electricity"],no:["named","kitchen","clothing","vehicle","food","furniture","cooking","uses_pressure","music_item","sport_item","soft","bigger_than_person"]},
 {name:"Jensen Huang",category:"character",matches:["Jensen Huang","Jen-Hsun Huang","জেনসেন হুয়াং"],sex:"male",life:"alive",maybe:["from_us","from_asia"],yes:["business"],no:["actor","politician","scientist","cricketer","footballer","head_of_state","led_gov"]},
 {name:"Elon Musk",category:"character",matches:["Elon Musk","ইলন মাস্ক"],sex:"male",life:"alive",maybe:["from_us","from_za"],yes:["business","from_africa"],no:["actor","politician","scientist","cricketer","footballer","head_of_state"]},
 {name:"Mr Bean",canonical:"Mr. Bean (fictional TV character, not Rowan Atkinson)",category:"character",matches:["Mr. Bean","Mr Bean","মিস্টার বিন"],sex:"male",fiction:true,yes:["from_film","from_cartoon"],maybeNo:["talks"],no:["from_novel","from_bengali_lit","from_anime","from_game","from_comics","by_humayun","by_zafar","by_ray","superhero","detective_role"]},
 {name:"Shabana",canonical:"Shabana (Bangladeshi actress)",category:"character",matches:["Shabana","শাবানা"],sex:"female",life:"alive",country:"from_bd",yes:["actor","screen_role_lead","screen_star_pre1990","screen_national_film_award","career_bengali_films"],no:["scientist","politician","cricketer","footballer","adult_ent"]}
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
      const correct=person.matches.some(alias=>exact.toLowerCase().includes(alias.toLowerCase()));
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
  const row={name:person.name,category:person.category,canonical:person.canonical||person.name,
    status:outcome,questions:trace.length,
    unknowns:trace.filter(t=>t.answer==="unknown").length,
    difficult:trace.filter(t=>t.level==="বিশেষ তথ্য").length,
    wrongGuesses:wrong,finalGuess,trace,error};
  results.push(row);
  console.log("RIDDLEX_16_CASE "+JSON.stringify(row));
  await page.close().catch(()=>{});
 }
 const counts={correct:results.filter(r=>r.status==="correct").length,
   defeat:results.filter(r=>r.status==="defeat").length,
   wrong:results.filter(r=>r.wrongGuesses.length).length,
   browserErrors:results.filter(r=>r.status==="browser-error").length};
 console.log("RIDDLEX_16_SUMMARY "+JSON.stringify({counts,
   cases:results.map(({name,canonical,status,questions,unknowns,difficult,
     wrongGuesses,finalGuess,error})=>({name,canonical,status,questions,
       unknowns,difficult,wrongGuesses,finalGuess,error}))}));
 const out=join(process.env.RUNNER_TEMP||process.cwd(),"riddlex-user-16.json");
 await writeFile(out,JSON.stringify({testedAt:new Date().toISOString(),
   game:"actual PR-head Riddlex browser game",answerMode:"independent cautious public facts; unverified questions=unknown",
   counts,results},null,2));
 console.log("RIDDLEX_16_ARTIFACT "+out);
 // This is a diagnostic study. Non-correct guesses are meaningful results;
 // only browser execution errors fail the workflow.
 if(counts.browserErrors) process.exitCode=1;
} finally {
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
