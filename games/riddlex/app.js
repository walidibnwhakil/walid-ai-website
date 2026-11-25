import { setGameInProgress } from "../refresh-guard.mjs";
import { answer as applyAnswer, canPrint, createState, decide, displayName, entityView, factBit, recompute, rejectIndex, rewind } from "./engine.js?v=riddlex-76";
import { UI, guessFont } from "./i18n.js?v=riddlex-40";
import { appendShard, categoryShards, imageSrc, loadManifest, loadShards, mergePools, planShardLoads, poolFromEntries, inheritCreditedPortraits, traffic } from "./kb.js?v=riddlex-73";
import { PERSONAL_RELATIONS, RIDDLEX_CHARACTER } from "./personal-facts.js?v=riddlex-62";
import { EXTRA_IDENTITY_PEOPLE } from "./identity-facts.js";
import { DOMAIN_PEOPLE } from "./domain-facts.js?v=riddlex-60";
import { BROAD_PEOPLE, BROAD_OBJECTS } from "./broad-facts.js?v=riddlex-73";
import { NARRATIVE_PEOPLE } from "./narrative-facts.js";
import { EVERYDAY_OBJECTS } from "./everyday-facts.js?v=riddlex-71";
import { RECOGNITION_PEOPLE, RECOGNITION_ANIMALS } from "./recognition-facts.js?v=riddlex-71";
import { UNVERIFIED_OWNER_NAMES } from "./unverified-owner-names.js";
import { EXTRA_HYPOTHESIS_ENTRIES } from "./hypothesis-facts.js?v=riddlex-60";
import { answersImplyAdult, loadLearned, loadOwnerRecords, nameMatchesAdult, submitLearning } from "./learn.js?v=riddlex-76";
import { applyOwnerRecords, exactRecordIds } from "./owner-records.js?v=riddlex-76";
import { createScene, startMenuCat } from "./scene.js?v=riddlex-39";

const $ = (id) => document.getElementById(id);
const menu = $("menu");
const game = $("game");
const status = $("status");
const answers = $("answers");
const guessBox = $("guess");
const learnForm = $("learn");
const scene = createScene($("stage"));

let lang = localStorage.getItem("riddlex-lang") || "en";
let category = null;
let manifest = null;
let catalog = null;
let pool = null;
let state = null;
let mode = "menu";
let currentQ = null;
let guessIndex = -1;
let loading = null;
let loadedNames = [];
let loadChain = Promise.resolve();
let menuCatController = null;
let ownerRecords = [];
let ownerPending = null;

function text() { return UI[lang] || UI.en; }

function applyLanguage() {
  document.documentElement.lang = lang;
  const copy = text();
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    if (copy[key]) node.textContent = copy[key];
  });
  $("play").setAttribute("aria-label", copy.play);
  $("answer-yes").textContent = copy.yes;
  $("answer-no").textContent = copy.no;
  $("answer-unknown").textContent = copy.unknown;
  $("answer-probably").textContent = copy.probably;
  $("answer-probably-not").textContent = copy.probablyNot;
  $("correct").textContent = copy.correct;
  $("wrong").textContent = copy.wrong;
  $("retry").textContent = copy.retry;
  $("solved-line").textContent = copy.solvedLine;
  $("again").textContent = copy.playAgain;
  $("new").textContent = copy.newGame;
  $("to-menu").textContent = copy.menu;
  $("back").setAttribute("aria-label", copy.previous);
  $("back").title = copy.previous;
  $("confirm-text").textContent = copy.confirmNew;
  $("confirm-yes").textContent = copy.confirmYes;
  $("confirm-no").textContent = copy.confirmNo;
  document.querySelectorAll("[data-cat]").forEach((node) => {
    const key = node.dataset.cat === "animal" ? "animalCat" : node.dataset.cat === "object" ? "objectCat" : "character";
    node.textContent = copy[key];
  });
  document.querySelectorAll("[data-set-lang]").forEach((node) => {
    node.setAttribute("aria-pressed", String(node.dataset.setLang === lang));
  });
  $("learn-name-text").textContent = copy.name;
  $("learn-photo-text").textContent = copy.photo;
  $("learn-save").textContent = copy.save;
  $("play-label").textContent = copy.play;
  $("learn-again").textContent = copy.playAgain;
  const retryLoad = $("load-retry");
  if (retryLoad) retryLoad.textContent = copy.tryLoad;
}

function showMenu() {
  mode = "menu";
  ++loadToken;
  menu.hidden = false;
  menuCatController?.resume();
  game.hidden = true;
  $("confirm").hidden = true;
  setGameInProgress(false);
  scene.stop();
  scene.clearReveal();
}

function gameInProgress() {
  return mode === "ask" || mode === "thinking" || mode === "reveal" || mode === "guess" || mode === "wrong" || mode === "retry" || mode === "learn" || mode === "solved";
}

const LOAD_MS = 57000;
const debugLoad = new URLSearchParams(location.search).has("autotest");
function loadEvent(event, detail = "") {
  if (!debugLoad) return;
  (window.__riddlexLoadTrace ||= []).push([Date.now(), event, String(detail)]);
}
const BUILD = "riddlex-76";
document.documentElement.dataset.riddlexBuild = BUILD;

function withTimeout(promise, ms) {
  let timer;
  const pending = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), ms);
  });
  return Promise.race([promise, pending]).finally(() => clearTimeout(timer));
}

function hideLoadRetry() {
  const button = $("load-retry");
  if (button) button.hidden = true;
}

function showLoadRetry() {
  mode = "pick";
  hideLoadRetry();
  showOnly("pick");
  const button = $("load-retry");
  if (button) button.hidden = false;
  setStatus(text().failedLoad);
}

async function boot() {
  applyLanguage();
  if (!menuCatController) menuCatController = startMenuCat($("menu-cat"));
  const bootToken = ++bootGeneration;
  manifest = null;
  catalog = null;
  // The index is an optional long-tail enhancement; an unavailable index
  // must not block the manifest or the character/animal/object starter pools.
  loading = loadManifest("./kb").then(loaded => {
    if (bootToken === bootGeneration) manifest = loaded;
    return loaded;
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  fetch(`./kb/index.json?v=${BUILD}`, { signal: controller.signal })
    .then(response => {
      if (!response.ok) throw new Error("Knowledge index failed");
      return response.json();
    })
    .then(index => { if (bootToken === bootGeneration) catalog = index; })
    .catch(error => { loadEvent("index.optionalFailed", error?.message); })
    .finally(() => clearTimeout(timer));
  loading.catch(() => {});
}

let loadToken = 0;
let bootGeneration = 0;
function adoptPool(next) {
  pool = applyOwnerRecords(next, ownerRecords, appendShard, poolFromEntries);
  if (!state || state.category !== category || !pool) return;
  state.pool = pool;
  if (state.weights.length !== pool.count) state.weights = new Float64Array(pool.count);
  recompute(state);
}

function setStatus(message, number) {
  status.textContent = message;
  const badge = $("q-badge");
  const speech = $("speech");
  const showNumber = Number.isFinite(number) && number > 0;
  if (badge) {
    badge.hidden = !showNumber;
    if (showNumber) badge.textContent = String(number);
  }
  speech?.classList.toggle("has-badge", showNumber);
  speech?.classList.remove("pop");
  void speech?.offsetWidth;
  speech?.classList.add("pop");
  scheduleUnderBubble();
}

function placeUnderBubble() {
  const wrap = document.querySelector(".stage-wrap");
  const bubble = $("speech");
  if (!wrap || !bubble || wrap.clientWidth / Math.max(1, wrap.clientHeight) >= 0.8) return;
  const wr = wrap.getBoundingClientRect();
  const sr = bubble.getBoundingClientRect();
  if (sr.height < 8) return;
  const shown = !$("categories").hidden ? $("categories") : $("answers");
  const height = shown && !shown.hidden ? shown.getBoundingClientRect().height : 96;
  const gap = 10;
  let top = sr.bottom - wr.top + gap;
  const max = Math.max(gap, wr.height - height - 8);
  if (top > max) top = max;
  const next = `${Math.round(top)}px`;
  if (wrap.style.getPropertyValue("--under-bubble") !== next) {
    wrap.style.setProperty("--under-bubble", next);
  }
}

function scheduleUnderBubble() {
  placeUnderBubble();
  requestAnimationFrame(placeUnderBubble);
}

function showOnly(which) {
  $("categories").hidden = which !== "pick";
  const panel = $("ask-panel");
  if (panel) panel.hidden = which !== "ask" && which !== "pick";
  answers.hidden = which !== "ask";
  guessBox.hidden = which !== "guess" && which !== "wrong" && which !== "solved";
  $("correct").hidden = which !== "guess";
  $("wrong").hidden = which !== "guess";
  $("retry").hidden = which !== "wrong";
  $("solved-line").hidden = which !== "solved";
  $("again").hidden = which !== "solved";
  learnForm.hidden = which !== "learn";
  $("learn-again").hidden = true;
  $("back").hidden = !(state && state.answers.length && (which === "ask" || which === "guess"));
  $("credit").hidden = which === "pick" || which === "ask";
  scheduleUnderBubble();
}

async function openPlay() {
  menu.hidden = true;
  scene.clearReveal();
  menuCatController?.pause();
  ++loadToken;
  game.hidden = false;
  mode = "pick";
  category = null;
  state = null;
  setGameInProgress(true);
  hideLoadRetry();
  showOnly("pick");
  setStatus(text().pick);
  $("progress").textContent = "";
  $("confirm").hidden = true;
  scene.setMood("curious");
  try { await scene.start(); } catch { /* the picture can arrive late; the choices stay up */ }
  scheduleUnderBubble();
  const token = loadToken;
  try { await withTimeout(loading, LOAD_MS); }
  catch { if (token === loadToken && mode === "pick") showLoadRetry(); }
}

async function loadNamed(entries, token, begin) {
  loadEvent("loadNamed.enter", JSON.stringify({ count: entries.length, category }));
  const names = entries.map((item) => item.file).filter((name) => !loadedNames.includes(name));
  if (!names.length || token !== loadToken) return;
  loadedNames.push(...names);
  let started = !begin;
  try {
  await loadShards("./kb", manifest, names, (partial) => {
    loadEvent("loadShards.onPool", JSON.stringify({ count: partial.count, category }));
    if (token !== loadToken) return;
    // Extend the initial casebook only once per character game. These are
    // relationship templates, never actual people's names or account data.
    if (category === "character" && !partial.ids.includes("riddlex-role-mother")) {
      // Always make the small verified public-interest casebook available
      // at game start, even when the worldwide long-tail shards do not load.
      // This avoids guessing a famous unrelated candidate because the actual
      // public figure lives beyond the mobile transfer budget.
      const extra = [...EXTRA_IDENTITY_PEOPLE, ...DOMAIN_PEOPLE, ...BROAD_PEOPLE, ...NARRATIVE_PEOPLE, ...RECOGNITION_PEOPLE, ...UNVERIFIED_OWNER_NAMES].filter(person =>
        !partial.ids.includes(person.id) &&
        !EXTRA_IDENTITY_PEOPLE.some(other=>other !== person && other.id === person.id));
      // Use the same already-licensed Grok-era picture and credit only
      // when an exact matching record is unambiguous; never show an icon.
      const licensed=inheritCreditedPortraits(partial, extra);
      const roles = poolFromEntries(manifest.questions,
        [...PERSONAL_RELATIONS, RIDDLEX_CHARACTER, ...licensed]);
      adoptPool(appendShard(partial, roles));
      loadEvent("roles.appended", pool?.count);
    } else if ((category === "animal" || category === "object") &&
        !partial._hypothesisExtraLoaded) {
      const originals = category === "object"
        ? [...(EXTRA_HYPOTHESIS_ENTRIES.object || []), ...BROAD_OBJECTS, ...EVERYDAY_OBJECTS]
        : [...(EXTRA_HYPOTHESIS_ENTRIES[category] || []), ...RECOGNITION_ANIMALS];
      // Add only new identities; keep the existing packed casebook intact.
      const extra = originals.filter(item => !partial.ids.includes(item.id));
      if (extra.length) {
        adoptPool(appendShard(partial, poolFromEntries(manifest.questions, extra)));
      } else adoptPool(partial);
      partial._hypothesisExtraLoaded = true;
    } else {
      adoptPool(partial);
    }
    if (started || !begin) return;
    started = true;
    state = createState(pool, { opening: "real", category });
    loadEvent("state.created", state?.pool?.count);
    mode = "ask";
    step();
    loadEvent("step.called", currentQ);
    const learnLater = () => loadLearned(manifest.questions, category).then((rows) => {
      if (!rows.length || token !== loadToken || !pool || !["ask","thinking"].includes(mode)) return;
      adoptPool(mergePools([pool, poolFromEntries(manifest.questions, rows)]));
    }).catch(() => {});
    if (typeof requestIdleCallback === "function") requestIdleCallback(() => learnLater());
    else setTimeout(learnLater, 400);
  }, pool);
  loadEvent("loadShards.completed", pool?.count);
  } catch (error) {
    loadedNames = loadedNames.filter((name) => !names.includes(name));
    console.error("Riddlex knowledge loading failed", error);
    loadEvent("loadNamed.error", error?.stack || error);
    throw error;
  }
}

function queueShards(entries, token) {
  if (!entries.length) return loadChain;
  loadChain = loadChain.then(() => loadNamed(entries, token, false)).catch(() => {});
  return loadChain;
}

async function startGame(chosen) {
  category = chosen;
  const token = ++loadToken;
  loadedNames = [];
  pool = null;
  state = null;
  currentQ = null;
  loadChain = Promise.resolve();
  ownerRecords = [];
  ownerPending = loadOwnerRecords().then(records=>{
    if(token!==loadToken || !["pick","ask","thinking"].includes(mode))return false;
    ownerRecords=records;
    if(pool&&records.length)adoptPool(pool);
    return records.length>0;
  }).catch(()=>false);
  hideLoadRetry();
  setStatus(text().loading);
  try { await withTimeout(loading, LOAD_MS); }
  catch {
    if (token === loadToken) showLoadRetry();
    return;
  }
  if (token !== loadToken) return;
  const planned = chosen === "character" && catalog
    ? planShardLoads(catalog, [], []) : [];
  const initial = planned.length ? planned
    : categoryShards(manifest, chosen).map(file => ({ file }));
  const job = loadNamed(initial, token, true);
  job.catch(() => {});
  try {
    await withTimeout(job, LOAD_MS);
    loadEvent("startGame.loaded", category);
  } catch (error) {
    loadEvent("startGame.failed", error?.stack || error);
    if (token !== loadToken) return;
    // Never replace a playable round with a loading error from a later shard.
    if (state && state.category === chosen && pool && mode !== "pick") return;
    loadToken += 1;
    showLoadRetry();
  }
}

async function step() {
  if (!state) return;
  const session = loadToken;
  const playingState = state;
  const wantsFiction = state.answers.some(row =>
    (row.qid === "real" && ["no","probably_not"].includes(row.value)) ||
    (row.qid === "fictional" && ["yes","probably"].includes(row.value)));
  // Fiction remains reachable if the optional worldwide index is unavailable.
  const fallback = wantsFiction && manifest?.shards?.includes("ix/fiction.bin") &&
    !loadedNames.includes("ix/fiction.bin") ? [{file:"ix/fiction.bin"}] : [];
  const pending = category === "character"
    ? queueShards(catalog ? planShardLoads(catalog, state.answers, loadedNames) : fallback, loadToken)
    : null;
  let decision = decide(state);
  if ((decision.type==="guess"||decision.type==="defeat") && ownerPending) {
    const outstanding=ownerPending;ownerPending=null;
    const changed=await withTimeout(outstanding,4000).catch(()=>false);
    if(loadToken!==session||state!==playingState)return;
    if(changed)decision=decide(state);
  }
  // A new clue can activate country/occupation shards that are not yet in
  // memory. Neither a name guess NOR a defeat is final until those relevant
  // knowledge shards have loaded. Otherwise the game gives up immediately
  // despite millions of available records in later shards.
  if ((decision.type === "guess" || decision.type === "defeat") && pending) {
    await pending;
    if (loadToken !== session || state !== playingState) return;
    decision = decide(state);
  }
  if (decision.type === "ask") {
    currentQ = decision.qid;
    mode = "ask";
    const question = pool.questions[pool.qIndex.get(currentQ)];
    if (!question) {
      showLoadRetry();
      return;
    }
    setStatus(lang === "bn" ? question.bn : question.en, state.answers.length + 1);
    $("progress").textContent = text().progress(state.answers.length + 1);
    scene.setMood(state.answers.length ? "thinking" : "curious");
    showOnly("ask");
    return;
  }
  if (decision.type === "guess") {
    await beginGuess(decision.index);
    return;
  }
  await beginDefeat();
}

async function beginGuess(index) {
  const session = loadToken;
  guessIndex = index;
  mode = "reveal";
  const entity = entityView(pool, index);
  const name = displayName(entity, lang);
  const printable = canPrint(pool, index);
  setStatus(text().writing);
  showOnly("none");
  scene.setMood("confident");
  const font = guessFont(lang, name);
  if (document.fonts?.load) {
    try { await withTimeout(document.fonts.load(font), 2500); } catch { /* use the fallback font */ }
    if (loadToken !== session || mode !== "reveal") return;
  }
  const result = await scene.playReveal({
    name,
    font,
    imageUrl: printable ? imageSrc(entity.image) : "",
  });
  if (loadToken !== session || mode !== "reveal") return;
  mode = "guess";
  const shownName = displayName(entity, lang);
  setStatus(text().prompt(shownName));
  const guessLine = $("guess-line");
  if (guessLine) guessLine.textContent = text().prompt(shownName);
  $("credit").textContent = result.printed && entity.credit ? `${text().credit}: ${entity.credit}` : "";
  showOnly("guess");
}

async function onAnswer(value) {
  if (mode !== "ask" || !currentQ) return;
  const question = currentQ;
  const round = state;
  const session = loadToken;
  currentQ = null;
  mode = "thinking";
  scene.react(value);
  scene.setMood("thinking");
  // Return control to the browser after the click before doing the
  // potentially expensive casebook scoring. Lock this question first so
  // a second click or keyboard press cannot count a different answer.
  await new Promise(resolve => setTimeout(resolve, 0));
  if (session !== loadToken || round !== state || mode !== "thinking") return;
  applyAnswer(round, question, value);
  await step();
}

async function onWrong() {
  if (mode !== "guess" || guessIndex < 0) return;
  mode = "wrong";
  setStatus(text().missed);
  showOnly("none");
  await scene.playWrong();
  if (mode !== "wrong") return;
  showOnly("wrong");
}

async function onRetry() {
  if (mode !== "wrong") return;
  mode = "retry";
  showOnly("none");
  scene.setMood("happy");
  await scene.playRetry();
  rejectIndex(state, guessIndex);
  guessIndex = -1;
  $("credit").textContent = "";
  // Rejected guesses and long games are not automatic defeats.
  // Only the engine decides when it has truly exhausted the knowledge.
  await step();
}

async function beginDefeat() {
  mode = "learn";
  scene.playDefeat();
  const personal = state?.answers.some((row) =>
    row.qid === "knows_you" &&
    (row.value === "yes" || row.value === "probably"));
  if (personal) {
    // A friend or family member's real name must never enter the shared
    // learning submissions. Let the player start a fresh round instead.
    showOnly("learn");
    learnForm.hidden = true;
    $("learn-again").hidden = false;
    setStatus(text().privatePeople);
    return;
  }
  const adult = answersImplyAdult(state?.answers || []);
  setStatus(text().defeat);
  learnForm.hidden = false;
  $("learn-again").hidden = true;
  answers.hidden = true;
  guessBox.hidden = true;
  $("learn-photo-row").hidden = adult;
  $("learn-note").textContent = adult ? text().noPhoto : "";
  $("learn-photo").value = "";
  $("learn-name").value = "";
  // Players can correct an accidental answer even after an unsuccessful round.
  $("back").hidden = !state?.answers.length;
}

function showLearnMessage(message) {
  setStatus(message);
  const note = $("learn-note");
  if (note) note.textContent = message;
}

async function onLearnSubmit(event) {
  event.preventDefault();
  const nameInput = $("learn-name");
  const name = nameInput?.value.trim() || "";
  if (!name) {
    showLearnMessage(text().needName);
    nameInput?.focus();
    return;
  }
  const adult = answersImplyAdult(state?.answers || []) || nameMatchesAdult(pool, name);
  const file = adult ? null : $("learn-photo")?.files?.[0] || null;
  const save = $("learn-save");
  const session = loadToken;
  if (save) save.disabled = true;
  try {
    await submitLearning({
      name,
      nameBn: lang === "bn" ? name : "",
      file,
      adult,
      answers: state?.answers || [],
      category,
      knownIds: exactRecordIds(pool,name),
    });
    if (session !== loadToken || mode !== "learn") return;
    showLearnMessage(text().saved);
    learnForm.hidden = true;
    $("learn-again").hidden = false;
  } catch {
    if (session !== loadToken || mode !== "learn") return;
    showLearnMessage(text().failedSave);
    if (save) save.disabled = false;
  }
}

function onCorrect() {
  if (mode !== "guess") return;
  mode = "solved";
  scene.setMood("happy");
  showOnly("solved");
  $("back").hidden = true;
}

function onPlayAgain() {
  if (mode !== "solved") return;
  scene.clearReveal();
  openPlay();
}

function onUndo() {
  if (mode === "thinking" || !state?.answers.length) return;
  if (["guess","reveal","wrong","learn"].includes(mode)) {
    scene.clearReveal();
    guessIndex = -1;
    $("credit").textContent = "";
  }
  const previous = state.answers.at(-1);
  rewind(state);
  currentQ = previous.qid;
  mode = "ask";
  const question = pool.questions[pool.qIndex.get(currentQ)];
  setStatus(lang === "bn" ? question.bn : question.en, state.answers.length + 1);
  $("progress").textContent = text().progress(state.answers.length + 1);
  showOnly("ask");
}

function setLanguage(next) {
  lang = next === "bn" ? "bn" : "en";
  localStorage.setItem("riddlex-lang", lang);
  applyLanguage();
  if (mode === "ask" && currentQ && pool) {
    const question = pool.questions[pool.qIndex.get(currentQ)];
    setStatus(lang === "bn" ? question.bn : question.en, state.answers.length + 1);
    $("progress").textContent = text().progress(state.answers.length + 1);
  } else if (mode === "pick") {
    setStatus(text().pick);
    $("progress").textContent = "";
  } else if (guessIndex >= 0 && pool && ["reveal", "guess", "wrong", "solved"].includes(mode)) {
    const entity = entityView(pool, guessIndex);
    const name = displayName(entity, lang);
    scene.relabel(name, guessFont(lang, name));
    $("guess-line").textContent = text().prompt(name);
    if (mode === "guess" || mode === "solved") setStatus(text().prompt(name));
    if (mode === "wrong") setStatus(text().missed);
    if ($("credit").textContent && entity.credit) $("credit").textContent = `${text().credit}: ${entity.credit}`;
  } else if (mode === "learn" && !learnForm.hidden && !$("learn-note").textContent) {
    setStatus(text().defeat);
  }
}

$("play").addEventListener("click", () => { openPlay(); });
$("new").addEventListener("click", () => {
  if (gameInProgress()) {
    $("confirm").hidden = false;
    return;
  }
  scene.clearReveal();
  openPlay();
});
$("confirm-yes").addEventListener("click", () => {
  $("confirm").hidden = true;
  scene.clearReveal();
  openPlay();
});
$("confirm-no").addEventListener("click", () => { $("confirm").hidden = true; });
document.querySelectorAll("[data-cat]").forEach((node) => node.addEventListener("click", () => startGame(node.dataset.cat)));
$("load-retry")?.addEventListener("click", () => {
  hideLoadRetry();
  boot();
  if (category) startGame(category);
  else openPlay();
});
$("to-menu").addEventListener("click", showMenu);
$("correct").addEventListener("click", onCorrect);
$("again").addEventListener("click", onPlayAgain);
$("learn-again").addEventListener("click", () => {
  if (mode !== "learn") return;
  scene.clearReveal();
  openPlay();
});
$("wrong").addEventListener("click", onWrong);
$("retry").addEventListener("click", onRetry);
$("back").addEventListener("click", onUndo);
learnForm.addEventListener("submit", onLearnSubmit);
document.querySelectorAll("[data-set-lang]").forEach((node) => node.addEventListener("click", () => setLanguage(node.dataset.setLang)));
document.querySelectorAll("[data-answer]").forEach((node) => node.addEventListener("click", () => onAnswer(node.dataset.answer)));
document.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey || mode !== "ask") return;
  const values = ["yes", "no", "unknown", "probably", "probably_not"];
  if (/^[1-5]$/.test(event.key)) {
    event.preventDefault();
    onAnswer(values[Number(event.key) - 1]);
  }
});
window.addEventListener("resize", () => { scene.resize(); scheduleUnderBubble(); });
if (typeof ResizeObserver === "function") {
  const bubble = $("speech");
  if (bubble) new ResizeObserver(() => placeUnderBubble()).observe(bubble);
}

if (new URLSearchParams(location.search).has("autotest")) {
  window.__riddlex = {
    ready: () => loading,
    start: async (cat = "character") => { await openPlay(); await startGame(cat); },
    answer: onAnswer,
    correct: onCorrect,
    wrong: onWrong,
    retry: onRetry,
    state: () => state && ({
      mode,
      question: currentQ,
      status: status.textContent,
      answers: state.answers.map((item) => item.qid),
      // Browser QA can check exact Yes/No click values (autotest mode only).
      lastAnswer: state.answers.length ? {
        qid: state.answers.at(-1).qid, value: state.answers.at(-1).value
      } : null,
      guesses: state.guesses,
      best: guessIndex >= 0 ? pool.ids[guessIndex] : "",
    }),
    poolSize: () => pool?.count || 0,
    diagnose: () => {
      if (!pool || !state) return null;
      const bit = (i, qid) => {
        const qi = pool.qIndex.get(qid);
        return qi == null ? 0 : factBit(pool, i, qi);
      };
      const matches = (i) => bit(i,"from_bd") === 2 && bit(i,"actor") === 2;
      const eligible = state.alive.filter(matches);
      const bdActors = [];
      let bdActorCount = 0;
      for (let i = 0; i < pool.count; i++) {
        if (matches(i)) {
          bdActorCount++;
          if (bdActors.length < 8) bdActors.push({
            id:pool.ids[i],en:pool.ens[i],alive:bit(i,"alive"),
            era1990:bit(i,"screen_star_1990s"),
            before1990:bit(i,"screen_star_pre1990"),
            weight:state.weights[i]
          });
        }
      }
      return {
        count:pool.count, alive:state.alive.length, bdActorCount,
        bdActorAlive:eligible.length,
        bdActor1990Alive:eligible.filter(i=>bit(i,"screen_star_1990s")===2).length,
        loadedCount:loadedNames.length, loaded:loadedNames.slice(0,20),
        nextPlan:catalog ? planShardLoads(catalog,state.answers,loadedNames).slice(0,12) : [],
        loadTrace:(window.__riddlexLoadTrace || []).slice(-28),
        bdActors, best:state.alive.slice().sort((a,b)=>state.weights[b]-state.weights[a]).slice(0,8).map(i=>({
          id:pool.ids[i],name:pool.ens[i],
          actor:bit(i,"actor"),bd:bit(i,"from_bd"),
          era1990:bit(i,"screen_star_1990s"),weight:state.weights[i]
        }))
      };
    },
    bytes: () => traffic.bytes,
    blinkCat: () => scene.blinkCat(),
    flickCat: () => scene.flickCat(),
    setMood: (value) => scene.setMood(value),
    react: (answer) => scene.react(answer),
    expression: () => scene.debug(),
    reveal: (name, imageUrl) => scene.playReveal({ name, imageUrl }),
    loaded: () => loadedNames.slice(),
    find: (id) => pool?.ids.indexOf(id) ?? -1,
    candidate: (id) => {
      const indices=pool?.ids.map((item,i)=>item===id?i:-1).filter(i=>i>=0)||[];
      return indices.map(i=>({
        id,name:pool.ens[i],weight:state?.weights[i]??0,
        alive:state?.alive.includes(i)??false,
        facts:state?.answers.map(row=>({
          qid:row.qid,response:row.value,bit:factBit(pool,i,row.qi),
        }))||[],
      }));
    },
    replyFor: (id, questionId = currentQ) => {
      const index = pool.ids.indexOf(id);
      const qi = pool.qIndex.get(questionId);
      // Sparse film-era and other overlay facts are not stored in the packed
      // 28-byte rows. Test decisions through the same factBit as the engine.
      const bit = index < 0 || qi == null ? 0 : factBit(pool, index, qi);
      return bit === 2 ? "yes" : bit === 1 ? "no" : "unknown";
    },
  };
}

boot();
showMenu();
