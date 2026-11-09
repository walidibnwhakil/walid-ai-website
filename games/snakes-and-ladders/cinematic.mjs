import { createEntryMesh } from "./snake-entry-mesh.mjs?v=20261109-fast";
const clamp = (n) => Math.max(0, Math.min(1, n));
const ease = (a, b, t) => {
  const n = clamp((t - a) / (b - a));
  return n * n * (3 - 2 * n);
};
const mix = (a, b, t) => a + (b - a) * t;
// The actual playing board is viewed THROUGH a moving aperture in the original menu.
// No replacement animal or flattened board is introduced in either camera direction.
export function createCinematic(host, prefix) {
  host.innerHTML =
    '<div class="cinematic-scene mouth-journey" aria-hidden="true"><div class="throat-shade"></div><div class="return-play"><svg viewBox="0 0 32 32"><path d="M6 3L29 16 6 29Z"/></svg><span>Play Now</span></div><div class="return-lose">YOU LOSE</div></div>';
  const scene = host.firstElementChild,
    shade = scene.querySelector(".throat-shade"),
    play = scene.querySelector(".return-play"),
    lose = scene.querySelector(".return-lose");
  let raf = 0,
    active = false,
    last = 0,
    sampleFrame = null,
    done = null,
    rig = null,
    mesh = null,
    board = null,
    menu = null,
    mode = "",
    prepared = false,
    lastMesh = -Infinity;
  const cleanBoard = () => {
    if (!board) return;
    for (const k of [
      "--arrival-blur",
      "--arrival-scale",
      "--arrival-opacity",
      "--arrival-x",
      "--arrival-y",
      "--arrival-brightness",
    ])
      board.style.removeProperty(k);
  };
  function reset() {
    play.style.opacity = "0";
    lose.style.opacity = "0";
    shade.style.opacity = "0";
    mesh?.destroy();
    mesh = null;
    rig?.style.removeProperty("transform");
    rig?.style.removeProperty("transform-origin");
    menu?.style.removeProperty("mask-image");
    menu?.style.removeProperty("-webkit-mask-image");
    menu?.style.removeProperty("--return-options");
    document.body.classList.remove(
      "mouth-crossing",
      "returning",
      "defeat-camera",
    );
    cleanBoard();
    rig = null;
    board = null;
    menu = null;
  }
  function cancel() {
    active = false;
    cancelAnimationFrame(raf);
    raf = 0;
    done = null;
    sampleFrame = null;
    reset();
    host.dataset.phase = "idle";
  }
  function start(
    kind,
    {
      motion = true,
      profile,
      board: playing,
      onBoardReady,
      onReveal,
      title,
      quality = "Balanced",
      fromDefeat = false,
      resultRect,
    } = {},
  ) {
    cancel();
    mode = kind;
    active = true;
    done = onReveal;
    lastMesh = -Infinity;
    prepared = false;
    rig = profile;
    board = playing;
    menu = profile?.closest("#menu");
    if (!rig || !motion) {
      if (kind === "enter") onBoardReady?.();
      if (title) {
        title.style.opacity = "1";
        title.style.setProperty("--result-scale", "1");
      }
      active = false;
      done = null;
      onReveal?.();
      host.dataset.phase = "complete";
      return;
    }
    document.body.classList.add("mouth-crossing", "entering");
    if (kind === "exit") document.body.classList.add("returning");
    if (kind === "defeat") document.body.classList.add("defeat-camera");
    menu.hidden = false;
    mesh = createEntryMesh(rig, quality);
    const begin = performance.now(),
      duration =
        kind === "enter"
          ? 4600
          : kind === "defeat"
            ? 5400
            : fromDefeat
              ? 3000
              : 3900;
    const unit = +rig.dataset.sourceScale,
      left = +rig.dataset.left,
      top = +rig.dataset.top;
    const targetZoom =
      Math.max(innerWidth / (37 * unit), innerHeight / (46 * unit)) * 2.1;
    const startButton = document
      .querySelector("#start")
      .getBoundingClientRect();
    const baseBoard = () =>
      playing.querySelector(".board-frame").getBoundingClientRect();
    let natural = null;
    const prepare = () => {
      if (prepared) return;
      prepared = true;
      onBoardReady?.();
      cleanBoard();
      natural = baseBoard();
    };
    if (kind !== "enter") {
      prepare();
    }
    function render(now) {
      if (!active) return;
      const p = clamp((now - begin) / duration);
      last = p;
      let q =
        kind === "enter"
          ? p
          : kind === "defeat"
            ? mix(1, 0.36, ease(0.05, 0.76, p))
            : fromDefeat
              ? mix(0.36, 0, ease(0.24, 0.88, p))
              : 1 - ease(0, 0.9, p);
      // The animal opens and reaches first; the camera then travels into its throat.
      let gape = ease(0, 0.2, q),
        zoom = Math.exp(Math.log(targetZoom) * ease(0.08, 0.78, q));
      if (kind === "defeat") gape = 1 - ease(0.24, 0.67, p);
      if (kind === "exit" && fromDefeat)
        gape = p < 0.25 ? ease(0, 0.2, p) : 1 - ease(0.55, 0.94, p);
      const mouth = mesh.mouth(gape),
        approach = ease(0.03, 0.3, q);
      const tx = (innerWidth / 2 - left - mouth.x) * approach,
        ty = (innerHeight / 2 - top - mouth.y) * approach;
      rig.style.transformOrigin = `${mouth.x}px ${mouth.y}px`;
      rig.style.transform = `translate(${tx}px,${ty}px) scale(${zoom}) rotate(${-9 * ease(0.1, 0.5, q)}deg)`;
      if (now - lastMesh > (quality === "Low" ? 100 : 50)) {
        mesh.paint(
          kind === "defeat"
            ? gape - 0.42 * ease(0.6, 0.88, p)
            : kind === "exit" && fromDefeat
              ? gape - 0.42 * (1 - ease(0, 0.2, p))
              : gape,
          kind === "defeat" ? ease(0.5, 0.85, p) : 0,
        );
        lastMesh = now;
      }
      const mx = left + mouth.x + tx,
        my = top + mouth.y + ty;
      const rx = Math.max(0.01, mouth.rx * zoom * gape * 0.83),
        ry = Math.max(0.01, mouth.ry * zoom * gape * 0.85);
      const mask = `radial-gradient(ellipse ${rx}px ${ry}px at ${mx}px ${my}px, transparent 87%, #000 99%)`;
      menu.style.maskImage = mask;
      menu.style.webkitMaskImage = mask;
      if (kind === "enter" && p >= 0.12) prepare();
      if (prepared && natural) {
        document.body.classList.add("arriving");
        const focus = ease(0.14, 0.96, q),
          size = mix(0.2, 1, focus);
        playing.style.setProperty("--arrival-scale", String(size));
        playing.style.setProperty("--arrival-blur", `${10 * (1 - focus)}px`);
        playing.style.setProperty(
          "--arrival-opacity",
          String(kind === "exit" && fromDefeat ? 0 : mix(0.6, 1, focus)),
        );
        playing.style.setProperty(
          "--arrival-brightness",
          String(mix(0.7, 1, focus)),
        );
        playing.style.setProperty(
          "--arrival-x",
          `${(mx - natural.x - natural.width / 2) * (1 - focus)}px`,
        );
        playing.style.setProperty(
          "--arrival-y",
          `${(my - natural.y - natural.height / 2) * (1 - focus)}px`,
        );
      }
      const tunnel = ease(0.2, 0.48, q) * (1 - ease(0.76, 1, q));
      shade.style.opacity = String(tunnel * 0.8);
      shade.style.background = `radial-gradient(ellipse at ${mx}px ${my}px, transparent 16%, #24060666 48%, #090000e8 90%)`;
      host.dataset.mode = kind;
      host.dataset.scale = zoom.toFixed(3);
      host.dataset.gape = gape.toFixed(3);
      host.dataset.serpentSource = "assets/jungle-emblem.webp";
      host.dataset.aperture = `${mx.toFixed(1)},${my.toFixed(1)},${rx.toFixed(1)},${ry.toFixed(1)}`;
      if (kind === "enter")
        host.dataset.phase =
          p < 0.15
            ? "approach"
            : p < 0.32
              ? "open-mouth"
              : p < 0.6
                ? "enter-mouth"
                : p < 0.96
                  ? "board-focus"
                  : "reveal";
      else if (kind === "defeat") {
        host.dataset.phase =
          p < 0.15
            ? "you-lose"
            : p < 0.45
              ? "close-mouth"
              : p < 0.8
                ? "exit-mouth"
                : "you-lose-final";
        if (title) {
          title.style.opacity = String(
            p < 0.3 ? 1 - ease(0.08, 0.26, p) : ease(0.78, 0.96, p),
          );
          title.style.setProperty(
            "--result-scale",
            String(
              p < 0.3
                ? 1 - 0.8 * ease(0.08, 0.26, p)
                : mix(0.5, 1, ease(0.78, 0.96, p)),
            ),
          );
        }
      } else {
        host.dataset.phase =
          p < 0.2
            ? "leave-board"
            : p < 0.64
              ? "exit-mouth"
              : p < 0.9
                ? "release-play"
                : "menu";
        const out = ease(0.59, 0.94, p),
          emit = ease(0.52, 0.7, p);
        play.style.opacity = String(emit * (1 - ease(0.9, 1, p)));
        const sx = mx,
          sy = my;
        play.style.left = `${mix(sx, startButton.x + startButton.width / 2, out)}px`;
        play.style.top = `${mix(sy, startButton.y + startButton.height / 2, out)}px`;
        play.style.width = `${startButton.width}px`;
        play.style.transform = `translate(-50%,-50%) scale(${mix(0.08, 1, out)}) rotate(${mix(-14, 0, out)}deg)`;
        menu.style.setProperty("--return-options", String(ease(0.89, 1, p)));
        lose.style.opacity = fromDefeat ? String(1 - ease(0.04, 0.22, p)) : "0";
        lose.style.transform = `translate(-50%,-50%) scale(${mix(1, 0.02, ease(0.03, 0.24, p))})`;
        lose.style.left = `${mix(resultRect ? resultRect.x + resultRect.width / 2 : innerWidth / 2, mx, ease(0, 0.24, p))}px`;
        lose.style.top = `${mix(resultRect ? resultRect.y + resultRect.height / 2 : innerHeight * 0.58, my, ease(0, 0.24, p))}px`;
      }
      if (p >= 1) {
        complete();
        return;
      }
      raf = requestAnimationFrame(render);
    }
    function complete() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(raf);
      if (kind === "enter") prepare();
      host.dataset.phase = "complete";
      if (kind === "defeat") {
        shade.style.opacity = "0";
        cleanBoard();
        document.body.classList.remove("arriving");
      } else {
        reset();
        document.body.classList.remove("arriving");
      }
      const cb = done;
      done = null;
      cb?.();
    }
    sampleFrame = (p) => {
      if (!active) return;
      cancelAnimationFrame(raf);
      render(begin + clamp(p) * duration);
      cancelAnimationFrame(raf);
      raf = 0;
    };
    start.finish = complete;
    render(begin);
  }
  return {
    enter: (o) => start("enter", o),
    exit: (o) => start("exit", o),
    defeat: (o) => start("defeat", o),
    cancel,
    finish: () => start.finish?.(),
    sample: (p) => sampleFrame?.(p),
    get progress() {
      return last;
    },
  };
}
