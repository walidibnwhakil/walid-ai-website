import {buildStudyVisual} from "./study-visuals.mjs";
for(const article of document.querySelectorAll("article.note")){
  const title=article.querySelector("h2")?.textContent;
  if(!title)continue;
  const illustration=buildStudyVisual({title});
  if(illustration)article.querySelector(".example")?.after(illustration);
}

/* Anonymous aggregate page-view and active-time counters; never inspect reading content. */
(() => {
  if (document.querySelector('script[src^="/usage.js"]') || document.getElementById('walid-section-usage')) return;
  const script = document.createElement('script');
  script.id = 'walid-section-usage';
  script.src = '/usage.js?v=20261122-section-analytics';
  script.async = true;
  document.head.append(script);
})();
