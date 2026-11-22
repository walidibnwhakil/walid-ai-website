/* Quran catalog: compact, accessible search opens only when requested. */
(() => {
  "use strict";
  const root = "/islam/quran/";
  const list = document.getElementById("surah-list");
  const input = document.getElementById("surah-search");
  const status = document.getElementById("list-status");
  const panel = document.getElementById("surah-search-panel");
  const toggle = document.getElementById("surah-search-toggle");
  if (!list || !input || !status || !panel || !toggle) return;
  let surahs = [];
  const bn = n => String(n).replace(/\d/g, d => "০১২৩৪৫৬৭৮৯"[Number(d)]);
  function render() {
    const query = input.value.trim().toLocaleLowerCase();
    if (!surahs.length) return; // Keep the checked-in 114-card fallback until metadata is ready.
    list.replaceChildren();
    const matches = surahs.filter(s =>
      [s.number, bn(s.number), s.banglaName, s.transliteration, s.arabicName, s.meaning]
        .join(" ").toLocaleLowerCase().includes(query));
    if (!matches.length) {
      const p = document.createElement("p");
      p.className = "empty-state";
      p.textContent = "এই নামে কোনো সূরা পাওয়া যায়নি।";
      list.append(p);
    } else {
      for (const s of matches) {
        const a = document.createElement("a");
        a.className = "surah-card";
        a.href = root + s.slug + "/";
        const number = document.createElement("span");
        number.className = "surah-number";
        number.textContent = bn(s.number);
        const copy = document.createElement("span");
        const title = document.createElement("strong");
        title.textContent = s.banglaName || s.transliteration;
        const sub = document.createElement("small");
        sub.textContent = s.arabicName + " · " + bn(s.verseCount) + " আয়াত · " +
          (s.revelation === "meccan" ? "মাক্কি" : "মাদানি");
        copy.append(title, sub);
        a.append(number, copy);
        list.append(a);
      }
    }
    status.textContent = query ? "পাওয়া গেছে " + bn(matches.length) + "টি সূরা" :
      "মোট " + bn(surahs.length) + "টি সূরা";
  }
  function setSearchOpen(open, focus = false) {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "সার্চ বন্ধ করুন" : "সূরা খুঁজুন");
    toggle.title = open ? "সার্চ বন্ধ করুন" : "সূরা খুঁজুন";
    if (open) {
      if (focus) input.focus();
    } else {
      if (input.value) {
        input.value = "";
        render();
      }
      if (focus) toggle.focus();
    }
  }
  toggle.addEventListener("click", () => setSearchOpen(panel.hidden, true));
  input.addEventListener("input", render);
  panel.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    setSearchOpen(false, true);
  });
  fetch(root + "data/metadata.json").then(response => {
    if (!response.ok) throw Error("metadata unavailable");
    return response.json();
  }).then(data => {
    if (!Array.isArray(data) || data.length !== 114) throw Error("expected 114 surahs");
    surahs = data;
    render();
  }).catch(() => {
    status.textContent = "সূরার তালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।";
  });
})();

/* Shared reading-session enhancement: device-only bookmarks + best-effort screen wake lock. */
(() => {
  if (document.getElementById("walid-reading-session-script")) return;
  const script = document.createElement("script");
  script.id = "walid-reading-session-script";
  script.src = "/assets/reading-session.js?v=20261122";
  script.async = true;
  document.head.append(script);
})();

/* Anonymous aggregate page-view and active-time counters; never inspect reading content. */
(() => {
  if (document.querySelector('script[src^="/usage.js"]') || document.getElementById('walid-section-usage')) return;
  const script = document.createElement('script');
  script.id = 'walid-section-usage';
  script.src = '/usage.js?v=20261122-section-analytics';
  script.async = true;
  document.head.append(script);
})();
