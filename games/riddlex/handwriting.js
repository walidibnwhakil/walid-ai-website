export function makeHandwriting(name, context, paper) {
 const words = name.trim().split(/\s+/);
 const lines = [name];
 if (name.length > 21 && words.length > 1) {
  let split = 1;
  while (split < words.length - 1 && words.slice(0, split).join(' ').length < name.length / 2) split++;
  lines.splice(0, 1, words.slice(0, split).join(' '), words.slice(split).join(' '));
 }
 const font = 'Georgia, "Times New Roman", serif';
 const size = lines.length === 1 ? 28 : 23;
 context.font = `italic 600 ${size}px ${font}`;
 const width = paper.width - 24;
 const measured = lines.map(line => context.measureText(line).width);
 const duration = Math.min(2600, Math.max(850, name.length * 100));

 return {
  duration,
  draw(elapsed) {
   const progress = Math.max(0, Math.min(1, elapsed / duration)) * lines.length;
   let tip;
   context.save();
   context.font = `italic 600 ${size}px ${font}`;
   context.fillStyle = '#302318';
   lines.forEach((line, index) => {
    if (progress < index) return;
    const length = Math.min(width, measured[index]);
    const x = paper.x + (paper.width - length) / 2;
    const y = paper.y + (lines.length === 1 ? 48 : 31 + index * 26);
    const fraction = Math.min(1, progress - index);
    tip = [x + length * fraction, y - 5 - Math.sin(fraction * line.length * Math.PI) * 5];
    context.save();
    if (fraction < 1) {
     context.beginPath();
     context.rect(x - 5, y - size, length * fraction + 5, size + 10);
     context.clip();
    }
    context.fillText(line, x, y, width);
    context.restore();
   });
   context.restore();
   return tip;
  },
 };
}
