/* Shared on-device reading experience for Quran, Quran stories and Others books.
   Wake Lock is best-effort: mobile OS/browser can decline or release it. */
(() => {
  "use strict";
  const path = location.pathname.replace(/index\.html$/, "").replace(/\/?$/, "/");
  const isSurah = /^\/islam\/quran\/[a-z0-9-]+\/$/.test(path) &&
    Number.isInteger(Number(document.body.dataset.surah)) && Number(document.body.dataset.surah) >= 1;
  const isIndex = path === "/islam/quran/";
  const isStories = path === "/islam/stories/" && !!document.querySelector("#story-list");
  const isBook = !!document.querySelector(".others-reader");
  if (!isSurah && !isIndex && !isStories && !isBook) return;

  const bn = value => String(value).replace(/\d/g, c => "০১২৩৪৫৬৭৮৯"[Number(c)]);
  const get = key => { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } };
  const put = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } };
  const qProgressKey = "walid-ai:quran:last-read:v1";
  const qBookmarkKey = "walid-ai:quran:bookmark:v1";
  const sProgressKey = "walid-ai:quran-stories:last-read:v1";
  const sBookmarkKey = "walid-ai:quran-stories:bookmark:v1";
  const wakeKey = "walid-ai:reading:keep-awake:v1";

  const css = document.createElement("style");
  css.textContent = [
    ".walid-reading-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;margin:10px 0 16px;border:1px solid #d8e4d6;border-radius:10px;background:#f7fbf7;color:#234b3b;font:inherit;line-height:1.5}",
    ".walid-reading-controls button,.walid-reading-controls a{border:1px solid #afc9b6;border-radius:8px;padding:7px 10px;background:#fff;color:#185740;font:inherit;font-size:.9rem;text-decoration:none;cursor:pointer}",
    ".walid-reading-controls button:focus-visible,.walid-reading-controls a:focus-visible{outline:2px solid #21775a;outline-offset:2px}",
    ".walid-reading-controls .reading-status{font-size:.88rem;flex:1 1 175px}",
    ".walid-reading-progress{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;margin:10px 0 16px;border:1px solid #d8e4d6;border-radius:10px;background:#fafcf8;color:#234b3b;font:inherit;line-height:1.6}",
    ".walid-reading-progress .reading-detail{flex:1 1 100%;margin:0;font-size:.94rem}",
    ".walid-reading-progress a,.walid-reading-progress button{display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;border:1px solid #afc9b6;border-radius:8px;color:#185740;background:#fff;font:inherit;font-size:.9rem;text-decoration:none;cursor:pointer}",
    ".walid-reading-progress a:focus-visible,.walid-reading-progress button:focus-visible{outline:2px solid #21775a;outline-offset:2px}",
    ".walid-reading-progress .reading-feedback{flex:1 1 100%;margin:0;font-size:.82rem}",
    "[hidden].walid-reading-progress,[hidden].walid-reading-controls{display:none!important}",
    "@media(max-width:600px){.walid-reading-progress,.walid-reading-controls{gap:7px;padding:9px}.walid-reading-progress a,.walid-reading-progress button,.walid-reading-controls button{font-size:.86rem}}"
  ].join("\n");
  document.head.append(css);

  function newPanel(className, label, reference) {
    const panel = document.createElement("section");
    panel.className = className;
    panel.setAttribute("aria-label", label);
    if (reference) reference.insertAdjacentElement("afterend", panel);
    return panel;
  }
  function addButton(parent, label, onClick) {
    const el = document.createElement("button");
    el.type = "button";
    el.textContent = label;
    el.addEventListener("click", onClick);
    parent.append(el);
    return el;
  }
  function addLink(parent, label, href, onClick) {
    const el = document.createElement("a");
    el.textContent = label;
    el.href = href;
    if (onClick) el.addEventListener("click", onClick);
    parent.append(el);
    return el;
  }

  // Listing pages do not hold the screen awake; only actual reading pages do.
  if (!isIndex) {
    const anchor = isSurah ? document.querySelector(".reading-tools") :
      isBook ? document.querySelector(".others-book-title") : document.querySelector(".page-head");
    if (anchor) {
      const bar = newPanel("walid-reading-controls", "পড়ার সময় স্ক্রিন জাগিয়ে রাখা", anchor);
      if (isSurah) anchor.append(bar); // Quran tabs move this container when sections change.
      const detail = document.createElement("span");
      detail.className = "reading-status";
      detail.setAttribute("role", "status");
      bar.append(detail);
      const available = !!navigator.wakeLock?.request && window.isSecureContext;
      const storedPreference = get(wakeKey);
      let desired = storedPreference !== false;
      let sentinel = null;
      let requesting = false;
      let refused = false;
      let button;
      const refresh = () => {
        if (!available) {
          detail.textContent = "এই ব্রাউজারে স্ক্রিন জাগিয়ে রাখার সুবিধা নেই।";
          button.disabled = true;
          button.textContent = "সমর্থিত নয়";
        } else if (!desired) {
          detail.textContent = "স্ক্রিন স্বাভাবিক নিয়মে বন্ধ হবে।";
          button.textContent = "স্ক্রিন জাগিয়ে রাখুন";
        } else if (sentinel && !sentinel.released) {
          detail.textContent = "পড়ার সময় স্ক্রিন জেগে থাকবে।";
          button.textContent = "বন্ধ করুন";
        } else {
          detail.textContent = refused
            ? "ব্রাউজার বা ফোনের সেটিংস স্ক্রিন জাগিয়ে রাখা অনুমোদন করেনি।"
            : "স্ক্রিন জাগিয়ে রাখার চেষ্টা চলছে।";
          button.textContent = refused ? "আবার চেষ্টা করুন" : "চালু করুন";
        }
      };
      const acquire = async () => {
        if (!available || !desired || requesting || sentinel || document.visibilityState !== "visible" || refused) return;
        requesting = true;
        try {
          const next = await navigator.wakeLock.request("screen");
          if (!desired || document.visibilityState !== "visible") {
            await next.release();
          } else {
            sentinel = next;
            next.addEventListener("release", () => {
              if (sentinel === next) sentinel = null;
              refresh();
            }, {once: true});
          }
        } catch {
          refused = true;
        } finally {
          requesting = false;
          refresh();
        }
      };
      button = addButton(bar, "স্ক্রিন জাগিয়ে রাখুন", () => {
        if (!available) return;
        if (refused) {
          refused = false;
          desired = true;
          put(wakeKey, true);
          acquire();
        } else {
          desired = !desired;
          put(wakeKey, desired);
          if (!desired && sentinel) {
            const old = sentinel;
            sentinel = null;
            old.release().catch(() => {});
          } else if (desired) acquire();
        }
        refresh();
      });
      // Some browsers allow requests at load, others require a reading gesture.
      // Never fake wake locks using video, audio or a timer.
      const gesture = () => { if (desired && !refused) acquire(); };
      document.addEventListener("pointerdown", gesture, {passive: true});
      document.addEventListener("touchstart", gesture, {passive: true});
      document.addEventListener("keydown", gesture);
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
          refused = false;
          acquire();
        }
      });
      window.addEventListener("pageshow", () => { refused = false; acquire(); });
      window.addEventListener("pagehide", () => {
        if (!sentinel) return;
        const old = sentinel;
        sentinel = null;
        old.release().catch(() => {});
      });
      refresh();
      acquire();
    }
  }

  function validQ(value) {
    return value && Number.isInteger(value.surah) && value.surah >= 1 && value.surah <= 114 &&
      Number.isInteger(value.verse) && value.verse >= 1 && value.verse <= 286 &&
      typeof value.slug === "string" && /^[a-z0-9-]+$/.test(value.slug);
  }
  function qUrl(value) {
    const base = "/islam/quran/" + value.slug + "/";
    const page = Number.isInteger(value.page) && value.page >= 1 && value.page <= 604
      ? "?page=" + value.page : "";
    const hash = page ? "#ayah-" + value.surah + "-" + value.verse : "#ayah-" + value.verse;
    return base + page + hash;
  }
  function qLabel(value) {
    return (typeof value.title === "string" ? value.title : "সূরা " + bn(value.surah)) +
      " · আয়াত " + bn(value.verse);
  }
  const qLast = get(qProgressKey);
  const qMark = get(qBookmarkKey);

  if (isIndex) {
    if (validQ(qLast) || validQ(qMark)) {
      const main = document.querySelector("main");
      const anchor = document.querySelector(".page-head") || main?.firstElementChild;
      if (anchor) {
        const panel = newPanel("walid-reading-progress", "কুরআনে সর্বশেষ পড়া ও বুকমার্ক", anchor);
        if (validQ(qLast)) addLink(panel, "সর্বশেষ পড়া: " + qLabel(qLast), qUrl(qLast));
        if (validQ(qMark)) addLink(panel, "বুকমার্ক: " + qLabel(qMark), qUrl(qMark));
      }
    }
    return;
  }

  if (isSurah) {
    const surah = Number(document.body.dataset.surah);
    const slug = path.split("/").filter(Boolean).at(-1);
    const surahTitle = (document.querySelector("#surah-title")?.textContent || "").trim() || "সূরা " + bn(surah);
    const tools = document.querySelector(".reading-tools");
    if (!tools) return;
    const panel = newPanel("walid-reading-progress", "কুরআনের শেষ পড়া ও বুকমার্ক", tools);
    tools.append(panel); // Must remain inside tools as the tab switches between sections.
    const feedback = document.createElement("p");
    feedback.className = "reading-feedback";
    feedback.setAttribute("role", "status");
    let last = validQ(qLast) ? qLast : null;
    let bookmark = validQ(qMark) ? qMark : null;
    let pending = null;
    let timer = null;

    function cards() {
      const mushaf = document.querySelector("#mushaf-verses");
      const root = mushaf && !mushaf.hidden && mushaf.querySelector(".ayah")
        ? mushaf : document.getElementById("verses");
      return root && !root.hidden ? [...root.querySelectorAll(".ayah[data-verse],.ayah[id^='ayah-']")]
        .filter(node => !node.classList.contains("basmala")) : [];
    }
    function currentPosition() {
      const nodes = cards();
      if (!nodes.length) return null;
      const line = Math.max(120, Math.min(innerHeight * .36, 320));
      let active = nodes.find(el => {
        const rect = el.getBoundingClientRect();
        return rect.top <= line && rect.bottom >= line;
      });
      if (!active) return null;
      const match = active.id.match(/^ayah-(\d+)-(\d+)$/);
      const number = match ? Number(match[1]) : surah;
      const verse = match ? Number(match[2]) : Number(active.dataset.verse || active.id.replace("ayah-", ""));
      const pageValue = Number(new URLSearchParams(location.search).get("page"));
      const page = Number.isInteger(pageValue) && pageValue >= 1 && pageValue <= 604 ? pageValue : null;
      const value = {
        surah: number, verse, slug,
        title: number === surah ? (document.querySelector("#surah-title")?.textContent || surahTitle).trim() : "সূরা " + bn(number),
        savedAt: Date.now()
      };
      if (page) value.page = page;
      return validQ(value) ? value : null;
    }
    function saveLatest(value) {
      if (value && put(qProgressKey, value)) {
        const changed = !last || last.surah !== value.surah || last.verse !== value.verse;
        last = value;
        if (changed) renderPanel();
      }
    }
    function flush() {
      clearTimeout(timer);
      if (pending) saveLatest(pending);
      pending = null;
    }
    function resume(event, position) {
      if (position.slug !== slug || (position.page && Number(new URLSearchParams(location.search).get("page")) !== position.page)) return;
      event.preventDefault();
      document.getElementById("quran-tab-surah")?.click();
      const id = position.page ? "ayah-" + position.surah + "-" + position.verse : "ayah-" + position.verse;
      const navigate = () => {
        const target = document.getElementById(id);
        if (!target || target.closest("[hidden]")) return false;
        target.scrollIntoView({block: "start", behavior: "instant"});
        return true;
      };
      if (!navigate()) {
        const observer = new MutationObserver(() => { if (navigate()) observer.disconnect(); });
        observer.observe(document.getElementById("verses")?.parentElement || document.body, {subtree: true, childList: true});
        setTimeout(() => observer.disconnect(), 6000);
      }
    }
    function renderPanel() {
      panel.replaceChildren();
      if (last) addLink(panel, "সর্বশেষ পড়া: " + qLabel(last), qUrl(last), event => resume(event, last));
      if (bookmark) addLink(panel, "বুকমার্ক: " + qLabel(bookmark), qUrl(bookmark), event => resume(event, bookmark));
      addButton(panel, "শেষ পড়া আয়াতে বুকমার্ক", () => {
        flush();
        const value = last || currentPosition();
        if (!value) {
          feedback.textContent = "প্রথমে আয়াতের কাছে গিয়ে বুকমার্ক রাখুন।";
        } else if (put(qBookmarkKey, value)) {
          bookmark = value;
          renderPanel();
          feedback.textContent = "বুকমার্ক এই ডিভাইসে সংরক্ষিত হয়েছে।";
        } else feedback.textContent = "এই ব্রাউজারে সংরক্ষণের অনুমতি নেই।";
      });
      if (bookmark) addButton(panel, "বুকমার্ক মুছুন", () => {
        try { localStorage.removeItem(qBookmarkKey); bookmark = null; renderPanel(); feedback.textContent = "বুকমার্ক মুছে দেওয়া হয়েছে।"; }
        catch { feedback.textContent = "বুকমার্ক মুছে দেওয়া যাচ্ছে না।"; }
      });
      panel.append(feedback);
    }
    renderPanel();
    // A short surah may fit the viewport without a scroll gesture.
    setTimeout(() => {
      if (!document.hidden && (!last || last.surah !== surah) &&
          document.getElementById("quran-tab-surah")?.getAttribute("aria-selected") === "true") {
        saveLatest(currentPosition() || {
          surah, verse: 1, slug,
          title: (document.querySelector("#surah-title")?.textContent || surahTitle).trim(),
          savedAt: Date.now()
        });
      }
    }, 3000);
    let gestureAt = 0;
    const gesture = () => { gestureAt = Date.now(); };
    window.addEventListener("wheel", gesture, {passive: true});
    window.addEventListener("touchmove", gesture, {passive: true});
    window.addEventListener("keydown", e => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"].includes(e.key)) gesture();
    });
    document.addEventListener("pointerdown", e => {
      const card = e.target.closest?.(".ayah[id]");
      if (!card || card.closest("[hidden]")) return;
      gesture();
    }, {passive: true});
    window.addEventListener("scroll", () => {
      if (Date.now() - gestureAt > 1200) return;
      pending = currentPosition();
      if (pending) {
        clearTimeout(timer);
        timer = setTimeout(flush, 650);
      }
    }, {passive: true});
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    window.addEventListener("pagehide", flush);
    // The bookmark/last-read link can point to a verse assembled after async JSON.
    if (/^#ayah-\d+(?:-\d+)?$/.test(location.hash)) {
      const id = location.hash.slice(1);
      const seek = () => {
        const el = document.getElementById(id);
        if (!el || el.closest("[hidden]")) return false;
        el.scrollIntoView({block: "start", behavior: "instant"});
        return true;
      };
      if (!seek()) {
        const observer = new MutationObserver(() => { if (seek()) observer.disconnect(); });
        observer.observe(document.body, {subtree: true, childList: true});
        setTimeout(() => observer.disconnect(), 6000);
      }
    }
    return;
  }

  if (isStories) {
    const stories = [...document.querySelectorAll("#story-list .story-card[id]")];
    if (!stories.length) return;
    const lookup = new Map(stories.map(node => [node.id, node]));
    const valid = value => value && typeof value.id === "string" && lookup.has(value.id) &&
      Number.isInteger(value.paragraph) && value.paragraph >= 0;
    let last = get(sProgressKey), bookmark = get(sBookmarkKey);
    if (!valid(last)) last = null;
    if (!valid(bookmark)) bookmark = null;
    const anchor = document.querySelector(".page-head");
    if (!anchor) return;
    const panel = newPanel("walid-reading-progress", "কাহিনির সর্বশেষ পড়া ও বুকমার্ক", anchor);
    const feedback = document.createElement("p");
    feedback.className = "reading-feedback";
    feedback.setAttribute("role", "status");
    function select() {
      const line = Math.max(125, Math.min(innerHeight * .36, 320));
      const node = stories.find(story => {
        const rect = story.getBoundingClientRect();
        return !story.hidden && rect.top <= line && rect.bottom >= line;
      });
      if (!node) return null;
      const paragraphs = [...node.querySelectorAll("p")];
      let paragraph = 0;
      for (let i = 0; i < paragraphs.length; i++) {
        if (paragraphs[i].getBoundingClientRect().top > line) break;
        paragraph = i;
      }
      return {id: node.id, paragraph, savedAt: Date.now()};
    }
    function title(value) {
      return lookup.get(value.id)?.querySelector("h2")?.textContent?.trim() || "কাহিনি";
    }
    function go(event, value) {
      event.preventDefault();
      const input = document.getElementById("story-search");
      if (input && input.value) { input.value = ""; input.dispatchEvent(new Event("input")); }
      requestAnimationFrame(() => {
        const chapter = lookup.get(value.id);
        const paragraphs = chapter.querySelectorAll("p");
        const target = paragraphs[Math.min(value.paragraph, paragraphs.length - 1)] || chapter;
        target.scrollIntoView({block: "start", behavior: "instant"});
      });
    }
    function render() {
      panel.replaceChildren();
      if (last) addLink(panel, "সর্বশেষ পড়া: " + title(last), "#" + last.id, e => go(e, last));
      if (bookmark) addLink(panel, "বুকমার্ক: " + title(bookmark), "#" + bookmark.id, e => go(e, bookmark));
      addButton(panel, "বর্তমান কাহিনিতে বুকমার্ক", () => {
        const value = last || select();
        if (!value) feedback.textContent = "আগে কোনো কাহিনি পড়ুন।";
        else if (put(sBookmarkKey, value)) { bookmark = value; render(); feedback.textContent = "কাহিনির বুকমার্ক সংরক্ষিত হয়েছে।"; }
        else feedback.textContent = "এই ব্রাউজারে বুকমার্ক রাখা যাচ্ছে না।";
      });
      if (bookmark) addButton(panel, "বুকমার্ক মুছুন", () => {
        try { localStorage.removeItem(sBookmarkKey); bookmark = null; render(); feedback.textContent = "বুকমার্ক মুছে দেওয়া হয়েছে।"; }
        catch { feedback.textContent = "বুকমার্ক মুছে দেওয়া যাচ্ছে না।"; }
      });
      panel.append(feedback);
    }
    render();
    let gestureAt = 0, pending = null, timer = null;
    const touch = () => { gestureAt = Date.now(); };
    window.addEventListener("touchmove", touch, {passive: true});
    window.addEventListener("wheel", touch, {passive: true});
    window.addEventListener("keydown", e => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Home", "End"].includes(e.key)) touch();
    });
    const flush = () => {
      clearTimeout(timer);
      if (pending && put(sProgressKey, pending)) {
        if (!last || last.id !== pending.id) { last = pending; render(); }
        else last = pending;
      }
      pending = null;
    };
    window.addEventListener("scroll", () => {
      if (Date.now() - gestureAt > 1200) return;
      pending = select();
      if (pending) { clearTimeout(timer); timer = setTimeout(flush, 650); }
    }, {passive: true});
    document.addEventListener("visibilitychange", () => { if (document.hidden) flush(); });
    window.addEventListener("pagehide", flush);
  }
})();
