import {addTile, canMove, moveBoard} from "./2048-core.mjs";

const boardElement = document.querySelector("#board");
const scoreElement = document.querySelector("#score");
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
  });
  scoreElement.textContent = `Score ${score}`;
}

function move(direction) {
  if (ended) return;
  const result = moveBoard(board, direction);
  if (!result.changed) {
    statusElement.textContent = "No tiles moved.";
    return;
  }
  board = addTile(result.board);
  score += result.score;
  const newIndex = board.findIndex((value, index) => value !== result.board[index]);
  if (!won && board.includes(2048)) {
    won = true;
    statusElement.textContent = "You made 2048! Keep playing or start a new game.";
  } else if (!canMove(board)) {
    ended = true;
    statusElement.textContent = `No moves remain. Final score ${score}. Start a new game to play again.`;
  } else statusElement.textContent = result.score ? `Merged tiles. Gained ${result.score} points.` : "Tiles moved.";
  paint(newIndex);
}

document.querySelector("#restart").addEventListener("click", start);
document.querySelector("#actions").addEventListener("click", event => {
  const direction = event.target.closest("[data-direction]")?.dataset.direction;
  if (direction) move(direction);
});
document.addEventListener("keydown", event => {
  const direction = {ArrowUp:"up", ArrowRight:"right", ArrowDown:"down", ArrowLeft:"left"}[event.key];
  if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
  if (event.target.closest("button, select, input, textarea, [contenteditable]")) return;
  event.preventDefault();
  move(direction);
});

start();
