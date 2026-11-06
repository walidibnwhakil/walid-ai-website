import {Chess} from "./vendor/chess.mjs";
import {gameShell, control, choose} from "./shell.mjs";

const chess = new Chess();
const names = {p:"pawn", n:"knight", b:"bishop", r:"rook", q:"queen", k:"king"};
const side = color => color === "w" ? "White" : "Black";
const moveHistory = document.querySelector("#move-history");
const capturedWhite = document.querySelector("#captured-white");
const capturedBlack = document.querySelector("#captured-black");
let selected;
let lastMove;
const promotion = document.querySelector("#actions");
promotion.setAttribute("aria-label", "Promotion piece");
const game = gameShell({reset() {
  chess.reset();
  selected = null;
  lastMove = null;
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
  lastMove = {from:move.from,to:move.to};
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
    button.replaceChildren();
    if (piece) {
      const icon = document.createElementNS("http://www.w3.org/2000/svg","svg");
      icon.setAttribute("viewBox","0 0 100 120");
      icon.classList.add("chess-piece",piece.color==="w"?"white":"black");
      icon.setAttribute("aria-hidden","true");
      const use = document.createElementNS("http://www.w3.org/2000/svg","use");
      use.setAttribute("href",`#piece-${piece.type}`);
      icon.append(use);
      button.append(icon);
    }
    button.dataset.selected = position === selected;
    button.dataset.legal = legal.has(position);
    button.dataset.hasPiece = String(Boolean(piece));
    button.dataset.lastMove = String(Boolean(lastMove && (position === lastMove.from || position === lastMove.to)));
    button.setAttribute("aria-pressed", String(position === selected));
    button.setAttribute("aria-label", `${position}, ${piece ? side(piece.color) + " " + names[piece.type] : "empty"}${legal.has(position) ? ", legal move" : ""}`);
  }
  const moves = chess.history({verbose:true});
  moveHistory.replaceChildren();
  for (let index=0;index<moves.length;index+=2) {
    const row=document.createElement("li");
    const number=document.createElement("span");
    number.textContent=`${Math.floor(index/2)+1}.`;
    const white=document.createElement("span");
    white.textContent=moves[index].san;
    const black=document.createElement("span");
    black.textContent=moves[index+1]?.san||"";
    row.append(number,white,black);
    moveHistory.append(row);
  }
  moveHistory.scrollTop=moveHistory.scrollHeight;
  const whiteTaken=moves.filter(move=>move.color==="w"&&move.captured).map(move=>move.captured);
  const blackTaken=moves.filter(move=>move.color==="b"&&move.captured).map(move=>move.captured);
  renderCaptured(capturedWhite,whiteTaken,"White captured");
  renderCaptured(capturedBlack,blackTaken,"Black captured");
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

function renderCaptured(container,pieces,label) {
  container.replaceChildren(`${label}: `);
  if (!pieces.length) { container.append("none"); return; }
  pieces.forEach(type=>{
    const icon=document.createElementNS("http://www.w3.org/2000/svg","svg");
    icon.setAttribute("viewBox","0 0 100 120");
    icon.classList.add("captured-piece",container===capturedWhite?"black":"white");
    icon.setAttribute("aria-label",`${names[type]} captured`);
    const use=document.createElementNS("http://www.w3.org/2000/svg","use");
    use.setAttribute("href",`#piece-${type}`);
    icon.append(use);
    container.append(icon);
  });
}
game.restart();
