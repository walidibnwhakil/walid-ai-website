// Independent UI-only test of the owner's exact 20 targets in both languages.
// No debug mode, database inspection, learning, or production writes.
import {createServer} from "node:http";
import {readFile,writeFile} from "node:fs/promises";
import {once} from "node:events";
import {extname,join} from "node:path";
import {chromium} from "playwright";
import {EXTRA_SCREEN_QUESTIONS} from "./career-facts.js";
import {EXTRA_HYPOTHESIS_QUESTIONS} from "./hypothesis-facts.js";
import {EXTRA_POLITICS_QUESTIONS} from "./politics-extra.js";
import {PERSONAL_QUESTIONS} from "./personal-facts.js";
import {EXTRA_IDENTITY_QUESTIONS} from "./identity-facts.js";
import {DOMAIN_QUESTIONS} from "./domain-facts.js";
import {BROAD_QUESTIONS} from "./broad-facts.js";
import {NARRATIVE_QUESTIONS} from "./narrative-facts.js";
import {EVERYDAY_QUESTIONS} from "./everyday-facts.js";
import {RECOGNITION_QUESTIONS} from "./recognition-facts.js";

const root=new URL("../../",import.meta.url);
const manifest=JSON.parse(await readFile(new URL("./kb/manifest.json",import.meta.url),"utf8"));
const defs=[...manifest.questions,...EXTRA_SCREEN_QUESTIONS,...EXTRA_HYPOTHESIS_QUESTIONS,
 ...EXTRA_POLITICS_QUESTIONS,...PERSONAL_QUESTIONS,...EXTRA_IDENTITY_QUESTIONS,
 ...DOMAIN_QUESTIONS,...BROAD_QUESTIONS,...NARRATIVE_QUESTIONS,...EVERYDAY_QUESTIONS,...RECOGNITION_QUESTIONS];
const normalize=s=>String(s||"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
const lookup=new Map();
for(const q of defs)for(const lang of ["en","bn"]){
 const key=normalize(q[lang]);if(!key)continue;
 if(!lookup.has(key))lookup.set(key,new Set());
 lookup.get(key).add(q.id);
}
const actor=(name,aliases,sex,country,yes=[],no=[],extra={})=>({name,aliases,sex,country,category:"character",life:"alive",yes:["actor",...yes],no:["scientist","footballer","cricketer","politician",...no],...extra});
const obj=(name,aliases,yes,no=[])=>({name,aliases,category:"object",yes,no});
const commonActorNo=["screen_india_dabangg","screen_india_ddlj","film_welcome","film_crook","film_baahubali","broad_film_baahubali"];
const hindi=["career_hindi_films","screen_hindi_cinema","screen_role_lead","screen_films_after_2000"];
const bd=["career_bengali_films","screen_bangladesh_bengali","screen_role_lead","screen_star_1990s","screen_film_debut_pre1995","screen_films_after_2000"];
const modern=["screen_role_lead","screen_films_after_2000"];
const targets=[
 actor("Aamir Khan",["Aamir Khan","আমির খান","আমীর খান"],"male","from_in",[...hindi,"screen_india_dangal","screen_star_pre1990","screen_film_debut_pre1995","director","screen_film_producer"],[...commonActorNo,"screen_india_unmarried","screen_india_king_khan","screen_telugu_cinema","screen_indian_bengali","film_padmaavat_actor","adult_ent"]),
 actor("Omar Sani",["Omar Sani","Omar Sunny","ওমর সানী","ওমর সানি"],"male","from_bd",[...bd,"screen_lead_to_villain","screen_restaurant_business","screen_role_villain"],["screen_star_pre1990","screen_walton_executive","screen_debut_abujh_duti_mon","screen_debut_anonto_bhalobasha","adult_ent"]),
 actor("Amin Khan",["Amin Khan","আমিন খান"],"male","from_bd",[...bd,"screen_walton_executive","screen_debut_abujh_duti_mon","screen_over_100_films","screen_return_after_long_break"],["screen_star_pre1990","screen_restaurant_business","screen_debut_anonto_bhalobasha","adult_ent"]),
 obj("Book",["Book","বই"],["object","handheld","obj_family_paper"],["electronic","vehicle","food","clothing","furniture","cooking","obj_family_electric","obj_family_personal_care","obj_family_container","obj_family_worn","obj_reference_dictionary","obj_personal_diary","obj_dates_calendar","obj_wiping_tissue","obj_writes_paper"]),
 {name:"Dog",aliases:["Dog","Domestic dog","কুকুর"],category:"animal",yes:["animal","mammal","pet","is_dog"],no:["real","fictional","named","object","is_cat","is_mouse","bird","fish","insect","reptile","can_fly","water_life"]},
 actor("Tridha Choudhury",["Tridha Choudhury","Tridha Chowdhury","ত্রিধা চৌধুরী"],"female","from_in",["screen_films_after_2000","career_bengali_films","screen_indian_bengali","screen_web_series","film_aashram","profile_film_aashram"],["screen_star_pre1990","screen_star_1990s","screen_film_debut_pre1995","film_mitin_mashi","adult_ent"]),
 obj("Perfume",["Perfume","সুগন্ধি","পারফিউম"],["object","handheld","obj_family_personal_care","obj_skin_perfume"],["electronic","food","clothing","furniture","vehicle","cooking","obj_family_electric","obj_family_paper","obj_skin_moisturizer","obj_skin_cream","obj_skin_lotion","obj_skin_jelly"]),
 obj("Drinking glass",["Glass","Drinking glass","গ্লাস","পানির গ্লাস"],["object","kitchen","handheld","container","obj_family_kitchen","obj_family_container","obj_drinking_glass","daily_use"],["electronic","vehicle","food","clothing","furniture","cooking","obj_family_electric","obj_sealable_bottle","obj_food_plate","obj_family_personal_care"]),
 actor("Dipjol",["Dipjol","Monowar Hossain Dipjol","ডিপজল"],"male","from_bd",["screen_role_villain","career_bengali_films","screen_films_after_2000","screen_bangladesh_bengali","film_villain_dialogues","screen_famous_villain_dialogues","screen_film_producer"],["adult_ent","screen_walton_executive","screen_debut_abujh_duti_mon"],{maybe:["politician"]}),
 actor("Dighi",["Prarthana Fardin Dighi","Dighi","প্রার্থনা ফারদিন দীঘি","দীঘি"],"female","from_bd",[...modern,"career_bengali_films","career_child_performer","film_kabuliwala_child","screen_national_film_award"],["screen_star_1990s","screen_star_pre1990","screen_film_debut_pre1995","adult_ent"]),
 actor("Tom Cruise",["Tom Cruise","টম ক্রুজ"],"male","from_us",[...modern,"career_hollywood_films","screen_star_pre1990","screen_film_debut_pre1995"],["adult_ent","profile_film_oscar_lead","profile_film_titanic","film_titanic","profile_film_spectre","career_hindi_films","career_bengali_films"]),
 actor("Monica Bellucci",["Monica Bellucci","মনিকা বেলুচ্চি","মনিকা বেলুচি"],"female","from_it",["screen_role_lead","screen_star_1990s","screen_film_debut_pre1995","screen_films_after_2000","profile_film_malena","profile_film_spectre"],["adult_ent","profile_film_titanic","profile_film_oscar_lead"]),
 actor("Angelina Jolie",["Angelina Jolie","অ্যাঞ্জেলিনা জোলি","অ্যাঞ্জেলিনা জোলী"],"female","from_us",[...modern,"career_hollywood_films","screen_star_1990s","director"],["adult_ent","profile_film_oscar_lead","profile_film_titanic","film_titanic","profile_film_spectre"]),
 actor("Sydney Sweeney",["Sydney Sweeney","সিডনি সুইনি"],"female","from_us",[...modern,"career_hollywood_films","tv_euphoria","screen_web_series"],["adult_ent","screen_star_1990s","screen_star_pre1990","screen_film_debut_pre1995","profile_film_oscar_lead"]),
 actor("Ana de Armas",["Ana de Armas","আনা দে আরমাস","আনা দে আরমাস্"],"female",null,[...modern,"career_hollywood_films","from_north_america"],["screen_star_pre1990","screen_star_1990s","screen_film_debut_pre1995","profile_film_spectre","adult_ent"],{maybe:["from_es"],maybeNo:["from_us"]}),
 actor("Sunny Leone",["Sunny Leone","সানি লিওন","সানি লিওনি"],"female","from_ca",["adult_ent","career_former_adult","career_adult_to_india","career_hindi_films","screen_films_after_2000"],["screen_star_1990s","screen_film_debut_pre1995"],{maybe:["from_in","from_us"]}),
 actor("Deepika Padukone",["Deepika Padukone","দীপিকা পাড়ুকোন","দীপিকা পাড়ুকোন","দীপিকা পাডুকোন"],"female","from_in",[...hindi,"film_padmaavat_actor"],["adult_ent","screen_star_pre1990","screen_star_1990s","screen_film_debut_pre1995","screen_indian_bengali","screen_telugu_cinema"]),
 {name:"Nick Jonas",aliases:["Nick Jonas","নিক জোনাস"],category:"character",sex:"male",country:"from_us",life:"alive",yes:["singer","musician","actor"],no:["politician","scientist","cricketer","footballer","adult_ent"]},
 {name:"Triple H",aliases:["Triple H","Paul Levesque","Paul Michael Levesque","ট্রিপল এইচ","পল লেভেস্ক"],category:"character",sex:"male",country:"from_us",life:"alive",yes:["athlete","profile_sports_wrestling","profile_sports_wwe","profile_sports_record_champion"],no:["cricketer","footballer","politician","scientist","singer","profile_sports_peacemaker"],maybe:["actor","business"]},
 {name:"Meena",aliases:["Meena","Mina","মীনা","মিনা"],category:"character",sex:"female",fiction:true,yes:["fictional","named","from_cartoon","talks"],no:["real","animal","object","from_anime","from_game","superhero","detective_role","chases_mouse"]}
];
const countries=new Set(["from_bd","from_in","from_pk","from_us","from_gb","from_jp","from_kr","from_cn","from_fr","from_de","from_ru","from_br","from_ca","from_au","from_es","from_it","from_mx","from_ng","from_eg","from_tr","from_id","from_sa","from_ar","from_za"]);
const regions={from_bd:"from_asia",from_in:"from_asia",from_it:"from_europe",from_us:"from_north_america",from_ca:"from_north_america"};
function answerId(t,q){
 if(t.yes?.includes(q))return "yes";
 if(t.maybe?.includes(q))return "probably";
 if(t.maybeNo?.includes(q))return "probably_not";
 if(t.no?.includes(q))return "no";
 if(q==="real")return t.category==="character"&&!t.fiction?"yes":"no";
 if(q==="fictional")return t.fiction?"yes":"no";
 if(q==="object"||q==="animal")return t.category===q?"yes":"no";
 if(q==="named")return t.category==="character"?"yes":"no";
 if(q==="knows_you")return "no";
 if(["female","male"].includes(q)&&t.sex)return t.sex===q?"yes":"no";
 if(["alive","dead"].includes(q)&&t.life)return t.life===q?"yes":"no";
 if(countries.has(q)&&t.country)return q===t.country?"yes":"no";
 if(/^from_(asia|europe|north_america|south_america|africa)$/.test(q)&&regions[t.country])
  return regions[t.country]===q?"yes":"no";
 return "unknown";
}
function answerText(t,label){
 const ids=[...(lookup.get(normalize(label))||[])];
 const values=[...new Set(ids.map(q=>answerId(t,q)))];
 return {ids,answer:values.length===1?values[0]:"unknown"};
}
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".mjs":"text/javascript",".json":"application/json",".bin":"application/octet-stream",".webp":"image/webp",".jpg":"image/jpeg",".png":"image/png",".woff2":"font/woff2",".svg":"image/svg+xml"};
let server,origin=process.env.RIDDLEX_LIVE_URL;
if(!origin){
 server=createServer(async(req,res)=>{
  try{
   const path=new URL(req.url,"http://127.0.0.1").pathname;
   const file=path.endsWith("/")?path+"index.html":path;
   const body=await readFile(new URL(file.slice(1),root));
   res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"}).end(body);
  }catch{res.writeHead(404).end("Not found");}
 });
 server.listen(0,"127.0.0.1");await once(server,"listening");
 origin="http://127.0.0.1:"+server.address().port;
}
const browser=await chromium.launch({headless:true});
const results=[];
const shard=Number(process.env.RIDDLEX_SHARD||0),shards=Number(process.env.RIDDLEX_SHARDS||1);
try{
 for(const [i,t] of targets.entries())if(i%shards===shard)for(const lang of ["en","bn"]){
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  const trace=[],guesses=[],net=[],errors=[];
  page.on("requestfailed",r=>net.push({url:r.url(),failure:r.failure()?.errorText}));
  page.on("pageerror",e=>errors.push(e.message));
  let status="incomplete",error="";
  try{
   const url=new URL("/games/riddlex/",origin).href;
   const response=await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
   if(!response?.ok())throw Error("Page HTTP "+response?.status());
   await page.locator("#play").click({timeout:15000});
   await page.locator('[data-set-lang="'+lang+'"]').click({timeout:15000});
   await page.locator('[data-cat="'+t.category+'"]').click({timeout:15000});
   let previous="";
   for(let turn=0;turn<80;turn++){
    const handle=await page.waitForFunction(prev=>{
     const vis=id=>{const n=document.getElementById(id);return !!n&&!n.hidden&&n.getClientRects().length>0;};
     const text=id=>document.getElementById(id)?.textContent?.trim()||"";
     if(vis("load-retry"))return {kind:"load-error",text:text("status")};
     if(vis("learn")||vis("learn-again"))return {kind:"defeat",text:text("status")};
     if(vis("guess")&&vis("correct"))return {kind:"guess",text:text("guess-line")};
     if(vis("answers")&&vis("q-badge")){
      const key=text("q-badge")+"|"+text("status");
      if(key!==prev&&text("status"))return {kind:"ask",key,text:text("status")};
     }
     return false;
    },previous,{timeout:60000});
    const event=await handle.jsonValue();
    if(event.kind==="load-error"){status="load-error";error=event.text;break;}
    if(event.kind==="defeat"){status="defeat";error=event.text;break;}
    if(event.kind==="guess"){
     const label=event.text.replace(/^Are you thinking of\s*/i,"").replace(/^তুমি কি এই নামের কথা ভাবছ:\s*/,"").replace(/\?$/,"").trim();
     guesses.push({at:trace.length,label});
     if(t.aliases.some(alias=>normalize(alias)===normalize(label))){status="correct";break;}
     if(guesses.length>=4){status="wrong";break;}
     await page.locator("#wrong").click({timeout:15000});
     await page.locator("#retry").click({timeout:45000});
     await page.waitForFunction(()=>document.getElementById("correct")?.hidden||document.getElementById("guess")?.hidden,null,{timeout:45000}).catch(()=>{});
     continue;
    }
    previous=event.key;
    if(trace.some(row=>row.text===event.text)){status="repeated";error=event.text;break;}
    const {ids,answer}=answerText(t,event.text);
    trace.push({index:trace.length+1,text:event.text,ids,answer});
    await page.locator('#answers button[data-answer="'+answer+'"]').click({timeout:15000});
   }
  }catch(e){status="browser-error";error=String(e.message||e);}
  const row={name:t.name,lang,status,error,questions:trace.length,guesses,trace,networkFailures:net.slice(0,20),pageErrors:errors.slice(0,20)};
  results.push(row);console.log("EXACT20_CASE "+JSON.stringify(row));
  await page.close();
 }
}finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
const counts={correct:results.filter(x=>x.status==="correct").length,total:results.length};
console.log("EXACT20_SUMMARY "+JSON.stringify({counts,cases:results.map(({name,lang,status,questions,guesses,error})=>({name,lang,status,questions,guesses,error}))}));
await writeFile(join(process.env.RUNNER_TEMP||process.cwd(),"riddlex-exact20-"+shard+".json"),JSON.stringify({origin,counts,results},null,2));
if(counts.correct!==counts.total)process.exitCode=1;
