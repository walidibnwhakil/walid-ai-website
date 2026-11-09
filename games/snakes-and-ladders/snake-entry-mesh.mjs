const smooth = (a, b, x) => {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
// Deform only the existing image's lower jaw. No second head/animal is introduced.
export function createEntryMesh(profile, quality = "Balanced") {
  const canvas = document.createElement("canvas");
  canvas.className = "same-snake-mesh";
  canvas.width = 1536;
  canvas.height = 1024;
  canvas.dataset.asset = "assets/jungle-emblem.webp";
  canvas.setAttribute("aria-hidden", "true");
  const unit = +profile.dataset.sourceScale,
    ox = +profile.dataset.sourceLeft,
    oy = +profile.dataset.sourceTop;
  canvas.style.cssText = `position:absolute;left:${ox}px;top:${oy}px;width:${1536 * unit}px;height:${1024 * unit}px;pointer-events:none;`;
  profile.append(canvas);
  const c = canvas.getContext("2d"),
    image = new Image();
  image.src = "assets/jungle-emblem.webp";
  const original = profile.querySelector("#jungle"),
    steps = quality === "Low" ? 8 : 12;
  const point = (x, y, gape) => {
    const width = smooth(265, 330, x) * (1 - smooth(440, 500, x));
    const lower = smooth(138, 185, y) * (1 - smooth(225, 390, y));
    const upper = smooth(60, 95, y) * (1 - smooth(135, 155, y));
    const head = smooth(45, 100, y) * (1 - smooth(225, 350, y));
    return {
      x: x + width * gape * (22 * head + (x - 280) * 0.12 * head),
      y: y + width * gape * (90 * lower - 24 * upper),
    };
  };
  function triangle(s0, s1, s2, p0, p1, p2) {
    const u = s1.x - s0.x,
      v = s2.y - s0.y,
      a = (p1.x - p0.x) / u,
      b = (p1.y - p0.y) / u,
      d = (p2.y - p0.y) / v,
      k = (p2.x - p0.x) / v,
      tx = p0.x - a * s0.x - k * s0.y,
      ty = p0.y - b * s0.x - d * s0.y,
      cx = (p0.x + p1.x + p2.x) / 3,
      cy = (p0.y + p1.y + p2.y) / 3;
    c.save();
    c.beginPath();
    for (const [i, p] of [p0, p1, p2].entries()) {
      const x = cx + (p.x - cx) * 1.015,
        y = cy + (p.y - cy) * 1.015;
      i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.closePath();
    c.clip();
    c.transform(a, b, k, d, tx, ty);
    const x = Math.min(s0.x, s1.x, s2.x),
      y = Math.min(s0.y, s1.y, s2.y);
    c.drawImage(
      image,
      x - 0.5,
      y - 0.5,
      Math.abs(u) + 1,
      Math.abs(v) + 1,
      x - 0.5,
      y - 0.5,
      Math.abs(u) + 1,
      Math.abs(v) + 1,
    );
    c.restore();
  }
  function paint(gape, angry = 0) {
    if (!image.complete || !image.naturalWidth) return;
    original.style.opacity = "0";
    c.clearRect(0, 0, 1536, 1024);
    c.drawImage(image, 0, 0, 1536, 1024);
    c.clearRect(250, 45, 260, 355);
    for (let row = 0; row < steps; row++)
      for (let col = 0; col < steps; col++) {
        const x = 250 + (col * 260) / steps,
          y = 45 + (row * 355) / steps,
          w = 260 / steps,
          h = 355 / steps,
          a = { x, y },
          b = { x: x + w, y },
          d = { x, y: y + h },
          e = { x: x + w, y: y + h },
          pa = point(a.x, a.y, gape),
          pb = point(b.x, b.y, gape),
          pd = point(d.x, d.y, gape),
          pe = point(e.x, e.y, gape);
        triangle(a, b, d, pa, pb, pd);
        triangle(e, d, b, pe, pd, pb);
      }
    if (angry > 0) {
      c.save();
      c.beginPath();
      const eye = point(348, 94, gape);
      c.ellipse(eye.x, eye.y, 16, 12, 0, 0, Math.PI * 2);
      c.clip();
      c.globalAlpha = angry;
      const shadow = c.createLinearGradient(0, eye.y - 12, 0, eye.y + 3);
      shadow.addColorStop(0, "#100c08f5");
      shadow.addColorStop(0.65, "#21160ac4");
      shadow.addColorStop(1, "#21160a00");
      c.fillStyle = shadow;
      c.fillRect(eye.x - 18, eye.y - 12, 36, 15);
      c.restore();
    }
    canvas.dataset.gape = String(gape);
  }
  return {
    paint,
    mouth(gape) {
      return {
        x: ox + (360 + 32 * gape) * unit,
        y: oy + (174 + 55 * gape) * unit,
        rx: (30 + 7 * gape) * unit,
        ry: (5 + 41 * gape) * unit,
      };
    },
    destroy() {
      original.style.removeProperty("opacity");
      canvas.remove();
    },
  };
}
