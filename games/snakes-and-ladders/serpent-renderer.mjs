import {
  HEAD_FRAME,
  headPoseFromPath,
  headUvAtLocal,
} from "./snake-geometry.mjs?v=20261108-joined";
// Photo-style natural skin is deformed along the authoritative animated curve.
const skinAtlas = new Image();

const joinedAtlas = new Image(),
  openAtlas = new Image(),
  closedSprites = [],
  openSprites = [];
function prepareHeads(atlas, output) {
  const cell = atlas.naturalWidth / 2,
    size = 256,
    height = Math.round(size * HEAD_FRAME.crop);
  for (let type = 0; type < 4; type++) {
    const c = document.createElement("canvas");
    c.width = size;
    c.height = height;
    const g = c.getContext("2d");
    g.imageSmoothingQuality = "high";
    g.drawImage(
      atlas,
      (type % 2) * cell,
      Math.floor(type / 2) * cell,
      cell,
      cell * HEAD_FRAME.crop,
      0,
      0,
      size,
      height,
    );
    g.clearRect(0, 0, size, size * 0.08);
    g.globalCompositeOperation = "destination-in";
    const fade = g.createLinearGradient(0, size * 0.53, 0, height);
    fade.addColorStop(0, "#fff");
    fade.addColorStop(1, "#fff0");
    g.fillStyle = fade;
    g.fillRect(0, 0, size, height);
    output[type] = c;
  }
}
joinedAtlas.onload = () => prepareHeads(joinedAtlas, closedSprites);
openAtlas.onload = () => prepareHeads(openAtlas, openSprites);
let assetsReady;
export function preloadBodyAssets() {
  return (assetsReady ??= Promise.all(
    [
      [skinAtlas, "natural-skin.webp"],
      [joinedAtlas, "joined-heads.webp"],
      [openAtlas, "joined-heads-open.webp"],
    ].map(
      ([image, name]) =>
        new Promise((resolve, reject) => {
          const prepared = image.onload;
          image.onload = () => {
            prepared?.();
            resolve();
          };
          image.onerror = () => {
            assetsReady = null;
            reject(new Error("Could not load snake textures"));
          };
          image.decoding = "async";
          image.src = new URL("assets/" + name, import.meta.url).href;
        }),
    ),
  ));
}
let shadeStrip;
function shadeTexture() {
  if (shadeStrip) return shadeStrip;
  shadeStrip = document.createElement("canvas");
  shadeStrip.width = 64;
  shadeStrip.height = 1;
  const g = shadeStrip.getContext("2d"),
    shade = g.createLinearGradient(0, 0, 64, 0);
  for (const [p, color] of [
    [0, "#000a"],
    [0.24, "#0002"],
    [0.43, "#ffffff10"],
    [0.68, "#0001"],
    [1, "#000a"],
  ])
    shade.addColorStop(p, color);
  g.fillStyle = shade;
  g.fillRect(0, 0, 64, 1);
  return shadeStrip;
}
function paintHead(c, item, time) {
  const type = item.i % 4,
    sprite = closedSprites[type];
  if (!sprite) return;
  const pose = headPoseFromPath(item.path.getAttribute("d")),
    f = HEAD_FRAME,
    cell = joinedAtlas.naturalWidth / 2,
    sx = (type % 2) * cell,
    sy = Math.floor(type / 2) * cell;
  c.save();
  c.translate(pose.x, pose.y);
  c.rotate(pose.angle);
  c.shadowColor = "#0009";
  c.shadowBlur = 0;
  c.shadowOffsetX = 1;
  c.shadowOffsetY = 2;
  c.drawImage(sprite, f.x, f.y, f.width, f.height * f.crop);
  c.shadowColor = "transparent";
  const active = item.g.classList.contains("active-snake");
  if (active && openSprites[type]) {
    c.globalAlpha = 0.94;
    c.drawImage(openSprites[type], f.x, f.y, f.width, f.height * f.crop);
    c.globalAlpha = 1;
  }
  const flick = Math.max(0, Math.sin(time / 220 + item.i * 1.7)) ** 8;
  if (flick > 0.02) {
    c.globalAlpha = flick;
    c.drawImage(
      joinedAtlas,
      sx,
      sy,
      cell,
      cell * 0.08,
      f.x,
      f.y + 0.8 * (1 - flick),
      f.width,
      0.8 * flick,
    );
    c.globalAlpha = 1;
  }
  const blink = (time + item.i * 733) % 6300;
  if (blink > 2800 && blink < 2940) {
    const opacity = Math.sin(((blink - 2800) / 140) * Math.PI);
    c.globalAlpha = opacity;
    c.fillStyle = item.color;
    for (const x of [-1.38, 1.38]) {
      c.beginPath();
      c.ellipse(x, -1, 0.24, 0.4, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }
  c.restore();
  item.head.setAttribute("data-heading", String(pose.angle));
  item.head.setAttribute("data-renderer", "joined-canvas");
}

// Head and body use one overhead camera, one spine and the same proximal neck material.
const rgb = (hex) => hex.match(/[\da-f]{2}/gi).map((n) => parseInt(n, 16));
const tint = (c, k, white = 0) =>
  `rgb(${c.map((v) => Math.max(0, Math.min(255, Math.round(v * k + white)))).join(",")})`;
function samples(d, time, index, quality) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d.match(/-?[\d.]+/g).map(Number);
  const count = Math.max(
      18,
      Math.ceil(
        Math.hypot(x3 - x0, y3 - y0) /
          (quality === "Low" ? 3 : quality === "High" ? 0.9 : 1.6),
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
        1.36 *
        Math.min(1, (1 - t) / 0.22) *
        (1 + 0.025 * Math.sin(time / 850 + index + t * 6)),
      t,
    });
  }
  return out;
}
export function createBodyCanvas(board) {
  const base = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  base.setAttribute("viewBox", "0 0 100 100");
  base.setAttribute("aria-hidden", "true");
  base.classList.add("board-base");
  for (const node of [...board.children])
    if (node.tagName.toLowerCase() !== "defs") base.append(node);
  const canvas = document.createElement("canvas");
  canvas.className = "living-serpents";
  canvas.setAttribute("aria-hidden", "true");
  board.before(base, canvas);
  return canvas;
}
function paintBody(c, item, time, quality) {
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
  c.shadowBlur = 0;
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
  c.fillStyle = item.color;
  c.fill();
  if (skinAtlas.complete && skinAtlas.naturalWidth) {
    const cell = skinAtlas.naturalWidth / 2,
      type = item.i % 4,
      sx = (type % 2) * cell,
      baseY = Math.floor(type / 2) * cell;
    let arc = 0;
    for (let j = 0; j < points.length - 1; j++) {
      const p = points[j],
        q = points[j + 1],
        length = Math.hypot(q.x - p.x, q.y - p.y),
        sourceHeight = (length * cell) / HEAD_FRAME.height,
        sourceY = ((arc * cell) / HEAD_FRAME.height) % cell,
        sourceWidth = ((2 * p.w) / HEAD_FRAME.width) * cell,
        sourceX = sx + (cell - sourceWidth) / 2;
      c.save();
      c.transform(p.nx, p.ny, p.tx, p.ty, p.x, p.y);
      let consumed = 0;
      while (consumed < sourceHeight) {
        const sy = (sourceY + consumed) % cell,
          part = Math.min(sourceHeight - consumed, cell - sy);
        c.drawImage(
          skinAtlas,
          sourceX,
          baseY + sy,
          sourceWidth,
          Math.max(0.01, part),
          -p.w,
          (consumed / sourceHeight) * length - 0.04,
          2 * p.w,
          (part / sourceHeight) * length + 0.1,
        );
        consumed += part;
      }
      if (joinedAtlas.complete && joinedAtlas.naturalWidth && arc < 9) {
        const hc = joinedAtlas.naturalWidth / 2,
          uv = headUvAtLocal(-p.w, Math.min(4.8, arc)),
          neckX = (type % 2) * hc + uv.u * hc,
          neckY = Math.floor(type / 2) * hc + uv.v * hc,
          neckWidth = ((2 * p.w) / HEAD_FRAME.width) * hc,
          neckH = (length / HEAD_FRAME.height) * hc;
        c.globalAlpha = Math.max(0, Math.min(1, (9 - arc) / 5.5));
        c.drawImage(
          joinedAtlas,
          neckX,
          neckY,
          neckWidth,
          Math.max(0.01, neckH),
          -p.w,
          -0.04,
          p.w * 2,
          length + 0.1,
        );
        c.globalAlpha = 1;
      }
      c.globalAlpha = Math.max(0, Math.min(1, (arc - 2.8) / 5));
      c.drawImage(
        shadeTexture(),
        0,
        0,
        64,
        1,
        -p.w,
        -0.04,
        p.w * 2,
        length + 0.1,
      );
      c.globalAlpha = 1;
      c.restore();
      arc += length;
    }
  }
  // A travelling specular highlight adds a subtle breathing sheen, without moving endpoints.
  c.globalAlpha = item.i % 4 === 3 ? 0.15 : 0.08;
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
// Cache each photographed body in its tight bounding box. Refresh one body per tick;
// composite cached bodies and animate all heads without repainting eight textured meshes.
export function paintBodies(canvas, items, time, quality = "Balanced") {
  const size = +canvas.dataset.renderSize || 500;
  const resolution = Math.round(
    Math.min(
      quality === "High" ? 1200 : quality === "Low" ? 600 : 900,
      Math.max(240, size * (quality === "High" ? 1.5 : 1.25)),
    ),
  );
  let cache = canvas.bodyCache;
  if (
    !cache ||
    cache.resolution !== resolution ||
    cache.quality !== quality ||
    cache.items[0] !== items[0]
  ) {
    cache = canvas.bodyCache = {
      resolution,
      quality,
      items,
      index: 0,
      layers: items.map((item) => {
        const n = item.path
            .getAttribute("d")
            .match(/-?[\d.]+/g)
            .map(Number),
          xs = [n[0], n[2], n[4], n[6]],
          ys = [n[1], n[3], n[5], n[7]],
          x = Math.min(...xs) - 4,
          y = Math.min(...ys) - 4,
          w = Math.max(...xs) - x + 4,
          h = Math.max(...ys) - y + 4;
        const image = document.createElement("canvas");
        image.width = Math.ceil((w * resolution) / 100);
        image.height = Math.ceil((h * resolution) / 100);
        return { image, c: image.getContext("2d"), x, y, w, h, ready: false };
      }),
    };
  }
  const refresh = (index) => {
    const layer = cache.layers[index],
      scale = resolution / 100;
    layer.c.setTransform(1, 0, 0, 1, 0, 0);
    layer.c.clearRect(0, 0, layer.image.width, layer.image.height);
    layer.c.setTransform(
      scale,
      0,
      0,
      scale,
      -layer.x * scale,
      -layer.y * scale,
    );
    paintBody(layer.c, items[index], time, quality);
    layer.ready = true;
  };
  let repainted = 0;
  for (let i = 0; i < items.length; i++)
    if (!cache.layers[i].ready) {
      refresh(i);
      repainted++;
    }
  if (!repainted && items.length) {
    refresh(cache.index);
    repainted++;
    for (let i = 0; i < items.length; i++)
      if (i !== cache.index && items[i].g.classList.contains("active-snake")) {
        refresh(i);
        repainted++;
      }
    cache.index = (cache.index + 1) % items.length;
  }
  if (canvas.width !== resolution) {
    canvas.width = canvas.height = resolution;
  }
  const c = canvas.getContext("2d");
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, resolution, resolution);
  c.setTransform(resolution / 100, 0, 0, resolution / 100, 0, 0);
  for (const layer of cache.layers)
    c.drawImage(layer.image, layer.x, layer.y, layer.w, layer.h);
  for (const item of items) paintHead(c, item, time);
  canvas.renderStats = { repainted, cached: items.length, resolution };
}
