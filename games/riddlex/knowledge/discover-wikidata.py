import urllib.request,urllib.parse,json,pathlib,time,argparse
parser=argparse.ArgumentParser(description="Discover Bangladesh/India human candidates by Wikidata sitelink count")
parser.add_argument("cache",type=pathlib.Path)
args=parser.parse_args()
out=args.cache;out.mkdir(parents=True,exist_ok=True)
for country,limit in [('Q902',500),('Q668',1200)]:
 q='''SELECT ?item ?links WHERE { ?item wdt:P31 wd:Q5; wdt:P27 wd:%s; wdt:P569 ?dob; wdt:P106 ?occupation; wikibase:sitelinks ?links. ?article schema:about ?item; schema:isPartOf <https://en.wikipedia.org/>. ?item rdfs:label ?bn FILTER(LANG(?bn)="bn") } GROUP BY ?item ?links ORDER BY DESC(?links) LIMIT %s'''%(country,limit)
 url='https://query.wikidata.org/sparql?'+urllib.parse.urlencode({'query':q,'format':'json'})
 try:
  data=json.load(urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'RiddlexKnowledge/1.0'}),timeout=60))
  (out/(country+'.json')).write_text(json.dumps(data)); print(country,len(data['results']['bindings']),flush=True)
 except Exception as e: print(country,str(e),flush=True)
