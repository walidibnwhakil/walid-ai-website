// Full-resolution matte cleanup. The model returns a low-resolution alpha;
// these steps snap that alpha to the photo and remove the background color
// that would otherwise fringe hair, fur, and product edges.

export function luminance(rgba, width, height) {
  const out = new Float32Array(width * height);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    out[i] = (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;
  }
  return out;
}

function boxMean(src, width, height, radius) {
  const stride = width + 1;
  const integral = new Float64Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    const srcRow = y * width;
    const below = (y + 1) * stride;
    const above = y * stride;
    for (let x = 0; x < width; x++) {
      row += src[srcRow + x];
      integral[below + x + 1] = integral[above + x + 1] + row;
    }
  }
  const out = new Float32Array(width * height);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const y1s = (y1 + 1) * stride;
    const y0s = y0 * stride;
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum = integral[y1s + x1 + 1] - integral[y0s + x1 + 1] - integral[y1s + x0] + integral[y0s + x0];
      out[y * width + x] = sum / area;
    }
  }
  return out;
}

function product(a, b) {
  const out = new Float32Array(a.length);
  for (let i = 0; i < a.length; i++) out[i] = a[i] * b[i];
  return out;
}

// He et al. guided filter. `guide` and `src` are Float32 images in 0..1.
export function guidedFilter(guide, src, width, height, radius, eps) {
  const meanI = boxMean(guide, width, height, radius);
  const meanP = boxMean(src, width, height, radius);
  const corrI = boxMean(product(guide, guide), width, height, radius);
  const corrIP = boxMean(product(guide, src), width, height, radius);
  const a = new Float32Array(src.length);
  const b = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const varI = Math.max(0, corrI[i] - meanI[i] * meanI[i]);
    const covIP = corrIP[i] - meanI[i] * meanP[i];
    a[i] = covIP / (varI + eps);
    b[i] = meanP[i] - a[i] * meanI[i];
  }
  const meanA = boxMean(a, width, height, radius);
  const meanB = boxMean(b, width, height, radius);
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) {
    const value = meanA[i] * guide[i] + meanB[i];
    out[i] = value < 0 ? 0 : value > 1 ? 1 : value;
  }
  return out;
}

function clampByte(value) {
  return value < 0 ? 0 : value > 255 ? 255 : value;
}

// Pull background color out of semi-transparent edge pixels, and drop alpha
// where a pixel is still basically the nearby background.
function nearBackground(alpha, width, height, radius) {
  const low = new Uint8Array(alpha.length);
  for (let i = 0; i < alpha.length; i++) if (alpha[i] < 0.08) low[i] = 1;
  const stride = width + 1;
  const integral = new Uint32Array(stride * (height + 1));
  for (let y = 0; y < height; y++) {
    let row = 0;
    for (let x = 0; x < width; x++) {
      row += low[y * width + x];
      integral[(y + 1) * stride + x + 1] = integral[y * stride + x + 1] + row;
    }
  }
  const near = new Uint8Array(alpha.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      const sum = integral[(y1 + 1) * stride + x1 + 1] - integral[y0 * stride + x1 + 1] - integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
      if (sum > 0) near[y * width + x] = 1;
    }
  }
  return near;
}

// Fill small transparent pockets that are fully surrounded by the subject.
// Large openings, such as the space between an arm and a torso, stay open.
export function fillEnclosedHoles(alpha, width, height, maxArea) {
  const count = width * height;
  const outside = new Uint8Array(count);
  const stack = [];
  const consider = (x, y) => {
    const index = y * width + x;
    if (!outside[index] && alpha[index] < 0.5) stack.push(index);
  };
  for (let x = 0; x < width; x++) {
    consider(x, 0);
    consider(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    consider(0, y);
    consider(width - 1, y);
  }
  while (stack.length) {
    const index = stack.pop();
    if (outside[index] || alpha[index] >= 0.5) continue;
    outside[index] = 1;
    const x = index % width;
    const y = (index / width) | 0;
    if (x > 0) stack.push(index - 1);
    if (x + 1 < width) stack.push(index + 1);
    if (y > 0) stack.push(index - width);
    if (y + 1 < height) stack.push(index + width);
  }
  const seen = new Uint8Array(count);
  for (let start = 0; start < count; start++) {
    if (seen[start] || outside[start] || alpha[start] >= 0.5) continue;
    const cells = [start];
    seen[start] = 1;
    for (let head = 0; head < cells.length; head++) {
      const index = cells[head];
      const x = index % width;
      const y = (index / width) | 0;
      const next = [];
      if (x > 0) next.push(index - 1);
      if (x + 1 < width) next.push(index + 1);
      if (y > 0) next.push(index - width);
      if (y + 1 < height) next.push(index + width);
      for (const neighbor of next) {
        if (seen[neighbor] || outside[neighbor] || alpha[neighbor] >= 0.5) continue;
        seen[neighbor] = 1;
        cells.push(neighbor);
      }
    }
    if (cells.length <= maxArea) {
      for (const index of cells) alpha[index] = 1;
    }
  }
}

export function decontaminate(rgba, alpha, width, height) {
  const fringe = nearBackground(alpha, width, height, 8);
  const cell = 32;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const count = new Uint32Array(cols * rows);
  const sumR = new Float64Array(cols * rows);
  const sumG = new Float64Array(cols * rows);
  const sumB = new Float64Array(cols * rows);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > 0.06) continue;
      const bin = (Math.floor(y / cell) * cols) + Math.floor(x / cell);
      const p = (y * width + x) * 4;
      sumR[bin] += rgba[p];
      sumG[bin] += rgba[p + 1];
      sumB[bin] += rgba[p + 2];
      count[bin]++;
    }
  }
  for (let y = 0; y < height; y++) {
    const gy = Math.floor(y / cell);
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const a0 = alpha[i];
      if (!fringe[i] || a0 <= 0.04 || a0 >= 0.94) continue;
      const gx = Math.floor(x / cell);
      let best = -1;
      let bestD = 1e9;
      for (let oy = -2; oy <= 2; oy++) {
        const cy = gy + oy;
        if (cy < 0 || cy >= rows) continue;
        for (let ox = -2; ox <= 2; ox++) {
          const cx = gx + ox;
          if (cx < 0 || cx >= cols) continue;
          const bin = cy * cols + cx;
          if (count[bin] < 12) continue;
          const dist = ox * ox + oy * oy;
          if (dist < bestD) {
            bestD = dist;
            best = bin;
          }
        }
      }
      if (best < 0) continue;
      const br = sumR[best] / count[best];
      const bg = sumG[best] / count[best];
      const bb = sumB[best] / count[best];
      const p = i * 4;
      const colorDist = Math.hypot(rgba[p] - br, rgba[p + 1] - bg, rgba[p + 2] - bb) / 441.67295593;
      let a = a0;
      if (colorDist < 0.18 && a < 0.72) a *= colorDist / 0.18;
      if (a < 0.03) a = 0;
      alpha[i] = a;
      if (a > 0.12) {
        const inv = 1 - a;
        rgba[p] = clampByte((rgba[p] - br * inv) / a);
        rgba[p + 1] = clampByte((rgba[p + 1] - bg * inv) / a);
        rgba[p + 2] = clampByte((rgba[p + 2] - bb * inv) / a);
      }
    }
  }
}

export function refineAlpha(alpha, rgba, width, height) {
  const radius = Math.max(2, Math.min(10, Math.round(Math.min(width, height) / 200)));
  const guided = guidedFilter(luminance(rgba, width, height), alpha, width, height, radius, 0.0015);
  for (let i = 0; i < guided.length; i++) {
    const value = guided[i];
    guided[i] = value > 0.985 ? 1 : value < 0.02 ? 0 : value;
  }
  decontaminate(rgba, guided, width, height);
  return guided;
}

export function bounds(alpha, width, height, threshold) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  const step = Math.max(1, Math.floor(Math.min(width, height) / 400));
  for (let y = 0; y < height; y += step) {
    const row = y * width;
    for (let x = 0; x < width; x += step) {
      if (alpha[row + x] < threshold) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export function subjectCrop(alpha, width, height) {
  const box = bounds(alpha, width, height, 0.5);
  if (!box) return null;
  const padX = Math.round(box.w * 0.14);
  const padY = Math.round(box.h * 0.14);
  const x = Math.max(0, box.x - padX);
  const y = Math.max(0, box.y - padY);
  const x2 = Math.min(width, box.x + box.w + padX);
  const y2 = Math.min(height, box.y + box.h + padY);
  const crop = { x, y, w: x2 - x, h: y2 - y };
  if (crop.w < 64 || crop.h < 64) return null;
  const gain = Math.max(width, height) / Math.max(crop.w, crop.h);
  if (gain < 1.35) return null;
  return crop;
}

export function pickTiles(alpha, width, height, count, tile) {
  const step = Math.max(48, Math.round(tile / 2));
  const scored = [];
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const x1 = Math.min(width, x + tile);
      const y1 = Math.min(height, y + tile);
      let edges = 0;
      for (let yy = y; yy < y1; yy += 2) {
        const row = yy * width;
        const down = yy + 1 < y1 ? (yy + 1) * width : row;
        for (let xx = x; xx < x1; xx += 2) {
          const value = alpha[row + xx];
          const right = xx + 1 < x1 ? alpha[row + xx + 1] : value;
          const below = alpha[down + xx];
          if (Math.abs(value - right) > 0.08 || Math.abs(value - below) > 0.08) edges++;
        }
      }
      if (edges > 30) scored.push({ x, y, w: x1 - x, h: y1 - y, ratio: edges });
    }
  }
  scored.sort((a, b) => b.ratio - a.ratio);
  const chosen = [];
  for (const candidate of scored) {
    if (chosen.length >= count) break;
    const overlaps = chosen.some(other => {
      const x = Math.max(candidate.x, other.x);
      const y = Math.max(candidate.y, other.y);
      const x2 = Math.min(candidate.x + candidate.w, other.x + other.w);
      const y2 = Math.min(candidate.y + candidate.h, other.y + other.h);
      if (x2 <= x || y2 <= y) return false;
      const inter = (x2 - x) * (y2 - y);
      return inter / (candidate.w * candidate.h) > 0.35;
    });
    if (!overlaps) chosen.push(candidate);
  }
  return chosen;
}

export function pasteAlpha(dest, destW, destH, src, srcW, rect, feather, coarse) {
  for (let y = 0; y < rect.h; y++) {
    const dy = rect.y + y;
    if (dy < 0 || dy >= destH) continue;
    const yEdge = Math.min(y, rect.h - 1 - y);
    for (let x = 0; x < rect.w; x++) {
      const dx = rect.x + x;
      if (dx < 0 || dx >= destW) continue;
      const edge = Math.min(Math.min(x, rect.w - 1 - x), yEdge);
      const edgeWeight = feather <= 0 ? 1 : Math.max(0, Math.min(1, edge / feather));
      const index = dy * destW + dx;
      let weight = edgeWeight;
      if (coarse) {
        const center = Math.abs(coarse[index] - 0.5) * 2;
        const uncertainty = center >= 1 ? 0 : 1 - center;
        weight *= uncertainty;
      }
      dest[index] = dest[index] * (1 - weight) + src[y * srcW + x] * weight;
    }
  }
}

export function applyMatte(rgba, alpha) {
  const out = new Uint8ClampedArray(rgba.length);
  for (let i = 0, p = 0; i < alpha.length; i++, p += 4) {
    const value = alpha[i] < 0 ? 0 : alpha[i] > 1 ? 1 : alpha[i];
    out[p] = rgba[p];
    out[p + 1] = rgba[p + 1];
    out[p + 2] = rgba[p + 2];
    out[p + 3] = Math.round(value * 255);
  }
  return out;
}
