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
 const t = time % 19000;
 let frame = 6, x = 476, direction = 1, scale = .88, heightScale = 1;
 if (t >= 2400 && t < 3300) frame = t < 2800 ? 5 : 4;
 if (t >= 3300 && t < 6700) {
  const travel = (t - 3300) / 3400;
  x += 114 * travel;
  scale -= .16 * travel;
  frame = Math.floor((t - 3300) / 160) % 4;
 } else if (t >= 6700 && t < 7800) {
  x = 590; scale = .72;
  frame = t < 7000 ? 4 : 5;
  direction = t < 7250 ? 1 : -1;
 } else if (t >= 7800 && t < 11200) {
  const travel = (t - 7800) / 3400;
  x = 590 - 114 * travel;
  scale = .72 + .16 * travel;
  direction = -1;
  frame = Math.floor((t - 7800) / 160) % 4;
 } else if (t >= 11200 && t < 12300) {
  direction = -1;
  frame = t < 11600 ? 4 : t < 11950 ? 5 : 6;
 } else if (t >= 12650 && t < 13300) {
  heightScale = 1 - .23 * ease((t - 12650) / 650);
 } else if (t >= 13300 && t < 17500) {
  frame = 7;
  heightScale += Math.sin((t - 13300) / 540) * .012;
 } else if (t >= 17500 && t < 18200) {
  heightScale = .77 + .23 * ease((t - 17500) / 700);
 }
 const [sx, sy, width, height] = catFrames[frame];
 context.save();
 context.translate(x, 301);
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

export function animateProps(office, art) {
 const layer = office.querySelector('.scene-props');
 const context = layer.getContext('2d');
 if (!context) return;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let sprites, loading = false, pending = 0, time = 0, lastFrame;
 function frame(now) {
  pending = 0;
  if (office.hidden || document.hidden || reduced.matches || !sprites) {
   layer.hidden = true;
   lastFrame = undefined;
   return;
  }
  schedule();
  if (lastFrame !== undefined && now - lastFrame < 40) return;
  time += lastFrame === undefined ? 0 : Math.min(80, now - lastFrame);
  lastFrame = now;
  layer.hidden = false;
  const {plate, cat, arm, printer} = sprites;
  context.clearRect(0, 0, 724, 404);
  context.drawImage(plate, 0, 0);
  drawCat(context, cat, time);
  context.drawImage(printer, 0, 0);
  const phase = time % 9400;
  const reach = phase < 2400 ? 0 : phase < 3600 ? ease((phase - 2400) / 1200) :
   phase < 6700 ? 1 : 1 - ease((phase - 6700) / 2700);
  context.save();
  // Keep the elbow at the desktop while the wrist lowers and moves outward.
  context.translate(402, 297);
  context.transform(1, 0, -.19 * reach, 1 - .24 * reach, 0, 0);
  context.drawImage(arm, -102, -175, 124, 175);
  drawSmoke(context, -49, -170, time);
  context.restore();
 }
 function schedule() {
  if (!pending) pending = requestAnimationFrame(frame);
 }
 async function prepare() {
  if (sprites || loading || !art.naturalWidth || reduced.matches) return;
  loading = true;
  try {
   await art.decode();
   const [clean, cat, arm] = await Promise.all(['motion-plate.png','cat-motion.png','pipe-arm.png'].map(load));
   const plate = clippedLayer(clean, 292, 35,
    'M316 45 L356 41 365 65 364 128 357 149 333 156 309 144 300 135 305 127 323 126 325 104 316 84 Z ' +
    'M409 294 L413 255 418 220 425 185 427 152 447 150 464 164 478 159 498 145 510 147 516 178 522 197 532 229 544 265 544 299 523 305 429 307 Z', 3);
   const printer = clippedLayer(art, 0, 0,
    'M557 304 L557 247 Q558 226 576 223 L631 213 642 195 710 194 704 216 724 221 V316 L685 320 573 306 Z', .7);
   sprites = {plate, cat, arm, printer};
   schedule();
  } catch {
   // The original art and expression layer remain usable if an asset fails.
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
 new MutationObserver(sync).observe(office, {attributes:true, attributeFilter:['hidden']});
 sync();
}
