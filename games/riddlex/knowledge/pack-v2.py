"""Offline evidence packer; accepted = structural eligibility, NOT certified playable.
The audit runner separately promotes candidates after bounded identity-free games.
python knowledge/pack-v2.py CACHE
"""
import collections, datetime, hashlib, json, pathlib, re, sys, unicodedata, urllib.parse

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
entities={};labelmap={};labelEvidence={};retrieval={};requests={}
for folder in ('entities','labels'):
 for path in sorted((cache/folder).glob('*.json')):
  envelope=read(path)
  for q,e in envelope['data']['entities'].items():
   if folder=='entities':entities[q]=e;retrieval[q]=envelope['retrievedAt'];requests[q]=envelope['source']
   if q not in labelEvidence or envelope['retrievedAt']>labelEvidence[q]['retrievedAt']:
    labelmap[q]=labels(e)
    labelEvidence[q]={**labels(e),'revision':e.get('lastrevid'),'retrievedAt':envelope['retrievedAt'],'source':envelope['source'],'license':'CC0-1.0'}
selection=read(cache/'selection.json')
existing=read(ROOT/'baseline-targets.json');existingQids=set(read(ROOT/'baseline-wikidata-ids.json'))
old=read(ROOT/'wikidata-snapshot.json');enrichQids={r['qid'] for r in old['records']}
blocked={norm(e['name']) for e in existing}
for e in existing:
 for s in e.get('sources',[]):blocked.add(norm(urllib.parse.unquote(s['url'].split('/wiki/')[-1]).replace('_',' ')))
SCHEMA=read(ROOT/'v2-schema.json')
TEMPLATES={p:(v['group'],v['en'],v['bn']) for p,v in SCHEMA['properties'].items()}
questions={};bangla={};candidates=[];evidence=[];rejected=[];counts=collections.Counter();seen=set();signatures={};aliasIndex=collections.defaultdict(set)
for q,category,cohort in selection['selected']:
 reason=None;e=entities.get(q)
 if q in seen:counts['repeated_selection']+=1;continue
 seen.add(q)
 if q in existingQids:reason='existing_canonical_identity'
 elif not e or 'missing' in e:reason='not_downloaded_or_missing'
 elif 'redirect' in e or e.get('id',q)!=q:reason='redirect_requires_resolution'
 elif not e.get('lastrevid') or not e.get('labels',{}).get('en'):reason='missing_revision_or_english_label'
 if reason:counts[reason]+=1;rejected.append({'qid':q,'reason':reason});continue
 names=labels(e);aliases={lang:[a['value'] for a in e.get('aliases',{}).get(lang,[])] for lang in ('en','bn')}
 identityNames=[names['en'],*aliases['en'],e.get('sitelinks',{}).get('enwiki',{}).get('title','')]
 if any(norm(n) in blocked for n in identityNames if n):
  # A name/alias match is a possible identity collision, not proof of identity.
  reason='unresolved_baseline_alias_collision';counts[reason]+=1;rejected.append({'qid':q,'name':names['en'],'reason':reason});continue
 facts={};sources={};groups=set();missingLabels=[];usedStatements={}
 for p,(group,en,bn) in TEMPLATES.items():
  if category=='objects' and p not in ('P279','P186','P366','P176','P495','P361','P527'):continue
  if category=='animals' and p not in ('P171','P105','P183','P2974','P141'):continue
  if category=='characters' and p in ('P171','P105','P186','P366','P176','P495','P361','P527','P183','P2974','P141'):continue
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
 minimumGroups,minimumClues=SCHEMA['requirements'][category]['groups'],SCHEMA['requirements'][category]['clues']
 if len(groups)<minimumGroups or sum(k.startswith('v2_') for k in facts)<minimumClues:
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
neededLabels={val(c)['id'] for record in evidence for c in record['statements'] if isinstance(val(c),dict) and 'id' in val(c)}
write(ROOT/'v2-labels.json',{q:labelEvidence[q] for q in sorted(neededLabels) if q in labelEvidence})
collisions=[{'normalizedAlias':n,'qids':sorted(qs)} for n,qs in aliasIndex.items() if len(qs)>1]
statementCount=sum(len(r['statements']) for r in evidence);referenced=sum(bool(c.get('references')) for r in evidence for c in r['statements'])
write(ROOT/'v2-import-report.json',{'formatVersion':2,'queries':selection['queries'],'rawSelected':len(selection['selected']),'rawDownloaded':len(entities),'rawMissingBengaliLabels':sum(not bool(e.get('labels',{}).get('bn')) for e in entities.values()),'eligible':len(candidates),'certifiedPlayable':0,'counts':dict(counts),'eligibleStatements':statementCount,'statementsWithReferences':referenced,'aliasCollisions':collisions,'rejected':rejected,'policy':'Canonical QIDs deduplicate identity; alias/name collisions with baseline quarantined for resolution. Shared aliases among distinct QIDs are reported, never merged. Eligibility is not playability. Wikidata assertions are not independent primary-source verification.'})
print(json.dumps({'rawSelected':len(selection['selected']),'rawDownloaded':len(entities),'counts':dict(counts),'aliasCollisions':len(collisions)},ensure_ascii=False))
