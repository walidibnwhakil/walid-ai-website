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
  const sProgressKey = "walid-ai:quran-stories:last-read:v1";
  const sBookmarkKey = "walid-ai:quran-stories:bookmark:v1";

  const css = document.createElement("style");
  css.textContent = [
    ".walid-reading-progress{display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;padding:10px 12px;margin:10px 0 16px;border:1px solid #d8e4d6;border-radius:10px;background:#fafcf8;color:#234b3b;font:inherit;line-height:1.6}",
    ".walid-reading-progress .reading-detail{flex:1 1 100%;margin:0;font-size:.94rem}",
    ".walid-reading-progress a,.walid-reading-progress button{display:inline-flex;align-items:center;justify-content:center;padding:7px 10px;border:1px solid #afc9b6;border-radius:8px;color:#185740;background:#fff;font:inherit;font-size:.9rem;text-decoration:none;cursor:pointer}",
    ".walid-reading-progress a:focus-visible,.walid-reading-progress button:focus-visible{outline:2px solid #21775a;outline-offset:2px}",
    ".walid-reading-progress .reading-feedback{flex:1 1 100%;margin:0;font-size:.82rem}",
    ".walid-reading-progress .reading-hint{flex:1 1 100%;margin:0;color:#52685b;font-size:.84rem}",
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

  // Keep every reading page awake automatically, without a separate setting or UI.
  // The browser/OS still has final control over Screen Wake Lock support.
  if (!isIndex) {
    const available = Boolean(navigator.wakeLock?.request && window.isSecureContext);
    let sentinel = null, requesting = false, blocked = false;
    const acquire = async () => {
      if (!available || document.hidden || requesting || sentinel || blocked) return;
      requesting = true;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (document.hidden) await lock.release();
        else {
          sentinel = lock;
          lock.addEventListener("release", () => {
            if (sentinel === lock) sentinel = null;
          }, {once: true});
        }
      } catch {
        blocked = true;
      } finally {
        requesting = false;
      }
    };
    const retryOnGesture = () => {
      if (blocked) blocked = false; // Retry on a real user gesture if the browser requires it.
      acquire();
    };
    document.addEventListener("pointerdown", retryOnGesture, {passive:true});
    document.addEventListener("touchstart", retryOnGesture, {passive:true});
    document.addEventListener("keydown", retryOnGesture);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) { blocked = false; acquire(); }
    });
    window.addEventListener("pageshow", () => { blocked = false; acquire(); });
    window.addEventListener("pagehide", () => {
      if (sentinel) {
        const lock = sentinel;
        sentinel = null;
        lock.release().catch(() => {});
      }
    });
    acquire();
  }

  // Quran-specific automatic resume, per-surah bookmarks and gesture-scrolling are
  // owned by /islam/quran/reading-flow.js. Story/book progress remain unchanged.
  if (isIndex || isSurah) return;

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
