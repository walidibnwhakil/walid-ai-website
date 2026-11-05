"""Bounded resumable CC0 acquisition. Raw caches are never called playable.

python knowledge/acquire-v2.py /tmp/riddlex-v2 --limit 12000
No paid services; at most two requests concurrently, 40 IDs/request, retries.
All retrieval timestamps are per successful response, never cache-read dates.
"""
import argparse, collections, concurrent.futures, datetime, hashlib, json, pathlib, time
import urllib.error, urllib.parse, urllib.request

PROPS = ['P31','P27','P21','P569','P106','P19','P166','P800','P641',
         'P108','P69','P463','P413','P136','P101','P1303','P1412',
         'P1441','P170','P50','P171','P105','P279','P186','P366',
         'P176','P495','P361','P527','P183','P2974','P141']
QUERIES = [
 ('bangladesh','?item wdt:P31 wd:Q5; wdt:P27 wd:Q902.',5000,'characters'),
 ('india','?item wdt:P31 wd:Q5; wdt:P27 wd:Q668.',10000,'characters'),
 ('fiction','?item wdt:P31/wdt:P279* wd:Q95074.',1500,'characters'),
 ('animals','{ SELECT ?item ?links WHERE { ?item wdt:P31 wd:Q16521; wikibase:sitelinks ?links. FILTER(?links >= 20) } ORDER BY DESC(?links) LIMIT 2000 } ?item wdt:P171* wd:Q729.',1000,'animals'),
 ('objects','?item wdt:P279 wd:Q34379.',1000,'objects'),
]

def now(): return datetime.datetime.now(datetime.timezone.utc).isoformat()
def save(path,data):
 tmp=path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n');tmp.replace(path)
def get(url):
 for attempt in range(4):
  try:
   with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RiddlexKnowledge/2.0 (CC0 offline educational game; bounded import)','Accept':'application/json'}),timeout=60) as r:
    result=json.load(r)
    if 'error' in result:raise urllib.error.URLError('Wikidata API: '+str(result['error'])[:400])
    return result
  except (urllib.error.URLError,TimeoutError,json.JSONDecodeError) as err:
   if attempt==3: raise
   retry=getattr(err,'headers',{}).get('Retry-After','0')
   time.sleep(min(60,max(int(retry) if str(retry).isdigit() else 0,2**(attempt+1))))

def main():
 p=argparse.ArgumentParser();p.add_argument('cache',type=pathlib.Path);p.add_argument('--limit',type=int,default=12000);p.add_argument('--workers',type=int,choices=[1,2],default=2);p.add_argument('--cohorts',nargs='+',default=[q[0] for q in QUERIES],choices=[q[0] for q in QUERIES]);p.add_argument('--labels-only',action='store_true');a=p.parse_args()
 assert 1<=a.limit<=100000
 root=a.cache;root.mkdir(parents=True,exist_ok=True)
 selected=[];seen=set();query_audit=[]
 # Interleave cohorts so a bounded acquisition includes each category.
 cohorts=[]
 for name,pattern,limit,category in QUERIES:
  if a.labels_only:continue
  if name not in a.cohorts:continue
  path=root/(name+'.query.json')
  query='SELECT DISTINCT ?item ?links WHERE { '+pattern+' ?item wikibase:sitelinks ?links. FILTER(?links >= 3) } ORDER BY DESC(?links) ?item LIMIT '+str(limit)
  url='https://query.wikidata.org/sparql?'+urllib.parse.urlencode({'query':query,'format':'json'})
  try:
   if not path.exists():
    result=get(url);save(path,{'source':url,'query':query,'retrievedAt':now(),'license':'CC0-1.0','data':result})
   result=json.loads(path.read_text());rows=result['data']['results']['bindings'];cohorts.append([(r['item']['value'].split('/')[-1],category,name) for r in rows]);query_audit.append({'cohort':name,'candidates':len(rows),'retrievedAt':result['retrievedAt'],'query':query})
   print('discovered',name,len(rows),flush=True)
  except Exception as err:
   query_audit.append({'cohort':name,'error':str(err),'query':query});print('discovery failed',name,str(err),flush=True)
 for i in range(max([len(g) for g in cohorts] or [0])):
  for group in cohorts:
   if i<len(group) and group[i][0] not in seen:
    seen.add(group[i][0]);selected.append(group[i])
 selected=selected[:a.limit]
 if a.labels_only:selected=json.loads((root/'selection.json').read_text())['selected']
 else:save(root/'selection.json',{'formatVersion':2,'license':'CC0-1.0','queries':query_audit,'selected':selected,'limit':a.limit})
 def batches(ids,folder,props):
  folder.mkdir(exist_ok=True);groups=[ids[i:i+40] for i in range(0,len(ids),40)]
  def fetch(xs):
   identity=hashlib.sha256('|'.join(xs).encode()).hexdigest()[:20];path=folder/(identity+'.json')
   if path.exists():return
   time.sleep(1)
   url='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode({'action':'wbgetentities','ids':'|'.join(xs),'props':props,'languages':'en|bn','format':'json','maxlag':'30'})
   result=get(url)
   if 'entities' not in result:raise ValueError(str(result)[:300])
   save(path,{'source':url,'retrievedAt':now(),'license':'CC0-1.0','data':result})
  failures=[]
  with concurrent.futures.ThreadPoolExecutor(max_workers=a.workers) as ex:
   fs={ex.submit(fetch,xs):xs for xs in groups}
   for i,f in enumerate(concurrent.futures.as_completed(fs)):
    try:f.result()
    except Exception as err:
     failures.append({'ids':fs[f],'error':str(err)})
     if len(failures)<=3:print('request failed',str(err)[:250],flush=True)
    if (i+1)%5==0 or i+1==len(groups):print(folder.name,i+1,'/',len(groups),'failed',len(failures),flush=True)
  save(root/(folder.name+'-failures.json'),failures)
 if not a.labels_only:batches([x[0] for x in selected],root/'entities','labels|aliases|claims|sitelinks|info')
 related=collections.Counter()
 for path in (root/'entities').glob('*.json'):
  for e in json.loads(path.read_text())['data']['entities'].values():
   for prop in PROPS:
    for c in e.get('claims',{}).get(prop,[]):
     v=c.get('mainsnak',{}).get('datavalue',{}).get('value')
     if isinstance(v,dict) and 'id' in v:related[v['id']]+=1
 existingLabels=set()
 for path in (root/'labels').glob('*.json') if (root/'labels').exists() else []:
  existingLabels.update(json.loads(path.read_text())['data']['entities'])
 batches(sorted((q for q in related if q not in existingLabels),key=lambda q:(-related[q],q)),root/'labels','labels|info')
 print('complete selected',len(selected),'related labels',len(related),flush=True)

if __name__=='__main__':main()
