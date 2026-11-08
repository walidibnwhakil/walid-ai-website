// Flame tongues, embers and fire energy share the measured winning-line geometry.
// Rendering is capped at 30 fps and particle counts are bounded on small devices.
export function fireCelebration({
  canvas,
  arena,
  board,
  title,
  points,
  active,
}) {
  const ctx = canvas.getContext("2d");
  let raf = 0,
    stopped = false,
    last = 0,
    burst = false;
  const started = performance.now();
  const embers = [];
  function flame(x, y, height, phase, alpha = 1) {
    const bend = Math.sin(phase) * height * 0.22;
    const width = height * 0.35;
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    const gradient = ctx.createLinearGradient(x, y, x, y - height);
    gradient.addColorStop(0, "#fffbd0");
    gradient.addColorStop(0.25, "#ffdb46");
    gradient.addColorStop(0.6, "#ff6509");
    gradient.addColorStop(1, "#e7230300");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x - width, y);
    ctx.bezierCurveTo(
      x - width * 1.6,
      y - height * 0.4,
      x + bend + width,
      y - height * 0.55,
      x + bend,
      y - height,
    );
    ctx.bezierCurveTo(
      x + bend - width * 0.25,
      y - height * 0.6,
      x + width * 1.8,
      y - height * 0.45,
      x + width,
      y,
    );
    ctx.quadraticCurveTo(x, y + height * 0.16, x - width, y);
    ctx.fill();
  }
  const glyph = document.createElement("canvas"),
    ink = document.createElement("canvas");
  const glyphCtx = glyph.getContext("2d"),
    inkCtx = ink.getContext("2d");
  let glyphKey = "";
  function burnLetters(tr, ar, t) {
    const style = getComputedStyle(title),
      scale = Math.min(devicePixelRatio, 2);
    const width = Math.ceil(tr.width * scale),
      height = Math.ceil(tr.height * scale);
    const key = `${width}/${height}/${style.fontSize}/${title.textContent}`;
    if (key !== glyphKey) {
      glyphKey = key;
      glyph.width = ink.width = width;
      glyph.height = ink.height = height;
      glyphCtx.setTransform(scale, 0, 0, scale, 0, 0);
      glyphCtx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      glyphCtx.letterSpacing = style.letterSpacing;
      glyphCtx.textAlign = "center";
      glyphCtx.textBaseline = "alphabetic";
      const m = glyphCtx.measureText(title.textContent);
      const ascent =
        m.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * 0.9;
      const descent =
        m.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * 0.2;
      glyphCtx.fillStyle = "white";
      glyphCtx.fillText(
        title.textContent,
        tr.width / 2,
        (tr.height - ascent - descent) / 2 + ascent,
      );
    }
    inkCtx.setTransform(1, 0, 0, 1, 0, 0);
    inkCtx.globalCompositeOperation = "source-over";
    const base = inkCtx.createLinearGradient(0, height, 0, 0);
    base.addColorStop(0, "#6d1405");
    base.addColorStop(0.27, "#ee3a04");
    base.addColorStop(0.62, "#ffbd2a");
    base.addColorStop(1, "#ffed91");
    inkCtx.fillStyle = base;
    inkCtx.fillRect(0, 0, width, height);
    for (let j = 0; j < 32; j++) {
      const x =
        (width * (j + 0.5)) / 32 + Math.sin(t * 3 + j * 2.3) * width * 0.012;
      const y = height * (0.85 - ((t * 0.7 + j * 0.367) % 1) * 1.1);
      const radius = height * (0.22 + 0.1 * Math.sin(t * 8 + j));
      const heat = inkCtx.createRadialGradient(
        x,
        y,
        0,
        x,
        y,
        Math.max(1, radius),
      );
      heat.addColorStop(0, "#fff7c9");
      heat.addColorStop(0.28, "#ffe56d");
      heat.addColorStop(0.6, "#ff6909bb");
      heat.addColorStop(1, "#ff330000");
      inkCtx.fillStyle = heat;
      inkCtx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    inkCtx.globalCompositeOperation = "destination-in";
    inkCtx.drawImage(glyph, 0, 0);
    ctx.globalAlpha = Math.min(1, (t - 1.8) / 0.55);
    ctx.globalCompositeOperation = "source-over";
    ctx.drawImage(
      ink,
      tr.x - ar.x - arena.clientLeft,
      tr.y - ar.y - arena.clientTop,
      tr.width,
      tr.height,
    );
    ctx.globalCompositeOperation = "screen";
  }
  function frame(now) {
    if (stopped || !active()) {
      stop();
      return;
    }
    raf = requestAnimationFrame(frame);
    if (now - last < 1000 / 30) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0.033);
    last = now;
    const w = arena.clientWidth,
      h = arena.clientHeight,
      dpr = Math.min(devicePixelRatio, 2);
    if (
      canvas.width !== Math.round(w * dpr) ||
      canvas.height !== Math.round(h * dpr)
    ) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const t = (now - started) / 1000,
      br = board.getBoundingClientRect(),
      ar = arena.getBoundingClientRect();
    const ps = points().map((p) => ({
      x: p.x + br.x - ar.x - arena.clientLeft,
      y: p.y + br.y - ar.y - arena.clientTop,
    }));
    const a = ps[0],
      b = ps.at(-1),
      progress = Math.min(1, t / 1.1);
    const point = (f) => ({
      x: a.x + (b.x - a.x) * f,
      y: a.y + (b.y - a.y) * f,
    });
    const head = point(progress);
    ctx.globalCompositeOperation = "screen";
    // A moving, flickering fire front and short living flame trail, not a laser alone.
    if (t < 1.65) {
      const length = Math.hypot(b.x - a.x, b.y - a.y),
        steps = Math.max(8, Math.ceil(length / 9));
      for (let i = 0; i <= steps * progress; i++) {
        const f = i / steps,
          age = progress - f;
        if (age > 0.5 && t < 1.1) continue;
        const p = point(f),
          height = (12 + Math.sin(i * 2.4 + t * 19) * 6) * (w / 450 + 0.4);
        flame(p.x, p.y, height, i + t * 16, Math.min(1, (0.58 - age) * 3));
      }
      flame(head.x, head.y, Math.min(48, w * 0.11), t * 20);
      for (let j = 0; j < 4; j++)
        embers.push({
          x: head.x,
          y: head.y,
          vx: (Math.random() - 0.5) * 110,
          vy: -30 - Math.random() * 90,
          life: 0.4 + Math.random() * 0.5,
        });
    }
    if (t >= 1.1 && !burst) {
      burst = true;
      for (let j = 0; j < 48; j++) {
        const angle = (j / 48) * Math.PI * 2,
          speed = 40 + Math.random() * 120;
        embers.push({
          x: b.x,
          y: b.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0.5 + Math.random() * 0.5,
        });
      }
    }
    // Stream flame packets from points ON the winning line into the future title.
    const tr = title.getBoundingClientRect();
    const target = tr.width
      ? {
          x: tr.x + tr.width / 2 - ar.x - arena.clientLeft,
          y: tr.y + tr.height * 0.65 - ar.y - arena.clientTop,
        }
      : { x: w * 0.5, y: h * 0.45 };
    if (t > 1.2 && t < 2.3)
      for (let j = 0; j < 22; j++) {
        const phase = (t - 1.2 - j * 0.024) / 0.82;
        if (phase < 0 || phase > 1) continue;
        const from = point((j * 0.618) % 1),
          ease = phase * phase * (3 - 2 * phase);
        const x = from.x + (target.x - from.x) * ease,
          y =
            from.y +
            (target.y - from.y) * ease -
            Math.sin(phase * Math.PI) * w * 0.13;
        flame(x, y, 10 + w * 0.025, t * 23 + j, Math.sin(phase * Math.PI));
      }
    // Fire is painted through an exact text alpha mask: no separate flame row.
    if (tr.width && t > 1.8) burnLetters(tr, ar, t);
    while (embers.length > 150) embers.shift();
    for (let i = embers.length - 1; i >= 0; i--) {
      const p = embers[i];
      p.life -= dt;
      if (p.life <= 0) {
        embers.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 20 * dt;
      ctx.globalAlpha = Math.min(1, p.life * 2);
      ctx.fillStyle = p.life > 0.4 ? "#fff6ad" : "#ff801a";
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.6, p.life * 2), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }
  function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  raf = requestAnimationFrame(frame);
  return stop;
}
