// Independent browser gameplay QA for the 25 identities supplied by the owner.
// Diagnostic only: never alter engine, casebook, menu, or game answers.
// All claims to success come from playing the real PR-head game, not an oracle
// that knows the hidden casebook's exact answer to every question.
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { once } from "node:events";
import { chromium } from "playwright";
import { EXTRA_SCREEN_QUESTIONS } from "./career-facts.js?v=riddlex-54";
import { EXTRA_HYPOTHESIS_QUESTIONS } from "./hypothesis-facts.js?v=riddlex-54";
import { EXTRA_POLITICS_QUESTIONS } from "./politics-extra.js?v=riddlex-54";
import { PERSONAL_QUESTIONS } from "./personal-facts.js";

const root = new URL("../../", import.meta.url);
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const questionInfo = new Map([...manifest.questions, ...EXTRA_SCREEN_QUESTIONS,
  ...EXTRA_HYPOTHESIS_QUESTIONS, ...EXTRA_POLITICS_QUESTIONS,
  ...PERSONAL_QUESTIONS].map(q => [q.id,q]));
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

// Ambiguous stage names are deliberately disambiguated. "Minami Ozawa" is
// treated literally as the Japanese voice actress, not Minami Aizawa.
const people=[
 {name:"Ferdous",canonical:"Ferdous Ahmed",match:"^Ferdous Ahmed$",sex:"male",country:"from_bd",
  jobs:["actor","politician"],yes:["screen_role_lead","screen_star_1990s",
    "screen_films_after_2000","screen_national_film_award","party_al"],
  no:["screen_film_debut_pre1995","led_gov","been_minister","been_premier","head_of_state","party_chief","party_secretary"]},
 {name:"Dighi",canonical:"Prarthana Fardin Dighi",match:"^(Prarthana Fardin Dighi|Dighi)$",
  sex:"female",country:"from_bd",jobs:["actor"],yes:["screen_role_lead",
    "screen_films_after_2000","screen_national_film_award"],no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Jaya Ahsan",match:"Jaya Ahsan",sex:"female",country:"from_bd",
  jobs:["actor"],yes:["screen_role_lead","screen_films_after_2000","screen_national_film_award"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Deb",canonical:"Dev Adhikari",match:"^(Dev|Deb|Dev Adhikari|Deepak Adhikari)$",
  sex:"male",country:"from_in",jobs:["actor","politician"],
  yes:["screen_role_lead","screen_films_after_2000"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Jeet",canonical:"Jeet Madnani",match:"^(Jeet|Jeet Madnani)$",sex:"male",country:"from_in",
  jobs:["actor"],yes:["screen_role_lead","screen_films_after_2000"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Narendra Modi",match:"Narendra Modi",sex:"male",country:"from_in",
  jobs:["politician"],yes:["led_gov","been_minister","been_premier"],
  no:["head_of_state","lives_abroad"]},
 {name:"Mashrafee Bin Mortaza",canonical:"Mashrafe Mortaza",
  match:"Mashraf(e|ee)|Mortaza",sex:"male",country:"from_bd",jobs:["cricketer","athlete","politician"],
  yes:["bowler","does_bowl","does_bat","captain","party_al"],
  no:["all_rounder","cricket_opener","wicketkeeper","batsman","led_gov",
    "been_premier","head_of_state","been_minister"]},
 {name:"Pinaki Bhattacharya",match:"Pinaki Bhattacharya",
  sex:"male",country:"from_bd",jobs:["writer","youtube"],yes:["lives_abroad"],
  no:["actor","politician","scientist","cricketer","footballer","athlete"]},
 {name:"Koel Mallick",match:"Koel Mallick",sex:"female",country:"from_in",
  jobs:["actor"],yes:["screen_role_lead","screen_films_after_2000"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Srabonti",canonical:"Srabanti Chatterjee",match:"Srabanti( Chatterjee)?",
  sex:"female",country:"from_in",jobs:["actor"],
  yes:["screen_role_lead","screen_films_after_2000"],
  maybe:["politician"],no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Ayusman Khurana",canonical:"Ayushmann Khurrana",match:"Ayushmann Khurrana",
  sex:"male",country:"from_in",jobs:["actor","singer"],yes:["screen_role_lead","screen_films_after_2000"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Probhas",canonical:"Prabhas",match:"Prabhas",sex:"male",country:"from_in",
  jobs:["actor"],yes:["screen_role_lead","screen_films_after_2000"],
  no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Ajay Devgan",canonical:"Ajay Devgn",match:"Ajay Devg(a)?n",
  sex:"male",country:"from_in",jobs:["actor","director","business"],
  yes:["screen_role_lead","screen_star_1990s","screen_film_debut_pre1995",
    "screen_films_after_2000"],no:["screen_star_pre1990"]},
 {name:"Kajol",match:"^Kajol( Devgan)?$",sex:"female",country:"from_in",
  jobs:["actor"],yes:["screen_role_lead","screen_star_1990s","screen_film_debut_pre1995",
    "screen_films_after_2000"]},
 {name:"Akshay Kumar",match:"Akshay Kumar",sex:"male",country:"from_in",
  jobs:["actor"],yes:["screen_role_lead","screen_role_comedy",
    "screen_star_1990s","screen_film_debut_pre1995","screen_films_after_2000"]},
 {name:"Sunny Leone",match:"Sunny Leone",sex:"female",country:"from_ca",
  maybeCountries:["from_in","from_us"],jobs:["actor","adult_ent"],
  yes:["screen_films_after_2000"],no:["screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Rocco Siffredi",match:"Rocco Siffredi",sex:"male",country:"from_it",
  jobs:["actor","adult_ent"],yes:[],no:[]},
 {name:"Minami Ozawa",canonical:"Minami Ozawa (Japanese voice actress)",
  match:"Minami Ozawa",sex:"female",country:"from_jp",
  jobs:["actor"],yes:[],no:["adult_ent","screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Dani Dainels",canonical:"Dani Daniels",match:"Dani Daniels",
  sex:"female",country:"from_us",jobs:["actor","adult_ent"],yes:[],no:[]},
 {name:"Mia Khalifa",match:"Mia Khalifa",sex:"female",country:"from_us",
  maybeCountries:["from_asia"],jobs:["actor","adult_ent"],yes:[],no:[]},
 {name:"Vlademir Putin",canonical:"Vladimir Putin",match:"Vladimir Putin",
  sex:"male",country:"from_ru",jobs:["politician"],
  yes:["led_gov","been_minister","been_premier","head_of_state"],
  no:["lives_abroad"]},
 {name:"Donald Trump",match:"Donald Trump",sex:"male",country:"from_us",
  jobs:["politician","business"],yes:["led_gov","been_minister","head_of_state"],
  no:["been_premier","lives_abroad"]},
 {name:"Stacy Martin",match:"Stacy Martin",sex:"female",country:"from_fr",
  maybeCountries:["from_gb"],jobs:["actor"],
  yes:["screen_role_lead","screen_films_after_2000"],
  no:["adult_ent","screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Seednew Sweeney",canonical:"Sydney Sweeney",match:"Sydney Sweeney",
  sex:"female",country:"from_us",jobs:["actor"],
  yes:["screen_role_lead","screen_films_after_2000"],
  no:["adult_ent","screen_star_1990s","screen_film_debut_pre1995"]},
 {name:"Kate Winstlet",canonical:"Kate Winslet",match:"Kate Winslet",
  sex:"female",country:"from_gb",jobs:["actor"],
  yes:["screen_role_lead","screen_star_1990s","screen_film_debut_pre1995",
    "screen_films_after_2000"],no:["adult_ent"]},
];
const jobNoIfUnlisted=new Set(["actor","politician","cricketer","footballer",
  "athlete","scientist","adult_ent"]);
const geographic=new Set(["from_bd","from_in","from_pk","from_us","from_gb","from_jp",
  "from_kr","from_cn","from_fr","from_de","from_ru","from_br","from_ca",
  "from_au","from_es","from_it","from_mx","from_ng","from_eg","from_tr",
  "from_id","from_sa","from_ar","from_za"]);
const regionOf={"from_bd":"from_asia","from_in":"from_asia","from_jp":"from_asia",
  "from_ru":"from_europe","from_us":"from_north_america",
  "from_ca":"from_north_america","from_gb":"from_europe",
  "from_fr":"from_europe","from_it":"from_europe"};
const regionIds=new Set(["from_asia","from_europe","from_africa",
  "from_north_america","from_south_america"]);
const simple=new Set(["real","fictional","knows_you","male","female","alive",
  "dead","named","actor","politician","cricketer","footballer","adult_ent",
  "from_bd","from_in","from_us","from_gb","from_jp","from_fr","from_ru",
  "from_it","from_ca","from_asia","from_europe","from_north_america"]);
const difficultPattern=/^screen_|^politics_|^party_|_minister|_premier|head_of_state|led_gov|party_chief|party_secretary|_family|lives_abroad|adult_ent|^born_|^has_/;
const answerFor=(person,q)=>{
  const yes=new Set([...(person.yes||[]),...(person.jobs||[])]);
  const no=new Set(person.no||[]);
  const maybe=new Set(person.maybe||[]);
  const level=simple.has(q)?"সাধারণ":difficultPattern.test(q)?"বিশেষ তথ্য":"মাঝারি";
  const output=(answer,reason)=>({answer,level,reason});
  if(yes.has(q))return output("yes","independently specified public fact");
  if(no.has(q))return output("no","independently specified public fact");
  if(maybe.has(q))return output("probably","public role not unambiguous");
  if(q==="real" || q==="named")return output("yes","public person");
  if(q==="fictional" || q==="knows_you")return output("no","public person");
  if(q==="male")return output(person.sex==="male"?"yes":"no","public biography");
  if(q==="female")return output(person.sex==="female"?"yes":"no","public biography");
  if(q==="alive")return output("yes","living public figure");
  if(q==="dead")return output("no","living public figure");
  if(q===person.country)return output("yes","public nationality/origin");
  if((person.maybeCountries||[]).includes(q))return output("probably","complex nationality/origin");
  if(geographic.has(q))return output("no","different known country");
  const originRegion=regionOf[person.country];
  if(q===originRegion)return output("yes","geographic origin");
  if(regionIds.has(q))return output("no","geographic origin");
  if(jobNoIfUnlisted.has(q))return output("no","public occupation");
  if(q==="screen_star_pre1990" && (person.jobs||[]).includes("actor"))
    return output("no","career chronology");
  if(q==="screen_star_1990s" && (person.jobs||[]).includes("actor"))
    return output("unknown","career-era fame not independently established");
  if(q==="screen_film_debut_pre1995" && (person.jobs||[]).includes("actor"))
    return output("unknown","exact debut not independently established");
  if(q==="screen_national_film_award" &&
      person.country!=="from_bd")
    return output("no","specifically a Bangladesh film award");
  if(q==="screen_role_lead" &&
      (person.jobs||[]).includes("adult_ent"))
    return output("unknown","ambiguous mainstream lead role");
  if(q==="party_bnp" || q==="party_al" || q==="party_jp" || q==="party_jamaat") {
    if(person.country!=="from_bd" || !(person.jobs||[]).includes("politician"))
      return output("no","Bangladeshi party mismatch");
    return output("unknown","party affiliation not specified");
  }
  if(q==="screen_films_after_2000" && (person.jobs||[]).includes("actor") &&
      !(person.jobs||[]).includes("adult_ent"))
    return output("yes","known recent film career");
  if(q==="in_government")return output("unknown","current office date-sensitive");
  if(q==="your_family"||q==="your_parent"||q==="your_sibling"||
      q==="your_spouse"||q==="your_child"||q==="your_baby")return output("no","not a relative");
  return output("unknown","unverified or unusually specific fact");
};

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
     new URL(route.request().url).origin===origin?route.continue():route.abort());
   const response=await page.goto(origin+"/games/riddlex/?autotest=1",
     {waitUntil:"load",timeout:45000});
   if(!response||response.status()!==200)throw Error("Game not served");
   await page.click("#play");
   await page.waitForFunction(()=>!document.getElementById("categories").hidden,
     null,{timeout:25000});
   await page.click('[data-cat="character"]');
   await page.waitForFunction(()=>window.__riddlex?.state()?.mode==="ask",
     null,{timeout:50000});
   for(let turn=0;turn<75;turn++) {
    await page.waitForFunction(()=>["ask","guess","learn"].includes(
      window.__riddlex?.state()?.mode),null,{timeout:50000});
    const state=await page.evaluate(()=>window.__riddlex.state());
    if(state.mode==="learn"){outcome="defeat";break;}
    if(state.mode==="guess"){
      const label=(await page.locator("#guess-line").textContent())?.trim()||"";
      const exact=label.replace(/^Are you thinking of\s*/i,"").replace(/\?$/,"").trim();
      finalGuess=exact;
      const correct=new RegExp(person.match,"i").test(exact);
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
   if(outcome==="incomplete")error="75-turn audit limit";
  } catch(e) {outcome="browser-error";error=String(e?.stack||e).slice(0,1000);}
  const row={name:person.name,canonical:person.canonical||person.name,
    status:outcome,questions:trace.length,
    unknowns:trace.filter(t=>t.answer==="unknown").length,
    difficult:trace.filter(t=>t.level==="বিশেষ তথ্য").length,
    wrongGuesses:wrong,finalGuess,trace,error};
  results.push(row);
  console.log("RIDDLEX_25_CASE "+JSON.stringify(row));
  await page.close().catch(()=>{});
 }
 const counts={correct:results.filter(r=>r.status==="correct").length,
   defeat:results.filter(r=>r.status==="defeat").length,
   wrong:results.filter(r=>r.wrongGuesses.length).length,
   browserErrors:results.filter(r=>r.status==="browser-error").length};
 console.log("RIDDLEX_25_SUMMARY "+JSON.stringify({counts,
   cases:results.map(({name,canonical,status,questions,unknowns,difficult,
     wrongGuesses,finalGuess,error})=>({name,canonical,status,questions,
       unknowns,difficult,wrongGuesses,finalGuess,error}))}));
 const out=join(process.env.RUNNER_TEMP||process.cwd(),"riddlex-owner-25.json");
 await writeFile(out,JSON.stringify({testedAt:new Date().toISOString(),
   game:"actual PR-head Riddlex browser game",answerMode:"independent cautious public facts; unverified questions=unknown",
   counts,results},null,2));
 console.log("RIDDLEX_25_ARTIFACT "+out);
} finally {
 await browser?.close();
 await new Promise(resolve=>server.close(resolve));
}
