// Symmetric foot-anchor slots within one tile, with a margin around the pile.
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

// Original path tip is (32,77). Its incoming/outgoing tangents are (10,±12).
// The 2.5-unit stroke miter extends 1.25 * hypot(10,12) / 10 below it.
// Include the 2.5-unit outline stroke and its pointed miter in the fit envelope.
export const pinGeometry = { tipX: 32, tipY: 77 + 1.25 * Math.hypot(10, 12) / 10, left: 3.75, right: 60.25, top: 1.75, bottom: 80 };

export function layoutTrackPawns(board) {
  for (const tile of board.querySelectorAll('.track, .lane:not(.final-square)')) {
    const pawns = [...tile.children].filter(p => p.classList.contains('pin-pawn'));
    if (!pawns.length) continue;
    const css = getComputedStyle(tile);
    const width = parseFloat(css.width), height = parseFloat(css.height);
    if (!width || !height) continue;
    const columns = pawns.length <= 3 ? pawns.length : Math.ceil(Math.sqrt(pawns.length));
    const rows = Math.ceil(pawns.length / columns);
    let tips = pawns.map((_, i) => {
      const row = Math.floor(i / columns);
      const inRow = Math.min(columns, pawns.length - row * columns);
      return { x: width * (.5 + (i % columns - (inRow - 1) / 2) * .96 / columns),
        y: height * (.5 + (row - (rows - 1) / 2) * .8 / rows) };
    });
    const g = pinGeometry;
    // Fit above each tip and between columns/rows, with a tile-relative margin.
    let scale = Math.min(...tips.flatMap(t => [
      (t.x - width * .03) / (g.tipX - g.left),
      (width * .97 - t.x) / (g.right - g.tipX),
      (t.y - height * .03) / (g.tipY - g.top),
      (height * .97 - t.y) / (g.bottom - g.tipY),
      width * .9 / columns / (g.right - g.left),
      rows > 1 ? height * .76 / rows / (g.bottom - g.top) : Infinity
    ]));
    if (pawns.length <= 2) {
      // Approved reference: full-size pins with path tips together at tile center.
      // Artwork above the tile is intentional; do not shrink it to a half-tile box.
      const phone = matchMedia("(max-width: 620px)").matches;
      scale = Math.min(width / 64, height / 77) * (phone ? (pawns.length === 2 ? 1.1 : 1.2) : 1);
      tips = pawns.map((_, i) => ({x: width * (pawns.length === 1 ? .5 : i ? .74 : .26), y: height * .5}));
      const tileRect = tile.getBoundingClientRect(), boardRect = board.getBoundingClientRect();
      const unitX = width / tileRect.width, unitY = height / tileRect.height;
      // Only actual board-edge overflow justifies reducing the approved footprint.
      const left = (boardRect.left - tileRect.left) * unitX;
      const right = (boardRect.right - tileRect.left) * unitX;
      const top = (boardRect.top - tileRect.top) * unitY;
      const bottom = (boardRect.bottom - tileRect.top) * unitY;
      scale = Math.min(scale, ...tips.flatMap(t => [
        (t.x - left) / (32 - g.left), (right - t.x) / (g.right - 32),
        (t.y - top) / (77 - g.top), (bottom - t.y) / (g.bottom - 77)
      ]));
      // t.y below refers to the stroke tip used by the shared transform.
      tips = tips.map(t => ({...t, y: t.y + (g.tipY - 77) * scale}));
    }
    pawns.forEach((pawn, i) => {
      const art = pawn.querySelector('svg.pin-pawn-art');
      if (!art) return;
      art.classList.add("tile-anchored");
      const t = tips[i];
      let shape = art.querySelector("g.pin-shape");
      if (!shape) {
        shape = document.createElementNS("http://www.w3.org/2000/svg", "g");
        shape.classList.add("pin-shape");
        shape.append(...art.children);
        art.append(shape);
      }
      art.setAttribute("viewBox", `0 0 ${width} ${height}`);
      art.setAttribute("preserveAspectRatio", "none");
      shape.setAttribute("transform", `translate(${t.x - g.tipX * scale} ${t.y - g.tipY * scale}) scale(${scale})`);
    });
  }
}
