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
 const play = Math.max(0, Math.sin(time / 630));
 paintCat(context, image, 6, 478, 301, .88, 1, 1 - .025 * play);
 drawGlass(context, 507 + 4 * play, 298 - 3 * play, .29 * play, .68);
}

function paintCat(context, image, frame, x, y, scale, direction = 1, heightScale = 1) {
 const [sx, sy, width, height] = catFrames[frame];
 context.save();
 context.translate(x, y);
 context.scale(direction * scale, scale);
 context.fillStyle = '#21130640';
 context.beginPath();
 context.ellipse(0, -3, width * .38, 7, 0, 0, Math.PI * 2);
 context.fill();
 context.drawImage(image, sx, sy, width, height, -width / 2, -height * heightScale, width, height * heightScale);
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

function drawGlass(context, x, y, angle, size) {
 context.save();
 context.translate(x, y);
 context.rotate(angle - .12);
 context.scale(size, size);
 context.strokeStyle = '#412920';
 context.lineWidth = 10;
 context.beginPath();
 context.moveTo(0, 0);
 context.lineTo(23, -5);
 context.stroke();
 context.strokeStyle = '#c29852';
 context.lineWidth = 3;
 context.stroke();
 context.beginPath();
 context.ellipse(40, -9, 17, 10, 0, 0, 2 * Math.PI);
 context.fillStyle = '#acc6bc48';
 context.fill();
 context.stroke();
 context.restore();
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
  const {plate, cat, arm, printer} = sprites;
  context.clearRect(0, 0, 724, 404);
  front.clearRect(0, 0, 724, 404);
  if (!layer.hidden) {
   if (!evidence) drawRain(context, panes, time, 220, 166, 26);
   context.drawImage(plate, 0, 0);
   if (cover) drawEvidenceCat(front, cat, reduced.matches ? 1000 : now - moodStart, retreat);
   else if (evidence) paintCat(context, cat, 6, 478, 301, .88);
   else drawCat(context, cat, time);
   context.drawImage(printer, 0, 0);
   if (!evidence) {
    const reach = pipeCycle(time);
    context.save();
    // The end of the pipe meets the mouth at the top of the wrist arc.
    context.translate(300 + 35 * reach, 131 + 41 * reach);
    context.transform(1, .09 * reach, -.22 * reach, 1, 0, 0);
    context.drawImage(arm, 0, -10, 121, 169 - 41 * reach);
    drawSmoke(context, 52, -12, time);
    context.restore();
   }
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
   sprites = {plate, cat, arm, printer};
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
 const oldPipe = new Path2D('M257 309Q278 312 297 322L301 310Q306 273 317 252Q302 233 321 219L321 194Q340 162 361 166Q365 195 343 211L342 239Q356 267 332 279L323 311Q333 318 326 337Q316 360 291 345L256 319Z');
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
  const gripX = 256 + 60 * reach, gripY = 312 + 121 * reach;
  // Reuse the coat's own pixels along the masked forearm.
  context.save();
  context.beginPath();
  context.moveTo(262, 552);
  context.quadraticCurveTo(244, 470, gripX + 39, gripY + 39);
  context.lineTo(gripX + 73, gripY + 55);
  context.quadraticCurveTo(312, 510, 318, 570);
  context.quadraticCurveTo(287, 589, 262, 552);
  context.clip();
  context.drawImage(art, 223, 384, 99, 204, 231, gripY + 23, 224, 265 - reach * 85);
  context.restore();
  context.save();
  context.translate(gripX, gripY);
  context.rotate(.21 * reach);
  context.drawImage(arm, 0, 0, 112, 105, 0, -16, 109, 103);
  drawSmoke(context, 66, -13, elapsed);
  context.restore();

  const paw = new Path2D('M418 856Q414 877 431 890Q455 906 491 909Q500 893 477 883Z');
  context.save();
  context.clip(paw);
  context.drawImage(art, 418, 820, 79, 65, 415, 852, 89, 62);
  context.restore();
  drawGlass(context, 453, 904, Math.PI + Math.sin(elapsed / 530) * .19, 1.14);
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
