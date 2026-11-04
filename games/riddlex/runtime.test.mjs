import test from 'node:test';import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';import {createHash} from 'node:crypto';
const root=new URL('./runtime/',import.meta.url),m=JSON.parse(await readFile(new URL('manifest.json',root),'utf8'));
test('shards are bounded, hashed, source-free and cover declared category counts',async()=>{
 const ids=new Set();
 for(const [category,spec] of Object.entries(m.categories)){
  let count=0;assert.ok(spec.count<=20000);
  for(const shard of spec.shards){
   const content=await readFile(new URL(shard.path,root),'utf8');
   assert.equal(createHash('sha256').update(content).digest('hex'),shard.sha256);
   assert.equal(Buffer.byteLength(content),shard.bytes);
   const data=JSON.parse(content);assert.ok(data.entries.length<=256);count+=data.entries.length;
   for(const e of data.entries){
    assert.ok(!ids.has(e.id));ids.add(e.id);assert.equal(e.category,category);
    assert.equal(e.factSources,undefined);assert.equal(e.sources,undefined);
    for(const key of Object.keys(e.facts)){assert.ok(!key.startsWith('cue_wd_'));assert.ok(data.questions[key]);assert.ok(data.bangla[key],key);}
   }
  }
  assert.equal(count,spec.count);
 }
});
test('initial app graph contains no casebook, generated knowledge or evidence snapshot',async()=>{
 const app=await readFile(new URL('./app.js',import.meta.url),'utf8'),loader=await readFile(new URL('./runtime-loader.js',import.meta.url),'utf8');
 assert.ok(!/from ["'].*(?:casebook|knowledge|questions.bn)/.test(app));
 assert.ok(!/from ["'].*(?:casebook|knowledge|questions.bn)/.test(loader));
 assert.ok(Buffer.byteLength(loader)<5000);
});
