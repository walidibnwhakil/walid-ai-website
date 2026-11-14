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

// One viewport per assigned cell. Only this inner group scales the original paths.
function paintPawn(pawn, width, height, scale, tip) {
  const art = pawn.querySelector('svg.pin-pawn-art');
  if (!art) return;
  art.classList.add("tile-anchored");
  let shape = art.querySelector("g.pin-shape");
  if (!shape) {
    shape = document.createElementNS("http://www.w3.org/2000/svg", "g");
    shape.classList.add("pin-shape");
    shape.append(...art.children);
    art.append(shape);
  }
  art.setAttribute("viewBox", `0 0 ${width} ${height}`);
  art.setAttribute("preserveAspectRatio", "none");
  shape.setAttribute("transform", `translate(${tip.x - pinGeometry.tipX * scale} ${tip.y - pinGeometry.tipY * scale}) scale(${scale})`);
}

function cellSize(tile) {
  const css = getComputedStyle(tile);
  return css.display === "none" ? {width: 0, height: 0} : {width: parseFloat(css.width), height: parseFloat(css.height)};
}

export function layoutBoardPawns(board) {
  const g = pinGeometry;
  const routeCells = [...board.querySelectorAll('.track, .lane')]
    .map(tile => ({tile, ...cellSize(tile)})).filter(({width, height}) => width > 0 && height > 0);
  // Restore the approved full-tile footprint. Fitting the whole artwork into
  // the half-cell above a centered tip made real mobile pawns ~9px tall.
  // Overhang is intentional; pawn-layers.css keeps heads above neighboring tiles.
  // One shared scale across all route cells prevents position-dependent sizing.
  const phoneLayout = matchMedia("(max-width: 620px), (max-width: 899px) and (pointer: coarse)").matches;
  const desktopSingleScale = Math.min(...routeCells.map(({width, height}) =>
    Math.min(width / 64, height / 77)
  ));
  // On a phone, use the actual narrowest tile's painted width as the readability
  // budget. Only singles use it; paired and home-slot geometry remain untouched.
  // DPR is intentionally absent: these dimensions are CSS pixels, not pixels
  // in a high-density screenshot. Keep the original artwork proportions.
  const singleScale = phoneLayout
    ? Math.min(...routeCells.map(({width}) => width * .9 / (g.right - g.left)))
    : desktopSingleScale;
  for (const {tile, width, height} of routeCells) {
    const pawns = [...tile.children].filter(p => p.classList.contains('pin-pawn'));
    if (!pawns.length) continue;
    pawns.forEach(pawn => pawn.classList.toggle("single-tile-pawn", pawns.length === 1));
    let tips, scale;
    if (pawns.length === 1) {
      // The visible pointed tip identifies the tile; the head may overhang it.
      tips = [{x: width / 2, y: height / 2}];
      scale = singleScale;
    } else if (pawns.length === 2 && !tile.classList.contains('final-square')) {
      // Preserve before-mobile.png exactly: paired path tips at 26%/74%, 50%.
      // This approved multi-pawn artwork overhang is NOT a single-pawn size policy.
      scale = Math.min(width / 64, height / 77) * (matchMedia("(max-width: 620px)").matches ? 1.1 : 1);
      tips = [{x: width * .26, y: height / 2}, {x: width * .74, y: height / 2}];
      const tileRect = tile.getBoundingClientRect(), boardRect = board.getBoundingClientRect();
      const unitX = width / tileRect.width, unitY = height / tileRect.height;
      const left = (boardRect.left - tileRect.left) * unitX;
      const right = (boardRect.right - tileRect.left) * unitX;
      const top = (boardRect.top - tileRect.top) * unitY;
      const bottom = (boardRect.bottom - tileRect.top) * unitY;
      scale = Math.min(scale, ...tips.flatMap(t => [
        (t.x - left) / (32 - g.left), (right - t.x) / (g.right - 32),
        (t.y - top) / (77 - g.top), (bottom - t.y) / (g.bottom - 77)
      ]));
      tips = tips.map(t => ({...t, y: t.y + (g.tipY - 77) * scale}));
    } else {
      const columns = pawns.length <= 3 ? pawns.length : Math.ceil(Math.sqrt(pawns.length));
      const rows = Math.ceil(pawns.length / columns);
      tips = pawns.map((_, i) => {
        const row = Math.floor(i / columns);
        const inRow = Math.min(columns, pawns.length - row * columns);
        return {x: width * (.5 + (i % columns - (inRow - 1) / 2) * .96 / columns),
          y: height * (.5 + (row - (rows - 1) / 2) * .8 / rows)};
      });
      scale = Math.min(...tips.flatMap(t => [
        (t.x - width * .03) / (g.tipX - g.left),
        (width * .97 - t.x) / (g.right - g.tipX),
        (t.y - height * .03) / (g.tipY - g.top),
        (height * .97 - t.y) / (g.bottom - g.tipY),
        width * .9 / columns / (g.right - g.left),
        rows > 1 ? height * .76 / rows / (g.bottom - g.top) : Infinity
      ]));
    }
    pawns.forEach((pawn, i) => paintPawn(pawn, width, height, scale, tips[i]));
  }

  // Yard pawns occupy deliberate home slots, not track cells. Center their full
  // painted artwork within those existing slots at one common home-slot scale.
  const homes = [...board.querySelectorAll('.yard')].map(tile => ({tile, ...cellSize(tile)}))
    .filter(({width, height}) => width > 0 && height > 0);
  // A small mobile-only boost keeps home pawns readable while retaining a
  // minimum ~1.9% painted margin inside every home slot. Desktop is unchanged.
  const homeScale = Math.min(...homes.flatMap(({width, height}) => [
    width * .9 / (g.right - g.left), height * .9 / (g.bottom - g.top)
  ])) * (phoneLayout ? 1.01 : 1);
  for (const {tile, width, height} of homes) {
    const tip = {x: width / 2, y: height / 2 + (g.tipY - (g.top + g.bottom) / 2) * homeScale};
    for (const pawn of tile.children) if (pawn.classList.contains('pin-pawn')) {
      paintPawn(pawn, width, height, homeScale, tip);
    }
  }
}
