// Symmetric positions within one tile. Keep a small margin around every pile.
export function pawnSlots(count) {
  if (!Number.isInteger(count) || count < 1 || count > 16) {
    throw new RangeError("A Ludo tile supports 1 to 16 pawns");
  }
  const columns = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / columns);
  const width = 96 / columns;
  const height = 96 / rows;
  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns);
    const inRow = Math.min(columns, count - row * columns);
    return {
      x: ((index % columns) - (inRow - 1) / 2) * width,
      y: (row - (rows - 1) / 2) * height,
      width,
      height,
    };
  });
}
