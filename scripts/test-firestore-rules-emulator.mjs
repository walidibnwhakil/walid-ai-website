/**
 * Minimal real Firebase Firestore emulator permission smoke tests.
 * Runs only in CI against the emulator, never the production project.
 */
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

const projectId = "demo-walid-ai-rules";
const env = await initializeTestEnvironment({
  projectId,
  firestore: { host: "127.0.0.1", port: 8080 },
});
try {
  await env.clearFirestore();

  const anon = env.unauthenticatedContext().firestore();
  const player = env.authenticatedContext("riddlex-ci-player", {
    email: "player@example.invalid", email_verified: true,
  }).firestore();
  const owner = env.authenticatedContext("riddlex-ci-owner", {
    email: "walid.ibnwhakil@gmail.com", email_verified: true,
  }).firestore();
  const hour = Math.floor(Date.now() / 3600000);
  const slug = "ci-verified-test";
  const slot = doc(player, "riddlex_slots", `riddlex-ci-player~${hour}~0`);
  const entry = doc(player, "riddlex_entries", slug);
  const pending = {
    slug,
    nameEn: "Test Person",
    nameBn: "পরীক্ষার ব্যক্তি",
    adult: false,
    answers: [{ qid: "real", value: "yes" }],
    status: "pending",
    confirmations: 1,
    confirmers: ["riddlex-ci-player"],
    createdBy: "riddlex-ci-player",
    slot: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await assertFails(setDoc(doc(anon, "riddlex_slots", "x~0~0"), { slug }));
  await assertFails(setDoc(doc(anon, "riddlex_entries", "untrusted"), pending));
  await assertSucceeds(setDoc(slot, { slug }));

  // Player-created names cannot bypass moderation.
  await assertFails(setDoc(entry, { ...pending, status: "confirmed" }));
  await assertSucceeds(setDoc(entry, pending));
  await assertFails(updateDoc(entry, { status: "confirmed", updatedAt: serverTimestamp() }));
  await assertFails(updateDoc(entry, { nameEn: "Hijacked", updatedAt: serverTimestamp() }));

  // Only the owner can approve or reject submissions.
  await assertSucceeds(updateDoc(doc(owner, "riddlex_entries", slug), {
    status: "approved", updatedAt: serverTimestamp(),
  }));
  await assertSucceeds(getDoc(doc(anon, "riddlex_entries", slug)));
  await assertFails(setDoc(doc(player, "other_collection", "not-authorized"), { value: "not allowed" }));
  // New independent suggestions: original path is immutable even for the
  // reviewing owner. The accepted, edited facts are a separate record.
  const proposalId="ci-path-001";
  const proposalSlot=doc(player,"riddlex_slots","riddlex-ci-player~"+hour+"~1");
  await assertSucceeds(setDoc(proposalSlot,{slug:proposalId}));
  const playerProposal=doc(player,"riddlex_suggestions",proposalId);
  const ownerProposal=doc(owner,"riddlex_suggestions",proposalId);
  const rawPath=Array.from({length:50},(_,i)=>({q:"question_"+i,a:i%2?"yes":"probably_not"}));
  const proposal={nameEn:"Test Person",nameBn:"",adult:false,category:"character",
    answers:rawPath,knownIds:["Q123"],status:"pending",createdBy:"riddlex-ci-player",
    slot:1,createdAt:serverTimestamp()};
  await assertFails(setDoc(playerProposal,{...proposal,status:"approved"}));
  await assertSucceeds(setDoc(playerProposal,proposal));
  await assertSucceeds(getDoc(playerProposal));
  await assertFails(getDoc(doc(anon,"riddlex_suggestions",proposalId)));
  await assertFails(getDoc(doc(env.authenticatedContext("other-user").firestore(),"riddlex_suggestions",proposalId)));
  await assertFails(updateDoc(playerProposal,{answers:[{q:"real",a:"no"}]}));
  await assertFails(updateDoc(ownerProposal,{answers:[{q:"real",a:"yes"}],reviewedAt:serverTimestamp()}));
  const reviewed={nameEn:"Test Person",nameBn:"",category:"real",adult:false,
    answers:[{q:"real",a:"yes"},{q:"cricketer",a:"yes"}],image:"",credit:"",
    mode:"patch",revision:1,updatedAt:serverTimestamp()};
  const ownerRecord=doc(owner,"riddlex_owner_records","Q123");
  await assertFails(setDoc(doc(player,"riddlex_owner_records","Q123"),reviewed));
  await assertFails(setDoc(ownerRecord,{...reviewed,adult:true,image:"image"}));
  await assertSucceeds(setDoc(ownerRecord,reviewed));
  const clue={id:"ownerq_0123456789abcdef0123456789abcdef",en:"Did they win a special award?",bn:"তিনি কি বিশেষ পুরস্কার পেয়েছেন?",category:"real"};
  const custom={...reviewed,customQuestions:[clue],answers:[...reviewed.answers,{q:clue.id,a:"yes"}]};
  await assertFails(setDoc(doc(player,"riddlex_owner_records","Q123"),custom));
  await assertFails(setDoc(ownerRecord,{...custom,customQuestions:Array.from({length:25},()=>clue)}));
  await assertFails(setDoc(ownerRecord,{...custom,customQuestions:"not a list"}));
  await assertSucceeds(setDoc(ownerRecord,custom));
  const published=await getDoc(doc(anon,"riddlex_owner_records","Q123"));
  if(published.data().customQuestions[0].id!==clue.id)throw Error("Owner question was not saved");
  await assertSucceeds(getDoc(doc(anon,"riddlex_owner_records","Q123")));
  await assertFails(updateDoc(doc(player,"riddlex_owner_records","Q123"),{answers:[],updatedAt:serverTimestamp()}));
  await assertFails(updateDoc(playerProposal,{status:"approved",resolvedId:"Q123",reviewedAt:serverTimestamp()}));
  await assertSucceeds(updateDoc(ownerProposal,{status:"approved",resolvedId:"Q123",reviewedAt:serverTimestamp()}));
  const saved=await getDoc(ownerProposal);
  if(JSON.stringify(saved.data().answers)!==JSON.stringify(rawPath))throw Error("Original path changed");
  const history=doc(owner,"riddlex_owner_records","Q123","history","1");
  await assertSucceeds(setDoc(history,{revision:1,answers:reviewed.answers}));
  await assertFails(getDoc(doc(anon,"riddlex_owner_records","Q123","history","1")));
  await assertFails(updateDoc(history,{revision:5}));
  await assertFails(updateDoc(entry,{answers:[{q:"real",a:"no"}],confirmations:2,confirmers:["riddlex-ci-player","other-user"],updatedAt:serverTimestamp()}));
  console.log("FIRESTORE_SECURITY_RULES_PASS: independent paths, owner-only approval and corrections, public reviewed facts, private revision history");
} finally {
  await env.cleanup();
}
