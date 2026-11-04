import json,pathlib,collections,re,argparse,datetime
parser=argparse.ArgumentParser(description="Select evidence-complete, bilingual, nonduplicate targets from cached Wikidata records")
parser.add_argument("cache",type=pathlib.Path)
parser.add_argument("existing",type=pathlib.Path,help="JSON export of the pre-expansion casebook")
parser.add_argument("output",type=pathlib.Path)
parser.add_argument('--retrieved-on',default=datetime.date.today().isoformat(),help='Snapshot capture date, YYYY-MM-DD; does not imply live revalidation of cached claims')
args=parser.parse_args()
datetime.date.fromisoformat(args.retrieved_on)
cache=args.cache;entities={};labels={}
for p in (cache/'entities').glob('*.json'):entities.update(json.loads(p.read_text())['entities'])
for p in (cache/'labels').glob('*.json'):labels.update(json.loads(p.read_text())['entities'])
print('entities',len(entities),'labels',len(labels))
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
existing=json.loads(args.existing.read_text());blocked=set()
for e in existing:
 blocked.add(norm(e['name']));blocked.add(norm(re.sub(r'\s*\([^)]*\)','',e['name'])))
 for s in e.get('sources',[]):blocked.add(norm(s['url'].split('/wiki/')[-1].replace('_',' ')))
def values(e,p):
 cs=[c for c in e.get('claims',{}).get(p,[]) if c.get('rank')!='deprecated' and 'datavalue' in c['mainsnak']]
 if any(c.get('rank')=='preferred' for c in cs):cs=[c for c in cs if c.get('rank')=='preferred']
 return cs
props=['P31','P27','P569','P106','P21','P19','P166','P800','P641']
qidPath=cache/'existing-qids.json'
if not qidPath.exists():qidPath=args.existing.with_name('baseline-wikidata-ids.json')
baselineQids=set(json.loads(qidPath.read_text()))
assert baselineQids, 'Canonical baseline QIDs are required for duplicate validation'
rows=[];skip=collections.Counter();used=set();dups=[];names=set();clues=set()
order=[]
# Round-robin coverage: high-sitelink Bangladesh and India rather than India crowding out Bangladesh.
groups=[json.loads((cache/(c+'.json')).read_text())['results']['bindings'] for c in ['Q902','Q668']]
for i in range(max(map(len,groups))):
 for g in groups:
  if i<len(g):order.append(g[i]['item']['value'].split('/')[-1])
for q in order:
 if q in used:continue
 used.add(q);e=entities.get(q)
 if not e:skip['not_downloaded']+=1;continue
 en=e.get('labels',{}).get('en',{}).get('value');bn=e.get('labels',{}).get('bn',{}).get('value')
 aliases=[en or '',e.get('sitelinks',{}).get('enwiki',{}).get('title','')]+[a['value'] for a in e.get('aliases',{}).get('en',[])]
 if q in baselineQids or any(norm(a) in blocked for a in aliases):skip['existing_alias']+=1;dups.append({'qid':q,'name':en});continue
 dob=values(e,'P569');dates={c['mainsnak']['datavalue']['value']['time'][:11] for c in dob}
 if not en or not bn or len(dates)!=1 or not dob or dob[0]['mainsnak']['datavalue']['value']['precision']<11 or dob[0]['mainsnak']['datavalue']['value']['calendarmodel']!='http://www.wikidata.org/entity/Q1985727':skip['ambiguous_or_imprecise_birth']+=1;continue
 def translated(p):return [c for c in values(e,p) if c['mainsnak']['datavalue']['value'].get('id') in labels and all(lang in labels[c['mainsnak']['datavalue']['value']['id']].get('labels',{}) for lang in ['en','bn'])]
 occ=translated('P106');places=translated('P19');extra=translated('P166')+translated('P800')+translated('P641')
 if not occ or (not places and not extra):skip['no_bilingual_clues']+=1;continue
 placeids={c['mainsnak']['datavalue']['value']['id'] for c in places}
 clue=next(iter(dates))+'|'+(next(iter(placeids)) if len(placeids)==1 else '')
 if norm(en) in names or clue in clues:skip['duplicate_name_or_birth_clue']+=1;continue
 names.add(norm(en));clues.add(clue)
 claims={p:values(e,p) for p in props}
 # Keep all source statements for selected properties; reference snaks are evidence, not additional gameplay facts.
 rows.append(dict(qid=q,name=en,nameBn=bn,revision=e.get('lastrevid'),article=e.get('sitelinks',{}).get('enwiki',{}).get('title'),claims=claims))
needed={c['mainsnak']['datavalue']['value']['id'] for r in rows for p in ['P106','P19','P166','P800','P641'] for c in r['claims'][p] if 'id' in c['mainsnak']['datavalue']['value'] and c['mainsnak']['datavalue']['value']['id'] in labels}
labelmap={q:{lang:v['value'] for lang,v in labels[q].get('labels',{}).items() if lang in ['en','bn']} for q in sorted(needed)}
# Reference metadata is minimized to statement id + hash + reference URLs/identifiers.
for r in rows:
 for p,cs in r['claims'].items():
  r['claims'][p]=[dict(id=c['id'],rank=c['rank'],value=c['mainsnak']['datavalue']['value'],references=c.get('references',[])) for c in cs]
result=dict(formatVersion=1,retrievedOn=args.retrieved_on,license='CC0-1.0',source='https://www.wikidata.org/',selection='Bangladesh/India humans, English Wikipedia sitelink and Bengali label; ordered by sitelink count within each country; unambiguous day-precision birth, bilingual occupation and place or work/award/sport',records=rows,labels=labelmap,excluded=dict(skip),existingAliasMatches=dups,baselineQids=sorted(baselineQids))
path=args.output;path.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n')
print('selected',len(rows),'skipped',skip,'bytes',path.stat().st_size)
