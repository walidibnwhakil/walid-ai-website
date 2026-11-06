import {gameShell, control, choose} from "./shell.mjs";

const size = 16;
const moves = {ArrowUp: [0, -1], ArrowRight: [1, 0], ArrowDown: [0, 1], ArrowLeft: [-1, 0]};
let snake, food, direction, next, running, ended;
const game = gameShell({modes: false, reset() {
  snake = [8 + 8 * size, 7 + 8 * size, 6 + 8 * size];
  direction = next = moves.ArrowRight;
  running = ended = false;
  placeFood();
  draw("Ready. Choose a direction or press Start.");
}});
game.board.classList.add("snake");
const cells = Array.from({length:size * size}, () => {
  const cell = document.createElement("span");
  cell.setAttribute("aria-hidden", "true");
  game.board.append(cell);
  return cell;
});
const pause = control("Start", () => {
  if (ended) game.restart();
  running = !running;
  if (running) queue();
  draw(running ? "Playing." : "Paused.");
});
document.querySelector("#actions").append(pause);
for (const [key, vector] of Object.entries(moves)) {
  document.querySelector("#actions").append(control(key.slice(5), () => steer(vector)));
}
document.addEventListener("keydown", event => {
  if (!moves[event.key] || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.target.closest("button, select") && !event.target.closest("#actions")) return;
  event.preventDefault();
  steer(moves[event.key]);
});

function steer(vector) {
  if (ended) return;
  if (direction[0] + vector[0] !== 0 || direction[1] + vector[1] !== 0) next = vector;
  if (!running) pause.click();
}

function placeFood() {
  const occupied = new Set(snake);
  food = choose(cells.flatMap((_, index) => occupied.has(index) ? [] : [index]));
}

function queue() {
  game.later(() => {
    if (!running) return;
    direction = next;
    const x = snake[0] % size + direction[0];
    const y = Math.floor(snake[0] / size) + direction[1];
    const head = y * size + x;
    const eat = head === food;
    if (x < 0 || x >= size || y < 0 || y >= size || snake.slice(0, eat ? snake.length : -1).includes(head)) {
      running = false;
      ended = true;
      draw("Game over.");
      return;
    }
    snake.unshift(head);
    if (eat) placeFood();
    else snake.pop();
    if (food === undefined) {
      running = false;
      ended = true;
      draw("Board filled. You win!");
      return;
    }
    if (eat) draw("Food collected.");
    else paint();
    queue();
  }, 175);
}

function paint() {
  const occupied = new Set(snake);
  cells.forEach((cell, index) => {
    cell.className = index === food ? "food" : occupied.has(index) ? "segment" : "";
  });
}

function draw(message) {
  paint();
  pause.textContent = ended ? "Play again" : running ? "Pause" : "Start";
  pause.setAttribute("aria-label", pause.textContent);
  game.status.textContent = `${message} Score ${snake.length - 3}.`;
}
game.restart();
