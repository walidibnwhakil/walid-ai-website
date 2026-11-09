const mix = (a, b, p) => a + (b - a) * p,
  smooth = (p) => p * p * (3 - 2 * p);
// Photo sprites and the river texture move independently of the static background plate.
export function createJungleLife(canvas, { motion, quality }) {
  const c = canvas.getContext("2d"),
    atlas = new Image(),
    plate = new Image();
  let water = null,
    sprites = [],
    raf = 0,
    running = false,
    startTime = 0,
    last = 0;
  atlas.onload = () => {
    for (let k = 0; k < 6; k++) {
      const s = document.createElement("canvas");
      s.width = s.height = 512;
      const sc = s.getContext("2d");
      sc.drawImage(
        atlas,
        (k % 3) * 512,
        Math.floor(k / 3) * 512,
        512,
        512,
        0,
        0,
        512,
        512,
      );
      // Perched sprites arrive on a branch; remove that prop while keeping blue tail/feet.
      if (k === 0 || k === 3) {
        const px = sc.getImageData(0, 0, 512, 512),
          a = px.data;
        for (let y = 330; y < 512; y++)
          for (let x = 0; x < 512; x++) {
            const i = (y * 512 + x) * 4;
            if (
              !(a[i + 2] > a[i] * 1.1 && a[i + 2] > a[i + 1] * 0.6) &&
              !(a[i] > 150 && a[i] > a[i + 1] * 1.5)
            )
              a[i + 3] = 0;
          }
        sc.putImageData(px, 0, 0);
      }
      sprites.push(s);
    }
    if (!motion()) paint(3000);
  };
  plate.onload = () => {
    water = document.createElement("canvas");
    water.width = 1536;
    water.height = 1024;
    const wc = water.getContext("2d");
    wc.drawImage(plate, 0, 0, 1536, 1024);
    const px = wc.getImageData(0, 0, 1536, 1024),
      a = px.data;
    for (let y = 0; y < 1024; y++)
      for (let x = 0; x < 1536; x++) {
        const i = (y * 1536 + x) * 4;
        if (
          x < 640 ||
          x > 1195 ||
          y < 500 ||
          a[i + 1] < a[i] * 1.05 ||
          a[i + 2] < a[i] * 1.02 ||
          a[i + 1] < 75
        )
          a[i + 3] = 0;
      }
    wc.putImageData(px, 0, 0);
    if (!motion()) paint(3000);
  };
  atlas.src = "assets/jungle-life.webp";
  plate.src = "assets/jungle-menu.webp";
  function plant(cell, x, y, w, h, angle, root = 0.5) {
    if (!sprites[cell]) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.drawImage(sprites[cell], -w * 0.5, -h * root, w, h);
    c.restore();
  }
  function bird(t) {
    const n = t % 20,
      size = 112;
    let x,
      y,
      cell,
      angle = 0,
      flip = 1,
      fish = false,
      phase;
    if (n < 2) {
      const p = smooth(n / 2);
      x = mix(500, 890, p);
      y = mix(200, 733, p) - Math.sin(p * Math.PI) * 35;
      cell = 1 + (Math.floor(t * 10) % 2);
      angle = 0.14;
      phase = "arriving";
    } else if (n < 5) {
      x = 890;
      y = 733 + Math.sin(t * 3) * 1.3;
      cell = 0;
      angle = Math.sin(t * 2) * 0.02;
      phase = "perched-on-die";
    } else if (n < 6.6) {
      const p = smooth((n - 5) / 1.6);
      x = mix(890, 1075, p);
      y = mix(700, 845, p) - Math.sin(p * Math.PI) * 22;
      cell = 1 + (Math.floor(t * 10) % 2);
      angle = 0.55;
      phase = "diving";
    } else if (n < 7) {
      x = 1075;
      y = 845;
      cell = 2;
      angle = 0.55;
      fish = true;
      phase = "catching-fish";
    } else if (n < 9.4) {
      const p = smooth((n - 7) / 2.4);
      x = mix(1075, 890, p);
      y = mix(835, 700, p) - Math.sin(p * Math.PI) * 60;
      cell = 1 + (Math.floor(t * 10) % 2);
      flip = -1;
      angle = -0.25;
      fish = true;
      phase = "returning-with-fish";
    } else if (n < 12.4) {
      x = 890;
      y = 733 + Math.sin(t * 3) * 1.2;
      cell = 3;
      phase = "perched-with-fish";
    } else if (n < 15) {
      const p = smooth((n - 12.4) / 2.6);
      x = mix(890, 1600, p);
      y = mix(700, 150, p) - Math.sin(p * Math.PI) * 80;
      cell = 1 + (Math.floor(t * 10) % 2);
      angle = -0.25;
      fish = true;
      phase = "leaving";
    } else {
      canvas.dataset.bird = "resting";
      return;
    }
    canvas.dataset.bird = phase;
    if (!sprites[cell]) return;
    c.save();
    c.translate(x, y);
    c.rotate(angle);
    c.scale(flip, 1);
    const perched = cell === 0 || cell === 3;
    c.drawImage(
      sprites[cell],
      -size * 0.5,
      -size * (perched ? 0.665 : 0.5),
      size,
      size,
    );
    if (fish && cell !== 3) {
      c.save();
      c.translate(size * 0.41, -size * 0.09);
      c.rotate(0.3);
      c.fillStyle = "#d8e8e7";
      c.strokeStyle = "#62939b";
      c.lineWidth = 1;
      c.beginPath();
      c.ellipse(0, 7, 4, 10, 0, 0, 7);
      c.fill();
      c.stroke();
      c.beginPath();
      c.moveTo(0, 16);
      c.lineTo(-5, 23);
      c.lineTo(5, 23);
      c.closePath();
      c.fill();
      c.fillStyle = "#172d31";
      c.fillRect(0, 1, 1.5, 1.5);
      c.restore();
    }
    c.restore();
    if (n > 6.4 && n < 8) {
      const p = (n - 6.4) / 1.6;
      c.strokeStyle = `rgba(225,255,255,${(1 - p) * 0.75})`;
      c.lineWidth = 2;
      c.beginPath();
      c.ellipse(1115, 865, 14 + p * 38, 3 + p * 9, 0, 0, 7);
      c.stroke();
      for (let k = 0; k < 5; k++) {
        c.fillStyle = `rgba(224,255,255,${1 - p})`;
        c.beginPath();
        c.arc(
          1115 + Math.cos(k) * p * 20,
          860 - Math.sin(p * Math.PI) * 18 - k * 2,
          1.5,
          0,
          7,
        );
        c.fill();
      }
    }
  }
  function paint(ms) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const w = Math.min(1200, Math.round(r.width)),
      h = Math.round((r.height * w) / r.width);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c.clearRect(0, 0, w, h);
    const scale = Math.max(w / 1536, h / 1024),
      ox = (w - 1536 * scale) * 0.6,
      oy = (h - 1024 * scale) * 0.5,
      t = ms / 1000;
    c.save();
    c.setTransform(scale, 0, 0, scale, ox, oy);
    if (water) {
      c.globalAlpha = 0.72;
      const step = quality() === "Low" ? 18 : 10;
      for (let y = 500; y < 1024; y += step) {
        const sh = Math.min(step, 1024 - y),
          dx = Math.sin(t * 1.3 + y * 0.03) * 3,
          dy = Math.sin(t * 1.7 + y * 0.02) * 2;
        c.drawImage(water, 640, y, 560, sh, 640 + dx, y + dy, 560, sh + 1);
      }
      c.globalAlpha = 1;
    }
    plant(4, 120, 0, 270, 430, Math.sin(t * 0.7) * 0.035, 0);
    if (quality() !== "Low")
      plant(4, 1330, -10, 340, 560, Math.sin(t * 0.58 + 2) * 0.04, 0);
    plant(5, 90, 1050, 410, 430, Math.sin(t * 0.62) * 0.036, 1);
    if (sprites.length === 6) {
      canvas.dataset.ready = "true";
      bird(motion() ? t : 3);
    }
    c.restore();
    canvas.dataset.frame = String(ms);
  }
  function frame(t) {
    if (!running || document.hidden) return;
    if (
      t - last >=
      (quality() === "Low" ? 100 : quality() === "High" ? 33 : 50)
    ) {
      paint(motion() ? t - startTime : 3000);
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
    if (document.body.classList.contains("playing") || document.hidden) return;
    startTime = performance.now();
    canvas.dataset.active = motion() ? "true" : "static";
    if (!motion()) {
      paint(3000);
      return;
    }
    running = true;
    raf = requestAnimationFrame(frame);
  }
  const obs = new MutationObserver(start);
  obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  document.addEventListener("visibilitychange", start);
  window.addEventListener("resize", start);
  start();
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
