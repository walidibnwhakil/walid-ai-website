"""Durable branch-only expansion. Completed QIDs are never acquired again.

Seeds exact committed evidence, persists the queue and every substantial screened
batch, and leaves runtime activation to the separate final audit gate.
"""
import argparse,collections,datetime,hashlib,importlib.util,json,os,pathlib,subprocess,time,urllib.parse
ROOT=pathlib.Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('acquisition',ROOT/'acquire-v2.py');api=importlib.util.module_from_spec(spec);spec.loader.exec_module(api)
def read(p):return json.loads(p.read_text())
def save(p,x):p.parent.mkdir(parents=True,exist_ok=True);api.save(p,x)
def command(args):subprocess.run(args,cwd=ROOT.parent,check=True)
def checkpoint(message,push):
 if not push:return
 branch=subprocess.check_output(['git','branch','--show-current'],text=True).strip()
 if branch!='riddlex-recovery':raise RuntimeError('Refusing to write any other branch: '+branch)
 subprocess.run(['git','add','knowledge/v2-evidence','knowledge/v2-candidates.json','knowledge/v2-labels.json','knowledge/v2-import-report.json','knowledge/resume-state.json','knowledge/resume-queue.json'],cwd=ROOT.parent,check=True)
 if subprocess.run(['git','diff','--cached','--quiet'],cwd=ROOT.parent).returncode:
  command(['git','commit','-m',message]);command(['git','push','origin','HEAD:refs/heads/riddlex-recovery'])
def main():
 p=argparse.ArgumentParser();p.add_argument('cache',type=pathlib.Path);p.add_argument('--new-limit',type=int,default=25000);p.add_argument('--batch',type=int,default=500);p.add_argument('--push',action='store_true');a=p.parse_args()
 if not 1<=a.new_limit<=100000 or not 1<=a.batch<=1000:raise ValueError('Bounded import limits required')
 cache=a.cache;cache.mkdir(parents=True,exist_ok=True);(cache/'entities').mkdir(exist_ok=True);(cache/'labels').mkdir(exist_ok=True)
 statePath=ROOT/'resume-state.json';queuePath=ROOT/'resume-queue.json'
 if statePath.exists():
  state=read(statePath)
  decisions={r['qid']:r for r in state['historicalRejected']}
  decisions.update({r['qid']:r for r in read(ROOT/'v2-import-report.json')['rejected'] if r['reason'] not in ('not_downloaded_or_missing','not_downloaded')})
  state['historicalRejected']=list(decisions.values())
 else:
  report=read(ROOT/'v2-import-report.json');done={e['wikidataId'] for e in read(ROOT/'v2-candidates.json')['entries']}
  prior=[r for r in report['rejected'] if r['reason'] not in ('not_downloaded_or_missing','not_downloaded')];done.update(r['qid'] for r in prior)
  state={'formatVersion':3,'resumedFrom':'9ca410138bb22586b47ea1e0ba35009a1e8b1105','completed':sorted(done),'historicalRejected':prior,'historicalRawReported':report['rawDownloaded'],'newScreened':0,'newDownloaded':0,'status':'resuming','startedAt':api.now()}
 # Reconstruct raw-shaped inputs from exact archived statements, without network.
 seeds=[];byQid={e['wikidataId']:e for e in read(ROOT/'v2-candidates.json')['entries']}
 for path in sorted((ROOT/'v2-evidence').glob('*.json')):
  for row in read(path)['records']:
   q=row['qid'];candidate=byQid.get(q)
   if not candidate:continue
   seeds.append((q,candidate['category'],row['cohort']))
   path=cache/'entities'/('seed-'+q+'.json')
   if not path.exists():
    claims=collections.defaultdict(list)
    for c in row['statements']:claims[c['mainsnak']['property']].append(c)
    e={'id':q,'lastrevid':row['revision'],'labels':{l:{'language':l,'value':v} for l,v in row['labels'].items()},'aliases':{l:[{'language':l,'value':v} for v in vs] for l,vs in row['aliases'].items()},'claims':dict(claims)}
    save(path,{'source':row['revisionUrl'],'retrievedAt':row['retrievedAt'],'license':'CC0-1.0','seededFromCommit':state['resumedFrom'],'data':{'entities':{q:e}}})
 for q,label in read(ROOT/'v2-labels.json').items():
  path=cache/'labels'/('seed-'+q+'.json')
  if not path.exists():save(path,{'source':label['source'],'retrievedAt':label['retrievedAt'],'license':'CC0-1.0','data':{'entities':{q:{'id':q,'lastrevid':label['revision'],'labels':{l:{'language':l,'value':label[l]} for l in ('en','bn') if label.get(l)}}}}})
 if queuePath.exists():queue=read(queuePath)
 else:
  queries=[q for q in api.QUERIES if q[0] in ('bangladesh','india','fiction','objects')]
  queries.append(('global','?item wdt:P31 wd:Q5.',60000,'characters'))
  knownBaseline={r['qid'] for r in read(ROOT/'wikidata-snapshot.json')['records']}|set(read(ROOT/'baseline-wikidata-ids.json'))
  selected=[];seen=set(state['completed'])|knownBaseline;audit=[]
  # Cultural cohorts are exhausted before global candidates, never crowded out.
  for name,pattern,limit,category in queries:
   query='SELECT DISTINCT ?item ?links WHERE { '+pattern+' ?item wikibase:sitelinks ?links. FILTER(?links >= 3) } ORDER BY DESC(?links) ?item LIMIT '+str(limit)
   url='https://query.wikidata.org/sparql?'+urllib.parse.urlencode({'query':query,'format':'json'});path=cache/(name+'.query.json')
   try:
    if not path.exists():result=api.get(url);save(path,{'source':url,'query':query,'retrievedAt':api.now(),'license':'CC0-1.0','data':result})
    response=read(path);rows=response['data']['results']['bindings'];audit.append({'cohort':name,'candidates':len(rows),'query':query,'retrievedAt':response['retrievedAt']})
    for r in rows:
     q=r['item']['value'].split('/')[-1]
     if q not in seen:seen.add(q);selected.append((q,category,name))
    print('discover',name,len(rows),'new queue',len(selected),flush=True)
   except Exception as error:audit.append({'cohort':name,'error':str(error),'query':query});print('discovery error',name,str(error),flush=True)
   if len(selected)>=a.new_limit:break
  queue={'formatVersion':3,'license':'CC0-1.0','selected':selected[:a.new_limit],'queries':audit,'newLimit':a.new_limit};save(queuePath,queue)
 save(statePath,state);checkpoint('Persist Riddlex pending queue and completed-QID resume ledger',a.push)
 cached=set();labelIds=set()
 for f in (cache/'entities').glob('*.json'):cached.update(read(f)['data']['entities'])
 for f in (cache/'labels').glob('*.json'):labelIds.update(read(f)['data']['entities'])
 completed=set(state['completed']);pending=[r for r in queue['selected'] if r[0] not in completed]
 def fetch(ids,folder,props):
  for i in range(0,len(ids),50):
   xs=ids[i:i+50];time.sleep(1)
   url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(xs),'props':props,'languages':'en|bn','format':'json','maxlag':'30'})
   result=api.get(url)
   if 'entities' not in result:raise ValueError('No entities in API response')
   identity=hashlib.sha256('|'.join(xs).encode()).hexdigest()[:20];save(cache/folder/(identity+'.json'),{'source':url,'retrievedAt':api.now(),'license':'CC0-1.0','data':result})
   print(folder,i+len(xs),'/',len(ids),flush=True)
 for offset in range(0,len(pending),a.batch):
  batch=pending[offset:offset+a.batch];ids=[r[0] for r in batch if r[0] not in cached]
  fetch(ids,'entities','labels|aliases|claims|sitelinks|info');cached.update(ids)
  related=set()
  # Read current batch only, with all previously retrieved labels reused.
  wanted={r[0] for r in batch}
  for path in (cache/'entities').glob('*.json'):
   for q,e in read(path)['data']['entities'].items():
    if q not in wanted:continue
    for prop in api.PROPS:
     for c in e.get('claims',{}).get(prop,[]):
      v=c.get('mainsnak',{}).get('datavalue',{}).get('value')
      if isinstance(v,dict) and 'id' in v:related.add(v['id'])
  newLabels=sorted(related-labelIds);fetch(newLabels,'labels','labels|info');labelIds.update(newLabels)
  # Selection includes exact committed eligible seeds plus only freshly completed
  # batches. Previously rejected raw entities stay in the historical ledger.
  seedIds={r[0] for r in seeds}
  cumulative=[r for r in queue['selected'] if (r[0] in completed or r in batch) and r[0] not in seedIds]
  save(cache/'selection.json',{'formatVersion':2,'license':'CC0-1.0','selected':seeds+cumulative,'queries':queue['queries'],'limit':len(seeds)+len(cumulative)})
  command(['python','knowledge/pack-v2.py',str(cache)]);command(['node','validate-v2.mjs'])
  completed.update(r[0] for r in batch);state.update(completed=sorted(completed),newScreened=state['newScreened']+len(batch),newDownloaded=state['newDownloaded']+len(ids),updatedAt=api.now(),status='screening')
  save(statePath,state);checkpoint('Checkpoint Riddlex: '+str(state['newScreened'])+' new raw records screened; eligibility is not playability',a.push)
 state.update(status='acquisition-complete',completedAt=api.now());save(statePath,state);checkpoint('Complete bounded Riddlex acquisition; final playability gate pending',a.push)
 print('completed',state['newScreened'],'new raw records; no playable claim',flush=True)
if __name__=='__main__':main()
