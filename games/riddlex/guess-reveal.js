import {localPhotoPath} from './print-photo.js';
import {makeHandwriting} from './handwriting.js?v=desk-reveal';

const clamp = value => Math.max(0, Math.min(1, value));
const ease = value => {
 const t = clamp(value);
 return t * t * (3 - 2 * t);
};
const mix = (from, to, t) => from + (to - from) * t;
const paper = {x:-108, y:-37, width:216, height:74};
const slot = {x:618, y:289};

function loadImage(path) {
 const image = new Image();
 image.src = path;
 return image.decode().then(() => image);
}

function drawNote(context, ink, elapsed) {
 context.save();
 context.shadowColor = '#20130c80';
 context.shadowBlur = 6;
 context.shadowOffsetY = 3;
 context.fillStyle = '#f8e8c4';
 context.fillRect(paper.x, paper.y, paper.width, paper.height);
 context.restore();
 context.strokeStyle = '#93734d55';
 context.strokeRect(paper.x + 4, paper.y + 4, paper.width - 8, paper.height - 8);
 return ink.draw(elapsed);
}

function drawPhoto(context, photo, x, y, angle, feed = 1) {
 context.save();
 context.translate(x, y);
 context.rotate(angle);
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

// The sleeve, cuff and grip share joints as the wrist moves.
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

function coverArm(context, art, side) {
 if (!art.naturalWidth) return;
 context.save();
 if (side === 'writing') {
  context.clip(new Path2D('M207 272Q249 266 278 266L311 261Q333 262 347 281L346 299L205 301Z'));
  context.drawImage(art, 205, 304, 145, 31, 205, 260, 145, 43);
 } else {
  context.clip(new Path2D('M355 272Q384 270 406 275L415 291L411 299L353 300Z'));
  context.drawImage(art, 354, 299, 62, 24, 353, 273, 63, 28);
 }
 context.restore();
}

function drawReach(context, arm, x, y) {
 const wristX = x - 52, wristY = y - 5;
 drawLimb(context, arm, [
  [0, 100, 347, 224],
  [275, 93, mix(374, 404, clamp((x - 411) / 170)), mix(261, wristY, .45)],
  [492, 78, wristX, wristY],
  [702, 96, x, y],
  [765, 96, x + 15, y],
 ], .37);
}

function drawWritingArm(context, arm, x, y) {
 drawLimb(context, arm, [
  [0, 95, 156, 215],
  [175, 275, Math.min(187, x - 77), 278],
  [575, 258, x - 60, y - 15],
  [873, 315, x, y],
  [880, 315, x + 2, y],
 ], .25);
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
  if (!context) {
   phase('written');
   return;
  }
  const path = localPhotoPath(entry);
  const picture = path ? loadImage(path).catch(() => null) : Promise.resolve(null);
  const approved = file => loadImage('./images/approved/' + file + '.png').catch(() => null);
  assets ??= Promise.all(['writing-arm', 'reaching-arm'].map(approved));
  Promise.all([picture, assets]).then(([photo, [writing, reaching]]) => {
   if (run !== active) return;
   const ink = makeHandwriting(name, context, paper);
   const writingEnd = 360 + ink.duration + 420;
   const pickup = writingEnd + (photo ? 1500 : 0);
   const turn = pickup + (photo ? 1000 : 400);
   const placed = turn + 1050;
   const end = placed + 480;
   let elapsed = 0, previous;
   canvas.hidden = false;

   function frame(now) {
    if (run !== active) return;
    elapsed = reduced.matches ? end : Math.min(end, elapsed + Math.min(64, now - (previous ?? now)));
    previous = now;
    const turnAmount = ease((elapsed - turn) / (placed - turn));
    const rotation = mix(-.40, 0, turnAmount);
    const centerX = mix(320, photo ? 390 : 436, turnAmount);
    const centerY = mix(320, 348, turnAmount) - Math.sin(turnAmount * Math.PI) * 19;
    const tilt = mix(.59, .82, turnAmount) - Math.sin(turnAmount * Math.PI) * .12;
    const pointOnDesk = (x, y) => [centerX + x * Math.cos(rotation) - y * Math.sin(rotation),
     centerY + (x * Math.sin(rotation) + y * Math.cos(rotation)) * tilt];
    const writingHold = writing && elapsed >= 360 && elapsed < writingEnd;
    const amount = 1 - ease((elapsed - 360 - ink.duration) / 420);
    const reachStart = photo ? pickup - 520 : pickup;
    const reachingHold = reaching && elapsed > reachStart && elapsed < end;
    const arrive = ease((elapsed - reachStart) / (photo ? 520 : 400));
    const leave = ease((elapsed - placed) / 480);
    const reachOpacity = Math.min(1, arrive * 4, (1 - leave) * 4);
    context.clearRect(0, 0, 724, 404);
    if (writingHold || reachingHold) {
     context.save();
     context.globalAlpha = writingHold ? Math.min(1, amount * 3) : reachOpacity;
     coverArm(context, art, writingHold ? 'writing' : 'reaching');
     context.restore();
    }
    context.save();
    context.translate(centerX, centerY);
    context.scale(1, tilt);
    context.rotate(rotation);
    const tip = drawNote(context, ink, elapsed - 360);
    context.restore();

    const carry = ease((elapsed - pickup) / (turn - pickup));
    // Keep the held photo at the fingertips, then slide its border against the note.
    const [stackX, stackY] = pointOnDesk(132, -39);
    const photoX = mix(slot.x, stackX, carry);
    const photoTop = mix(slot.y, stackY, carry) - Math.sin(carry * Math.PI) * 31;
    const photoAngle = mix(.20, rotation + .055, carry);
    if (photo && elapsed >= writingEnd) {
     const feed = clamp((elapsed - writingEnd) / 1250);
     drawPhoto(context, photo, photoX, photoTop, photoAngle, elapsed < pickup ? feed : 1);
    }

    if (writingHold && tip) {
     context.save();
     context.globalAlpha = Math.min(1, amount * 3);
     const [x, y] = pointOnDesk(...tip);
     drawWritingArm(context, writing, mix(328, x, amount), mix(286, y, amount));
     context.restore();
    }
    if (reachingHold) {
     const [noteX, noteY] = pointOnDesk(102, 24);
     const gripX = photo ? photoX - Math.sin(photoAngle) * 55 : noteX;
     const gripY = photo ? photoTop + Math.cos(photoAngle) * 55 : noteY;
     context.save();
     context.globalAlpha = reachOpacity;
     drawReach(context, reaching, mix(mix(405, gripX, arrive), 405, leave),
      mix(mix(285, gripY, arrive), 285, leave));
     context.restore();
    }

    phase(elapsed >= end ? (photo ? 'printed' : 'written') : elapsed >= turn ? 'turning' :
     elapsed >= pickup ? (photo ? 'carrying' : 'reaching') : elapsed >= pickup - 520 ? 'reaching' :
     elapsed >= writingEnd ? 'feeding' : 'writing');
    if (elapsed < end) run.frame = requestAnimationFrame(frame);
   }
   run.frame = requestAnimationFrame(frame);
  });
 }

 return {start, clear};
}
