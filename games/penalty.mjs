import {gameShell, control, choose} from "./shell.mjs";

const zones = ["Left", "Center", "Right"];
let phase, shots, goals, shot, result;
const game = gameShell({reset() {
  phase = "shoot";
  shots = [0, 0];
  goals = [0, 0];
  shot = null;
  result = "";
  render();
}});
game.board.classList.add("pitch");
game.board.innerHTML = '<div class="goal" aria-hidden="true"></div><div class="keeper" aria-hidden="true">◆</div><div class="ball" aria-hidden="true">⚽</div>';
const ball = game.board.querySelector(".ball");
const keeper = game.board.querySelector(".keeper");
const choices = zones.map((zone, index) => control(zone, () => pick(index)));
document.querySelector("#actions").append(...choices);

function pick(zone) {
  const player = (shots[0] + shots[1]) % 2;
  if (phase === "shoot") {
    shot = zone;
    if (!game.bot) {
      phase = "save";
      render();
      return;
    }
    resolve(player, choose([0, 1, 2]));
    return;
  }
  resolve(player, zone);
}

function resolve(player, save) {
  const scored = shot !== save;
  shots[player]++;
  goals[player] += Number(scored);
  result = scored ? "Goal!" : "Saved!";
  ball.style.setProperty("--lane", shot - 1);
  keeper.style.setProperty("--lane", save - 1);
  phase = "replay";
  render();
  game.later(() => {
    const complete = shots[0] >= 5 && shots[0] === shots[1] && goals[0] !== goals[1];
    phase = complete ? "end" : "shoot";
    if (game.bot && !complete && shots[0] > shots[1]) {
      phase = "save";
      shot = choose([0, 1, 2]);
    }
    render();
  });
}

function render() {
  game.board.dataset.phase = phase;
  choices.forEach(button => {button.disabled = phase === "replay" || phase === "end";});
  const shooter = (shots[0] + shots[1]) % 2;
  const names = game.bot ? ["You", "Bot"] : ["Player 1", "Player 2"];
  const score = `${names[0]} ${goals[0]}–${goals[1]} ${names[1]}. `;
  const prompt = phase === "shoot" ? `${names[shooter]}, choose where to shoot.`
    : phase === "save" ? `${names[1 - shooter]}, choose where to dive.`
    : phase === "end" ? `${names[goals[0] > goals[1] ? 0 : 1]} wins!` : "";
  game.status.textContent = score + (result ? result + " " : "") + prompt;
}
game.restart();
