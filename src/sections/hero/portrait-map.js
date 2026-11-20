// The portrait as data. assets/portrait-map.png is baked from the photograph by tools/bake_portrait.py:
// red is tone, green is depth and blue is the outline. The hero samples it to decide where letters go.
// Portrait space: y runs from -1 (bottom) to 1 (top), x from -aspect to aspect.

import { clamp } from '../../lib/util.js';

/** How far the nose stands in front of the outline, in portrait units. */
const RELIEF = 0.46;

const smooth = (from, to, value) => {
  const t = clamp((value - from) / (to - from), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Load the baked map and unpack it into one array per channel. */
export function loadPortraitMap(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const w = image.naturalWidth;
      const h = image.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, w, h);
      const pixels = ctx.getImageData(0, 0, w, h).data;
      const n = w * h;
      const map = {
        w,
        h,
        aspect: w / h,
        tone: new Float32Array(n),
        depth: new Float32Array(n),
        alpha: new Float32Array(n),
      };
      for (let i = 0; i < n; i++) {
        map.tone[i] = pixels[i * 4] / 255;
        map.depth[i] = pixels[i * 4 + 1] / 255;
        map.alpha[i] = pixels[i * 4 + 2] / 255;
      }
      resolve(map);
    };
    image.onerror = () => reject(new Error(`could not load ${url}`));
    image.src = url;
  });
}

/** One channel of the map at (u, v), both 0 to 1, with bilinear filtering. */
function sample(map, field, u, v) {
  const fx = clamp(u, 0, 1) * (map.w - 1);
  const fy = clamp(v, 0, 1) * (map.h - 1);
  const x0 = Math.floor(fx);
  const y0 = Math.floor(fy);
  const x1 = Math.min(map.w - 1, x0 + 1);
  const y1 = Math.min(map.h - 1, y0 + 1);
  const tx = fx - x0;
  const ty = fy - y0;
  const top = field[y0 * map.w + x0] * (1 - tx) + field[y0 * map.w + x1] * tx;
  const bottom = field[y1 * map.w + x0] * (1 - tx) + field[y1 * map.w + x1] * tx;
  return top * (1 - ty) + bottom * ty;
}

// The bust is cut off by the photo's edge; let it thin out there instead of ending in a line.
function edgeFade(u, v) {
  let fade = 1 - smooth(0.7, 1.0, v);
  if (v > 0.6) fade *= smooth(0, 0.16, u) * smooth(0, 0.16, 1 - u);
  return fade;
}

/** How much ink the portrait wants at (u, v): 0 on paper, 1 in the darkest hair. */
export function inkAt(map, u, v, floor, gamma) {
  if (sample(map, map.alpha, u, v) < 0.5) return 0;
  const dark = 1 - sample(map, map.tone, u, v);
  return (floor + (1 - floor) * dark ** gamma) * edgeFade(u, v);
}

/** Write the position of the surface at (u, v) into dot `i` of a dot set. Depth is kept, so the head can turn. */
export function writeSurface(map, u, v, dots, i) {
  dots.B[i * 3] = (u * 2 - 1) * map.aspect;
  dots.B[i * 3 + 1] = 1 - v * 2;
  dots.B[i * 3 + 2] = sample(map, map.depth, u, v) * RELIEF;
}
