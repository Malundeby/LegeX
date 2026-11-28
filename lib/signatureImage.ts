/**
 * Turns a photo of a signature on paper into a clean ink mask: the paper, uneven
 * light and shadows are removed, faint specks are dropped and the result is
 * cropped to the signature. Pure functions on RGBA pixel arrays, so the steps
 * can be tested without a browser. All of this runs on the user's device; the
 * photo itself is never uploaded.
 */

export interface Mask {
  width: number;
  height: number;
  /** 0 = transparent paper, 255 = full ink. */
  alpha: Uint8ClampedArray;
}

/** How dark each pixel is compared with the paper around it, 0..1. */
export function inkStrength(rgba: Uint8ClampedArray, width: number, height: number): Float32Array {
  const n = width * height;
  const gray = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    gray[i] = 0.299 * rgba[o] + 0.587 * rgba[o + 1] + 0.114 * rgba[o + 2];
  }

  // The paper's brightness: the brightest value in coarse blocks (pen lines are
  // thinner than a block), smoothed, so shadows and uneven light are followed.
  const block = Math.max(8, Math.round(Math.min(width, height) / 24));
  const bw = Math.ceil(width / block);
  const bh = Math.ceil(height / block);
  const coarse = new Float32Array(bw * bh);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let max = 0;
      const y1 = Math.min(height, (by + 1) * block);
      const x1 = Math.min(width, (bx + 1) * block);
      for (let y = by * block; y < y1; y++) {
        for (let x = bx * block; x < x1; x++) max = Math.max(max, gray[y * width + x]);
      }
      coarse[by * bw + bx] = max;
    }
  }
  const smooth = boxBlur(coarse, bw, bh, 1);

  const ink = new Float32Array(n);
  for (let y = 0; y < height; y++) {
    const fy = Math.min(bh - 1, Math.max(0, (y + 0.5) / block - 0.5));
    const y0 = Math.floor(fy);
    const y1 = Math.min(bh - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < width; x++) {
      const fx = Math.min(bw - 1, Math.max(0, (x + 0.5) / block - 0.5));
      const x0 = Math.floor(fx);
      const x1 = Math.min(bw - 1, x0 + 1);
      const tx = fx - x0;
      const bg =
        smooth[y0 * bw + x0] * (1 - tx) * (1 - ty) +
        smooth[y0 * bw + x1] * tx * (1 - ty) +
        smooth[y1 * bw + x0] * (1 - tx) * ty +
        smooth[y1 * bw + x1] * tx * ty;
      const i = y * width + x;
      ink[i] = bg > 1 ? Math.min(1, Math.max(0, 1 - gray[i] / bg)) : 0;
    }
  }

  // Stretch so the darkest ink is close to full strength, whatever the pen and light.
  const strong = Array.from(ink.filter((v) => v > 0.08)).sort((a, b) => a - b);
  const top = strong.length > 20 ? strong[Math.floor(strong.length * 0.95)] : 1;
  if (top > 0.05 && top < 1) for (let i = 0; i < n; i++) ink[i] = Math.min(1, ink[i] / top);
  return ink;
}

function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          sum += src[yy * w + xx];
          count++;
        }
      }
      out[y * w + x] = sum / count;
    }
  }
  return out;
}

/** A good starting threshold between paper and ink (Otsu's method), kept within sensible bounds. */
export function autoThreshold(ink: Float32Array): number {
  const bins = 64;
  const hist = new Array(bins).fill(0);
  for (const v of ink) hist[Math.min(bins - 1, Math.floor(v * bins))]++;
  const total = ink.length;
  let sumAll = 0;
  for (let i = 0; i < bins; i++) sumAll += i * hist[i];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestT = 0.3;
  for (let i = 0; i < bins; i++) {
    wB += hist[i];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += i * hist[i];
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      bestT = (i + 1) / bins;
    }
  }
  return Math.min(0.5, Math.max(0.12, bestT));
}

/**
 * Ink mask from ink strength: soft edges around the threshold, small specks
 * (dust, paper grain) removed, cropped to the signature with a small margin.
 * Returns null when nothing that looks like a signature is left.
 */
export function inkMask(ink: Float32Array, width: number, height: number, threshold: number): Mask | null {
  const n = width * height;
  const soft = 0.07;
  const alpha = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = (ink[i] - (threshold - soft)) / (2 * soft);
    alpha[i] = t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);
  }

  // Remove specks: connected areas of solid ink smaller than a dot would be.
  const minSize = Math.max(6, Math.round(n * 0.00002));
  const label = new Int32Array(n).fill(-1);
  const stack: number[] = [];
  const keep = new Uint8Array(n);
  for (let start = 0; start < n; start++) {
    if (alpha[start] < 0.5 || label[start] !== -1) continue;
    const members: number[] = [];
    label[start] = start;
    stack.push(start);
    let bx0 = width;
    let by0 = height;
    let bx1 = 0;
    let by1 = 0;
    while (stack.length) {
      const i = stack.pop()!;
      members.push(i);
      const x = i % width;
      const y = (i - x) / width;
      if (x < bx0) bx0 = x;
      if (x > bx1) bx1 = x;
      if (y < by0) by0 = y;
      if (y > by1) by1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= width || yy >= height) continue;
          const j = yy * width + xx;
          if (label[j] === -1 && alpha[j] >= 0.5) {
            label[j] = start;
            stack.push(j);
          }
        }
      }
    }
    // Not ink: a large, solid dark area that runs out of the picture (a table,
    // a finger, the edge of the paper). Pen strokes are thin, so they fill
    // little of the box around them.
    const touchesEdge = bx0 === 0 || by0 === 0 || bx1 === width - 1 || by1 === height - 1;
    const boxArea = (bx1 - bx0 + 1) * (by1 - by0 + 1);
    const solid = members.length > n * 0.004 && members.length > boxArea * 0.3;
    if (touchesEdge && solid) continue;
    if (members.length >= minSize) for (const i of members) keep[i] = 1;
  }
  // Soft edge pixels stay only next to kept ink.
  for (let i = 0; i < n; i++) {
    if (keep[i]) continue;
    if (alpha[i] >= 0.5) {
      alpha[i] = 0;
      continue;
    }
    if (alpha[i] === 0) continue;
    const x = i % width;
    const y = (i - x) / width;
    let near = false;
    for (let dy = -1; dy <= 1 && !near; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < width && yy < height && keep[yy * width + xx]) {
          near = true;
          break;
        }
      }
    }
    if (!near) alpha[i] = 0;
  }

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let inked = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha[y * width + x] > 0.25) {
        inked++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || inked < minSize * 2) return null;
  const pad = Math.max(2, Math.round(Math.min(width, height) * 0.01));
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(width - 1, maxX + pad);
  maxY = Math.min(height - 1, maxY + pad);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) out[y * w + x] = Math.round(alpha[(y + minY) * width + x + minX] * 255);
  }
  return { width: w, height: h, alpha: out };
}
