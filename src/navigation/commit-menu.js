// The commit table as a menu. Where the tree on the left is hidden (phones, portrait tablets) this is how a
// visitor reaches any commit, and on every screen it is how the keyboard does.

import { byId, graphWrap, overlay, skipHint } from '../core/dom.js';
import { jump } from '../core/router.js';
import { state } from '../core/state.js';
import { hoverCommit } from '../graph/graph.js';
import { isReading } from '../sections/projects/projects.js';

const button = byId('log-open');
const rowsEl = byId('gg-rows');

const openRows = () => [...rowsEl.querySelectorAll('.gg-row.on')];

export function openMenu() {
  if (state.menuOpen || state.isTransitioning || state.inCeremony || isReading()) return;
  state.menuOpen = true;
  hoverCommit(-1);
  graphWrap.removeAttribute('aria-hidden');
  graphWrap.classList.add('elevated', 'full', 'menu');
  overlay.classList.add('active');
  button.setAttribute('aria-expanded', 'true');
  skipHint.textContent = 'Pick a commit to go there';
  skipHint.classList.add('active');
  openRows().forEach((row) => {
    row.tabIndex = 0;
    row.setAttribute('role', 'button');
  });
  rowsEl.querySelector('.gg-row.head.on')?.focus({ preventScroll: true });
}

/** @param {boolean} [going] a jump has started, so the table and the cover stay up and become that jump's ceremony */
export function closeMenu(going) {
  if (!state.menuOpen) return;
  state.menuOpen = false;
  graphWrap.classList.remove('menu');
  graphWrap.setAttribute('aria-hidden', 'true');
  button.setAttribute('aria-expanded', 'false');
  skipHint.textContent = 'esc to skip';
  rowsEl.querySelectorAll('.gg-row').forEach((row) => {
    row.removeAttribute('tabindex');
    row.removeAttribute('role');
  });
  if (going) return;
  skipHint.classList.remove('active');
  graphWrap.classList.remove('full');
  overlay.classList.remove('active');
  setTimeout(() => {
    if (!state.menuOpen && !state.isTransitioning) graphWrap.classList.remove('elevated');
  }, 320);
  button.focus({ preventScroll: true });
}

const pickRow = (row) => closeMenu(jump(+row.dataset.k));

/** Arrow keys move through the commits, Enter or Space checks one out, Escape closes. */
export function handleMenuKey(event) {
  const rows = openRows();
  const at = rows.indexOf(document.activeElement);
  if (event.key === 'Escape') closeMenu();
  else if (event.key === 'ArrowDown') {
    event.preventDefault();
    rows[Math.min(rows.length - 1, at + 1)].focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    rows[Math.max(0, at - 1)].focus();
  } else if ((event.key === 'Enter' || event.key === ' ') && at >= 0) {
    event.preventDefault();
    pickRow(rows[at]);
  }
}

button.addEventListener('click', () => (state.menuOpen ? closeMenu() : openMenu()));
rowsEl.addEventListener('click', (event) => {
  const row = event.target.closest('.gg-row.on');
  if (state.menuOpen && row) pickRow(row);
});
overlay.addEventListener('click', () => closeMenu());
