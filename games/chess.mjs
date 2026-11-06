import {Chess} from "./vendor/chess.mjs";
import {gameShell, control, choose} from "./shell.mjs";

const chess = new Chess();
const names = {p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king"};
const symbols = {w:"♙♘♗♖♕♔", b:"♟♞♝♜♛♚"};
const side = color => color === "w" ? "White" : "Black";
let selected;
const promotion = document.querySelector("#actions");
promotion.setAttribute("aria-label", "Promotion piece");
const game = gameShell({reset() {
  chess.reset();
  selected = null;
  promotion.replaceChildren();
  render();
}});
game.board.classList.add("chess");
const squares = [..."87654321"].flatMap((rank, row) =>
  [..."abcdefgh"].map((file, column) => {
    const position = file + rank;
    const button = control("", () => select(position));
    button.className = "square";
    button.dataset.dark = (row + column) % 2 === 1;
    game.board.append(button);
    return [position, button];
  }));

function select(position) {
  if (promotion.childElementCount || chess.isGameOver() || game.bot && chess.turn() === "b") return;
  const moves = selected ? chess.moves({square: selected, verbose: true}).filter(move => move.to === position) : [];
  if (moves.length > 1) {
    for (const move of moves) promotion.append(control(names[move.promotion], () => play(move)));
    promotion.firstElementChild.focus();
    game.status.textContent = "Choose a promotion piece.";
    return;
  }
  if (moves.length === 1) {
    play(moves[0]);
    return;
  }
  selected = chess.get(position)?.color === chess.turn() && selected !== position ? position : null;
  render();
}

function play(move) {
  const focus = promotion.contains(document.activeElement);
  chess.move(move);
  selected = null;
  promotion.replaceChildren();
  render();
  if (focus) squares.find(([position]) => position === move.to)[1].focus();
}

function render() {
  const turn = chess.turn();
  const botTurn = game.bot && turn === "b" && !chess.isGameOver();
  const legal = selected ? new Set(chess.moves({square: selected, verbose: true}).map(move => move.to)) : new Set();
  for (const [position, button] of squares) {
    const piece = chess.get(position);
    button.textContent = piece ? symbols[piece.color][Object.keys(names).indexOf(piece.type)] : "";
    button.dataset.selected = position === selected;
    button.dataset.legal = legal.has(position);
    button.setAttribute("aria-pressed", String(position === selected));
    button.setAttribute("aria-label", `${position}, ${piece ? side(piece.color) + " " + names[piece.type] : "empty"}${legal.has(position) ? ", legal move" : ""}`);
  }
  game.status.textContent = chess.isCheckmate() ? `Checkmate. ${side(turn === "w" ? "b" : "w")} wins!`
    : chess.isStalemate() ? "Draw by stalemate."
    : chess.isDraw() ? "Draw."
    : botTurn ? "Black bot is thinking…" : `${side(turn)} to move.${chess.inCheck() ? " Check." : ""}`;
  if (botTurn) game.later(() => {
    const moves = chess.moves({verbose:true});
    const captures = moves.filter(move => move.captured || move.promotion);
    play(choose(captures.length ? captures : moves));
  });
}
game.restart();
