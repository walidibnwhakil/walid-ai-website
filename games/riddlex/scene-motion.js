// Coordinates are measured on seated-office.jpg (724 × 404).
// Each control moves nearby pixels, with a smooth falloff to the original art.
const controls = [
 // Fedora and head, upper torso, left eye, right eye, and mouth corners.
 [250, 102, 76, 73], [266, 191, 75, 69],
 [252, 112, 15, 10], [291, 102, 13, 9],
 [251, 147, 24, 14], [299, 132, 14, 10],
 // Cat's head and ears. Its paws and the desktop are outside these regions.
 [469, 189, 56, 63], [440, 163, 18, 20], [495, 161, 20, 20],
];
const still = controls.map(() => [0, 0]);
const pleased = [[1,-4],[1,-2],[0,2],[0,1],[0,-5],[1,-3],[0,-1],[0,0],[0,0]];
const disappointed = [[3,7],[0,3],[0,2],[0,2],[0,4],[-2,3],[0,25],[-4,9],[5,9]];
const curious = [[-3,3],[-1,2],[-1,0],[-1,0],[0,0],[0,0],[1,2],[1,-1],[-1,-1]];
const region = {x:146, y:27, width:410, height:283};

const keyframes = [
 {name:"pleased", x:210, y:79},
 {name:"disappointed", x:170, y:29},
 {name:"cat-lowered", x:408, y:136},
];

export function animateOffice(office) {
 const art = office.querySelector(".scene-art");
 const layer = office.querySelector(".scene-motion");
 const props = office.querySelector(".scene-props");
 const {x, y, width, height} = region;
 layer.width = width;
 layer.height = height;
 Object.assign(layer.style, {
  left: x / 724 * 100 + "%", top: y / 404 * 100 + "%",
  width: width / 724 * 100 + "%", height: height / 404 * 100 + "%",
 });
 const context = layer.getContext("2d", {willReadFrequently:true});
 if (!context) return;

 function start() {
  const assets = keyframes.map(frame => {
   const image = new Image();
   image.addEventListener("load", schedule, {once:true});
   image.src = "./images/approved/" + frame.name + ".png";
   return {...frame, image};
  });
  context.drawImage(art, x, y, width, height, 0, 0, width, height);
  const source = context.getImageData(0, 0, width, height).data;
  const frame = context.createImageData(width, height);
  const weights = controls.map(([cx, cy, rx, ry]) => Float32Array.from(
   {length: width * height}, (_, pixel) => {
    const distance = ((x + pixel % width - cx) / rx) ** 2 +
     ((y + Math.floor(pixel / width) - cy) / ry) ** 2;
    const influence = Math.max(0, 1 - distance);
    return influence * influence;
   }
  ));
  const moving = Array.from(source.keys()).filter(offset =>
   offset % 4 === 0 && weights.some(field => field[offset / 4])
  );
  frame.data.set(source);

  function draw(pose, opacity) {
   const movingControls = props && !props.hidden ? 6 : controls.length;
   for (const offset of moving) {
    const pixel = offset / 4;
    let sx = pixel % width;
    let sy = Math.floor(pixel / width);
    for (let control = 0; control < movingControls; control++) {
     const weight = weights[control][pixel];
     sx -= weight * pose[control][0];
     sy -= weight * pose[control][1];
    }
    const column = Math.floor(sx);
    const row = Math.floor(sy);
    const fractionX = sx - column;
    const fractionY = sy - row;
    const top = (row * width + column) * 4;
    const bottom = top + width * 4;
    for (let channel = 0; channel < 3; channel++) {
     const above = source[top + channel] * (1 - fractionX) + source[top + 4 + channel] * fractionX;
     const below = source[bottom + channel] * (1 - fractionX) + source[bottom + 4 + channel] * fractionX;
     frame.data[offset + channel] = above * (1 - fractionY) + below * fractionY;
    }
   }
   context.putImageData(frame, 0, 0);
   assets.forEach(({image, x: left, y: top}, index) => {
    if (!image.naturalWidth || opacity[index] <= 0 || index === 2 && props && !props.hidden) return;
    context.globalAlpha = opacity[index];
    context.drawImage(image, left - x, top - y);
   });
   context.globalAlpha = 1;
  }

  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  let mood;
  let from = still;
  let opacity = [0,0,0];
  let fromOpacity = opacity;
  let pose = still;
  let changedAt = 0;
  let pending = 0;
  let lastFrame = -Infinity;

  function tick(now) {
   pending = 0;
   if (office.hidden || document.hidden) return;
   if (now - lastFrame < 32) {
    schedule();
    return;
   }
   lastFrame = now;
   const nextMood = office.dataset.mood;
   if (mood !== nextMood) {
    mood = nextMood;
    from = pose;
    fromOpacity = opacity;
    changedAt = now;
   }
   const idle = mood === "ready" || mood === "thinking" || mood === "guess";
   const elapsed = now - changedAt;
   const target = mood === "happy" ? pleased :
    mood === "wrong" || mood === "unsure" ? disappointed : curious;
   const blend = reduced.matches ? 1 : Math.min(elapsed / 620, 1);
   const ease = blend * blend * (3 - 2 * blend);
   const amount = idle ? (reduced.matches ? 0 : (1 - Math.cos(elapsed / 560)) / 2) : 1;
   pose = target.map(([dx, dy], i) => [
    from[i][0] * (1 - ease) + dx * amount * ease,
    from[i][1] * (1 - ease) + dy * amount * ease,
   ]);
   const wrong = mood === "wrong" || mood === "unsure";
   const visible = [mood === "happy", wrong, wrong];
   opacity = visible.map((show, i) => {
    // Let the cat dip its head before revealing the tucked pose.
    const mix = i === 2 && show ? Math.max(0, (ease - .35) / .65) : ease;
    return fromOpacity[i] * (1 - mix) + Number(show) * mix;
   });
   layer.hidden = reduced.matches && idle;
   if (!layer.hidden) draw(pose, opacity);
   if (!reduced.matches && (idle || blend < 1)) schedule();
  }

  function schedule() {
   if (!pending) pending = requestAnimationFrame(tick);
  }

  new MutationObserver(schedule).observe(office, {
   attributes:true, attributeFilter:["data-mood", "hidden"],
  });
  document.addEventListener("visibilitychange", schedule);
  reduced.addEventListener("change", schedule);

  schedule();
 }

 if (art.naturalWidth) start();
 else art.addEventListener("load", start, {once:true});
}
