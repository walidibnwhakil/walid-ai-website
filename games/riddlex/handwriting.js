// Single-line pen paths in an 8 × 12 writing grid. Separate paths lift the nib.
const glyphs = {
 A:'M0 11L4 1 8 11 M2 7H6', B:'M1 11V1Q11 0 6 5Q12 9 5 11Z',
 C:'M8 3Q4 -2 1 4Q-2 12 8 10', D:'M1 11V1Q9 0 9 6Q9 11 1 11',
 E:'M8 1H1V11H8 M1 6H6', F:'M8 1H1V11 M1 6H6',
 G:'M8 3Q2 -2 1 6Q0 12 8 10V6H5', H:'M1 1V11 M8 1V11 M1 6H8',
 I:'M1 1H7 M4 1V11 M1 11H7', J:'M7 1V8Q6 14 1 9',
 K:'M1 1V11 M8 1L1 7 8 11', L:'M1 1V11H8',
 M:'M1 11V1L5 7 9 1V11', N:'M1 11V1L8 11V1',
 O:'M5 1C0 0 -2 11 4 11C11 12 11 0 5 1', P:'M1 11V1Q9 0 9 4Q9 7 1 6',
 Q:'M5 1C0 0 -2 11 4 11C11 12 11 0 5 1 M5 8L9 12', R:'M1 11V1Q9 0 9 4Q9 7 1 6L9 11',
 S:'M8 2Q2 -1 1 3Q0 5 5 6Q11 8 6 11Q2 12 0 9', T:'M0 1H9 M4 1V11',
 U:'M1 1V7Q1 12 5 11Q9 11 9 6V1', V:'M0 1L4 11 9 1',
 W:'M0 1L2 11 5 5 8 11 10 1', X:'M0 1L8 11 M8 1L0 11',
 Y:'M0 1L4 6 8 1 M4 6V11', Z:'M0 1H8L0 11H8',
 a:'M6 6Q1 3 0 8Q-1 13 5 10L6 6V10Q6 12 8 10', b:'M1 1V10Q2 4 6 5Q10 9 4 11Q2 12 1 10',
 c:'M7 6Q3 3 1 7Q-2 13 7 10', d:'M7 1V10Q7 12 9 10 M7 6Q1 3 0 8Q-1 13 7 9',
 e:'M1 8Q8 8 6 5Q3 3 1 7Q-1 13 8 10', f:'M1 14L3 4Q4 -1 8 2 M0 6H7',
 g:'M7 6Q1 3 0 8Q-1 13 7 9 M7 6L6 13Q4 17 0 14', h:'M1 1V11Q4 4 6 5Q8 5 7 10Q7 12 9 10',
 i:'M2 5L1 10Q1 12 4 10 M2 2l.3 .1', j:'M4 5L3 13Q2 16 0 14 M4 2l.3 .1',
 k:'M1 1V11 M7 5L2 8 8 11', l:'M3 1L1 9Q1 13 5 10',
 m:'M1 5V11Q3 4 5 5Q7 6 5 11Q8 4 10 5Q12 6 10 11', n:'M1 5V11Q4 4 6 5Q8 5 7 10Q7 12 9 10',
 o:'M4 5Q0 5 0 9Q0 13 5 10Q9 7 5 5Z', p:'M1 5V15 M1 8Q5 3 7 6Q10 11 1 11',
 q:'M7 6Q1 3 0 8Q-1 13 6 9 M7 5L6 15', r:'M1 5V11Q3 4 7 6',
 s:'M7 6Q3 3 1 6Q0 8 5 8Q8 10 3 11Q1 11 0 10', t:'M3 2L2 9Q1 13 7 10 M0 5H7',
 u:'M1 5Q-1 13 4 11Q7 10 7 5V10Q7 12 9 10', v:'M0 5L2 11Q6 10 8 5',
 w:'M0 5L1 11Q4 11 5 6L6 11Q9 11 11 5', x:'M1 5L7 11 M7 5L0 11',
 y:'M0 5Q0 14 7 8 M8 5L6 12Q4 17 0 14', z:'M0 5H7L0 11H7',
 '-':'M1 7H7', '.':'M2 11l.3 .1', "'":'M3 2L2 5',
};
const namespace = 'http://www.w3.org/2000/svg';

export function makeHandwriting(name, context, paper) {
 const letters = Array.from(name.normalize('NFC'));
 const columns = Math.max(10, Math.ceil(letters.length / 2));
 const scale = Math.min(2, (paper.width - 18) / (columns * 10));
 const rows = letters.length > columns ? 2 : 1;
 const pen = [];
 let duration = 0;
 for (let index = 0; index < letters.length; index++) {
  const letter = letters[index];
  const x = paper.x + 9 + index % columns * 10 * scale;
  const y = paper.y + 8 + Math.floor(index / columns) * (paper.height - 12) / rows;
  const pathData = glyphs[letter];
  const strokes = pathData?.split(/ (?=M)/).map(data => {
   const path = document.createElementNS(namespace, 'path');
   path.setAttribute('d', data);
   return {path, length:path.getTotalLength()};
  });
  const length = strokes?.reduce((total, stroke) => total + stroke.length, 0) || 10;
  const ms = Math.min(135, Math.max(55, length * 4));
  pen.push({letter, x, y, strokes, length, ms, start:duration});
  duration += ms;
 }

 return {
  duration,
  draw(elapsed) {
   let tip = [paper.x + 9, paper.y + 8];
   context.save();
   context.strokeStyle = context.fillStyle = '#33271e';
   context.lineWidth = Math.max(.65, scale * .66);
   context.lineCap = context.lineJoin = 'round';
   for (const {letter, x, y, strokes, length, ms, start} of pen) {
    if (elapsed < start) break;
    const fraction = Math.min(1, (elapsed - start) / ms);
    if (!strokes) {
     context.font = `italic ${scale * 11}px "Segoe Print", cursive`;
     context.save();
     context.beginPath();
     context.rect(x, y - scale * 3, fraction * scale * 11, scale * 18);
     context.clip();
     context.fillText(letter, x, y + scale * 11, scale * 10);
     context.restore();
     tip = [x + fraction * scale * 10, y + scale * 11];
     continue;
    }
    let remaining = length * fraction;
    for (const {path, length:strokeLength} of strokes) {
     if (remaining <= 0) break;
     const end = Math.min(remaining, strokeLength);
     const steps = Math.ceil(end / .7);
     context.beginPath();
     for (let step = 0; step <= steps; step++) {
      const point = path.getPointAtLength(end * step / steps);
      tip = [x + (point.x + (11 - point.y) * .19) * scale, y + point.y * scale];
      if (step === 0) context.moveTo(...tip);
      else context.lineTo(...tip);
     }
     context.stroke();
     remaining -= end;
    }
   }
   context.restore();
   return tip;
  },
 };
}
