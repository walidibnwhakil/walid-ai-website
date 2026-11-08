// Three staggered bursts, with bounded ray counts and no simulation allocations per ray.
export function createFireworks(canvas) {
  const c = canvas.getContext("2d");
  let active = false,
    raf = 0,
    last = 0,
    startTime = 0,
    color = "#f14b58",
    motion = true,
    quality = "Balanced";
  function paint(t) {
    const r = canvas.getBoundingClientRect(),
      w = Math.min(1100, Math.round(r.width)),
      h = Math.max(1, Math.round((r.height * w) / Math.max(1, r.width)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "lighter";
    for (let b = 0; b < 3; b++) {
      const phase = (t - b * 0.82 + 9) % 2.7,
        x = w * [0.22, 0.78, 0.5][b],
        y = h * [0.24, 0.28, 0.47][b];
      if (phase < 0.35) {
        const py = h * 0.93 - ((h * 0.93 - y) * phase) / 0.35;
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.shadowColor = color;
        c.shadowBlur = 8;
        c.beginPath();
        c.moveTo(x, py + 40);
        c.lineTo(x, py);
        c.stroke();
        continue;
      }
      if (phase > 1.8) continue;
      const p = (phase - 0.35) / 1.45,
        spread = Math.min(w, h) * (0.27 + b * 0.015) * (1 - (1 - p) ** 2),
        fade = (1 - p) ** 1.25,
        rays = quality === "Low" ? 12 : 24;
      c.globalAlpha = fade;
      const glow = c.createRadialGradient(x, y, 0, x, y, spread + 10);
      glow.addColorStop(0, color + "33");
      glow.addColorStop(1, color + "00");
      c.fillStyle = glow;
      c.fillRect(
        x - spread - 10,
        y - spread - 10,
        spread * 2 + 20,
        spread * 2 + 20,
      );
      for (let k = 0; k < rays; k++) {
        const a = (k * Math.PI * 2) / rays + b * 0.31,
          dx = Math.cos(a) * spread,
          dy = Math.sin(a) * spread + p * p * 32,
          tail = 0.56 + (k % 3) * 0.07;
        c.strokeStyle = color;
        c.lineWidth = 1.7;
        c.shadowColor = color;
        c.shadowBlur = 7;
        c.beginPath();
        c.moveTo(x + dx * tail, y + dy * tail);
        c.lineTo(x + dx, y + dy);
        c.stroke();
        c.shadowBlur = 0;
        c.fillStyle = "#fff3cb";
        c.beginPath();
        c.arc(x + dx, y + dy, 1.2, 0, 7);
        c.fill();
      }
      c.globalAlpha = 1;
    }
    c.globalAlpha = 1;
    canvas.dataset.frame = String(t);
  }
  function frame(now) {
    if (!active || document.hidden) return;
    if (now - last >= (quality === "Low" ? 70 : quality === "High" ? 33 : 50)) {
      paint(motion ? (now - startTime) / 1000 : 0.85);
      last = now;
    }
    if (motion) raf = requestAnimationFrame(frame);
  }
  function stop() {
    active = false;
    cancelAnimationFrame(raf);
    canvas.dataset.active = "false";
  }
  function start(nextColor, options = {}) {
    stop();
    color = nextColor;
    motion = options.motion ?? true;
    quality = options.quality ?? "Balanced";
    startTime = performance.now();
    last = 0;
    active = true;
    canvas.dataset.active = motion ? "true" : "static";
    if (motion) raf = requestAnimationFrame(frame);
    else paint(0.85);
  }
  function visibility() {
    cancelAnimationFrame(raf);
    if (active && !document.hidden && motion)
      raf = requestAnimationFrame(frame);
  }
  document.addEventListener("visibilitychange", visibility);
  return {
    start,
    stop,
    destroy() {
      stop();
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
