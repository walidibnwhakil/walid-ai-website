// A small transparent foreground layer animates the existing molten-rock artwork.
export function createLava(canvas, { motion, quality }) {
  const c = canvas.getContext("2d");
  const plates = {};
  function loadPlate() {
    const name = innerWidth <= 800 ? "cavern-mobile.webp" : "cavern.webp";
    if (!plates[name]) {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => {
        if (running || !motion()) paint(0);
      };
      im.src =
        "assets/" +
        (innerWidth <= 800 ? "lava-mobile-ready.webp" : "lava-ready.webp");
      plates[name] = im;
    }
  }
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
    const plate =
      plates[innerWidth <= 800 ? "cavern-mobile.webp" : "cavern.webp"];
    if (plate?.complete && plate.naturalWidth) {
      c.globalAlpha = 0.78;
      const step = quality() === "Low" ? 16 : 9;
      for (let y = 0; y < h; y += step) {
        const sh = Math.min(step, h - y),
          dx = Math.sin(t * 1.8 + y * 0.13) * 6 + Math.sin(t * 0.7) * 3;
        c.drawImage(
          plate,
          0,
          (y / h) * plate.height,
          plate.width,
          (sh / h) * plate.height,
          dx,
          y,
          w,
          sh + 1,
        );
      }
      c.globalAlpha = 1;
    }

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
      `rgba(255,112,12,${0.16 + Math.sin(t * 0.55) * 0.035})`,
    );
    glow.addColorStop(1, "rgba(255,70,0,0)");
    c.fillStyle = glow;
    c.fillRect(0, 0, w, h);
    const count = quality() === "Low" ? 6 : 14;
    for (let i = 0; i < count; i++) {
      const p = (t * (0.085 + (i % 4) * 0.012) + i * 0.173) % 1,
        x = ((i * 167.3) % w) + Math.sin(t * 0.6 + i) * 7,
        y = 179 - p * (68 + (i % 4) * 16),
        r = (2 + (i % 3) * 1.1) * Math.sin(Math.PI * p);
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
      (quality() === "Low" ? 125 : quality() === "High" ? 50 : 83)
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
    if (
      document.hidden ||
      !document.body.classList.contains("playing") ||
      !document.querySelector("#celebration").hidden ||
      !document.querySelector("#intro").hidden
    ) {
      stop();
      return;
    }
    loadPlate();
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
