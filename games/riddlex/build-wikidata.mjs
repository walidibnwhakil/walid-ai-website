// Deterministic CC0 snapshot compiler. Network refresh is separate from shipping data.
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

export function compileWikidata(snapshot){
 assert.equal(snapshot.formatVersion,1);
 const entries=[],questions={},bangla={},seen=new Set(),signatures=new Set();
 const bnNumber=n=>String(n).replace(/\d/g,d=>'০১২৩৪৫৬৭৮৯'[d]);
 function question(key,en,bn){
  if(questions[key]){assert.equal(questions[key],en);assert.equal(bangla[key],bn);}
  assert.ok(/[\u0980-\u09ff]/.test(bn),'Missing Bengali: '+key);
  questions[key]=en;bangla[key]=bn;
 }
 for(const row of snapshot.records){
  assert.match(row.qid,/^Q\d+$/);assert.ok(!seen.has(row.qid));seen.add(row.qid);
  assert.ok(row.name&&row.nameBn&&Number.isInteger(row.revision));
  const facts={},factSources={};
  const occupationTags={actor:'actor','film actor':'actor','television actor':'actor','stage actor':'actor','voice actor':'actor',
   poet:'poet',writer:'writer',novelist:'writer',screenwriter:'writer',playwright:'writer','short story writer':'writer',
   'film director':'filmmaker','film producer':'filmmaker',singer:'singer','playback singer':'singer','singer-songwriter':'singer',
   cricketer:'cricket',scientist:'scientist',physicist:'scientist',chemist:'scientist',biologist:'scientist',
   politician:'politician',economist:'economist',composer:'composer','university teacher':'educator',teacher:'educator',
   educationist:'educator','military officer':'military'};
  const cs=p=>row.claims[p]??[];
  const ids=p=>cs(p).map(c=>c.value.id).filter(Boolean);
  const add=(key,value,props,en,bn)=>{
   assert.equal(typeof value,'boolean');
   if(en)question(key,en,bn);
   facts[key]=value;factSources[key]=props.flatMap(p=>cs(p).map(c=>c.id));
   assert.ok(factSources[key].length,'Unbacked fact '+row.qid+'/'+key);
  };
  assert.ok(ids('P31').includes('Q5'),'Only humans may use real/fictional derivation');
  add('real',true,['P31']);add('fictional',false,['P31']);
  for(const [q,key,en,bn] of [
   ['Q902','bangladeshi',null,null],
   ['Q668','indian',null,null]
  ])if(ids('P27').includes(q))add(key,true,['P27'],en,bn);
  for(const [q,key] of [['Q6581097','male'],['Q6581072','female']])
   if(new Set(ids('P21')).size===1&&ids('P21').includes(q))add(key,true,['P21']);
  const dates=cs('P569');assert.ok(dates.length);
  assert.equal(new Set(dates.map(c=>c.value.time.slice(0,11))).size,1,'Conflicting birth dates');
  const d=dates[0].value;
  assert.ok(dates.every(c=>c.value.precision>=11&&c.value.calendarmodel==='http://www.wikidata.org/entity/Q1985727'),'Exact Gregorian date required');
  const match=d.time.match(/^\+(\d{4})-(\d{2})-(\d{2})T/);assert.ok(match,'Unsupported date');
  const [,year,month,day]=match.map(Number);
  assert.ok(year>=1&&year<=2026&&month>=1&&month<=12&&day>=1&&day<=31);
  const dateCheck=new Date(0);dateCheck.setUTCFullYear(year,month-1,day);
  assert.equal(dateCheck.getUTCMonth(),month-1,'Invalid calendar date');assert.equal(dateCheck.getUTCDate(),day,'Invalid calendar date');
  for(const cutoff of [1800,1850,1900,1925,1950,1960,1970,1980,1990,2000])
   add('born_before_'+cutoff,year<cutoff,['P569'],`Was this person born before ${cutoff}?`,`ব্যক্তিটি কি ${bnNumber(cutoff)} সালের আগে জন্মেছেন?`);
  add('birth_first_half',month<=6,['P569'],'Was this person born between January and June?','ব্যক্তিটি কি জানুয়ারি থেকে জুনের মধ্যে জন্মেছেন?');
  for(const [p,prefix,en,bn] of [
   ['P106','occupation','Has this person worked as: ','ব্যক্তিটির পেশার মধ্যে কি এটি আছে: '],
   ['P19','birthplace','Was this person born in: ','ব্যক্তিটি কি এখানে জন্মেছেন: '],
   ['P166','award','Has this person received: ','ব্যক্তিটি কি এই পুরস্কার পেয়েছেন: '],
   ['P800','work','Is this person known for the work: ','ব্যক্তিটি কি এই কাজের জন্য পরিচিত: '],
   ['P641','sport','Is this person associated with the sport: ','ব্যক্তিটি কি এই খেলার সঙ্গে যুক্ত: ']
  ])for(const q of ids(p)){
   const label=snapshot.labels[q];if(!label?.en||!label?.bn)continue;
   add('wd_'+prefix+'_'+q.toLowerCase(),true,[p],en+label.en+'?',bn+label.bn+'?');
   if(p==='P106'&&occupationTags[label.en])add(occupationTags[label.en],true,['P106']);
  }
  const places=ids('P19').filter(q=>snapshot.labels[q]?.en&&snapshot.labels[q]?.bn);
  // A shared birth-date/place clue must not become two supposedly unique clues.
  const place=places.length===1?snapshot.labels[places[0]]:null;
  const diagnostic='cue_wd_'+row.qid.toLowerCase();
  const dateEn=`${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  const dateBn=`${bnNumber(day)}-${bnNumber(month)}-${bnNumber(year)}`;
  const en=`Was this person born on ${dateEn}${place?' in '+place.en:''}?`;
  const bn=`ব্যক্তিটি কি ${dateBn} তারিখে${place?' '+place.bn+'-এ':''} জন্মেছেন?`;
  const signature=en.toLowerCase();
  assert.ok(!signatures.has(signature),'Indistinguishable birth clue: '+row.qid);signatures.add(signature);
  add(diagnostic,true,place?['P569','P19']:['P569'],en,bn);
  assert.ok(Object.keys(facts).some(k=>k.startsWith('wd_occupation_')),'No bilingual occupation');
  entries.push({id:'wd-'+row.qid.toLowerCase(),name:row.name,nameBn:row.nameBn,category:'characters',facts,diagnostic,
   wikidataId:row.qid,factSources,sources:[{url:`https://www.wikidata.org/wiki/Special:EntityData/${row.qid}.json?revision=${row.revision}`,
    locator:'Truthy non-deprecated statements: '+Object.keys(row.claims).filter(p=>cs(p).length).join(', '),retrievedOn:snapshot.retrievedOn,revision:row.revision}]});
 }
 return {entries,questions,bangla};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const source=JSON.parse(await readFile(new URL('./knowledge/wikidata-snapshot.json',import.meta.url),'utf8'));
 const data=compileWikidata(source);
 const content='// Generated by build-wikidata.mjs from the CC0 evidence snapshot. Do not edit.\n'+
  'export const wikidataEntries='+JSON.stringify(data.entries)+';\n'+
  'export const wikidataQuestions='+JSON.stringify(data.questions)+';\n'+
  'export const wikidataBanglaQuestions='+JSON.stringify(data.bangla)+';\n';
 const url=new URL('./knowledge.wikidata.generated.js',import.meta.url);
 if(process.argv.includes('--check'))assert.equal(await readFile(url,'utf8'),content,'Stale Wikidata compilation');
 else await writeFile(url,content);
 console.log('Wikidata batch:',data.entries.length,'distinct targets;',Object.keys(data.questions).length,'bilingual questions');
}
