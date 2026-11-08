import { Chess } from "../vendor/chess.mjs";
export const opposite = (c) => (c === "w" ? "b" : "w");
export const colorName = (c) => (c === "w" ? "White" : "Black");
export function squaresFor(side = "w") {
  const squares = [..."87654321"].flatMap((r) =>
    [..."abcdefgh"].map((f) => f + r),
  );
  return side === "w" ? squares : squares.reverse();
}
export function identity(color, mode, side, difficulty = "medium") {
  return {
    color,
    label:
      mode === "local"
        ? color === side
          ? "Player 1"
          : "Player 2"
        : color === side
          ? "You"
          : `Bot (${difficulty})`,
    bot: mode === "bot" && color !== side,
  };
}
// Material test follows the conservative FIDE possible-mate approach used by python-chess.
export function insufficientFor(chess, color) {
  const all = chess.board().flat().filter(Boolean),
    own = all.filter((p) => p.color === color);
  if (own.some((p) => ["p", "r", "q"].includes(p.type))) return false;
  if (own.some((p) => p.type === "n"))
    return (
      own.length <= 2 &&
      !all.some((p) => p.color !== color && !["k", "q"].includes(p.type))
    );
  if (own.some((p) => p.type === "b")) {
    const bishops = all.filter((p) => p.type === "b");
    const shades = new Set(
      bishops.map((p) => (p.square.charCodeAt(0) + Number(p.square[1])) % 2),
    );
    return shades.size === 1 && !all.some((p) => ["p", "n"].includes(p.type));
  }
  return true;
}
export function resultText(result, mode, side) {
  if (!result.winner) return "Draw";
  return mode === "local"
    ? `${colorName(result.winner)} Win`
    : result.winner === side
      ? "You Win"
      : "You Lose!!";
}
export class Match {
  constructor({
    minutes = 10,
    mode = "bot",
    side = "w",
    difficulty = "medium",
    now = () => Date.now(),
    fen,
  } = {}) {
    Object.assign(this, { minutes, mode, side, difficulty, now });
    this.reset(fen);
  }
  reset(fen) {
    this.chess = new Chess(fen);
    this.clocks = { w: this.minutes * 60000, b: this.minutes * 60000 };
    this.last = this.now();
    this.snapshots = [];
    this.hints = 3;
    this.result = null;
    this.adjudicate();
  }
  tick() {
    const time = this.now(),
      elapsed = Math.max(0, time - this.last);
    this.last = time;
    if (this.result) return;
    const c = this.chess.turn();
    this.clocks[c] = Math.max(0, this.clocks[c] - elapsed);
    if (this.clocks[c] === 0)
      this.result = {
        winner: insufficientFor(this.chess, opposite(c)) ? null : opposite(c),
        reason: insufficientFor(this.chess, opposite(c))
          ? "Timeout — opponent cannot checkmate"
          : "Timeout",
      };
  }
  adjudicate() {
    const c = this.chess;
    if (c.isCheckmate())
      this.result = { winner: opposite(c.turn()), reason: "Checkmate" };
    else if (c.isStalemate())
      this.result = { winner: null, reason: "Stalemate" };
    else if (c.isInsufficientMaterial())
      this.result = { winner: null, reason: "Insufficient material" };
    // Claimable draws are automatically accepted; games therefore end before fivefold/75 moves.
    else if (c.isThreefoldRepetition())
      this.result = {
        winner: null,
        reason: "Threefold repetition (automatic claim)",
      };
    else if (c.isDrawByFiftyMoves())
      this.result = {
        winner: null,
        reason: "Fifty-move rule (automatic claim)",
      };
  }
  move(move) {
    this.tick();
    if (this.result) return null;
    const snapshot = { clocks: { ...this.clocks }, hints: this.hints };
    let played;
    try {
      played = this.chess.move(move);
    } catch {
      return null;
    }
    if (!played) return null;
    this.snapshots.push(snapshot);
    this.adjudicate();
    return played;
  }
  undo() {
    this.tick();
    if (this.result || !this.snapshots.length) return false;
    let count = this.mode === "bot" && this.chess.turn() === this.side ? 2 : 1;
    while (count-- && this.snapshots.length) {
      const s = this.snapshots.pop();
      this.chess.undo();
      this.clocks = { ...s.clocks };
      this.hints = s.hints;
    }
    this.result = null;
    this.last = this.now();
    this.adjudicate();
    return true;
  }
  resign(color = this.chess.turn()) {
    this.tick();
    if (!this.result)
      this.result = { winner: opposite(color), reason: "Resignation" };
  }
  agreeDraw() {
    this.tick();
    if (!this.result)
      this.result = { winner: null, reason: "Draw by agreement" };
  }
}
