// Responsive independent room/character layers; canvas is only for expressions, smoke and reveal.

import { createExpressions } from "./expressions.js?v=akinator-27";

const BASE = {
  landscape: "./images/approved/game-desk.webp",
  portrait: "./images/approved/portrait-neutral.webp",
};
// Feathered face crops, one orientation only. Loaded after the first paint.
const OVERLAYS = {
  landscape: {
    happy: "./images/approved/face-landscape-happy.webp",
    sad: "./images/approved/face-landscape-sad.webp",
    worried: "./images/approved/face-landscape-worried.webp",
    serious: "./images/approved/face-landscape-serious.webp",
    confused: "./images/approved/face-landscape-confused.webp",
    cat: "./images/approved/cat-landscape-blink.webp",
    tail: "./images/approved/cat-landscape-tail.webp",
  },
  portrait: {
    happy: "./images/approved/face-portrait-happy.webp",
    sad: "./images/approved/face-portrait-sad.webp",
    worried: "./images/approved/face-portrait-worried.webp",
    serious: "./images/approved/face-portrait-serious.webp",
    confused: "./images/approved/face-portrait-confused.webp",
    cat: "./images/approved/cat-portrait-blink.webp",
    tail: "./images/approved/cat-portrait-tail.webp",
  },
};
const FACE = {
  landscape: { u: 0.36902, v: 0.0255, w: 0.32177, h: 0.37938 },
  portrait: { u: 0.23889, v: 0.13047, w: 0.52222, h: 0.25938 },
};

function loadImage(src, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const picture = new Image();
    let settled = false;
    let timer;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      picture.onload = null;
      picture.onerror = null;
      resolve(value);
    };
    picture.onload = () => finish(picture);
    picture.onerror = () => finish(null);
    timer = setTimeout(() => {
      picture.src = "";
      finish(null);
    }, timeoutMs);
    picture.src = src;
  });
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function blinkCover(remaining) {
  const elapsed = 0.28 - remaining;
  if (elapsed < 0.04) return Math.max(0, elapsed / 0.04);
  if (elapsed < 0.24) return 1;
  return Math.max(0, 1 - (elapsed - 0.24) / 0.04);
}

function flickCover(remaining) {
  const elapsed = 0.7 - remaining;
  const u = Math.min(1, Math.max(0, elapsed / 0.7));
  return Math.sin(Math.PI * u);
}

// Contain the complete source photo (portrait, square or landscape), never crop
// a person's head or image edges. This pure helper is also used by unit tests.
export function fitPhotoInside(photoWidth, photoHeight, boxX, boxY, boxWidth, boxHeight) {
  if (!(photoWidth > 0 && photoHeight > 0 && boxWidth > 0 && boxHeight > 0)) {
    return { x: boxX, y: boxY, w: 0, h: 0 };
  }
  const scale = Math.min(boxWidth / photoWidth, boxHeight / photoHeight);
  const w = photoWidth * scale;
  const h = photoHeight * scale;
  return {
    x: boxX + (boxWidth - w) / 2,
    y: boxY + (boxHeight - h) / 2,
    w, h,
  };
}

export function createScene(canvas) {
  const ctx = canvas.getContext("2d", { alpha: true });
  const images = {};
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const portraitViewport = matchMedia("(max-aspect-ratio: 4/5)");
  const puff = document.createElement("canvas");
  puff.width = puff.height = 32;
  const puffCtx = puff.getContext("2d");
  const puffGrad = puffCtx.createRadialGradient(16, 16, 2, 16, 16, 16);
  puffGrad.addColorStop(0, "rgba(255,255,255,0.45)");
  puffGrad.addColorStop(1, "rgba(255,255,255,0)");
  puffCtx.fillStyle = puffGrad;
  puffCtx.fillRect(0, 0, 32, 32);

  let portraitMode = false;
  const smoke = Array.from({ length: 5 }, () => makePuff(true));
  const catLife = { blink: 0, nextBlink: rand(0.6, 1.4), flick: 0, nextFlick: rand(1.2, 2.2) };
  const faces = createExpressions();
  let faceNow = faces.picture();
  let mood = "curious";
  let clock = 0;
  let running = false;
  let raf = 0;
  let reveal = null;
  let view = { x: 0, y: 0, w: 1, h: 1 };
  let layoutDirty = true;
  let cssSize = { width: 0, height: 0 };
  let frameTime = 0;
  let deskEdge = 0;
  let actorBox = { x:0,y:0,w:1,h:1 };
  let catBox = { x:0,y:0,w:1,h:1 };
  let overlayPromise, portraitOverlayPromise, desktopPlates = {}, portraitPlates = {};
  let portraitBox = {x:0,y:0,w:1,h:1};
  const room = canvas.parentElement;
  const actor = room.querySelector(".room-detective");
  const cat = room.querySelector(".room-cat");
  const ink = document.createElement("canvas");
  const mask = document.createElement("canvas");


  // Bake small feathered, local deformation poses once from the approved
  // portrait. Every frame then costs only a few canvas drawImage calls.
  // Coordinates are in the 700 x 487 approved character artwork.
  let portraitPoses = null, portraitPoseSource = null;
  let desktopPoses=null, desktopArtPromise=null;
  let desktopActive="",desktopAlpha=0,desktopBlinkAt=3.8,desktopBlinkEnd=0;
  let motionStats = {frames:0,smoke:0,face:0,idle:0,cat:0,activePose:""};
  const poseBounds={x:112,y:0,w:331,h:344};
  const catPoseBounds={x:414,y:324,w:286,h:151};
  function bakePose(source, bounds, controls){
    const {x,y,w,h}=bounds;
    const input=document.createElement("canvas");input.width=w;input.height=h;
    const g=input.getContext("2d",{willReadFrequently:true});
    g.drawImage(source,x,y,w,h,0,0,w,h);
    const src=g.getImageData(0,0,w,h).data;
    const output=document.createElement("canvas");output.width=w;output.height=h;
    const out=output.getContext("2d"),pixels=out.createImageData(w,h),dst=pixels.data;
    for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
      let dx=0,dy=0,coverage=0;
      for(const [cx,cy,rx,ry,mx,my] of controls){
        const u=(xx+x-cx)/rx,v=(yy+y-cy)/ry,d=u*u+v*v;
        if(d<1){const k=(1-d)*(1-d);dx+=mx*k;dy+=my*k;coverage=Math.max(coverage,Math.min(1,(1-d)*3.5));}
      }
      const sx=Math.max(0,Math.min(w-1.001,xx-dx)),sy=Math.max(0,Math.min(h-1.001,yy-dy));
      const ix=Math.floor(sx),iy=Math.floor(sy),fx=sx-ix,fy=sy-iy;
      const p=(yy*w+xx)*4,a=(iy*w+ix)*4,b=a+4,c=a+w*4,d=c+4;
      for(let j=0;j<3;j++)dst[p+j]=(src[a+j]*(1-fx)+src[b+j]*fx)*(1-fy)+(src[c+j]*(1-fx)+src[d+j]*fx)*fy;
      // The crop is transparent near its edges; the unchanged room stays put.
      const sourceAlpha=(src[a+3]*(1-fx)+src[b+3]*fx)*(1-fy)+(src[c+3]*(1-fx)+src[d+3]*fx)*fy;
      dst[p+3]=Math.round(sourceAlpha*coverage*Math.min(1,xx/12,yy/9,(w-1-xx)/12,(h-1-yy)/12));
    }
    out.putImageData(pixels,0,0);
    return output;
  }
  async function preparePortraitPoses(){
    const source=room.querySelector(".approved-actors");
    if(!source?.naturalWidth||portraitPoseSource===source)return;
    portraitPoseSource=source;
    const build=[
      ["idle",poseBounds,[[274,80,148,104,1.7,-2.1],[267,181,127,106,1.4,-1.4],[252,281,145,66,0,-2.2]]],
      ["happy",poseBounds,[[235,192,42,32,-5,-8],[316,205,39,38,5,-9],[276,209,55,32,0,3],[250,146,29,18,0,3],[316,159,29,18,0,3]]],
      ["sad",poseBounds,[[234,193,40,40,2,8],[316,206,42,40,-2,8],[253,125,36,26,2,-7],[307,139,35,25,-4,-5],[276,210,44,25,0,-3]]],
      ["worried",poseBounds,[[247,125,40,26,3,-9],[314,140,39,28,-4,-7],[250,148,30,17,0,-3],[316,162,30,17,0,-3],[236,194,34,27,0,4],[313,206,36,28,0,5]]],
      ["serious",poseBounds,[[250,125,42,24,5,6],[315,141,39,24,-4,6],[249,147,28,17,0,3],[317,160,27,17,0,3]]],
      ["confused",poseBounds,[[249,124,37,30,0,-9],[317,141,34,25,-2,5],[250,146,31,18,0,-3],[315,161,30,18,0,2],[274,207,43,31,3,3]]],
      ["surprised",poseBounds,[[248,122,40,30,0,-11],[315,139,40,28,0,-11],[250,143,29,17,0,-5],[316,155,29,19,0,-5],[275,210,38,27,0,6]]],
      ["ear",catPoseBounds,[[467,359,28,30,3,-3],[542,375,30,32,-4,2]]],
      ["catIdle",catPoseBounds,[[594,401,90,52,0,-2.6],[643,408,50,37,1,-1.6]]]
    ];
    const poses={};
    // Yield between each small bake so category/answer taps never wait on it.
    for(const [key,bounds,controls] of build){
      await new Promise(resolve=>setTimeout(resolve,0));
      poses[key]={image:bakePose(source,bounds,controls),bounds};
    }
    portraitPoses=poses;
  }
  // New desktop overlays are sampled from the exact approved artwork, in
  // its own 1440×747 coordinate system. No old face or room pixels are used.
  async function prepareDesktopPoses(source){
    // Measured landmarks on the deployed 1440×747 artwork: left eye
    // (704,240), right eye (758,258), mouth under the moustache, pipe
    // anchored at (740,310). Restrict movement to separate facial features.
    // Never move the nose, jaw, glasses bridge, hat, or pipe.
    const face={x:640,y:207,w:155,h:125}, kitty={x:960,y:388,w:295,h:115};
    const build=[
      ["happy",face,[[690,290,23,17,0,-5],[700,302,20,13,0,-3],[730,302,13,11,0,-3],[704,248,19,8,0,-2],[758,265,18,8,0,-2]]],
      ["serious",face,[[710,225,21,10,0,4],[752,242,20,10,0,3],[704,237,19,8,0,2],[759,255,19,8,0,2],[690,293,19,12,0,2]]],
      ["sad",face,[[691,295,18,13,0,4],[729,303,11,10,0,2],[716,223,18,10,0,-4],[746,239,18,10,0,-4],[704,237,19,8,0,2],[759,255,19,8,0,2]]],
      ["worried",face,[[714,224,18,11,0,-5],[748,241,18,11,0,-4],[704,234,18,8,0,-2],[759,252,18,8,0,-2],[691,296,18,12,0,3]]],
      ["confused",face,[[697,221,22,12,0,-6],[753,242,18,10,0,3],[704,235,19,8,0,-2],[759,255,18,8,0,2],[691,296,18,12,0,2]]],
      ["surprised",face,[[700,223,24,12,0,-7],[758,240,23,12,0,-7],[704,234,19,8,0,-2],[759,253,19,8,0,-2],[704,247,19,8,0,1.5],[759,266,19,8,0,1.5],[710,307,17,10,0,2]]],
      ["blink",face,[[704,238,18,8,0,5],[758,257,18,8,0,5],[704,246,18,8,0,-4],[758,265,18,8,0,-4]]],
      ["cat",kitty,[[1004,452,12,9,0,4],[1044,457,12,9,0,4]]],
      ["tail",kitty,[[1213,474,31,22,2,-3],[1241,478,20,17,-2,-3]]]
    ];
    const result={};
    for(const [key,bounds,controls] of build){
      await new Promise(resolve=>setTimeout(resolve,0));
      result[key]={image:bakePose(source,bounds,controls),bounds};
    }
    desktopPoses=result;
    desktopPlates=Object.fromEntries(Object.entries(result).filter(([key])=>!["blink","surprised"].includes(key)));
    if(!portraitViewport.matches)images.overlays=desktopPlates;
  }
  function paintDesktopPose(key,alpha){
    const pose=desktopPoses?.[key];if(!pose||alpha<.025)return false;
    const {x,y,w,h}=pose.bounds;
    ctx.globalAlpha=Math.min(1,alpha);
    ctx.drawImage(pose.image,x/1440*canvas.width,y/747*canvas.height,w/1440*canvas.width,h/747*canvas.height);
    ctx.globalAlpha=1;return true;
  }
  function paintPose(key,alpha){
    const pose=portraitPoses?.[key];
    if(!pose||alpha<.025)return false;
    const {x,y,w,h}=pose.bounds;
    ctx.globalAlpha=Math.min(1,alpha);
    ctx.drawImage(pose.image,portraitBox.x+x/700*portraitBox.w,portraitBox.y+y/487*portraitBox.h,w/700*portraitBox.w,h/487*portraitBox.h);
    ctx.globalAlpha=1;
    return true;
  }
  let portraitReaction={key:"",until:0};
  function setPortraitReaction(key,seconds=1.8){
    portraitReaction={key,until:clock+seconds};
  }

  function makePuff(scatter) {
    return {
      x: 0.592 + rand(-0.004, 0.004),
      y: scatter ? rand(0.16, 0.25) : 0.255,
      vx: rand(-0.003, 0.003),
      vy: rand(-0.018, -0.008),
      life: scatter ? Math.random() * 2.4 : 0,
      max: rand(2.2, 3.6),
      size: rand(7, 13),
      wobble: rand(0, 6),
    };
  }

  function ix(u) { return view.x + view.w * u; }
  function iy(v) { return view.y + view.h * v; }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    cssSize = { width: rect.width, height: rect.height };
    const dpr = Math.min(1.5, devicePixelRatio || 1, Math.sqrt(1800000 / (rect.width * rect.height)));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      layoutDirty = true;
    }
    if (layoutDirty) {
      layoutDirty = false;
      layoutRoom();

    }
  }

  function spriteBounds(node, naturalW, naturalH) {
    const r = node.getBoundingClientRect(), cr = canvas.getBoundingClientRect();
    const scale = Math.min(r.width/naturalW,r.height/naturalH);
    const w = naturalW*scale, h = naturalH*scale;
    const dx = canvas.width/Math.max(1,cr.width), dy = canvas.height/Math.max(1,cr.height);
    return {x:(r.left-cr.left+(r.width-w)/2)*dx,y:(r.bottom-cr.top-h)*dy,w:w*dx,h:h*dy};
  }

  function alignSpeech() {
    const bubble = room.querySelector("#speech");
    if (!bubble || !bubble.offsetHeight || !canvas.width || !canvas.height || cssSize.width < 10 || actorBox.w < 2) return;
    const dx = cssSize.width / canvas.width, dy = cssSize.height / canvas.height;
    if (portraitMode) {
      const actorArt = room.querySelector(".approved-actors");
      const rect = actorArt.getBoundingClientRect(), stage = canvas.getBoundingClientRect();
      // In the approved portrait, the face ends at approximately 51% of
      // the image width. Reserve that entire area in every language.
      const x = Math.ceil(rect.left-stage.left+rect.width*.56);
      const tail = Math.max(8,Math.min(14,Math.floor(rect.width*.035)));
      const pipeY = rect.top-stage.top+rect.height*.509;
      const values = {"--speech-left":x,"--speech-max":Math.max(0,cssSize.width-x-8),"--speech-tail":tail,
        "--speech-top":Math.max(4,Math.min(rect.bottom-stage.top-bubble.offsetHeight-10,pipeY-bubble.offsetHeight+3))};
      for(const [name,number] of Object.entries(values)){
        const value=Math.round(number)+"px";
        if(room.style.getPropertyValue(name)!==value)room.style.setProperty(name,value);
      }
      return;
    }
    const mouthX = cssSize.width * (772/1440);
    const mouthY = cssSize.height * (312/747);
    const tail = Math.max(14, Math.min(25, cssSize.width * .019));
    const rightInset = portraitMode ? 8 : 18;
    const minSpace = portraitMode ? Math.min(136, cssSize.width * .42) : Math.min(230, cssSize.width * .32);
    const x = Math.max(8, Math.min(mouthX + tail + 2, cssSize.width - rightInset - minSpace));
    function set(name, number) {
      const value = Math.round(number) + "px";
      if (room.style.getPropertyValue(name) !== value) room.style.setProperty(name, value);
    }
    set("--speech-left", x);
    set("--speech-max", Math.min(portraitMode ? 290 : 460, cssSize.width - x - rightInset));
    set("--speech-tail", tail);
    // Align the tip near the mouth, and allow a longer question to grow upward.
    set("--speech-top", Math.max(4, Math.min(deskEdge * dy - bubble.offsetHeight - 12, mouthY - bubble.offsetHeight + 5)));
  }

  function layoutRoom() {
    const cw=canvas.width,ch=canvas.height;
    portraitMode=portraitViewport.matches;
    actorBox=spriteBounds(actor,543,380);
    catBox=spriteBounds(cat,347,138);
    // The neutral sprite was cut from the original landscape scene at
    // (359,121) in a 1366px render, whose source artwork starts at (0,124).
    // Maintain that exact source coordinate system for face and smoke plates.
    view={x:actorBox.x-359*actorBox.w/543,
      y:actorBox.y+3*actorBox.h/380,
      w:1366*actorBox.w/543,h:(1366*928/1648)*actorBox.h/380};
    if(portraitMode){
      const art=room.querySelector(".approved-actors").getBoundingClientRect(), cr=canvas.getBoundingClientRect();
      portraitBox={x:(art.left-cr.left)*cw/Math.max(1,cr.width),y:(art.top-cr.top)*ch/Math.max(1,cr.height),w:art.width*cw/Math.max(1,cr.width),h:art.height*ch/Math.max(1,cr.height)};
      actorBox={x:portraitBox.x,y:portraitBox.y,w:portraitBox.w*.68,h:portraitBox.h*.91};
      view={x:portraitBox.x+(.559-.592)*portraitBox.w,y:portraitBox.y+(.509-.255)*portraitBox.h,w:portraitBox.w,h:portraitBox.h};
    }
    if(!portraitMode){
      view={x:0,y:0,w:cw,h:ch};
      actorBox={x:cw*396/1440,y:ch*120/747,w:cw*548/1440,h:ch*383/747};
      catBox={x:cw*945/1440,y:ch*380/747,w:cw*318/1440,h:ch*126/747};
      deskEdge=ch*495/747;
    }else{
      const desk=room.querySelector(".approved-table").getBoundingClientRect();
      const cr=canvas.getBoundingClientRect();
      deskEdge=(desk.top-cr.top)*ch/Math.max(1,cr.height);
    }
    room.style.setProperty("--room-edge",(deskEdge/ch).toFixed(4));
    room.style.setProperty("--desk-y",(deskEdge/ch).toFixed(4));
    room.classList.toggle("portrait-scene",portraitMode);
    alignSpeech();
  }

  function drawSmoke(dt) {
    if(portraitMode){
      // A visible rising plume from the actual bowl, not the old room's
      // coordinates. Five soft, drifting puffs expand and fade upward.
      const scale=portraitBox.w/700;
      for(let i=0;i<6;i++){
        const t=(clock*.30+i/6)%1;
        const fade=Math.sin(Math.PI*t);
        const x=portraitBox.x+399*scale+Math.sin(t*5.1+clock*.55)*10*scale*t+15*t*scale;
        const y=portraitBox.y+231/487*portraitBox.h-t*112*scale;
        const size=(14+45*t)*scale;
        ctx.globalAlpha=.72*fade;
        ctx.drawImage(puff,x-size/2,y-size/2,size,size);
      }
      ctx.globalAlpha=1;motionStats.smoke++;
      return;
    }
    const scale=canvas.width/1440;
    for(let i=0;i<6;i++){
      const t=(clock*.30+i/6)%1,fade=Math.sin(Math.PI*t);
      const x=(823+Math.sin(t*5.1+clock*.55)*12*t+18*t)*scale;
      const y=(329-t*112)/747*canvas.height;
      const size=(14+42*t)*scale;
      ctx.globalAlpha=.72*fade;
      ctx.drawImage(puff,x-size/2,y-size/2,size,size);
    }
    ctx.globalAlpha=1;motionStats.smoke++;
  }

  function easeOut(p) {
    return 1 - (1 - p) ** 3;
  }

  function drawPlate(plate, box, alpha) {
    if (!plate || alpha < 0.02) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, alpha);
    ctx.drawImage(plate, ix(box.u), iy(box.v), view.w * box.w, view.h * box.h);
    ctx.restore();
  }

  function drawFaces() {
    const plates=images.overlays||{};
    const levels=faceNow.levels||{};
    if(portraitMode){
      // Keep the live expressions even when the gameplay engine immediately
      // asks another question. Idle breathing never overrides a reaction.
      let key=portraitReaction.until>clock?portraitReaction.key:"";
      if(!key){
        if(mood==="happy"||mood==="confident")key="happy";
        else if(mood==="sad"||mood==="defeated")key="sad";
        else if(mood==="thinking"||mood==="worried")key="worried";
        else if(mood==="confused"||mood==="serious"||mood==="surprised")key=mood;
        else key=faceNow.key||"";
      }
      if(!reduce&&paintPose("idle",.15+.85*(.5+.5*Math.sin(clock*1.8))))motionStats.idle++;
      motionStats.activePose="";
      if(key&&paintPose(key,.93)){motionStats.face++;motionStats.activePose=key;}
      else if(!portraitPoses&&key&&plates[key]&&key!=="surprised"){
        // Original fallback only until the newly baked pose is available.
        ctx.globalAlpha=.85;
        ctx.drawImage(plates[key],portraitBox.x+218/700*portraitBox.w,portraitBox.y+106/487*portraitBox.h,134/700*portraitBox.w,119/487*portraitBox.h);
        ctx.globalAlpha=1;
      }
      if(!reduce){
        if(paintPose("catIdle",.15+.85*(.5+.5*Math.sin(clock*2.1))))motionStats.cat++;
        if(catLife.flick>0)paintPose("ear",flickCover(catLife.flick));
        if(plates.cat&&catLife.blink>0){
          ctx.globalAlpha=blinkCover(catLife.blink);
          ctx.drawImage(plates.cat,portraitBox.x+453/700*portraitBox.w,portraitBox.y+395/487*portraitBox.h,77/700*portraitBox.w,42/487*portraitBox.h);
          ctx.globalAlpha=1;
        }
      }
      return;
    }
    // One expression per frame. No breathing warp beneath a reaction and
    // no overlap between two expressions. Reactions win over idle moods.
    let key=portraitReaction.until>clock?portraitReaction.key:"";
    let target=1;
    if(key){
      const remaining=portraitReaction.until-clock;
      target=Math.min(1,remaining/.18);
    }else if(mood==="happy"||mood==="confident")key="happy";
    else if(mood==="sad"||mood==="defeated")key="sad";
    else if(mood==="thinking"||mood==="worried")key="worried";
    else if(["serious","confused","surprised"].includes(mood))key=mood;
    else key="";
    if(!key&&!reduce){
      if(clock>=desktopBlinkAt){desktopBlinkEnd=clock+.22;desktopBlinkAt=clock+rand(3.2,5.8);}
      if(clock<desktopBlinkEnd){key="blink";target=Math.sin(Math.PI*(desktopBlinkEnd-clock)/.22);}
    }
    if(key!==desktopActive){
      desktopActive=key;desktopAlpha=reduce?1:0;
    }
    desktopAlpha=reduce?target:Math.min(target,desktopAlpha+.24);
    motionStats.activePose="";
    if(key&&paintDesktopPose(key,desktopAlpha)){
      motionStats.activePose=key;
      if(key==="blink")motionStats.idle++;else motionStats.face++;
    }
    if(!reduce){
      paintDesktopPose("cat",catLife.blink>0?blinkCover(catLife.blink):0);
      paintDesktopPose("tail",catLife.flick>0?flickCover(catLife.flick):0);
    }
  }

  function blinkAlpha(t) {
    const u = 1 - Math.min(1, Math.max(0, t));
    if (u < 0.22) return u / 0.22;
    if (u < 0.68) return 1;
    return Math.max(0, 1 - (u - 0.68) / 0.32);
  }

  const CAT_FACE = {
    landscape: { u: 0.69318, v: 0.36132, w: 0.11962, h: 0.11158 },
    portrait: { u: 0.69444, v: 0.36719, w: 0.29167, h: 0.14063 },
  };
  const CAT_TAIL = {
    landscape: { u: 0.8134, v: 0.3719, w: 0.0897, h: 0.1275 },
    portrait: { u: 0.7778, v: 0.3516, w: 0.2083, h: 0.1250 },
  };

  function stepCat(dt) {
    catLife.nextBlink -= dt;
    if (catLife.nextBlink <= 0) {
      catLife.blink = 0.28;
      catLife.nextBlink = rand(3, 5);
    }
    if (catLife.blink > 0) catLife.blink = Math.max(0, catLife.blink - dt);
    catLife.nextFlick -= dt;
    if (catLife.nextFlick <= 0) {
      catLife.flick = 0.7;
      catLife.nextFlick = rand(4, 6);
    }
    if (catLife.flick > 0) catLife.flick = Math.max(0, catLife.flick - dt);
  }

  function prepareInk(name, font) {
    const w = Math.round(portraitMode ? canvas.width * 0.42 : view.w * 0.24);
    const h = Math.round(portraitMode ? canvas.width * 0.16 : view.h * 0.12);
    ink.width = w;
    ink.height = h;
    mask.width = w;
    mask.height = h;
    const g = ink.getContext("2d");
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#24160f";
    g.textAlign = "center";
    g.textBaseline = "middle";
    let size = Math.round(h * (portraitMode ? 0.62 : 0.78));
    g.font = font.replace(/\d+px/, `${size}px`);
    while (g.measureText(name).width > w * 0.86 && size > 14) {
      size -= 2;
      g.font = font.replace(/\d+px/, `${size}px`);
    }
    const textW = g.measureText(name).width;
    const textX = (w - textW) / 2;
    // Long English/Bangla names must not paint outside their printed label.
    g.fillText(name, w / 2, h / 2, w * 0.92);
    mask.getContext("2d").clearRect(0, 0, w, h);
    return { w, h, width: Math.max(20, textW), textX };
  }

  function phoneChrome() {
    const cssH = cssSize.height || canvas.height;
    const dpr = canvas.height / Math.max(1, cssH);
    return {
      dpr,
      buttons: Math.round(108 * dpr),
      logo: Math.round(canvas.width * 0.145),
    };
  }

  function paperBox() {
    const chin = actorBox.y + actorBox.h*.66;
    const w = canvas.width * 0.40;
    const h = canvas.width * 0.155;
    const limit = canvas.height - phoneChrome().buttons - 8;
    const y = Math.min(chin + 6, limit - h);
    return { x: canvas.width * 0.08, y: Math.max(8, y), w, h };
  }

  function noteMetrics(turn) {
    const u = Math.max(0, Math.min(1, turn));
    const photo = reveal?.photo && reveal.photo.width > 0 ? reveal.photo : null;
    if (portraitMode) {
      const held = paperBox();
      const chrome = phoneChrome();
      if (!photo) {
        const w = held.w;
        return { u, photo, photoH: 0, nameH: held.h, w, h: held.h,
          x: (canvas.width - w) / 2, y: held.y, pad: 8 * chrome.dpr };
      }
      // Unlike the original fixed-ratio portrait crop, the complete photo fits
      // inside a larger card. Keep room below it for both guess buttons.
      const dpr = chrome.dpr;
      // A full-height portrait needs more vertical room than a landscape
      // photograph. Grow upwards as needed, leaving the answer buttons
      // reachable below the card on small phone displays.
      const reserve = 148 * dpr;
      const minimumTop = Math.max(28 * dpr, canvas.height * 0.33);
      const maxHeight = Math.max(110 * dpr, canvas.height - reserve - minimumTop - 10 * dpr);
      const w = Math.min(canvas.width * 0.80, Math.max(210 * dpr, held.w * 1.85));
      const nameH = Math.min(w * 0.22, 68 * dpr);
      const pad = 10 * dpr;
      const naturalPhotoH = (w - pad * 2) * photo.height / Math.max(1, photo.width) + pad * 2;
      const photoH = Math.max(50 * dpr, Math.min(maxHeight - nameH, naturalPhotoH));
      const h = photoH + nameH;
      const y = Math.max(minimumTop, Math.min(held.y,
        canvas.height - reserve - h - 8 * dpr));
      return { u, photo, photoH, nameH, w, h,
        x: (canvas.width - w) / 2, y, pad };
    }
    // A photo card shows the whole picture, large, in the space to the right of
    // the detective's face. It may cover the shelves, cat, lamp and desk.
    // A name-only card stays centred under the chin.
    const cssW = cssSize.width || canvas.width;
    const cssH = cssSize.height || canvas.height;
    const dpr = canvas.width / Math.max(1, cssW);
    let w;
    let photoH = 0;
    let nameH;
    let x;
    let y;
    let pad = 8;
    let namePx = 0;
    if (photo) {
      const faceRight = canvas.width * (808/1440);
      const s = Math.min(cssW / 1280, cssH / 760);
      pad = 12 * s * dpr;
      nameH = 48 * s * dpr;
      namePx = 30 * s * dpr;
      const gap = 20 * s * dpr;
      const margin = 16 * s * dpr;
      const top = 16 * s * dpr;
      // Hud offset, two 58px buttons, gaps, and the credit line.
      const buttonStack = 164 * dpr;
      const maxW = Math.max(120 * dpr, canvas.width - faceRight - gap - margin);
      const maxH = Math.max(80 * dpr, canvas.height - top - buttonStack);
      const aspect = photo.width / Math.max(1, photo.height);
      let photoW = maxW - pad * 2;
      let frameH = photoW / aspect;
      if (pad + frameH + nameH > maxH) {
        frameH = Math.max(40 * dpr, maxH - pad - nameH);
        photoW = frameH * aspect;
      }
      photoH = frameH + pad;
      w = photoW + pad * 2;
      // Anchor to the right edge, but never place the photo card off-screen.
      x = Math.max(8 * dpr, Math.min(canvas.width - margin - w,
        Math.max(faceRight + gap, canvas.width - margin - w)));
      y = top;
    } else {
      w = Math.min(view.w * 0.32, canvas.width * 0.46);
      nameH = Math.min(view.h * 0.11, 72 * dpr);
      x = ix(0.50) - w / 2;
      y = Math.min(canvas.height-164*dpr-nameH,deskEdge-nameH);
    }
    const h = Math.max(16, photoH + nameH);
    if (photo) y = Math.max(8 * dpr, Math.min(y, canvas.height - 164 * dpr - h));
    return { u, photo, photoH, nameH, w, h, x, y, pad, namePx };
  }

  function drawSheet(turn) {
    const box = noteMetrics(turn);
    const { u, photo, photoH, nameH, w, h } = box;
    const parent = canvas.parentElement;
    if (parent && canvas.height) {
      const vars = {"--note-bottom":((box.y+h)/canvas.height).toFixed(4),"--note-left":(box.x/canvas.width).toFixed(4),"--note-width":(box.w/canvas.width).toFixed(4)};
      for (const [name,value] of Object.entries(vars)) if (parent.style.getPropertyValue(name)!==value) parent.style.setProperty(name,value);
    }
    ctx.save();
    // Settle upright: a short fade, a small rise, and a slight scale.
    // Never a half-turn, and never a mirror.
    const rise = (1 - u) * Math.min(22, h * 0.06);
    ctx.globalAlpha = 0.2 + 0.8 * u;
    ctx.translate(box.x + w / 2, box.y + h / 2 + rise);
    ctx.rotate((1 - u) * 0.05);
    const settle = 0.94 + 0.06 * u;
    ctx.scale(settle, settle);
    ctx.translate(-w / 2, -h / 2);
    ctx.fillStyle = "rgba(40,20,10,0.22)";
    ctx.beginPath();
    ctx.roundRect(10, 12, w, h, 10);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#d5d0c8";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 10);
    ctx.fill();
    ctx.stroke();
    const pad = box.pad || 8;
    if (photo && photoH > 0) {
      ctx.save();
      const frameW = Math.max(1, w - pad * 2);
      const frameH = Math.max(1, photoH - pad * 2);
      ctx.beginPath();
      ctx.roundRect(pad, pad, frameW, frameH, 8);
      ctx.clip();
      // Letterboxing is intentional: the full original source image stays
      // visible, including its edges, on BOTH desktop and phone.
      ctx.fillStyle = "#eee9e0";
      ctx.fillRect(pad, pad, frameW, frameH);
      const fit = fitPhotoInside(photo.width, photo.height, pad, pad, frameW, frameH);
      if (fit.w > 0 && fit.h > 0) ctx.drawImage(photo, fit.x, fit.y, fit.w, fit.h);
      ctx.restore();
    }
    if (reveal?.page) {
      const bandY = photoH;
      const maxW = w * 0.9;
      const maxH = Math.max(12, nameH * (portraitMode ? 0.8 : 0.92));
      let scale = Math.min(maxW / reveal.page.w, maxH / reveal.page.h, portraitMode ? 3 : 1.8);
      if (box.namePx) {
        const inkFont = Math.max(12, Math.round(reveal.page.h * 0.78));
        scale = Math.min(box.namePx / inkFont, maxW / Math.max(1, reveal.inkWidth || reveal.page.w));
      }
      const dw = reveal.page.w * scale;
      const dh = reveal.page.h * scale;
      ctx.drawImage(reveal.page.canvas, (w - dw) / 2, bandY + (nameH - dh) / 2, dw, dh);
    }
    ctx.restore();
  }

  function drawPresent() {
    const name = reveal.name;
    ctx.save();
    ctx.translate(ix(0.50), iy(0.64));
    ctx.scale(reveal.present || 1, reveal.present || 1);
    ctx.fillStyle = "#fff8ea";
    ctx.strokeStyle = "#8d6844";
    ctx.lineWidth = 3;
    const w = view.w * 0.26;
    const h = view.h * 0.16;
    ctx.beginPath();
    ctx.roundRect(-w, -h / 2, w * 0.95, h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#24160f";
    ctx.font = reveal.font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, -w * 0.52, 0, w * 0.8);
    if (reveal.photo && reveal.printed) {
      const pw = w * 0.7;
      const ph = h * 1.15;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.roundRect(w * 0.05, -ph / 2, pw, ph, 6);
      ctx.fill();
      // The small transition card must also retain the complete photograph.
      const inset = fitPhotoInside(reveal.photo.width, reveal.photo.height,
        w * 0.08, -ph / 2 + 6, pw - 12, ph * 0.72);
      ctx.drawImage(reveal.photo, inset.x, inset.y, inset.w, inset.h);
    }
    ctx.restore();
  }

  function updateReveal(dt) {
    if (!reveal) return;
    reveal.t += dt;
    if (reveal.phase === "write") {
      const p = Math.min(1, reveal.t / reveal.writeDur);
      const mg = mask.getContext("2d");
      const shown = Math.max(1, Math.ceil((reveal.name || "").length * p));
      const slice = (reveal.textX || 0) + ink.getContext("2d").measureText((reveal.name || "").slice(0, shown)).width + 2;
      mg.fillStyle = "#000";
      mg.fillRect(0, 0, slice, ink.height);
      if (!reveal.scratch) {
        reveal.scratch = document.createElement("canvas");
        reveal.scratch.width = ink.width;
        reveal.scratch.height = ink.height;
      }
      const sg = reveal.scratch.getContext("2d");
      sg.setTransform(1, 0, 0, 1, 0, 0);
      sg.globalCompositeOperation = "source-over";
      sg.clearRect(0, 0, ink.width, ink.height);
      sg.drawImage(ink, 0, 0);
      sg.globalCompositeOperation = "destination-in";
      sg.drawImage(mask, 0, 0);
      reveal.page = { canvas: reveal.scratch, w: ink.width, h: ink.height, penX: 8 + reveal.inkWidth * p };
      if (p >= 1) {
        reveal.phase = "present";
        reveal.t = 0;
        reveal.printed = !!(reveal.photo && reveal.photo.width > 0);
      }
    } else if (reveal.phase === "print") {
      if (reveal.t > 0.4) {
        reveal.phase = "present";
        reveal.t = 0;
        reveal.printed = true;
      }
    } else if (reveal.phase === "present") {
      reveal.present = 0.92 + Math.min(0.18, reveal.t * 0.4);
      if (reveal.t > 0.16 && !reveal.done) {
        reveal.done = true;
        reveal.resolve({ printed: !!reveal.printed });
      }
    } else if (reveal.phase === "wrong") {
      if (reveal.t > 1.15 && !reveal.done) {
        reveal.done = true;
        reveal.resolve();
      }
    } else if (reveal.phase === "retry") {
      if (!reveal.done) {
        reveal.done = true;
        reveal.resolve();
        reveal = null;
      }
    }
  }

  function drawDismiss(u) {
    const fade = 1 - u;
    ctx.save();
    ctx.globalAlpha = Math.max(0, fade);
    ctx.translate(-view.w * 0.03 * u, -view.h * 0.12 * u);
    drawSheet(1);
    ctx.restore();
  }

  function drawReveal() {
    if (!reveal) return;
    if (reveal.phase === "write" || reveal.phase === "print") {
      drawSheet(easeOut(Math.min(1, reveal.t / 0.4)));
    } else if (reveal.phase === "present") {
      drawSheet(1);
    } else if (reveal.phase === "wrong" && reveal.t < 1.05) {
      const gone = Math.min(1, reveal.t / 1.0);
      drawDismiss(gone);
    }
  }

  function frame(now) {
    if (!running || document.hidden) return;
    raf=requestAnimationFrame(frame);
    if(frameTime && now-frameTime<1000/30-1) return;
    const dt=Math.min(.10,(now-(frameTime||now))/1000||.033);
    frameTime=now;clock+=dt;motionStats.frames++;
    if(layoutDirty) resize();
    const plates=portraitMode?portraitPlates:desktopPlates;
    images.overlays=plates;
    faceNow=faces.step(dt,key=>!!plates[key]);
    // Static art is rendered once by the browser. Only a transparent effects
    // canvas is cleared and redrawn, capped at 30fps and 1.8M backing pixels.
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(!reduce)stepCat(dt);
    updateReveal(dt);drawFaces();
    // The feathered head overlays must never paint over the rising smoke.
    if(!reduce)drawSmoke(dt);
    drawReveal();
  }

  function screenOrient(){return portraitViewport.matches?"portrait":"landscape";}

  function desktopSeriousPose(base){
    const bounds={x:239,y:86,w:152,h:139};
    const local=bakePose(base,bounds,[
      [284,112,35,20,4,4],[356,128,31,20,-3,4],
      [286,135,26,13,0,2],[353,149,25,13,0,2],
      [299,184,32,19,0,2]
    ]);
    const sheet=document.createElement("canvas");sheet.width=base.width;sheet.height=base.height;
    sheet.getContext("2d").drawImage(local,bounds.x,bounds.y);
    return sheet;
  }
  // Limit photographic expression plates to the face itself, with a soft
  // elliptical feather. Keep the neutral hat, hair, room and smoke intact.
  function cleanDesktopFace(sheet,base){
    const g=sheet.getContext("2d",{willReadFrequently:true});
    const n=document.createElement("canvas");n.width=base.width;n.height=base.height;
    const ng=n.getContext("2d",{willReadFrequently:true});ng.drawImage(base,0,0);
    const neutral=ng.getImageData(0,0,n.width,n.height).data;
    const im=g.getImageData(0,0,sheet.width,sheet.height),p=im.data;
    for(let y=0;y<sheet.height;y++)for(let x=0;x<sheet.width;x++){
      const i=(y*sheet.width+x)*4;
      const r=Math.hypot((x-310)/103,(y-157)/93);
      const feather=Math.max(0,Math.min(1,(1-r)/.24));
      p[i+3]=Math.round(p[i+3]*feather);
      if(!p[i+3])continue;
      const lum=(v)=>.2126*v[i]+.7152*v[i+1]+.0722*v[i+2];
      const sourceLum=lum(p),baseLum=lum(neutral);
      // Never introduce a patch substantially darker than the original face.
      const lift=Math.max(0,baseLum*.78-sourceLum);
      for(let j=0;j<3;j++)p[i+j]=Math.min(255,p[i+j]+lift);
    }
    g.putImageData(im,0,0);return sheet;
  }
  async function loadOverlaySet() {
    // Both layouts use the same approved landscape cutouts, eliminating the
    // second portrait expression pack and keeping expression alignment exact.
    const source=OVERLAYS.landscape;
    const sprites=await Promise.all([loadImage("./images/layered/detective.webp"),loadImage("./images/layered/cat.webp")]);
    const entries=await Promise.all(Object.entries(source).map(async ([key,src])=>{
      const animal=key==="cat"||key==="tail",base=sprites[animal?1:0];
      if(key==="serious"&&base)return [key,desktopSeriousPose(base)];
      const plate=await loadImage(src+"?v=akinator-28");
      if(!plate||!base)return [key,null];
      const crop=animal?(key==="cat"?CAT_FACE.landscape:CAT_TAIL.landscape):FACE.landscape;
      const ox=animal?899:359,oy=animal?363:121;
      const sheet=document.createElement("canvas");
      sheet.width=base.width;sheet.height=base.height;
      const g=sheet.getContext("2d");
      const sw=1366,sh=1366*928/1648;
      g.drawImage(plate,crop.u*sw-ox,124+crop.v*sh-oy,crop.w*sw,crop.h*sh);
      // Clip to the exact transparent character outline. Never carry the old
      // bookcase/window pixels into the new room.
      g.globalCompositeOperation="destination-in";
      g.drawImage(base,0,0);
      return [key,animal?sheet:cleanDesktopFace(sheet,base)];
    }));
    desktopPlates=Object.fromEntries(entries.filter(([,v])=>v));
    if(!portraitViewport.matches)images.overlays=desktopPlates;
  }

  let portraitReady = null;
  function preparePortrait() {
    if(portraitReady)return portraitReady;
    room.classList.remove("portrait-art-ready");
    const nodes=[...room.querySelectorAll(".approved-portrait-art img[data-src]")];
    portraitReady=Promise.all(nodes.map(img=>{
      if(!img.getAttribute("src"))img.src=img.dataset.src;
      return img.decode();
    })).then(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
      .then(()=>{room.classList.add("portrait-art-ready");alignSpeech();preparePortraitPoses().catch(()=>{portraitPoseSource=null;});})
      .catch(()=>{portraitReady=null;});
    return portraitReady;
  }
  async function prepareDesktop(){
    if(desktopArtPromise)return desktopArtPromise;
    const img=room.querySelector(".approved-desktop-art");
    desktopArtPromise=(async()=>{
      if(!img.getAttribute("src"))img.src=img.dataset.src;
      await img.decode();
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      room.classList.add("desktop-art-ready");
      if(!desktopPoses&&!overlayPromise)overlayPromise=prepareDesktopPoses(img).catch(()=>{overlayPromise=null;});
    })().catch(()=>{desktopArtPromise=null;});
    return desktopArtPromise;
  }
  function preparePortraitEffects(){
    if(!portraitOverlayPromise)portraitOverlayPromise=Promise.all(["happy","sad","serious","worried","confused","cat"].map(async key=>[key,await loadImage("./images/layered/portrait-"+key+".webp")])).then(entries=>{
      portraitPlates=Object.fromEntries(entries.filter(([,v])=>v));
      if(portraitViewport.matches)images.overlays=portraitPlates;
    }).catch(()=>{portraitOverlayPromise=null;});
  }
  async function start() {
    if(portraitViewport.matches){await preparePortrait();preparePortraitEffects();}
    else await prepareDesktop();
    images.baseOrient=screenOrient();
    layoutDirty=true;resize();
    if(running)return;
    running=true;frameTime=0;
    if(!document.hidden)raf=requestAnimationFrame(frame);
  }
  if(typeof ResizeObserver==="function"){
    new ResizeObserver(()=>{if(running){layoutDirty=true;resize();}}).observe(canvas);
    new ResizeObserver(()=>{if(running)alignSpeech();}).observe(room.querySelector("#speech"));
  }
  portraitViewport.addEventListener?.("change",()=>{
    images.baseOrient=screenOrient();if(portraitViewport.matches){preparePortrait();preparePortraitEffects();}else prepareDesktop();layoutDirty=true;if(running)resize();
  });
  document.addEventListener("visibilitychange",()=>{
    cancelAnimationFrame(raf);frameTime=0;
    if(running&&!document.hidden){layoutDirty=true;raf=requestAnimationFrame(frame);}
  });

  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    if (reveal && !reveal.done) {
      reveal.done = true;
      reveal.resolve({ printed: false });
    }
  }

  async function playReveal(options) {
    const font = options.font || '400 28px "Times New Roman", serif';
    const prepared = prepareInk(options.name || "?", font);
    const card = {
      phase: reduce ? "present" : "write",
      t: 0,name:options.name||"?",font,imageUrl:"",photo:null,printed:false,
      writeDur:reduce?.01:Math.min(.48,Math.max(.22,(options.name||"").length*.018)),
      inkWidth:prepared.width,textX:prepared.textX||0,present:1,page:null,
      resolve:()=>{},done:false
    };
    reveal=card;
    mood="confident";faces.setMood("confident");setPortraitReaction("surprised",1.5);
    // Do not wait up to five seconds for the optional portrait before showing
    // the guess. A late picture may join only this same, still-current card.
    if(options.imageUrl)loadImage(options.imageUrl,5000).then(photo=>{
      if(!photo||reveal!==card)return;
      card.photo=photo;card.imageUrl=options.imageUrl;
      if(card.phase==="present")card.printed=true;
      options.onPhoto?.();
    });
    if(reduce){card.page={canvas:ink,w:ink.width,h:ink.height};card.done=true;return {printed:!!card.photo};}
    return new Promise(resolve=>{card.resolve=resolve;});
  }

  // Reprint an already-revealed answer in the selected language.
  function relabel(name, font) {
    if (!reveal || !name) return;
    const prepared = prepareInk(name, font);
    const paper = document.createElement("canvas");
    paper.width = ink.width;
    paper.height = ink.height;
    paper.getContext("2d").drawImage(ink, 0, 0);
    reveal.name = name;
    reveal.font = font;
    reveal.inkWidth = prepared.width;
    reveal.textX = prepared.textX;
    reveal.page = { canvas: paper, w: paper.width, h: paper.height };
    if (reveal.phase === "write") {
      reveal.phase = "present";
      reveal.t = 0;
      reveal.printed = !!reveal.photo;
    }
  }

  function playWrong() {
    mood = "sad";
    faces.setMood("sad");setPortraitReaction("sad",2.5);
    if (!reveal) reveal = { page: null, name: "" };
    reveal.phase = "wrong";
    reveal.t = 0;
    reveal.done = false;
    if (reduce) return Promise.resolve();
    return new Promise((resolve) => {
      reveal.resolve = resolve;
    });
  }

  function playRetry() {
    mood = "curious";
    faces.setMood("curious");
    reveal = null;
    return Promise.resolve();
  }

  function playDefeat() {
    mood = "defeated";
    faces.setMood("defeated");
    reveal = null;
  }

  function clearReveal() {
    if(reveal&&!reveal.done){reveal.done=true;reveal.resolve({printed:false});}
    reveal = null;
    // Erase the last painted card immediately, even before the next 30fps tick.
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(running&&!document.hidden){drawFaces();if(!reduce)drawSmoke(0);}
  }

  return {
    start, stop, resize, alignSpeech,
    setMood(value) { mood = value; faces.setMood(value); if(value==="sad"||value==="defeated")setPortraitReaction("sad",2.5);if(value==="confident")setPortraitReaction("surprised",1.3);if(value==="happy")setPortraitReaction("happy",2.2); },
    react(answer) { const key=faces.react(answer);if(key)setPortraitReaction(key,2.1);return key; },
    blinkCat() { catLife.blink = 0.2; },
    flickCat() { catLife.flick = 0.35; },
    debug() {
      return {
        expression: faces.picture(),
        portraitMotion:{...motionStats,poses:Object.keys(portraitPoses||{}),reaction:portraitReaction.until>clock?portraitReaction.key:""},
        desktopMotion:{activePose:desktopActive,alpha:desktopActive?desktopAlpha:0,poses:Object.keys(desktopPoses||{}),faceLayers:desktopActive&&desktopAlpha>0?1:0},
        plates: Object.keys(images.overlays || {}),
        orient: images.baseOrient || "",
        portrait: portraitMode,
        revealActive: !!reveal,
        revealBounds: reveal?.photo ? (() => {
          const { x, y, w, h, photoH } = noteMetrics(1);
          return { x, y, w, h, photoH, canvasW: canvas.width, canvasH: canvas.height };
        })() : null,
      };
    },
    playReveal, relabel, playWrong, playRetry, playDefeat, clearReveal,
  };
}

export function startMenuCat(canvas) {
  if (!canvas) return null;
  if (canvas._riddlexCatController) return canvas._riddlexCatController;
  canvas.dataset.catLive = "1";
  const life = { blink: 0, nextBlink: rand(0.6, 1.4), flick: 0, nextFlick: rand(1.2, 2.2) };
  let blinkImg = null;
  loadImage("./images/approved/menu-cat-blink.webp?v=akinator-27").then((img) => { blinkImg = img; });
  let last = 0;
  let running = false;
  let raf = 0;
  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.034, (now - (last || now)) / 1000 || 0.016);
    last = now;
    life.nextBlink -= dt;
    if (life.nextBlink <= 0) {
      life.blink = 0.28;
      life.nextBlink = 3 + Math.random() * 2;
    }
    if (life.blink > 0) life.blink = Math.max(0, life.blink - dt);
    life.nextFlick -= dt;
    if (life.nextFlick <= 0) {
      life.flick = 0.7;
      life.nextFlick = 4 + Math.random() * 2;
    }
    if (life.flick > 0) life.flick = Math.max(0, life.flick - dt);
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round((rect.height || rect.width * 0.72) * dpr));
    if (rect.width > 2 && (canvas.width !== w || canvas.height !== h)) {
      canvas.width = w;
      canvas.height = h;
    }
    const g = canvas.getContext("2d");
    g.clearRect(0, 0, canvas.width, canvas.height);
    const shut = life.blink > 0 ? blinkCover(life.blink) : 0;
    if (blinkImg && shut > 0.02 && canvas.width > 2) {
      g.globalAlpha = Math.min(1, shut);
      g.drawImage(blinkImg, 0, 0, canvas.width, canvas.height);
    }
    g.globalAlpha = 1;
    raf = requestAnimationFrame(frame);
  };
  const controller = {
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
    },
    resume() {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    },
  };
  canvas._riddlexCatController = controller;
  controller.resume();
  return controller;
}
