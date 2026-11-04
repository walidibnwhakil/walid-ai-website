import test from 'node:test';
import assert from 'node:assert/strict';
import {entries,questions} from './casebook.js';
import {roles,relationshipQuestions} from './relationships.js';
import {localPhotoPath} from './print-photo.js';

const all=[...entries,...roles];
const questionBank={...questions,...relationshipQuestions};

test('every playable entry has a unique safe id, readable name, category and facts',()=>{
 const ids=new Set();
 for(const entry of all){
  assert.match(entry.id,/^[a-z0-9][a-z0-9_-]*$/,'Unsafe id: '+entry.id);
  assert.ok(!ids.has(entry.id),'Duplicate id: '+entry.id);ids.add(entry.id);
  assert.ok(typeof entry.name==='string'&&entry.name.trim(),'Missing name: '+entry.id);
  assert.ok(['characters','animals','objects','relationships'].includes(entry.category),'Invalid category: '+entry.id);
  assert.ok(entry.facts&&typeof entry.facts==='object'&&!Array.isArray(entry.facts),'Missing facts: '+entry.id);
 }
});

test('facts have a matching question and contain only boolean values',()=>{
 for(const entry of all){
  for(const [key,value] of Object.entries(entry.facts)){
   assert.ok(Object.hasOwn(questionBank,key),'Missing question '+key+' on '+entry.id);
   assert.equal(typeof value,'boolean','Nonboolean fact '+key+' on '+entry.id);
  }
 }
});

test('all categories are populated and no casebook item is a relationship',()=>{
 for(const category of ['characters','animals','objects','relationships']){
  assert.ok(all.some(entry=>entry.category===category),'Empty category '+category);
 }
 assert.ok(entries.every(entry=>entry.category!=='relationships'));
 assert.ok(roles.every(entry=>entry.category==='relationships'));
});

test('optional casebook images are either absent or local safe paths',()=>{
 for(const entry of all){
  if(entry.image!==undefined&&entry.image!==null&&entry.image!==''){
   assert.ok(localPhotoPath(entry),'Unsafe image for '+entry.id);
  }
 }
});
