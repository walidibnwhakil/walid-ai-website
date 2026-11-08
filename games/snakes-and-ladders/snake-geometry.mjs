// Shared by the body mesh, head orientation and movement path. All points use board units.
export const HEAD_FRAME = Object.freeze({
  x: -5.75,
  y: -3.8,
  width: 11.5,
  height: 10,
  crop: 0.72,
});
export function snakeCurve(p, q, i, time = 0, motion = true) {
  const dx = q.x - p.x,
    dy = q.y - p.y,
    len = Math.hypot(dx, dy) || 1,
    wave = motion ? Math.sin(time / 900 + i) * 1.8 : 0,
    tailWave = motion ? Math.sin(time / 900 + i - 2.4) * 1.8 : 0,
    bend = (i % 2 ? 1 : -1) * Math.min(15, len * 0.48) + wave;
  return `M ${p.x} ${p.y} C ${p.x + dx * 0.25 - (dy / len) * bend} ${p.y + dy * 0.25 + (dx / len) * bend} ${q.x - dx * 0.25 + (dy / len) * (bend - wave + tailWave)} ${q.y - dy * 0.25 - (dx / len) * (bend - wave + tailWave)} ${q.x} ${q.y}`;
}
export function headPoseFromPath(d) {
  const [x, y, cx, cy, , , ex, ey] = d.match(/-?[\d.]+/g).map(Number);
  let dx = cx - x,
    dy = cy - y;
  if (Math.hypot(dx, dy) < 0.00001) {
    dx = ex - x;
    dy = ey - y;
  }
  const len = Math.hypot(dx, dy) || 1;
  return {
    x,
    y,
    tx: dx / len,
    ty: dy / len,
    angle: Math.atan2(dy, dx) - Math.PI / 2,
  };
}
export function headLocalToWorld(p, x, y) {
  const c = Math.cos(p.angle),
    s = Math.sin(p.angle);
  return { x: p.x + c * x - s * y, y: p.y + s * x + c * y };
}
export function headUvAtLocal(x, y) {
  return {
    u: 0.5 + x / HEAD_FRAME.width,
    v: (y - HEAD_FRAME.y) / HEAD_FRAME.height,
  };
}
