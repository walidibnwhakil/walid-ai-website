"""Activate only a final-pool-verified subset; keep every baseline ID.

Runs in the cloud runner; checkpoints source separately from activation. No main,
merge, deployment, paid API or private user data is involved.
"""
import argparse,hashlib,json,pathlib,re,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parent;APP=ROOT.parent
def read(name):return json.loads((ROOT/name).read_text())
def save(name,data):(ROOT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
def run(args,log):
 started=time.monotonic();p=subprocess.run(args,cwd=APP,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 (ROOT/log).write_text(p.stdout);print(p.stdout[-12000:],flush=True)
 if p.returncode:raise RuntimeError('Command failed: '+str(args)+'; log '+log)
 return {'seconds':time.monotonic()-started,'exit':p.returncode,'stdout':p.stdout}
def commit(message,push):
 if not push:return
 if subprocess.check_output(['git','branch','--show-current'],cwd=APP,text=True).strip()!='riddlex-recovery':raise RuntimeError('Wrong branch')
 subprocess.run(['git','add','knowledge','runtime'],cwd=APP,check=True)
 if subprocess.run(['git','diff','--cached','--quiet'],cwd=APP).returncode:
  subprocess.run(['git','commit','-m',message],cwd=APP,check=True);subprocess.run(['git','push','origin','HEAD:refs/heads/riddlex-recovery'],cwd=APP,check=True)
def main():
 p=argparse.ArgumentParser();p.add_argument('--push',action='store_true');p.add_argument('--phase',default='final');a=p.parse_args()
 run(['node','validate-v2.mjs'],'source-validation.log')
 run(['node','audit-v2.mjs'],'baseline-audit.log')
 run(['node','audit-v2.mjs','--candidates'],'candidate-audit.log')
 for iteration in range(12):
  run(['node','build-runtime.mjs'],'runtime-build.log')
  run(['node','audit-v2.mjs','--final'],'final-audit.log')
  final=read('v2-final-audit.json');accepted=read('v2-accepted.json');correct={r['id'] for cat in final['rows'].values() for r in cat['ideal'] if r['correct']}
  failed=[e['id'] for e in accepted['entries'] if e['id'] not in correct]
  if not failed:break
  accepted['entries']=[e for e in accepted['entries'] if e['id'] not in failed];save('v2-accepted.json',accepted);print('Pruned final-pool failures',len(failed),flush=True)
 else:raise RuntimeError('Final admission did not stabilize; no activation published')
 validation=run(['npm','run','validate'],'validation.log');tests=run(['npm','test'],'tests.log')
 browser=run(['node','browser-check.cjs'],'browser.log');run(['node','performance-v2.mjs'],'performance.log')
 manifest=json.loads((APP/'runtime/manifest.json').read_text());measured=read('browser-results.json');performance=read('performance-results.json')
 manifestHash=hashlib.sha256((APP/'runtime/manifest.json').read_bytes()).hexdigest()
 if measured['manifestSha256']!=manifestHash or performance['manifestSha256']!=manifestHash:raise RuntimeError('Stale measurements')
 run(['node','verify-final-pool.mjs'],'final-pool-integrity.log')
 passed=re.search(r'pass\s+(\d+)',tests['stdout']);testCount=int(passed[1]) if passed else None
 save('test-results.json',{'validationExit':validation['exit'],'testExit':tests['exit'],'testsPassed':testCount,'testSeconds':tests['seconds'],'manifestSha256':manifestHash,'phase':a.phase})
 source=read('v2-import-report.json');state=read('resume-state.json') if (ROOT/'resume-state.json').exists() else None
 categories=['characters','animals','objects'];rows=[]
 for c in categories:
  x=final['categories'][c];rows.append(f"| {c} | {manifest['categories'][c]['count']} | {x['ideal']['correct']} | {x['ideal']['unresolved']} | {x['noisy']['correct']} | {x['noisy']['wrongFirstGuesses']} |")
 additions=sum(not e['replacement'] for e in accepted['entries']);enriched=sum(e['replacement'] for e in accepted['entries']);available=sum(manifest['categories'][c]['count'] for c in categories);verified=sum(final['categories'][c]['ideal']['correct'] for c in categories)
 summary={'phase':a.phase,'availableCasebook':available,'verifiedIdeal60':verified,'newVerifiedIdentities':additions,'verifiedEnrichments':enriched,'roles':15,'sourceEligible':source['eligible'],'currentRawCached':source['rawDownloaded'],'testsPassed':testCount,'initialBytes':measured['initialBytes'],'initialMs':measured['initialMs'],'browserHeapMiB':measured['memory'],'target100000Achieved':verified>=100000,'resumeState':state and {k:state[k] for k in ['resumedFrom','newScreened','newDownloaded','status']}}
 save('resume-summary.json',summary)
 report=f'''# Riddlex verified cloud milestone\n\nPhase: {a.phase}. **100,000 verified playable entries has not been achieved.**\n\nAll 1,791 baseline casebook IDs are retained. Available casebook: **{available}**.\nVerified correct first guesses within 60 questions: **{verified}**.\nNew admitted identities: **{additions}**; enriched baseline identities: **{enriched}**.\n15 relationship roles are separate. Unresolved legacy records are retained, not\ncounted as verified playable. No target identity or exact birthday clues, retry\noracle, alias padding or synthetic rows are counted as playable.\n\n| Category | Available | Verified ideal60 | Unresolved ideal60 | Noisy correct | Noisy wrong first |\n| --- | ---: | ---: | ---: | ---: | ---: |\n'''+ '\n'.join(rows)+f'''\n\nStructurally eligible source records: {source['eligible']}; raw records present\nin the current source cache: {source['rawDownloaded']}. Eligibility and raw counts\nare not playability counts. Historical screening decisions and exact completed\nQIDs are preserved in resume-state.json, independently of raw-cache availability.\n\nTests: {testCount} passed. English/Bengali browser games: {len(measured['games'])},\nall correct; JavaScript errors: {len(measured['errors'])}. Initial local screen:\n{measured['initialBytes']} bytes, {measured['initialMs']:.2f} ms. Browser JS heap:\n{measured['memory']} MiB. These are cloud-local measurements, not Bangladesh WAN.\nCategory/shard bytes, cold and focused engine timings and explicitly synthetic\n100k stress results are in performance-results.json. Synthetic rows are never\nentities or playable counts.\n\nExact ideal/noisy target outcomes are in v2-final-audit.json. Noise policy:\n25% unknown, 15% probable, 5% flipped, 55% definite on recorded target facts;\nmissing facts remain unknown. Noisy errors and unresolved games remain limitations.\nModel likelihood scores are not calibrated human confidence.\n\nThe bottleneck is meaningful bilingual discriminating evidence, not obtaining\nQIDs. The loader caps each category at 20k and needs another retrieval tier before\nactivating substantially larger sets. Current source discovery is bounded and\nprioritizes Bangladesh/India, then fictional figures, objects and global people.\nAnimal discovery/physical traits and Bengali fiction remain under-covered.\nMissing Bengali labels are tracked, never fabricated. Same-name ambiguity is\nquarantined; shared aliases are not treated as extra identities or proof of sameness.\n\nData is Wikidata CC0 structured evidence with recorded revisions, statement\nIDs/ranks/references, label revisions and retrieval timestamps. Traceable source\nassertions are not independent primary-publication fact checking.\n\nThe stopped ChatGPT runtime was not active at resume. This execution resumed\nGitHub checkpoint 9ca410138bb22586b47ea1e0ba35009a1e8b1105, excluding its completed\nQIDs. The queue and every substantial screened batch are saved to riddlex-recovery.\nNo main changes, merge, deployment or paid service provisioning. The public-repo\nstandard GitHub runner executes independently of the user's PC or ChatGPT session.\n\nSee Git history for exact milestone commit SHAs; this report cannot embed its\nown commit SHA. The runner's final commit contains this report and measured data.\n'''
 (ROOT/'RESUME-REPORT.md').write_text(report);print(json.dumps(summary,ensure_ascii=False),flush=True)
 commit('Verified Riddlex '+a.phase+': '+str(additions)+' new identities; '+str(verified)+' ideal60 recognitions; '+str(testCount)+' tests pass',a.push)
if __name__=='__main__':main()
