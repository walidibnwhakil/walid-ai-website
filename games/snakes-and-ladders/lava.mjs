// A small transparent foreground layer animates the existing molten-rock artwork.
export function createLava(canvas, { motion, quality }) {
  const c = canvas.getContext("2d");
  let raf = 0,
    last = 0,
    running = false;
  function paint(ms) {
    const w = Math.min(900, innerWidth),
      h = 180;
    if (canvas.width !== w) {
      canvas.width = w;
      canvas.height = h;
    }
    c.clearRect(0, 0, w, h);
    c.globalCompositeOperation = "screen";
    const t = ms / 1000;
    const glow = c.createRadialGradient(
      w * 0.55,
      h * 0.9,
      0,
      w * 0.55,
      h * 0.9,
      w * 0.65,
    );
    glow.addColorStop(
      0,
      `rgba(255,112,12,${0.07 + Math.sin(t * 0.55) * 0.018})`,
    );
    glow.addColorStop(1, "rgba(255,70,0,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    for (let river = 0; river < 4; river++) {
      const path = new Path2D();
      for (let x = -30; x <= w + 30; x += 12) {
        const y =
          64 +
          river * 31 +
          Math.sin(x * 0.012 + t * 0.26 + river * 1.7) * 9 +
          Math.sin(x * 0.024 - t * 0.33) * 4;
        x === -30 ? path.moveTo(x, y) : path.lineTo(x, y);
      }
      c.setLineDash([]);
      c.strokeStyle = "rgba(255,90,12,.10)";
      c.lineWidth = 23;
      c.shadowColor = "#ff7200";
      c.shadowBlur = 15;
      c.stroke(path);
      c.shadowBlur = 0;
      c.setLineDash([19, 53, 5, 91]);
      c.lineDashOffset = -t * (19 + river * 8);
      c.strokeStyle = "rgba(255,225,131,.42)";
      c.lineWidth = 1.2;
      c.stroke(path);
    }
    c.setLineDash([]);
    const count = quality() === "Low" ? 6 : 14;
    for (let i = 0; i < count; i++) {
      const p = (t * (0.085 + (i % 4) * 0.012) + i * 0.173) % 1,
        x = ((i * 167.3) % w) + Math.sin(t * 0.6 + i) * 7,
        y = 179 - p * (68 + (i % 4) * 16),
        r = (1.1 + (i % 3) * 0.7) * Math.sin(Math.PI * p);
      c.globalAlpha = Math.sin(Math.PI * p) * 0.55;
      c.strokeStyle = "#ffe89c";
      c.lineWidth = 0.7;
      c.beginPath();
      c.ellipse(
        x,
        y,
        Math.max(0.1, r),
        Math.max(0.1, r * 0.6),
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
      if (i % 3 === 0) {
        c.fillStyle = "#ffc65b";
        c.beginPath();
        c.arc(x + 5, y - 25, 1, 0, Math.PI * 2);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }
  function frame(t) {
    if (!running) return;
    if (document.hidden) {
      stop();
      return;
    }
    if (
      t - last >=
      (quality() === "Low" ? 100 : quality() === "High" ? 33 : 50)
    ) {
      paint(motion() ? t : 0);
      last = t;
    }
    if (motion()) raf = requestAnimationFrame(frame);
    else {
      running = false;
      raf = 0;
    }
  }
  function start() {
    canvas.dataset.active = "true";
    if (!motion()) {
      stop();
      paint(0);
      canvas.dataset.active = "static";
      return;
    }
    if (running) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    raf = 0;
    canvas.dataset.active = "false";
  }
  return { start, stop, paint };
}
