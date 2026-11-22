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
  console.log("FIRESTORE_SECURITY_RULES_PASS: pending moderation, owner approval and unrelated collection protection");
} finally {
  await env.cleanup();
}
