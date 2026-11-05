import {localPhotoPath} from './print-photo.js';
import {makeHandwriting} from './handwriting.js';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
 const t = clamp(value);
 return t * t * (3 - 2 * t);
};
const mix = (from, to, t) => from + (to - from) * t;
const note = {x:270, y:304, width:220, height:76};
const notebook = {x:220, y:261, width:270, height:119};
const writingArea = {x:245, y:281, width:238, height:76};
const slot = {x:618, y:288};
const pinch = {x:607, y:337};
const rest = {x:415, y:289};

function loadImage(path) {
 const image = new Image();
 image.src = path;
 return image.decode().then(() => image);
}

function drawNote(context, paper = note) {
 context.save();
 context.shadowColor = '#20130c88';
 context.shadowBlur = 6;
 context.shadowOffsetY = 3;
 context.fillStyle = '#f5e5bd';
 context.fillRect(paper.x, paper.y, paper.width, paper.height);
 context.restore();
 context.strokeStyle = '#93734d35';
 for (const y of [paper.y + 38, paper.y + 70]) {
  context.beginPath();
  context.moveTo(paper.x + 6, y);
  context.lineTo(paper.x + paper.width - 6, y);
  context.stroke();
 }
}

function drawPhoto(context, photo, x, y, angle, feed = 1) {
 context.save();
 context.translate(x, y);
 context.rotate(angle);
 // Keep the clipping edge fixed at the mouth while the stock advances.
 context.beginPath();
 context.rect(-50, 0, 100, 95);
 context.clip();
 context.translate(0, -64 * (1 - feed));
 context.fillStyle = '#fbedd1';
 context.fillRect(-32, 0, 64, 64);
 const ratio = Math.min(54 / photo.width, 52 / photo.height);
 const width = photo.width * ratio, height = photo.height * ratio;
 context.fillStyle = '#d9ccae';
 context.fillRect(-27, 4, 54, 52);
 context.drawImage(photo, -width / 2, 4 + (52 - height) / 2, width, height);
 context.restore();
}

// Skin the original crop through shared shoulder, elbow, cuff and grip joints.
// Each strip meets its neighbor at exactly the same joint in both spaces.
function drawLimb(context, image, joints, verticalScale) {
 for (let index = 1; index < joints.length; index++) {
  const [u, v, x, y] = joints[index - 1];
  const [nextU, nextV, nextX, nextY] = joints[index];
  const width = nextU - u;
  context.save();
  context.translate(x, y - v * verticalScale);
  context.transform((nextX - x) / width, (nextY - y - (nextV - v) * verticalScale) / width, 0, verticalScale, 0, 0);
  context.drawImage(image, u, 0, width, image.height, 0, 0, width, image.height);
  context.restore();
 }
}

function paintPatch(context, image, outline, source, destination) {
 context.save();
 context.clip(new Path2D(outline));
 context.drawImage(image, ...source, ...destination);
 context.restore();
}

function drawReach(context, art, plate, arm, x, y) {
 // Replace the folded sleeve and preserve the opposite resting hand.
 paintPatch(context, plate,
  'M343 197 Q365 198 385 227 Q409 243 419 273 L417 297 L357 298 Q366 287 351 273 L347 244Z',
  [118, 140, 91, 123], [332, 180, 91, 123]);
 const wristX = x - 53, wristY = y - 5;
 const reach = clamp((x - rest.x) / (pinch.x - rest.x));
 drawLimb(context, arm, [
  [0, 100, 343, 224],
  [275, 93, mix(360, wristX, .55), mix(262, wristY, .58) + 8 * (1 - reach)],
  [492, 78, wristX, wristY],
  [702, 96, x, y],
  [765, 96, x + 15, y],
 ], .33);
 paintPatch(context, art, 'M331 188Q340 194 348 204L351 244 346 257 332 258Z',
  [331, 188, 23, 72], [331, 188, 23, 72]);
}

function drawWritingArm(context, arm, x, y, amount) {
 const penX = mix(322, x, amount), penY = mix(293, y, amount);
 drawLimb(context, arm, [
  [0, 95, 150, 211],
  [175, 275, 184, mix(271, 286, amount)],
  [575, 258, penX - 64, penY - 14],
  [873, 315, penX, penY],
  [880, 315, penX + 2, penY],
 ], .26);
}

export function createGuessReveal(office) {
 const canvas = office.querySelector('.guess-reveal');
 const art = office.querySelector('.scene-art');
 const context = canvas.getContext('2d');
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let active, assets;

 function clear() {
  if (active) cancelAnimationFrame(active.frame);
  active = undefined;
  canvas.hidden = true;
  delete office.dataset.reveal;
 }

 function start(entry, name, onPhase) {
  if (active?.id === entry.id) return;
  clear();
  const run = active = {id:entry.id, phase:''};
  const phase = value => {
   if (run.phase === value) return;
   run.phase = value;
   office.dataset.reveal = value;
   onPhase(value);
  };
  phase('loading');
  const path = localPhotoPath(entry);
  const picture = path ? loadImage(path).catch(() => null) : Promise.resolve(null);
  const approved = file => loadImage('./images/approved/' + file + '.png');
  assets ??= Promise.allSettled(['writing-arm', 'reaching-arm', 'motion-plate'].map(approved));
  Promise.all([picture, assets, art.decode().catch(() => {})]).then(([photo, poses]) => {
   if (run !== active) return;
   if (!context) {
    phase('written');
    return;
   }
   const [writing, reaching, plate] = poses.map(result => result.value);
   const ink = makeHandwriting(name, context, writingArea);
   const end = photo ? 4070 : 490 + ink.duration + 520;
   let elapsed = 0, previous;
   canvas.hidden = false;

   function frame(now) {
    if (run !== active) return;
    elapsed = reduced.matches ? end : Math.min(end, elapsed + Math.min(64, now - (previous ?? now)));
    previous = now;
    context.clearRect(0, 0, 724, 404);
    if (photo) {
     const feed = clamp(elapsed / 1320);
     const reach = ease((elapsed - 880) / 810);
     const carry = ease((elapsed - 1690) / 1370);
     const settle = ease((elapsed - 3060) / 480);
     const retract = ease((elapsed - 3540) / 530);
     const x = mix(pinch.x, 404, carry);
     const y = mix(pinch.y, 292, carry) - Math.sin(carry * Math.PI) * 49 + settle * 16;
     phase(elapsed < 1320 ? 'feeding' : elapsed < 1690 ? 'reaching' :
      elapsed < 3540 ? 'carrying' : elapsed < end ? 'placing' : 'printed');
     if (elapsed >= 2680) {
      context.globalAlpha = ease((elapsed - 2680) / 380);
      drawNote(context);
      context.globalAlpha = 1;
     }
     if (elapsed < 1690) drawPhoto(context, photo, slot.x, slot.y, .22, feed);
     else drawPhoto(context, photo, x + mix(11, 0, carry), y - mix(49, 0, carry), mix(.22, -.1, carry));
     if (reaching && plate && reach > 0 && retract < 1 && art.naturalWidth) {
      const handX = elapsed < 1690 ? mix(rest.x, pinch.x, reach) : mix(x, rest.x, retract);
      const handY = elapsed < 1690 ? mix(rest.y, pinch.y, reach) - Math.sin(reach * Math.PI) * 19 : mix(y, rest.y, retract);
      drawReach(context, art, plate, reaching, handX, handY);
     }
    } else {
     drawNote(context, notebook);
     const amount = ease(elapsed / 490) * (1 - ease((elapsed - 490 - ink.duration) / 520));
     const tip = ink.draw(elapsed - 490);
     phase(elapsed < end ? 'writing' : 'written');
     if (writing && amount > 0) drawWritingArm(context, writing, ...tip, amount);
    }
    if (elapsed < end) run.frame = requestAnimationFrame(frame);
   }
   run.frame = requestAnimationFrame(frame);
  });
 }

 return {start, clear};
}
