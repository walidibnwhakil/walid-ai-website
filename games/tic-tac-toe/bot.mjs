import { sequences, other, isBotTurn } from "./engine.mjs";
export function chooseMove(g, budget = 650) {
  if (g.ended || !g.cells.includes("")) return null;
  const b = g.cells.slice(),
    n = g.size,
    k = g.connect,
    me = g.turn,
    them = other(me),
    lines = sequences(n, k),
    start = performance.now(),
    cache = new Map();
  let nodes = 0;
  const empty = () => b.flatMap((v, i) => (v ? [] : [i]));
  const wins = (s) => lines.some((l) => l.every((i) => b[i] === s));
  const threats = (s) => [
    ...new Set(
      lines.flatMap((l) => {
        let e = -1,
          count = 0;
        for (const i of l) {
          if (b[i] === s) count++;
          else if (!b[i]) e = i;
          else return [];
        }
        return count === k - 1 && e >= 0 ? [e] : [];
      }),
    ),
  ];
  const center = (i) =>
    n -
    Math.abs(Math.floor(i / n) - (n - 1) / 2) -
    Math.abs((i % n) - (n - 1) / 2);
  function evaluate(s) {
    let value = 0;
    for (const l of lines) {
      let a = 0,
        z = 0;
      for (const i of l) {
        if (b[i] === s) a++;
        else if (b[i]) z++;
      }
      if (!z) value += Math.pow(9, a);
      if (!a) value -= Math.pow(9, z) * 1.12;
    }
    return value;
  }
  function ordered(s, limit = 14) {
    const enemy = other(s),
      own = threats(s),
      blocks = threats(enemy);
    if (own.length) return own;
    if (blocks.length) return blocks;
    const es = empty();
    const scores = es.map((i) => {
      b[i] = s;
      const forks = threats(s).length;
      b[i] = enemy;
      const defense = threats(enemy).length;
      b[i] = s;
      const score = evaluate(s) + forks * 200000 + defense * 100000 + center(i);
      b[i] = "";
      return [i, score];
    });
    return scores
      .sort((a, z) => z[1] - a[1] || a[0] - z[0])
      .slice(0, n === 3 ? 99 : limit)
      .map((x) => x[0]);
  }
  const immediate = threats(me);
  if (immediate.length) return immediate[0];
  const block = threats(them);
  if (block.length === 1) return block[0];
  if (!g.moves) return Math.floor((n * n) / 2);
  function search(s, depth, alpha, beta, ply) {
    if ((++nodes & 127) === 0 && performance.now() - start > budget)
      throw Error("timeout");
    if (wins(other(s))) return -1e8 + ply;
    if (!b.includes("")) return 0;
    if (!depth) return evaluate(s);
    const key = b.join(".") + s + depth;
    const saved = cache.get(key);
    if (saved !== undefined) return saved;
    const initialAlpha = alpha;
    let best = -Infinity,
      cut = false;
    for (const i of ordered(s, depth > 2 ? 10 : 14)) {
      b[i] = s;
      let score;
      try {
        score = -search(other(s), depth - 1, -beta, -alpha, ply + 1);
      } finally {
        b[i] = "";
      }
      best = Math.max(best, score);
      alpha = Math.max(alpha, score);
      if (alpha >= beta) {
        cut = true;
        break;
      }
    }
    if (!cut && best > initialAlpha) cache.set(key, best);
    return best;
  }
  let candidates = ordered(me, 18),
    best = candidates[0];
  const max = n === 3 ? empty().length : n === 5 ? 7 : 6;
  for (let depth = 1; depth <= max; depth++) {
    let candidate = best,
      value = -Infinity;
    try {
      for (const i of candidates) {
        b[i] = me;
        let v;
        try {
          v = -search(them, depth - 1, -Infinity, Infinity, 1);
        } finally {
          b[i] = "";
        }
        if (v > value) {
          value = v;
          candidate = i;
        }
      }
      best = candidate;
      candidates = [best, ...candidates.filter((i) => i !== best)];
    } catch {
      break;
    }
    if (n !== 3 && performance.now() - start > budget * 0.8) break;
  }
  return best;
}
