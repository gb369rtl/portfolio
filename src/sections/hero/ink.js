// Turns a piece of the page into pixels. The element is redrawn on a hidden canvas exactly where the browser
// set it (each character at its own measured box, plus any shape marked with data-ink), and a dot is kept
// wherever there is ink. The hero flies those dots in from the ring, then swaps them for the real element.
//
// data-ink on an element says how its shape is drawn:
//   fill    a solid box (text inside is cut out of it)      line    the box's outline
//   dot     a filled circle                                 icon    an <svg> with one filled <path>
//   stroke  an <svg> with one stroked <path>

const OVERSAMPLE = 2;
const MARGIN = 4;

function drawShapes(ctx, el) {
  el.querySelectorAll('[data-ink]').forEach((shape) => {
    const box = shape.getBoundingClientRect();
    const kind = shape.dataset.ink;
    if (kind === 'fill') {
      ctx.fillRect(box.left, box.top, box.width, box.height);
    } else if (kind === 'line') {
      ctx.lineWidth = 2;
      ctx.strokeRect(box.left + 1, box.top + 1, box.width - 2, box.height - 2);
    } else if (kind === 'dot') {
      ctx.beginPath();
      ctx.arc(box.left + box.width / 2, box.top + box.height / 2, box.width / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'icon' || kind === 'stroke') {
      const viewBox = shape.viewBox.baseVal;
      const outline = new Path2D(shape.querySelector('path').getAttribute('d'));
      ctx.save();
      ctx.translate(box.left, box.top);
      ctx.scale(box.width / viewBox.width, box.height / viewBox.height);
      if (kind === 'stroke') {
        ctx.lineWidth = +shape.getAttribute('stroke-width') || 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke(outline);
      } else ctx.fill(outline);
      ctx.restore();
    }
  });
}

function drawText(ctx, el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const style = getComputedStyle(node.parentElement);
    const stretch = parseFloat(style.fontStretch);
    // text on a filled shape is cut out of it
    ctx.globalCompositeOperation = node.parentElement.closest('[data-ink="fill"]') ? 'destination-out' : 'source-over';
    // the width is named twice: in the shorthand, which every browser reads, and as the newer canvas property
    const width = stretch < 70 ? 'extra-condensed' : stretch < 85 ? 'condensed' : 'normal';
    ctx.font = `${style.fontStyle} ${style.fontWeight} ${width} ${style.fontSize} ${style.fontFamily}`;
    if ('fontStretch' in ctx) ctx.fontStretch = width;
    const metrics = ctx.measureText('Hg');
    const ascent = metrics.fontBoundingBoxAscent ?? metrics.actualBoundingBoxAscent;
    const descent = metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent;
    for (let i = 0; i < node.length; i++) {
      if (!node.data[i].trim()) continue;
      range.setStart(node, i);
      range.setEnd(node, i + 1);
      const box = range.getBoundingClientRect();
      if (box.width) ctx.fillText(node.data[i], box.left, box.top + (box.height - ascent - descent) / 2 + ascent);
    }
  }
}

/**
 * @param {Element} el
 * @param {{ origin: DOMRect, pitch: number }} options origin: the box the positions are measured from;
 *   pitch: the distance between dots in CSS pixels
 * @returns {{ x: number, y: number, size: number, order: number }[]} dots, left to right; order runs 0 to 1
 */
export function collectInk(el, { origin, pitch }) {
  const rect = el.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil((rect.width + MARGIN * 2) * OVERSAMPLE);
  canvas.height = Math.ceil((rect.height + MARGIN * 2) * OVERSAMPLE);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.scale(OVERSAMPLE, OVERSAMPLE);
  ctx.translate(MARGIN - rect.left, MARGIN - rect.top);
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#000';
  drawShapes(ctx, el);
  drawText(ctx, el);

  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const alphaAt = (x, y) => {
    const px = Math.min(canvas.width - 1, Math.round(x * OVERSAMPLE));
    const py = Math.min(canvas.height - 1, Math.round(y * OVERSAMPLE));
    return pixels[(py * canvas.width + px) * 4 + 3];
  };
  const dots = [];
  for (let y = pitch / 2; y < rect.height + MARGIN * 2; y += pitch) {
    for (let x = pitch / 2; x < rect.width + MARGIN * 2; x += pitch) {
      const jx = x + (Math.random() - 0.5) * pitch * 0.5;
      const jy = y + (Math.random() - 0.5) * pitch * 0.5;
      if (alphaAt(jx, jy) > 120) {
        dots.push({
          x: rect.left - origin.left - MARGIN + jx,
          y: rect.top - origin.top - MARGIN + jy,
          size: pitch * 0.94,
        });
      }
    }
  }
  // left to right, so a word is written, not sprinkled
  dots.sort((a, b) => a.x - b.x);
  dots.forEach((dot, i) => {
    dot.order = i / dots.length;
  });
  return dots;
}
