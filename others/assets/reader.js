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
