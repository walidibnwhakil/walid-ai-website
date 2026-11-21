import {buildStudyVisual} from "./study-visuals.mjs";
for(const article of document.querySelectorAll("article.note")){
  const title=article.querySelector("h2")?.textContent;
  if(!title)continue;
  const illustration=buildStudyVisual({title});
  if(illustration)article.querySelector(".example")?.after(illustration);
}
