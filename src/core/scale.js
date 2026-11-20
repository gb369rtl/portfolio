// The page is drawn in design pixels: every length in the stylesheets is a multiple of --u, and tokens.css sets
// --u from the window so the drawing fits. This module gives scripts the same unit, and is the safety net that
// keeps a section from ever needing to scroll: if its content is still taller than the screen, that section's
// own --u is lowered until it fits.

import { sectionEls } from './dom.js';

const STACKED = window.matchMedia('(max-width: 900px), (orientation: portrait)');
const SMALLEST = 0.55; // a section is never drawn below this share of the page's unit

/** True where the layout is one column and the git tree is a menu: portrait screens and narrow windows. */
export const isStacked = () => STACKED.matches;

const PHONE = window.matchMedia('(max-width: 599px) and (orientation: portrait)');

/** True on a phone held upright, which has the stacked layout at its own sizes. */
export const isPhone = () => PHONE.matches;

const probes = new WeakMap();

/** The size of one design pixel inside `el`, in real pixels. */
export function unitOf(el) {
  let probe = probes.get(el);
  if (!probe) {
    probe = document.createElement('i');
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText =
      'position:absolute;left:0;top:0;width:calc(1000 * var(--u));height:0;visibility:hidden;pointer-events:none';
    el.appendChild(probe);
    probes.set(el, probe);
  }
  return probe.offsetWidth / 1000 || 1;
}

/** The page's own unit (sections may run smaller). */
export const pageUnit = () => unitOf(document.body);

/** Lower a section's unit until its content fits the screen. Sections opt in with data-fit on their content box. */
export function fitSection(section) {
  const box = section.querySelector('[data-fit]');
  if (!box) return;
  section.style.removeProperty('--u');
  let share = 1;
  for (let pass = 0; pass < 8 && share > SMALLEST; pass++) {
    if (box.scrollHeight - box.clientHeight <= 1) break;
    // text re-wraps as it shrinks, so each step is measured again instead of trusted
    share = Math.max(SMALLEST, share * Math.max(0.8, box.clientHeight / box.scrollHeight) * 0.99);
    section.style.setProperty('--u', `calc(var(--u0) * ${share.toFixed(4)})`);
  }
}

export function fitSections() {
  sectionEls.forEach(fitSection);
}
