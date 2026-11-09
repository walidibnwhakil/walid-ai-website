export const SNAKES = Object.freeze({
  27: 5,
  40: 3,
  43: 18,
  54: 31,
  66: 45,
  89: 53,
  95: 77,
  99: 41,
});
export const LADDERS = Object.freeze({
  4: 25,
  13: 46,
  42: 63,
  50: 69,
  62: 81,
  74: 92,
});
export const COLORS = [
  "Red",
  "Blue",
  "Yellow",
  "Green",
  "Brown",
  "Purple",
  "Orange",
  "Pink",
  "Teal",
];
export const HEX = [
  "#f14b58",
  "#43aeff",
  "#ffd04b",
  "#4fda91",
  "#685348",
  "#a35de8",
  "#fa8237",
  "#ed6aaf",
  "#20b5b4",
];
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
      lastDice: null,
    })),
    current: 0,
    sixes: 0,
    order: [],
    phase: "ready",
    dice: null,
    rolls: 0,
    colorsLocked: false,
  };
}
export function roll(state, value) {
  if (state.phase !== "ready") throw Error("Turn locked");
  if (!Number.isInteger(value) || value < 1 || value > 6)
    throw Error("Invalid die");
  const s = structuredClone(state),
    p = s.players[s.current];
  s.phase = "moving";
  s.colorsLocked = true;
  s.dice = value;
  s.rolls++;
  p.lastDice = value;
  s.sixes = value === 6 && p.position > 0 ? s.sixes + 1 : 0;
  const from = p.position;
  let landing = from;
  const penalty = s.sixes === 3;
  const waitingForOne = from === 0 && value !== 1;
  const activated = from === 0 && value === 1;
  if (!penalty && !waitingForOne && from + value <= 100) landing = from + value;
  const overshoot = !penalty && !waitingForOne && from + value > 100;
  const advanced = landing !== from;
  const target = advanced
    ? (SNAKES[landing] ?? LADDERS[landing] ?? landing)
    : landing;
  p.position = target;
  return {
    state: s,
    from,
    landing,
    target,
    penalty,
    waitingForOne,
    activated,
    overshoot,
    kind:
      advanced && SNAKES[landing]
        ? "snake"
        : advanced && LADDERS[landing]
          ? "ladder"
          : "move",
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
    if (
      finisher !== null ||
      s.dice !== 6 ||
      result.penalty ||
      result.overshoot ||
      result.from === 0
    ) {
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
    : rank === count - 1
      ? "LOSER"
      : rank === 1
        ? "1ST RUNNER-UP"
        : "2ND RUNNER-UP";
}
// Colors may be swapped until the first die is clicked; the UI locks before animation.
export function chooseColor(state, index, color) {
  if (state.colorsLocked || state.rolls > 0 || state.phase !== "ready")
    throw Error("Colors locked");
  if (
    !Number.isInteger(index) ||
    !state.players[index] ||
    !COLORS.includes(color)
  )
    throw Error("Invalid color choice");
  const s = structuredClone(state),
    old = s.players[index].color,
    other = s.players.findIndex((p, j) => j !== index && p.color === color);
  if (other >= 0) s.players[other].color = old;
  s.players[index].color = color;
  return s;
}
