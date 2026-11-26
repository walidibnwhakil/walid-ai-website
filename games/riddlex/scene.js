// Original room art is cached as a static room and desk composition.
// Face, cat, smoke and reveal layers animate independently without zooming the room.

import { createExpressions } from "./expressions.js?v=akinator-27";

const BASE = {
  landscape: "./images/approved/game-desk.webp",
  portrait: "./images/approved/portrait-neutral.webp",
};
// Feathered face crops, one orientation only. Loaded after the first paint.
const OVERLAYS = {
  landscape: {
    happy: "./images/approved/face-landscape-happy.webp",
    sad: "./images/approved/face-landscape-sad.webp",
    worried: "./images/approved/face-landscape-worried.webp",
    serious: "./images/approved/face-landscape-serious.webp",
    confused: "./images/approved/face-landscape-confused.webp",
    cat: "./images/approved/cat-landscape-blink.webp",
    tail: "./images/approved/cat-landscape-tail.webp",
  },
  portrait: {
    happy: "./images/approved/face-portrait-happy.webp",
    sad: "./images/approved/face-portrait-sad.webp",
    worried: "./images/approved/face-portrait-worried.webp",
    serious: "./images/approved/face-portrait-serious.webp",
    confused: "./images/approved/face-portrait-confused.webp",
    cat: "./images/approved/cat-portrait-blink.webp",
    tail: "./images/approved/cat-portrait-tail.webp",
  },
};
const FACE = {
  landscape: { u: 0.36902, v: 0.0255, w: 0.32177, h: 0.37938 },
  portrait: { u: 0.23889, v: 0.13047, w: 0.52222, h: 0.25938 },
};

function loadImage(src, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const picture = new Image();
    let settled = false;
    let timer;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      picture.onload = null;
      picture.onerror = null;
      resolve(value);
    };
    picture.onload = () => finish(picture);
    picture.onerror = () => finish(null);
    timer = setTimeout(() => {
      picture.src = "";
      finish(null);
    }, timeoutMs);
    picture.src = src;
  });
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function blinkCover(remaining) {
  const elapsed = 0.28 - remaining;
  if (elapsed < 0.04) return Math.max(0, elapsed / 0.04);
  if (elapsed < 0.24) return 1;
  return Math.max(0, 1 - (elapsed - 0.24) / 0.04);
}

function flickCover(remaining) {
  const elapsed = 0.7 - remaining;
  const u = Math.min(1, Math.max(0, elapsed / 0.7));
  return Math.sin(Math.PI * u);
}

// Contain the complete source photo (portrait, square or landscape), never crop
// a person's head or image edges. This pure helper is also used by unit tests.
export function fitPhotoInside(photoWidth, photoHeight, boxX, boxY, boxWidth, boxHeight) {
  if (!(photoWidth > 0 && photoHeight > 0 && boxWidth > 0 && boxHeight > 0)) {
    return { x: boxX, y: boxY, w: 0, h: 0 };
  }
  const scale = Math.min(boxWidth / photoWidth, boxHeight / photoHeight);
  const w = photoWidth * scale;
  const h = photoHeight * scale;
  return {
    x: boxX + (boxWidth - w) / 2,
    y: boxY + (boxHeight - h) / 2,
    w, h,
  };
}

export function createScene(canvas) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const images = {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const portraitViewport = matchMedia("(max-aspect-ratio: 4/5)");
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
  const catLife = { blink: 0, nextBlink: rand(0.6, 1.4), flick: 0, nextFlick: rand(1.2, 2.2) };
  const faces = createExpressions();
  let faceNow = faces.picture();
  let mood = "curious";
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  let logoSprite = null;
  let layoutDirty = true;
  let cssSize = { width: 0, height: 0 };
  let frameTime = 0;
  let logoPaintOrient = "";
  let staticKey = "";
  let deskEdge = 0;
  const staticRoom = document.createElement("canvas");
  const staticCtx = staticRoom.getContext("2d", { alpha: false });
  const ink = document.createElement("canvas");
  const mask = document.createElement("canvas");

  function makePuff(scatter) {
    return {
      x: (portraitMode ? 0.625 : 0.592) + rand(-0.004, 0.004),
      y: scatter ? rand(0.16, 0.25) : (portraitMode ? 0.31 : 0.255),
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
    if (!rect.width || !rect.height) return;
    cssSize = { width: rect.width, height: rect.height };
    const dpr = Math.min(1.5, devicePixelRatio || 1, Math.sqrt(1800000 / (rect.width * rect.height)));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      layoutDirty = true;
    }
    if (layoutDirty) {
      layoutDirty = false;
      layoutRoom();
      staticKey = '';
    }
  }

  function currentArt() {
    const narrow = portraitViewport.matches;
    return (narrow ? images.portrait : images.room) || null;
  }

  function layoutRoom() {
    const cw = canvas.width;
    const ch = canvas.height;
    const art = currentArt();
    portraitMode = portraitViewport.matches;
    if (!art) {
      view = { x: 0, y: 0, w: cw, h: ch };
      deskEdge = ch * .48;
    } else {
      if (portraitMode) {
        const chrome = phoneChrome();
        const topY = chrome.logo + 6 * chrome.dpr;
        const cut = 0.50, start = 0.118;
        const reserve = 240 * chrome.dpr;
        const scale = Math.max(0.01, Math.min(cw * 1.06 / art.width,
          (ch - topY - reserve) / ((cut - start) * art.height)));
        const w = art.width * scale;
        view = { x: w > cw ? cw - w : (cw - w) / 2,
          y: topY - start * art.height * scale, w, h: art.height * scale };
        deskEdge = view.y + view.h * cut;
      } else {
        const topY = Math.min(ch * .115, cw * .07);
        const reserve = Math.max(ch * .24, 75 * (canvas.width / Math.max(1,cssSize.width)));
        const scale = Math.max(.01, Math.min(cw / art.width, (ch - topY - reserve) / (art.height * .58)));
        const w = art.width * scale;
        view = { x: (cw - w) / 2, y: topY, w, h: art.height * scale };
        deskEdge = view.y + view.h * .58;
      }
    }
    const parent = canvas.parentElement;
    if (!parent || !cw || !ch) return;
    const face = FACE[portraitMode ? "portrait" : "landscape"];
    const cat = CAT_FACE[portraitMode ? "portrait" : "landscape"];
    const spot = portraitMode
      ? { bu: 0.34, bv: face.v + face.h + 0.07, dv: 0.62 }
      : { bu: 0.62, bv: 0.16, dv: 0.60 };
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
    parent.style.setProperty("--question-y", Math.max(0.02,deskEdge/ch).toFixed(4));
    parent.style.setProperty("--room-edge", Math.max(0.02,deskEdge/ch).toFixed(4));
    parent.style.setProperty("--hands-y", hands.toFixed(4));
    parent.style.setProperty("--cat-top", catTop.toFixed(4));
    parent.style.setProperty("--desk-y", Math.max(0.02, Math.min(0.85, (deskEdge + (portraitMode ? 0 : ch * .05)) / ch)).toFixed(4));
    const [, noteBottom] = frac(0, portraitMode ? 0.62 : 0.44);
    parent.style.setProperty("--note-bottom", Math.max(0.2, noteBottom).toFixed(4));
    parent.classList.toggle("portrait-scene", portraitMode);
    parent.dispatchEvent?.(new Event("riddlex-scene-layout"));
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
    const catShut = catLife.blink > 0 ? blinkCover(catLife.blink) : 0;
    drawPlate(plates.cat, CAT_FACE[portraitMode ? "portrait" : "landscape"], catShut);
    const flick = catLife.flick > 0 ? flickCover(catLife.flick) : 0;
    drawPlate(plates.tail, CAT_TAIL[portraitMode ? "portrait" : "landscape"], flick);
  }

  function blinkAlpha(t) {
    const u = 1 - Math.min(1, Math.max(0, t));
    if (u < 0.22) return u / 0.22;
    if (u < 0.68) return 1;
    return Math.max(0, 1 - (u - 0.68) / 0.32);
  }

  const CAT_FACE = {
    landscape: { u: 0.69318, v: 0.36132, w: 0.11962, h: 0.11158 },
    portrait: { u: 0.69444, v: 0.36719, w: 0.29167, h: 0.14063 },
  };
  const CAT_TAIL = {
    landscape: { u: 0.8134, v: 0.3719, w: 0.0897, h: 0.1275 },
    portrait: { u: 0.7778, v: 0.3516, w: 0.2083, h: 0.1250 },
  };

  function stepCat(dt) {
    catLife.nextBlink -= dt;
    if (catLife.nextBlink <= 0) {
      catLife.blink = 0.28;
      catLife.nextBlink = rand(3, 5);
    }
    if (catLife.blink > 0) catLife.blink = Math.max(0, catLife.blink - dt);
    catLife.nextFlick -= dt;
    if (catLife.nextFlick <= 0) {
      catLife.flick = 0.7;
      catLife.nextFlick = rand(4, 6);
    }
    if (catLife.flick > 0) catLife.flick = Math.max(0, catLife.flick - dt);
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
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = Math.round(h * (portraitMode ? 0.62 : 0.78));
    g.font = font.replace(/\d+px/, `${size}px`);
    while (g.measureText(name).width > w * 0.86 && size > 14) {
      size -= 2;
      g.font = font.replace(/\d+px/, `${size}px`);
    }
    const textW = g.measureText(name).width;
    const textX = (w - textW) / 2;
    // Long English/Bangla names must not paint outside their printed label.
    g.fillText(name, w / 2, h / 2, w * 0.92);
    mask.getContext("2d").clearRect(0, 0, w, h);
    return { w, h, width: Math.max(20, textW), textX };
  }

  function phoneChrome() {
    const cssH = cssSize.height || canvas.height;
    const dpr = canvas.height / Math.max(1, cssH);
    return {
      dpr,
      buttons: Math.round(108 * dpr),
      logo: Math.round(canvas.width * 0.145),
    };
  }

  function paperBox() {
    const chin = iy(FACE.portrait.v + FACE.portrait.h);
    const w = canvas.width * 0.40;
    const h = canvas.width * 0.155;
    const limit = canvas.height - phoneChrome().buttons - 8;
    const y = Math.min(chin + 6, limit - h);
    return { x: canvas.width * 0.08, y: Math.max(8, y), w, h };
  }

  function noteMetrics(turn) {
    const u = Math.max(0, Math.min(1, turn));
    const photo = reveal?.photo && reveal.photo.width > 0 ? reveal.photo : null;
    if (portraitMode) {
      const held = paperBox();
      const chrome = phoneChrome();
      if (!photo) {
        const w = held.w;
        return { u, photo, photoH: 0, nameH: held.h, w, h: held.h,
          x: (canvas.width - w) / 2, y: held.y, pad: 8 * chrome.dpr };
      }
      // Unlike the original fixed-ratio portrait crop, the complete photo fits
      // inside a larger card. Keep room below it for both guess buttons.
      const dpr = chrome.dpr;
      // A full-height portrait needs more vertical room than a landscape
      // photograph. Grow upwards as needed, leaving the answer buttons
      // reachable below the card on small phone displays.
      const reserve = 148 * dpr;
      const minimumTop = Math.max(28 * dpr, canvas.height * 0.33);
      const maxHeight = Math.max(110 * dpr, canvas.height - reserve - minimumTop - 10 * dpr);
      const w = Math.min(canvas.width * 0.80, Math.max(210 * dpr, held.w * 1.85));
      const nameH = Math.min(w * 0.22, 68 * dpr);
      const pad = 10 * dpr;
      const naturalPhotoH = (w - pad * 2) * photo.height / Math.max(1, photo.width) + pad * 2;
      const photoH = Math.max(50 * dpr, Math.min(maxHeight - nameH, naturalPhotoH));
      const h = photoH + nameH;
      const y = Math.max(minimumTop, Math.min(held.y,
        canvas.height - reserve - h - 8 * dpr));
      return { u, photo, photoH, nameH, w, h,
        x: (canvas.width - w) / 2, y, pad };
    }
    // A photo card shows the whole picture, large, in the space to the right of
    // the detective's face. It may cover the shelves, cat, lamp and desk.
    // A name-only card stays centred under the chin.
    const cssW = cssSize.width || canvas.width;
    const cssH = cssSize.height || canvas.height;
    const dpr = canvas.width / Math.max(1, cssW);
    let w;
    let photoH = 0;
    let nameH;
    let x;
    let y;
    let pad = 8;
    let namePx = 0;
    if (photo) {
      const face = FACE.landscape;
      const faceRight = ix(face.u + face.w);
      const s = Math.min(cssW / 1280, cssH / 760);
      pad = 12 * s * dpr;
      nameH = 48 * s * dpr;
      namePx = 30 * s * dpr;
      const gap = 20 * s * dpr;
      const margin = 16 * s * dpr;
      const top = 16 * s * dpr;
      // Hud offset, two 58px buttons, gaps, and the credit line.
      const buttonStack = 164 * dpr;
      const maxW = Math.max(120 * dpr, canvas.width - faceRight - gap - margin);
      const maxH = Math.max(80 * dpr, canvas.height - top - buttonStack);
      const aspect = photo.width / Math.max(1, photo.height);
      let photoW = maxW - pad * 2;
      let frameH = photoW / aspect;
      if (pad + frameH + nameH > maxH) {
        frameH = Math.max(40 * dpr, maxH - pad - nameH);
        photoW = frameH * aspect;
      }
      photoH = frameH + pad;
      w = photoW + pad * 2;
      // Anchor to the right edge, but never place the photo card off-screen.
      x = Math.max(8 * dpr, Math.min(canvas.width - margin - w,
        Math.max(faceRight + gap, canvas.width - margin - w)));
      y = top;
    } else {
      w = Math.min(view.w * 0.32, canvas.width * 0.46);
      nameH = Math.min(view.h * 0.11, 72 * dpr);
      x = ix(0.50) - w / 2;
      y = iy(0.50) - nameH;
    }
    const h = Math.max(16, photoH + nameH);
    if (photo) y = Math.max(8 * dpr, Math.min(y, canvas.height - 164 * dpr - h));
    return { u, photo, photoH, nameH, w, h, x, y, pad, namePx };
  }

  function drawSheet(turn) {
    const box = noteMetrics(turn);
    const { u, photo, photoH, nameH, w, h } = box;
    const parent = canvas.parentElement;
    if (parent && canvas.height) {
      const vars = {"--note-bottom":((box.y+h)/canvas.height).toFixed(4),"--note-left":(box.x/canvas.width).toFixed(4),"--note-width":(box.w/canvas.width).toFixed(4)};
      for (const [name,value] of Object.entries(vars)) if (parent.style.getPropertyValue(name)!==value) parent.style.setProperty(name,value);
    }
    ctx.save();
    // Settle upright: a short fade, a small rise, and a slight scale.
    // Never a half-turn, and never a mirror.
    const rise = (1 - u) * Math.min(22, h * 0.06);
    ctx.globalAlpha = 0.2 + 0.8 * u;
    ctx.translate(box.x + w / 2, box.y + h / 2 + rise);
    ctx.rotate((1 - u) * 0.05);
    const settle = 0.94 + 0.06 * u;
    ctx.scale(settle, settle);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "rgba(40,20,10,0.22)";
    ctx.beginPath();
    ctx.roundRect(10, 12, w, h, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d5d0c8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 10);
    ctx.fill();
    ctx.stroke();
    const pad = box.pad || 8;
    if (photo && photoH > 0) {
      ctx.save();
      const frameW = Math.max(1, w - pad * 2);
      const frameH = Math.max(1, photoH - pad * 2);
      ctx.beginPath();
      ctx.roundRect(pad, pad, frameW, frameH, 8);
      ctx.clip();
      // Letterboxing is intentional: the full original source image stays
      // visible, including its edges, on BOTH desktop and phone.
      ctx.fillStyle = "#eee9e0";
      ctx.fillRect(pad, pad, frameW, frameH);
      const fit = fitPhotoInside(photo.width, photo.height, pad, pad, frameW, frameH);
      if (fit.w > 0 && fit.h > 0) ctx.drawImage(photo, fit.x, fit.y, fit.w, fit.h);
      ctx.restore();
    }
    if (reveal?.page) {
      const bandY = photoH;
      const maxW = w * 0.9;
      const maxH = Math.max(12, nameH * (portraitMode ? 0.8 : 0.92));
      let scale = Math.min(maxW / reveal.page.w, maxH / reveal.page.h, portraitMode ? 3 : 1.8);
      if (box.namePx) {
        const inkFont = Math.max(12, Math.round(reveal.page.h * 0.78));
        scale = Math.min(box.namePx / inkFont, maxW / Math.max(1, reveal.inkWidth || reveal.page.w));
      }
      const dw = reveal.page.w * scale;
      const dh = reveal.page.h * scale;
      ctx.drawImage(reveal.page.canvas, (w - dw) / 2, bandY + (nameH - dh) / 2, dw, dh);
    }
    ctx.restore();
  }

  function drawPhoneLogo(target = ctx) {
    const art = currentArt();
    if (!art) return;
    const orient = portraitMode ? "portrait" : "landscape";
    if (!logoSprite || logoPaintOrient !== orient) {
      logoPaintOrient = orient;
      const sw = Math.round(art.width * (portraitMode ? .45 : .24));
      const sh = Math.round(art.height * (portraitMode ? .115 : .185));
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
    const maxH = portraitMode ? phoneChrome().logo : Math.max(28,view.y * 1.12);
    const dw = Math.min(canvas.width * (portraitMode ? .63 : .25), maxH * (logoSprite.width / logoSprite.height));
    const dh = dw * (logoSprite.height / logoSprite.width);
    target.drawImage(logoSprite, (canvas.width - dw) / 2, Math.max(2,(maxH - dh) / 2), dw, dh);
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
      // The small transition card must also retain the complete photograph.
      const inset = fitPhotoInside(reveal.photo.width, reveal.photo.height,
        w * 0.08, -ph / 2 + 6, pw - 12, ph * 0.72);
      ctx.drawImage(reveal.photo, inset.x, inset.y, inset.w, inset.h);
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
        reveal.phase = "present";
        reveal.t = 0;
        reveal.printed = !!(reveal.photo && reveal.photo.width > 0);
      }
    } else if (reveal.phase === "print") {
      if (reveal.t > 0.4) {
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
      drawSheet(easeOut(Math.min(1, reveal.t / 0.4)));
    } else if (reveal.phase === "present") {
      drawSheet(1);
    } else if (reveal.phase === "wrong" && reveal.t < 1.05) {
      const gone = Math.min(1, reveal.t / 1.0);
      drawDismiss(gone);
    }
  }

  function paintRoomLayer(art) {
    const w = canvas.width, h = canvas.height;
    const key = [w,h,images.baseOrient,view.x,view.y,view.w,deskEdge].join(":");
    if (staticKey === key) return;
    staticKey = key;
    staticRoom.width = w; staticRoom.height = h;
    const g = staticCtx;
    g.fillStyle = "#21130b"; g.fillRect(0,0,w,h);
    const scale = view.w / art.width;
    const v0 = portraitMode ? .118 : 0;
    const v1 = portraitMode ? .50 : .58;
    const srcX = Math.max(0,-view.x/scale);
    const srcW = Math.min(art.width-srcX,w/scale);
    const deskStart = portraitMode ? .445 : .49;
    const destX = view.x + srcX*scale;
    const strip = (from,to) => g.drawImage(art,srcX,art.height*from,srcW,
      art.height*(to-from),destX,view.y+view.h*from,srcW*scale,view.h*(to-from));
    strip(v0,deskStart); strip(deskStart,v1);
    // Replace the baked-in left logo panel, keeping the original lamp and room.
    if (!portraitMode) {
      const left=ix(0), top=iy(0), pw=view.w*.243, ph=view.h*.185;
      g.save();g.beginPath();g.rect(left,top,pw,ph);g.clip();
      g.drawImage(art,0,0,Math.max(1,Math.round(art.width*.026)),Math.round(art.height*.185),left,top,pw,ph);
      const shade=g.createLinearGradient(left,top,left+pw,top);
      shade.addColorStop(0,"rgba(28,13,7,.2)");shade.addColorStop(1,"rgba(28,13,7,.45)");
      g.fillStyle=shade;g.fillRect(left,top,pw,ph);g.restore();
    }
    const panelY=Math.min(h,Math.max(0,deskEdge));
    const panel=g.createLinearGradient(0,panelY,0,h);
    panel.addColorStop(0,"#382013");panel.addColorStop(.4,"#2a170d");panel.addColorStop(1,"#1c100b");
    g.fillStyle=panel;g.fillRect(0,panelY,w,Math.max(0,h-panelY));
    g.fillStyle="#aa7835";g.fillRect(0,panelY,w,Math.max(1,w*.0012));
    drawPhoneLogo(g);
  }

  function frame(now) {
    if (!running || document.hidden) return;
    raf = requestAnimationFrame(frame);
    if (frameTime && now-frameTime < 1000/30-1) return;
    const dt = Math.min(.10, (now-(frameTime||now))/1000 || .033);
    frameTime = now;
    clock += dt;
    const wantOrient = screenOrient();
    if (images.cache?.[wantOrient] && images.baseOrient !== wantOrient) applyPack(wantOrient);
    if (layoutDirty) resize();
    const plates = images.overlays || {};
    faceNow = faces.step(dt, (key) => !!plates[key]);
    const art = currentArt();
    if (art) { paintRoomLayer(art); ctx.drawImage(staticRoom,0,0); }
    else { ctx.fillStyle="#21130b"; ctx.fillRect(0,0,canvas.width,canvas.height); }
    // Only the existing feathered expression, cat, smoke and reveal plates move.
    if (!reduce) { drawSmoke(dt); stepCat(dt); }
    updateReveal(dt); drawFaces(); drawReveal();
  }

  function screenOrient() {
    return portraitViewport.matches ? "portrait" : "landscape";
  }

  function applyPack(orient) {
    const pack = images.cache?.[orient];
    if (!pack?.base) return;
    images.base = pack.base;
    images.baseOrient = orient;
    layoutDirty = true;
    images.overlays = pack.overlays || {};
    if (orient === "portrait") images.portrait = pack.base;
    else images.room = pack.base;
    portraitMode = orient === 'portrait';
    for (const particle of smoke) Object.assign(particle, makePuff(false));
  }

  async function loadOverlaySet(orient) {
    const entries = await Promise.all(Object.entries(OVERLAYS[orient] || {}).map(async ([key, src]) => {
      return [key, await loadImage(`${src}?v=akinator-28`)];
    }));
    const overlays = {};
    for (const [key, image] of entries) if (image) overlays[key] = image;
    return overlays;
  }

  async function loadPack(orient) {
    const pack = { base: null, overlays: {} };
    pack.base = await loadImage(BASE[orient], 12000);
    loadOverlaySet(orient).then((overlays) => {
      pack.overlays = overlays || {};
      if (images.baseOrient === orient) images.overlays = pack.overlays;
    }).catch(() => {});
    return pack;
  }

  async function start() {
    const orient = screenOrient();
    images.cache = images.cache || {};
    if (!images.cache[orient]) images.cache[orient] = await loadPack(orient);
    applyPack(orient);
    // Load the other orientation only if the viewport actually rotates.
    resize();
    if (running) return;
    running = true;
    frameTime = 0;
    if (!document.hidden) raf = requestAnimationFrame(frame);
  }

  if (typeof ResizeObserver === 'function') new ResizeObserver(() => { if (running) resize(); }).observe(canvas);
  portraitViewport.addEventListener?.('change', async () => {
    if (!running) return;
    const orient = screenOrient();
    images.cache ||= {};
    if (!images.cache[orient]) images.cache[orient] = await loadPack(orient);
    if (running && screenOrient() === orient) { applyPack(orient); resize(); }
  });
  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(raf);
    frameTime = 0;
    if (running && !document.hidden) raf = requestAnimationFrame(frame);
  });

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (reveal && !reveal.done) {
      reveal.done = true;
      reveal.resolve({ printed: false });
    }
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
      writeDur: reduce ? 0.01 : Math.min(1.15, Math.max(0.55, (options.name || "").length * 0.05)),
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
      reveal.page = { canvas: ink, w: ink.width, h: ink.height };
      reveal.done = true;
      return { printed: !!photo };
    }
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  // Reprint an already-revealed answer in the selected language.
  function relabel(name, font) {
    if (!reveal || !name) return;
    const prepared = prepareInk(name, font);
    const paper = document.createElement("canvas");
    paper.width = ink.width;
    paper.height = ink.height;
    paper.getContext("2d").drawImage(ink, 0, 0);
    reveal.name = name;
    reveal.font = font;
    reveal.inkWidth = prepared.width;
    reveal.textX = prepared.textX;
    reveal.page = { canvas: paper, w: paper.width, h: paper.height };
    if (reveal.phase === "write") {
      reveal.phase = "present";
      reveal.t = 0;
      reveal.printed = !!reveal.photo;
    }
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
    blinkCat() { catLife.blink = 0.2; },
    flickCat() { catLife.flick = 0.35; },
    debug() {
      return {
        expression: faces.picture(),
        plates: Object.keys(images.overlays || {}),
        orient: images.baseOrient || "",
        portrait: portraitMode,
        revealBounds: reveal?.photo ? (() => {
          const { x, y, w, h, photoH } = noteMetrics(1);
          return { x, y, w, h, photoH, canvasW: canvas.width, canvasH: canvas.height };
        })() : null,
      };
    },
    playReveal, relabel, playWrong, playRetry, playDefeat, clearReveal,
  };
}

export function startMenuCat(canvas) {
  if (!canvas) return null;
  if (canvas._riddlexCatController) return canvas._riddlexCatController;
  canvas.dataset.catLive = "1";
  const life = { blink: 0, nextBlink: rand(0.6, 1.4), flick: 0, nextFlick: rand(1.2, 2.2) };
  let blinkImg = null;
  loadImage("./images/approved/menu-cat-blink.webp?v=akinator-27").then((img) => { blinkImg = img; });
  let last = 0;
  let running = false;
  let raf = 0;
  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.034, (now - (last || now)) / 1000 || 0.016);
    last = now;
    life.nextBlink -= dt;
    if (life.nextBlink <= 0) {
      life.blink = 0.28;
      life.nextBlink = 3 + Math.random() * 2;
    }
    if (life.blink > 0) life.blink = Math.max(0, life.blink - dt);
    life.nextFlick -= dt;
    if (life.nextFlick <= 0) {
      life.flick = 0.7;
      life.nextFlick = 4 + Math.random() * 2;
    }
    if (life.flick > 0) life.flick = Math.max(0, life.flick - dt);
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round((rect.height || rect.width * 0.72) * dpr));
    if (rect.width > 2 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    const shut = life.blink > 0 ? blinkCover(life.blink) : 0;
    if (blinkImg && shut > 0.02 && canvas.width > 2) {
      g.globalAlpha = Math.min(1, shut);
      g.drawImage(blinkImg, 0, 0, canvas.width, canvas.height);
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  const controller = {
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
  };
  canvas._riddlexCatController = controller;
  controller.resume();
  return controller;
}
