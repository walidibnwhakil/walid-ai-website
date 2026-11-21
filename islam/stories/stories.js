(()=>{
"use strict";
const list=document.querySelector("#story-list");
const input=document.querySelector("#story-search");
const status=document.querySelector("#story-status");
let stories=[];
let loaded=false;
function ascii(value){return value.replace(/[০-৯]/g,function(ch){return String("০১২৩৪৫৬৭৮৯".indexOf(ch));});}
function bracketRefs(refs){
  if(typeof refs!=="string")return "";
  // Keep the exact cited Quran passages, without hyperlink-style source rows.
  return refs.split(";").map(function(ref){return ref.trim();})
    .filter(Boolean).map(function(ref){
      return "["+ref.replace(/[0-9]/g,function(d){return "০১২৩৪৫৬৭৮৯"[Number(d)];})+"]";
    }).join(" ");
}

function paragraph(text, className){
  const node=document.createElement("p");
  node.textContent=text;
  if(className)node.className=className;
  return node;
}
function render(){
  const term=input.value.trim().toLocaleLowerCase();
  if(!loaded){
    const cards=[...list.querySelectorAll(".story-card")];
    let count=0;
    cards.forEach(card=>{const matched=card.textContent.toLocaleLowerCase().includes(term);card.hidden=!matched;if(matched)count++;});
    status.textContent=term?(count?count+"টি মিল পাওয়া গেছে":"এই নামে কোনো কাহিনি পাওয়া যায়নি।"):cards.length+"টি বিষয় ও ঘটনা";
    return;
  }
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
    story.paragraphs.forEach(function(p,index){
      const last=index===story.paragraphs.length-1;
      const refs=last?bracketRefs(story.refs):"";
      article.append(paragraph(p+(refs?" "+refs:"")));
    });
    if(Array.isArray(story.additional)&&story.additional.length){
      const section=document.createElement("section");
      section.className="story-additional";
      const title=document.createElement("h3");
      title.textContent="অন্যান্য হাদিস এবং কিতাব থেকে পাওয়া পূর্ণ কাহিনি";
      section.append(title);
      for(const entry of story.additional){
        const source=typeof entry.source==="string"?
          entry.source.replace(/[0-9]/g,function(d){return "০১২৩৪৫৬৭৮৯"[Number(d)];}).trim():"";
        section.append(paragraph(entry.text+(source?" ["+source+"]":"")));
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
    fragment.append(article);
  }
  list.replaceChildren(fragment);
  status.textContent=term?found.length+"টি মিল পাওয়া গেছে":stories.length+"টি বিষয় ও ঘটনা";
}
input.addEventListener("input",render);
fetch("/islam/stories/stories.json?v=20261120-expanded")
  .then(function(response){if(!response.ok)throw Error("stories unavailable");return response.json();})
  .then(function(data){
    if(!Array.isArray(data)||data.length!==61)throw Error("story coverage incomplete");
    stories=data;loaded=true;render();
  })
  .catch(function(){render();});
})();
