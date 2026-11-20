(()=>{
"use strict";
const list=document.querySelector("#story-list");
const input=document.querySelector("#story-search");
const status=document.querySelector("#story-status");
let stories=[];
let surahs=[];
function ascii(value){return value.replace(/[০-৯]/g,function(ch){return String("০১২৩৪৫৬৭৮৯".indexOf(ch));});}
function renderRefs(refs){
  const output=document.createDocumentFragment();
  for(const part of refs.split(";")){
    const match=part.match(/(?:^|[^0-9০-৯])([0-9০-৯]+):\s*([0-9০-৯–-]+(?:,\s*[0-9০-৯–-]+)*)/);
    if(!match){output.append(document.createTextNode(part+"; "));continue;}
    const chapter=surahs[Number(ascii(match[1]))-1];
    if(!chapter){output.append(document.createTextNode(part+"; "));continue;}
    for(const item of match[2].split(",")){
      const value=item.trim();
      const verse=Number(ascii(value.split(/[–-]/)[0]));
      if(!verse)continue;
      const link=document.createElement("a");
      link.href="/islam/quran/"+chapter.slug+"/#ayah-"+verse;
      link.textContent=chapter.transliteration+" "+value;
      output.append(link,document.createTextNode(" · "));
    }
  }
  return output;
}
function paragraph(text, className){
  const node=document.createElement("p");
  node.textContent=text;
  if(className)node.className=className;
  return node;
}
function render(){
  const term=input.value.trim().toLocaleLowerCase();
  const found=stories.filter(function(s){
    const words=[s.title,s.refs].concat(s.paragraphs,s.lessons||"",...(s.additional||[]).map(function(a){return a.text+" "+a.source;}));
    return words.join(" ").toLocaleLowerCase().includes(term);
  });
  const fragment=document.createDocumentFragment();
  if(!found.length){
    fragment.append(paragraph("এই নামে কোনো কাহিনি পাওয়া যায়নি।","empty-state"));
  }
  for(const story of found){
    const article=document.createElement("article");
    article.className="story-card";
    article.id=story.id;
    const heading=document.createElement("h2");
    heading.textContent=story.title;
    article.append(heading);
    for(const p of story.paragraphs)article.append(paragraph(p));
    if(Array.isArray(story.additional)&&story.additional.length){
      const section=document.createElement("section");
      section.className="story-additional";
      const title=document.createElement("h3");
      title.textContent="অন্যান্য হাদিস এবং কিতাব থেকে পাওয়া পূর্ণ কাহিনি";
      section.append(title);
      for(const entry of story.additional){
        section.append(paragraph(entry.text));
      }
      const labels=new Map();
      for(const entry of story.additional){
        if(entry.source&&/^https:\/\/sunnah\.com\/[a-z0-9:/-]+$/i.test(entry.url||""))labels.set(entry.source,entry.url);
      }
      if(labels.size){
        const sources=document.createElement("p");
        sources.className="story-hadith-sources";
        const lead=document.createElement("strong");
        lead.textContent="হাদিসের উৎস: ";
        sources.append(lead);
        for(const [name,url] of labels){
          const a=document.createElement("a");
          a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=name;
          sources.append(a,document.createTextNode(" · "));
        }
        section.append(sources);
      }
      article.append(section);
    }
    if(story.lessons){
      const note=paragraph(story.lessons,"story-note");
      const lead=document.createElement("strong");
      lead.textContent="শিক্ষা ও তাৎপর্য: ";
      note.prepend(lead);
      article.append(note);
    }
    const references=document.createElement("p");
    references.className="story-refs";
    const label=document.createElement("strong");
    label.textContent="কুরআনের সূত্র: ";
    references.append(label,renderRefs(story.refs));
    article.append(references);
    fragment.append(article);
  }
  list.replaceChildren(fragment);
  status.textContent=term?found.length+"টি মিল পাওয়া গেছে":stories.length+"টি বিষয় ও ঘটনা";
}
input.addEventListener("input",render);
Promise.all([
  fetch("/islam/stories/stories.json?v=20261120-expanded").then(function(response){if(!response.ok)throw Error("stories unavailable");return response.json();}),
  fetch("/islam/quran/data/metadata.json").then(function(response){if(!response.ok)throw Error("surah list unavailable");return response.json();})
]).then(function(values){
  const data=values[0], chapters=values[1];
  if(!Array.isArray(data)||data.length<60||!Array.isArray(chapters)||chapters.length!==114)throw Error("source coverage incomplete");
  stories=data;surahs=chapters;render();
}).catch(function(){
  status.textContent="কাহিনির তালিকা লোড করা যায়নি। পরে আবার চেষ্টা করুন।";
});
})();
