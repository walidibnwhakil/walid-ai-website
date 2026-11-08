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
} from "./engine.mjs";
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
  paused = false,
  epoch = 0,
  raf = 0,
  lastBoardFrame = -Infinity,
  botTimer = 0,
  introTimer = 0,
  paths = {},
  pawns = [],
  context,
  ambienceNode;
const reduced = () =>
  matchMedia("(prefers-reduced-motion: reduce)").matches || !settings.motion;
function applySettings() {
  document.body.classList.toggle("reduced", reduced());
  document.body.classList.toggle("low", settings.quality === "Low");
  $("#sound").textContent = `Sound: ${settings.sfx ? "On" : "Off"}`;
  save("serpent-settings", settings);
  updateAmbience();
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
  if (!settings.sfx) return;
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
  if (!settings.ambience || !context || document.hidden) return;
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
function serpent(parent, x, y, scale = 1, color = "#48a94c", royal = false) {
  const uid =
    "skin-" +
    Math.round(x) +
    "-" +
    Math.round(y) +
    "-" +
    Math.round(scale * 100);
  const defs = svg("defs", {}, parent);
  const grad = svg(
    "linearGradient",
    { id: uid, x1: "0%", y1: "0%", x2: "0%", y2: "100%" },
    defs,
  );
  for (const [offset, c] of [
    ["0%", "#c8e581"],
    ["25%", color],
    ["70%", color],
    ["100%", "#153d27"],
  ])
    svg("stop", { offset, "stop-color": c }, grad);
  const scales = svg(
    "pattern",
    {
      id: uid + "-scales",
      width: 12,
      height: 9,
      patternUnits: "userSpaceOnUse",
    },
    defs,
  );
  svg(
    "path",
    {
      d: "M 0 0 Q 6 10 12 0 M -6 5 Q 0 15 6 5 M 6 5 Q 12 15 18 5",
      fill: "none",
      stroke: "#102e20",
      "stroke-width": 0.95,
      opacity: 0.45,
    },
    scales,
  );
  const anchor = svg(
    "g",
    { transform: `translate(${x} ${y}) scale(${scale})` },
    parent,
  );
  const anatomy =
    parent.id === "jungle"
      ? svg("g", { class: "jungle-anatomy" }, anchor)
      : anchor;
  const root = svg(
    "g",
    { class: royal ? "royal-neck" : "small-snake" },
    anatomy,
  );
  svg(
    "path",
    {
      d: "M -70 100 C -150 70 -130 0 -65 -20 C -20 -35 20 -20 20 0",
      fill: "none",
      stroke: "#073d29",
      "stroke-width": 45,
      "stroke-linecap": "round",
    },
    root,
  );
  svg(
    "path",
    {
      d: "M -70 100 C -150 70 -130 0 -65 -20 C -20 -35 20 -20 20 0",
      fill: "none",
      stroke: `url(#${uid})`,
      "stroke-width": 33,
      "stroke-linecap": "round",
      "stroke-dasharray": "3 2",
    },
    root,
  );
  svg(
    "path",
    {
      d: "M -70 100 C -150 70 -130 0 -65 -20 C -20 -35 20 -20 20 0",
      fill: "none",
      stroke: `url(#${uid}-scales)`,
      "stroke-width": 33,
      "stroke-linecap": "round",
    },
    root,
  );
  const head = svg("g", { class: "snake-head" }, root);
  svg(
    "ellipse",
    {
      cx: 33,
      cy: 12,
      rx: 47,
      ry: 24,
      fill: "#250d0e",
      stroke: "#d1b44d",
      "stroke-width": 3,
    },
    head,
  );
  const upper = svg("g", royal ? { id: "royal-upper" } : {}, head);
  svg(
    "path",
    {
      d: "M -15 5 Q -10 -37 37 -28 Q 82 -22 82 2 Q 40 15 -15 5",
      fill: `url(#${uid})`,
      stroke: "#123d22",
      "stroke-width": 3,
    },
    upper,
  );
  svg(
    "ellipse",
    { cx: 33, cy: -16, rx: 12, ry: 10, fill: "#f4cc4d", class: "eye" },
    upper,
  );
  svg(
    "ellipse",
    { cx: 35, cy: -16, rx: 2.8, ry: 9, fill: "#15200e", class: "eye" },
    upper,
  );
  svg(
    "path",
    { d: "M 59 5 L 55 26 L 48 8 M 3 8 L 7 24 L 15 9", fill: "#fff3c8" },
    upper,
  );
  svg(
    "path",
    {
      d: "M -10 -3 Q 30 -35 75 -10",
      fill: "none",
      stroke: `url(#${uid}-scales)`,
      "stroke-width": 22,
    },
    upper,
  );
  svg("ellipse", { cx: 68, cy: -7, rx: 3, ry: 2, fill: "#123322" }, upper);
  svg(
    "path",
    {
      d: "M 18 -26 Q 34 -35 46 -26",
      fill: "none",
      stroke: "#173a20",
      "stroke-width": 5,
    },
    upper,
  );
  const lower = svg(
    "g",
    { class: "jaw", ...(royal ? { id: "royal-lower" } : {}) },
    head,
  );
  svg(
    "path",
    {
      d: "M -12 16 Q 26 51 71 18 Q 35 65 -12 16",
      fill: "#b0c94f",
      stroke: "#e7ce79",
      "stroke-width": 3,
    },
    lower,
  );
  svg(
    "path",
    {
      d: "M 32 26 Q 58 39 57 57 M 57 57 L 48 64 M 57 57 L 66 64",
      fill: "none",
      stroke: "#f15165",
      "stroke-width": 3,
      class: "tongue",
    },
    head,
  );
  if (royal)
    svg(
      "path",
      {
        d: "M 0 -33 L -7 -58 L 16 -48 L 28 -70 L 43 -46 L 66 -58 L 59 -31 Z",
        fill: "#e7b544",
        stroke: "#ffe49b",
        "stroke-width": 2,
      },
      head,
    );
  return root;
}
function jungle() {
  const j = $("#jungle");
  svg(
    "path",
    {
      d: "M -30 330 Q 300 250 410 100 M 580 170 Q 800 100 1040 170",
      fill: "none",
      stroke: "#302b16",
      "stroke-width": 75,
    },
    j,
  );
  for (let i = 0; i < 18; i++) {
    const x = i * 65 - 20,
      g = svg("g", { class: "vine", style: `animation-delay:-${i % 7}s` }, j);
    svg(
      "path",
      {
        d: `M ${x} -20 Q ${x - 45} 100 ${x + 10} ${180 + (i % 4) * 90}`,
        stroke: "#53723a",
        "stroke-width": 4,
        fill: "none",
      },
      g,
    );
    for (let k = 0; k < 4; k++)
      svg(
        "ellipse",
        {
          cx: x + (k % 2 ? 16 : -10),
          cy: 35 + k * 43,
          rx: 13,
          ry: 27,
          fill: ["#234c28", "#456f35", "#6f8b40"][i % 3],
          transform: `rotate(${k % 2 ? 40 : -40} ${x} ${35 + k * 43})`,
          class: "leaf",
        },
        g,
      );
  }
  const ladd = svg("g", { transform: "translate(180 330) rotate(14)" }, j);
  for (const x of [0, 65])
    svg(
      "path",
      { d: `M ${x} 0 V 520`, stroke: "#946027", "stroke-width": 14 },
      ladd,
    );
  for (let y = 0; y < 520; y += 50)
    svg(
      "path",
      { d: `M 0 ${y} H 65`, stroke: "#cf9747", "stroke-width": 10 },
      ladd,
    );
  serpent(j, 690, 215, 1.1, "#4c9c43", true);
  serpent(j, 170, 780, 0.65, "#c85036");
  serpent(j, 840, 760, 0.7, "#d8b746");
  serpent(j, 440, 880, 0.45, "#4ca786");
  for (let i = 0; i < 22; i++)
    svg(
      "circle",
      {
        cx: (i * 139) % 1000,
        cy: (i * 197) % 900,
        r: 1.5,
        fill: "#f8e59b",
        opacity: 0.5,
      },
      j,
    );
}
function colorOptions() {
  const count = $("#mode").value === "bot" ? 2 : +$("#mode").value;
  $("#colors").innerHTML = Array.from(
    { length: count },
    (_, i) =>
      `<label style="--pawn:${HEX[i]}">${i === 1 && $("#mode").value === "bot" ? "Bot" : `Player ${i + 1}`} color<select data-color="${i}">${COLORS.map((c, j) => `<option ${j === i ? "selected" : ""}>${c}</option>`).join("")}</select></label>`,
  ).join("");
  $("#colors").onchange = (e) => {
    const sels = [...document.querySelectorAll("[data-color]")];
    const other = sels.find(
      (s) => s !== e.target && s.value === e.target.value,
    );
    if (other) {
      const used = sels.filter((s) => s !== other).map((s) => s.value);
      other.value = COLORS.find((c) => !used.includes(c));
    }
    sels.forEach((s) =>
      s.parentElement.style.setProperty("--pawn", HEX[COLORS.indexOf(s.value)]),
    );
  };
}
function board() {
  const b = $("#board");
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
          fill: n === 100 ? "#9a090a" : "#3ab529",
          opacity: n === 100 ? 0.88 : 0.4,
          stroke: "#ffe792",
          "stroke-width": 0.25,
        },
        b,
      );
  }
  for (const [a, z] of Object.entries(LADDERS)) {
    const p = center(+a),
      q = center(z),
      dx = q.x - p.x,
      dy = q.y - p.y,
      len = Math.hypot(dx, dy),
      nx = (-dy / len) * 1.25,
      ny = (dx / len) * 1.25;
    const g = svg("g", { "data-ladder": a }, b);
    for (const sign of [-1, 1])
      svg(
        "line",
        {
          x1: p.x + nx * sign,
          y1: p.y + ny * sign,
          x2: q.x + nx * sign,
          y2: q.y + ny * sign,
          stroke: "#51331a",
          "stroke-width": 1.4,
        },
        g,
      );
    for (const sign of [-1, 1])
      svg(
        "line",
        {
          x1: p.x + nx * sign,
          y1: p.y + ny * sign,
          x2: q.x + nx * sign,
          y2: q.y + ny * sign,
          stroke: "url(#ladder-gold)",
          "stroke-width": 0.95,
        },
        g,
      );
    for (let t = 0; t <= 1; t += 1 / Math.ceil(len / 2.3))
      svg(
        "line",
        {
          x1: p.x + dx * t - nx,
          y1: p.y + dy * t - ny,
          x2: p.x + dx * t + nx,
          y2: p.y + dy * t + ny,
          stroke: "url(#ladder-gold)",
          "stroke-width": 0.85,
        },
        g,
      );
    paths[a] = { kind: "ladder", p, q };
  }
  Object.entries(SNAKES).forEach(([a, z], i) => {
    const p = center(+a),
      q = center(z),
      g = svg("g", { "data-snake": a }, b),
      color = [
        "#e9aa36",
        "#bd5fdb",
        "#48b6d1",
        "#ed6953",
        "#69b66a",
        "#82b646",
      ][i];
    const hue = [-65, 170, 90, -110, 0, 30][i];
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
      { transform: `translate(${p.x} ${p.y})`, class: "painted-head" },
      g,
    );
    const art = svg(
      "g",
      { transform: i % 2 ? "scale(-1 1)" : "scale(1 1)" },
      head,
    );
    const clip = svg("clipPath", { id: `jaw-clip-${i}` }, defs);
    svg("rect", { x: -5, y: 0.3, width: 10, height: 5 }, clip);
    const upper = svg("clipPath", { id: `upper-clip-${i}` }, defs);
    svg("rect", { x: -5, y: -5, width: 10, height: 5.3 }, upper);
    function sprite(parent, clipId) {
      const c = svg("g", { "clip-path": `url(#${clipId})` }, parent);
      const sheet = svg(
        "svg",
        {
          x: -3.6,
          y: -2.8,
          width: 7.2,
          height: 7.2,
          viewBox: `${(i % 3) * 400} ${Math.floor(i / 3) * 400} 400 400`,
          overflow: "hidden",
        },
        c,
      );
      svg(
        "image",
        {
          href: "assets/serpent-heads.webp",
          x: 0,
          y: 0,
          width: 1200,
          height: 800,
        },
        sheet,
      );
    }
    sprite(art, `upper-clip-${i}`);
    const jaw = svg("g", { class: "board-jaw" }, art);
    sprite(jaw, `jaw-clip-${i}`);
    svg(
      "ellipse",
      {
        cx: -0.1,
        cy: -1.2,
        rx: 0.19,
        ry: 0.09,
        fill: "#ffce56",
        class: "board-eye",
      },
      art,
    );
    svg(
      "path",
      {
        d: "M -2 1.7 Q -3.2 2.3 -3.4 3 M -3.4 3 L -3.8 3.3 M -3.4 3 L -3.3 3.5",
        stroke: "#c92539",
        "stroke-width": 0.1,
        fill: "none",
        class: "board-tongue",
      },
      art,
    );
    for (const layer of [path, inner, sheen, pattern])
      layer.setAttribute("mask", `url(#taper-${i})`);
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
    };
  });
  for (const { n, x, y } of squares) {
    const t = svg(
      "text",
      {
        x: x - 3.8,
        y: y - 2.5,
        class: `square-number ${(Math.floor((n - 1) / 10) + (x - 5) / 10) % 2 ? "light" : ""}`,
      },
      b,
    );
    t.textContent = n === 100 ? "100 ♛" : n;
  }
  pawns = state.players.map((p, i) => {
    const g = svg("g", { class: "pawn", "data-player": i }, b),
      color = HEX[COLORS.indexOf(p.color)];
    gradient(
      `pawn-${i}`,
      [
        ["0%", "#421a14"],
        ["18%", color],
        ["38%", "#fff2bd"],
        ["50%", color],
        ["100%", "#1a1b20"],
      ],
      true,
    );
    const fill = `url(#pawn-${i})`;
    svg(
      "ellipse",
      { cx: 0, cy: 1.3, rx: 1.8, ry: 0.65, fill: "#080504", opacity: 0.7 },
      g,
    );
    svg(
      "ellipse",
      {
        cx: 0,
        cy: 1,
        rx: 1.55,
        ry: 0.55,
        fill,
        stroke: "#ffe6a2",
        "stroke-width": 0.16,
      },
      g,
    );
    svg(
      "path",
      {
        d: "M -1.2 .8 Q -.6 .2 -.48 -1.2 H .48 Q .6 .2 1.2 .8 Z",
        fill,
        stroke: "#ffd6a0",
        "stroke-width": 0.12,
      },
      g,
    );
    svg(
      "ellipse",
      {
        cx: 0,
        cy: -1.15,
        rx: 0.85,
        ry: 0.3,
        fill,
        stroke: "#ffe6a2",
        "stroke-width": 0.12,
      },
      g,
    );
    svg(
      "circle",
      {
        cx: 0,
        cy: -2.05,
        r: 0.95,
        fill,
        stroke: "#ffdc9a",
        "stroke-width": 0.1,
      },
      g,
    );
    svg(
      "ellipse",
      { cx: -0.3, cy: -2.4, rx: 0.22, ry: 0.13, fill: "#fff", opacity: 0.8 },
      g,
    );
    return g;
  });
  state.players.forEach((p, i) => place(i, p.position));
}
function curve(p, q, i, t = 0) {
  const dx = q.x - p.x,
    dy = q.y - p.y,
    len = Math.hypot(dx, dy),
    wave = reduced() ? 0 : Math.sin(t / 800 + i) * 1.1,
    bend = (i % 2 ? 1 : -1) * Math.min(15, len * 0.48) + wave;
  return `M ${p.x} ${p.y} C ${p.x + dx * 0.25 - (dy / len) * bend} ${p.y + dy * 0.25 + (dx / len) * bend} ${q.x - dx * 0.25 + (dy / len) * bend} ${q.y - dy * 0.25 - (dx / len) * bend} ${q.x} ${q.y}`;
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
function animateBoard(t) {
  const interval =
    settings.quality === "High" ? 16 : settings.quality === "Low" ? 100 : 33;
  if (t - lastBoardFrame < interval) {
    if (state && !$("#play").hidden) raf = requestAnimationFrame(animateBoard);
    return;
  }
  lastBoardFrame = t;
  for (const item of Object.values(paths)) {
    if (item.kind === "snake") {
      const d = curve(item.p, item.q, item.i, t);
      for (const el of [item.path, item.inner, item.sheen, item.pattern])
        el.setAttribute("d", d);
      item.taper.setAttribute("d", taperedRibbon(d));
      item.head.setAttribute(
        "transform",
        `translate(${item.p.x} ${item.p.y}) rotate(${reduced() ? 0 : Math.sin(t / 1200 + item.i) * 6})`,
      );
    }
  }
  if (state && !$("#play").hidden) raf = requestAnimationFrame(animateBoard);
}
function place(i, n, point) {
  const p = point ?? (n ? center(n) : { x: 3 + i * 3, y: 103 });
  const offset = point ? 0 : (i % 2 ? 1 : -1) * 0.8;
  pawns[i]?.setAttribute(
    "transform",
    `translate(${p.x + offset} ${p.y + Math.floor(i / 2) * 1.1})`,
  );
  pawns[i]?.setAttribute("data-position", n);
}
const delay = (ms) =>
  new Promise((resolve) => setTimeout(resolve, reduced() ? 0 : ms));
async function travel(i, p, q, ms, token, path = null, climb = false) {
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
        y: pt.y,
      });
      if (f < 1) requestAnimationFrame(frame);
      else resolve();
    }
    requestAnimationFrame(frame);
  });
}
function render() {
  if (!state) return;
  setGameInProgress(!$("#play").hidden && state.phase !== "over");
  $("#players").style.setProperty("--player-count", state.players.length);
  $("#players").innerHTML =
    `<p class="roster-summary">${state.order.length} finished · ${state.players.length - state.order.length} remaining</p>` +
    state.players
      .map(
        (p, i) =>
          `<div class="player-row ${i === state.current ? "current" : ""}" style="--pawn:${HEX[COLORS.indexOf(p.color)]}"><span class="dot"></span><strong>${p.name}<br><small>${p.color}${state.order.includes(i) ? " · " + placement(state.order.indexOf(i), state.players.length) : ""}</small></strong><span>${p.position || "Start"}</span></div>`,
      )
      .join("");
  $("#roll").disabled =
    busy ||
    paused ||
    state.phase !== "ready" ||
    (state.bot && state.current === 1);
  $("#pause").textContent = paused ? "Resume" : "Pause";
  if (state.dice) drawDie(state.dice);
}
function drawDie(value) {
  const positions = {
    1: [[35, 31]],
    2: [
      [24, 21],
      [46, 41],
    ],
    3: [
      [24, 21],
      [35, 31],
      [46, 41],
    ],
    4: [
      [24, 21],
      [46, 21],
      [24, 41],
      [46, 41],
    ],
    5: [
      [24, 21],
      [46, 21],
      [35, 31],
      [24, 41],
      [46, 41],
    ],
    6: [
      [24, 21],
      [46, 21],
      [24, 31],
      [46, 31],
      [24, 41],
      [46, 41],
    ],
  };
  $("#dice").setAttribute("aria-label", `Die: ${value}`);
  $("#dice").innerHTML =
    `<svg viewBox="0 0 80 75" aria-hidden="true"><defs><linearGradient id="die-face" x2="1" y2="1"><stop stop-color="#fffdf0"/><stop offset="1" stop-color="#d8b27a"/></linearGradient></defs><path d="M 12 11 L 57 8 L 71 20 L 68 61 L 55 70 L 13 59 Z" fill="#8c6034" stroke="#ffdb97" stroke-width="1"/><path d="M 14 11 L 57 9 L 56 53 Q 56 59 51 60 L 17 57 Q 12 57 12 51 Z" fill="url(#die-face)"/><path d="M 57 10 L 69 21 L 67 59 L 56 67 V 53 Z" fill="#ba8d56"/>${positions[value].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="4" ry="3.8" fill="#1c140e"/><ellipse cx="${x - 0.6}" cy="${y - 0.8}" rx="2.2" ry="1.2" fill="#5a402b"/>`).join("")}<circle cx="63" cy="27" r="2.2" fill="#342014"/><circle cx="62" cy="44" r="2.2" fill="#342014"/><circle cx="61" cy="57" r="2.2" fill="#342014"/></svg>`;
}
function scheduleBot() {
  clearTimeout(botTimer);
  if (
    state?.phase === "ready" &&
    state.bot &&
    state.current === 1 &&
    !busy &&
    !paused &&
    !document.hidden &&
    $("#celebration").hidden &&
    !$("#dialog").open
  )
    botTimer = setTimeout(() => takeTurn(), Number(settings.botDelay));
}
async function takeTurn() {
  if (!state || busy || paused || state.phase !== "ready") return;
  busy = true;
  const token = epoch,
    i = state.current;
  render();
  $("#dice").classList.add("rolling");
  tone(250, 0.25);
  await delay(500);
  if (token !== epoch) return;
  $("#dice").classList.remove("rolling");
  const result = roll(state, die());
  state = result.state;
  stats.totalDiceRolls++;
  render();
  $("#status").textContent =
    `${state.players[i].name} rolled ${state.dice}${result.penalty ? " — third six: turn ends." : ""}`;
  for (let n = result.from + 1; n <= result.landing; n++) {
    const p = n === 1 ? center(1) : center(n - 1),
      q = center(n);
    await travel(i, p, q, 125, token);
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
      const movingPath = item.path.cloneNode();
      movingPath.removeAttribute("class");
      movingPath.style.display = "none";
      $("#board").append(movingPath);
      const timer = setInterval(() => {
        const tr = pawns[i]?.getAttribute("transform");
        if (tr) glow.setAttribute("transform", tr);
      }, 30);
      await travel(i, item.p, item.q, 1500, token, movingPath);
      clearInterval(timer);
      glow.remove();
      movingPath.remove();
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
  render();
  if (done.finisher !== null) celebrate(done.finisher);
  else {
    $("#status").textContent = paused
      ? "Paused"
      : `${state.players[state.current].name}'s turn${state.sixes ? " — extra roll" : ""}.`;
    scheduleBot();
  }
}
function cancel() {
  setGameInProgress(false);
  epoch++;
  clearTimeout(botTimer);
  clearTimeout(introTimer);
  cancelAnimationFrame(raf);
  busy = false;
  paused = false;
  $("#dice").classList.remove("rolling");
  $("#celebration").hidden = true;
  $("main").inert = false;
  $("header").inert = false;
  $("#intro").hidden = true;
  $("#intro").classList.remove("reveal");
  document.body.classList.remove("entering");
}
function begin(skip = false) {
  cancel();
  const mode = $("#mode").value,
    colors = [...document.querySelectorAll("[data-color]")].map((s) => s.value);
  state = createGame(colors.length, mode === "bot", colors);
  stats.gamesPlayed++;
  save("serpent-stats", stats);
  audio();
  board();
  const token = epoch;
  const reveal = () => {
    if (token !== epoch) return;
    document.body.classList.remove("entering");
    document.body.classList.add("playing");
    $("#intro").classList.add("reveal");
    introTimer = setTimeout(() => {
      $("#intro").hidden = true;
      $("#intro").classList.remove("reveal");
    }, 500);
    $("#menu").hidden = true;
    $("#play").hidden = false;
    $("#start").disabled = false;
    updateAmbience();
    render();
    $("#status").textContent = `${state.players[0].name}'s turn.`;
    raf = requestAnimationFrame(animateBoard);
  };
  $("#start").disabled = true;
  if (skip || reduced()) reveal();
  else {
    $("#intro").hidden = false;
    document.body.classList.add("entering");
    introTimer = setTimeout(reveal, 3800);
    $("#skip").onclick = () => {
      clearTimeout(introTimer);
      reveal();
    };
  }
}
function menu() {
  cancel();
  state = null;
  document.body.classList.remove("playing");
  $("#play").hidden = true;
  $("#menu").hidden = false;
  $("#start").disabled = false;
  updateAmbience();
}
function celebrate(i) {
  const p = state.players[i],
    rank = state.order.indexOf(i),
    defeat = state.bot && i === 1;
  $("#celebration").hidden = false;
  $("main").inert = true;
  $("header").inert = true;
  $("#celebration").classList.toggle("defeat", defeat);
  $("#celebration").style.setProperty("--accent", HEX[COLORS.indexOf(p.color)]);
  $("#result-title").textContent = defeat
    ? "YOU LOSE"
    : placement(rank, state.players.length);
  $("#result-name").textContent = defeat
    ? "The Serpent Bot claimed the crown. Your next adventure awaits."
    : `${p.name} · ${p.color}`;
  $("#defeat-snake").replaceChildren();
  if (defeat) {
    const s = svg("svg", { viewBox: "-160 -80 300 230" }, $("#defeat-snake"));
    serpent(s, 0, 0, 1, "#53aa62");
    if (!reduced()) {
      for (const path of s.querySelectorAll(".small-snake > path")) {
        const base = path.getAttribute("d"),
          curl = "M -70 100 C -185 75 -120 -125 -10 -90 C 100 -55 110 90 20 0";
        svg(
          "animate",
          {
            attributeName: "d",
            dur: "6s",
            values: `${base};${base};${curl};${curl};${base}`,
            keyTimes: "0;.3;.55;.7;1",
            fill: "freeze",
          },
          path,
        );
      }
    }
  }
  const over = state.phase === "over";
  $("#continue").hidden = over;
  $("#try-again").hidden = !over;
  $("#standings").innerHTML = over
    ? state.order
        .map(
          (j, k) =>
            `<div class="standing" style="color:${HEX[COLORS.indexOf(state.players[j].color)]}">${placement(k, state.players.length)} — ${state.players[j].name}</div>`,
        )
        .join("")
    : "";
  const f = $(".fireworks");
  f.replaceChildren();
  if (!defeat) {
    for (let k = 0; k < (settings.quality === "Low" ? 12 : 48); k++) {
      const el = document.createElement("i");
      el.className = "spark";
      el.style.cssText = `--x:${25 + (k % 3) * 25}%;--y:${25 + (k % 2) * 30}%;--dx:${Math.cos(k * 2.4) * 150}px;--dy:${Math.sin(k * 2.4) * 150}px;--delay:-${(k % 3) * 0.6}s`;
      f.append(el);
    }
    tone(880, 0.5);
  }
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
  (over ? $("#try-again") : $("#continue")).focus();
}
function panel(kind) {
  clearTimeout(botTimer);
  if (kind === "rules")
    $("#dialog-content").innerHTML =
      `<h2>Game Rules</h2><p>Classic · The Serpent King's Realm</p><ul><li>Start outside the board at 0. No six is required to enter.</li><li>Roll one fair six-sided die and advance by its value.</li><li>A six grants an extra roll. The third consecutive six ends your turn without moving on that roll.</li><li>Land on a snake head to slide down; land at a ladder base to climb.</li><li>Reach 100 exactly. An overshoot leaves your pawn in place.</li><li>Finished players are skipped. The last remaining player receives the final place automatically.</li><li>The bot follows the same rules and uses the same fair die.</li></ul><p>Ladders: ${Object.entries(
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
    $("#dialog-content").onchange = () => {
      settings = {
        sfx: $("#sfx-setting").checked,
        ambience: $("#ambience-setting").checked,
        motion: $("#motion-setting").checked,
        quality: $("#quality-setting").value,
        botDelay: +$("#bot-setting").value,
      };
      audio();
      applySettings();
    };
  } else $("#dialog-content").onchange = null;
  $("#dialog").showModal();
}
$("#mode").onchange = colorOptions;
$("#start").onclick = () => {
  if (!$("#start").disabled) begin();
};
$("#roll").onclick = () => takeTurn();
$("#restart").onclick = () => begin(true);
$("#menu-button").onclick = menu;
$("#pause").onclick = () => {
  paused = !paused;
  render();
  $("#status").textContent = paused
    ? "Paused — finish the current movement, then resume."
    : `${state.players[state.current].name}'s turn.`;
  scheduleBot();
};
$("#sound").onclick = () => {
  settings.sfx = !settings.sfx;
  audio();
  applySettings();
  tone();
};
document
  .querySelectorAll("[data-panel]")
  .forEach((b) => (b.onclick = () => panel(b.dataset.panel)));
$("#close").onclick = () => $("#dialog").close();
$("#dialog").onclose = scheduleBot;
$("#continue").onclick = () => {
  $("#celebration").hidden = true;
  $("main").inert = false;
  $("header").inert = false;
  $("#roll").focus();
  scheduleBot();
};
$("#try-again").onclick = () => begin(true);
$("#result-menu").onclick = menu;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) clearTimeout(botTimer);
  else scheduleBot();
  updateAmbience();
});
matchMedia("(prefers-reduced-motion: reduce)").addEventListener(
  "change",
  applySettings,
);
jungle();
function fitJungleRigs() {
  const box = $("#jungle").getBoundingClientRect();
  const ratio = (box.width * 900) / (box.height * 1000);
  document
    .querySelectorAll(".jungle-anatomy")
    .forEach((g) => g.setAttribute("transform", `scale(1 ${ratio})`));
}
fitJungleRigs();
window.addEventListener("resize", fitJungleRigs);
colorOptions();
drawDie(5);
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
      document.body.classList.add("playing");
      $("#menu").hidden = true;
      $("#play").hidden = false;
      board();
      render();
      raf = requestAnimationFrame(animateBoard);
    },
    turn: takeTurn,
    celebrate,
    settings,
    paths: () => paths,
    begin,
  };
