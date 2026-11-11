// Player-taught answers. Pictures are resized in the browser and stored in
// the Firestore document. Firebase Storage is not used. Adult-entertainment
// answers never accept a picture.

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

export async function loadLearned(questions) {
  try {
    const { db } = await ready();
    const snap = await db.collection("riddlex_entries").where("status", "in", ["approved", "confirmed"]).limit(80).get();
    const index = new Map(questions.map((question, position) => [question.id, position]));
    return snap.docs.map((doc) => {
      const data = doc.data();
      const yes = [];
      const no = [];
      for (const answer of data.answers || []) {
        if (!index.has(answer.q)) continue;
        if (answer.a === "yes" || answer.a === "probably") yes.push(answer.q);
        if (answer.a === "no" || answer.a === "probably_not") no.push(answer.q);
      }
      const adult = data.adult === true;
      return {
        id: "learn-" + doc.id,
        en: String(data.nameEn || "").slice(0, 80),
        bn: String(data.nameBn || ""),
        pop: 25 + Math.min(40, Number(data.confirmations) || 1) * 4,
        yes, no, adult,
        image: !adult && data.status === "approved" && typeof data.image === "string" ? data.image : "",
        credit: data.image ? "Player submission" : "",
      };
    }).filter((entry) => entry.en);
  } catch {
    return [];
  }
}

export async function submitLearning({ name, nameBn, file, answers, adult }) {
  const clean = name.trim().slice(0, 80);
  const slug = slugify(clean);
  if (!slug) throw new Error("name");
  const packed = answers.slice(0, 36).map((answer) => ({ q: answer.qid, a: answer.value }));
  let image = "";
  if (file && !adult) image = await compressImage(file);
  const { auth, db } = await ready();
  const uid = auth.currentUser.uid;
  const hour = Math.floor(Date.now() / 3600000);
  const ref = db.collection("riddlex_entries").doc(slug);
  let existing = null;
  try {
    existing = await ref.get();
  } catch (error) {
    const text = `${error?.code || ""} ${error?.message || error}`;
    const denied = /permission/i.test(text);
    if (!denied) throw new Error(text);
  }
  if (!existing?.exists) {
    let slot = -1;
    for (let n = 0; n < 5; n++) {
      try {
        await db.collection("riddlex_slots").doc(`${uid}~${hour}~${n}`).set({ slug });
        slot = n;
        break;
      } catch {
        // This hour's slot is taken. Try the next one.
      }
    }
    if (slot < 0) throw new Error("rate");
    const payload = {
      slug, nameEn: clean, nameBn: (nameBn || "").trim().slice(0, 80),
      adult: !!adult, answers: packed, status: "pending", confirmations: 1,
      confirmers: [uid], createdBy: uid, slot,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    if (image && !adult) payload.image = image;
    await ref.set(payload);
    return { status: "pending", confirmations: 1 };
  }
  const data = existing.data();
  if ((data.confirmers || []).includes(uid)) return { status: data.status, confirmations: data.confirmations };
  if (data.status === "rejected") return { status: "rejected", confirmations: data.confirmations };
  const confirmations = Math.min(12, (data.confirmations || 1) + 1);
  const status = data.status === "pending" && confirmations >= 3 ? "confirmed" : data.status;
  await ref.update({
    confirmations,
    confirmers: [...(data.confirmers || []), uid].slice(0, 12),
    status,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  return { status, confirmations };
}
