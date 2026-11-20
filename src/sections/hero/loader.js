// The count the page opens with: a ring of marks that fills to 100, once. The real work is quick, so the
// count is paced. It never runs ahead of the work and it never jumps.

const SVG_NS = 'http://www.w3.org/2000/svg';
const MARKS = 96;
const SECONDS_TO_FILL = 1.5;

/** Radius of the ring in the loader's own units (the loader is 220 wide). The hero's pixels start on this ring. */
export const RING_RADIUS = 92;

/**
 * @param {HTMLElement} root the loader element, holding an <svg> and a .loader__count
 * @param {{ instant?: boolean }} [options] instant: fill as fast as the work allows (reduced motion)
 */
export function createLoader(root, { instant = false } = {}) {
  const svg = root.querySelector('svg');
  const count = root.querySelector('.loader__count');
  const marks = Array.from({ length: MARKS }, (_, i) => {
    const angle = (i / MARKS) * Math.PI * 2 - Math.PI / 2;
    const mark = document.createElementNS(SVG_NS, 'circle');
    mark.setAttribute('cx', (RING_RADIUS * Math.cos(angle)).toFixed(2));
    mark.setAttribute('cy', (RING_RADIUS * Math.sin(angle)).toFixed(2));
    mark.setAttribute('r', 1.7);
    svg.appendChild(mark);
    return mark;
  });

  const loader = {
    /** how much of the real work is done, 0 to 1; set by the caller */
    real: 0,
    shown: 0,
    show(progress) {
      const percent = Math.round(Math.min(1, Math.max(0, progress)) * 100);
      count.textContent = String(percent).padStart(3, '0');
      root.setAttribute('aria-valuenow', percent);
      marks.forEach((mark, i) => mark.toggleAttribute('data-on', i / MARKS < progress));
    },
    /** Start counting. Resolves when the count has reached 100. */
    run() {
      return new Promise((resolve) => {
        let last = performance.now();
        const tick = (now) => {
          const dt = Math.min(0.05, (now - last) / 1000);
          last = now;
          loader.shown = Math.min(loader.real, loader.shown + dt / (instant ? 0.01 : SECONDS_TO_FILL));
          loader.show(loader.shown);
          if (loader.shown >= 1) resolve();
          else requestAnimationFrame(tick);
        };
        tick(last);
      });
    },
  };
  loader.show(0);
  return loader;
}
