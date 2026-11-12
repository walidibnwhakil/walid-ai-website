import { createGame, move } from "./engine.mjs";

// Silent, isolated menu artwork. Never shares the real match or its statistics.
const panel = document.querySelector(".mini-board");
const menu = document.querySelector("#menu");
const motion = matchMedia("(prefers-reduced-motion: reduce)");
const rounds = [
  [0, 3, 1, 4, 2],
  [0, 2, 1, 5, 3, 8],
  [0, 1, 4, 2, 8],
  [2, 0, 4, 1, 6],
];
let round = 0,
  game,
  timer = null;
const cells = Array.from({ length: 9 }, () => {
  const cell = document.createElement("span");
  cell.className = "demo-cell";
  return cell;
});
const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute("viewBox", "0 0 300 300");
svg.classList.add("demo-fire");
svg.setAttribute("aria-hidden", "true");
panel.replaceChildren(...cells, svg);
function quiet() {
  return motion.matches || document.body.classList.contains("low-effects");
}
function render() {
  cells.forEach((cell, i) => {
    const mark = game.cells[i];
    if (cell.dataset.mark !== mark) {
      cell.dataset.mark = mark;
      cell.replaceChildren();
      if (mark) {
        const piece = document.createElement("span");
        piece.className = `mark ${mark.toLowerCase()} demo-piece`;
        piece.textContent = mark;
        cell.append(piece);
      }
    }
    cell.classList.toggle(
      "demo-winning",
      game.lines.some((line) => line.includes(i)),
    );
  });
  const line = game.lines[0];
  if (line) {
    const a = line[0],
      z = line.at(-1),
      xy = (i) => [50 + (i % 3) * 100, 50 + Math.floor(i / 3) * 100];
    const [x1, y1] = xy(a),
      [x2, y2] = xy(z);
    if (!svg.firstChild)
      svg.innerHTML = `<line class="demo-flame" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1"/><line class="demo-core" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" pathLength="1"/>`;
  } else svg.replaceChildren();
  panel.dataset.demoMoves = game.moves;
}
function reset() {
  game = createGame("easy", "friend", "X");
  for (const i of rounds[round].slice(0, 3)) move(game, i);
  render();
}
function pause() {
  clearTimeout(timer);
  timer = null;
}
function sync() {
  pause();
  if (quiet()) {
    for (const i of rounds[round].slice(game.moves)) move(game, i);
    render();
    return;
  }
  if (document.hidden || menu.hidden || !panel.getClientRects().length) return;
  timer = setTimeout(
    () => {
      timer = null;
      if (game.ended) {
        round = (round + 1) % rounds.length;
        reset();
      } else {
        move(game, rounds[round][game.moves]);
        render();
      }
      sync();
    },
    game.ended ? 2300 : 780,
  );
}
reset();
sync();
new MutationObserver(sync).observe(menu, {
  attributes: true,
  attributeFilter: ["hidden"],
});
new MutationObserver(sync).observe(document.body, {
  attributes: true,
  attributeFilter: ["class"],
});
document.addEventListener("visibilitychange", sync);
window.addEventListener("resize", sync);
motion.addEventListener("change", sync);
window.addEventListener("pagehide", pause);
window.addEventListener("pageshow", sync);
