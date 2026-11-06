import {addTile, canMove, moveBoard, tileMotions} from "./2048-core.mjs";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
const bestElement = document.querySelector("#best");
const statusElement = document.querySelector("#status");
const cells = Array.from({length: 16}, () => {
  const cell = document.createElement("div");
  cell.setAttribute("role", "gridcell");
  boardElement.append(cell);
  return cell;
});
let board = Array(16).fill(0);
let score = 0;
let won = false;
let ended = false;
let best = 0;
let pointerStart;
try { best = Number(localStorage.getItem("walid-ai-2048-best")) || 0; } catch {}

function start() {
  board = Array(16).fill(0);
  score = 0;
  won = ended = false;
  board = addTile(addTile(board));
  statusElement.textContent = "Use the arrow keys or direction buttons to begin.";
  paint();
  boardElement.focus();
}

function paint(newIndex = -1) {
  cells.forEach((cell, index) => {
    const value = board[index];
    cell.textContent = value || "";
    cell.dataset.value = value || "0";
    cell.dataset.new = index === newIndex ? "true" : "false";
    cell.setAttribute("aria-label", value ? String(value) : "Empty");
    cell.style.removeProperty("--dx");
    cell.style.removeProperty("--dy");
    cell.dataset.moved = "false";
    cell.dataset.merging = "false";
    cell.dataset.consumed = "false";
  });
  scoreElement.textContent = `Score ${score}`;
  bestElement.textContent = `Best ${best}`;
}

function move(direction) {
  if (ended) return;
  const result = moveBoard(board, direction);
  if (!result.changed) {
    statusElement.textContent = "No tiles moved.";
    return;
  }
  const rects = cells.map(cell => cell.getBoundingClientRect());
  const motions = tileMotions(board, direction);
  board = addTile(result.board);
  score += result.score;
  if (score > best) {
    best = score;
    try { localStorage.setItem("walid-ai-2048-best", String(best)); } catch {}
  }
  const newIndex = board.findIndex((value, index) => value !== result.board[index]);
  if (!won && board.includes(2048)) {
    won = true;
    statusElement.textContent = "You made 2048! Keep playing or start a new game.";
  } else if (!canMove(board)) {
    ended = true;
    statusElement.textContent = `No moves remain. Final score ${score}. Start a new game to play again.`;
  } else statusElement.textContent = result.score ? `Merged tiles. Gained ${result.score} points.` : "Tiles moved.";
  paint(newIndex);
  for (const motion of motions) {
    const cell = cells[motion.consumed ? motion.source : motion.destination];
    const from = rects[motion.source];
    const to = rects[motion.destination];
    cell.style.setProperty("--dx", `${from.left - to.left}px`);
    cell.style.setProperty("--dy", `${from.top - to.top}px`);
    cell.dataset.moved = "true";
    cell.dataset.merging = String(motion.merged);
    cell.dataset.consumed = String(Boolean(motion.consumed));
  }
}

document.querySelector("#restart").addEventListener("click", start);
document.querySelector("#actions").addEventListener("click", event => {
  const direction = event.target.closest("[data-direction]")?.dataset.direction;
  if (direction) {
    move(direction);
    boardElement.focus();
  }
});
document.addEventListener("keydown", event => {
  const direction = {ArrowUp:"up", ArrowRight:"right", ArrowDown:"down", ArrowLeft:"left"}[event.key];
  if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.target.closest("button, select, input, textarea, [contenteditable]")) return;
  event.preventDefault();
  move(direction);
});

boardElement.addEventListener("pointerdown", event => {
  pointerStart = {x:event.clientX,y:event.clientY};
});
boardElement.addEventListener("pointerup", event => {
  if (!pointerStart) return;
  const dx = event.clientX - pointerStart.x;
  const dy = event.clientY - pointerStart.y;
  pointerStart = undefined;
  if (Math.max(Math.abs(dx),Math.abs(dy)) < 24) return;
  move(Math.abs(dx) > Math.abs(dy) ? dx < 0 ? "left" : "right" : dy < 0 ? "up" : "down");
  boardElement.focus();
});
boardElement.addEventListener("pointercancel", () => { pointerStart = undefined; });

start();
