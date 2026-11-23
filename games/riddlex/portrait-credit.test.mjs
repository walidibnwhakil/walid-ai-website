import test from "node:test";
import assert from "node:assert/strict";
import {inheritCreditedPortraits,poolFromEntries,imageSrc} from "./kb.js";
const questions=[{id:"real",group:"kind",en:"Real?",bn:"বাস্তব?"}];
test("reuse existing licensed picture with intact photographer credit for same exact identity",()=>{
 const photo="Kate Winslet 2007.jpg";
 const credit="CC BY 2.0 — Original photographer — Wikimedia Commons";
 const pool=poolFromEntries(questions,[
  {id:"Q123",en:"Kate Winslet",bn:"কেট উইন্সলেট",yes:["real"],image:photo,credit},
  {id:"Q-other",en:"John Cena",bn:"জন সিনা",yes:["real"],image:"John Cena.jpg",
    credit:"CC BY-SA 2.0 — Wikimedia Commons"},
 ]);
 const [kate]=inheritCreditedPortraits(pool,[{
  id:"identity-kate-winslet",en:"Kate Winslet",bn:"কেট উইন্সলেট",aliases:["Kate Elizabeth Winslet"],yes:["real"]
 }]);
 assert.equal(kate.image,photo);
 assert.equal(kate.credit,credit);
 assert.match(imageSrc(kate.image),/Special%3AFilePath|Special:FilePath/);
});
test("never substitute icons or generic pictures when no approved matching source",()=>{
 const pool=poolFromEntries(questions,[{
  id:"Q-a",en:"Unrelated",image:"Some photo.jpg",credit:"CC BY-SA",
 }]);
 const record={id:"R",en:"No actual photo exists",bn:"অজানা"};
 const [result]=inheritCreditedPortraits(pool,[record]);
 assert.strictEqual(result,record);
 assert.equal(result.image,undefined);
});
test("never borrow an uncredited picture",()=>{
 const pool=poolFromEntries(questions,[{id:"Q-a",en:"John Cena",
  image:"John Cena.jpg",credit:""}]);
 const [result]=inheritCreditedPortraits(pool,[{id:"R",en:"John Cena"}]);
 assert.equal(result.image,undefined);
});
test("ambiguous matching names must not be assigned another subject's photograph",()=>{
 const pool=poolFromEntries(questions,[
  {id:"A",en:"ABC Smith",image:"A.jpg",credit:"CC BY"},
  {id:"B",en:"ABC Smith",image:"B.jpg",credit:"CC BY"},
 ]);
 const [result]=inheritCreditedPortraits(pool,[{id:"C",en:"ABC Smith"}]);
 assert.equal(result.image,undefined);
});
test("adult performer record cannot acquire a photograph through a matching name",()=>{
 const pool=poolFromEntries(questions,[{id:"P",en:"Someone",
  image:"P.jpg",credit:"CC BY"}]);
 const [result]=inheritCreditedPortraits(pool,[{id:"Private",en:"Someone",adult:true}]);
 assert.equal(result.image,undefined);
});
