import {
  renderQuality,
  menuArtwork,
  caveArtwork,
  preloadImage,
  compactDevice,
} from "./performance.mjs?v=20261109-fast";
import {
  MEDALS,
  finishPresentation,
  finishMedal,
  finalStandings,
} from "./results.mjs";
import { createJungleLife } from "./jungle-life.mjs?v=20261109-fast";
import { createCavernEyes } from "./cavern-eyes.mjs?v=20261109-fast";
import { createFireworks } from "./fireworks.mjs?v=20261109-fast";
import { createCinematic } from "./cinematic.mjs?v=20261109-fast";
import { createMenuScene } from "./menu-scene.mjs?v=20261109-fast";
import { createLava } from "./lava.mjs?v=20261109-fast";
import {
  snakeCurve,
  headPoseFromPath,
} from "./snake-geometry.mjs?v=20261108-joined";
import {
  createBodyCanvas,
  paintBodies,
  preloadBodyAssets,
} from "./serpent-renderer.mjs?v=20261109-fast";
import { setGameInProgress } from "../refresh-guard.mjs";
import {
  SNAKES,
  LADDERS,
  COLORS,
  HEX,
  center,
  squares,
  die,
  createGame,
  roll,
  settle,
  placement,
  chooseColor,
} from "./engine.mjs?v=20261109-medals";
const $ = (s) => document.querySelector(s),
  NS = "http://www.w3.org/2000/svg";
const svg = (tag, attrs = {}, parent) => {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent?.append(el);
  return el;
};
const read = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
};
const save = (key, v) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {}
};
let settings = read("serpent-settings", {
  sfx: false,
  ambience: false,
  quality: "Balanced",
  motion: true,
  botDelay: 900,
});
let audioMuted = read("serpent-muted", !(settings.sfx || settings.ambience));
let stats = read("serpent-stats", {
  gamesPlayed: 0,
  humanWins: 0,
  botWins: 0,
  multiplayerWins: 0,
  totalDiceRolls: 0,
  snakeEncounters: 0,
  ladderClimbs: 0,
  highestFinishingPosition: null,
});
let state = null,
  busy = false,
  epoch = 0,
  raf = 0,
  lastBoardFrame = -Infinity,
  botTimer = 0,
  introTimer = 0,
  finishTimer = 0,
  paths = {},
  pawns = [],
  bodyCanvas = null,
  activeRollAnimation = null,
  context,
  ambienceNode;
const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
const reduced = () => motionQuery.matches || !settings.motion;
const liveLava = createLava($("#live-lava"), {
  motion: () => !reduced(),
  quality: () => renderQuality(settings.quality),
});
function applySettings() {
  document.body.classList.toggle("reduced", reduced());
  document.body.classList.toggle(
    "low",
    renderQuality(settings.quality) === "Low",
  );
  const sound = $("#sound"),
    label = audioMuted ? "Unmute sound" : "Mute sound";
  sound.setAttribute("aria-label", label);
  sound.setAttribute("title", label);
  sound.setAttribute("aria-pressed", String(!audioMuted));
  sound.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4Z"/>${audioMuted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M16 8q5 4 0 8M19 5q8 7 0 14"/>'}</svg>`;
  save("serpent-muted", audioMuted);
  save("serpent-settings", settings);
  updateAmbience();
  if (boardAnimationActive()) {
    cancelAnimationFrame(raf);
    lastBoardFrame = -Infinity;
    raf = requestAnimationFrame(animateBoard);
  } else if (state && !$("#play").hidden && reduced()) {
    cancelAnimationFrame(raf);
    lastBoardFrame = -Infinity;
    animateBoard(0);
  }
  if (state && !$("#play").hidden && $("#celebration").hidden) liveLava.start();
}
function audio() {
  try {
    context ??= new AudioContext();
    context.resume();
    return context;
  } catch {
    return null;
  }
}
function tone(f = 400, d = 0.12) {
  if (!settings.sfx || audioMuted) return;
  const a = audio();
  if (!a) return;
  const o = a.createOscillator(),
    g = a.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(f, a.currentTime);
  o.frequency.exponentialRampToValueAtTime(f / 2, a.currentTime + d);
  g.gain.setValueAtTime(0.06, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + d);
  o.connect(g).connect(a.destination);
  o.start();
  o.stop(a.currentTime + d);
}
function updateAmbience() {
  if (ambienceNode) {
    try {
      ambienceNode.stop();
    } catch {}
    ambienceNode = null;
  }
  if (!settings.ambience || audioMuted || !context || document.hidden) return;
  const a = context,
    o = a.createOscillator(),
    g = a.createGain();
  o.type = "triangle";
  o.frequency.value = document.body.classList.contains("playing") ? 58 : 110;
  g.gain.value = 0.012;
  o.connect(g).connect(a.destination);
  o.start();
  ambienceNode = o;
}
function pinMarkup(color) {
  return `<svg class="pin-avatar" viewBox="0 0 64 77" aria-hidden="true" style="--pawn:${HEX[COLORS.indexOf(color)]}"><path class="pin-outline" d="M32 3C17 3 5 15 5 31c0 15 17 34 27 46 10-12 27-31 27-46C59 15 47 3 32 3Z"/><path class="pin-color" d="M32 9C20 9 11 18 11 31c0 11 13 27 21 38 8-11 21-27 21-38C53 18 44 9 32 9Z"/><circle class="pin-face" cx="32" cy="29" r="13"/><ellipse class="pin-gloss" cx="26" cy="22" rx="4" ry="6"/></svg>`;
}
function colorOptions() {
  const count = $("#mode").value === "bot" ? 2 : +$("#mode").value;
  $("#colors").innerHTML = Array.from(
    { length: count },
    (_, i) =>
      `<div class="setup-color"><button type="button" data-setup-color="${i}" data-short-name="${i === 1 && $("#mode").value === "bot" ? "Bot" : "P" + (i + 1)}" aria-label="${i === 1 && $("#mode").value === "bot" ? "Bot" : "Player " + (i + 1)}: choose pawn color">${pinMarkup(COLORS[i])}<span>${i === 1 && $("#mode").value === "bot" ? "Bot" : "Player " + (i + 1)}<small>${COLORS[i]}</small></span></button><select data-color="${i}" hidden aria-hidden="true">${COLORS.map((c, j) => `<option ${i === j ? "selected" : ""}>${c}</option>`).join("")}</select></div>`,
  ).join("");
}
function colorPicker(i, inMatch = false) {
  if (
    busy ||
    (inMatch && (state?.colorsLocked || state?.rolls > 0)) ||
    (!inMatch && !$("#play").hidden)
  )
    return;
  clearTimeout(botTimer);
  const selects = [...document.querySelectorAll("[data-color]")],
    current = inMatch ? state.players[i].color : selects[i].value;
  $("#dialog-content").innerHTML =
    `<h2 class="sr-only">Choose pawn color</h2><p class="sr-only">Player ${i + 1} · Colors lock on the first die roll. Choosing an occupied color swaps the two players.</p><div class="color-palette">${["Red", "Blue", "Green", "Brown", "Purple", "Orange", "Pink", "Yellow", "Teal"].map((c) => `<button type="button" data-pick-color="${c}" aria-label="${c}" aria-pressed="${c === current}"><span class="color-swatch" style="--swatch:${HEX[COLORS.indexOf(c)]}"></span><span>${c}</span></button>`).join("")}</div>`;
  $("#dialog-content").onclick = (e) => {
    const button = e.target.closest("[data-pick-color]");
    if (!button || busy || (inMatch && (state.colorsLocked || state.rolls > 0)))
      return;
    const color = button.dataset.pickColor;
    if (inMatch) {
      state = chooseColor(state, i, color);
      state.players.forEach((p, j) => {
        selects[j].value = p.color;
        pawns[j].style.setProperty("--pawn", HEX[COLORS.indexOf(p.color)]);
      });
      render();
    } else {
      const other = selects.find((s, j) => j !== i && s.value === color);
      if (other) other.value = current;
      selects[i].value = color;
    }
    selects.forEach((s, j) => {
      const head = document.querySelector(`[data-setup-color="${j}"]`);
      head.innerHTML =
        pinMarkup(s.value) +
        `<span>${j === 1 && $("#mode").value === "bot" ? "Bot" : "Player " + (j + 1)}<small>${s.value}</small></span>`;
    });
    $("#dialog").close();
    document
      .querySelector(
        inMatch ? `[data-game-color="${i}"]` : `[data-setup-color="${i}"]`,
      )
      ?.focus();
  };
  const dialog = $("#dialog");
  dialog.classList.add("color-dialog");
  dialog.showModal();
  const anchor = document
      .querySelector(
        inMatch ? `[data-game-color="${i}"]` : `[data-setup-color="${i}"]`,
      )
      .getBoundingClientRect(),
    rect = dialog.getBoundingClientRect();
  dialog.style.left =
    Math.max(
      8,
      Math.min(
        innerWidth - rect.width - 8,
        anchor.left + anchor.width / 2 - rect.width / 2,
      ),
    ) + "px";
  dialog.style.top =
    Math.max(8, Math.min(innerHeight - rect.height - 8, anchor.bottom + 7)) +
    "px";
}
$("#colors").onclick = (e) => {
  const b = e.target.closest("[data-setup-color]");
  if (b) colorPicker(+b.dataset.setupColor);
};
function board() {
  preloadBodyAssets().catch(() => {});
  const b = $("#board");
  document
    .querySelectorAll(".board-base,.living-serpents")
    .forEach((e) => e.remove());
  b.replaceChildren();
  paths = {};
  const defs = svg("defs", {}, b);
  const gradient = (id, stops, horizontal = false) => {
    const g = svg(
      "linearGradient",
      {
        id,
        x1: "0%",
        y1: "0%",
        x2: horizontal ? "100%" : "0%",
        y2: horizontal ? "0%" : "100%",
      },
      defs,
    );
    stops.forEach(([offset, color]) =>
      svg("stop", { offset, "stop-color": color }, g),
    );
  };
  gradient(
    "ladder-gold",
    [
      ["0%", "#613008"],
      ["20%", "#fff5b3"],
      ["40%", "#e7a72d"],
      ["65%", "#ffe881"],
      ["100%", "#7e3e09"],
    ],
    true,
  );
  gradient("tile-bevel", [
    ["0%", "#fff3bb"],
    ["12%", "#d79825"],
    ["50%", "#98601c"],
    ["85%", "#ffd970"],
    ["100%", "#68330b"],
  ]);
  const gold = defs.querySelector("#ladder-gold");
  Object.entries({
    gradientUnits: "userSpaceOnUse",
    x1: 0,
    y1: 0,
    x2: 1.5,
    y2: 1.5,
    spreadMethod: "reflect",
  }).forEach(([k, v]) => gold.setAttribute(k, v));
  for (const [name, offset] of [
    ["emerald", 0],
    ["ivory", -10],
  ]) {
    const pat = svg(
      "pattern",
      {
        id: "material-" + name,
        width: 10,
        height: 10,
        patternUnits: "userSpaceOnUse",
      },
      defs,
    );
    svg(
      "image",
      {
        href: "assets/marble-atlas.webp",
        x: offset,
        y: 0,
        width: 20,
        height: 10,
        preserveAspectRatio: "none",
      },
      pat,
    );
  }
  for (const { n, x, y } of squares) {
    const light = (Math.floor((n - 1) / 10) + (x - 5) / 10) % 2;
    svg(
      "rect",
      {
        x: x - 5,
        y: y - 5,
        width: 10,
        height: 10,
        rx: 0.45,
        fill: "url(#tile-bevel)",
        stroke: "#361806",
        "stroke-width": 0.16,
      },
      b,
    );
    svg(
      "rect",
      {
        x: x - 4.7,
        y: y - 4.7,
        width: 9.4,
        height: 9.4,
        rx: 0.34,
        fill: `url(#material-${light ? "ivory" : "emerald"})`,
        stroke: light ? "#ffe9a6" : "#859947",
        "stroke-width": 0.12,
      },
      b,
    );
    svg(
      "path",
      {
        d: `M ${x - 4.45} ${y + 4.4} V ${y - 4.4} H ${x + 4.4}`,
        fill: "none",
        stroke: "#fff5b8",
        "stroke-width": 0.12,
        opacity: 0.6,
      },
      b,
    );
    if (n === 100 || n === 1)
      svg(
        "rect",
        {
          x: x - 4.6,
          y: y - 4.6,
          width: 9.2,
          height: 9.2,
          rx: 0.3,
          class: n === 100 ? "finish-cell" : "start-cell",
          fill: n === 100 ? "#ffffff" : "#3ab529",
          opacity: n === 100 ? 1 : 0.4,
          stroke: "#ffe792",
          "stroke-width": 0.25,
        },
        b,
      );
  }
  gradient(
    "ladder-rail",
    [
      ["0%", "#5b2908"],
      ["16%", "#ffeb9e"],
      ["34%", "#be6e16"],
      ["58%", "#f7d06d"],
      ["82%", "#9b4c0e"],
      ["100%", "#ffe3a0"],
    ],
    true,
  );
  gradient("ladder-rung", [
    ["0%", "#fff2a6"],
    ["28%", "#df9f31"],
    ["65%", "#ae5b0d"],
    ["100%", "#582b0a"],
  ]);
  for (const [a, z] of Object.entries(LADDERS)) {
    const p = center(+a),
      q = center(z),
      dx = q.x - p.x,
      dy = q.y - p.y,
      len = Math.hypot(dx, dy),
      ux = dx / len,
      uy = dy / len,
      nx = -uy,
      ny = ux;
    const g = svg(
      "g",
      {
        "data-ladder": a,
        transform: `matrix(${nx} ${ny} ${ux} ${uy} ${p.x} ${p.y})`,
        class: "sculpted-ladder",
      },
      b,
    );
    for (const x of [-1.5, 1.5]) {
      svg(
        "rect",
        {
          x: x - 0.38 + 0.25,
          y: 0.25,
          width: 0.76,
          height: len,
          rx: 0.14,
          fill: "#2a1409",
          opacity: 0.8,
        },
        g,
      );
      svg(
        "path",
        {
          d: `M ${x + 0.32} 0 l .26 .28 V ${len + 0.28} l -.26 -.28 Z`,
          fill: "#73400e",
        },
        g,
      );
      svg(
        "rect",
        {
          x: x - 0.36,
          y: 0,
          width: 0.72,
          height: len,
          rx: 0.12,
          fill: "url(#ladder-rail)",
          stroke: "#ffdfa1",
          "stroke-width": 0.08,
        },
        g,
      );
      svg(
        "path",
        {
          d: `M ${x - 0.23} .1 V ${len - 0.1}`,
          stroke: "#fff0aa",
          "stroke-width": 0.09,
          fill: "none",
          opacity: 0.8,
        },
        g,
      );
    }
    const rungs = Math.max(2, Math.ceil(len / 2.2));
    for (let j = 0; j <= rungs; j++) {
      const y = 0.38 + ((len - 0.76) * j) / rungs;
      svg(
        "path",
        { d: `M -1.55 ${y + 0.3} H 1.55 l .2 .3 H -1.35 Z`, fill: "#673608" },
        g,
      );
      svg(
        "rect",
        {
          x: -1.55,
          y: y - 0.25,
          width: 3.1,
          height: 0.55,
          rx: 0.08,
          fill: "url(#ladder-rung)",
          stroke: "#eebd5a",
          "stroke-width": 0.07,
        },
        g,
      );
      svg(
        "path",
        {
          d: `M -1.42 ${y - 0.16} H 1.42`,
          stroke: "#fff3bf",
          "stroke-width": 0.1,
        },
        g,
      );
      for (const x of [-1.49, 1.49])
        svg(
          "circle",
          {
            cx: x,
            cy: y,
            r: 0.11,
            fill: "#633810",
            stroke: "#f2d181",
            "stroke-width": 0.05,
          },
          g,
        );
    }
    paths[a] = { kind: "ladder", p, q };
  }
  bodyCanvas = createBodyCanvas(b);
  Object.entries(SNAKES).forEach(([a, z], i) => {
    const p = center(+a),
      q = center(z),
      g = svg("g", { "data-snake": a }, b),
      color = [
        "#8d7452",
        "#5d573f",
        "#68883d",
        "#262b29",
        "#8d7452",
        "#5d573f",
        "#68883d",
        "#262b29",
      ][i];
    gradient(
      `serpent-shade-${i}`,
      [
        ["0%", "#fff2a0"],
        ["22%", color],
        ["55%", color],
        ["100%", "#153117"],
      ],
      true,
    );
    gradient(`scale-relief-${i}`, [
      ["0%", "#fff0a4"],
      ["18%", color],
      ["60%", color],
      ["100%", "#172416"],
    ]);
    const pat = svg(
      "pattern",
      {
        id: `scales-${i}`,
        width: 1.7,
        height: 1.3,
        patternUnits: "userSpaceOnUse",
      },
      defs,
    );
    svg(
      "path",
      {
        d: "M .85 .03 L 1.67 .65 L .85 1.27 L .03 .65 Z",
        fill: `url(#scale-relief-${i})`,
        stroke: "#ffe3a2",
        "stroke-width": 0.06,
        opacity: 0.8,
      },
      pat,
    );
    svg(
      "path",
      {
        d: "M 0 0 L .85 .65 L 1.7 0 M -.85 .65 L 0 1.3 L .85 .65 L 1.7 1.3 L 2.55 .65",
        fill: "none",
        stroke: "#221607",
        "stroke-width": 0.16,
        opacity: 0.7,
      },
      pat,
    );
    svg(
      "path",
      {
        d: "M .12 .04 L .85 .55 L 1.58 .04 M .12 1.25 L .85 .76 L 1.58 1.25",
        fill: "none",
        stroke: "#ffdf7e",
        "stroke-width": 0.09,
        opacity: 0.8,
      },
      pat,
    );
    const mask = svg(
      "mask",
      {
        id: `taper-${i}`,
        maskUnits: "userSpaceOnUse",
        x: 0,
        y: 0,
        width: 100,
        height: 100,
      },
      defs,
    );
    const taper = svg("path", { fill: "white" }, mask);
    const path = svg(
      "path",
      { class: "snake-body", stroke: "#201305", "stroke-width": 3.5 },
      g,
    );
    const inner = svg(
      "path",
      {
        class: "snake-body",
        stroke: `url(#serpent-shade-${i})`,
        "stroke-width": 2.95,
      },
      g,
    );
    const sheen = svg(
      "path",
      {
        class: "snake-body",
        stroke: "#fff5ad",
        "stroke-width": 1.5,
        opacity: 0.33,
        transform: "translate(-.35 -.3)",
      },
      g,
    );
    const pattern = svg(
      "path",
      { class: "snake-body", stroke: `url(#scales-${i})`, "stroke-width": 2.8 },
      g,
    );
    const head = svg(
      "g",
      {
        transform: `translate(${p.x} ${p.y})`,
        class: "painted-head integrated-head",
        "data-head-square": a,
      },
      g,
    );
    const title = svg("title", {}, head);
    title.textContent = `Snake ${a} to ${z}`;
    for (const layer of [path, inner, sheen, pattern]) {
      layer.setAttribute("mask", `url(#taper-${i})`);
      layer.setAttribute("opacity", 0);
    }
    paths[a] = {
      kind: "snake",
      p,
      q,
      path,
      inner,
      sheen,
      pattern,
      taper,
      head,
      g,
      i,
      color,
    };
  });
  for (const { n, x, y } of squares) {
    if (n === 100) {
      const clip = svg("clipPath", { id: "finish-crown-clip" }, defs);
      svg("rect", { x: x - 4.75, y: y - 3.13, width: 9.5, height: 6.26 }, clip);
      const crown = svg(
        "g",
        {
          class: "finish-crown",
          "data-medal": "gold",
          role: "img",
          "aria-label": "Finish — square 100",
          "clip-path": "url(#finish-crown-clip)",
        },
        b,
      );
      const factor = 9.5 / 220;
      svg(
        "image",
        {
          href: "assets/royal-logo.webp",
          x: x - 4.75 - 340 * factor,
          y: y - 3.13,
          width: 900 * factor,
          height: 375 * factor,
        },
        crown,
      );
      continue;
    }
    const text = svg(
      "text",
      {
        x: x - 3.8,
        y: y - 2.5,
        class: `square-number ${(Math.floor((n - 1) / 10) + (x - 5) / 10) % 2 ? "light" : ""}`,
      },
      b,
    );
    text.textContent = n;
  }
  pawns = state.players.map((p, i) => {
    const g = svg(
      "g",
      {
        class: "pawn pin-pawn",
        "data-player": i,
        style: `--pawn:${HEX[COLORS.indexOf(p.color)]}`,
      },
      b,
    );
    const pin = svg(
      "svg",
      {
        x: -3.5,
        y: -(7 * 77) / 64,
        width: 7,
        height: (7 * 77) / 64,
        viewBox: "0 0 64 77",
        class: "pin-pawn-art",
      },
      g,
    );
    svg(
      "path",
      {
        d: "M32 3C17 3 5 15 5 31c0 15 17 34 27 46 10-12 27-31 27-46C59 15 47 3 32 3Z",
        class: "pin-outline",
      },
      pin,
    );
    svg(
      "path",
      {
        d: "M32 9C20 9 11 18 11 31c0 11 13 27 21 38 8-11 21-27 21-38C53 18 44 9 32 9Z",
        class: "pin-color",
      },
      pin,
    );
    svg("circle", { cx: 32, cy: 29, r: 13, class: "pin-face" }, pin);
    svg("ellipse", { cx: 26, cy: 22, rx: 4, ry: 6, class: "pin-gloss" }, pin);
    return g;
  });
  state.players.forEach((p, i) => place(i, p.position));
}
function curve(p, q, i, time = 0) {
  return snakeCurve(p, q, i, time, !reduced());
}
function taperedRibbon(d) {
  const [x0, y0, x1, y1, x2, y2, x3, y3] = d.match(/-?[\d.]+/g).map(Number),
    left = [],
    right = [];
  for (let k = 0; k <= 40; k++) {
    const t = k / 40,
      u = 1 - t,
      x =
        u * u * u * x0 +
        3 * u * u * t * x1 +
        3 * u * t * t * x2 +
        t * t * t * x3,
      y =
        u * u * u * y0 +
        3 * u * u * t * y1 +
        3 * u * t * t * y2 +
        t * t * t * y3;
    const dx =
        3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2),
      dy =
        3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2),
      len = Math.hypot(dx, dy) || 1,
      w = 1.85 * Math.min(1, (1 - t) / 0.24);
    left.push(`${x - (dy / len) * w} ${y + (dx / len) * w}`);
    right.push(`${x + (dy / len) * w} ${y - (dx / len) * w}`);
  }
  return `M ${left.join(" L ")} L ${right.reverse().join(" L ")} Z`;
}
function boardAnimationActive() {
  return (
    state &&
    !$("#play").hidden &&
    !document.hidden &&
    $("#celebration").hidden &&
    !document.body.classList.contains("mouth-crossing") &&
    !reduced()
  );
}
function animateBoard(t) {
  const interval =
    renderQuality(settings.quality) === "High"
      ? 33
      : renderQuality(settings.quality) === "Low"
        ? 125
        : 67;
  if (t - lastBoardFrame < interval) {
    if (boardAnimationActive()) raf = requestAnimationFrame(animateBoard);
    return;
  }
  lastBoardFrame = t;
  for (const item of Object.values(paths)) {
    if (item.kind === "snake") {
      const d = curve(item.p, item.q, item.i, t);
      item.path.setAttribute("d", d);
      item.head.setAttribute(
        "transform",
        `translate(${item.p.x} ${item.p.y}) rotate(${(headPoseFromPath(d).angle * 180) / Math.PI})`,
      );
    }
  }
  if (bodyCanvas)
    paintBodies(
      bodyCanvas,
      Object.values(paths).filter((p) => p.kind === "snake"),
      reduced() ? 0 : t,
      renderQuality(settings.quality),
    );
  if (boardAnimationActive()) raf = requestAnimationFrame(animateBoard);
}
function place(i, n, point) {
  const p = point ?? (n ? center(n) : { x: 3 + i * 3, y: 103 });
  const peers = state?.players
      .map((v, j) => (v.position === n ? j : -1))
      .filter((j) => j >= 0) ?? [i],
    slot = peers.indexOf(i),
    shared = !point && n > 0 && peers.length > 1;
  // The pin tip is its local origin. Shared pawns fan around this same
  // square-center anchor instead of moving their tips into the cell corners.
  const angle = !shared
    ? 0
    : (peers.length === 2
        ? [-35, 35]
        : peers.length === 3
          ? [-65, 0, 65]
          : [-135, -45, 45, 135])[Math.max(0, slot)];
  pawns[i]?.setAttribute(
    "transform",
    `translate(${p.x} ${p.y}) rotate(${angle}) scale(${shared ? (peers.length === 2 ? 0.62 : 0.56) : 1})`,
  );
  pawns[i]?.setAttribute("data-position", n);
  pawns[i]?.setAttribute(
    "visibility",
    (!n && !point) ||
      (state.order.includes(i) && state.players[i].position === 100)
      ? "hidden"
      : "visible",
  );
}
const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : ms));
async function travel(
  i,
  p,
  q,
  ms,
  token,
  path = null,
  climb = false,
  hop = false,
) {
  if (reduced()) {
    place(i, 0, q);
    return;
  }
  const start = performance.now();
  await new Promise((resolve) => {
    function frame(t) {
      if (token !== epoch) {
        resolve();
        return;
      }
      const f = Math.min(1, (t - start) / ms),
        pt = path
          ? path.getPointAtLength(path.getTotalLength() * f)
          : { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
      place(i, 0, {
        x: pt.x + (climb ? Math.sin(f * Math.PI * 16) * 0.45 : 0),
        y: pt.y - (hop ? Math.sin(f * Math.PI) * 1.1 : 0),
      });
      if (f < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
const DIE_FACES = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};
const DIE_ROTATION = {
  1: [0, 0],
  2: [0, -90],
  3: [-90, 0],
  4: [90, 0],
  5: [0, 90],
  6: [0, 180],
};
function dieCube(value = 1) {
  return `<span class="cube-stage" aria-hidden="true"><span class="die-cube" style="--rx:${DIE_ROTATION[value][0]}deg;--ry:${DIE_ROTATION[value][1]}deg">${[1, 2, 3, 4, 5, 6].map((n) => `<span class="die-face face-${n}" data-face="${n}">${DIE_FACES[n].map(([x, y]) => `<i class="pip" style="--px:${x};--py:${y}"></i>`).join("")}</span>`).join("")}</span></span>`;
}
function render() {
  if (!state) return;
  setGameInProgress(!$("#play").hidden && state.phase !== "over");
  $("#players").style.setProperty("--player-count", state.players.length);
  $("#players").dataset.count = state.players.length;
  $("#players").dataset.mode = state.bot ? "bot" : "local";
  $("#players").innerHTML = state.players
    .map((p, i) => {
      const rank = state.order.indexOf(i),
        bot = state.bot && i === 1,
        active =
          i === state.current &&
          state.phase === "ready" &&
          !busy &&
          rank < 0 &&
          $("#celebration").hidden;
      return `<div class="player-row ${i === state.current ? "current" : ""} ${rank >= 0 ? "finished" : ""}" style="--pawn:${HEX[COLORS.indexOf(p.color)]}" data-player-card="${i}"><button type="button" class="player-head" data-game-color="${i}" aria-label="${p.name}: ${state.colorsLocked ? "colors locked" : "choose pawn color"}" ${state.colorsLocked || busy || state.rolls > 0 ? "disabled" : ""}>${pinMarkup(p.color)}<strong>${p.name}</strong></button><button type="button" class="player-die" data-roll="${i}" aria-label="${p.name}: ${p.lastDice ? "last roll " + p.lastDice + ". " : ""}${bot ? "Bot rolls automatically" : p.position === 0 ? "Roll a 1 to enter" : "Roll dice"}" ${!active || bot ? "disabled" : ""}>${dieCube(p.lastDice ?? 1)}</button><span class="player-position">${rank >= 0 ? (state.players.length === 2 ? (state.bot ? "" : rank === 0 ? "Winner" : "") : placement(rank, state.players.length)) : p.position === 0 ? "Roll 1 to enter" : `Square ${p.position}`}</span></div>`;
    })
    .join("");
  fitGame();
  if ($("#celebration").hidden && $("#intro").hidden) {
    liveLava.start();
    cavernEyes.start();
  }
}
function fitGame() {
  if (!state || $("#play").hidden) return;
  const height = Math.min(
      innerHeight,
      window.visualViewport?.height ?? innerHeight,
    ),
    portrait = innerWidth < 820 && height > innerWidth,
    desktop = innerWidth >= 1000 && height >= 600;
  document.body.classList.toggle("desktop-game", desktop);
  document.body.classList.toggle("portrait-game", portrait);
  window.scrollTo(0, 0);
  const layout = $(".game-layout"),
    main = $("main"),
    aside = $("#play aside"),
    top = layout.getBoundingClientRect().top;
  const width =
    main.clientWidth -
    parseFloat(getComputedStyle(main).paddingLeft) -
    parseFloat(getComputedStyle(main).paddingRight);
  const size = desktop
    ? Math.min(height - top - 30, width - 360, 920)
    : portrait
      ? Math.min(width, height - top - aside.offsetHeight - 18)
      : Math.min(height - top - 23, width - 214, 920);
  $(".board-frame").style.setProperty(
    "--board-pad",
    getComputedStyle($(".board-frame")).paddingLeft,
  );
  if (bodyCanvas)
    bodyCanvas.dataset.renderSize = String(Math.max(120, Math.floor(size)));
  document.body.style.setProperty(
    "--board-size",
    Math.max(120, Math.floor(size)) + "px",
  );
}
async function spinDie(i, value, token) {
  const cube = document.querySelector(`[data-roll="${i}"] .die-cube`);
  const button = cube?.closest("button");
  if (!cube) return;
  button.classList.add("rolling");
  const [rx, ry] = DIE_ROTATION[value];
  const startX = parseFloat(cube.style.getPropertyValue("--rx")) || 0,
    startY = parseFloat(cube.style.getPropertyValue("--ry")) || 0;
  if (!reduced()) {
    const animation = cube.animate(
      [
        {
          transform: `rotateX(${startX}deg) rotateY(${startY}deg) rotateZ(0deg)`,
          offset: 0,
        },
        ...[1, 3, 6, 4, 2, 5, 6, 2, 4, 1, 5, 3].map((face, j) => ({
          transform: `rotateX(${DIE_ROTATION[face][0] + 360 * (j + 1)}deg) rotateY(${DIE_ROTATION[face][1] + 360 * (j + 1)}deg) rotateZ(0deg)`,
          offset: 0.055 + j * 0.075,
        })),
        {
          transform: `rotateX(${rx + 4680}deg) rotateY(${ry + 4680}deg) rotateZ(0deg)`,
          offset: 1,
        },
      ],
      {
        duration: 620,
        easing: "linear",
        fill: "forwards",
      },
    );
    activeRollAnimation = animation;
    await animation.finished.catch(() => {});
    animation.cancel();
    if (activeRollAnimation === animation) activeRollAnimation = null;
  }
  if (token !== epoch) return;
  cube.style.setProperty("--rx", rx + "deg");
  cube.style.setProperty("--ry", ry + "deg");
  button.classList.remove("rolling");
  button.dataset.result = value;
}
function scheduleBot() {
  clearTimeout(botTimer);
  if (
    state?.phase === "ready" &&
    state.bot &&
    state.current === 1 &&
    !busy &&
    !document.hidden &&
    $("#celebration").hidden &&
    !$("#dialog").open &&
    $("#intro").hidden
  )
    botTimer = setTimeout(() => takeTurn(), Number(settings.botDelay));
}
async function takeTurn() {
  if (
    !state ||
    busy ||
    state.phase !== "ready" ||
    !$("#celebration").hidden ||
    !$("#intro").hidden
  )
    return;
  busy = true;
  state = { ...state, colorsLocked: true };
  const token = epoch,
    i = state.current;
  render();
  if (state.rolls === 0 && state.bot)
    setTimeout(() => {
      preloadImage("assets/victory-emblem.webp").catch(() => {});
      preloadImage("assets/defeat-title.webp").catch(() => {});
    }, 1000);
  const value = die();
  tone(250, 0.25);
  await spinDie(i, value, token);
  if (token !== epoch) return;
  const result = roll(state, value);
  state = result.state;
  stats.totalDiceRolls++;
  render();
  $("#status").textContent =
    `${state.players[i].name} rolled ${state.dice}${result.waitingForOne ? " — a 1 is needed to enter." : result.activated ? " — pawn activated!" : result.penalty ? " — third six: turn ends." : ""}`;
  for (let n = result.from + 1; n <= result.landing; n++) {
    const p = n === 1 ? center(1) : center(n - 1),
      q = center(n);
    await travel(i, p, q, 245, token, null, false, true);
    if (token !== epoch) return;
    place(i, n);
    pawns[i].dataset.step = String(n);
    await delay(170);
    if (token !== epoch) return;
    tone(300 + n * 3, 0.045);
  }
  place(i, result.landing);
  if (result.kind !== "move") {
    await delay(300);
    if (token !== epoch) return;
    const item = paths[result.landing];
    $("#status").textContent =
      result.kind === "snake"
        ? `Swallowed! Sliding to ${result.target}.`
        : `Climbing to ${result.target}.`;
    if (result.kind === "snake") {
      stats.snakeEncounters++;
      item.g.classList.add("active-snake");
      await delay(350);
      if (token !== epoch) return;
      pawns[i].style.opacity = ".3";
      const glow = svg(
        "circle",
        {
          r: 2.2,
          fill: HEX[COLORS.indexOf(state.players[i].color)],
          opacity: 0.8,
        },
        $("#board"),
      );
      const movingPath = item.path;
      const timer = setInterval(() => {
        const tr = pawns[i]?.getAttribute("transform");
        if (tr) glow.setAttribute("transform", tr);
      }, 30);
      await travel(i, item.p, item.q, 1500, token, movingPath);
      clearInterval(timer);
      glow.remove();
      pawns[i].style.opacity = "1";
      item.g.classList.remove("active-snake");
      tone(95, 0.3);
    } else {
      stats.ladderClimbs++;
      pawns[i].style.filter = "drop-shadow(0 0 2px gold)";
      await travel(i, item.p, item.q, 1300, token, null, true);
      pawns[i].style.filter = "";
      tone(700, 0.2);
    }
  }
  if (token !== epoch) return;
  place(i, result.target);
  const done = settle(result);
  state = done.state;
  busy = false;
  save("serpent-stats", stats);
  state.players.forEach((p, j) => place(j, p.position));
  render();
  if (done.finisher !== null) celebrate(done.finisher);
  else {
    $("#status").textContent =
      `${state.players[state.current].name}'s turn${state.sixes ? " — extra roll" : ""}${state.players[state.current].position === 0 ? " · Roll a 1 to enter" : ""}.`;
    scheduleBot();
  }
}
function cancel() {
  $("#start").removeAttribute("aria-busy");
  $("#start").querySelector("span:last-child").textContent = "Play Now";
  liveLava.stop();
  resultFireworks.stop();
  entranceCinema.cancel();
  defeatCinema.cancel();
  $(".menu-hero").style.removeProperty("transform");
  $(".menu-hero").style.removeProperty("opacity");
  $(".menu-hero").style.removeProperty("transform-origin");
  document
    .querySelectorAll("#royal-upper,#royal-lower,.menu-mouth-cavity")
    .forEach((e) => {
      e.style.removeProperty("transform");
      e.style.removeProperty("opacity");
    });
  setGameInProgress(false);
  epoch++;
  activeRollAnimation?.cancel();
  activeRollAnimation = null;
  clearTimeout(botTimer);
  clearTimeout(introTimer);
  clearTimeout(finishTimer);
  cancelAnimationFrame(raf);
  busy = false;
  $("#celebration").hidden = true;
  $("main").inert = false;
  $("header").inert = false;
  $("#intro").hidden = true;
  $("#intro").classList.remove("reveal");
  document.body.classList.remove("entering", "arriving");
}
async function begin(skip = false) {
  cancel();
  const loadingToken = epoch,
    start = $("#start");
  start.disabled = true;
  start.setAttribute("aria-busy", "true");
  start.querySelector("span:last-child").textContent = "Loading…";
  $("main").inert = true;
  audio();
  try {
    await Promise.all([
      preloadBodyAssets(),
      ...[
        caveArtwork(),
        menuArtwork(),
        "assets/marble-atlas.webp",
        "assets/royal-logo.webp",
      ].map(preloadImage),
    ]);
  } catch {
    if (epoch !== loadingToken) return;
    start.disabled = false;
    start.removeAttribute("aria-busy");
    start.querySelector("span:last-child").textContent = "Play Now";
    $("main").inert = false;
    $("#dialog-content").innerHTML =
      "<h2>The realm could not load</h2><p>Please check your connection and try Play Now again.</p>";
    $("#dialog").showModal();
    return;
  }
  if (epoch !== loadingToken) return;
  start.removeAttribute("aria-busy");
  start.querySelector("span:last-child").textContent = "Play Now";

  const mode = $("#mode").value,
    colors = [...document.querySelectorAll("[data-color]")].map((s) => s.value);
  state = createGame(colors.length, mode === "bot", colors);
  stats.gamesPlayed++;
  save("serpent-stats", stats);
  audio();
  board();
  const token = epoch;
  let prepared = false;
  const prepare = () => {
    if (token !== epoch || prepared) return;
    prepared = true;
    document.body.classList.add("playing");
    if (!document.body.classList.contains("entering")) $("#menu").hidden = true;
    $("#play").hidden = false;
    updateAmbience();
    render();
    $("#status").textContent = `${state.players[0].name}: roll a 1 to enter.`;
    fitGame();
    raf = requestAnimationFrame(animateBoard);
  };
  const reveal = () => {
    if (token !== epoch) return;
    prepare();
    $("#menu").hidden = true;
    document.body.classList.remove("entering", "arriving");
    $("#intro").hidden = true;
    $("#intro").classList.remove("reveal");
    $("#play").style.removeProperty("--arrival-blur");
    $("#play").style.removeProperty("--arrival-scale");
    $("#play").style.removeProperty("--arrival-opacity");
    $("#start").disabled = false;
    $("main").inert = false;
    $("header").inert = false;
    fitGame();
    cancelAnimationFrame(raf);
    lastBoardFrame = -Infinity;
    raf = requestAnimationFrame(animateBoard);
    liveLava.start();
    cavernEyes.start();
    scheduleBot();
  };
  $("#start").disabled = true;
  if (skip || reduced()) reveal();
  else {
    $("#intro").hidden = false;
    $("#skip").textContent = "Skip Intro →";
    $("main").inert = true;
    $("header").inert = true;
    const hero = cameraProfile();
    document.body.classList.add("entering");
    entranceCinema.enter({
      motion: true,
      profile: hero,
      board: $("#play"),
      onBoardReady: prepare,
      quality: renderQuality(settings.quality),
      onReveal: reveal,
    });
    $("#skip").onclick = () => entranceCinema.finish();
  }
}
function cameraProfile() {
  const menu = $("#menu"),
    hidden = menu.hidden;
  menu.hidden = false;
  const hero = $(".menu-hero"),
    box = hero.getBoundingClientRect(),
    matrix = $("#jungle").getScreenCTM();
  const mouth = new DOMPoint(365, 178).matrixTransform(matrix);
  Object.assign(hero.dataset, {
    left: String(box.x),
    top: String(box.y),
    originX: String(mouth.x - box.x),
    originY: String(mouth.y - box.y),
    sourceScale: String(matrix.a),
    sourceLeft: String(matrix.e - box.x),
    sourceTop: String(matrix.f - box.y),
  });
  menu.hidden = hidden;
  return hero;
}
function menu(immediate = false) {
  if (document.body.classList.contains("returning")) return;
  const animate =
    state && !$("#play").hidden && !reduced() && immediate !== true;
  const fromDefeat =
    !$("#celebration").hidden && $("#celebration").classList.contains("defeat");
  const resultRect = fromDefeat
    ? $("#result-title").getBoundingClientRect().toJSON()
    : null;
  cancel();
  const reveal = () => {
    state = null;
    document.body.classList.remove(
      "playing",
      "portrait-game",
      "desktop-game",
      "entering",
      "arriving",
      "mouth-crossing",
      "returning",
      "defeat-camera",
    );
    document.body.style.removeProperty("--board-size");
    $("#play").hidden = true;
    $("#menu").hidden = false;
    $("#intro").hidden = true;
    $("main").inert = false;
    $("header").inert = false;
    $("#start").disabled = false;
    $("#start").focus({ preventScroll: true });
    updateAmbience();
  };
  if (!animate) {
    reveal();
    return;
  }
  const profile = cameraProfile();
  $("main").inert = true;
  $("header").inert = true;
  $("#intro").hidden = false;
  $("#skip").textContent = "Skip →";
  entranceCinema.exit({
    profile,
    board: $("#play"),
    motion: true,
    quality: renderQuality(settings.quality),
    fromDefeat,
    resultRect,
    onReveal: reveal,
  });
  $("#skip").onclick = () => entranceCinema.finish();
}
function medalMarkup(medal) {
  return medal
    ? `<span class="medal-icon" data-medal="${medal}" aria-label="${medal} crown"><svg viewBox="490 0 560 370" aria-hidden="true"><image href="assets/jungle-emblem.webp" width="1536" height="1024"/></svg></span>`
    : '<span class="last-place-mark" aria-hidden="true">—</span>';
}
function positionCelebration() {
  if (
    $("#celebration").hidden ||
    $("#celebration").classList.contains("defeat")
  )
    return;
  const r = $(".board-frame").getBoundingClientRect();
  for (const [key, value] of Object.entries({
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  }))
    $("#celebration").style.setProperty(`--result-${key}`, `${value}px`);
}
window.addEventListener("resize", () =>
  requestAnimationFrame(positionCelebration),
);
window.visualViewport?.addEventListener("resize", () =>
  requestAnimationFrame(positionCelebration),
);
function updateCrown() {
  const crown = $(".finish-crown");
  if (crown) {
    crown.dataset.medal = finishMedal(
      state.phase === "over" ? state.players.length - 2 : state.order.length,
    );
    crown.setAttribute(
      "aria-label",
      `${crown.dataset.medal} crown — square 100`,
    );
  }
}
function resumeMatch() {
  clearTimeout(finishTimer);
  resultFireworks.stop();
  $(".fireworks").replaceChildren();
  $("#celebration").hidden = true;
  $("main").inert = false;
  $("header").inert = false;
  updateCrown();
  liveLava.start();
  cavernEyes.start();
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(animateBoard);
  render();
  $("#status").textContent = `${state.players[state.current].color}'s turn.`;
  document.querySelector(`[data-roll="${state.current}"]`)?.focus();
  scheduleBot();
}
function showSummary() {
  resultFireworks.stop();
  $(".fireworks").replaceChildren();
  $("#celebration").className = "final-summary";
  $("#result-title").textContent = "Royal Standings";
  $("#result-title").setAttribute("aria-label", "Royal Standings");
  $("#result-name").textContent = "Every crown has found its champion.";
  $("#standings").innerHTML = finalStandings(state)
    .map(
      (row) =>
        `<div class="standing" style="--pawn:${HEX[COLORS.indexOf(row.color)]}">${medalMarkup(row.medal)}<strong>${row.color}</strong><span>${row.label}</span></div>`,
    )
    .join("");
  $("#standings").hidden = false;
  $("#continue").hidden = true;
  $("#try-again").hidden = false;
  $("#result-menu").hidden = false;
  updateCrown();
  $("#try-again").focus();
}
function celebrate(i) {
  const p = state.players[i],
    rank = state.order.indexOf(i),
    presentation = finishPresentation(state, i),
    defeat = presentation.defeat;
  clearTimeout(finishTimer);
  clearTimeout(botTimer);
  const layer = $("#celebration");
  layer.className = defeat
    ? "defeat"
    : state.bot
      ? "bot-victory"
      : state.players.length === 2
        ? "two-player-result"
        : "placement-celebration";
  layer.hidden = false;
  cancelAnimationFrame(raf);
  liveLava.stop();
  cavernEyes.stop();
  $("main").inert = true;
  $("header").inert = true;
  defeatCinema.cancel();
  resultFireworks.stop();
  const boardRect = $(".board-frame").getBoundingClientRect();
  for (const [key, value] of Object.entries({
    left: boardRect.left,
    top: boardRect.top,
    width: boardRect.width,
    height: boardRect.height,
  }))
    layer.style.setProperty(`--result-${key}`, `${value}px`);
  layer.style.setProperty("--accent", HEX[COLORS.indexOf(p.color)]);
  layer.style.setProperty("--medal-color", MEDALS[Math.min(rank, 2)].color);
  const crown = layer.querySelector(".crown");
  crown.dataset.medal = presentation.medal || "gold";
  const boardCrown = $(".finish-crown");
  if (boardCrown) boardCrown.dataset.medal = presentation.medal || "gold";
  $("#result-title").style.opacity = "1";
  $("#result-title").style.setProperty("--result-scale", "1");
  $("#result-title").textContent = presentation.title;
  $("#result-title").dataset.title = presentation.title;
  $("#result-title").setAttribute("aria-label", presentation.title);
  $("#result-name").textContent = state.bot
    ? defeat
      ? "The Serpent Bot claimed this round."
      : "The golden crown is yours."
    : state.players.length > 2
      ? MEDALS[rank].label + " · " + presentation.medal.toUpperCase() + " CROWN"
      : "";
  $("#standings").replaceChildren();
  $("#standings").hidden = true;
  $("#continue").hidden = true;
  $("#try-again").hidden = presentation.automatic;
  $("#result-menu").hidden = presentation.automatic;
  $(".fireworks").replaceChildren();
  if (defeat)
    defeatCinema.defeat({
      motion: !reduced(),
      title: $("#result-title"),
      profile: cameraProfile(),
      board: $("#play"),
      quality: renderQuality(settings.quality),
    });
  else {
    resultFireworks.start(HEX[COLORS.indexOf(p.color)], {
      motion: !reduced(),
      quality: renderQuality(settings.quality),
    });
    tone(880, 0.5);
  }
  render();
  positionCelebration();
  if (presentation.automatic) {
    const token = epoch;
    finishTimer = setTimeout(() => {
      if (token !== epoch) return;
      if (state.phase === "over") showSummary();
      else resumeMatch();
    }, 3500);
  } else $("#try-again").focus();
  if (!state.bot || state.phase === "over") {
    const localRank = state.bot ? state.order.indexOf(0) + 1 : rank + 1;
    stats.highestFinishingPosition = Math.min(
      stats.highestFinishingPosition ?? 4,
      localRank,
    );
  }
  if (rank === 0) {
    if (state.bot) stats[defeat ? "botWins" : "humanWins"]++;
    else stats.multiplayerWins++;
  }
  save("serpent-stats", stats);
}
function panel(kind) {
  clearTimeout(botTimer);
  $("#dialog-content").onclick = null;
  if (kind === "rules")
    $("#dialog-content").innerHTML =
      `<h2>Game Rules</h2><p>Classic · The Serpent King's Realm</p><ul><li>Colors can be chosen by tapping a player head until the first die roll. Start outside the board at 0. Roll a 1 to activate your pawn and enter square 1. Other rolls leave an inactive pawn outside. An inactive pawn gets no extra turn on a six.</li><li>Tap your own active die. After entering, move one square at a time by the rolled value. Other players’ dice stay locked.</li><li>Only an activated pawn gets an extra roll on a six. The third consecutive six ends your turn without moving on that roll.</li><li>Land on a snake head to slide down; land at a ladder base to climb.</li><li>Reach 100 exactly. An overshoot leaves your pawn in place and ends your turn, even on a six.</li><li>Finished players are skipped. The last remaining player receives the final place automatically.</li><li>The bot follows the same rules and uses the same fair die.</li></ul><p>Ladders: ${Object.entries(
        LADDERS,
      )
        .map(([a, b]) => `${a} → ${b}`)
        .join(" · ")}</p><p>Snakes: ${Object.entries(SNAKES)
        .map(([a, b]) => `${a} → ${b}`)
        .join(" · ")}</p>`;
  if (kind === "stats")
    $("#dialog-content").innerHTML =
      "<h2>Local Statistics</h2><p>Saved on this device only.</p>" +
      Object.entries(stats)
        .map(
          ([k, v]) =>
            `<p>${k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase())}: <strong>${v ?? "—"}</strong></p>`,
        )
        .join("");
  if (kind === "settings") {
    $("#dialog-content").innerHTML =
      `<h2>Sound & Animation</h2><label class="setting">Sound Effects<input id="sfx-setting" type="checkbox" ${settings.sfx ? "checked" : ""}></label><label class="setting">Background Ambience<input id="ambience-setting" type="checkbox" ${settings.ambience ? "checked" : ""}></label><label class="setting">Animations<input id="motion-setting" type="checkbox" ${settings.motion ? "checked" : ""}></label><label class="setting">Animation Quality<select id="quality-setting">${["High", "Balanced", "Low"].map((q) => `<option ${settings.quality === q ? "selected" : ""}>${q}</option>`).join("")}</select></label><label class="setting">Bot delay<select id="bot-setting">${[400, 900, 1600].map((n) => `<option value="${n}" ${+settings.botDelay === n ? "selected" : ""}>${n / 1000} seconds</option>`).join("")}</select></label><p>System reduced-motion preferences take priority. Sound is synthesized locally; no audio downloads or paid services.</p>`;
    $("#dialog-content").onchange = (event) => {
      settings = {
        sfx: $("#sfx-setting").checked,
        ambience: $("#ambience-setting").checked,
        motion: $("#motion-setting").checked,
        quality: $("#quality-setting").value,
        botDelay: +$("#bot-setting").value,
      };
      if (
        event.target.id === "sfx-setting" ||
        event.target.id === "ambience-setting"
      )
        audioMuted = !(settings.sfx || settings.ambience);
      audio();
      applySettings();
    };
  } else $("#dialog-content").onchange = null;
  $("#dialog").showModal();
}
let localCount = 2;
function selectMode() {
  const bot = $("#mode").value === "bot";
  if (!bot) localCount = +$("#mode").value;
  colorOptions();
  $("#bot-mode").classList.toggle("selected", bot);
  $("#bot-mode").setAttribute("aria-pressed", String(bot));
  $("#friends-mode").classList.toggle("selected", !bot);
  $("#friends-mode").setAttribute("aria-pressed", String(!bot));
  document.querySelectorAll("[data-player-count]").forEach((b) => {
    const selected = +b.dataset.playerCount === (bot ? 2 : localCount);
    b.classList.toggle("selected", selected);
    b.setAttribute("aria-pressed", String(selected));
  });
}
$("#games-link").addEventListener("click", (e) => {
  e.preventDefault();
  e.stopPropagation();
  cancel();
  location.assign(new URL("/games/", location.origin).href);
});
$("#mode").onchange = selectMode;
$("#bot-mode").onclick = () => {
  $("#mode").value = "bot";
  selectMode();
};
$("#friends-mode").onclick = () => {
  $("#mode").value = String(localCount);
  selectMode();
};
document.querySelectorAll("[data-player-count]").forEach(
  (b) =>
    (b.onclick = () => {
      localCount = +b.dataset.playerCount;
      $("#mode").value = String(localCount);
      selectMode();
    }),
);
$("#start").onclick = () => {
  if (!$("#start").disabled) begin();
};
$("#players").onclick = (e) => {
  const head = e.target.closest("[data-game-color]");
  if (head && !head.disabled) {
    colorPicker(+head.dataset.gameColor, true);
    return;
  }
  const b = e.target.closest("[data-roll]");
  if (b && !b.disabled && +b.dataset.roll === state?.current) takeTurn();
};
$("#menu-button").onclick = menu;
$("#sound").onclick = () => {
  audioMuted = !audioMuted;
  if (!audioMuted && !settings.sfx && !settings.ambience) settings.sfx = true;
  audio();
  applySettings();
  tone();
};
document
  .querySelectorAll("[data-panel]")
  .forEach((b) => (b.onclick = () => panel(b.dataset.panel)));
$("#close").onclick = () => $("#dialog").close();
$("#dialog").onclose = () => {
  $("#dialog").classList.remove("color-dialog");
  $("#dialog").style.removeProperty("left");
  $("#dialog").style.removeProperty("top");
  scheduleBot();
};
$("#dialog").addEventListener("click", (e) => {
  if (
    e.target !== $("#dialog") ||
    !$("#dialog").classList.contains("color-dialog")
  )
    return;
  const r = e.target.getBoundingClientRect();
  if (
    e.clientX < r.left ||
    e.clientX > r.right ||
    e.clientY < r.top ||
    e.clientY > r.bottom
  )
    e.target.close();
});
$("#continue").onclick = resumeMatch;
$("#try-again").onclick = () => begin(true);
$("#result-menu").onclick = menu;
document.addEventListener("visibilitychange", () => {
  document.body.classList.toggle("page-hidden", document.hidden);
  if (document.hidden) {
    cancelAnimationFrame(raf);
    cavernEyes.stop();
    clearTimeout(botTimer);
    liveLava.stop();
  } else {
    scheduleBot();
    if (boardAnimationActive()) {
      lastBoardFrame = -Infinity;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(animateBoard);
      cavernEyes.start();
    }
    if (state && !$("#play").hidden && $("#celebration").hidden)
      liveLava.start();
  }
  updateAmbience();
});
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  applySettings,
);
const cavernEyes = createCavernEyes($("#cavern-eyes"), {
  motion: () => !reduced(),
});
const resultFireworks = createFireworks($("#result-fireworks"));
const entranceCinema = createCinematic($("#entrance-scene"), "entrance");
const defeatCinema = createCinematic($("#defeat-snake"), "defeat");
const jungleLife = createJungleLife($("#jungle-life"), {
  motion: () => !reduced(),
  quality: () => renderQuality(settings.quality),
});
const menuScene = createMenuScene($("#jungle"), $("#jungle-water"), {
  motion: () => !reduced(),
  quality: () => renderQuality(settings.quality),
});
function fitJungleRigs() {
  const box = $("#jungle").getBoundingClientRect();
  const ratio = (box.width * 900) / (box.height * 1000);
  document
    .querySelectorAll(".jungle-anatomy")
    .forEach((g) => g.setAttribute("transform", `scale(1 ${ratio})`));
}
fitJungleRigs();
window.addEventListener("resize", () => {
  fitJungleRigs();
  fitGame();
});
window.visualViewport?.addEventListener("resize", fitGame);
$(".painted-title img").src = menuArtwork();
$("#celebration .crown image").setAttribute("href", menuArtwork());
function fitViewport() {
  document.body.style.setProperty(
    "--app-height",
    Math.round(Math.min(innerHeight, visualViewport?.height ?? innerHeight)) +
      "px",
  );
}
fitViewport();
window.addEventListener("resize", fitViewport);
visualViewport?.addEventListener("resize", fitViewport);
selectMode();
applySettings();
// Explicit local-only browser harness; never enabled on the published website.
if (
  location.hostname === "127.0.0.1" &&
  new URLSearchParams(location.search).has("test")
)
  window.serpentTest = {
    get state() {
      return state;
    },
    setState(s) {
      cancel();
      state = s;
      applySettings();
      document.body.classList.add("playing");
      $("#menu").hidden = true;
      $("#play").hidden = false;
      board();
      render();
      updateCrown();
      raf = requestAnimationFrame(animateBoard);
    },
    turn: takeTurn,
    celebrate,
    summary: showSummary,
    settings,
    paths: () => paths,
    begin,
    entranceCinema,
    defeatCinema,
    cavernEyes,
    jungleLife,
  };
