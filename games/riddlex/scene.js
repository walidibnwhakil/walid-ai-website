// Painted room, with the detective, cat and desk taken from the current art.
// Smoke, the cat, the notebook and the printer are drawn on top at 60fps.

const ART = {
  room: "./images/approved/game-desk.png",
  catSheet: "./images/approved/cat-motion.png",
  catAngry: "./images/approved/cat-resting.png",
  printer: "./images/approved/printer.png",
  arm: "./images/approved/writing-arm.png",
  crumple: "./images/approved/crumple-hands.png",
  ball: "./images/approved/crumpled.png",
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
  puffGrad.addColorStop(0, "rgba(255,255,255,0.55)");
  puffGrad.addColorStop(1, "rgba(255,255,255,0)");
  puffCtx.fillStyle = puffGrad;
  puffCtx.fillRect(0, 0, 32, 32);

  const smoke = Array.from({ length: 42 }, () => makePuff(true));
  const cat = {
    mode: "perch", x: 0.78, y: 0.40, vx: 0, frame: 6, face: 1, squash: 1,
    timer: rand(4, 8), fromX: 0.78, fromY: 0.40, toX: 0.78, toY: 0.40, t: 0, dur: 1,
  };
  let mood = "curious";
  const moodShown = { lift: 0, sad: 0, happy: 0, think: 0 };
  let blink = 0;
  let nextBlink = rand(2.2, 5);
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  const ink = document.createElement("canvas");
  const mask = document.createElement("canvas");

  function makePuff(scatter) {
    return {
      x: 0.18 + rand(-0.006, 0.006),
      y: 0.50,
      vx: rand(-0.01, 0.015),
      vy: rand(-0.045, -0.02),
      life: scatter ? Math.random() * 2 : 0,
      max: rand(1.5, 3.1),
      size: rand(10, 26),
      wobble: rand(0, 6),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const width = Math.max(320, Math.round(rect.width * dpr));
    const height = Math.max(180, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
  }

  function frameBox(index) {
    const sheet = images.catSheet;
    if (!sheet) return null;
    const col = index % 4;
    const row = Math.floor(index / 4);
    return [col * (sheet.width / 4), row * (sheet.height / 2), sheet.width / 4, sheet.height / 2];
  }

  function drawCatSprite(x, y, scale, frame, face, angry, rot = 0) {
    const image = angry ? images.catAngry : images.catSheet;
    if (!image) return;
    const w = canvas.width * scale;
    const h = angry ? w * (image.height / image.width) : w;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.scale(face, cat.squash || 1);
    if (angry) ctx.drawImage(image, -w / 2, -h * 0.85, w, h);
    else {
      const box = frameBox(frame);
      ctx.drawImage(image, box[0], box[1], box[2], box[3], -w / 2, -h * 0.92, w, h);
    }
    ctx.restore();
  }

  function coverBakedCat() {
    const room = images.room;
    if (!room) return;
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(canvas.width * 0.83, canvas.height * 0.43, canvas.width * 0.1, canvas.height * 0.055, -0.15, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(
      room,
      room.width * 0.2, room.height * 0.64, room.width * 0.36, room.height * 0.08,
      canvas.width * 0.7, canvas.height * 0.37, canvas.width * 0.26, canvas.height * 0.12,
    );
    ctx.restore();
  }

  function drawHookah(time) {
    const x = canvas.width * 0.17;
    const baseY = canvas.height * 0.63;
    const u = canvas.height * 0.2;
    ctx.save();
    ctx.translate(x, baseY);
    ctx.fillStyle = "rgba(40,20,8,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, u * 0.42, u * 0.95, u * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c9923a";
    ctx.beginPath();
    ctx.ellipse(0, u * 0.28, u * 0.72, u * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    const glass = ctx.createRadialGradient(-u * 0.2, -u * 0.05, u * 0.05, 0, u * 0.05, u * 0.7);
    glass.addColorStop(0, "#f4fffb");
    glass.addColorStop(0.55, "#6fbfb2");
    glass.addColorStop(1, "#1c6a62");
    ctx.fillStyle = glass;
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.58, u * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#f0d092";
    ctx.lineWidth = Math.max(2, u * 0.04);
    ctx.stroke();
    ctx.fillStyle = "rgba(210,245,250,0.7)";
    ctx.beginPath();
    ctx.ellipse(0, u * 0.08, u * 0.4, u * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e1b45a";
    ctx.lineWidth = Math.max(4, u * 0.07);
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.28);
    ctx.lineTo(0, -u * 1.15);
    ctx.stroke();
    ctx.fillStyle = "#5a3218";
    ctx.beginPath();
    ctx.ellipse(0, -u * 1.22, u * 0.2, u * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    const glow = 0.65 + Math.sin(time * 3) * 0.25;
    ctx.fillStyle = `rgba(255,80,20,${glow})`;
    ctx.beginPath();
    ctx.arc(u * 0.05, -u * 1.28, u * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4a2a16";
    ctx.lineWidth = Math.max(3, u * 0.045);
    ctx.beginPath();
    ctx.moveTo(u * 0.35, -u * 0.05);
    ctx.bezierCurveTo(u * 2.2, u * 0.15, canvas.width * 0.18, -canvas.height * 0.08, canvas.width * 0.3, -canvas.height * 0.22);
    ctx.stroke();
    ctx.restore();
  }

  function drawSmoke(dt, time) {
    for (const particle of smoke) {
      particle.life += dt;
      if (particle.life > particle.max) Object.assign(particle, makePuff(false));
      particle.x += particle.vx * dt + Math.sin(time * 2 + particle.wobble) * 0.008 * dt;
      particle.y += particle.vy * dt;
      const alpha = Math.sin((particle.life / particle.max) * Math.PI) * 0.35;
      const size = particle.size * (canvas.width / 900) * (0.7 + particle.life / particle.max);
      ctx.globalAlpha = alpha;
      ctx.drawImage(puff, canvas.width * particle.x - size / 2, canvas.height * particle.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  }

  function easeInOut(p) {
    return p < 0.5 ? 2 * p * p : 1 - ((-2 * p + 2) ** 2) / 2;
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
  function drawFace(time) {
    const x = canvas.width * 0.50;
    const y = canvas.height * 0.255 + Math.sin(time * 1.6) * canvas.height * 0.002;
    const lift = moodShown.lift * canvas.height * 0.012;
    ctx.save();
    ctx.strokeStyle = "rgba(70,42,28,0.8)";
    ctx.lineWidth = Math.max(2, canvas.width * 0.004);
    ctx.lineCap = "round";
    const span = canvas.width * 0.03;
    const left = mood === "confused" ? lift : lift * 0.3;
    const right = mood === "confused" ? -lift : lift * 0.3;
    ctx.beginPath();
    ctx.moveTo(x - span * 1.7, y - span * 0.2 + left);
    ctx.quadraticCurveTo(x - span, y - span * 0.55 + left, x - span * 0.35, y - span * 0.15 + left);
    ctx.moveTo(x + span * 0.35, y - span * 0.15 + right);
    ctx.quadraticCurveTo(x + span, y - span * 0.55 + right, x + span * 1.7, y - span * 0.2 + right);
    ctx.stroke();
    if (blink > 0) {
      ctx.fillStyle = "rgba(214,170,130,0.92)";
      const shut = Math.sin(Math.min(1, blink) * Math.PI);
      for (const ex of [-span * 0.95, span * 0.95]) {
        ctx.beginPath();
        ctx.ellipse(x + ex, y + span * 0.15, span * 0.42, span * 0.22 * shut, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (moodShown.sad > 0.04) {
      ctx.fillStyle = `rgba(40,55,80,${0.16 * moodShown.sad})`;
      ctx.beginPath();
      ctx.ellipse(x, y + span * 0.4, span * 2.4, span * 1.6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (moodShown.happy > 0.04) {
      ctx.fillStyle = `rgba(255,190,80,${0.12 * moodShown.happy})`;
      ctx.beginPath();
      ctx.ellipse(x, y, span * 2.6, span * 1.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    if (mood === "thinking") {
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.font = `${Math.round(canvas.width * 0.02)}px "Times New Roman", serif`;
      ctx.fillText(Math.sin(time * 3) > 0 ? "…" : "", x + span * 2, y - span);
    }
  }

  function stepCat(dt) {
    if (reveal) return;
    cat.timer -= dt;
    cat.t += dt;
    if (cat.mode === "perch") {
      if (cat.timer <= 0) jump("down");
      return;
    }
    if (cat.mode === "jumpDown" || cat.mode === "jumpUp") {
      const p = Math.min(1, cat.t / cat.dur);
      if (p < 0.22) {
        cat.squash = 1 - (p / 0.22) * 0.18;
        cat.x = cat.fromX;
        cat.y = cat.fromY + 0.012 * (p / 0.22);
      } else {
        const q = easeInOut((p - 0.22) / 0.78);
        const arc = Math.sin(q * Math.PI);
        cat.squash = 0.82 + 0.22 * q;
        cat.x = cat.fromX + (cat.toX - cat.fromX) * q;
        cat.y = cat.fromY + (cat.toY - cat.fromY) * q - arc * 0.1;
      }
      if (p >= 1) {
        cat.squash = 1;
        cat.x = cat.toX;
        cat.y = cat.toY;
        cat.mode = cat.mode === "jumpDown" ? "walk" : "perch";
        cat.timer = cat.mode === "perch" ? rand(5, 12) : rand(1.4, 2.8);
        cat.face = cat.toX >= cat.fromX ? 1 : -1;
      }
      return;
    }
    if (cat.mode === "walk") {
      cat.frame = [0, 1, 2, 3][Math.floor(clock * 8) % 4];
      const dir = cat.face;
      cat.x += dir * dt * 0.08;
      if (cat.x < 0.08 || cat.x > 0.92 || cat.timer <= 0) {
        cat.mode = Math.random() < 0.45 ? "play" : "turn";
        cat.timer = rand(1.2, 3.4);
      }
      return;
    }
    if (cat.mode === "turn") {
      cat.face *= -1;
      cat.mode = Math.random() < 0.35 ? "jumpUp" : "walk";
      if (cat.mode === "jumpUp") jump("up");
      else cat.timer = rand(1.2, 2.6);
      return;
    }
    if (cat.mode === "play") {
      cat.frame = Math.sin(clock * 6) > 0 ? 4 : 5;
      cat.y = 0.73 + Math.sin(clock * 8) * 0.005;
      if (cat.timer <= 0) {
        cat.mode = "walk";
        cat.timer = rand(1.2, 2.4);
      }
    }
  }

  function jump(direction) {
    cat.mode = direction === "down" ? "jumpDown" : "jumpUp";
    cat.fromX = cat.x;
    cat.fromY = cat.y;
    cat.toX = direction === "down" ? rand(0.18, 0.82) : 0.78;
    cat.toY = direction === "down" ? 0.73 : 0.40;
    cat.t = 0;
    cat.dur = reduce ? 0.01 : 0.62;
    cat.face = cat.toX >= cat.x ? 1 : -1;
    cat.frame = 4;
  }

  function drawCat() {
    const acting = reveal && (reveal.phase === "wrong" || reveal.phase === "retry");
    const showPainted = cat.mode === "perch" && !acting;
    if (!showPainted) coverBakedCat();
    if (showPainted) return;
    const angry = reveal && reveal.phase === "wrong" && reveal.catSeated;
    const frame = angry ? 7 : cat.frame;
    const bob = cat.mode === "walk" ? Math.sin(clock * 12) * 0.004 : 0;
    const scale = angry ? 0.2 : 0.15;
    const catX = angry ? canvas.width * 0.50 : canvas.width * cat.x;
    const catY = angry ? canvas.height * 0.60 : canvas.height * (cat.y + bob);
    const sway = cat.mode === "walk" ? Math.sin(clock * 10) * 0.06 : 0;
    drawCatSprite(catX, catY, scale, frame, angry ? 1 : (cat.face || 1), angry, sway);
  }

  function prepareInk(name, font) {
    const w = Math.round(canvas.width * 0.24);
    const h = Math.round(canvas.height * 0.12);
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

  function drawNotebook(page) {
    const x = canvas.width * 0.40;
    const y = canvas.height * 0.56;
    const w = canvas.width * 0.28;
    const h = canvas.height * 0.24;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.04);
    ctx.fillStyle = "rgba(40,20,10,0.25)";
    ctx.fillRect(8, 10, w, h);
    ctx.fillStyle = "#f3e2c2";
    ctx.strokeStyle = "#8a6844";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "rgba(180,140,100,0.35)";
    for (let line = 1; line <= 4; line++) {
      ctx.beginPath();
      ctx.moveTo(12, h * line / 5);
      ctx.lineTo(w - 12, h * line / 5);
      ctx.stroke();
    }
    if (page) {
      ctx.drawImage(page.canvas, 16, h * 0.28, page.w, page.h);
      if (images.arm && page.penX != null) {
        const armW = w * 0.85;
        const armH = armW * (images.arm.height / images.arm.width);
        ctx.drawImage(images.arm, page.penX - armW * 0.92, h * 0.18 - armH * 0.55, armW, armH);
      }
    }
    ctx.restore();
    return { x, y, w, h };
  }

  function drawPrintedPhoto(progress) {
    const printer = images.printer;
    if (!printer || !reveal?.photo) return;
    const pw = canvas.width * 0.16;
    const ph = pw * (printer.height / printer.width);
    const px = canvas.width * 0.73;
    const py = canvas.height * 0.40;
    ctx.drawImage(printer, px, py, pw, ph);
    const slide = easeOut(Math.min(1, progress));
    const photoW = pw * 0.72;
    const photoH = photoW * 0.75;
    const photoX = px + pw * 0.14;
    const photoY = py + ph * 0.55 + slide * canvas.height * 0.1;
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
    ctx.translate(canvas.width * 0.5, canvas.height * 0.62);
    ctx.scale(reveal.present || 1, reveal.present || 1);
    ctx.fillStyle = "#fff8ea";
    ctx.strokeStyle = "#8d6844";
    ctx.lineWidth = 3;
    const w = canvas.width * 0.26;
    const h = canvas.height * 0.16;
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
      mg.fillStyle = "#000";
      mg.beginPath();
      mg.arc(8 + reveal.inkWidth * p, ink.height * 0.55, ink.height * 0.45, 0, Math.PI * 2);
      mg.fill();
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
        if (reveal.imageUrl && reveal.photo) {
          reveal.phase = "print";
          reveal.t = 0;
        } else {
          reveal.phase = "present";
          reveal.t = 0;
          reveal.printed = false;
        }
      }
    } else if (reveal.phase === "print") {
      if (reveal.t > 1.35) {
        reveal.phase = "present";
        reveal.t = 0;
        reveal.printed = true;
      }
    } else if (reveal.phase === "present") {
      reveal.present = 0.92 + Math.min(0.18, reveal.t * 0.4);
      if (reveal.t > 0.45 && !reveal.done) {
        reveal.done = true;
        reveal.resolve({ printed: !!reveal.printed });
      }
    } else if (reveal.phase === "wrong") {
      const p = Math.min(1, reveal.t / 0.7);
      cat.x = reveal.catFrom + (0.48 - reveal.catFrom) * p;
      cat.y = 0.62 + Math.sin(p * Math.PI) * -0.05;
      cat.frame = [0, 1, 2, 3][Math.floor(clock * 10) % 4];
      cat.face = 1;
      if (p >= 1) {
        reveal.catSeated = true;
        cat.mode = "perch";
        if (!reveal.done) {
          reveal.done = true;
          reveal.resolve();
        }
      }
    } else if (reveal.phase === "retry") {
      const p = Math.min(1, reveal.t / 1.5);
      if (p < 0.45) {
        reveal.catSeated = false;
        cat.x = 0.48 + p * 0.7;
        cat.y = 0.70;
        cat.frame = [0, 1, 2, 3][Math.floor(clock * 10) % 4];
        cat.face = 1;
      } else {
        reveal.crumple = (p - 0.45) / 0.55;
        cat.mode = "walk";
      }
      if (p >= 1 && !reveal.done) {
        reveal.done = true;
        reveal.resolve();
        reveal = null;
        cat.mode = "walk";
        cat.timer = 1.5;
        cat.y = 0.73;
      }
    }
  }

  function drawReveal() {
    if (!reveal) return;
    if (reveal.phase === "write" || reveal.phase === "print") {
      drawNotebook(reveal.page);
      if (reveal.phase === "print") drawPrintedPhoto(reveal.t / 1.1);
    } else if (reveal.phase === "present") {
      drawPresent();
    } else if (reveal.phase === "wrong" || (reveal.phase === "retry" && reveal.t < 0.45)) {
      drawNotebook(reveal.page);
    }
    if (reveal?.crumple) {
      const p = reveal.crumple;
      const x = canvas.width * (0.46 + p * 0.5);
      const y = canvas.height * (0.60 - Math.sin(p * Math.PI) * 0.18);
      const size = canvas.width * (0.12 * (1 - p * 0.65));
      if (images.crumple && p < 0.45) ctx.drawImage(images.crumple, canvas.width * 0.40, canvas.height * 0.52, canvas.width * 0.16, canvas.width * 0.09);
      if (images.ball) ctx.drawImage(images.ball, x, y, size, size);
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
    if (room) ctx.drawImage(room, 0, 0, canvas.width, canvas.height);
    else {
      ctx.fillStyle = "#3a2418";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    drawHookah(clock);
    if (!reduce) drawSmoke(dt, clock);
    if (!reduce) stepCat(dt);
    updateReveal(dt);
    drawCat();
    drawFace(clock);
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
    }
    if (running) return;
    running = true;
    raf = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  async function playReveal(options) {
    cat.mode = "perch";
    cat.x = 0.78;
    cat.y = 0.40;
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
    reveal.catSeated = false;
    reveal.catFrom = cat.x;
    cat.mode = "walk";
    if (reduce) {
      reveal.catSeated = true;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  function playRetry() {
    mood = "happy";
    if (!reveal) reveal = {};
    reveal.phase = "retry";
    reveal.t = 0;
    reveal.done = false;
    reveal.crumple = 0;
    if (reduce) {
      reveal = null;
      cat.mode = "perch";
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  function playDefeat() {
    mood = "defeated";
    reveal = null;
    cat.mode = "perch";
  }

  function clearReveal() {
    reveal = null;
    if (cat.mode !== "perch") cat.mode = "walk";
  }

  return {
    start, stop, resize,
    setMood(value) { mood = value; },
    playReveal, playWrong, playRetry, playDefeat, clearReveal,
  };
}
