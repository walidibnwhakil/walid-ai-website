import {
  Match,
  identity,
  colorName,
  opposite,
  squaresFor,
  resultText,
} from "./model.mjs";
const $ = (s) => document.querySelector(s),
  asset = (name) => `./assets/${name}.webp`;
const names = {
  k: "King",
  q: "Queen",
  r: "Rook",
  b: "Bishop",
  n: "Knight",
  p: "Pawn",
};
let mode = "bot",
  side = "w",
  difficulty = "medium",
  minutes = 10,
  match = null,
  orientation = "w",
  selected = null,
  worker = null,
  request = 0,
  busy = false,
  animating = false,
  animationTimer,
  recorded = false,
  hintMove = null,
  sound = false,
  context;
const dialog = $("#dialog");
function cancel() {
  request++;
  worker?.terminate();
  worker = null;
  busy = false;
  clearTimeout(animationTimer);
  animating = false;
}
function modal(html) {
  $("#dialog-content").innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function close() {
  dialog.close();
}
$("#close-dialog").onclick = close;
dialog.addEventListener("cancel", (e) => {
  if (dialog.dataset.promotion) {
    e.preventDefault();
    return;
  }
});
function choice(container, change) {
  $(container).onclick = (e) => {
    const b = e.target.closest("button[data-value]");
    if (!b) return;
    for (const p of $(container).querySelectorAll("button"))
      p.setAttribute("aria-pressed", String(p === b));
    change(b.dataset.value);
  };
}
choice("#modes", (v) => {
  mode = v;
  $("#difficulty-field").disabled = v === "local";
});
choice("#sides", (v) => (side = v));
choice("#difficulties", (v) => (difficulty = v));
function beep() {
  if (!sound) return;
  try {
    context ??= new AudioContext();
    context.resume();
    const o = context.createOscillator(),
      g = context.createGain();
    o.connect(g);
    g.connect(context.destination);
    o.frequency.value = 420;
    g.gain.setValueAtTime(0.06, context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    o.start();
    o.stop(context.currentTime + 0.12);
  } catch {}
}
$("#sound").onclick = () => {
  sound = !sound;
  $("#sound").setAttribute("aria-pressed", String(sound));
  $("#sound").title = sound ? "Sound on" : "Sound off";
  beep();
};
function settings() {
  modal(
    `<h2>Game Settings</h2><label>Time per player<select id="time-control">${[1, 3, 5, 10, 15, 30].map((m) => `<option ${m === minutes ? "selected" : ""} value="${m}">${m} minutes</option>`).join("")}</select></label><p>Applies to the next game. Current clocks keep running while a game is active.</p><p>Sound is ${sound ? "on" : "off"}. Use the Sound control to change it.</p><p>Games and statistics stay on this device. No online play or cross-device synchronization.</p>`,
  );
  $("#time-control").onchange = (e) => {
    minutes = Number(e.target.value);
  };
}
$("#settings").onclick = settings;
$("#menu-settings").onclick = settings;
$("#rules").onclick = () =>
  modal(
    `<h2>Game Rules</h2><p>White always moves first. Win by checkmating the opposing king: it is attacked and has no legal escape. Kings are never captured. You cannot move into check or expose your own king.</p><ul><li>Pawns move one square forward, or two from their starting rank if both squares are empty. They capture one square diagonally forward.</li><li>Rooks move along ranks and files; bishops diagonally; queens combine both. They cannot jump pieces. Knights jump in an L: two squares in one direction and one across. Kings move one square in any direction.</li><li>Castling moves the king two squares toward a rook and the rook to its other side. Neither may have moved, all intervening squares must be empty, and the king cannot start in, cross, or end in check. An attacked rook does not prevent castling.</li><li>En passant: immediately after an adjacent enemy pawn advances two squares, your pawn on its fifth rank may capture it as though it advanced one square. This right expires after the next move.</li><li>A pawn reaching the last rank must promote to queen, rook, bishop or knight, regardless of previously captured pieces.</li><li>Stalemate (no legal move without check) and insufficient material end in a draw. Threefold repetition and fifty moves by each side without a pawn move or capture are automatically accepted here, rather than requiring a claim. This ends games before automatic fivefold repetition or seventy-five-move thresholds. Checkmate takes precedence.</li><li>Only the active player's clock runs, including bot thinking and promotion selection. Background time counts. On timeout, the opponent wins unless their material cannot possibly deliver checkmate, in which case it is a draw.</li><li>Resign to concede. Local players may offer and accept a draw; a bot accepts if the position is materially balanced.</li></ul><p>Tap a piece, then a marked destination. Hint suggests a legal move (three per game). Undo restores the prior position, rights, history and clocks; against the bot it normally takes back a complete pair of moves. Flip Board only changes the view. Restart resets everything.</p><p>Rules: <a href="../vendor/chess-LICENSE.txt">chess.js 1.4.0 — BSD-2-Clause</a>. Bot: Walid local search 1.0.0, running on this device.</p>`,
  );
function stats() {
  try {
    return (
      JSON.parse(localStorage.getItem("walid-chess-stats-v1")) || {
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        local: 0,
      }
    );
  } catch {
    return { games: 0, wins: 0, losses: 0, draws: 0, local: 0 };
  }
}
$("#statistics").onclick = () => {
  const s = stats();
  modal(
    `<h2>Statistics</h2><p>Completed games: ${s.games}<br>Wins vs Bot: ${s.wins}<br>Losses vs Bot: ${s.losses}<br>Draws: ${s.draws}<br>Local games: ${s.local}</p><p>Stored only in this browser. Storage restrictions may prevent saving.</p>`,
  );
};
function saveResult() {
  if (recorded) return;
  recorded = true;
  const s = stats();
  s.games++;
  if (match.mode === "local") s.local++;
  if (!match.result.winner) s.draws++;
  else if (match.mode === "bot")
    s[match.result.winner === match.side ? "wins" : "losses"]++;
  try {
    localStorage.setItem("walid-chess-stats-v1", JSON.stringify(s));
  } catch {}
}
function start() {
  cancel();
  close();
  delete dialog.dataset.promotion;
  $("#close-dialog").hidden = false;
  match = new Match({ mode, side, difficulty, minutes });
  orientation = side;
  selected = null;
  hintMove = null;
  recorded = false;
  $("#menu").hidden = true;
  $("#game").hidden = false;
  $("#back").textContent = "← Menu";
  render();
  schedule();
}
$("#start").onclick = start;
$("#again").onclick = start;
function menu() {
  cancel();
  match = null;
  close();
  delete dialog.dataset.promotion;
  $("#close-dialog").hidden = false;
  $("#game").hidden = true;
  $("#menu").hidden = false;
  $("#back").textContent = "← Games";
}
$("#back").onclick = (e) => {
  if (match) {
    e.preventDefault();
    modal(
      '<h2>Back to Menu?</h2><p>The current game will be discarded.</p><button id="leave-game">Back to Menu</button>',
    );
    $("#leave-game").onclick = menu;
  }
};
$("#result-menu").onclick = menu;
function confirmRestart() {
  modal(
    '<h2>Restart game?</h2><p>The board, clocks and hints will reset.</p><button id="confirm-restart">Restart</button>',
  );
  $("#confirm-restart").onclick = start;
}
$("#restart").onclick = confirmRestart;
function analysis(level, callback) {
  worker?.terminate();
  worker = new Worker(new URL("./bot-worker.mjs", import.meta.url), {
    type: "module",
  });
  const id = ++request,
    fen = match.chess.fen();
  busy = true;
  renderStatus();
  worker.onmessage = ({ data }) => {
    if (id !== request || !match || data.fen !== match.chess.fen()) return;
    worker.terminate();
    worker = null;
    busy = false;
    match.tick();
    if (match.result) {
      render();
      return;
    }
    if (data.move) callback(data.move);
    else {
      $("#status").textContent = "Analysis unavailable. Try again.";
    }
  };
  worker.onerror = () => {
    if (id !== request) return;
    worker?.terminate();
    worker = null;
    busy = false;
    $("#status").textContent = "Analysis unavailable. Restart or retry Hint.";
  };
  worker.postMessage({ id, fen, level });
}
function schedule() {
  if (
    match &&
    !match.result &&
    match.mode === "bot" &&
    match.chess.turn() !== match.side
  )
    analysis(match.difficulty, (m) => play(m));
}
function play(move) {
  if (!match) return;
  const played = match.move(move);
  if (!played) {
    render();
    return;
  }
  selected = null;
  hintMove = null;
  beep();
  animating = true;
  render(played.to);
  animationTimer = setTimeout(() => {
    animating = false;
    schedule();
  }, 170);
}
function select(square) {
  if (!match || busy || animating || match.result || dialog.open) return;
  match.tick();
  if (match.result) {
    render();
    return;
  }
  if (match.mode === "bot" && match.chess.turn() !== match.side) return;
  const moves = selected
    ? match.chess
        .moves({ square: selected, verbose: true })
        .filter((m) => m.to === square)
    : [];
  if (moves.length > 1) {
    modal(
      `<h2>Choose promotion</h2><div class="promotion">${["q", "r", "b", "n"].map((p) => `<button data-promotion="${p}" aria-label="Promote to ${names[p]}"><img src="${asset(match.chess.turn() + p)}" alt="${names[p]}"></button>`).join("")}</div>`,
    );
    dialog.dataset.promotion = "true";
    $("#close-dialog").hidden = true;
    $("#dialog-content").onclick = (e) => {
      const b = e.target.closest("[data-promotion]");
      if (!b) return;
      const from = selected;
      delete dialog.dataset.promotion;
      $("#close-dialog").hidden = false;
      $("#dialog-content").onclick = null;
      close();
      play({ from, to: square, promotion: b.dataset.promotion });
    };
    return;
  }
  if (moves.length === 1) {
    play(moves[0]);
    return;
  }
  selected =
    match.chess.get(square)?.color === match.chess.turn() && selected !== square
      ? square
      : null;
  hintMove = null;
  render();
}
function renderStatus() {
  if (!match) return;
  $("#status").textContent = match.result
    ? match.result.reason
    : busy
      ? match.chess.turn() === match.side
        ? "Finding a hint…"
        : `${colorName(match.chess.turn())} bot is thinking…`
      : `${colorName(match.chess.turn())} to move${match.chess.inCheck() ? " — Check!" : ""}`;
}
function clockText(ms) {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)
    .toString()
    .padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
}
function renderClocks() {
  if (!match) return;
  for (const color of ["w", "b"]) {
    for (const c of document.querySelectorAll(`[data-clock="${color}"]`))
      c.textContent =
        (c.parentElement.id === "desktop-clocks"
          ? colorName(color) + " "
          : "") + clockText(match.clocks[color]);
  }
}
function playerHTML(color) {
  const p = identity(color, match.mode, match.side, match.difficulty);
  return `<img class="avatar" src="${asset(p.bot ? "bot-avatar" : "human-avatar")}" alt="${p.bot ? "Bot" : "Player"} avatar"><h2>${p.label}</h2><div class="side"><img src="${asset(color + "p")}" alt="">${colorName(color)}</div><time class="clock" data-clock="${color}" aria-label="${colorName(color)} remaining time">${clockText(match.clocks[color])}</time>`;
}
function render(moved) {
  if (!match) return;
  const c = match.chess;
  $("#desktop-clocks").innerHTML = [opposite(orientation), orientation]
    .map(
      (color) =>
        `<time class="clock" data-clock="${color}" aria-label="${colorName(color)} remaining time">${colorName(color)} ${clockText(match.clocks[color])}</time>`,
    )
    .join("");
  $("#player-top").innerHTML = playerHTML(opposite(orientation));
  $("#player-bottom").innerHTML = playerHTML(orientation);
  $("#player-top").classList.toggle(
    "active",
    !match.result && c.turn() === opposite(orientation),
  );
  $("#player-bottom").classList.toggle(
    "active",
    !match.result && c.turn() === orientation,
  );
  const legal = selected ? c.moves({ square: selected, verbose: true }) : [];
  const last = c.history({ verbose: true }).at(-1);
  const fragment = document.createDocumentFragment();
  for (const square of squaresFor(orientation)) {
    const piece = c.get(square),
      b = document.createElement("button");
    b.className = "square";
    b.dataset.square = square;
    b.classList.toggle(
      "dark",
      (square.charCodeAt(0) + Number(square[1])) % 2 === 0,
    );
    b.classList.toggle(
      "selected",
      square === selected || square === hintMove?.from,
    );
    b.classList.toggle(
      "legal",
      legal.some((m) => m.to === square) || square === hintMove?.to,
    );
    b.classList.toggle(
      "capture",
      !!piece && legal.some((m) => m.to === square),
    );
    b.classList.toggle(
      "last",
      last && (last.from === square || last.to === square),
    );
    b.classList.toggle(
      "check",
      piece?.type === "k" && piece.color === c.turn() && c.inCheck(),
    );
    b.classList.toggle("moved", square === moved);
    b.setAttribute(
      "aria-label",
      `${square}, ${piece ? colorName(piece.color) + " " + names[piece.type] : "empty"}`,
    );
    b.setAttribute("aria-pressed", String(square === selected));
    b.disabled = !!match.result;
    if (piece) {
      const img = new Image();
      img.src = asset(piece.color + piece.type);
      img.alt = "";
      img.className = "piece";
      img.draggable = false;
      b.append(img);
    }
    b.onclick = () => select(square);
    fragment.append(b);
  }
  $("#board").replaceChildren(fragment);
  $("#hint").innerHTML =
    `<svg class="control-icon" aria-hidden="true"><use href="./assets/icons.svg#hint"></use></svg>Hint (${match.hints})`;
  $("#hint").disabled = !match.hints || !!match.result || busy;
  $("#undo").disabled = !match.snapshots.length || !!match.result;
  $("#draw").disabled = !!match.result;
  $("#resign").disabled = !!match.result;
  const history = c.history();
  $("#history").replaceChildren(
    ...history
      .filter((_, i) => i % 2 === 0)
      .map((m, i) => {
        const li = document.createElement("li");
        li.textContent = `${m} ${history[i * 2 + 1] || ""}`;
        return li;
      }),
  );
  renderStatus();
  $("#result").hidden = !match.result;
  if (match.result) {
    cancel();
    delete dialog.dataset.promotion;
    $("#close-dialog").hidden = false;
    if (dialog.open) close();
    $("#result-title").textContent = resultText(
      match.result,
      match.mode,
      match.side,
    );
    $("#result-reason").textContent = match.result.reason;
    $("#result").style.setProperty(
      "--fallen-king",
      `url("${asset(match.side + "k")}")`,
    );
    $("#result").className = !match.result.winner
      ? "draw-result"
      : match.mode === "bot" && match.result.winner !== match.side
        ? "defeat"
        : `victory winner-${match.result.winner}`;
    saveResult();
  }
}
$("#undo").onclick = () => {
  if (!match || match.result) return;
  cancel();
  match.undo();
  selected = null;
  hintMove = null;
  render();
  schedule();
};
$("#flip").onclick = () => {
  if (!match) return;
  orientation = opposite(orientation);
  render();
};
$("#hint").onclick = () => {
  if (
    !match ||
    match.result ||
    busy ||
    !match.hints ||
    (match.mode === "bot" && match.chess.turn() !== match.side)
  )
    return;
  analysis("hard", (move) => {
    if (
      !match.chess
        .moves({ verbose: true })
        .some((m) => m.from === move.from && m.to === move.to)
    )
      return;
    match.hints--;
    selected = move.from;
    hintMove = move;
    render();
    $("#status").textContent =
      `Hint: ${move.from} to ${move.to}${move.promotion ? " — promote to " + names[move.promotion] : ""}`;
  });
};
$("#resign").onclick = () => {
  modal(
    '<h2>Resign?</h2><p>This concedes the game.</p><button id="confirm-resign">Resign</button>',
  );
  $("#confirm-resign").onclick = () => {
    match.resign(match.mode === "bot" ? match.side : match.chess.turn());
    cancel();
    close();
    render();
  };
};
$("#draw").onclick = () => {
  if (match.mode === "local") {
    modal(
      `<h2>Draw offer</h2><p>${colorName(match.chess.turn())} offers a draw. The other player must agree.</p><button id="accept-draw">Accept Draw</button><button id="decline-draw">Decline</button>`,
    );
    $("#accept-draw").onclick = () => {
      match.agreeDraw();
      cancel();
      close();
      render();
    };
    $("#decline-draw").onclick = close;
  } else {
    const values = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
    const balance = match.chess
      .board()
      .flat()
      .filter(Boolean)
      .reduce(
        (s, p) => s + (p.color === match.side ? 1 : -1) * values[p.type],
        0,
      );
    if (Math.abs(balance) <= 1) {
      match.agreeDraw();
      cancel();
      render();
    } else modal("<h2>Draw declined</h2><p>The bot continues playing.</p>");
  }
};
setInterval(() => {
  if (!match) return;
  const ended = !!match.result;
  match.tick();
  renderClocks();
  if (!ended && match.result) render();
}, 100);
document.addEventListener("visibilitychange", () => {
  if (match) {
    match.tick();
    if (match.result) render();
    else renderClocks();
  }
});
window.addEventListener("pagehide", cancel);
