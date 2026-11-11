// The room, detective, pipe and cat are the painted artwork.
// A light wisp rises from the pipe already in his hand. The notebook and
// printer are drawn on top. There is no second cat and no hookah.

const ART = {
  room: "./images/approved/game-desk.png",
  printer: "./images/approved/printer.png",
  ball: "./images/approved/crumpled.png",
};
// Optional expression plates. Same 1672×941 frame as the room, transparent
// everywhere except the replaced head. Missing files leave the painted face.
const EXPRESSIONS = {
  happy: "./images/approved/expressions/detective-happy.png",
  sad: "./images/approved/expressions/detective-sad.png",
  worried: "./images/approved/expressions/detective-worried.png",
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

  const smoke = Array.from({ length: 5 }, () => makePuff(true));
  const catAct = { kind: "idle", t: 0, next: rand(7, 12) };
  let mood = "curious";
  const moodShown = { lift: 0, sad: 0, happy: 0, think: 0 };
  let blink = 0;
  let nextBlink = rand(2.2, 5);
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  const ink = document.createElement("canvas");
  const mask = document.createElement("canvas");

  function makePuff(scatter) {
    return {
      x: 0.592 + rand(-0.004, 0.004),
      y: scatter ? rand(0.16, 0.25) : 0.255,
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

  function layoutRoom() {
    const room = images.room;
    const cw = canvas.width;
    const ch = canvas.height;
    if (!room) {
      view = { x: 0, y: 0, w: cw, h: ch };
    } else {
      const scale = Math.max(cw / room.width, ch / room.height);
      const w = room.width * scale;
      const h = room.height * scale;
      let x = cw * 0.46 - w * 0.50;
      let y = ch * 0.38 - h * 0.36;
      x = Math.min(0, Math.max(cw - w, x));
      y = Math.min(0, Math.max(ch - h, y));
      view = { x, y, w, h };
    }
    const parent = canvas.parentElement;
    if (!parent || !cw || !ch) return;
    const mouthX = (view.x + view.w * 0.46) / cw;
    const mouthY = (view.y + view.h * 0.30) / ch;
    const deskY = (view.y + view.h * 0.60) / ch;
    parent.style.setProperty("--mouth-x", mouthX.toFixed(4));
    parent.style.setProperty("--mouth-y", mouthY.toFixed(4));
    parent.style.setProperty("--desk-y", Math.min(0.72, Math.max(0.46, deskY)).toFixed(4));
    parent.classList.toggle("bubble-below", mouthX < 0.36);
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
  function nudge(box, du, dv) {
    const room = images.room;
    if (!room) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ix(box[0]), iy(box[1]), view.w * box[2], view.h * box[3]);
    ctx.clip();
    ctx.drawImage(room, view.x + view.w * du, view.y + view.h * dv, view.w, view.h);
    ctx.restore();
  }

  function eyelid(cx, cy, rw, rh, amount) {
    const room = images.room;
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

  function stepCreatures(dt) {
    if (reveal) return;
    catAct.t += dt;
    if (catAct.kind === "idle" && catAct.t > catAct.next) {
      catAct.kind = Math.random() < 0.55 ? "hop" : "stretch";
      catAct.t = 0;
    } else if (catAct.kind !== "idle" && catAct.t > 0.85) {
      catAct.kind = "idle";
      catAct.t = 0;
      catAct.next = rand(8, 15);
    }
  }

  function drawLife(time) {
    const room = images.room;
    if (!room) return;
    const breath = Math.sin(time * 1.35) * 0.0045;
    nudge([0.36, 0.27, 0.30, 0.14], 0, -Math.max(0, breath));
    const sway = Math.sin(time * 0.45) * 0.0035;
    nudge([0.43, 0.07, 0.16, 0.20], sway, 0);
    const shut = blink > 0 ? Math.sin(Math.min(1, blink) * Math.PI) : 0;
    const brow = (moodShown.happy - moodShown.sad) * 0.004;
    if (Math.abs(brow) > 0.001) nudge([0.46, 0.16, 0.12, 0.045], 0, -brow);
    eyelid(0.505, 0.205, 0.018, 0.012, shut);
    eyelid(0.545, 0.208, 0.014, 0.010, shut);
    const catBreath = Math.sin(time * 1.6 + 1) * 0.0035;
    nudge([0.70, 0.35, 0.24, 0.12], 0, -Math.max(0, catBreath));
    nudge([0.688, 0.318, 0.045, 0.06], Math.sin(time * 2.2) * 0.003, 0);
    nudge([0.725, 0.322, 0.04, 0.05], Math.sin(time * 2.2 + 1) * 0.0025, 0);
    eyelid(0.720, 0.400, 0.012, 0.008, shut * 0.85);
    eyelid(0.753, 0.404, 0.012, 0.008, shut * 0.85);
    if (catAct.kind === "hop") {
      const p = Math.sin(Math.min(1, catAct.t / 0.85) * Math.PI);
      nudge([0.69, 0.33, 0.26, 0.16], 0, -0.012 * p);
    } else if (catAct.kind === "stretch") {
      const p = Math.sin(Math.min(1, catAct.t / 0.85) * Math.PI);
      nudge([0.70, 0.36, 0.26, 0.13], 0.01 * p, 0.004 * p);
    }
    const plate = moodShown.sad > moodShown.happy
      ? (moodShown.sad > 0.25 ? images.sad : null)
      : (moodShown.happy > 0.25 ? images.happy : (moodShown.think > 0.55 ? images.worried : null));
    const plateAlpha = plate === images.sad ? moodShown.sad : plate === images.happy ? moodShown.happy : moodShown.think;
    if (plate) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, plateAlpha));
      ctx.drawImage(plate, view.x, view.y, view.w, view.h);
      ctx.restore();
    }
  }

  function prepareInk(name, font) {
    const w = Math.round(view.w * 0.24);
    const h = Math.round(view.h * 0.12);
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
    const x = ix(0.49);
    const y = iy(0.56 - 0.18 * u);
    const w = view.w * (0.26 + 0.08 * u);
    const h = view.h * (0.16 + 0.05 * u);
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
    if (reveal?.page) ctx.drawImage(reveal.page.canvas, 18, h * 0.28, reveal.page.w, reveal.page.h);
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
    const px = ix(0.62);
    const py = iy(0.48);
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
      if (reveal.t > 2.05 && !reveal.done) {
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

  function paperPose(p) {
    const fromX = 0.49;
    const fromY = 0.38;
    const handX = 0.50;
    const handY = 0.36;
    if (p < 0.22) {
      const u = easeOut(p / 0.22);
      return { x: fromX + (handX - fromX) * u, y: fromY + (handY - fromY) * u, crumple: 0, toss: 0 };
    }
    if (p < 0.55) {
      return { x: handX, y: handY, crumple: (p - 0.22) / 0.33, toss: 0 };
    }
    const u = Math.min(1, (p - 0.55) / 0.45);
    const e = u * u * (3 - 2 * u);
    const c1x = 0.74;
    const c1y = 0.08;
    const c2x = 0.62;
    const c2y = -0.16;
    const o = 1 - e;
    return {
      x: o * o * handX + 2 * o * e * c1x + e * e * c2x,
      y: o * o * handY + 2 * o * e * c1y + e * e * c2y,
      crumple: 1,
      toss: e,
    };
  }

  function drawCrumple(pose) {
    const x = ix(pose.x);
    const y = iy(pose.y);
    const w = view.w * 0.20;
    const h = view.h * 0.14;
    const c = pose.crumple;
    const fade = 1 - pose.toss * 0.15;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.04 + c * 1.4 + pose.toss * 2.2);
    const sx = (1 - c * 0.72) * (1 + Math.sin(c * 9) * 0.04 * c);
    const sy = (1 - c * 0.78) * (1 - Math.sin(c * 7) * 0.06 * c);
    ctx.scale(sx, sy);
    ctx.globalAlpha = fade * (1 - c * 0.85);
    ctx.fillStyle = "#f4e6c8";
    ctx.strokeStyle = "#8a6844";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 8 + c * h * 0.45);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = `rgba(90,55,30,${0.25 + c * 0.5})`;
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, -h * 0.1);
    ctx.quadraticCurveTo(0, h * 0.15, w * 0.28, -h * 0.05);
    ctx.moveTo(-w * 0.15, h * 0.12);
    ctx.quadraticCurveTo(w * 0.05, -h * 0.05, w * 0.2, h * 0.2);
    ctx.stroke();
    if (reveal.photo) {
      const pw = w * 0.42;
      const ph = h * 0.7;
      ctx.drawImage(reveal.photo, w * 0.02, -ph / 2, pw, ph * 0.75);
    }
    if (reveal.page?.canvas) {
      ctx.drawImage(reveal.page.canvas, -w * 0.46, -h * 0.22, w * 0.5, h * 0.4);
    }
    ctx.restore();
    if (c > 0.35 && images.ball) {
      const ball = view.w * 0.075;
      ctx.save();
      ctx.globalAlpha = fade * Math.min(1, (c - 0.35) / 0.4);
      ctx.translate(x, y);
      ctx.rotate(pose.toss * 3);
      ctx.drawImage(images.ball, -ball / 2, -ball / 2, ball, ball);
      ctx.restore();
    }
  }

  function coverDetective() {
    const room = images.room;
    if (!room) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(ix(0.50), iy(0.17), view.w * 0.15, view.h * 0.15, 0, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(room, view.x, view.y, view.w, view.h);
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
    } else if (reveal.phase === "wrong" && reveal.t < 2) {
      const pose = paperPose(Math.min(1, reveal.t / 2));
      drawCrumple(pose);
      if (pose.toss > 0.55) coverDetective();
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.034, (now - (frame.last || now)) / 1000 || 0.016);
    frame.last = now;
    clock += dt;
    approachMood(dt);
    resize();
    const room = images.room;
    ctx.fillStyle = "#1a100c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (room) ctx.drawImage(room, view.x, view.y, view.w, view.h);
    if (!reduce) drawSmoke(dt);
    if (!reduce) stepCreatures(dt);
    updateReveal(dt);
    if (!reduce) drawLife(clock);
    if (reveal?.phase === "write") {
      nudge([0.42, 0.30, 0.24, 0.13], Math.sin(clock * 16) * 0.01, Math.sin(clock * 16) * 0.003);
    }
    if (reveal?.phase === "wrong" && reveal.t < 0.5) {
      const reach = Math.sin(Math.min(1, reveal.t / 0.4) * Math.PI) * 0.014;
      nudge([0.42, 0.30, 0.24, 0.13], 0, reach);
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

  async function start() {
    if (!images.room) {
      const loaded = await Promise.all(Object.entries(ART).map(async ([key, src]) => [key, await loadImage(src)]));
      for (const [key, image] of loaded) images[key] = image;
      const faces = await Promise.all(Object.entries(EXPRESSIONS).map(async ([key, src]) => [key, await loadImage(src)]));
      for (const [key, image] of faces) if (image) images[key] = image;
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
    playReveal, playWrong, playRetry, playDefeat, clearReveal,
  };
}
