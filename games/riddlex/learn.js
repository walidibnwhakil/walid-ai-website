// Player-taught answers. Pictures are resized in the browser and stored in
// the Firestore document. Firebase Storage is not used. Adult-entertainment
// answers never accept a picture.

import { reviewSubmission } from "./learn-guard.js";
import { normalizeReviewAnswers, recordCategory, withCategory, RECORD_CATEGORIES } from "./owner-records.js";

const SCRIPTS = [
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore-compat.js",
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error(src)), { once: true });
      }
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => { script.dataset.loaded = "1"; resolve(); };
    script.onerror = () => reject(new Error(src));
    document.head.append(script);
  });
}

export function normalizeName(name) {
  return (name || "").normalize("NFC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function slugify(name) {
  const slug = normalizeName(name).replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]+/gu, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug.slice(0, 100);
}

export function answersImplyAdult(answers) {
  return answers.some((answer) => answer.qid === "adult_ent" && (answer.value === "yes" || answer.value === "probably"));
}

export function nameMatchesAdult(pool, name) {
  const key = normalizeName(name);
  if (!key || !pool) return false;
  for (let index = 0; index < pool.count; index++) {
    if ((pool.flags[index] & 1) === 0) continue;
    const names = [pool.ens[index], pool.bns[index], ...(pool.aliasMap.get(pool.ids[index]) || [])];
    if (names.some((item) => normalizeName(item) === key)) return true;
  }
  return false;
}

async function compressImage(file) {
  const bitmap = await createImageBitmap(file);
  const maxWidth = 480;
  const scale = Math.min(1, maxWidth / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  let quality = 0.62;
  let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
  let type = "image/webp";
  if (!blob) {
    type = "image/jpeg";
    blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  }
  while (blob && blob.size > 90000 && quality > 0.32) {
    quality -= 0.08;
    blob = await new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }
  if (!blob || blob.size > 120000) throw new Error("image");
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  if (typeof dataUrl !== "string" || dataUrl.length > 150000) throw new Error("image");
  return dataUrl;
}

async function ready() {
  if (!window.WALID_FIREBASE_CONFIG) {
    await loadScript("/firebase-config.js");
  }
  for (const src of SCRIPTS) await loadScript(src);
  if (!window.firebase?.apps?.length) firebase.initializeApp(window.WALID_FIREBASE_CONFIG);
  const auth = firebase.auth();
  const db = firebase.firestore();
  if (!auth.currentUser) await auth.signInAnonymously();
  return { auth, db };
}

async function readPages(query) {
  const rows=[];
  let cursor=null;
  do{
    const snap=await (cursor?query.startAfter(cursor):query).limit(100).get();
    rows.push(...snap.docs);
    if(snap.size<100)break;
    cursor=snap.docs.at(-1);
  }while(cursor);
  return rows;
}
export async function loadOwnerRecords() {
  const {db}=await ready();
  const docs=await readPages(db.collection("riddlex_owner_records").orderBy(firebase.firestore.FieldPath.documentId()));
  return docs.map(doc=>({...doc.data(),id:doc.id})).filter(r=>
    RECORD_CATEGORIES.includes(r.category)&&typeof r.nameEn==="string"&&r.nameEn.trim()&&Array.isArray(r.answers));
}
export async function loadLearned(questions,gameCategory) {
  try {
    const { db } = await ready();
    const docs=await readPages(db.collection("riddlex_entries").where("status","in",["approved","confirmed"]).orderBy(firebase.firestore.FieldPath.documentId()));
    const known=new Set(questions.map(q=>q.id));
    return docs.map(doc=>{
      const data=doc.data();
      if(data.managed===true)return null;
      const cat=recordCategory(data.answers,data.category);
      if(!cat || (gameCategory==="character"? !["real","fictional"].includes(cat):cat!==gameCategory))return null;
      const facts=withCategory(normalizeReviewAnswers(data.answers,known),cat);
      const adult=data.adult===true;
      return {id:"learn-"+doc.id,en:String(data.nameEn||"").slice(0,80),bn:String(data.nameBn||""),
        pop:25+Math.min(40,Number(data.confirmations)||1)*4,
        yes:facts.filter(x=>x.a==="yes").map(x=>x.q),
        no:facts.filter(x=>x.a==="no").map(x=>x.q),adult,
        image:!adult&&typeof data.image==="string"?data.image:"",credit:data.image&&!adult?"Player submission":""};
    }).filter(entry=>entry?.en);
  }catch{return [];}
}

export function nameInPool(pool, name) {
  const key = normalizeName(name);
  if (!key || !pool) return false;
  for (let index = 0; index < pool.count; index++) {
    const names = [pool.ens[index], pool.bns[index], ...(pool.aliasMap?.get(pool.ids[index]) || [])];
    if (names.some((item) => normalizeName(item) === key)) return true;
  }
  return false;
}

export function isPermissionDenied(error) {
  return /permission/i.test(`${error?.code || ""} ${error?.message || error}`);
}

export async function saveNewEntry(setDoc, payload) {
  // User submissions are never published without the owner's review.
  await setDoc({ ...payload, status: "pending" });
  return "pending";
}

export async function saveMergedEntry(updateDoc, merged, legacy) {
  try {
    await updateDoc(merged);
    return "merged";
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    await updateDoc(legacy);
    return "legacy";
  }
}

// Every submission is independently reviewable; a known name is a correction
// suggestion, not a duplicate to silently discard or merge into an old path.
export async function submitLearning({name,nameBn,file,answers,adult,category,knownIds=[]}) {
  const verdict=reviewSubmission(name,answers);
  if(!verdict.ok)return {status:"thanked",stored:false};
  if(!["character","animal","object"].includes(category))throw Error("category");
  const packed=normalizeReviewAnswers(answers);
  if(!packed.length||packed.length>512)throw Error("answers");
  let image="";
  if(file&&!adult)image=await compressImage(file);
  const {auth,db}=await ready();
  const uid=auth.currentUser.uid,hour=Math.floor(Date.now()/3600000);
  const ref=db.collection("riddlex_suggestions").doc();
  let slot=-1;
  for(let n=0;n<5;n++){
    try{await db.collection("riddlex_slots").doc(uid+"~"+hour+"~"+n).set({slug:ref.id});slot=n;break;}
    catch{/* occupied slot */}
  }
  if(slot<0)throw Error("rate");
  const payload={nameEn:verdict.name,nameBn:(nameBn||"").trim().slice(0,80),adult:!!adult,
    category,answers:packed,knownIds:knownIds.filter(id=>typeof id==="string").slice(0,10),
    status:"pending",createdBy:uid,slot,createdAt:firebase.firestore.FieldValue.serverTimestamp()};
  if(image&&!adult)payload.image=image;
  await ref.set(payload);
  return {status:"pending",stored:true};
}
