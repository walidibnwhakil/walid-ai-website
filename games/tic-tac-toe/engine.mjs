export const LEVELS = {
  easy: { size: 3, connect: 3 },
  medium: { size: 5, connect: 4 },
  hard: { size: 7, connect: 5 },
};
export const other = (s) => (s === "X" ? "O" : "X");
export function sequences(size, connect) {
  const out = [];
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      for (const [dr, dc] of [
        [0, 1],
        [1, 0],
        [1, 1],
        [1, -1],
      ]) {
        const er = r + dr * (connect - 1),
          ec = c + dc * (connect - 1);
        if (er >= 0 && er < size && ec >= 0 && ec < size)
          out.push(
            Array.from(
              { length: connect },
              (_, k) => (r + dr * k) * size + c + dc * k,
            ),
          );
      }
  return out;
}
export function winningLines(cells, size, connect) {
  return sequences(size, connect).filter(
    (l) => cells[l[0]] && l.every((i) => cells[i] === cells[l[0]]),
  );
}
export function createGame(level = "easy", mode = "bot", symbol = "X") {
  if (!LEVELS[level]) throw Error("Unknown level");
  return {
    level,
    mode,
    symbol,
    ...LEVELS[level],
    cells: Array(LEVELS[level].size ** 2).fill(""),
    turn: "X",
    winner: "",
    ended: false,
    lines: [],
    moves: 0,
  };
}
export function move(g, i) {
  if (
    g.ended ||
    !Number.isInteger(i) ||
    i < 0 ||
    i >= g.cells.length ||
    g.cells[i]
  )
    return false;
  g.cells[i] = g.turn;
  g.moves++;
  g.lines = winningLines(g.cells, g.size, g.connect);
  if (g.lines.length) {
    g.winner = g.turn;
    g.ended = true;
  } else if (g.moves === g.cells.length) {
    g.winner = "draw";
    g.ended = true;
  } else g.turn = other(g.turn);
  return true;
}
export const isBotTurn = (g) =>
  !g.ended && g.mode === "bot" && g.turn !== g.symbol;
export const resultTitle = (g) =>
  g.winner === "draw"
    ? "Draw"
    : g.mode === "bot"
      ? g.winner === g.symbol
        ? "You Win"
        : "You Lose"
      : `${g.winner} Wins`;
export function lineGeometry(indices, rects, origin) {
  return indices.map((i) => ({
    x: rects[i].x + rects[i].width / 2 - origin.x,
    y: rects[i].y + rects[i].height / 2 - origin.y,
  }));
}
