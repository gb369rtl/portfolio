// Moving between sections. The page does not scroll: one section fills the screen and the wheel, a swipe or
// the arrow keys change it. Scrolling up moves forward, the way a git log reads newest-first.

import { checkout, firstVisit } from '../ceremony/transitions.js';
import { skipCeremony } from '../ceremony/hammer.js';
import { app, overlay, graphWrap, sectionEls, track } from '../core/dom.js';
import { reduceMotion } from '../core/env.js';
import { registerNavigation } from '../core/router.js';
import { isOn, SECTIONS, state } from '../core/state.js';
import { COMMITS, commitRef, hoverCommit, revealStage, setHeadCommit, setHeadSection } from '../graph/graph.js';
import { wait } from '../lib/util.js';
import { enterExperience } from '../sections/experience.js';
import {
  closeBooks,
  isReading,
  kickSphere,
  selectedProject,
  showProject,
  stepBack,
} from '../sections/projects/projects.js';
import { handleMenuKey } from './commit-menu.js';

const SWIPE = 40; // px a finger must travel to count as a swipe

function setTrack(index) {
  track.style.transform = `translateY(calc(var(--vh) * ${-100 * index}))`;
}

/**
 * Go to a section.
 * @param {number} toIndex
 * @param {{ commit: number, ref: string, kind: string, item?: number }} [nav] set when a commit was clicked:
 *   which commit to check out, and the job or project it stands for
 */
async function goTo(toIndex, nav) {
  if (state.isTransitioning || toIndex < 0 || toIndex >= SECTIONS.length || (toIndex === state.current && !nav)) return;
  if (isReading()) return; // inside a book the wheel and the arrows read the write-up
  state.isTransitioning = true;
  hoverCommit(-1);
  const from = state.current;

  // a jump over unseen sections draws their part of the tree first, so the tree is never missing a piece
  for (let passed = state.maxReached + 1; passed < toIndex; passed++) revealStage(passed);

  if (reduceMotion) {
    setTrack(toIndex);
    if (nav) setHeadCommit(nav.commit);
    else setHeadSection(toIndex);
  } else {
    // cover the page, swap the section underneath, and uncover it only when the ceremony is over,
    // so the next section never shows before the tree has changed
    graphWrap.classList.add('elevated');
    overlay.classList.add('active');
    await wait(300);
    sectionEls[from].classList.remove('in');
    setTrack(toIndex);
    if (toIndex > state.maxReached) await firstVisit(toIndex);
    else await checkout(toIndex, nav);
  }

  sectionEls[from].classList.remove('in');
  sectionEls[toIndex].classList.add('in');
  state.current = toIndex;
  state.maxReached = Math.max(state.maxReached, toIndex);
  app.dataset.at = SECTIONS[toIndex];

  if (isOn('projects')) {
    kickSphere();
    if (nav?.kind === 'proj') showProject(nav.item);
  } else closeBooks();
  if (isOn('experience')) enterExperience(nav?.kind === 'exp' ? nav.item : null);
  state.isTransitioning = false;
}

/** A click on a commit: check it out and go to its section, and to its job or project. */
function jump(row) {
  const commit = COMMITS[row];
  if (!commit || state.isTransitioning || state.inCeremony || isReading()) return false;
  const alreadyThere =
    commit.section === state.current &&
    row === state.headCommit &&
    (commit.kind !== 'proj' || selectedProject() === commit.item);
  if (alreadyThere) return false;
  goTo(commit.section, { commit: row, ref: commitRef(row), kind: commit.kind, item: commit.item });
  return true;
}

registerNavigation({ goTo, jump });

// Sections are fitted to the screen and do not scroll. If one ever does (a very small window), the wheel
// finishes that scroll before it changes section.
function innerScrollBlocks(forward) {
  const box = sectionEls[state.current]?.querySelector('.section-inner');
  if (!box) return false;
  const overflow = getComputedStyle(box).overflowY;
  if (overflow !== 'auto' && overflow !== 'scroll') return false;
  const atTop = box.scrollTop <= 1;
  const atBottom = box.scrollTop >= box.scrollHeight - box.clientHeight - 1;
  return forward ? !atTop : !atBottom;
}

app.addEventListener(
  'wheel',
  (event) => {
    if (isReading() && !state.menuOpen) return; // the write-up scrolls
    const forward = event.deltaY < 0;
    const busy = state.menuOpen || state.isTransitioning;
    if (!busy && innerScrollBlocks(forward)) return;
    event.preventDefault();
    if (!busy) goTo(state.current + (forward ? 1 : -1));
  },
  { passive: false },
);

let touchStartY = null;
let touchOnSphere = false;
app.addEventListener(
  'touchstart',
  (event) => {
    touchStartY = event.touches[0].clientY;
    touchOnSphere = Boolean(event.target.closest?.('#dome-scene, #reader'));
  },
  { passive: true },
);
app.addEventListener(
  'touchend',
  (event) => {
    const startY = touchStartY;
    touchStartY = null;
    if (startY === null || state.isTransitioning || touchOnSphere || state.menuOpen) return;
    const moved = event.changedTouches[0].clientY - startY;
    if (Math.abs(moved) < SWIPE) return;
    const forward = moved > 0; // the finger moves down, the content moves up
    if (innerScrollBlocks(forward)) return;
    goTo(state.current + (forward ? 1 : -1));
  },
  { passive: true },
);

const KEY_TARGETS = {
  ArrowUp: () => state.current + 1,
  PageUp: () => state.current + 1,
  ArrowDown: () => state.current - 1,
  PageDown: () => state.current - 1,
  Home: () => 0,
  End: () => SECTIONS.length - 1,
};

window.addEventListener('keydown', (event) => {
  if (state.menuOpen) {
    handleMenuKey(event);
  } else if (event.key === 'Escape') {
    // skips a section change in progress; otherwise, on Projects, steps back out of a book or the list
    if (state.inCeremony || state.isTransitioning) skipCeremony();
    else if (isOn('projects')) stepBack();
  } else if (KEY_TARGETS[event.key] && !isReading()) {
    event.preventDefault();
    goTo(KEY_TARGETS[event.key]());
  }
});

overlay.addEventListener('click', skipCeremony);

setTrack(0);
