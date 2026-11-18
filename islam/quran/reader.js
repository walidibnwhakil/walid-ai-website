/* Quran Reader: shared navigation and section controls for all 114 surahs. */
(() => {
  'use strict';
  const n = Number(document.body.dataset.surah);
  const head = document.querySelector('.surah-head');
  const verses = document.getElementById('verses');
  const tools = document.querySelector('.reading-tools');
  const context = document.getElementById('surah-context');
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
  let sectionVersion = 0;
  let activeSection = 'surah';

  const status = document.getElementById('load-status');
  if (status) status.textContent = 'আরবি আয়াত লোড হচ্ছে…';
  const translation = document.getElementById('show-translation');
  if (translation) translation.checked = false;
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
  new MutationObserver(refreshPronunciation).observe(verses, {childList: true});

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
      if (key === 'revelation' && surahMeta) simpleParagraph(panel, 'নাজিলের স্থানভিত্তিক পরিচয়: ' + (surahMeta.revelation === 'meccan' ? 'মাক্কি' : 'মাদানি') + ' সূরা।');
      const loading = simpleParagraph(panel, 'এই বিষয়ের উৎস-নোট লোড হচ্ছে…');
      getNotes().then(notes => {
        if (sectionVersion !== version) return;
        loading.remove();
        const excerpt = sourceExcerpt(notes, key === 'virtue' ? /ফযীলত|ফজিলত|ফজীলত/ : /নাযিল|নাজিল|নুযুল|অবতীর্ণ/);
        if (excerpt) {
          noteText(panel, excerpt);


        } else {
          simpleParagraph(panel, key === 'virtue' ? 'এই সূরার নির্দিষ্ট ফযীলত সম্পর্কে পৃথক উৎস-নোট পাওয়া যায়নি।' : 'এই সূরার নাজিলের বিস্তারিত ইতিহাস সম্পর্কে পৃথক উৎস-নোট পাওয়া যায়নি।');
        }
      }).catch(() => {
        if (sectionVersion === version) loading.textContent = 'এই বিষয়ের উৎস-নোট এখন লোড করা যাচ্ছে না।';
      });
      return;
    }
    if (key === 'intro') {
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
  const sidebarTitle = document.createElement('h2');
  sidebarTitle.textContent = 'সব সূরা';
  const sidebarList = document.createElement('div');
  sidebarList.className = 'side-list';
  sidebarList.setAttribute('role', 'navigation');
  sidebarList.setAttribute('aria-label', '১১৪টি সূরা');
  sidebar.append(sidebarTitle, sidebarList);
  context?.remove();
  head.after(sidebar, nav, panel);
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
      copy.append(name, arabic);
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