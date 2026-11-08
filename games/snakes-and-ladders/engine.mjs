export const SNAKES = Object.freeze({
  17: 7,
  39: 18,
  54: 34,
  62: 36,
  87: 24,
  99: 78,
});
export const LADDERS = Object.freeze({ 3: 22, 6: 15, 28: 52, 47: 68, 72: 91 });
export const COLORS = ["Red", "Blue", "Yellow", "Green"];
export const HEX = ["#f14b58", "#43aeff", "#ffd04b", "#4fda91"];
export function center(n) {
  if (n < 1 || n > 100) throw Error("Invalid square");
  const r = Math.floor((n - 1) / 10),
    c = (n - 1) % 10;
  return { x: (r % 2 ? 9 - c : c) * 10 + 5, y: 95 - r * 10 };
}
export const squares = Array.from({ length: 100 }, (_, i) => ({
  n: i + 1,
  ...center(i + 1),
}));
export function die(source = globalThis.crypto) {
  if (source?.getRandomValues) {
    const a = new Uint32Array(1);
    do {
      source.getRandomValues(a);
    } while (a[0] >= 4294967292);
    return (a[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}
export function createGame(
  count = 2,
  bot = false,
  colors = COLORS.slice(0, count),
) {
  if (
    !Number.isInteger(count) ||
    count < 2 ||
    count > 4 ||
    (bot && count !== 2) ||
    colors.length !== count ||
    colors.some((c) => !COLORS.includes(c)) ||
    new Set(colors).size !== count
  )
    throw Error("Invalid players");
  return {
    bot,
    players: colors.map((color, i) => ({
      color,
      name: bot && i === 1 ? "Serpent Bot" : `Player ${i + 1}`,
      position: 0,
    })),
    current: 0,
    sixes: 0,
    order: [],
    phase: "ready",
    dice: null,
    rolls: 0,
  };
}
export function roll(state, value) {
  if (state.phase !== "ready") throw Error("Turn locked");
  if (!Number.isInteger(value) || value < 1 || value > 6)
    throw Error("Invalid die");
  const s = structuredClone(state),
    p = s.players[s.current];
  s.phase = "moving";
  s.dice = value;
  s.rolls++;
  s.sixes = value === 6 ? s.sixes + 1 : 0;
  const from = p.position;
  let landing = from;
  const penalty = s.sixes === 3;
  if (!penalty && from + value <= 100) landing = from + value;
  const target = SNAKES[landing] ?? LADDERS[landing] ?? landing;
  p.position = target;
  return {
    state: s,
    from,
    landing,
    target,
    penalty,
    kind: SNAKES[landing] ? "snake" : LADDERS[landing] ? "ladder" : "move",
  };
}
export function settle(result) {
  const s = structuredClone(result.state),
    i = s.current;
  let finisher = null;
  if (s.players[i].position === 100) {
    s.order.push(i);
    finisher = i;
  }
  if (s.order.length >= s.players.length - 1) {
    s.order.push(
      ...s.players.map((_, j) => j).filter((j) => !s.order.includes(j)),
    );
    s.phase = "over";
  } else {
    if (finisher !== null || s.dice !== 6 || result.penalty) {
      do {
        s.current = (s.current + 1) % s.players.length;
      } while (s.order.includes(s.current));
      s.sixes = 0;
    }
    s.phase = "ready";
  }
  return { state: s, finisher };
}
export function placement(rank, count) {
  return rank === 0
    ? "WINNER"
    : count === 2
      ? "RUNNER-UP"
      : rank === 1
        ? "1ST RUNNER-UP"
        : rank === 2
          ? "2ND RUNNER-UP"
          : "4TH PLACE";
}
