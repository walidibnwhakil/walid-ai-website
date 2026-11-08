const clamp = (x) => Math.max(0, Math.min(1, x));
const ease = (a, b, t) => {
  const n = clamp((t - a) / (b - a));
  return n * n * (3 - 2 * n);
};
export function createCinematic(host, prefix) {
  host.innerHTML = `<div class="cinematic-scene" aria-hidden="true"><div class="cinematic-jungle"></div><div class="cinematic-aura"></div><div class="cinematic-face"><svg viewBox="0 0 768 1024"><defs><filter id="${prefix}-soft"><feGaussianBlur stdDeviation="6"/></filter><mask id="${prefix}-lip"><rect width="768" height="1024" fill="black"/><ellipse cx="384" cy="645" rx="150" ry="40" fill="white" filter="url(#${prefix}-soft)"/></mask><mask id="${prefix}-snout"><rect width="768" height="1024" fill="black"/><ellipse cx="384" cy="332" rx="153" ry="25" fill="white" filter="url(#${prefix}-soft)"/></mask></defs><g class="cinematic-open"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/><g class="cinematic-upper" mask="url(#${prefix}-snout)"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/></g><g class="cinematic-lower" mask="url(#${prefix}-lip)"><image href="assets/cobra-cinema.webp" width="1536" height="1024"/></g></g><g class="cinematic-closed"><image href="assets/cobra-cinema.webp" x="-768" width="1536" height="1024"/></g></svg></div><div class="cinematic-dark"></div></div>`;
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
    last = 0;
  function cancel() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    done = null;
    host.dataset.phase = "idle";
  }
  function pose(scale, gape, angle = 0) {
    face.style.transform = `translate(-50%,-47%) scale(${scale}) rotateY(${angle}deg)`;
    face.style.setProperty("--gape", gape);
    open.style.opacity = gape;
    closed.style.opacity = 1 - gape;
    host.dataset.scale = scale.toFixed(3);
    host.dataset.gape = gape.toFixed(3);
  }
  function finish() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    host.dataset.phase = "complete";
    const cb = done;
    done = null;
    cb?.();
  }
  function start(kind, { motion = true, onReveal, profile, title } = {}) {
    cancel();
    active = true;
    mode = kind;
    done = onReveal;
    scene.style.opacity = 1;
    host.dataset.mode = kind;
    if (!motion) {
      pose(1.06, kind === "enter" ? 1 : 0);
      dark.style.opacity = 0;
      jungle.style.opacity = 1;
      if (title) {
        title.style.opacity = "1";
        title.style.setProperty("--result-scale", "1");
      }
      finish();
      return;
    }
    const begin = performance.now(),
      duration = kind === "enter" ? 3800 : 6200;
    function frame(now) {
      if (!active) return;
      const p = clamp((now - begin) / duration);
      last = p;
      if (kind === "enter") {
        const approach = ease(0, 0.45, p),
          front = ease(0.16, 0.42, p),
          gape = ease(0.23, 0.58, p),
          swallow = ease(0.58, 0.96, p);
        if (profile) {
          profile.style.transform = `translate(${profile.dataset.dx * approach}px,${profile.dataset.dy * approach}px) scale(${1 + 2.5 * approach}) rotateY(${approach * -8}deg)`;
          profile.style.opacity = String(1 - ease(0.28, 0.45, p));
        }
        scene.style.opacity = front;
        jungle.style.opacity = front;
        pose(
          (0.48 + 0.7 * ease(0.18, 0.58, p)) * Math.exp(swallow * 2.5),
          gape,
          (1 - front) * -15,
        );
        dark.style.opacity = ease(0.87, 0.98, p);
        host.dataset.phase =
          p < 0.23
            ? "approach"
            : p < 0.58
              ? "open-mouth"
              : p < 0.9
                ? "enter-mouth"
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
    frame(begin);
    return { skip: finish };
  }
  return {
    enter: (options) => start("enter", options),
    defeat: (options) => start("defeat", options),
    cancel,
    finish,
    get progress() {
      return last;
    },
  };
}
