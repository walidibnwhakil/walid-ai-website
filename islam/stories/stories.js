/* Quran stories are published as HTML. Search works without a JSON round-trip. */
(() => {
  'use strict';
  const list = document.getElementById('story-list');
  const input = document.getElementById('story-search');
  const status = document.getElementById('story-status');
  if (!list || !input || !status) return;
  const digitMap = '০১২৩৪৫৬৭৮৯';
  const normalize = value => String(value || '').normalize('NFKC')
    .toLocaleLowerCase('bn')
    .replace(/[০-৯]/g, digit => String(digitMap.indexOf(digit)))
    .replace(/\s+/g, ' ').trim();
  const localizedNumber = value => String(value).replace(/[0-9]/g, d => digitMap[Number(d)]);
  const articles = [...list.querySelectorAll('article.story-card')].map(node => ({
    node, searchText: normalize(node.textContent)
  }));
  function search() {
    const terms = normalize(input.value).split(' ').filter(Boolean);
    let count = 0;
    for (const {node, searchText} of articles) {
      const match = terms.every(term => searchText.includes(term));
      node.hidden = !match;
      if (match) count++;
    }
    status.textContent = terms.length
      ? (count ? localizedNumber(count) + 'টি মিল পাওয়া গেছে' : 'এই নামে কোনো কাহিনি পাওয়া যায়নি।')
      : localizedNumber(articles.length) + 'টি কাহিনি ও ঘটনা';
  }
  input.addEventListener('input', search);
  search();
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
