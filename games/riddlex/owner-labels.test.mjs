import test from "node:test";
import assert from "node:assert/strict";
import {ownerBengaliFallback} from "./owner-bengali-labels.js";
import {poolFromEntries} from "./kb.js";

test("original Bengali name from Grok or Wikidata always wins",()=>{
 assert.equal(ownerBengaliFallback("Kate Winslet","কেটের আসল বাংলা নাম"),"কেটের আসল বাংলা নাম");
 assert.equal(ownerBengaliFallback("Kate Winslet",""),"কেট উইন্সলেট");
});
test("unambiguous everyday and public profiles gain Bengali label without changing English",()=>{
 const entities=[
  {id:"A",en:"John Cena",yes:["real"]},
  {id:"B",en:"Keerthy Suresh",yes:["real"]},
  {id:"C",en:"Chicken (hen)",yes:["animal"]},
  {id:"D",en:"Earring",yes:["object"]},
  {id:"E",en:"Random Unknown Person",yes:["real"]},
 ];
 const pool=poolFromEntries([{id:"real",en:"Real?",bn:"ব্যক্তি?"}],entities);
 assert.equal(pool.ens[0],"John Cena");
 assert.equal(pool.bns[0],"জন সিনা");
 assert.equal(pool.bns[1],"কীর্তি সুরেশ");
 assert.equal(pool.bns[2],"মুরগি");
 assert.equal(pool.bns[3],"কানের দুল");
 assert.equal(pool.bns[4],"");
});
test("never assume short ambiguous names or assign wrong translation",()=>{
 for(const name of ["Ursula","Ram","Glass","Tablet"]) {
  assert.equal(ownerBengaliFallback(name,""),"",name);
 }
});
