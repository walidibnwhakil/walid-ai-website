// The room, detective, pipe and cat are the painted artwork.
// A light wisp rises from the pipe already in his hand. The notebook and
// printer are drawn on top. There is no second cat and no hookah.

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
  },
  portrait: {
    happy: "./images/approved/face-portrait-happy.webp",
    sad: "./images/approved/face-portrait-sad.webp",
    worried: "./images/approved/face-portrait-worried.webp",
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
  const catLife = { blink: 0, nextBlink: rand(3.4, 6.5), tail: 0, nextTail: rand(4, 8), tailAmp: 0.006 };
  let mood = "curious";
  const moodShown = { lift: 0, sad: 0, happy: 0, think: 0 };
  let blink = 0;
  let nextBlink = rand(2.2, 5);
  let flash = null;
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  const expr = { happy: 0, sad: 0, worried: 0, serious: 0, confused: 0 };
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
  function approachMood(dt) {
    const goal = {
      lift: mood === "surprised" ? -1 : mood === "sad" || mood === "defeated" ? 0.65 : mood === "confused" ? 0.35 : 0,
      sad: mood === "sad" || mood === "defeated" ? 1 : 0,
      happy: mood === "happy" || mood === "confident" ? 1 : 0,
      think: mood === "thinking" || mood === "curious" ? 1 : 0,
    };
    const blend = 1 - Math.exp(-dt * 7);
    for (const key of Object.keys(goal)) moodShown[key] += (goal[key] - moodShown[key]) * blend;
  }
  function nudge(box, du, dv, source) {
    const room = source || (portraitMode && images.portrait ? images.portrait : images.room);
    if (!room) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix(box[0]), iy(box[1]), view.w * box[2], view.h * box[3]);
    ctx.clip();
    ctx.drawImage(room, view.x + view.w * du, view.y + view.h * dv, view.w, view.h);
    ctx.restore();
  }

  function eyelid(cx, cy, rw, rh, amount) {
    const room = currentArt();
    if (!room || amount < 0.05) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ix(cx), iy(cy), view.w * rw, view.h * rh, 0, 0, Math.PI * 2);
    ctx.clip();
    const srcY = cy - rh * 1.35;
    const srcH = rh * 0.85;
    ctx.drawImage(
      room,
      (cx - rw) * room.width,
      Math.max(0, srcY) * room.height,
      rw * 2 * room.width,
      srcH * room.height,
      ix(cx - rw),
      iy(cy - rh),
      view.w * rw * 2,
      view.h * rh * 2 * amount,
    );
    ctx.restore();
  }

  function coverEyes(cx, cy, rw, rh, amount) {
    const room = currentArt();
    if (!room || amount < 0.08) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ix(cx), iy(cy), view.w * rw, view.h * rh * amount, 0, 0, Math.PI * 2);
    ctx.clip();
    const fur = Math.max(0, cy - 0.05);
    ctx.drawImage(
      room,
      (cx - rw) * room.width,
      fur * room.height,
      rw * 2 * room.width,
      rh * room.height,
      ix(cx - rw),
      iy(cy - rh * amount),
      view.w * rw * 2,
      view.h * rh * 2 * amount,
    );
    ctx.restore();
  }

  const REACT = {
  yes: ["happy", 0.82],
  probably: ["happy", 0.46],
  no: ["serious", 0.92],
  probably_not: ["serious", 0.5],
  unknown: ["confused", 0.9],
};

  function react(answer) {
    const spec = REACT[answer];
    if (!spec) return;
    flash = { key: spec[0], peak: spec[1], life: 1.05 };
  }

  function stepExpr(dt) {
    // Win and a wrong guess hold. An answer only flashes, then thinking is the neutral face.
    let goal = "";
    let peak = 1;
    if (mood === "happy" || mood === "confident") goal = "happy";
    else if (mood === "sad" || mood === "defeated") goal = "sad";
    else if (flash) {
      const plates = images.overlays || {};
      const key = plates[flash.key] ? flash.key : (flash.key === "serious" && plates.worried ? "worried" : "");
      if (key) {
        goal = key;
        const fade = flash.life < 0.32 ? Math.max(0, flash.life / 0.32) : 1;
        peak = flash.peak * fade;
      }
      flash.life -= dt;
      if (flash.life <= 0) flash = null;
    }
    const blend = 1 - Math.exp(-dt / 0.2);
    for (const key of Object.keys(expr)) expr[key] += ((goal === key ? peak : 0) - expr[key]) * blend;
  }

  function drawExpr() {
    const box = FACE[portraitMode ? "portrait" : "landscape"];
    const plates = images.overlays || {};
    for (const key of ["worried", "confused", "serious", "sad", "happy"]) {
      const plate = plates[key];
      if (!plate || (expr[key] || 0) < 0.03) continue;
      ctx.save();
      ctx.globalAlpha = expr[key];
      ctx.drawImage(plate, ix(box.u), iy(box.v), view.w * box.w, view.h * box.h);
      ctx.restore();
    }
  }

  const CAT_FACE = {
    landscape: { u: 0.67464, v: 0.33794, w: 0.14354, h: 0.18278 },
    portrait: { u: 0.72222, v: 0.35313, w: 0.20556, h: 0.10781 },
  };

  function stepCat(dt) {
    if (reveal) return;
    catLife.nextBlink -= dt;
    if (catLife.nextBlink <= 0) {
      catLife.blink = 1;
      catLife.nextBlink = rand(4.5, 9);
    }
    if (catLife.blink > 0) catLife.blink -= dt * 6.5;
    catLife.nextTail -= dt;
    if (catLife.nextTail <= 0 && catLife.tail <= 0) {
      catLife.tail = 1;
      catLife.tailAmp = rand(0.004, 0.009);
      catLife.nextTail = rand(6, 12);
    }
    if (catLife.tail > 0) catLife.tail -= dt * 0.85;
  }

  function drawLife(time) {
    const base = currentArt();
    if (!base) return;
    const breath = Math.sin(time * 1.35) * 0.008;
    const body = portraitMode ? [0.18, 0.30, 0.55, 0.10] : [0.36, 0.27, 0.30, 0.14];
    nudge(body, 0, -Math.max(0, breath), base);
    const shut = blink > 0 ? Math.sin(Math.min(1, blink) * Math.PI) : 0;
    const showingFace = Math.max(expr.happy, expr.sad, expr.worried, expr.serious, expr.confused) > 0.35;
    if (!showingFace) {
      const sway = Math.sin(time * 0.45) * 0.007;
      nudge(portraitMode ? [0.28, 0.12, 0.44, 0.22] : [0.42, 0.05, 0.18, 0.22], sway, 0, base);
      if (!portraitMode) {
        eyelid(0.505, 0.205, 0.018, 0.012, shut);
        eyelid(0.545, 0.208, 0.014, 0.010, shut);
      }
    }
    const catBody = portraitMode ? [0.62, 0.32, 0.30, 0.12] : [0.68, 0.34, 0.26, 0.14];
    nudge(catBody, 0, -Math.max(0, Math.sin(time * 1.5 + 1) * 0.004), base);
    if (catLife.tail > 0) {
      const sway = Math.sin((1 - Math.max(0, catLife.tail)) * Math.PI) * catLife.tailAmp;
      const tail = portraitMode ? [0.86, 0.34, 0.08, 0.06] : [0.84, 0.38, 0.09, 0.07];
      nudge(tail, sway, sway * 0.35, base);
    }
    const catShut = catLife.blink > 0 ? Math.sin(Math.min(1, catLife.blink) * Math.PI) : 0;
    const catCrop = images.overlays && images.overlays.cat;
    if (catCrop && catShut > 0.04) {
      const box = CAT_FACE[portraitMode ? "portrait" : "landscape"];
      ctx.save();
      ctx.globalAlpha = Math.min(1, catShut * 1.15);
      ctx.drawImage(catCrop, ix(box.u), iy(box.v), view.w * box.w, view.h * box.h);
      ctx.restore();
    } else if (catShut > 0.05) {
      const shutEyes = portraitMode
        ? [[0.90, 0.445], [0.948, 0.448]]
        : [[0.720, 0.400], [0.753, 0.404]];
      for (const [cx, cy] of shutEyes) coverEyes(cx, cy, portraitMode ? 0.03 : 0.016, portraitMode ? 0.016 : 0.01, catShut);
    }
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
    approachMood(dt);
    stepExpr(dt);
    resize();
    const wantOrient = canvas.width / Math.max(1, canvas.height) < 0.8 ? "portrait" : "landscape";
    if (images.baseOrient && wantOrient !== images.baseOrient && !images.swapping) {
      images.swapping = true;
      useOrient(wantOrient).finally(() => { images.swapping = false; });
    }
    const art = currentArt();
    ctx.fillStyle = "#1a100c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (art) {
      ctx.drawImage(art, view.x, view.y, view.w, view.h);
      const gapTop = view.y + view.h;
      if (!portraitMode && canvas.height - gapTop > 2) {
        const fade = ctx.createLinearGradient(0, gapTop - 2, 0, canvas.height);
        fade.addColorStop(0, "#6b3a1c");
        fade.addColorStop(1, "#2a160e");
        ctx.fillStyle = fade;
        ctx.fillRect(0, gapTop - 2, canvas.width, canvas.height - gapTop + 2);
      }
    }
    if (!reduce) drawSmoke(dt);
    if (!reduce) stepCat(dt);
    updateReveal(dt);
    if (!reduce) drawLife(clock);
    drawExpr();
    const hands = portraitMode ? [0.28, 0.28, 0.44, 0.12] : [0.42, 0.30, 0.24, 0.13];
    if (reveal?.phase === "write") {
      nudge(hands, Math.sin(clock * 16) * 0.01, Math.sin(clock * 16) * 0.003);
    }
    drawReveal();
    nextBlink -= dt;
    if (nextBlink <= 0) {
      blink = 1;
      nextBlink = rand(2.4, 6);
    }
    if (blink > 0) blink -= dt * 6;
    raf = requestAnimationFrame(frame);
  }

  function screenOrient() {
    const rect = canvas.getBoundingClientRect();
    const ratio = rect.width > 0 ? rect.width / Math.max(1, rect.height) : 1;
    if (rect.width > 0) return ratio < 0.8 ? "portrait" : "landscape";
    return matchMedia("(max-aspect-ratio: 4/5)").matches ? "portrait" : "landscape";
  }

  let overlayToken = 0;
  function lazyOverlays(orient) {
    const token = ++overlayToken;
    const jobs = Object.entries(OVERLAYS[orient] || {});
    const run = () => {
      if (token !== overlayToken) return;
      for (const [key, src] of jobs) {
        loadImage(src).then((image) => {
          if (token !== overlayToken || !image) return;
          images.overlays[key] = image;
        });
      }
      if (!images.printer) {
        loadImage(PRINTER).then((image) => {
          if (image) images.printer = image;
        });
      }
    };
    requestAnimationFrame(() => requestAnimationFrame(run));
  }

  async function useOrient(orient) {
    if (images.baseOrient === orient && images.base) return;
    const image = await loadImage(BASE[orient]);
    if (!image) return;
    images.base = image;
    images.baseOrient = orient;
    if (orient === "portrait") images.portrait = image;
    else images.room = image;
    images.overlays = {};
    lazyOverlays(orient);
  }

  async function start() {
    await useOrient(screenOrient());
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
    reveal = null;
    return Promise.resolve();
  }

  function playDefeat() {
    mood = "defeated";
    reveal = null;
  }

  function clearReveal() {
    reveal = null;
  }

  return {
    start, stop, resize,
    setMood(value) { mood = value; },
    react,
    blinkCat() { catLife.blink = 0.55; },
    playReveal, playWrong, playRetry, playDefeat, clearReveal,
  };
}
