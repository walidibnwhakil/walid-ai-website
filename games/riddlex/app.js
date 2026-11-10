import { setGameInProgress } from "../refresh-guard.mjs";
import { answer as applyAnswer, canPrint, createState, decide, displayName, entityView, rejectIndex, rewind } from "./engine.js";
import { UI, guessFont } from "./i18n.js";
import { imageSrc, loadKnowledge, mergePools, poolFromEntries } from "./kb.js";
import { answersImplyAdult, loadLearned, nameMatchesAdult, submitLearning } from "./learn.js";
import { createScene } from "./scene.js";

const $ = (id) => document.getElementById(id);
const menu = $("menu");
const game = $("game");
const status = $("status");
const answers = $("answers");
const guessBox = $("guess");
const learnForm = $("learn");
const scene = createScene($("stage"));

let lang = localStorage.getItem("riddlex-lang") || "bn";
let manifest = null;
let pool = null;
let state = null;
let mode = "menu";
let currentQ = null;
let guessIndex = -1;
let loading = null;

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
  $("learn-name-label").textContent = copy.name;
  $("learn-photo-label").textContent = copy.photo;
  $("learn-save").textContent = copy.save;
  document.querySelectorAll("[data-lang-toggle]").forEach((node) => { node.textContent = copy.lang; });
}

function showMenu() {
  mode = "menu";
  menu.hidden = false;
  game.hidden = true;
  setGameInProgress(false);
  scene.stop();
}

async function boot() {
  applyLanguage();
  loading = loadKnowledge("./kb").then(async (loaded) => {
    manifest = loaded.manifest;
    const learned = await loadLearned(loaded.manifest.questions);
    pool = learned.length
      ? mergePools([loaded.pool, poolFromEntries(loaded.manifest.questions, learned)])
      : loaded.pool;
    pool.opening = loaded.manifest.opening;
    return pool;
  });
  loading.catch(() => {});
}

function setStatus(message) {
  status.textContent = message;
}

function showOnly(which) {
  answers.hidden = which !== "ask";
  guessBox.hidden = which !== "guess" && which !== "wrong";
  $("correct").hidden = which !== "guess";
  $("wrong").hidden = which !== "guess";
  $("retry").hidden = which !== "wrong";
  learnForm.hidden = which !== "learn";
  $("back").hidden = !(state && state.answers.length && (which === "ask" || which === "guess"));
}

async function startGame() {
  menu.hidden = true;
  game.hidden = false;
  mode = "loading";
  setGameInProgress(true);
  scene.setMood("thinking");
  await scene.start();
  setStatus(text().loading);
  showOnly("none");
  try {
    await loading;
  } catch {
    setStatus(text().failedSave);
    return;
  }
  state = createState(pool, { opening: pool.opening || manifest.opening });
  mode = "ask";
  await step();
}

async function step() {
  if (!state) return;
  const decision = decide(state);
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
  const moods = { yes: "curious", no: "thinking", probably: "confused", probably_not: "confused", unknown: "thinking" };
  scene.setMood(moods[value] || "thinking");
  applyAnswer(state, currentQ, value);
  currentQ = null;
  await step();
}

async function onWrong() {
  if (mode !== "guess" || guessIndex < 0) return;
  mode = "wrong";
  setStatus(text().missed);
  showOnly("wrong");
  await scene.playWrong();
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
  if (state.guesses >= 4) {
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

async function onLearnSubmit(event) {
  event.preventDefault();
  const name = $("learn-name").value.trim();
  if (!name) return;
  const adult = answersImplyAdult(state.answers) || nameMatchesAdult(pool, name);
  const file = adult ? null : $("learn-photo").files?.[0] || null;
  $("learn-save").disabled = true;
  try {
    await submitLearning({
      name,
      nameBn: lang === "bn" ? name : "",
      file,
      adult,
      answers: state.answers,
    });
    setStatus(text().saved);
  } catch {
    setStatus(text().failedSave);
  } finally {
    $("learn-save").disabled = false;
    learnForm.hidden = true;
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

function toggleLanguage() {
  lang = lang === "bn" ? "en" : "bn";
  localStorage.setItem("riddlex-lang", lang);
  applyLanguage();
  if (mode === "ask" && currentQ) {
    const question = pool.questions[pool.qIndex.get(currentQ)];
    setStatus(lang === "bn" ? question.bn : question.en);
  }
}

$("play").addEventListener("click", () => { startGame(); });
$("new").addEventListener("click", () => { scene.clearReveal(); startGame(); });
$("to-menu").addEventListener("click", showMenu);
$("correct").addEventListener("click", onCorrect);
$("wrong").addEventListener("click", onWrong);
$("retry").addEventListener("click", onRetry);
$("back").addEventListener("click", onUndo);
learnForm.addEventListener("submit", onLearnSubmit);
document.querySelectorAll("[data-lang-toggle]").forEach((node) => node.addEventListener("click", toggleLanguage));
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
    start: startGame,
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
