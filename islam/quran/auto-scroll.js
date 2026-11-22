/* Quran line-by-line auto-scroll. Starts on request only; Quran text stays untouched. */
(() => {
  "use strict";
  const surah = Number(document.body.dataset.surah);
  const tools = document.querySelector(".reading-tools");
  if (!tools || !Number.isInteger(surah) || surah < 1 || surah > 114) return;
  const speedKey = "walid-ai:quran:auto-scroll-speed:v1";
  const speeds = [[14, "অতি ধীরে — ১৪ সেকেন্ড/লাইন"],
    [10, "ধীরে — ১০ সেকেন্ড/লাইন"], [6, "মাঝারি — ৬ সেকেন্ড/লাইন"]];
  const style = document.createElement("style");
  style.textContent = [
    ".walid-quran-autoscroll{display:flex;flex-wrap:wrap;align-items:center;gap:9px 12px;padding:11px 12px;margin:11px 0 16px;border:1px solid #cddfd3;border-radius:11px;background:#f5faf6;color:#214c38;font-family:inherit;line-height:1.6}",
    ".walid-quran-autoscroll label{font-weight:600;font-size:.94rem}",
    ".walid-quran-autoscroll select,.walid-quran-autoscroll button,.walid-quran-autoscroll-floating button{min-height:44px;border:1px solid #a8c5b3;border-radius:9px;background:#fff;color:#16533a;font:inherit;font-size:.92rem;padding:8px 12px;cursor:pointer}",
    ".walid-quran-autoscroll select{max-width:100%;flex:1 1 175px}",
    ".walid-quran-autoscroll button,.walid-quran-autoscroll-floating button{font-weight:600}",
    ".walid-quran-autoscroll .walid-auto-scroll-status{flex:1 1 100%;margin:0;font-size:.86rem;color:#486d58}",
    ".walid-quran-autoscroll button:focus-visible,.walid-quran-autoscroll select:focus-visible,.walid-quran-autoscroll-floating button:focus-visible{outline:3px solid #27785c;outline-offset:2px}",
    ".walid-quran-autoscroll-floating{position:fixed;z-index:1000;bottom:max(12px,env(safe-area-inset-bottom));left:50%;transform:translateX(-50%);width:min(calc(100vw - 24px),450px);display:flex;gap:10px;align-items:center;justify-content:space-between;padding:9px 11px;border-radius:14px;border:1px solid #c7dbc9;background:#f8fdf9;box-shadow:0 5px 24px #183c2b40;color:#154830;font-family:inherit}",
    ".walid-quran-autoscroll-floating>span{flex:1 1 auto;font-size:.84rem;line-height:1.35}",
    ".walid-quran-autoscroll-floating button{flex:0 0 auto;min-height:46px}",
    ".walid-quran-autoscroll-floating[hidden]{display:none!important}",
    "@media(max-width:380px){.walid-quran-autoscroll-floating{gap:5px;padding:7px}.walid-quran-autoscroll-floating button{font-size:.82rem;padding:7px}}"
  ].join("\n");
  document.head.append(style);

  const bar = document.createElement("section");
  bar.className = "walid-quran-autoscroll";
  bar.setAttribute("aria-label", "কুরআন স্বয়ংক্রিয় স্ক্রল");
  const label = document.createElement("label");
  label.textContent = "আয়াত ধরে ধীরে স্ক্রল";
  const select = document.createElement("select");
  select.className = "walid-auto-scroll-speed";
  select.id = "walid-auto-scroll-speed";
  label.htmlFor = select.id;
  for (const [seconds, description] of speeds) {
    const option = document.createElement("option");
    option.value = String(seconds);
    option.textContent = description;
    select.append(option);
  }
  let stored = null;
  try { stored = localStorage.getItem(speedKey); } catch { /* optional storage */ }
  select.value = speeds.some(([s]) => String(s) === stored) ? stored : "10";
  const button = document.createElement("button");
  button.type = "button";
  const stopButton = document.createElement("button");
  stopButton.type = "button";
  stopButton.textContent = "■ বন্ধ";
  stopButton.hidden = true;
  const status = document.createElement("p");
  status.className = "walid-auto-scroll-status";
  status.setAttribute("role", "status");
  bar.append(label, select, button, stopButton, status);
  // Quran tabs move .reading-tools between panels, so controls must be inside it.
  tools.append(bar);
  const floating = document.createElement("div");
  floating.className = "walid-quran-autoscroll-floating";
  floating.setAttribute("aria-label", "স্ক্রল চালু অবস্থায় নিয়ন্ত্রণ");
  floating.hidden = true;
  const floatingLabel = document.createElement("span");
  const floatingButton = document.createElement("button");
  floatingButton.type = "button";
  const floatingStop = document.createElement("button");
  floatingStop.type = "button";
  floatingStop.textContent = "■ বন্ধ";
  floating.append(floatingLabel, floatingButton, floatingStop);
  document.body.append(floating);

  let mode = "stopped", timer = null, finished = false;
  const isSurahTab = () =>
    document.getElementById("quran-tab-surah")?.getAttribute("aria-selected") === "true";
  const visibleRoot = () => {
    const mushaf = document.querySelector("#mushaf-verses");
    if (mushaf && !mushaf.hidden && mushaf.querySelector(".ayah")) return mushaf;
    const verses = document.getElementById("verses");
    return verses && !verses.hidden ? verses : null;
  };
  const clearTick = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  function refresh() {
    const playing = mode === "playing", paused = mode === "paused";
    button.textContent = playing ? "⏸ বিরতি" : paused ? "▶ আবার চালু" : "▶ অটো স্ক্রল শুরু";
    floatingButton.textContent = playing ? "⏸ বিরতি" : "▶ চালু";
    floatingLabel.textContent = playing ? "স্ক্রল চলছে" : "স্ক্রল বিরতিতে";
    stopButton.hidden = !playing && !paused;
    floating.hidden = !playing && !paused;
    status.textContent = playing
      ? "স্ক্রল চলছে। বিরতি দিতে নিচের বোতাম চাপুন।"
      : paused ? "স্ক্রল থেমে আছে। আবার চালু করতে পারেন।"
      : finished ? "এই সূরার পাঠ শেষ। আবার পড়তে স্ক্রল শুরু করুন।"
      : "একটি করে লাইনে যাবে। স্পর্শ করে নিজের মতো স্ক্রল করলে থেমে যাবে।";
  }
  function pause() {
    if (mode !== "playing") return;
    clearTick(); mode = "paused"; refresh();
  }
  function stop(done = false) {
    clearTick(); mode = "stopped"; finished = done; refresh();
  }
  function linesInReadingOrder() {
    const container = visibleRoot();
    if (!container || !isSurahTab()) return [];
    const lines = [], seen = new Set();
    for (const verse of container.querySelectorAll(".ayah")) {
      if (verse.hidden || verse.closest("[hidden]")) continue;
      for (const selector of [".arabic", ".pronunciation", ".basmala-pronunciation", ".translation", ".basmala-meaning"]) {
        const block = verse.querySelector(selector);
        if (!block || block.hidden || !block.textContent?.trim()) continue;
        const computed = getComputedStyle(block);
        if (computed.display === "none" || computed.visibility === "hidden") continue;
        const range = document.createRange();
        range.selectNodeContents(block);
        const rects = [...range.getClientRects()];
        range.detach?.();
        for (const rect of rects) {
          if (rect.width < 5 || rect.height < 5) continue;
          const y = rect.top + window.scrollY;
          const key = verse.id + ":" + Math.round(y / 4);
          if (seen.has(key)) continue;
          seen.add(key);
          lines.push({y, verse});
        }
      }
    }
    return lines.sort((a, b) => a.y - b.y);
  }
  function tick() {
    clearTick();
    if (mode !== "playing") return;
    if (document.hidden || !isSurahTab() || !visibleRoot()) { pause(); return; }
    const lines = linesInReadingOrder();
    if (!lines.length) { pause(); return; }
    const focus = Math.max(125, Math.min(innerHeight * .43, 350));
    const at = window.scrollY + focus;
    const next = lines.find(line => line.y > at + 7);
    if (!next) { stop(true); return; }
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const target = Math.max(0, Math.min(next.y - focus, max));
    if (target <= window.scrollY + 1 && next.y > at + 7) { stop(true); return; }
    const far = Math.abs(target - window.scrollY) > innerHeight * .7;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({top:target, behavior:far || reduced ? "instant" : "smooth"});
    if (next.verse.matches(".ayah[id^='ayah-']") && !next.verse.classList.contains("basmala")) {
      document.dispatchEvent(new CustomEvent("walid:quran-auto-position", {detail:{card:next.verse}}));
    }
    timer = setTimeout(tick, Number(select.value) * 1000);
  }
  function toggle() {
    if (mode === "playing") { pause(); return; }
    if (document.hidden || !isSurahTab() || !visibleRoot()) return;
    mode = "playing"; finished = false; refresh();
    tick(); // The first line moves immediately, then the configured time between lines.
  }
  button.addEventListener("click", toggle);
  floatingButton.addEventListener("click", toggle);
  stopButton.addEventListener("click", () => stop());
  floatingStop.addEventListener("click", () => stop());
  select.addEventListener("change", () => {
    try { localStorage.setItem(speedKey, select.value); } catch { /* optional */ }
    if (mode === "playing") {
      clearTick();
      timer = setTimeout(tick, Number(select.value) * 1000);
    }
  });
  // Manual touch, mouse and keyboard scrolling always takes priority.
  const isControl = target => target?.closest?.(".walid-quran-autoscroll,.walid-quran-autoscroll-floating");
  document.addEventListener("touchstart", e => { if (!isControl(e.target)) pause(); }, {passive:true});
  document.addEventListener("wheel", e => { if (!isControl(e.target)) pause(); }, {passive:true});
  document.addEventListener("pointerdown", e => { if (!isControl(e.target)) pause(); }, {passive:true});
  document.addEventListener("keydown", e => {
    if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)
      && !isControl(e.target)) pause();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });
  window.addEventListener("pagehide", pause);
  document.addEventListener("click", e => {
    const tab = e.target.closest?.(".quran-tab");
    if (tab && tab.dataset.section !== "surah") stop();
  }, {capture:true});
  refresh();
})();
