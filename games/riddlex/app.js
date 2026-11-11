import { setGameInProgress } from "../refresh-guard.mjs";
import { answer as applyAnswer, canPrint, createState, decide, displayName, entityView, recompute, rejectIndex, rewind } from "./engine.js";
import { UI, guessFont } from "./i18n.js";
import { categoryShards, imageSrc, loadManifest, loadShards, mergePools, planShardLoads, poolFromEntries, traffic } from "./kb.js";
import { answersImplyAdult, loadLearned, nameMatchesAdult, submitLearning } from "./learn.js";
import { createScene } from "./scene.js?v=akinator-13";

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
  $("new").textContent = copy.newGame;
  $("to-menu").textContent = copy.menu;
  $("back").textContent = copy.undo;
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
}

function showMenu() {
  mode = "menu";
  menu.hidden = false;
  game.hidden = true;
  $("confirm").hidden = true;
  setGameInProgress(false);
  scene.stop();
}

function gameInProgress() {
  return mode === "ask" || mode === "reveal" || mode === "guess" || mode === "wrong" || mode === "retry" || mode === "learn" || mode === "solved";
}

async function boot() {
  applyLanguage();
  loading = Promise.all([
    loadManifest("./kb"),
    fetch("./kb/index.json").then((response) => {
      if (!response.ok) throw new Error("Knowledge index failed");
      return response.json();
    }),
  ]).then(([loaded, index]) => {
    manifest = loaded;
    catalog = index;
    return loaded;
  });
  loading.catch(() => {});
}

let loadToken = 0;
function adoptPool(next) {
  pool = next;
  if (!state || state.category !== category || !pool) return;
  state.pool = pool;
  if (state.weights.length !== pool.count) state.weights = new Float64Array(pool.count);
  recompute(state);
}

function setStatus(message) {
  status.textContent = message;
  status.classList.remove("pop");
  void status.offsetWidth;
  status.classList.add("pop");
}

function showOnly(which) {
  $("categories").hidden = which !== "pick";
  answers.hidden = which !== "ask";
  guessBox.hidden = which !== "guess" && which !== "wrong";
  $("correct").hidden = which !== "guess";
  $("wrong").hidden = which !== "guess";
  $("retry").hidden = which !== "wrong";
  learnForm.hidden = which !== "learn";
  $("back").hidden = !(state && state.answers.length && (which === "ask" || which === "guess"));
  $("credit").hidden = which === "pick" || which === "ask";
}

async function openPlay() {
  menu.hidden = true;
  game.hidden = false;
  mode = "pick";
  category = null;
  state = null;
  setGameInProgress(true);
  scene.setMood("curious");
  await scene.start();
  setStatus(text().pick);
  $("progress").textContent = "";
  $("confirm").hidden = true;
  showOnly("pick");
  try { await loading; } catch { setStatus(text().failedSave); }
}

async function loadNamed(entries, token, begin) {
  const names = entries.map((item) => item.file).filter((name) => !loadedNames.includes(name));
  if (!names.length || token !== loadToken) return;
  loadedNames.push(...names);
  let started = !begin;
  try {
  await loadShards("./kb", manifest, names, (partial) => {
    if (token !== loadToken) return;
    adoptPool(partial);
    if (started || !begin) return;
    started = true;
    state = createState(pool, { opening: "real", category });
    mode = "ask";
    step();
    loadLearned(manifest.questions).then((rows) => {
      if (!rows.length || token !== loadToken || !pool) return;
      adoptPool(mergePools([pool, poolFromEntries(manifest.questions, rows)]));
    }).catch(() => {});
  }, pool);
  } catch (error) {
    loadedNames = loadedNames.filter((name) => !names.includes(name));
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
  loadChain = Promise.resolve();
  setStatus(text().loading);
  try { await loading; } catch { setStatus(text().failedSave); return; }
  if (token !== loadToken) return;
  if (chosen === "character" && catalog) {
    await loadNamed(planShardLoads(catalog, [], []), token, true);
    return;
  }
  const names = categoryShards(manifest, chosen);
  await loadNamed(names.map((file) => ({ file })), token, true);
}

async function step() {
  if (!state) return;
  const pending = category === "character" && catalog
    ? queueShards(planShardLoads(catalog, state.answers, loadedNames), loadToken)
    : null;
  let decision = decide(state);
  if (decision.type === "guess" && pending) {
    await pending;
    if (!state) return;
    decision = decide(state);
  }
  if (decision.type === "ask") {
    currentQ = decision.qid;
    mode = "ask";
    const question = pool.questions[pool.qIndex.get(currentQ)];
    setStatus(lang === "bn" ? question.bn : question.en);
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
    try { await document.fonts.load(font); } catch { /* the canvas falls back */ }
  }
  const result = await scene.playReveal({
    name,
    font,
    imageUrl: printable ? imageSrc(entity.image) : "",
  });
  if (mode !== "reveal") return;
  mode = "guess";
  setStatus(text().prompt(name));
  $("credit").textContent = result.printed && entity.credit ? `${text().credit}: ${entity.credit}` : "";
  showOnly("guess");
}

async function onAnswer(value) {
  if (mode !== "ask" || !currentQ) return;
  scene.react(value);
  scene.setMood("thinking");
  applyAnswer(state, currentQ, value);
  currentQ = null;
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
  if (state.guesses >= 4 || state.answers.length >= 72) {
    await beginDefeat();
    return;
  }
  await step();
}

async function beginDefeat() {
  mode = "learn";
  scene.playDefeat();
  const adult = answersImplyAdult(state?.answers || []);
  setStatus(text().defeat);
  learnForm.hidden = false;
  answers.hidden = true;
  guessBox.hidden = true;
  $("learn-photo-row").hidden = adult;
  $("learn-note").textContent = adult ? text().noPhoto : "";
  $("learn-photo").value = "";
  $("learn-name").value = "";
  $("back").hidden = true;
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
  if (save) save.disabled = true;
  try {
    await submitLearning({
      name,
      nameBn: lang === "bn" ? name : "",
      file,
      adult,
      answers: state?.answers || [],
    });
    showLearnMessage(text().saved);
    learnForm.querySelectorAll("input").forEach((input) => { input.disabled = true; });
  } catch {
    showLearnMessage(text().failedSave);
    if (save) save.disabled = false;
  }
}

function onCorrect() {
  if (mode !== "guess") return;
  mode = "solved";
  scene.setMood("happy");
  setStatus(text().solved);
  showOnly("none");
  $("back").hidden = true;
}

function onUndo() {
  if (!state?.answers.length) return;
  if (mode === "guess" || mode === "reveal" || mode === "wrong") {
    scene.clearReveal();
    guessIndex = -1;
    $("credit").textContent = "";
  }
  const previous = state.answers.at(-1);
  rewind(state);
  currentQ = previous.qid;
  mode = "ask";
  const question = pool.questions[pool.qIndex.get(currentQ)];
  setStatus(lang === "bn" ? question.bn : question.en);
  showOnly("ask");
}

function setLanguage(next) {
  lang = next === "bn" ? "bn" : "en";
  localStorage.setItem("riddlex-lang", lang);
  applyLanguage();
  if (mode === "ask" && currentQ && pool) {
    const question = pool.questions[pool.qIndex.get(currentQ)];
    setStatus(lang === "bn" ? question.bn : question.en);
    $("progress").textContent = text().progress(state.answers.length + 1);
  } else if (mode === "pick") {
    setStatus(text().pick);
    $("progress").textContent = "";
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
$("to-menu").addEventListener("click", showMenu);
$("correct").addEventListener("click", onCorrect);
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
window.addEventListener("resize", () => scene.resize());

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
      guesses: state.guesses,
      best: guessIndex >= 0 ? pool.ids[guessIndex] : "",
    }),
    poolSize: () => pool?.count || 0,
    bytes: () => traffic.bytes,
    loaded: () => loadedNames.slice(),
    find: (id) => pool?.ids.indexOf(id) ?? -1,
    replyFor: (id) => {
      const index = pool.ids.indexOf(id);
      const qi = pool.qIndex.get(currentQ);
      const base = index * pool.attrBytes + (qi >> 2);
      const bit = (pool.attrs[base] >> ((qi & 3) << 1)) & 3;
      return bit === 2 ? "yes" : bit === 1 ? "no" : "unknown";
    },
  };
}

boot();
showMenu();
