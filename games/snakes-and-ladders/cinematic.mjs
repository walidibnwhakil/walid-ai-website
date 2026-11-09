import { createEntryMesh } from "./snake-entry-mesh.mjs?v=20261109-living";
const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (a, b, t) => {
  const n = clamp((t - a) / (b - a));
  return n * n * (3 - 2 * n);
};
export function createCinematic(host, prefix) {
  host.innerHTML = `<div class="cinematic-scene" aria-hidden="true"><div class="cinematic-jungle"></div><div class="cinematic-aura"></div><div class="cinematic-face"><svg viewBox="0 0 768 1024"><defs><filter id="${prefix}-soft"><feGaussianBlur stdDeviation="6"/></filter><mask id="${prefix}-lip"><rect width="768" height="1024" fill="black"/><ellipse cx="384" cy="645" rx="150" ry="40" fill="white" filter="url(#${prefix}-soft)"/></mask><mask id="${prefix}-snout"><rect width="768" height="1024" fill="black"/><ellipse cx="384" cy="332" rx="153" ry="25" fill="white" filter="url(#${prefix}-soft)"/></mask></defs><g class="cinematic-open"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/><g class="cinematic-upper" mask="url(#${prefix}-snout)"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/></g><g class="cinematic-lower" mask="url(#${prefix}-lip)"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/></g></g><g class="cinematic-closed"><image href="assets/cobra-cinema.webp" x="-768" width="1536" height="1024"/></g></svg></div><div class="cinematic-dark"></div></div>`;
  if (prefix === "entrance")
    host.innerHTML =
      '<div class="cinematic-scene original-snake-entry" aria-hidden="true"><div class="cinematic-dark"></div></div>';
  const scene = host.firstElementChild,
    face = scene.querySelector(".cinematic-face"),
    open = scene.querySelector(".cinematic-open"),
    closed = scene.querySelector(".cinematic-closed"),
    dark = scene.querySelector(".cinematic-dark"),
    jungle = scene.querySelector(".cinematic-jungle");
  let raf = 0,
    active = false,
    done = null,
    mode = "",
    last = 0,
    rig = null,
    cameraBoard = null,
    boardReady = null,
    prepared = false,
    sampleFrame = null;
  function resetCamera() {
    mesh?.destroy();
    mesh = null;
    if (rig) {
      rig.profile.style.removeProperty("transform");
      rig.profile.style.removeProperty("opacity");
      rig.profile.style.removeProperty("transform-origin");
      for (const node of [rig.upper, rig.lower, rig.cavity]) {
        node?.style.removeProperty("transform");
        node?.style.removeProperty("opacity");
      }
    }
    if (cameraBoard) {
      for (const key of [
        "--arrival-blur",
        "--arrival-scale",
        "--arrival-opacity",
      ])
        cameraBoard.style.removeProperty(key);
    }
    rig = null;
    cameraBoard = null;
    boardReady = null;
  }
  function prepareBoard() {
    if (!prepared) {
      prepared = true;
      boardReady?.();
    }
  }
  let mesh = null,
    lastMesh = -Infinity;
  function cancel() {
    active = false;
    mesh?.destroy();
    mesh = null;
    cancelAnimationFrame(raf);
    raf = 0;
    done = null;
    resetCamera();
    sampleFrame = null;
    host.dataset.phase = "idle";
  }
  function pose(scale, gape, angle = 0) {
    if (face)
      face.style.transform = `translate(-50%,-47%) scale(${scale}) rotateY(${angle}deg)`;
    face?.style.setProperty("--gape", gape);
    if (open) open.style.opacity = gape;
    if (closed) closed.style.opacity = 1 - gape;
    host.dataset.scale = scale.toFixed(3);
    host.dataset.gape = gape.toFixed(3);
  }
  function finish() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    host.dataset.phase = "complete";
    if (mode === "enter") prepareBoard();
    resetCamera();
    const cb = done;
    done = null;
    cb?.();
  }
  function start(
    kind,
    {
      motion = true,
      onReveal,
      onBoardReady,
      profile,
      board,
      title,
      quality = "Balanced",
    } = {},
  ) {
    cancel();
    active = true;
    mode = kind;
    done = onReveal;
    boardReady = onBoardReady;
    cameraBoard = board;
    prepared = false;
    if (kind === "enter" && profile) {
      rig = {
        profile,
        upper: profile.querySelector("#royal-upper"),
        lower: profile.querySelector("#royal-lower"),
        cavity: profile.querySelector(".menu-mouth-cavity"),
      };
      profile.style.transformOrigin = "var(--mouth-x) var(--mouth-y)";
      host.dataset.serpentSource = "assets/jungle-emblem.webp";
    }
    scene.style.opacity = 1;
    host.dataset.mode = kind;
    if (!motion) {
      pose(1.06, kind === "enter" ? 1 : 0);
      dark.style.opacity = 0;
      if (jungle) jungle.style.opacity = 1;
      if (title) {
        title.style.opacity = "1";
        title.style.setProperty("--result-scale", "1");
      }
      finish();
      return;
    }
    if (kind === "enter" && profile) mesh = createEntryMesh(profile, quality);
    const begin = performance.now(),
      duration = kind === "enter" ? 4800 : 6200;
    function frame(now) {
      if (!active) return;
      const p = clamp((now - begin) / duration);
      last = p;
      if (kind === "enter") {
        const approach = ease(0, 0.26, p),
          gape = ease(0.12, 0.34, p),
          swallow = ease(0.32, 0.58, p);
        const zoom = (1 + 4 * ease(0, 0.32, p)) * Math.exp(swallow * 2.7);
        if (profile) {
          const unit = +profile.dataset.sourceScale || 0.5,
            ox = +profile.dataset.originX - 12 * gape * unit,
            oy = +profile.dataset.originY + 18 * gape * unit;
          const dx = innerWidth / 2 - (+profile.dataset.left + ox),
            dy = innerHeight / 2 - (+profile.dataset.top + oy);
          profile.style.transformOrigin = `${ox}px ${oy}px`;
          profile.style.transform = `translate(${dx * approach}px,${dy * approach}px) scale(${zoom})`;
          profile.style.opacity = "1";
          if (
            now - lastMesh >
            (quality === "Low" ? 80 : quality === "High" ? 33 : 42)
          ) {
            mesh?.paint(gape);
            lastMesh = now;
          }
        }
        scene.style.opacity = 1;
        pose(zoom, gape);
        dark.style.opacity = String(
          p < 0.6 ? ease(0.5, 0.6, p) : 1 - ease(0.62, 1, p),
        );
        if (p >= 0.6) {
          prepareBoard();
          document.body.classList.add("arriving");
          const focus = ease(0.6, 1, p);
          cameraBoard?.style.setProperty(
            "--arrival-blur",
            `${24 * (1 - focus)}px`,
          );
          cameraBoard?.style.setProperty(
            "--arrival-scale",
            String(0.72 + 0.28 * focus),
          );
          cameraBoard?.style.setProperty(
            "--arrival-opacity",
            String(0.12 + 0.88 * focus),
          );
        }
        host.dataset.phase =
          p < 0.15
            ? "approach"
            : p < 0.38
              ? "open-mouth"
              : p < 0.56
                ? "enter-mouth"
                : p < 0.64
                  ? "darkness"
                  : p < 0.96
                    ? "board-focus"
                    : "reveal";
      } else {
        const pull = ease(0.13, 0.89, p),
          gape = 1 - ease(0.1, 0.42, p);
        pose(Math.exp((1 - pull) * 2.5) * 1.06, gape, (1 - pull) * 5);
        dark.style.opacity = 1 - ease(0.08, 0.3, p);
        jungle.style.opacity = ease(0.12, 0.58, p);
        if (title) {
          const alpha =
            p < 0.28 ? 1 - ease(0.14, 0.28, p) : ease(0.76, 0.94, p);
          title.style.opacity = String(alpha);
          title.style.setProperty(
            "--result-scale",
            String(
              p < 0.3
                ? 1 - 0.7 * ease(0.14, 0.29, p)
                : 0.65 + 0.35 * ease(0.76, 0.96, p),
            ),
          );
        }
        host.dataset.phase =
          p < 0.15
            ? "you-lose"
            : p < 0.42
              ? "close-mouth"
              : p < 0.89
                ? "exit-mouth"
                : "you-lose-final";
      }
      if (p >= 1) {
        if (title) {
          title.style.opacity = "1";
          title.style.setProperty("--result-scale", "1");
        }
        finish();
        return;
      }
      raf = requestAnimationFrame(frame);
    }
    // Frame sampling reuses the production renderer for the local browser harness.
    // It freezes only this camera, so screenshot latency cannot skip a brief phase.
    sampleFrame = (progress) => {
      if (!active) return;
      cancelAnimationFrame(raf);
      frame(begin + clamp(progress) * duration);
      cancelAnimationFrame(raf);
      raf = 0;
    };
    frame(begin);
    return { skip: finish };
  }
  return {
    enter: (options) => start("enter", options),
    defeat: (options) => start("defeat", options),
    cancel,
    finish,
    sample: (progress) => sampleFrame?.(progress),
    get progress() {
      return last;
    },
  };
}
