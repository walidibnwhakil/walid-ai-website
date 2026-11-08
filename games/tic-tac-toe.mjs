import { setGameInProgress } from "./refresh-guard.mjs";
import {
  createGame,
  move,
  isBotTurn,
  resultTitle,
  lineGeometry,
  LEVELS,
} from "./tic-tac-toe/engine.mjs";
import { fireCelebration } from "./tic-tac-toe/effects.mjs?v=ember-4";
import { chooseMove } from "./tic-tac-toe/bot.mjs";
const $ = (s) => document.querySelector(s),
  $$ = (s) => [...document.querySelectorAll(s)];
let selection = { level: "easy", mode: "bot", symbol: "X" },
  g = null,
  worker = null,
  epoch = 0,
  timer = null,
  stopEffects = () => {},
  resultTimer = null,
  audio = null,
  stats = {},
  settings = { sound: false, effects: true };
try {
  stats = JSON.parse(localStorage.getItem("royal-ttt-stats") || "{}");
  settings = {
    ...settings,
    ...JSON.parse(localStorage.getItem("royal-ttt-settings") || "{}"),
  };
} catch {}
const save = () => {
  try {
    localStorage.setItem("royal-ttt-stats", JSON.stringify(stats));
    localStorage.setItem("royal-ttt-settings", JSON.stringify(settings));
  } catch {}
};
const reduced = () =>
  !settings.effects || matchMedia("(prefers-reduced-motion: reduce)").matches;
function sound(type) {
  if (!settings.sound) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const t = audio.currentTime;
    const notes = {
      X: [420, 0.08],
      O: [290, 0.11],
      select: [600, 0.06],
      fire: [160, 0.5],
      win: [880, 0.6],
      lose: [130, 0.6],
    };
    const [freq, duration] = notes[type] || notes.select;
    for (let j = 0; j < (type === "win" ? 3 : 1); j++) {
      const o = audio.createOscillator(),
        v = audio.createGain();
      o.type = type === "fire" ? "sawtooth" : "sine";
      o.frequency.setValueAtTime(freq * (1 + j * 0.25), t + j * 0.1);
      o.frequency.exponentialRampToValueAtTime(
        freq * 0.6,
        t + duration + j * 0.1,
      );
      v.gain.setValueAtTime(0.035, t + j * 0.1);
      v.gain.exponentialRampToValueAtTime(0.001, t + duration + j * 0.1);
      o.connect(v).connect(audio.destination);
      o.start(t + j * 0.1);
      o.stop(t + duration + j * 0.1);
    }
  } catch {}
}
function syncSettings() {
  document.body.classList.toggle("low-effects", !settings.effects);
  $$('[data-action="sound"]').forEach((b) => {
    b.textContent = settings.sound ? "Sound On" : "Sound Off";
    b.setAttribute("aria-pressed", settings.sound);
  });
  save();
}
function select() {
  for (const key of ["level", "mode", "symbol"])
    $$(`[data-${key}]`).forEach((b) => {
      const active = b.dataset[key] === selection[key];
      b.classList.toggle("selected", active);
      b.setAttribute("aria-pressed", active);
    });
  $("#symbol-label").textContent =
    selection.mode === "friend" ? "Player 1 Symbol" : "Your Symbol";
  $(".menu-note").textContent =
    selection.mode === "friend"
      ? "Pass the device between turns · X always moves first"
      : "X always moves first · Every challenge has a competitive bot";
}
for (const key of ["level", "mode", "symbol"])
  $$(`[data-${key}]`).forEach(
    (b) =>
      (b.onclick = () => {
        selection[key] = b.dataset[key];
        select();
        sound("select");
      }),
  );
function cleanup() {
  epoch++;
  clearTimeout(timer);
  timer = null;
  clearTimeout(resultTimer);
  resultTimer = null;
  stopEffects();
  worker?.terminate();
  worker = null;
  $("#fire-lines").replaceChildren();
  $("#fire").classList.remove("ignite");
  $("#result").hidden = true;
  $("#result").className = "";
  $("#arena").classList.remove("frame-burst");
  const c = $("#sparks");
  c.getContext("2d").clearRect(0, 0, c.width, c.height);
  setGameInProgress(false);
}
function start() {
  cleanup();
  g = createGame(selection.level, selection.mode, selection.symbol);
  $("#menu").hidden = true;
  $("#play").hidden = false;
  $(".game-tools").hidden = true;
  document.body.classList.add("playing");
  $("#arena").className = `ornate ${g.level}`;
  $("#arena").style.setProperty("--size", g.size);
  $("#level-title").textContent =
    `${g.level[0].toUpperCase() + g.level.slice(1)} · Royal Challenge`;
  $("#condition").textContent =
    `${g.size} × ${g.size} board · Connect ${g.connect} consecutive symbols`;
  $("#board").style.setProperty("--size", g.size);
  $("#board").replaceChildren(
    ...g.cells.map((_, i) => {
      const b = document.createElement("button");
      b.className = "cell";
      b.onclick = () => {
        if (!isBotTurn(g)) play(i);
      };
      return b;
    }),
  );
  render();
  fitBoard();
  window.scrollTo(0, 0);
  scheduleBot();
}
function render() {
  const bot = isBotTurn(g);
  $$(".cell").forEach((b, i) => {
    b.innerHTML = g.cells[i]
      ? `<span class="mark ${g.cells[i].toLowerCase()}">${g.cells[i]}</span>`
      : "";
    b.disabled = !!(g.ended || bot || g.cells[i]);
    b.classList.toggle(
      "winning",
      g.lines.some((l) => l.includes(i)),
    );
    b.setAttribute(
      "aria-label",
      `Row ${Math.floor(i / g.size) + 1}, column ${(i % g.size) + 1}, ${g.cells[i] || "empty"}`,
    );
  });
  for (const s of ["X", "O"]) {
    const who =
      g.mode === "bot"
        ? s === g.symbol
          ? "You"
          : "Bot"
        : s === g.symbol
          ? "Player 1"
          : "Player 2";
    $(`#player-${s.toLowerCase()}`).textContent = `${s} · ${who}`;
    $(`#player-${s.toLowerCase()}`).classList.toggle(
      "active",
      g.turn === s && !g.ended,
    );
  }
  $("#status").textContent = g.ended
    ? "Match complete"
    : bot
      ? `${g.turn} · Bot is thinking…`
      : `${g.turn} · ${g.mode === "bot" ? "Your turn" : g.turn === g.symbol ? "Player 1’s turn" : "Player 2’s turn"}`;
  setGameInProgress(g.moves > 0 && !g.ended);
}
function play(i) {
  if (!move(g, i)) return;
  sound(g.cells[i]);
  render();
  if (g.ended) finish();
  else scheduleBot();
}
function scheduleBot() {
  if (!isBotTurn(g) || worker || timer) return;
  const id = epoch;
  timer = setTimeout(() => {
    timer = null;
    if (id !== epoch || !isBotTurn(g)) return;
    try {
      worker = new Worker(
        new URL("./tic-tac-toe/bot-worker.mjs", import.meta.url),
        { type: "module" },
      );
      worker.onmessage = ({ data }) => {
        if (id !== epoch || data.id !== id || !isBotTurn(g)) return;
        worker?.terminate();
        worker = null;
        play(data.index);
      };
      worker.onerror = () => {
        worker?.terminate();
        worker = null;
        if (id === epoch && isBotTurn(g)) fallback();
      };
      worker.postMessage({ id, game: g, budget: g.size === 3 ? 5000 : 650 });
    } catch {
      fallback();
    }
  }, 180);
  function fallback() {
    const index = chooseMove(g, g.size === 3 ? 5000 : 65);
    if (id === epoch && isBotTurn(g)) play(index);
  }
}
function finish() {
  clearTimeout(timer);
  timer = null;
  worker?.terminate();
  worker = null;
  const key = `${g.level}/${g.mode}`,
    s = (stats[key] ??= { played: 0, human: 0, bot: 0, draw: 0, X: 0, O: 0 });
  s.played++;
  if (g.winner === "draw") s.draw++;
  else {
    s[g.winner]++;
    if (g.mode === "bot") s[g.winner === g.symbol ? "human" : "bot"]++;
  }
  save();
  $("#result-title").textContent = resultTitle(g);
  $("#result-title").dataset.text = resultTitle(g);
  $("#result").classList.toggle("draw", g.winner === "draw");
  $("#result-detail").textContent =
    g.winner === "draw"
      ? "A balanced contest. The crown awaits a rematch."
      : `${g.winner} completes ${g.connect} in a row.`;
  $("#result").classList.toggle(
    "loss",
    g.mode === "bot" && g.winner !== g.symbol && g.winner !== "draw",
  );
  const id = epoch;
  const show = () => {
    if (id !== epoch) return;
    $("#result").hidden = false;
    $("#result").classList.add("reveal");
    if (g.winner !== "draw")
      sound(g.mode === "bot" && g.winner !== g.symbol ? "lose" : "win");
  };
  if (g.winner === "draw") {
    show();
    return;
  }
  drawLines(true);
  if (reduced()) {
    show();
    return;
  }
  sound("fire");
  particles();
  resultTimer = setTimeout(() => {
    $("#arena").classList.add("frame-burst");
    show();
  }, 1800);
}
function points() {
  const origin = $("#board-wrap").getBoundingClientRect();
  const border = parseFloat(getComputedStyle($("#board-wrap")).borderLeftWidth);
  return lineGeometry(
    g.lines[0],
    $$(".cell").map((b) => b.getBoundingClientRect()),
    { x: origin.x + border, y: origin.y + border },
  );
}
function drawLines(animate = false) {
  if (!g?.lines.length) return;
  const p = points(),
    a = p[0],
    z = p.at(-1),
    svg = $("#fire");
  svg.setAttribute(
    "viewBox",
    `0 0 ${$("#board").clientWidth} ${$("#board").clientHeight}`,
  );
  $("#fire-lines").innerHTML = ["flame-edge", "flame-gold", "flame-core"]
    .map(
      (c) =>
        `<line class="${c}" x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}" pathLength="1"/>`,
    )
    .join("");
  svg.classList.toggle("ignite", animate && !reduced());
}
function particles() {
  const id = epoch;
  stopEffects = fireCelebration({
    canvas: $("#sparks"),
    arena: $("#arena"),
    board: $("#board"),
    title: $("#result-title"),
    points,
    active: () => id === epoch && g?.ended && !reduced(),
  });
}
function fitBoard() {
  const slot = $("#arena-slot");
  if ($("#play").hidden) return;
  const side = Math.max(
    0,
    Math.floor(Math.min(slot.clientWidth, slot.clientHeight, 720)),
  );
  $("#arena").style.setProperty("--arena-side", `${side}px`);
}
new ResizeObserver(fitBoard).observe($("#arena-slot"));
window.visualViewport?.addEventListener("resize", fitBoard);
new ResizeObserver(() => {
  if (g?.ended && g.lines.length) drawLines(false);
}).observe($("#board"));
function menu() {
  cleanup();
  g = null;
  $("#play").hidden = true;
  $(".game-tools").hidden = false;
  document.body.classList.remove("playing");
  $("#menu").hidden = false;
  select();
  window.scrollTo(0, 0);
}
$("#top-back").addEventListener("click", (event) => {
  if (!$("#play").hidden) {
    event.preventDefault();
    menu();
  }
});
$("#start").onclick = start;
$("#restart").onclick = start;
$("#again").onclick = start;
$("#close-dialog").onclick = () => $("#dialog").close();
$("#dialog").addEventListener("click", (e) => {
  if (e.target === $("#dialog")) $("#dialog").close();
});
$$("[data-action]").forEach(
  (b) =>
    (b.onclick = () => {
      const a = b.dataset.action;
      if (a === "menu") {
        menu();
        return;
      }
      if (a === "sound") {
        settings.sound = !settings.sound;
        syncSettings();
        sound("select");
        return;
      }
      let content = "";
      if (a === "rules")
        content =
          "<h2>Game Rules</h2><p>X always moves first. Place your symbol in an empty square, then alternate turns. Connect consecutive symbols horizontally, vertically, or along either diagonal.</p><ul><li>Easy: 3 × 3 board — connect 3.</li><li>Medium: 5 × 5 board — connect 4.</li><li>Hard: 7 × 7 board — connect 5.</li></ul><p>The first completed line wins immediately. A full board without a winner is a Draw. In vs Bot, choose X or O; the bot always competes to win. In 2 Players, Player 1 controls the selected symbol. Whoever controls X starts.</p>";
      if (a === "settings")
        content = `<h2>Game Settings</h2><label><input id="sound-setting" type="checkbox" ${settings.sound ? "checked" : ""}> Sound effects</label><label><input id="effects-setting" type="checkbox" ${settings.effects ? "checked" : ""}> Cinematic fire and particles</label><p>Reduced motion preferences are respected automatically. Settings and statistics are saved only in this browser.</p>`;
      if (a === "stats")
        content =
          '<h2>Statistics</h2><p>Saved in this browser only. No online synchronization.</p><div style="overflow:auto"><table><thead><tr><th>Challenge / Mode</th><th>Played</th><th>You</th><th>Bot</th><th>X</th><th>O</th><th>Draw</th></tr></thead><tbody>' +
          Object.entries(stats)
            .map(
              ([k, s]) =>
                `<tr><td>${["easy", "medium", "hard"].includes(k.split("/")[0]) ? k.replace("/bot", " / Bot").replace("/friend", " / 2 Players") : "Challenge"}</td>${["played", "human", "bot", "X", "O", "draw"].map((v) => `<td>${Number(s[v]) || 0}</td>`).join("")}</tr>`,
            )
            .join("") +
          "</tbody></table></div>";
      $("#dialog-content").innerHTML = content;
      $("#dialog").showModal();
      $("#sound-setting")?.addEventListener("change", (e) => {
        settings.sound = e.target.checked;
        syncSettings();
      });
      $("#effects-setting")?.addEventListener("change", (e) => {
        settings.effects = e.target.checked;
        syncSettings();
        if (reduced()) {
          stopEffects();
          const c = $("#sparks");
          c.getContext("2d").clearRect(0, 0, c.width, c.height);
        }
        if (g?.lines.length) drawLines(false);
      });
    }),
);
window.addEventListener("pagehide", cleanup);
select();
syncSettings();
