// Photo-textured eyelids are anchored to the eyes painted into each cavern plate.
export function createCavernEyes(canvas, { motion }) {
  const c = canvas.getContext("2d"),
    images = {};
  for (const name of ["cavern.webp", "cavern-mobile.webp"]) {
    const image = new Image();
    image.src = "assets/" + name;
    images[name] = image;
  }
  let raf = 0,
    running = false,
    last = 0,
    dirty = false;
  function paint(ms) {
    const w = Math.min(1100, innerWidth),
      h = Math.round((innerHeight * w) / innerWidth);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      dirty = true;
    }
    const mobile = innerWidth <= 800,
      im = images[mobile ? "cavern-mobile.webp" : "cavern.webp"];
    if (!im.complete || !im.naturalWidth) return;
    const phase = (ms % 7200) / 7200,
      p = phase > 0.92 ? Math.sin(((phase - 0.92) / 0.08) * Math.PI) ** 2 : 0;
    canvas.dataset.closure = p.toFixed(3);
    if (p < 0.002 && !dirty) return;
    c.clearRect(0, 0, w, h);
    dirty = p > 0.002;
    if (p < 0.002) return;
    const sx = w / (mobile ? 768 : 1536),
      sy = h / (mobile ? 1152 : 1024),
      eyes = mobile
        ? [
            [138, 65, 83, 43],
            [632, 65, 83, 43],
          ]
        : [
            [469, 72, 114, 49],
            [1071, 72, 115, 49],
          ];
    c.save();
    c.scale(sx, sy);
    for (const [x, y, rx, ry] of eyes) {
      c.save();
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, 7);
      c.clip();
      const fromY = y - ry,
        cut = fromY + 2 * ry * 0.76 * p;
      c.save();
      c.beginPath();
      c.rect(x - rx, fromY, rx * 2, cut - fromY);
      c.clip();
      c.drawImage(
        im,
        mobile ? 280 : 610,
        0,
        mobile ? 210 : 300,
        mobile ? 105 : 115,
        x - rx,
        fromY,
        rx * 2,
        ry * 2,
      );
      c.restore();
      c.save();
      c.beginPath();
      c.rect(x - rx, y + ry - 2 * ry * 0.24 * p, rx * 2, 2 * ry * 0.24 * p);
      c.clip();
      c.drawImage(
        im,
        mobile ? 280 : 610,
        0,
        mobile ? 210 : 300,
        mobile ? 105 : 115,
        x - rx,
        fromY,
        rx * 2,
        ry * 2,
      );
      c.restore();
      c.strokeStyle = "#1d1809";
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(x - rx, cut);
      c.quadraticCurveTo(x, cut + 8, x + rx, cut);
      c.stroke();
      c.restore();
    }
    c.restore();
  }
  function frame(t) {
    if (!running || document.hidden) return;
    if (t - last >= 40) {
      paint(motion() ? t : 0);
      last = t;
    }
    if (motion()) raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    canvas.dataset.active = "false";
  }
  function start() {
    stop();
    if (!document.body.classList.contains("playing") || document.hidden) return;
    canvas.dataset.active = motion() ? "true" : "static";
    if (!motion()) {
      paint(0);
      return;
    }
    running = true;
    raf = requestAnimationFrame(frame);
  }
  const obs = new MutationObserver(start);
  obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", start);
  window.addEventListener("resize", start);
  return {
    start,
    stop,
    paint,
    destroy() {
      stop();
      obs.disconnect();
      document.removeEventListener("visibilitychange", start);
      window.removeEventListener("resize", start);
    },
  };
}
