/* Quiet Quran reading: per-surah last ayah + visible press-and-hold bookmark
   + gentle gesture-triggered scroll. Never change any Arabic or Bengali text. */
(() => {
  "use strict";
  const surah = Number(document.body.dataset.surah);
  const verses = document.getElementById("verses");
  if (!verses || !Number.isInteger(surah) || surah < 1 || surah > 114) return;
  const slug = location.pathname.split("/").filter(Boolean).at(-1);
  const bn = value => String(value).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  const lastKey = "walid-ai:quran:last-read:" + surah + ":v2";
  const markKey = "walid-ai:quran:bookmark:" + surah + ":v2";
  const legacyLastKey = "walid-ai:quran:last-read:v1";
  const legacyMarkKey = "walid-ai:quran:bookmark:v1";
  const read = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const store = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const erase = key => { try { localStorage.removeItem(key); return true; } catch { return false; } };
  const valid = value => value && value.surah === surah &&
    Number.isInteger(value.verse) && value.verse >= 1 && value.verse <= 286 &&
    value.slug === slug;
  let last = read(lastKey);
  let bookmark = read(markKey);
  // Retain already saved reading data when transitioning from the original global keys.
  if (!valid(last)) {
    const old = read(legacyLastKey);
    last = valid(old) ? old : null;
    if (last) store(lastKey, last);
  }
  if (!valid(bookmark)) {
    const old = read(legacyMarkKey);
    bookmark = valid(old) ? old : null;
    if (bookmark) store(markKey, bookmark);
  }

  const style = document.createElement("style");
  style.textContent = [
    ".ayah.walid-ayah-bookmarked{position:relative;border-color:#b89c59!important;background:#fffbef!important;box-shadow:inset 4px 0 #b59037,0 4px 15px #153c2708!important}",
    ".ayah.walid-ayah-bookmarked::after{content:'◆';position:absolute;top:9px;right:13px;font-size:.75rem;line-height:1;color:#ac8130;pointer-events:none}",
    ".ayah.walid-ayah-bookmarked .ayah-number::before{background:#f3e4b9!important;border-color:#ab893d!important;color:#674d1a!important}",
    ".ayah-number[data-walid-bookmark]{cursor:pointer;touch-action:pan-y}",
    ".ayah-number[data-walid-bookmark]:focus-visible{outline:2px solid #8d6a25;outline-offset:4px;border-radius:5px}",
    ".walid-quran-toast{position:fixed;z-index:1001;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);max-width:min(90vw,380px);padding:9px 16px;border:1px solid #c9ddcd;border-radius:20px;background:#174b37;color:white;text-align:center;font:600 .92rem/1.5 system-ui,'Noto Sans Bengali',sans-serif;box-shadow:0 6px 24px #163e2f33;pointer-events:none;opacity:1;transition:opacity .35s ease}",
    ".walid-quran-toast[hidden]{display:none!important}",
    ".walid-quran-toast.walid-quran-toast-fade{opacity:0}",
    "@media(prefers-reduced-motion:reduce){.walid-quran-toast{transition:none}}"
  ].join("\n");
  document.head.append(style);
  const toast = document.createElement("div");
  toast.className = "walid-quran-toast";
  toast.setAttribute("role", "status");
  toast.setAttribute("aria-live", "polite");
  toast.hidden = true;
  document.body.append(toast);
  let toastTimer = null, hideTimer = null;
  const message = text => {
    clearTimeout(toastTimer); clearTimeout(hideTimer);
    toast.textContent = text;
    toast.hidden = false;
    toast.classList.remove("walid-quran-toast-fade");
    toastTimer = setTimeout(() => toast.classList.add("walid-quran-toast-fade"), 2200);
    hideTimer = setTimeout(() => { toast.hidden = true; }, 2700);
  };
  const onSurahTab = () =>
    document.getElementById("quran-tab-surah")?.getAttribute("aria-selected") === "true";
  function readingRoot() {
    const mushaf = document.getElementById("mushaf-verses");
    if (mushaf && !mushaf.hidden && mushaf.querySelector(".ayah")) return mushaf;
    return !verses.hidden ? verses : null;
  }
  function verseNumber(card) {
    if (!card || !card.classList.contains("ayah") || card.classList.contains("basmala")) return null;
    const withSurah = /^ayah-(\d+)-(\d+)$/.exec(card.id);
    if (withSurah) return Number(withSurah[1]) === surah ? Number(withSurah[2]) : null;
    const own = /^ayah-(\d+)$/.exec(card.id);
    const n = own ? Number(own[1]) : Number(card.dataset.verse);
    return Number.isInteger(n) && n >= 1 && n <= 286 ? n : null;
  }
  function savedValue(card) {
    const verse = verseNumber(card);
    return verse ? {surah,verse,slug,savedAt:Date.now()} : null;
  }
  function allCards() {
    const root = readingRoot();
    return root && onSurahTab() ? [...root.querySelectorAll(".ayah[id^='ayah-']")].filter(c => verseNumber(c)) : [];
  }
  function currentCard() {
    const cards = allCards();
    const focus = Math.max(125, Math.min(innerHeight * .44, 360));
    return cards.find(card => {
      const bounds = card.getBoundingClientRect();
      return bounds.top <= focus && bounds.bottom >= focus;
    }) || [...cards].reverse().find(card => card.getBoundingClientRect().top <= focus) || cards[0] || null;
  }
  function savePosition(card) {
    const value = savedValue(card);
    if (value && (!last || last.verse !== value.verse)) {
      if (store(lastKey, value)) last = value;
    }
  }
  let restoring = false;
  let saveDebounce = null;
  const deferSave = () => {
    if (restoring || document.hidden || !onSurahTab()) return;
    clearTimeout(saveDebounce);
    saveDebounce = setTimeout(() => savePosition(currentCard()), 210);
  };

  // Bookmarks are shown only on the current surah's ayah, not in a separate panel.
  function decorateCards() {
    const mark = bookmark?.verse;
    document.querySelectorAll("#verses .ayah, #mushaf-verses .ayah").forEach(card => {
      const verse = verseNumber(card);
      if (!verse) return;
      const selected = mark === verse;
      card.classList.toggle("walid-ayah-bookmarked", selected);
      card.dataset.walidBookmarked = String(selected);
      const number = card.querySelector(".ayah-number");
      if (!number) return;
      number.dataset.walidBookmark = "true";
      number.setAttribute("role", "button");
      number.tabIndex = 0;
      const action = selected ? "বুকমার্ক সরান" : "বুকমার্ক করুন";
      number.setAttribute("aria-label", "আয়াত " + bn(verse) + " " + action);
      number.title = "আয়াত " + bn(verse) + ": " + action + " (চেপে ধরুন)";
    });
  }
  function toggleBookmark(card) {
    const value = savedValue(card);
    if (!value) return;
    if (bookmark?.verse === value.verse) {
      if (!erase(markKey)) return;
      bookmark = null;
      message("আয়াত " + bn(value.verse) + " থেকে বুকমার্ক সরানো হয়েছে");
    } else {
      if (!store(markKey, value)) return;
      bookmark = value;
      message("আয়াত " + bn(value.verse) + " বুকমার্ক হয়েছে");
    }
    decorateCards();
  }
  decorateCards();
  let pendingDecoration = false;
  new MutationObserver(() => {
    if (pendingDecoration) return;
    pendingDecoration = true;
    requestAnimationFrame(() => { pendingDecoration = false; decorateCards(); });
  }).observe(verses.parentElement || document.body, {childList:true,subtree:true});

  // Long-press an ayah for 650ms. A normal tap on its number also works, including
  // Enter/Space keyboard access; moving to scroll cancels long-press immediately.
  let hold = null, suppressClickUntil = 0;
  const cancelHold = () => {
    if (!hold) return;
    clearTimeout(hold.timer);
    hold = null;
  };
  document.addEventListener("pointerdown", event => {
    cancelHold();
    const card = event.target.closest?.(".ayah");
    if (!card || !readingRoot()?.contains(card) || !onSurahTab() || !verseNumber(card)) return;
    const started = {card,x:event.clientX,y:event.clientY,identifier:event.pointerId,timer:null};
    started.timer = setTimeout(() => {
      if (hold !== started) return;
      suppressClickUntil = Date.now() + 900;
      toggleBookmark(card);
      hold = null;
    }, 650);
    hold = started;
  }, {passive:true});
  document.addEventListener("pointermove", event => {
    if (hold && hold.identifier === event.pointerId &&
        Math.hypot(event.clientX-hold.x,event.clientY-hold.y) > 12) cancelHold();
  }, {passive:true});
  document.addEventListener("pointerup", cancelHold, {passive:true});
  document.addEventListener("pointercancel", cancelHold, {passive:true});
  window.addEventListener("blur", cancelHold);
  document.addEventListener("click", event => {
    const number = event.target.closest?.(".ayah-number[data-walid-bookmark]");
    if (!number || !readingRoot()?.contains(number)) return;
    if (Date.now() < suppressClickUntil) { event.preventDefault(); return; }
    toggleBookmark(number.closest(".ayah"));
  });
  document.addEventListener("keydown", event => {
    if (!["Enter"," "].includes(event.key) ||
        !event.target.matches?.(".ayah-number[data-walid-bookmark]")) return;
    event.preventDefault();
    event.target.click();
  });
  document.addEventListener("contextmenu", event => {
    if (Date.now() < suppressClickUntil && event.target.closest?.(".ayah")) event.preventDefault();
  });

  // When returning to a particular surah, jump to THAT surah's last-read ayah.
  // An explicit #ayah deep link always wins over stored progress.
  const hasTarget = /^#ayah-\d+(?:-\d+)?$/.test(location.hash);
  const pendingTarget = hasTarget ? location.hash.slice(1) :
    valid(last) && last.verse > 1 ? "ayah-" + last.verse : null;
  if (pendingTarget) {
    restoring = true;
    const seek = () => {
      const target = document.getElementById(pendingTarget);
      if (!target || target.closest("[hidden]") || !onSurahTab()) return false;
      target.scrollIntoView({block:"start",behavior:"instant"});
      if (!hasTarget) message("সর্বশেষ পঠিত আয়াত · " + bn(last.verse));
      setTimeout(() => { restoring = false; }, 1100);
      return true;
    };
    // Quran verses can also be populated asynchronously on supported pages.
    if (!seek()) {
      const observer = new MutationObserver(() => {
        if (seek()) observer.disconnect();
      });
      observer.observe(document.body, {childList:true,subtree:true});
      setTimeout(() => { observer.disconnect(); restoring = false; }, 6500);
    }
  }

  // Auto-scroll: user swipes/drags once, then the page moves gently on its own.
  // Touching pauses immediately. Swiping again restarts. No separate controls.
  const speed = 26; // px/second: typically ~2s per wrapped Bengali line.
  let frame = null, previousFrame = 0, targetY = 0, gestureTimer = null;
  let touching = false, touchY = 0, dragged = false, touchInsideReading = false;
  function stopAuto() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousFrame = 0;
    clearTimeout(gestureTimer); gestureTimer = null;
  }
  function animate(time) {
    if (frame === null) return;
    if (document.hidden || !onSurahTab() || !readingRoot() || touching) { stopAuto(); return; }
    if (previousFrame) {
      const elapsed = Math.min(time - previousFrame, 80);
      const max = Math.max(0,document.documentElement.scrollHeight-innerHeight);
      targetY = Math.min(max,targetY + speed*elapsed/1000);
      window.scrollTo({top:targetY,behavior:"instant"});
      if (targetY >= max-1) { stopAuto(); return; }
    }
    previousFrame = time;
    frame = requestAnimationFrame(animate);
  }
  function startAuto() {
    if (document.hidden || touching || !onSurahTab() || !readingRoot() || restoring) return;
    if (frame !== null) cancelAnimationFrame(frame);
    targetY = window.scrollY;
    previousFrame = 0;
    frame = requestAnimationFrame(animate);
  }
  function resumeAfterGesture() {
    stopAuto();
    gestureTimer = setTimeout(startAuto, 450);
  }
  function readingTouch(target) {
    return Boolean(readingRoot()?.contains(target) && onSurahTab());
  }
  document.addEventListener("touchstart", event => {
    stopAuto();
    touching = true;
    const finger = event.touches[0];
    touchY = finger?.clientY || 0;
    touchInsideReading = readingTouch(event.target);
    dragged = false;
  }, {passive:true});
  document.addEventListener("touchmove", event => {
    const finger = event.touches[0];
    if (finger && Math.abs(finger.clientY-touchY) > 12) dragged = true;
  }, {passive:true});
  document.addEventListener("touchend", event => {
    if (event.touches.length) return;
    touching = false;
    if (dragged && touchInsideReading) resumeAfterGesture();
    dragged = false;
  }, {passive:true});
  document.addEventListener("touchcancel", () => { touching = false; dragged = false; stopAuto(); }, {passive:true});
  document.addEventListener("wheel", event => {
    if (readingTouch(event.target) || (readingRoot() && onSurahTab() && !event.target.closest?.("input,select,textarea"))) {
      resumeAfterGesture();
    }
  }, {passive:true});
  document.addEventListener("keydown", event => {
    if (["ArrowDown","ArrowUp","PageUp","PageDown","Home","End"," "].includes(event.key) &&
        !event.target.closest?.("input,textarea,select,button,[role=tab]") && onSurahTab()) {
      resumeAfterGesture();
    }
  });
  // Hovering/clicking into the reading area without moving must not restart.
  document.addEventListener("pointerdown", event => {
    if (readingTouch(event.target)) stopAuto();
  }, {passive:true});
  window.addEventListener("scroll", deferSave, {passive:true});
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { stopAuto(); savePosition(currentCard()); }
  });
  window.addEventListener("pagehide", () => {
    stopAuto();
    if (!restoring) savePosition(currentCard());
  });
  document.addEventListener("click", event => {
    const tab = event.target.closest?.(".quran-tab");
    if (tab && tab.dataset.section !== "surah") {
      stopAuto();
      clearTimeout(saveDebounce);
    }
  }, {capture:true});
})();
