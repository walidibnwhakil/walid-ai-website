import assert from "node:assert/strict";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {once} from "node:events";
import {fileURLToPath} from "node:url";
import {resolve,extname,sep} from "node:path";
import {chromium} from "playwright";

const root=resolve(fileURLToPath(new URL("../../",import.meta.url)));
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".json":"application/json",".css":"text/css",".bin":"application/octet-stream"};
const server=createServer(async(req,res)=>{
  try{let path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
    if(path.endsWith("/"))path+="index.html";
    const file=resolve(root,"."+path);if(!file.startsWith(root+sep)&&file!==root)throw Error("path");
    const bytes=await readFile(file);res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"});res.end(bytes);
  }catch{res.writeHead(404);res.end("");}
});
server.listen(0,"127.0.0.1");await once(server,"listening");
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  const errors=[];page.on("pageerror",e=>errors.push(String(e)));
  await page.route("**/*",route=>{
    const url=new URL(route.request().url());
    if(url.origin!==origin)return route.fulfill({status:200,contentType:"text/javascript",body:""});
    if(/^\/(?:backend-config|admin-(?:analytics-catalog|section-metrics|usage|ops)|firebase-config)\.js$/.test(url.pathname))return route.fulfill({status:200,contentType:"text/javascript",body:""});
    return route.continue();
  });
  await page.addInitScript(()=>{
    sessionStorage.setItem("walidAdminAccess","test-session");
    window.WALID_FIREBASE_CONFIG={};
    const raw=[{q:"real",a:"yes"},{q:"male",a:"yes"},{q:"from_bd",a:"yes"},{q:"cricketer",a:"yes"},{q:"actor",a:"probably_not"},
      ...Array.from({length:40},(_,i)=>({q:"unknown_"+i,a:"unknown"}))];
    const canvas=document.createElement("canvas");canvas.width=16;canvas.height=16;
    canvas.getContext("2d").fillRect(0,0,16,16);
    const image=canvas.toDataURL("image/jpeg");
    const store=new Map([
      ["riddlex_suggestions/one",{nameEn:"New Cricket Test",nameBn:"নতুন ক্রিকেট",category:"character",adult:false,answers:raw,status:"pending",image,knownIds:[]}],
      ["riddlex_suggestions/two",{nameEn:"Rejected Test",nameBn:"",category:"object",adult:false,answers:[{q:"object",a:"yes"}],status:"pending",knownIds:[]}],
      ["riddlex_suggestions/three",{nameEn:"Amin Khan",nameBn:"আমিন খান",category:"character",adult:false,answers:[{q:"real",a:"yes"},{q:"male",a:"yes"},{q:"from_bd",a:"yes"},{q:"actor",a:"yes"}],status:"pending",knownIds:["Q21066842"]}],
    ]);
    const clone=x=>structuredClone(x);
    class Ref{
      constructor(path){this.path=path;this.id=path.split("/").at(-1)}
      collection(name){return new Query(this.path+"/"+name)}
      async get(){const exists=store.has(this.path);return {id:this.id,ref:this,exists,data:()=>clone(store.get(this.path))}}
      async update(data){if(!store.has(this.path))throw Error("not found");store.set(this.path,{...store.get(this.path),...clone(data)})}
      async set(data){store.set(this.path,clone(data))}
    }
    class Query{
      constructor(path,opts={}){this.path=path;this.opts=opts}
      where(key,op,val){return new Query(this.path,{...this.opts,where:[key,op,val]})}
      orderBy(key,dir){return new Query(this.path,{...this.opts,order:[key,dir]})}
      startAfter(cursor){return new Query(this.path,{...this.opts,after:cursor.id})}
      limit(n){return new Query(this.path,{...this.opts,limit:n})}
      doc(id="new-record"){return new Ref(this.path+"/"+id)}
      async get(){
        const prefix=this.path+"/",list=[...store.keys()].filter(k=>k.startsWith(prefix)&&!k.slice(prefix.length).includes("/")).sort();
        const [key,op,value]=this.opts.where||[];
        let selected=list.filter(k=>!key||store.get(k)[key]===value);
        if(this.opts.after)selected=selected.filter(k=>k.slice(prefix.length)>this.opts.after);
        const docs=await Promise.all(selected.slice(0,this.opts.limit||999).map(k=>new Ref(k).get()));
        return {docs,size:docs.length,empty:!docs.length,forEach:fn=>docs.forEach(fn)};
      }
    }
    const db={collection:n=>new Query(n),runTransaction:async fn=>{
      const writes=[];await fn({get:r=>r.get(),set:(r,d)=>writes.push(()=>r.set(d)),update:(r,d)=>writes.push(()=>r.update(d))});for(const w of writes)await w();
    }};
    const firestore=()=>db;firestore.FieldPath={documentId:()=>"__name__"};firestore.FieldValue={serverTimestamp:()=>"server-time"};
    const user={email:"test-owner@example.invalid",isAnonymous:false};
    const auth=()=>({currentUser:user,onAuthStateChanged:fn=>queueMicrotask(()=>fn(user)),signOut:async()=>{}});
    window.firebase={apps:[{}],auth,firestore};window.__reviewStore=()=>Object.fromEntries(store);
    window.confirm=()=>true;
  });
  await page.goto(origin+"/admin/",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{document.body.classList.remove("admin-locked");document.getElementById("workspace-shell").classList.remove("hidden");document.getElementById("riddlex-workspace").classList.remove("hidden");window.WalidAdminApprovals.activate()});
  const first=page.locator(".riddlex-item").filter({hasText:"New Cricket Test"});
  await first.getByRole("button",{name:"Review Submission"}).click({timeout:60000});
  const panel=page.locator("#riddlex-editor");
  await panel.getByText("Original play path — 45 answers").waitFor();
  assert.equal(await panel.locator(".riddlex-path tbody tr").count(),45);
  assert.ok(await panel.locator(".riddlex-path").innerText().then(t=>t.includes("সম্ভবত না")));
  assert.ok(await panel.locator("img").count()>0);
  const cricket=panel.locator(".riddlex-fact").filter({hasText:"Do they play cricket?"});
  await cricket.locator("select").selectOption("no");
  await panel.getByText("I verified that this identity",{exact:false}).click();
  await panel.getByRole("button",{name:"Accept as New Record"}).click();
  await page.waitForFunction(()=>window.__reviewStore()["riddlex_owner_records/owner-one"]?.answers.some(x=>x.q==="cricketer"&&x.a==="no"));
  const data=await page.evaluate(()=>window.__reviewStore());
  assert.equal(data["riddlex_suggestions/one"].answers.length,45);
  assert.equal(data["riddlex_suggestions/one"].answers.find(x=>x.q==="cricketer").a,"yes");
  assert.equal(data["riddlex_suggestions/one"].status,"approved");
  await page.locator(".riddlex-item").filter({hasText:"Rejected Test"}).getByRole("button",{name:"Review Submission"}).click();
  await panel.getByRole("button",{name:"Reject Submission"}).click();
  await page.waitForFunction(()=>window.__reviewStore()["riddlex_suggestions/two"].status==="rejected");
  await page.locator(".riddlex-item").filter({hasText:"Amin Khan"}).getByRole("button",{name:"Review Submission"}).click();
  await panel.getByRole("button",{name:"Find ID Q21066842"}).click();
  const candidate=page.locator(".riddlex-item").filter({hasText:"Q21066842"});
  for(let batch=0;batch<12;batch++){
    await page.waitForFunction(()=>document.querySelector("#riddlex-next").disabled===false || document.querySelector("#riddlex-page-info").textContent.includes("records scanned"),null,{timeout:60000});
    if(await candidate.count())break;
    const next=page.locator("#riddlex-next");
    if(await next.isDisabled())break;
    await next.click();await page.waitForTimeout(200);
  }
  console.log("CATALOG_SEARCH_STATE",await page.locator("#riddlex-status").innerText(),await page.locator("#riddlex-page-info").innerText());
  await candidate.getByRole("button",{name:"Select Existing Record"}).click({timeout:30000});
  await panel.getByText("Matched record: Q21066842",{exact:false}).waitFor();
  await panel.getByRole("button",{name:"Accept / publish reviewed facts"}).click();
  await page.waitForFunction(()=>window.__reviewStore()["riddlex_suggestions/three"].resolvedId==="Q21066842");
  const final=await page.evaluate(()=>window.__reviewStore());
  assert.equal(final["riddlex_owner_records/Q21066842"].mode,"patch");
  assert.equal(final["riddlex_owner_records/owner-three"],undefined);
  assert.deepEqual(errors,[]);
  console.log("RIDDLEX_OWNER_UI_PASS: 45-question original trace, photo, edit, accept, reject, catalog search, link existing ID");
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
