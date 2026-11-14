// The room, detective, pipe and cat are one painted picture.
// Breathing is a slight scale of that whole picture, anchored at the floor.
// Face and cat plates cross-fade with opacity and share that same transform.
// Nothing is ever a shifted rectangle of the painting.

import { createExpressions } from "./expressions.js?v=akinator-18";

const BASE = {
  landscape: "./images/approved/game-desk.webp",
  portrait: "./images/approved/portrait-neutral.webp",
};
const PRINTER = "./images/approved/printer.webp";
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
  let logoSprite = null;
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
      let scale = Math.max(cw / art.width, ch / art.height);
      let x = 0;
      let y = (ch - art.height * scale) / 2;
      if (portraitMode) {
        // Close-up: hat to a short strip of desk fills the space above the answers.
        const chrome = phoneChrome();
        const hatV = 0.118;
        const deskV = 0.495;
        const topY = chrome.logo + chrome.dpr * 2;
        const bottomY = ch - chrome.buttons - chrome.dpr * 2;
        scale = Math.max(0.4, (bottomY - topY) / ((deskV - hatV) * art.height));
        const span = cw / (art.width * scale);
        const u0 = Math.max(0.08, Math.min(0.36, 0.52 - span / 2));
        view = {
          x: -art.width * u0 * scale,
          y: topY - hatV * art.height * scale,
          w: art.width * scale,
          h: art.height * scale,
        };
      } else {
        const w = art.width * scale;
        const h = art.height * scale;
        x = cw * 0.50 - w * 0.52;
        y = ch * 0.42 - h * 0.38;
        const logoPad = Math.max(8, cw * 0.012);
        if (x + w * 0.03 < logoPad) x = logoPad - w * 0.03;
        x = Math.min(0, Math.max(cw - w, x));
        y = Math.min(0, Math.max(ch - h, y));
        view = { x, y, w, h };
      }
    }
    const parent = canvas.parentElement;
    if (!parent || !cw || !ch) return;
    const face = FACE[portraitMode ? "portrait" : "landscape"];
    const cat = CAT_FACE[portraitMode ? "portrait" : "landscape"];
    const spot = portraitMode
      ? { bu: 0.34, bv: face.v + face.h + 0.07, dv: 0.62 }
      : { bu: 0.63, bv: 0.035, dv: 0.60 };
    const frac = (u, v) => [(view.x + view.w * u) / cw, (view.y + view.h * v) / ch];
    const [bubbleLeft, bubbleTop] = frac(spot.bu, spot.bv);
    const [, chin] = frac(0, face.v + face.h);
    const belowFace = face.v + face.h + (portraitMode ? 0.02 : 0.04);
    const catPaws = cat.v + cat.h + 0.012;
    const [, hands] = frac(0, portraitMode ? Math.max(belowFace, catPaws) : belowFace);
    const [, catTop] = frac(0, Math.max(0.08, cat.v - 0.045));
    parent.style.setProperty("--bubble-left", Math.max(0.02, bubbleLeft).toFixed(4));
    parent.style.setProperty("--bubble-top", Math.max(0.02, bubbleTop).toFixed(4));
    parent.style.setProperty("--chin-y", chin.toFixed(4));
    parent.style.setProperty("--hands-y", hands.toFixed(4));
    parent.style.setProperty("--cat-top", catTop.toFixed(4));
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
    const w = Math.round(portraitMode ? canvas.width * 0.42 : view.w * 0.24);
    const h = Math.round(portraitMode ? canvas.width * 0.16 : view.h * 0.12);
    ink.width = w;
    ink.height = h;
    mask.width = w;
    mask.height = h;
    const g = ink.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#24160f";
    g.textAlign = "left";
    g.textBaseline = "middle";
    let size = Math.round(h * (portraitMode ? 0.72 : 0.42));
    g.font = font.replace(/\d+px/, `${size}px`);
    while (g.measureText(name).width > w * (portraitMode ? 0.88 : 0.92) && size > 14) {
      size -= 2;
      g.font = font.replace(/\d+px/, `${size}px`);
    }
    const textW = g.measureText(name).width;
    const textX = portraitMode ? Math.max(6, (w - textW) / 2) : 8;
    g.fillText(name, textX, h * 0.55);
    mask.getContext("2d").clearRect(0, 0, w, h);
    return { w, h, width: Math.max(20, textW), textX };
  }

  function phoneChrome() {
    const cssH = canvas.getBoundingClientRect().height || canvas.height;
    const dpr = canvas.height / Math.max(1, cssH);
    return {
      dpr,
      buttons: Math.round(258 * dpr),
      logo: Math.round(canvas.width * 0.145),
    };
  }

  function paperBox() {
    const chin = iy(FACE.portrait.v + FACE.portrait.h);
    const w = canvas.width * 0.40;
    const h = canvas.width * 0.155;
    const limit = canvas.height - phoneChrome().buttons - 8;
    const y = Math.min(chin + canvas.height * 0.012, limit - h);
    return { x: canvas.width * 0.08, y: Math.max(8, y), w, h };
  }

  function drawSheet(turn) {
    const u = Math.max(0, Math.min(1, turn));
    const held = portraitMode ? paperBox() : null;
    const x = held ? held.x + held.w / 2 : ix(0.50);
    const y = held ? held.y + held.h / 2 + (1 - u) * held.h * 0.2 : iy(0.58 - 0.20 * u);
    const w = held ? held.w : view.w * 0.30;
    const h = held ? held.h : view.h * 0.15;
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
      const maxW = portraitMode ? w * 0.9 : w - 36;
      const maxH = portraitMode ? h * 0.7 : h * 0.62;
      const scale = Math.min(maxW / reveal.page.w, maxH / reveal.page.h, portraitMode ? 4 : 1.4);
      const dw = reveal.page.w * scale;
      const dh = reveal.page.h * scale;
      const dx = portraitMode ? (w - dw) / 2 : 18;
      const dy = portraitMode ? (h - dh) / 2 : h * 0.2;
      ctx.drawImage(reveal.page.canvas, dx, dy, dw, dh);
    }
    ctx.restore();
  }

  function printerGeom() {
    const printer = images.printer;
    const ratio = printer ? printer.height / printer.width : 0.58;
    if (portraitMode) {
      const pw = canvas.width * 0.52;
      const ph = pw * ratio;
      const px = (canvas.width - pw) / 2;
      const py = canvas.height - ph - canvas.height * 0.13;
      return { px, py, pw, ph };
    }
    const pw = view.w * 0.20;
    const ph = pw * ratio;
    const px = ix(0.045);
    const py = iy(0.69) - ph;
    return { px, py, pw, ph };
  }

  function drawPhoneLogo() {
    const art = images.portrait;
    if (!portraitMode || !art) return;
    if (!logoSprite) {
      const sw = Math.round(art.width * 0.62);
      const sh = Math.round(art.height * 0.15);
      const sample = document.createElement("canvas");
      sample.width = sw;
      sample.height = sh;
      const g = sample.getContext("2d");
      g.drawImage(art, 0, 0, sw, sh, 0, 0, sw, sh);
      const img = g.getImageData(0, 0, sw, sh);
      const pix = img.data;
      let minX = sw;
      let minY = sh;
      let maxX = 0;
      let maxY = 0;
      for (let i = 0; i < pix.length; i += 4) {
        const r = pix[i];
        const gc = pix[i + 1];
        const b = pix[i + 2];
        const gold = r > 145 && gc > 95 && r > b + 35 && gc > b + 10;
        pix[i + 3] = gold ? 255 : 0;
        if (!gold) continue;
        const x = (i / 4) % sw;
        const y = (i / 4 - x) / sw;
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
      g.putImageData(img, 0, 0);
      const bw = Math.max(1, maxX - minX + 1);
      const bh = Math.max(1, maxY - minY + 1);
      logoSprite = document.createElement("canvas");
      logoSprite.width = bw;
      logoSprite.height = bh;
      logoSprite.getContext("2d").drawImage(sample, minX, minY, bw, bh, 0, 0, bw, bh);
    }
    const dw = Math.min(canvas.width * 0.78, phoneChrome().logo * (logoSprite.width / logoSprite.height));
    const dh = dw * (logoSprite.height / logoSprite.width);
    ctx.drawImage(logoSprite, (canvas.width - dw) / 2, phoneChrome().dpr * 2, dw, dh);
  }

  function drawPrinter() {
    const printer = images.printer;
    if (!printer || portraitMode) return;
    const { px, py, pw, ph } = printerGeom();
    const cx = px + pw * 0.50;
    const cy = py + ph * 0.90;
    const shade = ctx.createRadialGradient(cx, cy, pw * 0.04, cx, cy, pw * 0.62);
    shade.addColorStop(0, "rgba(28, 14, 6, 0.55)");
    shade.addColorStop(0.45, "rgba(28, 14, 6, 0.28)");
    shade.addColorStop(1, "rgba(28, 14, 6, 0)");
    ctx.save();
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.ellipse(cx, cy, pw * 0.62, Math.max(8, ph * 0.11), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(printer, px, py, pw, ph);
    ctx.restore();
  }

  function drawPrintout(progress, alpha) {
    if (!reveal?.photo || alpha < 0.02) return;
    const slide = easeOut(Math.min(1, Math.max(0, progress)));
    if (portraitMode || !images.printer) {
      const held = portraitMode ? paperBox() : null;
      const w = portraitMode ? canvas.width * 0.22 : view.w * 0.18;
      const h = w * (portraitMode ? 1.05 : 1.15);
      const x = portraitMode ? held.x + held.w + canvas.width * 0.03 : ix(0.14);
      const y = portraitMode ? held.y + (held.h - h) / 2 : iy(0.48);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = "rgba(32,16,8,0.28)";
      ctx.beginPath();
      ctx.ellipse(x + w * 0.5, y + h + 4, w * 0.36, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f6f1e6";
      ctx.strokeStyle = "#8a6844";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
      ctx.stroke();
      ctx.drawImage(reveal.photo, x + 8, y + 8, w - 16, h * 0.7);
      ctx.restore();
      return;
    }
    const { px, py, pw, ph } = printerGeom();
    const slotX = px + pw * 0.26;
    const slotY = py + ph * 0.62;
    const photoW = pw * 0.46;
    const photoH = photoW * 1.22;
    const out = photoH * (portraitMode ? 0.42 : 0.86) * slide;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.rect(slotX - 4, slotY - 1, photoW + 14, out + 16);
    ctx.clip();
    ctx.translate(slotX, slotY + out);
    ctx.transform(1, 0, -0.05 * (1 - slide), 1, 0, 0);
    ctx.fillStyle = "rgba(30,16,8,0.28)";
    ctx.fillRect(6, -photoH + 7, photoW, photoH);
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(0, -photoH, photoW, photoH);
    ctx.drawImage(reveal.photo, 5, -photoH + 5, photoW - 10, photoH * 0.7);
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
      const slice = (reveal.textX || 0) + ink.getContext("2d").measureText((reveal.name || "").slice(0, shown)).width + 2;
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
      if (reveal.t > 1.6) {
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
      if (reveal.phase === "print") drawPrintout(reveal.t / 1.45, 1);
    } else if (reveal.phase === "turn") {
      drawSheet(easeOut(Math.min(1, reveal.t / 0.8)));
      drawPrintout(1, 1);
    } else if (reveal.phase === "present") {
      drawSheet(1);
      drawPrintout(1, 1);
    } else if (reveal.phase === "wrong" && reveal.t < 1.05) {
      const gone = Math.min(1, reveal.t / 1.0);
      drawDismiss(gone);
      drawPrintout(1, 1 - gone);
    }
  }

  function drawPortrait(art) {
    const scale = view.w / art.width;
    const v0 = 0.118;
    const cut = 0.60;
    const srcX = Math.max(0, -view.x / scale);
    const srcW = Math.min(art.width - srcX, canvas.width / scale);
    const srcY = art.height * v0;
    const srcH = art.height * (cut - v0);
    ctx.drawImage(
      art, srcX, srcY, srcW, srcH,
      view.x + srcX * scale, view.y + srcY * scale, srcW * scale, srcH * scale,
    );
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
    if (art) {
      if (portraitMode) drawPortrait(art);
      else ctx.drawImage(art, view.x, view.y, view.w, view.h);
    }
    drawPhoneLogo();
    drawPrinter();
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
      return [key, await loadImage(`${src}?v=akinator-18`)];
    }));
    const overlays = {};
    for (const [key, image] of entries) if (image) overlays[key] = image;
    return overlays;
  }

  async function loadPack(orient) {
    const [base, overlays, printer] = await Promise.all([
      loadImage(BASE[orient]),
      loadOverlaySet(orient),
      images.printer ? Promise.resolve(images.printer) : loadImage(`${PRINTER}?v=akinator-18`),
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
      textX: prepared.textX || 0,
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
