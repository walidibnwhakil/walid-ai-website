export function mergeLine(line) {
  const values = line.filter(Boolean);
  const merged = [];
  let score = 0;
  for (let index = 0; index < values.length; index++) {
    if (values[index] === values[index + 1]) {
      const value = values[index] * 2;
      merged.push(value);
      score += value;
      index++;
    } else merged.push(values[index]);
  }
  while (merged.length < line.length) merged.push(0);
  return {line: merged, score};
}

export function moveBoard(board, direction) {
  if (!Array.isArray(board) || board.length !== 16) throw new TypeError("Board must have 16 cells");
  if (!["left", "right", "up", "down"].includes(direction)) throw new TypeError("Unknown direction");
  const next = Array(16).fill(0);
  let score = 0;
  for (let lineIndex = 0; lineIndex < 4; lineIndex++) {
    const indices = Array.from({length: 4}, (_, offset) => {
      if (direction === "left") return lineIndex * 4 + offset;
      if (direction === "right") return lineIndex * 4 + (3 - offset);
      if (direction === "up") return offset * 4 + lineIndex;
      return (3 - offset) * 4 + lineIndex;
    });
    const {line, score: gained} = mergeLine(indices.map(index => board[index]));
    score += gained;
    indices.forEach((index, offset) => { next[index] = line[offset]; });
  }
  return {board: next, score, changed: next.some((value, index) => value !== board[index])};
}

export function canMove(board) {
  if (board.some(value => value === 0)) return true;
  for (let row = 0; row < 4; row++) for (let column = 0; column < 4; column++) {
    const index = row * 4 + column;
    if (column < 3 && board[index] === board[index + 1]) return true;
    if (row < 3 && board[index] === board[index + 4]) return true;
  }
  return false;
}

export function addTile(board, random = Math.random) {
  const empty = board.flatMap((value, index) => value === 0 ? [index] : []);
  if (!empty.length) return board.slice();
  const index = empty[Math.min(empty.length - 1, Math.floor(random() * empty.length))];
  const next = board.slice();
  next[index] = random() < .9 ? 2 : 4;
  return next;
}
