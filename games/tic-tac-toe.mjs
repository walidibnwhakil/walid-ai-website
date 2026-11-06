import {gameShell, control, choose} from "./shell.mjs";

const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
let cells, turn, winner;
const game = gameShell({reset() {
  cells = Array(9).fill("");
  turn = "X";
  winner = "";
  render();
}});
game.board.classList.add("ttt");
const buttons = Array.from({length:9}, (_, index) => {
  const button = control("", () => {
    if (!game.bot || turn === "X") play(index);
  });
  button.className = "square";
  game.board.append(button);
  return button;
});
const won = (board, mark) => lines.some(line => line.every(index => board[index] === mark));

function play(index) {
  if (winner || cells[index]) return;
  cells[index] = turn;
  if (won(cells, turn)) winner = turn;
  turn = turn === "X" ? "O" : "X";
  render();
}

function render() {
  const empty = cells.flatMap((cell, index) => cell ? [] : [index]);
  const botTurn = !winner && empty.length && game.bot && turn === "O";
  buttons.forEach((button, index) => {
    button.textContent = cells[index];
    button.disabled = Boolean(winner || cells[index] || botTurn);
    button.setAttribute("aria-label", `Row ${1 + Math.floor(index / 3)}, column ${1 + index % 3}, ${cells[index] || "empty"}`);
  });
  game.status.textContent = winner ? `${winner} wins!` : !empty.length ? "Draw."
    : botTurn ? "Bot is thinking…" : `${turn} to move.`;
  if (botTurn) game.later(() => {
    const best = mark => empty.find(index => won(cells.map((cell, i) => i === index ? mark : cell), mark));
    play(best("O") ?? best("X") ?? (empty.includes(4) ? 4 : choose(empty)));
  });
}
game.restart();
