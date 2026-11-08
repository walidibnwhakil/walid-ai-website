// Cylindrical bodies and tangent-aligned scale plates share the SVG movement path.
const rgb = (hex) => hex.match(/[\da-f]{2}/gi).map((n) => parseInt(n, 16));
const tint = (c, k, white = 0) =>
  `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + white)))).join(",")})`;
function samples(d, time, index, quality) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d.match(/-?[\d.]+/g).map(Number);
  const count = Math.max(
      18,
      Math.ceil(
        Math.hypot(x3 - x0, y3 - y0) / (quality === "Low" ? 1.25 : 0.75),
      ),
    ),
    out = [];
  for (let k = 0; k <= count; k++) {
    const t = k / count,
      u = 1 - t,
      x =
        u * u * u * x0 +
        3 * u * u * t * x1 +
        3 * u * t * t * x2 +
        t * t * t * x3,
      y =
        u * u * u * y0 +
        3 * u * u * t * y1 +
        3 * u * t * t * y2 +
        t * t * t * y3;
    const dx =
        3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
      dy =
        3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
      len = Math.hypot(dx, dy) || 1;
    out.push({
      x,
      y,
      nx: -dy / len,
      ny: dx / len,
      tx: dx / len,
      ty: dy / len,
      w:
        1.48 *
        Math.min(1, (1 - t) / 0.22) *
        (1 + 0.025 * Math.sin(time / 850 + index + t * 6)),
      t,
    });
  }
  return out;
}
export function createBodyCanvas(board) {
  const fo = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "foreignObject",
  );
  fo.setAttribute("x", 0);
  fo.setAttribute("y", 0);
  fo.setAttribute("width", 100);
  fo.setAttribute("height", 100);
  fo.setAttribute("pointer-events", "none");
  const canvas = document.createElement("canvas");
  canvas.className = "living-serpents";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = "width:100%;height:100%;display:block";
  fo.append(canvas);
  board.append(fo);
  return canvas;
}
export function paintBodies(canvas, items, time, quality = "Balanced") {
  const resolution = quality === "High" ? 1400 : quality === "Low" ? 700 : 1100;
  if (canvas.width !== resolution) {
    canvas.width = resolution;
    canvas.height = resolution;
  }
  const c = canvas.getContext("2d");
  c.setTransform(resolution / 100, 0, 0, resolution / 100, 0, 0);
  c.clearRect(0, 0, 100, 100);
  for (const item of items) {
    const points = samples(item.path.getAttribute("d"), time, item.i, quality),
      color = rgb(item.color);
    c.save();
    c.beginPath();
    points.forEach((p, j) => {
      const x = p.x + p.nx * p.w,
        y = p.y + p.ny * p.w;
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    [...points]
      .reverse()
      .forEach((p) => c.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w));
    c.closePath();
    c.fillStyle = "#0c0806";
    c.shadowColor = "#000b";
    c.shadowBlur = 5;
    c.shadowOffsetX = 2;
    c.shadowOffsetY = 4;
    c.fill();
    c.restore();
    c.save();
    c.beginPath();
    points.forEach((p, j) => {
      const x = p.x + p.nx * p.w,
        y = p.y + p.ny * p.w;
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    [...points]
      .reverse()
      .forEach((p) => c.lineTo(p.x - p.nx * p.w, p.y - p.ny * p.w));
    c.closePath();
    c.clip();
    for (let j = 0; j < points.length - 1; j++) {
      const p = points[j],
        q = points[j + 1],
        g = c.createLinearGradient(
          p.x + p.nx * p.w,
          p.y + p.ny * p.w,
          p.x - p.nx * p.w,
          p.y - p.ny * p.w,
        );
      g.addColorStop(0, tint(color, 0.22));
      g.addColorStop(0.18, tint(color, 0.75));
      g.addColorStop(0.38, tint(color, 1.15, 42));
      g.addColorStop(0.62, tint(color, 0.95));
      g.addColorStop(1, tint(color, 0.18));
      c.beginPath();
      c.moveTo(p.x + p.nx * p.w - p.tx * 0.06, p.y + p.ny * p.w - p.ty * 0.06);
      c.lineTo(q.x + q.nx * q.w + q.tx * 0.06, q.y + q.ny * q.w + q.ty * 0.06);
      c.lineTo(q.x - q.nx * q.w + q.tx * 0.06, q.y - q.ny * q.w + q.ty * 0.06);
      c.lineTo(p.x - p.nx * p.w - p.tx * 0.06, p.y - p.ny * p.w - p.ty * 0.06);
      c.closePath();
      c.fillStyle = g;
      c.fill();
    }
    const cols = quality === "Low" ? 3 : 5;
    for (let j = 1; j < points.length - 2; j++)
      for (let col = 0; col < cols; col++) {
        const p = points[j],
          f = (col - (cols - 1) / 2) / (cols / 2),
          width = p.w * (quality === "Low" ? 0.42 : 0.28);
        if (width < 0.1) continue;
        const shift = col % 2 ? -0.19 : 0.19,
          x = p.x + p.nx * p.w * f + p.tx * shift,
          y = p.y + p.ny * p.w * f + p.ty * shift,
          along = 0.47;
        c.beginPath();
        c.moveTo(x + p.tx * along, y + p.ty * along);
        c.quadraticCurveTo(
          x + p.nx * width + p.tx * 0.15,
          y + p.ny * width + p.ty * 0.15,
          x + p.nx * width,
          y + p.ny * width,
        );
        c.quadraticCurveTo(
          x - p.tx * along,
          y - p.ty * along,
          x - p.nx * width,
          y - p.ny * width,
        );
        c.quadraticCurveTo(
          x - p.nx * width + p.tx * 0.15,
          y - p.ny * width + p.ty * 0.15,
          x + p.tx * along,
          y + p.ty * along,
        );
        c.fillStyle = tint(
          color,
          0.38 + 0.66 * Math.sqrt(Math.max(0, 1 - f * f)),
          f < 0 ? 12 : 0,
        );
        c.fill();
        c.strokeStyle = "rgba(19,16,7,.65)";
        c.lineWidth = 0.045;
        c.stroke();
        c.beginPath();
        c.moveTo(x - p.nx * width, y - p.ny * width);
        c.quadraticCurveTo(
          x - p.nx * width + p.tx * 0.2,
          y - p.ny * width + p.ty * 0.2,
          x + p.tx * along,
          y + p.ty * along,
        );
        c.strokeStyle = "rgba(255,224,136,.48)";
        c.lineWidth = 0.05;
        c.stroke();
      }
    // A travelling specular highlight adds a subtle breathing sheen, without moving endpoints.
    c.globalAlpha = 0.19;
    c.beginPath();
    points.forEach((p, j) => {
      const x = p.x - p.nx * p.w * 0.28,
        y = p.y - p.ny * p.w * 0.28;
      j ? c.lineTo(x, y) : c.moveTo(x, y);
    });
    c.strokeStyle = "#fff2b3";
    c.lineWidth = 0.14;
    c.stroke();
    c.globalAlpha = 1;
    c.restore();
  }
}
