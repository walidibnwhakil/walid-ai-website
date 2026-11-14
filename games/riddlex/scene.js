// The room, detective, pipe and cat are one painted picture.
// Breathing is a slight scale of that whole picture, anchored at the floor.
// Face and cat plates cross-fade with opacity and share that same transform.
// Nothing is ever a shifted rectangle of the painting.

import { createExpressions } from "./expressions.js?v=akinator-15";

const BASE = {
  landscape: "./images/approved/game-desk.webp",
  portrait: "./images/approved/portrait-neutral.webp",
};
const PRINTER = "./images/approved/printer.png";
// Feathered face crops, one orientation only. Loaded after the first paint.
const OVERLAYS = {
  landscape: {
    happy: "./images/approved/face-landscape-happy.webp",
    sad: "./images/approved/face-landscape-sad.webp",
    worried: "./images/approved/face-landscape-worried.webp",
    serious: "./images/approved/face-landscape-serious.webp",
    confused: "./images/approved/face-landscape-confused.webp",
    cat: "./images/approved/cat-landscape-blink.webp",
  },
  portrait: {
    happy: "./images/approved/face-portrait-happy.webp",
    sad: "./images/approved/face-portrait-sad.webp",
    worried: "./images/approved/face-portrait-worried.webp",
    serious: "./images/approved/face-portrait-serious.webp",
    confused: "./images/approved/face-portrait-confused.webp",
    cat: "./images/approved/cat-portrait-blink.webp",
  },
};
const FACE = {
  landscape: { u: 0.36902, v: 0.0255, w: 0.32177, h: 0.37938 },
  portrait: { u: 0.23889, v: 0.13047, w: 0.52222, h: 0.25938 },
};

function loadImage(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function createScene(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const images = {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const puff = document.createElement("canvas");
  puff.width = puff.height = 32;
  const puffCtx = puff.getContext("2d");
  const puffGrad = puffCtx.createRadialGradient(16, 16, 2, 16, 16, 16);
  puffGrad.addColorStop(0, "rgba(255,255,255,0.45)");
  puffGrad.addColorStop(1, "rgba(255,255,255,0)");
  puffCtx.fillStyle = puffGrad;
  puffCtx.fillRect(0, 0, 32, 32);

  let portraitMode = false;
  const smoke = Array.from({ length: 5 }, () => makePuff(true));
  const catLife = { blink: 0, nextBlink: rand(3.4, 6.5) };
  const faces = createExpressions();
  let faceNow = faces.picture();
  let mood = "curious";
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  const ink = document.createElement("canvas");
  const mask = document.createElement("canvas");

  function makePuff(scatter) {
    return {
      x: (portraitMode ? 0.58 : 0.592) + rand(-0.004, 0.004),
      y: scatter ? rand(0.16, 0.25) : (portraitMode ? 0.275 : 0.255),
      vx: rand(-0.003, 0.003),
      vy: rand(-0.018, -0.008),
      life: scatter ? Math.random() * 2.4 : 0,
      max: rand(2.2, 3.6),
      size: rand(7, 13),
      wobble: rand(0, 6),
    };
  }

  function ix(u) { return view.x + view.w * u; }
  function iy(v) { return view.y + view.h * v; }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = Math.max(320, Math.round(rect.width * dpr));
    const height = Math.max(180, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    layoutRoom();
  }

  function currentArt() {
    const narrow = canvas.width / Math.max(1, canvas.height) < 0.8;
    if (narrow && images.portrait) return images.portrait;
    if (!narrow && images.room) return images.room;
    return images.base || null;
  }

  function layoutRoom() {
    const cw = canvas.width;
    const ch = canvas.height;
    const art = currentArt();
    portraitMode = !!(art && cw / ch < 0.8);
    if (!art) {
      view = { x: 0, y: 0, w: cw, h: ch };
    } else {
      const scale = Math.max(cw / art.width, ch / art.height);
      const w = art.width * scale;
      const h = art.height * scale;
      let x = 0;
      let y = (ch - h) / 2;
      if (!portraitMode) {
        x = cw * 0.50 - w * 0.52;
        y = ch * 0.42 - h * 0.38;
        const logoPad = Math.max(8, cw * 0.012);
        if (x + w * 0.03 < logoPad) x = logoPad - w * 0.03;
      }
      x = Math.min(0, Math.max(cw - w, x));
      y = Math.min(0, Math.max(ch - h, y));
      view = { x, y, w, h };
    }
    const parent = canvas.parentElement;
    if (!parent || !cw || !ch) return;
    const spot = portraitMode
      ? { bu: 0.03, bv: 0.20, dv: 0.455 }
      : { bu: 0.05, bv: 0.15, dv: 0.58 };
    const bubbleLeft = (view.x + view.w * spot.bu) / cw;
    parent.style.setProperty("--bubble-left", Math.max(10 / cw, bubbleLeft).toFixed(4));
    parent.style.setProperty("--bubble-top", ((view.y + view.h * spot.bv) / ch).toFixed(4));
    parent.style.setProperty("--desk-y", ((view.y + view.h * spot.dv) / ch).toFixed(4));
    parent.classList.toggle("portrait-scene", portraitMode);
  }

  function drawSmoke(dt) {
    for (const particle of smoke) {
      particle.life += dt;
      if (particle.life > particle.max || particle.y < 0.12) Object.assign(particle, makePuff(false));
      particle.x += particle.vx * dt + Math.sin(clock * 1.4 + particle.wobble) * 0.004 * dt;
      particle.y += particle.vy * dt;
      const alpha = Math.sin((particle.life / particle.max) * Math.PI) * 0.12;
      const size = particle.size * (view.w / 900);
      ctx.globalAlpha = alpha;
      ctx.drawImage(puff, ix(particle.x) - size / 2, iy(particle.y) - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function easeOut(p) {
    return 1 - (1 - p) ** 3;
  }

  function drawPlate(plate, box, alpha) {
    if (!plate || alpha < 0.02) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(plate, ix(box.u), iy(box.v), view.w * box.w, view.h * box.h);
    ctx.restore();
  }

  function drawFaces() {
    const box = FACE[portraitMode ? "portrait" : "landscape"];
    const plates = images.overlays || {};
    const levels = faceNow.levels || {};
    for (const key of ["worried", "confused", "serious", "sad", "happy"]) {
      drawPlate(plates[key], box, levels[key] || 0);
    }
    const catShut = !reduce && catLife.blink > 0 ? Math.sin(Math.min(1, catLife.blink) * Math.PI) : 0;
    drawPlate(plates.cat, CAT_FACE[portraitMode ? "portrait" : "landscape"], catShut);
  }

  const CAT_FACE = {
    landscape: { u: 0.69318, v: 0.36132, w: 0.11962, h: 0.11158 },
    portrait: { u: 0.69444, v: 0.36719, w: 0.29167, h: 0.14063 },
  };

  function stepCat(dt) {
    if (reveal || reduce) return;
    catLife.nextBlink -= dt;
    if (catLife.nextBlink <= 0) {
      catLife.blink = 1;
      catLife.nextBlink = rand(4.2, 7.5);
    }
    if (catLife.blink > 0) catLife.blink -= dt * 2.4;
  }

  function prepareInk(name, font) {
    const w = Math.round(view.w * (portraitMode ? 0.52 : 0.24));
    const h = Math.round(view.h * (portraitMode ? 0.05 : 0.12));
    ink.width = w;
    ink.height = h;
    mask.width = w;
    mask.height = h;
    const g = ink.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#24160f";
    g.font = font;
    g.textBaseline = "middle";
    let size = Math.round(h * 0.42);
    g.font = font.replace(/\d+px/, `${size}px`);
    while (g.measureText(name).width > w - 16 && size > 12) {
      size -= 2;
      g.font = font.replace(/\d+px/, `${size}px`);
    }
    g.fillText(name, 8, h * 0.55);
    mask.getContext("2d").clearRect(0, 0, w, h);
    return { w, h, width: Math.max(20, g.measureText(name).width) };
  }

  function drawSheet(turn) {
    const u = Math.max(0, Math.min(1, turn));
    const x = ix(portraitMode ? 0.50 : 0.49);
    const y = iy(portraitMode ? 0.64 + 0.02 * u : 0.56 - 0.18 * u);
    const w = view.w * (portraitMode ? 0.50 + 0.10 * u : 0.26 + 0.08 * u);
    const h = view.h * (portraitMode ? 0.07 + 0.015 * u : 0.16 + 0.05 * u);
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI * (1 - u));
    ctx.scale(1, 0.55 + 0.45 * u);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "rgba(40,20,10,0.22)";
    ctx.beginPath();
    ctx.roundRect(10, 12, w, h, 10);
    ctx.fill();
    ctx.fillStyle = "#f6ead2";
    ctx.strokeStyle = "#8a6844";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(170,130,90,0.35)";
    for (let line = 1; line <= 4; line++) {
      ctx.beginPath();
      ctx.moveTo(14, h * line / 5);
      ctx.lineTo(w - 14, h * line / 5);
      ctx.stroke();
    }
    if (reveal?.page) {
      const maxW = w - 36;
      const maxH = h * 0.62;
      const scale = Math.min(maxW / reveal.page.w, maxH / reveal.page.h, 1.4);
      ctx.drawImage(reveal.page.canvas, 18, h * 0.2, reveal.page.w * scale, reveal.page.h * scale);
    }
    if (reveal?.printed && reveal.photo) {
      const pw = w * 0.34;
      const ph = h * 0.72;
      ctx.fillStyle = "#fff";
      ctx.fillRect(w - pw - 16, h * 0.14, pw, ph);
      ctx.drawImage(reveal.photo, w - pw - 12, h * 0.16, pw - 8, ph * 0.7);
    }
    ctx.restore();
  }

  function drawPrintedPhoto(progress) {
    const printer = images.printer;
    if (!printer || !reveal?.photo) return;
    const pw = view.w * 0.16;
    const ph = pw * (printer.height / printer.width);
    const px = ix(portraitMode ? 0.68 : 0.62);
    const py = iy(portraitMode ? 0.46 : 0.48);
    ctx.drawImage(printer, px, py, pw, ph);
    const slide = easeOut(Math.min(1, progress));
    const photoW = pw * 0.72;
    const photoH = photoW * 0.75;
    const photoX = px + pw * 0.14;
    const photoY = py + ph * 0.55 + slide * view.h * 0.08;
    ctx.save();
    ctx.translate(photoX, photoY);
    ctx.transform(1, 0, -0.18 * (1 - slide), 1, 0, 0);
    ctx.fillStyle = "#f7f1e4";
    ctx.fillRect(0, 0, photoW, photoH);
    ctx.drawImage(reveal.photo, 4, 4, photoW - 8, photoH * 0.72);
    ctx.strokeStyle = "#d9c7a4";
    ctx.strokeRect(0, 0, photoW, photoH);
    ctx.restore();
  }

  function drawPresent() {
    const name = reveal.name;
    ctx.save();
    ctx.translate(ix(0.50), iy(0.64));
    ctx.scale(reveal.present || 1, reveal.present || 1);
    ctx.fillStyle = "#fff8ea";
    ctx.strokeStyle = "#8d6844";
    ctx.lineWidth = 3;
    const w = view.w * 0.26;
    const h = view.h * 0.16;
    ctx.beginPath();
    ctx.roundRect(-w, -h / 2, w * 0.95, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#24160f";
    ctx.font = reveal.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, -w * 0.52, 0, w * 0.8);
    if (reveal.photo && reveal.printed) {
      const pw = w * 0.7;
      const ph = h * 1.15;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(w * 0.05, -ph / 2, pw, ph, 6);
      ctx.fill();
      ctx.drawImage(reveal.photo, w * 0.08, -ph / 2 + 6, pw - 12, ph * 0.72);
    }
    ctx.restore();
  }

  function updateReveal(dt) {
    if (!reveal) return;
    reveal.t += dt;
    if (reveal.phase === "write") {
      const p = Math.min(1, reveal.t / reveal.writeDur);
      const mg = mask.getContext("2d");
      const shown = Math.max(1, Math.ceil((reveal.name || "").length * p));
      const slice = ink.getContext("2d").measureText((reveal.name || "").slice(0, shown)).width + 10;
      mg.fillStyle = "#000";
      mg.fillRect(0, 0, slice, ink.height);
      if (!reveal.scratch) {
        reveal.scratch = document.createElement("canvas");
        reveal.scratch.width = ink.width;
        reveal.scratch.height = ink.height;
      }
      const sg = reveal.scratch.getContext("2d");
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.globalCompositeOperation = "source-over";
      sg.clearRect(0, 0, ink.width, ink.height);
      sg.drawImage(ink, 0, 0);
      sg.globalCompositeOperation = "destination-in";
      sg.drawImage(mask, 0, 0);
      reveal.page = { canvas: reveal.scratch, w: ink.width, h: ink.height, penX: 8 + reveal.inkWidth * p };
      if (p >= 1) {
        reveal.phase = reveal.imageUrl && reveal.photo ? "print" : "turn";
        reveal.t = 0;
        reveal.printed = false;
      }
    } else if (reveal.phase === "print") {
      if (reveal.t > 1.35) {
        reveal.phase = "turn";
        reveal.t = 0;
        reveal.printed = true;
      }
    } else if (reveal.phase === "turn") {
      if (reveal.t > 0.85) {
        reveal.phase = "present";
        reveal.t = 0;
      }
    } else if (reveal.phase === "present") {
      reveal.present = 0.92 + Math.min(0.18, reveal.t * 0.4);
      if (reveal.t > 0.45 && !reveal.done) {
        reveal.done = true;
        reveal.resolve({ printed: !!reveal.printed });
      }
    } else if (reveal.phase === "wrong") {
      if (reveal.t > 1.15 && !reveal.done) {
        reveal.done = true;
        reveal.resolve();
      }
    } else if (reveal.phase === "retry") {
      if (!reveal.done) {
        reveal.done = true;
        reveal.resolve();
        reveal = null;
      }
    }
  }

  function drawDismiss(u) {
    const fade = 1 - u;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(-view.w * 0.03 * u, -view.h * 0.12 * u);
    drawSheet(1);
    ctx.restore();
  }

  function drawReveal() {
    if (!reveal) return;
    if (reveal.phase === "write" || reveal.phase === "print") {
      drawSheet(0);
      if (reveal.phase === "print") drawPrintedPhoto(reveal.t / 1.1);
    } else if (reveal.phase === "turn") {
      drawSheet(easeOut(Math.min(1, reveal.t / 0.8)));
    } else if (reveal.phase === "present") {
      drawSheet(1);
    } else if (reveal.phase === "wrong" && reveal.t < 1.05) {
      drawDismiss(Math.min(1, reveal.t / 1.0));
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.034, (now - (frame.last || now)) / 1000 || 0.016);
    frame.last = now;
    clock += dt;
    resize();
    const wantOrient = canvas.width / Math.max(1, canvas.height) < 0.8 ? "portrait" : "landscape";
    if (images.cache?.[wantOrient] && images.baseOrient !== wantOrient) applyPack(wantOrient);
    const plates = images.overlays || {};
    faceNow = faces.step(dt, (key) => !!plates[key]);
    const art = currentArt();
    ctx.fillStyle = "#1a100c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    // At most ±0.4% so the whole room, detective and cat stay one piece.
    if (!reduce) {
      const scale = 1 + Math.sin(clock * 1.05) * 0.004;
      const ax = view.x + view.w * 0.5;
      const ay = view.y + view.h;
      ctx.translate(ax, ay);
      ctx.scale(scale, scale);
      ctx.translate(-ax, -ay);
    }
    if (art) ctx.drawImage(art, view.x, view.y, view.w, view.h);
    if (!reduce) drawSmoke(dt);
    if (!reduce) stepCat(dt);
    updateReveal(dt);
    drawFaces();
    drawReveal();
    ctx.restore();
    if (art && !portraitMode) {
      const gapTop = view.y + view.h;
      if (canvas.height - gapTop > 2) {
        const fade = ctx.createLinearGradient(0, gapTop - 2, 0, canvas.height);
        fade.addColorStop(0, "#6b3a1c");
        fade.addColorStop(1, "#2a160e");
        ctx.fillStyle = fade;
        ctx.fillRect(0, gapTop - 2, canvas.width, canvas.height - gapTop + 2);
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function screenOrient() {
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? rect.width / Math.max(1, rect.height) : 1;
    if (rect.width > 0) return ratio < 0.8 ? "portrait" : "landscape";
    return matchMedia("(max-aspect-ratio: 4/5)").matches ? "portrait" : "landscape";
  }

  function applyPack(orient) {
    const pack = images.cache?.[orient];
    if (!pack?.base) return;
    images.base = pack.base;
    images.baseOrient = orient;
    images.overlays = pack.overlays || {};
    if (orient === "portrait") images.portrait = pack.base;
    else images.room = pack.base;
  }

  async function loadOverlaySet(orient) {
    const entries = await Promise.all(Object.entries(OVERLAYS[orient] || {}).map(async ([key, src]) => {
      return [key, await loadImage(`${src}?v=akinator-15`)];
    }));
    const overlays = {};
    for (const [key, image] of entries) if (image) overlays[key] = image;
    return overlays;
  }

  async function loadPack(orient) {
    const [base, overlays, printer] = await Promise.all([
      loadImage(BASE[orient]),
      loadOverlaySet(orient),
      images.printer ? Promise.resolve(images.printer) : loadImage(`${PRINTER}?v=akinator-15`),
    ]);
    if (printer) images.printer = printer;
    return { base, overlays };
  }

  async function start() {
    const orient = screenOrient();
    images.cache = images.cache || {};
    if (!images.cache[orient]) images.cache[orient] = await loadPack(orient);
    applyPack(orient);
    const other = orient === "portrait" ? "landscape" : "portrait";
    if (!images.cache[other]) {
      loadPack(other).then((pack) => { images.cache[other] = pack; }).catch(() => {});
    }
    resize();
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  async function playReveal(options) {
    const font = options.font || '400 28px "Times New Roman", serif';
    const photo = options.imageUrl ? await loadImage(options.imageUrl) : null;
    const prepared = prepareInk(options.name || "?", font);
    reveal = {
      phase: reduce ? "present" : "write",
      t: 0,
      name: options.name || "?",
      font,
      imageUrl: photo ? options.imageUrl : "",
      photo,
      printed: false,
      writeDur: reduce ? 0.01 : Math.min(2.6, Math.max(1.15, (options.name || "").length * 0.09)),
      inkWidth: prepared.width,
      present: 1,
      page: null,
      resolve: () => {},
      done: false,
    };
    mood = "confident";
    faces.setMood("confident");
    if (reduce) {
      reveal.printed = !!photo;
      reveal.done = true;
      return { printed: !!photo };
    }
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  function playWrong() {
    mood = "sad";
    faces.setMood("sad");
    if (!reveal) reveal = { page: null, name: "" };
    reveal.phase = "wrong";
    reveal.t = 0;
    reveal.done = false;
    if (reduce) return Promise.resolve();
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  function playRetry() {
    mood = "curious";
    faces.setMood("curious");
    reveal = null;
    return Promise.resolve();
  }

  function playDefeat() {
    mood = "defeated";
    faces.setMood("defeated");
    reveal = null;
  }

  function clearReveal() {
    reveal = null;
  }

  return {
    start, stop, resize,
    setMood(value) { mood = value; faces.setMood(value); },
    react(answer) { return faces.react(answer); },
    blinkCat() { catLife.blink = 0.62; },
    debug() {
      return {
        expression: faces.picture(),
        plates: Object.keys(images.overlays || {}),
        orient: images.baseOrient || "",
        portrait: portraitMode,
      };
    },
    playReveal, playWrong, playRetry, playDefeat, clearReveal,
  };
}
