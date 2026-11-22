/* Quran Reader: shared navigation and section controls for all 114 surahs. */
(() => {
  'use strict';
  const n = Number(document.body.dataset.surah);
  const head = document.querySelector('.surah-head');
  const verses = document.getElementById('verses');
  const tools = document.querySelector('.reading-tools');
  const context = document.getElementById('surah-context');
  // Keep source-backed HTML introduction accessible when optional JSON notes fail.
  const htmlIntro = context?.querySelector('#chapter-note > p')?.textContent?.trim() || '';
  if (!Number.isInteger(n) || n < 1 || n > 114 || !head || !verses || !tools) return;

  document.body.classList.add('quran-reader-page');
  const base = '/islam/quran/';
  const digits = value => String(value).replace(/[0-9]/g, digit => '০১২৩৪৫৬৭৮৯'[Number(digit)]);
  const fetchJSON = async path => {
    const response = await fetch(base + path);
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return response.json();
  };
  let surahMeta = null;
  let bengaliMeta = null;
  let notesPromise = null;
  let backgroundPromise = null;
  let sectionVersion = 0;
  let activeSection = 'surah';

  const status = document.getElementById('load-status');
  if (status) status.textContent = verses.querySelector('.ayah') ? 'আরবি পাঠ ও বাংলা অনুবাদ' : 'আরবি আয়াত লোড হচ্ছে…';
  const translation = document.getElementById('show-translation');
  // Preserve the checked HTML default so Bengali meaning remains visible on first load.
  const oldNotes = document.getElementById('show-notes');
  if (oldNotes) oldNotes.closest('label')?.remove();

  const pronunciationLabel = document.createElement('label');
  pronunciationLabel.className = 'control';
  const pronunciation = document.createElement('input');
  pronunciation.type = 'checkbox';
  pronunciation.id = 'show-pronunciation';
  pronunciation.checked = false;
  pronunciationLabel.append(pronunciation, ' বাংলা উচ্চারণ');
  tools.append(pronunciationLabel);
  const pronunciationStatus = document.createElement('p');
  pronunciationStatus.className = 'pronunciation-availability';
  pronunciationStatus.setAttribute('role', 'status');
  pronunciationStatus.textContent = 'বাংলা উচ্চারণের যাচাইকৃত ও অনুমোদিত ডেটা বর্তমানে উপলভ্য নয়।';
  pronunciationStatus.hidden = true;
  tools.append(pronunciationStatus);
  function refreshPronunciation() {
    const items = [...verses.querySelectorAll('.pronunciation[data-verified="true"],.basmala-pronunciation')];
    for (const node of verses.querySelectorAll('.pronunciation,.basmala-pronunciation')) {
      node.hidden = !pronunciation.checked || (node.classList.contains('pronunciation') && node.dataset.verified !== 'true');
    }
    pronunciationStatus.hidden = !pronunciation.checked || items.length > 0;
  }
  pronunciation.addEventListener('change', refreshPronunciation);
  new MutationObserver(refreshPronunciation).observe(verses, {childList: true, subtree: true});

  const tabDefs = [
    ['surah', 'সূরা'],
    ['intro', 'সূরা পরিচিতি'],
    ['virtue', 'ফযীলত'],
    ['revelation', 'নাজিলের ইতিহাস'],
    ['explain', 'ব্যাখ্যা']
  ];
  const nav = document.createElement('nav');
  nav.className = 'quran-section-tabs';
  nav.setAttribute('aria-label', 'সূরার বিভাগ');
  nav.setAttribute('role', 'tablist');
  const panel = document.createElement('section');
  panel.className = 'quran-section-panel';
  panel.id = 'quran-tab-content';
  panel.setAttribute('role', 'tabpanel');

  const simpleParagraph = (parent, value, className = '') => {
    const p = document.createElement('p');
    if (className) p.className = className;
    p.textContent = value;
    parent.append(p);
    return p;
  };
  function noteText(parent, html) {
    // Notes originate in the checked-in source data; allow only text formatting.
    const documentFragment = new DOMParser().parseFromString('<div>' + String(html || '') + '</div>', 'text/html');
    const supported = new Set(['B','STRONG','I','EM','SUP','SUB','BR','P','UL','OL','LI']);
    const copy = (from, to) => {
      for (const child of from.childNodes) {
        if (child.nodeType === 3) { to.append(document.createTextNode(child.nodeValue || '')); continue; }
        if (child.nodeType !== 1) continue;
        if (supported.has(child.tagName)) {
          const safe = document.createElement(child.tagName.toLowerCase());
          to.append(safe);
          if (child.tagName !== 'BR') copy(child, safe);
        } else copy(child, to);
      }
    };
    const wrap = document.createElement('div');
    wrap.className = 'quran-source-note';
    copy(documentFragment.body.firstElementChild, wrap);
    parent.append(wrap);
  }
  function getNotes() {
    if (!notesPromise) notesPromise = fetchJSON('data/notes-' + String(n).padStart(3, '0') + '.json')
      .then(data => {
        if (data.surah !== n || !Array.isArray(data.notes)) throw new Error('Invalid source notes');
        return data.notes.filter(item => Number.isInteger(item.verse) && item.verse > 0 && typeof item.text === 'string');
      });
    return notesPromise;
  }

  // Original editorial summaries; QuranEnc footnotes remain unchanged and are
  // never treated as authenticated Hadith simply because they mention one.
  function getBackground() {
    if (!backgroundPromise) backgroundPromise = fetchJSON('data/surah-background-v1.json').then(data => {
      if (data.schema !== 1 || !Array.isArray(data.surahs) || data.surahs.length !== 114) {
        throw new Error('Incomplete background data');
      }
      const item = data.surahs[n - 1];
      if (!item || item.number !== n || !item.theme || !['মাক্কি', 'মাদানি'].includes(item.period) ||
          !Array.isArray(item.occasions) || !Array.isArray(item.virtues) || !Array.isArray(item.practices)) {
        throw new Error('Invalid background for surah ' + n);
      }
      return item;
    });
    return backgroundPromise;
  }

  function renderReferences(parent, sources) {
    if (!Array.isArray(sources) || !sources.length) return;
    // The full Quran/source licences stay on the dedicated credits page.
    // Inline evidence is formatted as [সহিহ বুখারী ৪৪৭৪], not a separate link.
    const paragraph = parent.lastElementChild;
    if (!paragraph || paragraph.tagName !== 'P') return;
    const labels = [...new Set(sources
      .filter(src => src && typeof src.label === 'string' && src.label.trim())
      .map(src => digits(src.label.trim())))];
    if (labels.length) {
      paragraph.append(document.createTextNode(' ' + labels.map(label => '[' + label + ']').join(' ')));
    }
  }

  function renderBackgroundEntries(items) {
    for (const item of items) {
      if (!item || typeof item.text !== 'string') continue;
      const article = document.createElement('article');
      article.className = 'section-note quran-context-entry';
      simpleParagraph(article, item.text);
      renderReferences(article, item.sources);
      panel.append(article);
    }
  }

  function sourceExcerpt(notes, matcher) {
    for (const note of notes) {
      const headings = [...note.text.matchAll(/<b[^>]*>[\s\S]*?<\/b>/gi)];
      for (let index = 0; index < headings.length; index++) {
        const heading = headings[index][0].replace(/<[^>]*>/g, '').trim();
        if (!matcher.test(heading)) continue;
        const start = headings[index].index;
        const end = index + 1 < headings.length ? headings[index + 1].index : note.text.length;
        const excerpt = note.text.slice(start, end);
        if (excerpt.replace(/<[^>]*>/g, '').trim().length > heading.length + 8) return excerpt;
      }
    }
    return '';
  }

  function showSection(key) {
    activeSection = key;
    const version = ++sectionVersion;
    for (const button of nav.querySelectorAll('[role="tab"]')) {
      const selected = button.dataset.section === key;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected) panel.setAttribute('aria-labelledby', button.id);
    }
    panel.replaceChildren();
    if (key === 'surah') {
      panel.append(tools, verses);
      refreshPronunciation();
      return;
    }
    const heading = document.createElement('h2');
    heading.textContent = tabDefs.find(item => item[0] === key)[1];
    panel.append(heading);
    if (key === 'virtue' || key === 'revelation') {
      const loading = simpleParagraph(panel, 'তথ্য ও সূত্র লোড হচ্ছে…');
      getBackground().then(info => {
        if (sectionVersion !== version) return;
        loading.remove();
        if (key === 'revelation') {
          simpleParagraph(panel, 'নাজিল-পর্ব: ' + info.period + '। মাক্কি/মাদানি শ্রেণিবিভাগ মূলত হিজরতের আগে বা পরে অবতীর্ণ হওয়ার পরিচয়; প্রতিটি আয়াত একই সময়ে নাজিল হয়েছে এমন নয়।');
          simpleParagraph(panel, 'সূরার আলোচ্য বিষয়: ' + info.theme + ' (এটি নির্দিষ্ট শানে নুযুলের দাবি নয়।)');
          renderReferences(panel, [info.themeSource]);
          if (info.occasions.length) {
            const h3 = document.createElement('h3');
            h3.textContent = 'প্রমাণিত বা কুরআনে উল্লেখিত নির্দিষ্ট প্রেক্ষাপট';
            panel.append(h3);
            renderBackgroundEntries(info.occasions);
          } else {
            simpleParagraph(panel, 'এই সূরার নির্দিষ্ট আয়াত নাজিলের পৃথকভাবে যাচাই করা ঘটনা এখানে এখনো যুক্ত করা হয়নি।');
          }
        } else {
          if (info.virtues.length) {
            renderBackgroundEntries(info.virtues);
          } else {
            simpleParagraph(panel, 'এই সূরার স্বতন্ত্র ফযীলত সম্পর্কে সহিহ সূত্রে যাচাই করা কোনো নির্দিষ্ট বর্ণনা এখনো এখানে যুক্ত করা হয়নি।');
          }
          if (info.practices.length) {
            const h3 = document.createElement('h3');
            h3.textContent = 'সহিহ সূত্রে বর্ণিত পাঠের আমল (পৃথক বিশেষ সওয়াবের দাবি নয়)';
            panel.append(h3);
            renderBackgroundEntries(info.practices);
          }
        }
      }).catch(() => {
        if (sectionVersion === version) loading.textContent = 'এই বিভাগের যাচাইকৃত তথ্য এখন লোড করা যাচ্ছে না।';
      });
      return;
    }
    if (key === 'intro') {
      if (htmlIntro) simpleParagraph(panel, htmlIntro);
      if (surahMeta) simpleParagraph(panel, 'সূরা ' + (bengaliMeta?.title || surahMeta.transliteration) + ' — কুরআনের ' + digits(n) + ' নম্বর সূরা; ' + digits(surahMeta.verseCount) + 'টি আয়াত; ' + (surahMeta.revelation === 'meccan' ? 'মাক্কি' : 'মাদানি') + '।');
      const loading = simpleParagraph(panel, 'সূরা-সংক্রান্ত উৎস-নোট লোড হচ্ছে…');
      getNotes().then(notes => {
        if (sectionVersion !== version) return;
        loading.remove();
        const first = notes.find(note => note.verse === 1 && /সূরা|নামকরণ|নাযিল|নাজিল/.test(note.text.slice(0,500)));
        if (first) {
          const virtueHeading = first.text.search(/<b[^>]*>[^<]*(?:ফযীলত|ফজিলত|ফজীলত)[^<]*<\/b>/i);
          noteText(panel, virtueHeading > 0 ? first.text.slice(0, virtueHeading) : first.text);

        }
        else simpleParagraph(panel, 'এই সূরার অতিরিক্ত পরিচিতিমূলক উৎস-নোট পাওয়া যায়নি।');
      }).catch(() => {
        if (sectionVersion === version) loading.textContent = 'সূরার পরিচিতিমূলক উৎস-নোট এখন লোড করা যাচ্ছে না।';
      });
      return;
    }
    if (key === 'explain') {
      const loading = simpleParagraph(panel, 'আয়াতের ব্যাখ্যা-নোট লোড হচ্ছে…');
      getNotes().then(notes => {
        if (sectionVersion !== version) return;
        loading.remove();
        if (notes.length === 0) {
          simpleParagraph(panel, 'এই সূরার জন্য যাচাইকৃত উৎস-নোট পাওয়া যায়নি।');
          return;
        }

        const verseByNumber = new Map([...verses.querySelectorAll('.ayah[data-verse]')].map(card => [Number(card.dataset.verse), card]));
        for (const note of notes) {
          const entry = document.createElement('article');
          entry.className = 'section-note quran-explanation';
          const heading = document.createElement('h3');
          heading.textContent = 'আয়াত ' + digits(note.verse);
          entry.append(heading);
          const verse = verseByNumber.get(note.verse);
          if (verse) {
            const arabic = verse.querySelector('.arabic');
            if (arabic) {
              const arabicCopy = document.createElement('div');
              arabicCopy.className = 'arabic explanation-verse';
              arabicCopy.lang = 'ar';
              arabicCopy.dir = 'rtl';
              arabicCopy.textContent = arabic.textContent;
              entry.append(arabicCopy);
            }
          }
          noteText(entry, note.text);
          panel.append(entry);
        }

      }).catch(() => {
        if (sectionVersion === version) loading.textContent = 'ব্যাখ্যা-নোট এখন লোড করা যাচ্ছে না।';
      });
    }
  }

  tabDefs.forEach(([key, label], index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quran-tab';
    button.id = 'quran-tab-' + key;
    button.dataset.section = key;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-selected', String(index === 0));
    button.textContent = label;
    button.addEventListener('click', () => showSection(key));
    nav.append(button);
  });
  nav.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    const buttons = [...nav.querySelectorAll('[role="tab"]')];
    const current = buttons.indexOf(document.activeElement);
    if (current < 0) return;
    event.preventDefault();
    const next = buttons[(current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length];
    next.focus();
    showSection(next.dataset.section);
  });

  const sidebar = document.createElement('aside');
  sidebar.className = 'quran-sidebar';
  sidebar.id = 'quran-surah-sidebar';
  const sidebarTitle = document.createElement('h2');
  sidebarTitle.id = 'quran-surah-sidebar-title';
  sidebarTitle.textContent = 'সব সূরা';
  sidebar.setAttribute('aria-labelledby', sidebarTitle.id);
  const sidebarClose = document.createElement('button');
  sidebarClose.type = 'button';
  sidebarClose.className = 'quran-sidebar-close';
  sidebarClose.setAttribute('aria-label', 'সূরার তালিকা বন্ধ করুন');
  sidebarClose.textContent = '✕';
  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'quran-sidebar-header';
  sidebarHeader.append(sidebarTitle, sidebarClose);
  const sidebarList = document.createElement('div');
  sidebarList.className = 'side-list';
  sidebarList.setAttribute('role', 'navigation');
  sidebarList.setAttribute('aria-label', '১১৪টি সূরা');
  sidebar.append(sidebarHeader, sidebarList);

  // Mobile-only drawer; the desktop sidebar and reader tabs stay unchanged.
  const sidebarToggle = document.createElement('button');
  sidebarToggle.type = 'button';
  sidebarToggle.className = 'quran-sidebar-toggle';
  sidebarToggle.textContent = '☰  সূরার তালিকা';
  sidebarToggle.setAttribute('aria-controls', sidebar.id);
  sidebarToggle.setAttribute('aria-expanded', 'false');
  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'quran-sidebar-backdrop';
  backdrop.setAttribute('aria-label', 'সূরার তালিকা বন্ধ করুন');
  backdrop.tabIndex = -1;
  const mobileQuery = window.matchMedia('(max-width: 899px)');
  const drawerIsOpen = () => document.body.classList.contains('quran-drawer-open');
  const setDrawerOpen = (open, restoreFocus = false) => {
    const expanded = mobileQuery.matches && Boolean(open);
    document.body.classList.toggle('quran-drawer-open', expanded);
    sidebarToggle.setAttribute('aria-expanded', String(expanded));
    if (mobileQuery.matches) {
      sidebar.inert = !expanded;
      sidebar.setAttribute('aria-hidden', String(!expanded));
    } else {
      sidebar.inert = false;
      sidebar.removeAttribute('aria-hidden');
    }
    if (expanded) sidebarClose.focus();
    else if (restoreFocus && mobileQuery.matches) sidebarToggle.focus();
  };
  sidebarToggle.addEventListener('click', () => setDrawerOpen(!drawerIsOpen(), true));
  sidebarClose.addEventListener('click', () => setDrawerOpen(false, true));
  backdrop.addEventListener('click', () => setDrawerOpen(false, true));
  sidebarList.addEventListener('click', event => {
    if (event.target.closest('a')) setDrawerOpen(false);
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !drawerIsOpen()) return;
    const focusables = [sidebarClose, ...sidebarList.querySelectorAll('a')];
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawerIsOpen()) setDrawerOpen(false, true);
  });
  mobileQuery.addEventListener('change', () => setDrawerOpen(false));
  context?.remove();
  head.before(sidebarToggle);
  head.after(sidebar, nav, panel);
  document.body.append(backdrop);
  setDrawerOpen(false);
  showSection('surah');

  Promise.all([fetchJSON('data/metadata.json'), fetchJSON('data/bengali-metadata.json')]).then(([all, allBangla]) => {
    if (!Array.isArray(all) || !Array.isArray(allBangla) || all.length !== 114 || allBangla.length !== 114) throw new Error('Incomplete surah metadata');
    const names = new Map(allBangla.map(info => [info.number, info]));
    surahMeta = all.find(info => info.number === n);
    bengaliMeta = names.get(n);
    if (surahMeta && bengaliMeta) {
      const title = document.getElementById('surah-title');
      if (title) title.textContent = 'সূরা ' + bengaliMeta.title;
      const bannerMeta = head.querySelector('.banner-meta');
      if (bannerMeta) bannerMeta.textContent = 'সূরা ' + digits(n) + ' · ' + (surahMeta.revelation === 'meccan' ? 'মাক্কি' : 'মাদানি') + ' · ' + digits(surahMeta.verseCount) + ' আয়াত';
      const arabic = head.querySelector('.hero-arabic');
      if (arabic) arabic.textContent = surahMeta.arabicName;
      const meaning = head.querySelector('.banner-meaning');
      if (meaning) meaning.textContent = bengaliMeta.meaning;
    }
    const fragment = document.createDocumentFragment();
    all.forEach(item => {
      const localized = names.get(item.number);
      const link = document.createElement('a');
      link.href = base + item.slug + '/';
      if (item.number === n) {
        link.className = 'current';
        link.setAttribute('aria-current', 'page');
      }
      const number = document.createElement('span');
      number.className = 'side-num';
      number.textContent = digits(item.number);
      const copy = document.createElement('span');
      copy.className = 'side-copy';
      const name = document.createElement('strong');
      name.textContent = localized?.title || item.transliteration;
      const arabic = document.createElement('small');
      arabic.lang = 'ar';
      arabic.dir = 'rtl';
      arabic.textContent = item.arabicName;
      const ayahCount = document.createElement('small');
      ayahCount.className = 'side-ayah-count';
      ayahCount.textContent = 'আয়াত: ' + digits(item.verseCount);
      copy.append(name, arabic, ayahCount);
      link.append(number, copy);
      fragment.append(link);
    });
    sidebarList.replaceChildren(fragment);
    const current = sidebarList.querySelector('.current');
    if (current && sidebarList.scrollHeight > sidebarList.clientHeight) {
      sidebarList.scrollTop = Math.max(0, current.offsetTop - sidebarList.offsetTop - 70);
    }
  }).catch(() => {
    sidebarList.textContent = 'সূরার তালিকা লোড করা যায়নি।';
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

/* Load Quran-only auto-scroll independently of the source-text renderer. */
(() => {
  if (document.getElementById("walid-quran-autoscroll-script")) return;
  const script = document.createElement("script");
  script.id = "walid-quran-autoscroll-script";
  script.src = "/islam/quran/auto-scroll.js?v=20261122";
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
