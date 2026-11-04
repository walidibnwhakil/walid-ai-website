# Run discover-wikidata.py first. Raw network caches remain outside the repository.
import urllib.request,urllib.parse,json,pathlib,time,concurrent.futures,argparse
parser=argparse.ArgumentParser(description="Resume cached Wikidata CC0 entity and bilingual-label downloads; no runtime dependencies")
parser.add_argument("cache",type=pathlib.Path)
args=parser.parse_args()
out=args.cache
def get(url):
 for n in range(5):
  try:return json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RiddlexKnowledge/1.0 (offline educational dataset)'}),timeout=45))
  except Exception as error:
   if n==4:raise
   retry=getattr(error,"headers",{}).get("Retry-After", "0")
   time.sleep(max(float(retry) if str(retry).isdigit() else 0,min(20,3*(n+1))))
def batch(ids,folder,props):
 folder.mkdir(exist_ok=True)
 groups=[ids[i:i+40] for i in range(0,len(ids),40)]
 def fetch(xs):
  path=folder/(xs[0]+'.json')
  if path.exists():return
  time.sleep(1)
  u='https://www.wikidata.org/w/api.php?'+urllib.parse.urlencode(dict(action='wbgetentities',ids='|'.join(xs),props=props,languages='en|bn',format='json'))
  path.write_text(json.dumps(get(u),ensure_ascii=False))
 with concurrent.futures.ThreadPoolExecutor(max_workers=1) as ex:
  for i,_ in enumerate(ex.map(fetch,groups)):print(folder.name,i+1,'/',len(groups),flush=True)
ids=[]
for country in ['Q902','Q668']:
 p=out/(country+'.json')
 if p.exists():
  for x in json.loads(p.read_text())['results']['bindings']:
   q=x['item']['value'].split('/')[-1]
   if q not in ids:ids.append(q)
batch(ids,out/'entities','labels|aliases|claims|sitelinks|info')
related=set()
for p in (out/'entities').glob('*.json'):
 for e in json.loads(p.read_text())['entities'].values():
  for prop in ['P106','P19','P166','P800','P641']:
   for c in e.get('claims',{}).get(prop,[]):
    v=c['mainsnak'].get('datavalue',{}).get('value',{})
    if isinstance(v,dict) and 'id' in v:related.add(v['id'])
batch(sorted(related),out/'labels','labels')
