"""Offline evidence packer; accepted = structural eligibility, NOT certified playable.
The audit runner separately promotes candidates after bounded identity-free games.
python knowledge/pack-v2.py CACHE
"""
import collections, datetime, hashlib, json, pathlib, re, sys, unicodedata

ROOT=pathlib.Path(__file__).resolve().parent
cache=pathlib.Path(sys.argv[1])
def read(p):return json.loads(p.read_text())
def write(p,x):p.write_text(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n')
def norm(s):return ''.join(c for c in unicodedata.normalize('NFKC',s).casefold() if c.isalnum())
def claims(e,p):
 cs=[c for c in e.get('claims',{}).get(p,[]) if c.get('rank')!='deprecated' and c.get('mainsnak',{}).get('snaktype')=='value']
 return [c for c in cs if c.get('rank')=='preferred'] if any(c.get('rank')=='preferred' for c in cs) else cs
def val(c):return c['mainsnak']['datavalue']['value']
def qids(e,p):return [val(c)['id'] for c in claims(e,p) if isinstance(val(c),dict) and 'id' in val(c)]
def labels(e):return {lang:v['value'] for lang,v in e.get('labels',{}).items() if lang in ('en','bn')}
entities={};labelmap={};retrieval={};requests={}
for folder in ('entities','labels'):
 for path in sorted((cache/folder).glob('*.json')):
  envelope=read(path)
  for q,e in envelope['data']['entities'].items():
   if folder=='entities':entities[q]=e;retrieval[q]=envelope['retrievedAt'];requests[q]=envelope['source']
   labelmap[q]=labels(e)
selection=read(cache/'selection.json')
existing=read(ROOT/'baseline-targets.json');existingQids=set(read(ROOT/'baseline-wikidata-ids.json'))
old=read(ROOT/'wikidata-snapshot.json');enrichQids={r['qid'] for r in old['records']}
blocked={norm(e['name']) for e in existing}
for e in existing:
 for s in e.get('sources',[]):blocked.add(norm(urllib_title:=s['url'].split('/wiki/')[-1].replace('_',' ')))
TEMPLATES={
 'P106':('occupation','Has this person worked as: ','ব্যক্তিটির পেশার মধ্যে কি এটি আছে: '),
 'P27':('citizenship','Has this person held citizenship of: ','ব্যক্তিটির কি এই দেশের নাগরিকত্ব ছিল বা আছে: '),
 'P19':('birthplace','Was this person born in: ','ব্যক্তিটি কি এখানে জন্মেছেন: '),
 'P166':('award','Has this person received: ','ব্যক্তিটি কি এই পুরস্কার পেয়েছেন: '),
 'P800':('work','Is this person known for the work: ','ব্যক্তিটি কি এই কাজের জন্য পরিচিত: '),
 'P641':('sport','Is this person associated with the sport: ','ব্যক্তিটি কি এই খেলার সঙ্গে যুক্ত: '),
 'P108':('employer','Has this person worked for: ','ব্যক্তিটি কি এই প্রতিষ্ঠানে কাজ করেছেন: '),
 'P69':('education','Has this person studied at: ','ব্যক্তিটি কি এখানে পড়াশোনা করেছেন: '),
 'P463':('membership','Has this person been a member of: ','ব্যক্তিটি কি এর সদস্য ছিলেন বা আছেন: '),
 'P413':('position','Has this person played in the position: ','ব্যক্তিটি কি এই অবস্থানে খেলেছেন: '),
 'P136':('genre','Is it associated with the genre: ','এটি কি এই ধারার সঙ্গে যুক্ত: '),
 'P101':('field','Has this person worked in the field: ','ব্যক্তিটি কি এই ক্ষেত্রে কাজ করেছেন: '),
 'P1303':('instrument','Has this person played: ','ব্যক্তিটি কি এই বাদ্যযন্ত্র বাজিয়েছেন: '),
 'P1412':('language','Has this person used the language: ','ব্যক্তিটি কি এই ভাষা ব্যবহার করেছেন: '),
 'P1441':('appearance','Does this character appear in: ','চরিত্রটি কি এই রচনায় আছে: '),
 'P170':('creator','Was it created by: ','এটির স্রষ্টা কি: '),
 'P50':('author','Was it written by: ','এটি কি লিখেছেন: '),
 'P171':('taxonomy','Does it belong to the taxon: ','এটি কি এই জীববৈজ্ঞানিক গোষ্ঠীর অন্তর্ভুক্ত: '),
 'P105':('rank','Does it have the taxonomic rank: ','এটির জীববৈজ্ঞানিক শ্রেণিবিন্যাসের স্তর কি: '),
 'P279':('subclass','Is it a type of: ','এটি কি এই ধরনের: '),
 'P186':('material','Is it made using: ','এটি তৈরিতে কি এই উপাদান ব্যবহৃত হয়: '),
 'P366':('use','Is it used for: ','এটি কি এই কাজে ব্যবহৃত হয়: '),
}
questions={};bangla={};candidates=[];evidence=[];rejected=[];counts=collections.Counter();seen=set();signatures={};aliasIndex=collections.defaultdict(set)
for q,category,cohort in selection['selected']:
 reason=None;e=entities.get(q)
 if q in seen:counts['repeated_selection']+=1;continue
 seen.add(q)
 if q in existingQids:reason='existing_canonical_identity'
 elif not e or 'missing' in e:reason='not_downloaded_or_missing'
 elif 'redirect' in e:reason='redirect_requires_resolution'
 elif not e.get('lastrevid') or not e.get('labels',{}).get('en'):reason='missing_revision_or_english_label'
 if reason:counts[reason]+=1;rejected.append({'qid':q,'reason':reason});continue
 names=labels(e);aliases={lang:[a['value'] for a in e.get('aliases',{}).get(lang,[])] for lang in ('en','bn')}
 identityNames=[names['en'],*aliases['en'],e.get('sitelinks',{}).get('enwiki',{}).get('title','')]
 if any(norm(n) in blocked for n in identityNames if n):
  # A name/alias match is a possible identity collision, not proof of identity.
  reason='unresolved_baseline_alias_collision';counts[reason]+=1;rejected.append({'qid':q,'name':names['en'],'reason':reason});continue
 facts={};sources={};groups=set();missingLabels=[];usedStatements={}
 for p,(group,en,bn) in TEMPLATES.items():
  if category!='characters' and p not in ('P171','P105','P279','P186','P366'):continue
  if category=='characters' and p in ('P171','P105','P186','P366'):continue
  for c in claims(e,p):
   value=val(c)
   if not isinstance(value,dict) or 'id' not in value:continue
   target=value['id'];lab=labelmap.get(target,{})
   if not lab.get('en') or not lab.get('bn'):missingLabels.append({'property':p,'qid':target,'missing':[l for l in ('en','bn') if not lab.get(l)]});continue
   # A self-referential value cannot function as a meaningful guessing clue.
   if target==q or norm(lab['en'])==norm(names['en']):continue
   key='v2_'+group+'_'+target.lower();facts[key]=True;groups.add(group)
   questions[key]=en+lab['en']+'?';bangla[key]=bn+lab['bn']+'?'
   sources.setdefault(key,[]).append(c['id']);usedStatements[c['id']]=c
 if 'Q5' in qids(e,'P31'):
  facts['real']=True;facts['fictional']=False
  for c in claims(e,'P31'):
   if isinstance(val(c),dict) and val(c).get('id')=='Q5':sources['real']=[c['id']];sources['fictional']=[c['id']];usedStatements[c['id']]=c
 # Eligibility cannot be satisfied by date, gender, existence or identity flags.
 if len(groups)<4 or sum(k.startswith('v2_') for k in facts)<6:
  reason='insufficient_independent_bilingual_clues';counts[reason]+=1;rejected.append({'qid':q,'reason':reason,'groups':len(groups),'clues':sum(k.startswith('v2_') for k in facts),'missingBengaliLabel':not bool(names.get('bn'))});continue
 sig=category+json.dumps(sorted((k,v) for k,v in facts.items() if k.startswith('v2_')))
 if sig in signatures:
  reason='indistinguishable_fact_signature';counts[reason]+=1;rejected.append({'qid':q,'reason':reason,'otherQid':signatures[sig]});continue
 signatures[sig]=q
 for n in [*names.values(),*aliases['en'],*aliases['bn']]:
  if norm(n):aliasIndex[norm(n)].add(q)
 entry={'id':('wd-' if q in enrichQids else 'v2-')+q.lower(),'wikidataId':q,'name':names['en'],'category':category,'facts':facts,'aliases':list(dict.fromkeys(aliases['en']+aliases['bn'])),'factSources':sources,'replacement':q in enrichQids}
 if names.get('bn'):entry['nameBn']=names['bn']
 candidates.append(entry)
 evidence.append({'qid':q,'revision':e['lastrevid'],'retrievedAt':retrieval[q],'source':requests[q],'revisionUrl':f'https://www.wikidata.org/wiki/Special:EntityData/{q}.json?revision={e["lastrevid"]}','license':'CC0-1.0','cohort':cohort,'labels':names,'aliases':aliases,'missingLabels':missingLabels,'statements':list(usedStatements.values())})
 counts['eligible']+=1
 counts['eligible_enrichment' if q in enrichQids else 'eligible_addition']+=1
 if not names.get('bn'):counts['eligible_missing_bengali_label']+=1
out=ROOT/'v2-evidence';out.mkdir(exist_ok=True)
for p in out.glob('*.json'):p.unlink()
for i in range(0,len(evidence),100):write(out/f'{i//100:04}.json',{'formatVersion':2,'license':'CC0-1.0','records':evidence[i:i+100]})
write(ROOT/'v2-candidates.json',{'formatVersion':2,'entries':candidates,'questions':questions,'bangla':bangla})
collisions=[{'normalizedAlias':n,'qids':sorted(qs)} for n,qs in aliasIndex.items() if len(qs)>1]
write(ROOT/'v2-import-report.json',{'formatVersion':2,'queries':selection['queries'],'rawSelected':len(selection['selected']),'rawDownloaded':len(entities),'eligible':len(candidates),'certifiedPlayable':0,'counts':dict(counts),'aliasCollisions':collisions,'rejected':rejected,'policy':'Canonical QIDs deduplicate identity; alias/name collisions with baseline quarantined for resolution. Shared aliases among distinct QIDs are reported, never merged. Eligibility is not playability.'})
print(json.dumps({'rawSelected':len(selection['selected']),'rawDownloaded':len(entities),'counts':dict(counts),'aliasCollisions':len(collisions)},ensure_ascii=False))
