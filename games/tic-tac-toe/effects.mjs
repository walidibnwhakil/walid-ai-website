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
    // Low-cost living flames continue around the revealed fiery lettering.
    if (tr.width && t > 1.8) {
      const left = tr.x - ar.x - arena.clientLeft,
        top = tr.y - ar.y - arena.clientTop;
      const sweep = Math.min(1, (t - 1.8) / 0.8);
      for (let j = 0; j < 25 * sweep; j++) {
        const x = left + (tr.width * (j + 0.5)) / 25;
        const y =
          top + tr.height * 0.25 + Math.sin(j * 3.1 + t * 2) * tr.height * 0.06;
        flame(
          x,
          y,
          8 + tr.height * (0.24 + 0.15 * Math.sin(j * 2 + t * 13)),
          t * 19 + j,
          0.42,
        );
      }
      if (embers.length < 100 && Math.random() > 0.35)
        embers.push({
          x: left + Math.random() * tr.width,
          y: top + tr.height * 0.5,
          vx: (Math.random() - 0.5) * 20,
          vy: -20 - Math.random() * 35,
          life: 0.6,
        });
    }
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
