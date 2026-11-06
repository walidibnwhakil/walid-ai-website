import {gameShell, control, choose} from "./shell.mjs";
import {newLudo, rollLudo, moveLudo, legalTokens, trackPosition, safe} from "./ludo-rules.mjs";

const teams = ["Red", "Blue"];
const track = [[6,1],[6,2],[6,3],[6,4],[6,5],[5,6],[4,6],[3,6],[2,6],[1,6],[0,6],[0,7],[0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[6,9],[6,10],[6,11],[6,12],[6,13],[6,14],[7,14],[8,14],[8,13],[8,12],[8,11],[8,10],[8,9],[9,8],[10,8],[11,8],[12,8],[13,8],[14,8],[14,7],[14,6],[13,6],[12,6],[11,6],[10,6],[9,6],[8,5],[8,4],[8,3],[8,2],[8,1],[8,0],[7,0],[6,0]];
let state, message;
const game = gameShell({reset() {
  state = newLudo();
  message = "";
  render();
}});
game.board.classList.add("ludo");
const squares = new Map();
track.forEach(([row, column], index) => addSquare(row, column, safe.has(index) ? "safe" : "track"));
for (let team = 0; team < 2; team++) {
  for (let step = 0; step < 6; step++) addSquare(7, team ? 13 - step : 1 + step, "lane " + teams[team].toLowerCase());
  for (let token = 0; token < 4; token++) addSquare(team ? 11 + (token >> 1) : 2 + (token >> 1), team ? 11 + token % 2 : 2 + token % 2, "yard " + teams[team].toLowerCase());
}
function addSquare(row, column, kind) {
  const tile = document.createElement("div");
  tile.className = kind;
  tile.style.gridArea = `${row + 1} / ${column + 1}`;
  game.board.append(tile);
  squares.set(`${row},${column}`, tile);
}

function throwDie() {
  const die = 1 + Math.floor(Math.random() * 6);
  const team = teams[state.turn];
  state = rollLudo(state, die);
  message = `${team} rolled ${die}.${state.roll ? "" : " No legal move."} `;
  render();
}
const roll = control("Roll die", throwDie);
document.querySelector("#actions").append(roll);
const tokenControls = teams.map((team, player) => Array.from({length: 4}, (_, index) => {
  const button = control(`${team} ${index + 1}`, () => play(index));
  document.querySelector("#actions").append(button);
  return button;
}));

function play(index) {
  state = moveLudo(state, index);
  message = "";
  render();
}

function render() {
  const botTurn = game.bot && state.turn === 1 && state.winner === null;
  const legal = legalTokens(state);
  roll.disabled = botTurn || state.roll > 0 || state.winner !== null;
  for (const tile of squares.values()) tile.replaceChildren();
  state.pieces.forEach((team, player) => team.forEach((step, index) => {
    const label = `${teams[player]} token ${index + 1}`;
    const button = tokenControls[player][index];
    button.hidden = player !== state.turn;
    button.disabled = botTurn || !legal.includes(index);
    button.setAttribute("aria-label", `${label}, ${step === -1 ? "in yard" : step === 57 ? "home" : "step " + (step + 1)}`);
    const tile = step === -1
      ? [player ? 11 + (index >> 1) : 2 + (index >> 1), player ? 11 + index % 2 : 2 + index % 2]
      : step >= 52 ? [7, player ? 65 - step : step - 51] : track[trackPosition(player, step)];
    const marker = document.createElement("span");
    marker.className = teams[player].toLowerCase();
    marker.textContent = index + 1;
    squares.get(tile.join(",")).append(marker);
  }));
  game.status.textContent = message + (state.winner !== null ? `${teams[state.winner]} wins!`
    : botTurn ? "Blue bot is playing…" : `${teams[state.turn]}: ${state.roll ? "choose a token." : "roll the die."}`);
  if (botTurn) game.later(() => state.roll ? play(choose(legal)) : throwDie());
}
game.restart();
