(() => {
  "use strict";
  const opener = document.querySelector(".others-toc-trigger");
  const panel = document.querySelector(".others-toc-dialog");
  if (!opener || !panel) return;
  const closer = panel.querySelector(".others-toc-close");
  const openPanel = () => {
    if (typeof panel.showModal === "function") panel.showModal();
    else panel.setAttribute("open", "");
    document.body.classList.add("others-toc-open");
  };
  const closePanel = () => {
    if (typeof panel.close === "function") panel.close();
    else panel.removeAttribute("open");
    document.body.classList.remove("others-toc-open");
  };
  opener.addEventListener("click", openPanel);
  closer?.addEventListener("click", closePanel);
  panel.addEventListener("close", () => document.body.classList.remove("others-toc-open"));
  panel.querySelectorAll('a[href^="#chapter-"]').forEach((link) => {
    link.addEventListener("click", closePanel);
  });
  panel.addEventListener("click", (event) => {
    if (event.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right) closePanel();
  });
  const entries = Array.from(panel.querySelectorAll('a[href^="#chapter-"]'));
  if ("IntersectionObserver" in window && entries.length) {
    const lookup = new Map(entries.map((link) => [link.getAttribute("href").slice(1), link]));
    const observer = new IntersectionObserver((items) => {
      const visible = items.filter((item) => item.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (!visible.length) return;
      entries.forEach((link) => link.removeAttribute("aria-current"));
      lookup.get(visible[0].target.id)?.setAttribute("aria-current", "location");
    }, {rootMargin:"-8% 0px -70% 0px"});
    document.querySelectorAll(".others-chapter[id]").forEach((section) => observer.observe(section));
  }
})();

/* Lightweight device-only reading progress for every Others book.
   No API, account, cookies, or remote storage is used. */
(() => {
  "use strict";
  const reader = document.querySelector(".others-reader");
  if (!reader) return;
  const chapters = Array.from(reader.querySelectorAll(".others-chapter[id^='chapter-']"));
  if (!chapters.length) return;

  // A refresh is not a request to resume. A freshly opened direct chapter
  // link still works, while a refresh starts calmly at the book's beginning.
  const navigation = performance.getEntriesByType?.("navigation")?.[0];
  const isPageReload = navigation?.type === "reload";
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (isPageReload && location.hash) {
    history.replaceState(null, "", location.pathname + location.search);
  }

  const byId = new Map(chapters.map((node, index) => [node.id, {node, index, heading: node.querySelector("h2")}]));
  const bn = (number) => String(number).replace(/\d/g, (digit) => "০১২৩৪৫৬৭৮৯"[Number(digit)]);
  const cleanPath = location.pathname.replace(/index\.html$/, "").replace(/\/?$/, "/");
  const keyPrefix = "walid-ai:others-reader:v1:" + cleanPath + ":";
  const findSaved = (kind) => {
    try {
      const raw = localStorage.getItem(keyPrefix + kind);
      if (!raw) return null;
      const value = JSON.parse(raw);
      if (!value || !byId.has(value.chapterId)) return null;
      const paragraphIndex = Number(value.paragraphIndex);
      const fraction = Number(value.fraction);
      return {
        chapterId: value.chapterId,
        paragraphIndex: Number.isFinite(paragraphIndex) ? Math.max(0, Math.floor(paragraphIndex)) : 0,
        fraction: Number.isFinite(fraction) ? Math.max(0, Math.min(1, fraction)) : 0
      };
    } catch {
      return null;
    }
  };
  const store = (kind, position) => {
    try {
      localStorage.setItem(keyPrefix + kind, JSON.stringify({...position, savedAt: Date.now()}));
      return true;
    } catch {
      return false;
    }
  };
  const remove = (kind) => {
    try {
      localStorage.removeItem(keyPrefix + kind);
      return true;
    } catch {
      return false;
    }
  };

  const positionInView = () => {
    const readingLine = Math.max(110, Math.min(300, window.innerHeight * .35));
    let active = null;
    for (const chapter of chapters) {
      const rect = chapter.getBoundingClientRect();
      if (rect.top <= readingLine && rect.bottom >= readingLine) {
        active = chapter;
        break;
      }
    }
    if (!active) {
      const visible = groups[activeGroup];
      const first = visible[0], last = visible[visible.length - 1];
      if (!first) return null;
      return last.getBoundingClientRect().bottom < readingLine
        ? chapterEnd(last.id) : {chapterId: first.id, paragraphIndex: 0, fraction: 0};
    }
    const paragraphs = Array.from(active.querySelectorAll("p"));
    if (!paragraphs.length) return {chapterId: active.id, paragraphIndex: 0, fraction: 0};
    let index = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      if (paragraphs[i].getBoundingClientRect().top > readingLine) break;
      index = i;
    }
    const rect = paragraphs[index].getBoundingClientRect();
    return {
      chapterId: active.id,
      paragraphIndex: index,
      fraction: Math.max(0, Math.min(1, (readingLine - rect.top) / Math.max(rect.height, 1)))
    };
  };
  const chapterEnd = (chapterId) => {
    const info = byId.get(chapterId);
    const paragraphs = info ? info.node.querySelectorAll("p") : [];
    return {chapterId, paragraphIndex: Math.max(0, paragraphs.length - 1), fraction: .95};
  };
  const goTo = (position) => {
    if (!position) return;
    const chapter = byId.get(position.chapterId);
    if (!chapter) return;
    activateChapter(position.chapterId, {scroll: false, save: false});
    const paragraphs = chapter.node.querySelectorAll("p");
    const target = paragraphs.length ?
      paragraphs[Math.min(position.paragraphIndex, paragraphs.length - 1)] : chapter.node;
    const offset = target === chapter.node ? 0 : target.getBoundingClientRect().height * position.fraction;
    const top = window.scrollY + target.getBoundingClientRect().top + offset -
      Math.max(60, Math.min(130, window.innerHeight * .16));
    history.replaceState(null, "", "#" + chapter.node.id);
    window.scrollTo({top: Math.max(0, top), behavior: "instant"});
  };

  let progress = findSaved("progress");
  let bookmark = findSaved("bookmark");
  let toastTimer;
  const notify = (message, isError = false) => {
    let toast = document.querySelector(".others-reader-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "others-reader-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle("others-reader-toast-error", isError);
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2400);
  };

  // Preserve the original chapter headings and links; add only compact controls.
  chapters.forEach((chapter, index) => {
    if (chapter.nextElementSibling?.classList.contains("others-chapter-navigation")) return;
    const counter = document.createElement("span");
    counter.className = "others-chapter-counter";
    counter.textContent = "অধ্যায় " + bn(index + 1) + " / " + bn(chapters.length);
    chapter.insertBefore(counter, chapter.querySelector("h2"));
    chapter.classList.add("others-chapter-with-navigation");

    const navigation = document.createElement("nav");
    navigation.className = "others-chapter-navigation";
    navigation.setAttribute("aria-label", "অধ্যায় " + bn(index + 1) + " পরিবর্তন");
    const chapterLink = (target, previous) => {
      if (!target) {
        const space = document.createElement("span");
        space.className = "others-chapter-nav-empty";
        space.setAttribute("aria-hidden", "true");
        return space;
      }
      const link = document.createElement("a");
      link.className = "others-chapter-nav-link " + (previous ? "others-nav-previous" : "others-nav-next");
      link.href = "#" + target.id;
      const label = document.createElement("strong");
      label.textContent = previous ? "← আগের অধ্যায়" : "পরের অধ্যায় →";
      const title = document.createElement("small");
      title.textContent = target.querySelector("h2")?.textContent.trim() || "";
      link.append(label, title);
      return link;
    };
    const mark = document.createElement("button");
    mark.type = "button";
    mark.className = "others-chapter-bookmark";
    mark.textContent = "বুকমার্ক রাখুন";
    mark.setAttribute("aria-pressed", "false");
    mark.setAttribute("aria-label", "অধ্যায় " + bn(index + 1) + "-এ বুকমার্ক রাখুন");
    mark.addEventListener("click", () => {
      if (bookmark && groupByChapter.get(bookmark.chapterId) === groupByChapter.get(chapter.id)) return clearBookmark();
      const visible = positionInView();
      saveBookmark(visible?.chapterId === chapter.id ? visible : chapterEnd(chapter.id));
    });
    navigation.append(chapterLink(chapters[index - 1], true), mark, chapterLink(chapters[index + 1], false));
    chapter.insertAdjacentElement("afterend", navigation);
  });


  // A reading part contains whole, consecutive chapters totalling at least
  // ~1100 Bengali words, about five minutes or more for most readers.
  // No editorial text, chapter anchor or original paragraph is modified.
  const wordsIn = (chapter) => (Array.from(chapter.querySelectorAll("p"))
    .map(node => node.textContent).join(" ").trim().match(/\S+/gu) || []).length;
  const minimumWords = 1100;
  const groups = [];
  let queue = [], wordTotal = 0;
  chapters.forEach((chapter) => {
    queue.push(chapter);
    wordTotal += wordsIn(chapter);
    if (wordTotal >= minimumWords) {
      groups.push(queue);
      queue = [];
      wordTotal = 0;
    }
  });
  if (queue.length) {
    if (groups.length) groups[groups.length - 1].push(...queue);
    else groups.push(queue);
  }
  const groupByChapter = new Map(groups.flatMap((group, index) =>
    group.map(chapter => [chapter.id, index])));
  const lastInGroup = new Set(groups.map(group => group[group.length - 1].id));

  const readingLink = (chapter, next) => {
    if (!chapter) {
      const placeholder = document.createElement("span");
      placeholder.className = "others-chapter-nav-empty";
      placeholder.setAttribute("aria-hidden", "true");
      return placeholder;
    }
    const link = document.createElement("a");
    link.href = "#" + chapter.id;
    link.className = "others-chapter-nav-link " + (next ? "others-nav-next" : "others-nav-previous");
    const title = document.createElement("strong");
    title.textContent = next ? "পরের পাঠপর্ব →" : "← আগের পাঠপর্ব";
    const description = document.createElement("small");
    description.textContent = chapter.querySelector("h2")?.textContent.trim() || "";
    link.append(title, description);
    return link;
  };
  groups.forEach((group, index) => {
    const last = group[group.length - 1];
    const nav = last.nextElementSibling;
    const bookmarkAction = nav?.querySelector(".others-chapter-bookmark");
    if (!bookmarkAction) return;
    const prevStart = index ? groups[index - 1][0] : null;
    const nextStart = groups[index + 1]?.[0] || null;
    nav.setAttribute("aria-label", "পাঠপর্ব " + bn(index + 1) + " / " + bn(groups.length));
    nav.replaceChildren(
      readingLink(prevStart, false),
      bookmarkAction,
      readingLink(nextStart, true)
    );
  });

  let activeGroup = 0;
  let activeChapterId = chapters[0].id;
  const updateDrawerSelection = () => {
    document.querySelectorAll('.others-toc a[href^="#chapter-"]').forEach((link) => {
      if (link.getAttribute("href") === "#" + activeChapterId)
        link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  };
  const activateChapter = (chapterId, options = {}) => {
    const found = byId.get(chapterId);
    if (!found) return;
    const {scroll = true, save = true, push = false} = options;
    activeGroup = groupByChapter.get(chapterId);
    activeChapterId = chapterId;
    const group = groups[activeGroup];
    chapters.forEach((chapter) => {
      const hidden = groupByChapter.get(chapter.id) !== activeGroup;
      chapter.hidden = hidden;
      chapter.setAttribute("aria-hidden", String(hidden));
      chapter.classList.toggle("others-group-continuation", !hidden && chapter !== group[0]);
      if ("inert" in chapter) chapter.inert = hidden;
      const nav = chapter.nextElementSibling;
      if (nav?.classList.contains("others-chapter-navigation")) {
        const navHidden = hidden || !lastInGroup.has(chapter.id);
        nav.hidden = navHidden;
        if ("inert" in nav) nav.inert = navHidden;
      }
    });
    updateDrawerSelection();
    const hash = "#" + chapterId;
    if (push) history.pushState(null, "", hash);
    else if (scroll && location.hash !== hash) history.replaceState(null, "", hash);
    if (save) {
      const position = {chapterId, paragraphIndex: 0, fraction: 0};
      if (store("progress", position)) {
        progress = position;
        drawPanel();
      }
    }
    if (scroll) {
      const y = window.scrollY + found.node.getBoundingClientRect().top - 22;
      window.scrollTo({top: Math.max(0, y), behavior: "instant"});
    }
  };
  reader.classList.add("others-single-chapter-reader");
  reader.setAttribute("data-reading-parts", String(groups.length));
  reader.querySelectorAll(".others-chapter-navigation a[href^='#chapter-']").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateChapter(link.getAttribute("href").slice(1), {push: true});
    });
  });
  document.querySelectorAll('.others-toc a[href^="#chapter-"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      activateChapter(link.getAttribute("href").slice(1), {push: true});
    });
  });
  const restoreLinkedChapter = () => {
    const target = decodeURIComponent(location.hash.slice(1));
    if (byId.has(target)) activateChapter(target, {scroll: true, save: false});
  };
  window.addEventListener("popstate", restoreLinkedChapter);
  window.addEventListener("hashchange", restoreLinkedChapter);
  const initialChapter = decodeURIComponent(location.hash.slice(1));
  activateChapter(byId.has(initialChapter) ? initialChapter : chapters[0].id, {scroll: false, save: false});
  if (byId.has(initialChapter)) requestAnimationFrame(() => {
    const target = byId.get(initialChapter)?.node;
    if (target) window.scrollTo({top: Math.max(0, window.scrollY + target.getBoundingClientRect().top - 22), behavior: "instant"});
  });
  if (isPageReload) {
    const resetScroll = () => window.scrollTo({top: 0, behavior: "instant"});
    resetScroll();
    window.addEventListener("pageshow", () => requestAnimationFrame(resetScroll), {once: true});
  }

  // Fiction chapters remain uninterrupted prose. Keep source text as plain text
  // rather than clickable distractions; retain all real navigation and citations.
  if (/^\/others\/(?:folklore|islamic-literature)\//.test(cleanPath)) {
    reader.querySelectorAll(".others-book-title p a, .others-chapter p a").forEach((link) => {
      link.replaceWith(document.createTextNode(link.textContent));
    });
  }

  const updateBookmarkButtons = () => {
    reader.querySelectorAll(".others-chapter-bookmark").forEach((button) => {
      const chapterId = button.closest(".others-chapter-navigation")?.previousElementSibling?.id;
      const selected = Boolean(bookmark && groupByChapter.get(bookmark.chapterId) === groupByChapter.get(chapterId));
      button.setAttribute("aria-pressed", String(selected));
      button.classList.toggle("is-bookmarked", selected);
      button.textContent = selected ? "বুকমার্ক রাখা আছে" : "বুকমার্ক রাখুন";
    });
  };
  updateBookmarkButtons();

  // Exists immediately so a bookmark saved on mobile can be removed without reload.
  const panel = document.createElement("aside");
  panel.className = "others-reading-progress";
  panel.setAttribute("aria-label", "এই ডিভাইসে সংরক্ষিত পড়ার জায়গা");
  panel.hidden = true;
  reader.querySelector(".others-book-title")?.insertAdjacentElement("afterend", panel);
  const createResume = (position, label) => {
    const link = document.createElement("a");
    link.className = "others-reading-resume-link";
    link.href = "#" + position.chapterId;
    const chapter = byId.get(position.chapterId);
    const title = chapter.heading?.textContent.trim() || "";
    link.textContent = label + " · অধ্যায় " + bn(chapter.index + 1) + " — " + title;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      goTo(position);
    });
    return link;
  };
  const drawPanel = () => {
    if (!panel) return;
    panel.replaceChildren();
    if (progress) panel.appendChild(createResume(progress, "আগের জায়গা থেকে পড়ুন"));
    if (bookmark) {
      const line = document.createElement("div");
      line.className = "others-reading-bookmark-row";
      line.appendChild(createResume(bookmark, "বুকমার্ক থেকে পড়ুন"));
      const del = document.createElement("button");
      del.type = "button";
      del.className = "others-remove-bookmark";
      del.textContent = "মুছুন";
      del.setAttribute("aria-label", "এই বইয়ের বুকমার্ক মুছুন");
      del.addEventListener("click", clearBookmark);
      line.appendChild(del);
      panel.appendChild(line);
    }
    panel.hidden = !progress && !bookmark;
  };

  const drawer = document.querySelector(".others-toc-dialog .others-toc");
  let drawerGo;
  let drawerRemove;
  const drawDrawer = () => {
    if (drawerGo) drawerGo.hidden = !bookmark;
    if (drawerRemove) drawerRemove.hidden = !bookmark;
  };
  function clearBookmark() {
    if (remove("bookmark")) {
      bookmark = null;
      updateBookmarkButtons();
      drawDrawer();
      drawPanel();
      notify("এই বইয়ের বুকমার্ক মুছে দেওয়া হয়েছে");
    } else {
      notify("এই ব্রাউজারে বুকমার্ক পরিবর্তন করা যাচ্ছে না", true);
    }
  }
  function saveBookmark(position) {
    const chosen = position || positionInView() || progress ||
      {chapterId: chapters[0].id, paragraphIndex: 0, fraction: 0};
    if (store("bookmark", chosen)) {
      bookmark = chosen;
      updateBookmarkButtons();
      drawDrawer();
      drawPanel();
      notify("বুকমার্ক এই ডিভাইসে সংরক্ষিত হয়েছে");
    } else {
      notify("ব্রাউজারে সংরক্ষণের অনুমতি নেই; বুকমার্ক রাখা যায়নি", true);
    }
  }

  if (drawer) {
    const actions = document.createElement("div");
    actions.className = "others-toc-bookmark-actions";
    const save = document.createElement("button");
    save.type = "button";
    save.className = "others-toc-bookmark-save";
    save.textContent = "বর্তমান জায়গায় বুকমার্ক রাখুন";
    save.addEventListener("click", () => {
      saveBookmark(positionInView());
      document.querySelector(".others-toc-close")?.click();
    });
    drawerGo = document.createElement("button");
    drawerGo.type = "button";
    drawerGo.className = "others-toc-bookmark-go";
    drawerGo.textContent = "বুকমার্কে যান";
    drawerGo.addEventListener("click", () => {
      document.querySelector(".others-toc-close")?.click();
      goTo(bookmark);
    });
    drawerRemove = document.createElement("button");
    drawerRemove.type = "button";
    drawerRemove.className = "others-toc-bookmark-remove";
    drawerRemove.textContent = "মুছুন";
    drawerRemove.setAttribute("aria-label", "বুকমার্ক মুছে দিন");
    drawerRemove.addEventListener("click", clearBookmark);
    actions.append(save, drawerGo, drawerRemove);
    drawer.querySelector("h2")?.insertAdjacentElement("afterend", actions);
    drawDrawer();
  }

  drawPanel();

  // Save progress only when the reader scrolls intentionally. Browser
  // restoration and auto-scroll to toolbar buttons are not reading progress.
  let lastReadingGestureAt = 0;
  const markReadingGesture = () => { lastReadingGestureAt = Date.now(); };
  window.addEventListener("wheel", markReadingGesture, {passive: true});
  window.addEventListener("touchmove", markReadingGesture, {passive: true});
  window.addEventListener("keydown", (event) => {
    if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].includes(event.key))
      markReadingGesture();
  });
  // Capture scroll position when scrolling occurs, not while unloading:
  // on refresh the browser can move the viewport during pagehide.
  let scrollTimer = null;
  let pendingPosition = null;
  let recordedChapter = progress?.chapterId || null;
  const rememberPosition = () => {
    const current = pendingPosition;
    pendingPosition = null;
    if (!current || !store("progress", current)) return;
    progress = current;
    if (recordedChapter !== current.chapterId) drawPanel();
    recordedChapter = current.chapterId;
  };
  window.addEventListener("scroll", () => {
    if (Date.now() - lastReadingGestureAt > 700) return;
    pendingPosition = positionInView();
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(rememberPosition, 850);
  }, {passive: true});
  document.addEventListener("pointerdown", (event) => {
    if (!event.target.closest?.(".others-toc-trigger, .others-toc-dialog, .others-reading-progress, .others-chapter-navigation")) return;
    // Preserve the last genuinely read paragraph before a toolbar interaction
    // causes automatic scrolling to a button.
    lastReadingGestureAt = 0;
    if (pendingPosition) {
      clearTimeout(scrollTimer);
      rememberPosition();
    }
  }, {capture: true});
  window.addEventListener("pagehide", () => {
    if (pendingPosition) {
      clearTimeout(scrollTimer);
      rememberPosition();
    }
  });
})();
