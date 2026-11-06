// The overlay uses the original artwork's 724 × 404 coordinate space.
const catFrames = [
 [23,28,183,161],[244,28,184,161],[462,30,183,159],[683,27,186,162],
 [24,244,184,164],[251,245,177,163],[472,238,144,170],[675,277,190,131],
];
const ease = t => t * t * (3 - 2 * t);
const assets = './images/approved/';

function load(name) {
 const image = new Image();
 image.src = assets + name;
 return image.decode().then(() => image);
}

function clippedLayer(image, left, top, outline, feather = 0) {
 const canvas = document.createElement('canvas');
 canvas.width = 724;
 canvas.height = 404;
 const context = canvas.getContext('2d');
 context.filter = feather ? `blur(${feather}px)` : 'none';
 context.fill(new Path2D(outline));
 context.filter = 'none';
 context.globalCompositeOperation = 'source-in';
 context.drawImage(image, left, top);
 return canvas;
}

function drawCat(context, image, time) {
 const phase = time % 10400;
 if (phase < 2200 || phase >= 7800) {
  const outward = phase < 2200;
  const progress = outward ? phase / 2200 : Math.min(1, (phase - 7800) / 2300);
  paintCat(context, image, progress === 1 ? 5 : Math.floor(time / 128) % 4,
   outward ? 484 - 125 * progress : 359 + 125 * progress, 299 + 55 * progress * Number(outward) + 55 * (1 - progress) * Number(!outward),
   .78, outward ? -1 : 1);
 } else if (phase < 4900) {
  paintCat(context, image, 4, 359, 354, .77, -1);
 } else {
  const roll = Math.sin(Math.PI * (phase - 4900) / 2900);
  paintCat(context, image, 7, 359 - 9 * roll, 354, .77, -1, 1 - .1 * roll, .16 * roll);
 }
}

function paintCat(context, image, frame, x, y, scale, direction = 1, heightScale = 1, roll = 0) {
 const [sx, sy, width, height] = catFrames[frame];
 context.save();
 context.translate(x, y);
 context.scale(direction * scale, scale);
 context.fillStyle = '#21130640';
 context.beginPath();
 context.ellipse(0, -3, width * .38, 7, 0, 0, Math.PI * 2);
 context.fill();
 context.translate(0, -height * heightScale / 2);
 context.rotate(roll);
 context.drawImage(image, sx, sy, width, height, -width / 2, -height * heightScale / 2, width, height * heightScale);
 context.restore();
}

function drawSmoke(context, x, y, time) {
 for (let i = 0; i < 6; i++) {
  const age = ((time + i * 380) % 2280) / 2280;
  const drift = 12 * age * Math.sin(age * 6 + i * .5);
  const rise = 61 * age;
  const radius = 2 + 10 * age;
  const cx = x + drift, cy = y - rise;
  const smoke = context.createRadialGradient(cx, cy, 0, cx, cy, radius);
  smoke.addColorStop(0, `rgba(224,214,201,${.43 * Math.sin(Math.PI * age)})`);
  smoke.addColorStop(1, 'rgba(224,214,201,0)');
  context.fillStyle = smoke;
  context.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
 }
}

function drawEvidenceCat(context, cat, time, retreat) {
 if (retreat) {
  const shake = time < 470 ? Math.sin(time / 24) * 4 * (1 - time / 470) : 0;
  const rise = Math.max(0, Math.min(1, (time - 300) / 420));
  const walk = Math.max(0, Math.min(1, (time - 720) / 850));
  const frame = time < 540 ? 7 : time < 720 ? 5 : walk >= .9 ? 6 : Math.floor((time - 720) / 132) % 4;
  paintCat(context, cat, frame, 460 + shake + 18 * walk + Math.sin(Math.PI * walk) * 42, 359 - 58 * walk,
   1.01 - .13 * walk, 1, time < 540 ? 1 + .12 * rise : 1);
  return;
 }
 const approach = ease(Math.min(1, time / 470));
 const crouch = ease(Math.max(0, Math.min(1, (time - 470) / 390)));
 const frame = time < 470 ? Math.floor(time / 130) % 4 : crouch < .77 ? 5 : 7;
 paintCat(context, cat, frame, 476 - 16 * approach, 301 + 58 * approach,
  .88 + .13 * approach, time < 470 ? -1 : 1, frame === 5 ? 1 - .22 * crouch : 1);
}

function drawRain(context, panes, time, width, height, count) {
 context.save();
 context.clip(panes);
 context.strokeStyle = '#d9e5e080';
 context.lineWidth = width > 300 ? 1.35 : .75;
 context.beginPath();
 for (let index = 0; index < count; index++) {
  const y = (index * 83 + time * (.16 + index % 4 * .045)) % height;
  const x = (index * 71 + y * .14) % width;
  context.moveTo(x, y);
  context.lineTo(x + 2.5, y + 10 + index % 9);
 }
 context.stroke();
 context.restore();
}

function pipeCycle(time) {
 const phase = time % 8400;
 if (phase < 1500) return 0;
 if (phase < 2600) return ease((phase - 1500) / 1100);
 if (phase < 6050) return 1;
 if (phase < 7350) return 1 - ease((phase - 6050) / 1300);
 return 0;
}

// The sleeve's inside seam is pinned to the shoulder. Only the upper
// rows follow the wrist, while the lower rows settle against the desk.
function drawPipeArm(context, arm, reach, time) {
 const tipX = 341 - 43 * reach;
 const tipY = 203 - 72 * reach;
 const rows = [
  [0, tipX, tipY - 13],
  [70, 343, 213],
  [arm.height, 333, 298],
 ];
 for (let index = 1; index < rows.length; index++) {
  const [top, x, y] = rows[index - 1];
  const [bottom, nextX, nextY] = rows[index];
  const height = bottom - top;
  context.save();
  context.transform(.54, 0, (nextX - x) / height, (nextY - y) / height, x, y);
  context.drawImage(arm, 0, top, arm.width, height, 0, 0, arm.width, height);
  context.restore();
 }
 drawSmoke(context, tipX + 36, tipY - 13, time);
}

export function animateProps(office, art) {
 const layer = office.querySelector('.scene-props');
 const foreground = office.querySelector('.evidence-cat');
 const context = layer.getContext('2d');
 const front = foreground.getContext('2d');
 if (!context || !front) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const panes = new Path2D('M44 0H212Q231 33 232 45L192 61 177 107 193 148H124L97 162 77 171 54 151 48 132 74 117 78 91 61 66 42 50Z');
 let sprites, loading = false, pending = 0, time = 0, lastFrame;
 let mood, moodStart = 0;
 function frame(now) {
  pending = 0;
  if (office.hidden || document.hidden || !sprites) {
   lastFrame = undefined;
   return;
  }
  if (!reduced.matches && lastFrame !== undefined && now - lastFrame < 32) {
   schedule();
   return;
  }
  if (mood !== office.dataset.mood) {
   mood = office.dataset.mood;
   moodStart = now;
  }
  time += lastFrame === undefined ? 0 : Math.min(80, now - lastFrame);
  lastFrame = now;
  const reveal = office.dataset.reveal;
  const evidence = reveal && reveal !== 'loading';
  const retreat = mood === 'retrying';
  const cover = evidence && (mood === 'wrong' || retreat);
  layer.hidden = reduced.matches && !evidence;
  foreground.hidden = !cover;
  const {plate, cat, arm, printer, sleevePlate} = sprites;
  context.clearRect(0, 0, 724, 404);
  front.clearRect(0, 0, 724, 404);
  if (!layer.hidden) {
   if (!evidence) drawRain(context, panes, time, 220, 166, 26);
   context.drawImage(plate, 0, 0);
   if (!evidence) {
    const reach = pipeCycle(time);
    context.drawImage(sleevePlate, 0, 0);
    drawPipeArm(context, arm, reach, time);
   }
   if (cover) drawEvidenceCat(front, cat, reduced.matches ? 1000 : now - moodStart, retreat);
   else if (evidence) paintCat(context, cat, 6, 478, 301, .88);
   else drawCat(context, cat, time);
   context.drawImage(printer, 0, 0);
  }
  if (!reduced.matches && (!evidence || cover && now - moodStart < (retreat ? 1650 : 900))) schedule();
 }
 function schedule() {
  if (!pending) pending = requestAnimationFrame(frame);
 }
 async function prepare() {
  if (sprites || loading || !art.naturalWidth) return;
  loading = true;
  try {
   await art.decode();
   const [clean, cat, arm] = await Promise.all(['motion-plate.png','cat-motion.png','pipe-arm.png'].map(load));
   const plate = clippedLayer(clean, 292, 35,
    'M315 44 L356 41 365 65 364 128 357 149 333 156 309 144 300 135 305 127 323 126 325 104 316 84 Z ' +
    'M405 298 L410 255 418 220 423 185 427 152 447 148 464 164 478 159 498 145 510 147 516 178 522 197 532 229 544 265 544 302 523 309 425 310 Z', 2);
   const printer = clippedLayer(art, 0, 0,
    'M557 304 L557 247 Q558 226 576 223 L631 213 642 195 710 194 704 216 724 221 V316 L685 320 573 306 Z', .7);
   const sleevePlate = document.createElement('canvas');
   sleevePlate.width = 724;
   sleevePlate.height = 404;
   const sleeveContext = sleevePlate.getContext('2d');
   sleeveContext.save();
   sleeveContext.clip(new Path2D('M339 196Q366 200 380 231L418 269V301H353L349 273 342 265 351 245Z'));
   sleeveContext.drawImage(clean, 126, 155, 105, 110, 338, 191, 105, 110);
   sleeveContext.drawImage(art, 353, 301, 69, 13, 353, 289, 69, 13);
   sleeveContext.restore();
   sprites = {plate, cat, arm, printer, sleevePlate};
   schedule();
  } catch {
   // Leave the original artwork visible if the layers cannot load.
  } finally {
   loading = false;
  }
 }
 function sync() {
  if (!office.hidden && !document.hidden) prepare();
  schedule();
 }
 art.addEventListener('load', sync, {once:true});
 reduced.addEventListener('change', sync);
 document.addEventListener('visibilitychange', sync);
 new MutationObserver(sync).observe(office, {
  attributes:true, attributeFilter:['hidden', 'data-mood', 'data-reveal'],
 });
 sync();
}

export function animateWelcome(splash) {
 const art = splash.querySelector('img');
 const layer = splash.querySelector('canvas');
 const context = layer.getContext('2d');
 if (!context) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 // Each pane excludes the sill, leadwork, foreground detective and cat.
 const panes = new Path2D(
  'M148 66Q202 18 279 8V161H225Z M300 8Q383 22 441 91L369 167H300Z ' +
  'M386 168L445 103Q461 130 470 169Z M84 160Q96 108 137 77L207 160Z ' +
  'M79 184H143L103 207 101 255 86 276 109 288 106 329 74 349Z ' +
  'M301 190L469 193V474H315L303 394 265 346 269 296 253 273 245 233 280 218 266 192Z ' +
  'M321 500H465V543L413 541 400 595 326 642Z'
 );
 const foliage = new Path2D('M322 434Q344 390 383 371Q392 321 459 308L460 474H322Z M328 502H460V534Q401 532 398 580L328 636Z');
 const oldPipe = new Path2D('M250 309Q278 312 297 322L301 310Q306 273 317 252Q302 233 321 219L321 194Q340 162 361 166Q365 195 343 211L342 239Q356 267 332 279L323 311Q333 318 326 337Q316 360 291 345L250 319Z');
 let arm, request = 0, last, elapsed = 0;

 function tick(now) {
  request = 0;
  if (splash.hidden || document.hidden || reduced.matches || !arm || !art.naturalWidth) {
   layer.hidden = true;
   last = undefined;
   return;
  }
  schedule();
  if (last !== undefined && now - last < 32) return;
  elapsed += last === undefined ? 0 : Math.min(70, now - last);
  last = now;
  layer.hidden = false;
  context.clearRect(0, 0, 793, 982);

  context.save();
  context.clip(oldPipe);
  context.drawImage(art, -45, 0);
  context.save();
  context.beginPath();
  context.rect(278, 182, 21, 179);
  context.clip();
  context.drawImage(art, 278, 13, 21, 139, 278, 180, 21, 180);
  context.restore();
  context.restore();

  context.save();
  context.clip(foliage);
  context.drawImage(art, Math.sin(elapsed / 910) * 2.4, 0);
  context.restore();

  drawRain(context, panes, elapsed, 474, 660, 72);

  const reach = pipeCycle(elapsed);
  const gripX = 247 + 72 * reach, gripY = 315 + 120 * reach;
  const cuffX = gripX + 66, cuffY = gripY + 69;
  const elbowX = 292 + reach * 8, elbowY = 608;
  // Lay the moving forearm over the existing sleeve, from elbow to cuff.
  context.save();
  context.transform(1, 0, (elbowX - cuffX) / (elbowY - cuffY), 1, cuffX, cuffY);
  context.clip(new Path2D(`M-20 -9Q0 -19 18 -5L31 ${elbowY - cuffY - 38}Q31 ${elbowY - cuffY + 16} 0 ${elbowY - cuffY + 26}Q-33 ${elbowY - cuffY + 7} -32 ${elbowY - cuffY - 40}Z`));
  context.drawImage(art, 249, 430, 65, 179, -33, -20, 66, elbowY - cuffY + 47);
  context.restore();
  context.save();
  context.translate(gripX, gripY);
  context.drawImage(arm, 0, 0, 112, 94, 0, -16, 105, 96);
  drawSmoke(context, 66, -13, elapsed);
  context.restore();

 }
 function schedule() {
  if (!request) request = requestAnimationFrame(tick);
 }
 load('pipe-arm.png').then(image => { arm = image; schedule(); }).catch(() => {});
 art.addEventListener('load', schedule, {once:true});
 reduced.addEventListener('change', schedule);
 document.addEventListener('visibilitychange', schedule);
 new MutationObserver(schedule).observe(splash, {attributes:true, attributeFilter:['hidden']});
}
