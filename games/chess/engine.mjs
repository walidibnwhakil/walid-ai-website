import { Chess } from "../vendor/chess.mjs";
export const ENGINE_VERSION = "Walid local search 1.0.0";
const value = { p: 100, n: 320, b: 335, r: 500, q: 900, k: 0 };
function evaluate(c) {
  let score = 0;
  for (const p of c.board().flat())
    if (p) {
      const file = p.square.charCodeAt(0) - 97,
        rank = +p.square[1] - 1;
      const center = 7 - Math.abs(3.5 - file) - Math.abs(3.5 - rank);
      const advance = p.color === "w" ? rank : 7 - rank;
      const bonus =
        p.type === "p"
          ? advance * 8
          : p.type === "k"
            ? -center * 5
            : center * 7;
      score += (p.color === "w" ? 1 : -1) * (value[p.type] + bonus);
    }
  return score * (c.turn() === "w" ? 1 : -1);
}
const order = (m) =>
  (m.captured ? 10 * value[m.captured] - value[m.piece] : 0) +
  (m.promotion ? value[m.promotion] : 0) +
  (m.san.includes("+") ? 30 : 0);
export function bestMove(
  fen,
  level = "medium",
  { budget, random = Math.random } = {},
) {
  const c = new Chess(fen);
  if (c.isGameOver()) return null;
  const legal = c.moves({ verbose: true });
  if (level === "easy") {
    const ranked = legal
      .map((m) => {
        c.move(m);
        const score = -evaluate(c) + random() * 180;
        c.undo();
        return { m, score };
      })
      .sort((a, b) => b.score - a.score);
    const m = ranked[Math.floor(random() * Math.min(4, ranked.length))].m;
    return { from: m.from, to: m.to, promotion: m.promotion };
  }
  const deadline = Date.now() + (budget ?? (level === "hard" ? 1100 : 350));
  let nodes = 0,
    aborted = false;
  function search(depth, alpha, beta, ply) {
    if ((++nodes & 63) === 0 && Date.now() > deadline) {
      aborted = true;
      return 0;
    }
    if (c.isCheckmate()) return -100000 + ply;
    if (c.isDraw()) return 0;
    if (depth === 0) return evaluate(c);
    let score = -Infinity;
    for (const m of c
      .moves({ verbose: true })
      .sort((a, b) => order(b) - order(a))) {
      c.move(m);
      const s = -search(depth - 1, -beta, -alpha, ply + 1);
      c.undo();
      if (aborted) return 0;
      score = Math.max(score, s);
      alpha = Math.max(alpha, s);
      if (alpha >= beta) break;
    }
    return score;
  }
  let best = legal[0];
  for (let d = 1; d <= (level === "hard" ? 4 : 2); d++) {
    let iteration = best,
      score = -Infinity;
    for (const m of legal.sort((a, b) => order(b) - order(a))) {
      c.move(m);
      const s = -search(d - 1, -Infinity, -score, 1);
      c.undo();
      if (aborted) break;
      if (s > score) {
        score = s;
        iteration = m;
      }
    }
    if (aborted) break;
    best = iteration;
  }
  return { from: best.from, to: best.to, promotion: best.promotion };
}
