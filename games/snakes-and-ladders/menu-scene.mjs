// The title, water, necks, heads, lower jaws, tongues and eyelids are separate layers.
export function createMenuScene(root, canvas, { motion, quality }) {
  const asset = "assets/jungle-emblem.webp",
    image = `<image href="${asset}" width="1536" height="1024"/>`;
  const left = "0,0 480,0 480,275 310,275 265,390 0,440",
    right = "1070,0 1536,0 1536,510 1260,510 1240,330 1070,280";
  const lh = "110,0 480,0 480,275 285,255 225,190 110,160",
    rh = "1070,0 1536,0 1536,300 1360,300 1300,230 1100,240";
  const lj = "275,142 360,156 408,192 366,211 307,185",
    rj = "1127,173 1230,180 1315,171 1305,207 1160,218";
  const lt = "370,176 405,176 470,280 370,280",
    rt = "1070,200 1150,175 1165,190 1120,270 1050,270";
  root.innerHTML = `<defs><filter id="menu-feather"><feGaussianBlur stdDeviation="2"/></filter><mask id="menu-soft-lj"><rect width="1536" height="1024" fill="black"/><polygon points="${lj}" fill="white" filter="url(#menu-feather)"/></mask><mask id="menu-soft-rj"><rect width="1536" height="1024" fill="black"/><polygon points="${rj}" fill="white" filter="url(#menu-feather)"/></mask>
  ${[
    ["left", 360, 440],
    ["right", 430, 510],
  ]
    .map(
      ([side, start, end]) =>
        `<linearGradient id="${side}-base-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${start}" y2="${end}"><stop stop-color="black"/><stop offset="1" stop-color="white"/></linearGradient><linearGradient id="${side}-rig-fade" gradientUnits="userSpaceOnUse" x1="0" x2="0" y1="${start}" y2="${end}"><stop stop-color="white"/><stop offset="1" stop-color="black"/></linearGradient><mask id="${side}-rig-alpha"><rect width="1536" height="1024" fill="url(#${side}-rig-fade)"/></mask>`,
    )
    .join("")}
${Object.entries({ left, right, lh, rh, lj, rj, lt, rt })
  .map(
    ([id, p]) =>
      `<clipPath id="menu-${id}"><polygon points="${p}"/></clipPath>`,
  )
  .join("")}
  <mask id="menu-base"><rect width="1536" height="1024" fill="white"/><polygon points="${left}" fill="url(#left-base-fade)"/><polygon points="${right}" fill="url(#right-base-fade)"/></mask>
  ${[
    ["ln", lh],
    ["rn", rh],
    ["lhead", lj + "|" + lt],
    ["rhead", rj + "|" + rt],
  ]
    .map(
      ([id, p]) =>
        `<mask id="menu-${id}"><rect width="1536" height="1024" fill="white"/>${p
          .split("|")
          .map((q) => `<polygon points="${q}" fill="black"/>`)
          .join("")}</mask>`,
    )
    .join("")}</defs>
  <g mask="url(#menu-base)">${image}</g>
  <g mask="url(#left-rig-alpha)"><g class="royal-neck menu-neck" style="transform-origin:170px 400px">
    <g clip-path="url(#menu-left)" mask="url(#menu-ln)">${image}</g>
    <g class="snake-head menu-head" style="transform-origin:230px 185px">
      <ellipse class="menu-mouth-cavity" cx="365" cy="170" rx="48" ry="19" fill="#190207"/><g id="royal-upper" clip-path="url(#menu-lh)" mask="url(#menu-lhead)">${image}</g>
      <g id="royal-lower" class="jaw menu-jaw" style="transform-origin:278px 153px" mask="url(#menu-soft-lj)">${image}</g>
      <g class="tongue menu-tongue" style="transform-origin:375px 180px" clip-path="url(#menu-lt)">${image}</g>
      <ellipse class="eye menu-eyelid" cx="348" cy="94" rx="16" ry="12" fill="#3d2e1e"/>
    </g>
  </g>
  </g><g mask="url(#right-rig-alpha)"><g class="small-snake menu-neck" style="transform-origin:1405px 470px;animation-delay:-2s">
    <g clip-path="url(#menu-right)" mask="url(#menu-rn)">${image}</g>
    <g class="snake-head menu-head" style="transform-origin:1360px 200px;animation-delay:-2.4s">
      <g clip-path="url(#menu-rh)" mask="url(#menu-rhead)">${image}</g>
      <g class="jaw menu-jaw" style="transform-origin:1300px 180px;animation-delay:-1.8s" mask="url(#menu-soft-rj)">${image}</g>
      <g class="tongue menu-tongue" style="transform-origin:1147px 183px;animation-delay:-2s" clip-path="url(#menu-rt)">${image}</g>
      <ellipse class="eye menu-eyelid" cx="1243" cy="129" rx="14" ry="13" fill="#42622d" style="animation-delay:-3s"/>
    </g>
  </g></g>`;
  const c = canvas.getContext("2d");
  let raf = 0,
    last = 0,
    stopped = true;
  function paint(ms) {
    const box = canvas.getBoundingClientRect(),
      w = Math.min(1200, Math.round(box.width)),
      h = Math.max(1, Math.round((box.height * w) / box.width));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    c.clearRect(0, 0, w, h);
    const s = Math.max(w / 1536, h / 1024),
      ox = (w - 1536 * s) * 0.6,
      oy = (h - 1024 * s) * 0.5,
      t = ms / 1000;
    c.save();
    c.setTransform(s, 0, 0, s, ox, oy);
    // Exact fall silhouette in the environment plate; only the water receives highlights.
    c.save();
    c.beginPath();
    c.moveTo(966, 308);
    c.lineTo(1023, 301);
    c.bezierCurveTo(985, 360, 1010, 505, 955, 576);
    c.lineTo(905, 581);
    c.bezierCurveTo(929, 486, 933, 386, 966, 308);
    c.clip();
    for (let i = 0; i < 28; i++) {
      const y = 300 + ((t * 190 + i * 23) % 290),
        x = 952 + (i % 8) * 7 - (y - 310) * 0.08;
      c.strokeStyle = `rgba(217,251,255,${0.12 + (i % 3) * 0.07})`;
      c.lineWidth = 1 + (i % 3);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x - 5, y + 24, x - 8, y + 55);
      c.stroke();
    }
    c.restore();
    for (let i = 0; i < 9; i++) {
      const p = (t * 0.4 + i * 0.17) % 1;
      c.strokeStyle = `rgba(211,251,255,${(1 - p) * 0.27})`;
      c.lineWidth = 1.5;
      c.beginPath();
      c.ellipse(
        930 + (i % 3) * 24,
        580 + i * 27,
        p * (38 + i * 8) + 8,
        p * 8 + 2,
        0,
        0,
        Math.PI * 2,
      );
      c.stroke();
    }
    for (let i = 0; i < 12; i++) {
      const p = (t * 0.13 + i * 0.17) % 1;
      c.fillStyle = `rgba(255,233,148,${Math.sin(p * Math.PI) * 0.5})`;
      c.beginPath();
      c.arc(
        ((i * 193) % 1536) + Math.sin(t + i) * 8,
        1024 - p * 1000,
        1.3,
        0,
        7,
      );
      c.fill();
    }
    c.restore();
    canvas.dataset.frame = String(Math.round(ms));
  }
  function frame(t) {
    if (stopped || document.hidden) return;
    if (
      t - last >=
      (quality() === "Low" ? 100 : quality() === "High" ? 33 : 50)
    ) {
      paint(motion() ? t : 0);
      last = t;
    }
    if (motion()) raf = requestAnimationFrame(frame);
    else stopped = true;
  }
  function stop() {
    stopped = true;
    cancelAnimationFrame(raf);
    canvas.dataset.active = "false";
  }
  function start() {
    stop();
    if (document.body.classList.contains("playing") || document.hidden) return;
    canvas.dataset.active = motion() ? "true" : "static";
    if (!motion()) {
      paint(0);
      return;
    }
    stopped = false;
    raf = requestAnimationFrame(frame);
  }
  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("playing")) stop();
    else start();
  });
  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class"],
  });
  const visibility = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", visibility);
  window.addEventListener("resize", start);
  start();
  return {
    start,
    stop,
    destroy() {
      stop();
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("resize", start);
    },
  };
}
