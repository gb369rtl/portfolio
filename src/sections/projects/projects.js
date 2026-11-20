// Projects: a sphere of books that never stops turning. Every book is a project.
//   none    -> the sphere spins; drag it, or click a book
//   picked  -> the sphere has turned that book to face you and pulled it forward; click it again to read
//   reading -> the book has opened into the reader
// "View all projects" blasts the sphere aside and opens a list of every project next to it.

import { loadWriteup, profile, projects } from '../../core/content.js';
import { app, byId } from '../../core/dom.js';
import { PRESS, reduceMotion } from '../../core/env.js';
import { isStacked, unitOf } from '../../core/scale.js';
import { isOn, state } from '../../core/state.js';
import { HEAD_ROW, setHeadCommit, setHeadSection } from '../../graph/graph.js';
import { laneColor } from '../../graph/model.js';
import { clamp, esc, pad2 } from '../../lib/util.js';
import { throwGrenade } from './blast.js';
import { createReader } from './reader.js';

const RADIUS = 215; // of the sphere, in its own units; --dome-s scales the whole thing
const BOOK_W = 78; // a book on the sphere, in the same units (the size of .dome-tile in projects.css)
const BOOK_H = 108;
const LIFT = 34; // how far the chosen book comes forward
// How far the sphere reaches from its centre on screen at scale 1: the far corner of a book, seen through the
// scene's perspective (620px, in projects.css).
const REACH = 242;
const ROW_GAP = 3; // the room between a ring of books and the ring above it
const SIDE_GAP = 3; // the room between two books side by side, measured where they come closest
// On the equator two books are that close along their whole height, where in every other ring they only come
// that close at one corner and fan apart from there. The same gap reads tighter here, so it gets a little more.
const EQUATOR_GAP = 5;
// About how large the books are in each ring, from the equator to a pole. The ring nearest a pole holds
// smaller books: a flat book fans away from its neighbours as it nears a pole, and a smaller one fans less,
// so the cap stays closed instead of opening into wide wedges.
const RING_SIZES = [1, 1, 0.7];

// One ring, resting ROW_GAP above `below` (the height the ring under it reaches; null for the equator).
// A whole number of books has to go round, so the size asked for is adjusted a little, up or down, until the
// books stand exactly `gap` apart. A book is a flat tile touching the sphere at its centre, so away from
// the equator its edge nearer the pole sits on a smaller circle than its centre does; that edge is where
// neighbours come closest, and it is the one measured.
function fitRing(wanted, below, gap) {
  let size = wanted;
  let books = 0;
  let angle = 0;
  for (let pass = 0; pass < 6; pass++) {
    const half = (BOOK_H * size) / 2;
    // the latitude that puts the lower edge, at height RADIUS sin(a) - half cos(a), ROW_GAP above the ring below
    angle = below === null ? 0 : Math.asin((below + ROW_GAP) / Math.hypot(RADIUS, half)) + Math.atan(half / RADIUS);
    const around = 2 * Math.PI * (RADIUS * Math.cos(angle) - half * Math.sin(angle));
    if (pass === 0) books = Math.max(3, Math.round(around / (BOOK_W * wanted + gap)));
    size = (around / books - gap) / BOOK_W; // a different size moves the ring a little: go round again
  }
  const half = (BOOK_H * size) / 2;
  return {
    latitude: +((angle * 180) / Math.PI).toFixed(2),
    size: +size.toFixed(4),
    books,
    top: RADIUS * Math.sin(angle) + half * Math.cos(angle),
  };
}

// The rings of books from pole to pole, packed as closely as they go without one book covering another.
const RINGS = (() => {
  const equator = fitRing(RING_SIZES[0], null, EQUATOR_GAP);
  const upper = [];
  let below = equator.top;
  for (const wanted of RING_SIZES.slice(1)) {
    const ring = fitRing(wanted, below, SIDE_GAP);
    upper.push(ring);
    below = ring.top;
  }
  const lower = upper.map((ring) => ({ ...ring, latitude: -ring.latitude })).reverse();
  return [...lower, equator, ...upper];
})();

const AUTO_SPIN = reduceMotion ? 0 : 0.007; // degrees per ms
const MAX_TILT = 38; // while nothing is picked
const MAX_TILT_PICKED = 64;
const CLICK_SLOP = 6; // px the pointer may move and still count as a click
const AXIS_SLOP = 8; // px a finger travels before it is clear whether it is spinning the sphere or swiping the page

const orbit = byId('orbit');
const scene = byId('dome-scene');
const stage = byId('dome-stage');
const readerEl = byId('reader');
const countEl = byId('orbit-count');
const nameEl = byId('orbit-name');
const pullButton = byId('orbit-btn');
const legend = byId('orbit-legend');
const allButton = byId('orbit-all');
const allView = byId('all-view');
const total = projects.length;
const PROJECTS_SECTION = 3;

byId('orbit-meta').textContent = `${total} project${total === 1 ? '' : 's'}`;

const coverHtml = (project) =>
  `<span class="by">${esc(profile.name)}</span>` +
  (project.status === 'design' ? '<span class="status">design</span>' : '') +
  `<b>${esc(project.name)}</b><span class="tag">project/${esc(project.id)}</span>`;

// ----- every slot on the sphere is a book; the projects repeat around it, stepped so neighbours differ -----
const tiles = [];

// Which project a book shows. There are several books for every project, and two neighbours must never be the
// same one: each book takes the project used least so far that none of its neighbours has.
const timesUsed = new Array(total).fill(0);
let turn = 0;
function projectFor(neighbours) {
  let choice = -1;
  for (let step = 0; step < total; step++) {
    const candidate = (turn + step) % total;
    if (neighbours.has(candidate)) continue;
    if (choice < 0 || timesUsed[candidate] < timesUsed[choice]) choice = candidate;
  }
  if (choice < 0) choice = turn % total; // fewer projects than a book has neighbours: nothing left to avoid
  timesUsed[choice]++;
  turn = choice + 1;
  return choice;
}
const degreesApart = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

let ringBelow = [];
RINGS.forEach((ring, row) => {
  const { latitude, size, books } = ring;
  const step = 360 / books;
  const inRing = [];
  for (let slot = 0; slot < books; slot++) {
    const longitude = slot * step + (row % 2 ? step / 2 : 0);
    // its neighbours: the books it sits above, and those one along from them, which it meets at a corner...
    const neighbours = new Set(
      ringBelow
        .filter((tile) => degreesApart(tile.longitude, longitude) < (tile.step + step) * 0.9)
        .map((tile) => tile.project),
    );
    // ...and the two before it and, as the ring comes round, the two after it, so a ring never reads A, B, A
    for (const near of [slot - 1, slot - 2, slot + 1 - books, slot + 2 - books]) {
      if (near >= 0 && near < slot) neighbours.add(inRing[near].project);
    }
    const project = projectFor(neighbours);

    const el = document.createElement('div');
    el.className = 'dome-tile';
    el.dataset.project = project;
    el.style.setProperty('--c', laneColor(project));
    el.innerHTML = `<div class="cover v${(slot + row) % 3}">${coverHtml(projects[project])}</div>`;
    const place = `rotateY(${longitude}deg) rotateX(${-latitude}deg)`;
    const home = `${place} translateZ(${RADIUS}px) scale(${size})`;
    const lifted = `${place} translateZ(${RADIUS + LIFT}px) scale(1.3)`; // the chosen book is full size, whichever ring it came from
    el.style.transform = home;
    stage.appendChild(el);
    const tile = {
      el,
      project,
      home,
      lifted,
      longitude,
      latitude,
      step,
      latitudeRad: (latitude * Math.PI) / 180,
      back: null,
    };
    inRing.push(tile);
    tiles.push(tile);
  }
  ringBelow = inRing;
});

projects.forEach((project, i) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = project.name;
  button.style.setProperty('--c', laneColor(i));
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', () => pick(i));
  legend.appendChild(button);
});

// ----- state -----
let mode = 'none';
let selected = -1;
let selectedTile = null;
let angle = -20;
let tilt = -8;
let spin = 0; // extra turning speed, in degrees per ms; decays
let aim = null; // { angle, tilt } the sphere is turning toward
let readAt = 0;
let settleTimer = null; // marks the reader as settled once its opening transition is over
let allOpen = false;
let allBusy = false;
let hoverHold = false; // a name in the list is pointed at: the sphere holds still on that book

const facing = (tile) => Math.cos(tile.latitudeRad) * Math.cos(((tile.longitude + angle) * Math.PI) / 180);

// of the copies of a project on the sphere, the one nearest the front
function frontTile(project) {
  let best = null;
  for (const tile of tiles) {
    if (tile.project === project && (!best || facing(tile) > facing(best))) best = tile;
  }
  return best;
}

function updateUi() {
  const project = selected >= 0 ? projects[selected] : null;
  countEl.textContent = `${mode === 'none' ? '00' : pad2(selected + 1)} / ${pad2(total)}`;
  nameEl.textContent =
    mode === 'none'
      ? 'Pick a book'
      : mode === 'picked'
        ? `${project.name}: ${PRESS} it to read`
        : `Reading ${project.name}`;
  pullButton.setAttribute(
    'aria-label',
    mode === 'none' ? 'Pull out a book' : mode === 'picked' ? 'Put the book back' : 'Close the book',
  );
  [...legend.children].forEach((button, i) => {
    button.setAttribute('aria-pressed', String(mode !== 'none' && i === selected));
  });
}

function render() {
  stage.style.transform = `rotateX(${tilt.toFixed(2)}deg) rotateY(${angle.toFixed(2)}deg)`;
  for (const tile of tiles) {
    const front = facing(tile);
    const isBack = front < 0;
    if (tile.back !== isBack) {
      tile.back = isBack;
      tile.el.classList.toggle('back', isBack);
    }
    tile.el.style.pointerEvents = front > 0.3 ? 'auto' : 'none';
  }
}

// the chosen book stays on the sphere: it is pushed forward and grows
function selectTile(tile) {
  if (selectedTile && selectedTile !== tile) {
    selectedTile.el.classList.remove('sel');
    selectedTile.el.style.transform = selectedTile.home;
  }
  selectedTile = tile;
  if (tile) {
    tile.el.classList.add('sel');
    tile.el.style.transform = tile.lifted;
  }
}

// turn until a tile faces the viewer, the shortest way round
function turnTo(tile) {
  let target = -tile.longitude;
  target += 360 * Math.round((angle - target) / 360);
  aim = { angle: target, tilt: tile.latitude };
  spin = 0;
  if (reduceMotion) settle();
}
function settle() {
  angle = aim.angle;
  tilt = aim.tilt;
  aim = null;
  render();
}
// let go of a book: keep the angle, bring the tilt back within its resting range
function relax() {
  aim = { angle, tilt: clamp(tilt, -MAX_TILT, MAX_TILT) };
  if (reduceMotion) settle();
}

const markHead = (project) => {
  if (isOn('projects')) setHeadCommit(HEAD_ROW[PROJECTS_SECTION - 1] + 1 + project);
};

const reader = createReader(readerEl, { onClose: () => back() });
const fillReader = (project) => reader.fill(projects[project], { index: project, total, color: laneColor(project) });

function pick(project, fromEl) {
  if (mode === 'reading') {
    // "next" while reading: swap the page and quietly line the sphere up behind it
    selected = project;
    const tile = frontTile(project);
    selectTile(tile);
    aim = { angle: -tile.longitude, tilt: tile.latitude };
    settle();
    fillReader(project);
    updateUi();
    markHead(project);
    return;
  }
  const tile = tiles.find((candidate) => candidate.el === fromEl) || frontTile(project);
  selected = project;
  mode = 'picked';
  selectTile(tile);
  turnTo(tile);
  orbit.classList.add('picked');
  updateUi();
  markHead(project);
  loadWriteup(projects[project]); // fetched now, so the book opens with its text already there
}

function unpick() {
  mode = 'none';
  selectTile(null);
  relax();
  orbit.classList.remove('picked');
  updateUi();
  if (isOn('projects')) setHeadSection(PROJECTS_SECTION);
}

// the page also needs to know a book is open: the tree and the commit-list button step out of the way
function setReading(on) {
  orbit.classList.toggle('reading', on);
  app.classList.toggle('reading', on);
}

// where the reader starts from and returns to: the box of the book on the sphere
function bookBox() {
  const book = (selectedTile ? selectedTile.el : orbit).getBoundingClientRect();
  const page = readerEl.getBoundingClientRect(); // measured with no transform on it
  return (
    `translate(${(book.left - page.left).toFixed(1)}px, ${(book.top - page.top).toFixed(1)}px) ` +
    `scale(${(book.width / page.width).toFixed(4)}, ${(book.height / page.height).toFixed(4)})`
  );
}

function read() {
  if (mode !== 'picked') return;
  mode = 'reading';
  readAt = Date.now();
  fillReader(selected);
  clearTimeout(settleTimer);
  readerEl.classList.remove('settled');
  readerEl.style.transition = 'none';
  readerEl.style.transform = 'none';
  if (reduceMotion) {
    readerEl.style.opacity = '1';
    readerEl.classList.add('settled');
  } else {
    // the page grows out of the book until it is the whole view, and the sphere rushes past
    readerEl.style.transform = bookBox();
    readerEl.style.opacity = '0';
    void readerEl.offsetWidth;
    readerEl.style.transition = 'transform 0.45s cubic-bezier(.22, 1, .36, 1) 0.1s, opacity 0.2s ease 0.1s';
    readerEl.style.transform = 'none';
    readerEl.style.opacity = '1';
    settleTimer = setTimeout(() => readerEl.classList.add('settled'), 560);
  }
  setReading(true);
  updateUi();
}

function unread() {
  if (mode !== 'reading') return;
  mode = 'picked';
  clearTimeout(settleTimer);
  readerEl.classList.remove('settled');
  if (reduceMotion) {
    readerEl.style.opacity = '0';
  } else {
    const now = readerEl.style.transform;
    readerEl.style.transition = 'none';
    readerEl.style.transform = 'none';
    const box = bookBox();
    readerEl.style.transform = now;
    void readerEl.offsetWidth;
    readerEl.style.transition = 'transform 0.5s cubic-bezier(.65, 0, .25, 1), opacity 0.2s ease 0.32s';
    readerEl.style.transform = box;
    readerEl.style.opacity = '0';
  }
  setReading(false);
  updateUi();
}

/** One step back: out of the book, or put the book back, or close the list. Returns false if there was nothing to undo. */
function back() {
  if (mode === 'reading') {
    unread();
    unpick();
    return true;
  }
  if (mode === 'picked') {
    unpick();
    return true;
  }
  if (allOpen) {
    closeAll();
    return true;
  }
  return false;
}

// a click outside the open pages closes the book
orbit.addEventListener('click', (event) => {
  if (mode === 'reading' && Date.now() - readAt > 400 && !event.target.closest('#reader, .orbit-pill')) back();
});

// ----- view all: the list of every project beside the sphere -----
allView.innerHTML =
  '<button type="button" id="all-back" aria-label="Collapse the project list" title="Collapse the list">' +
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button>' +
  '<div class="all-head"><h3>All projects</h3></div>' +
  projects
    .map(
      (project, i) =>
        `<button type="button" class="all-row" data-project="${i}" data-status="${esc(project.status)}" style="--c:${laneColor(i)}"><span class="num">${pad2(i + 1)}</span><i></i>` +
        `<span>${esc(project.name)}</span><span class="st">${esc(project.status)}</span></button>`,
    )
    .join('') +
  '<p class="all-key" aria-hidden="true"><i></i>shipped <i class="design"></i>design</p>' +
  '<p class="all-note"><span class="when-mouse">Point at a name and the sphere turns to that book. Click it to read.</span>' +
  '<span class="when-touch">Tap a name to open its book.</span></p>';
const allRows = [...allView.querySelectorAll('.all-row')];
const markRow = (row) => allRows.forEach((other) => other.classList.toggle('on', other === row));

// pointing at a row turns the sphere until that project's nearest book faces you, and lifts the book
function peek(row) {
  if (mode !== 'none') return;
  const tile = frontTile(+row.dataset.project);
  markRow(row);
  hoverHold = true;
  selectTile(tile);
  turnTo(tile);
}
function unpeek() {
  if (mode !== 'none') return;
  markRow(null);
  hoverHold = false;
  selectTile(null);
  aim = { angle, tilt: clamp(tilt, -MAX_TILT, MAX_TILT) };
}
allRows.forEach((row) => {
  row.addEventListener('mouseenter', () => peek(row));
  row.addEventListener('focus', () => peek(row));
  row.addEventListener('click', () => {
    hoverHold = false;
    markRow(null);
    pick(+row.dataset.project);
    read();
  });
});
allView.addEventListener('mouseleave', unpeek);
allView.addEventListener('focusout', (event) => {
  if (!allView.contains(event.relatedTarget)) unpeek();
});
byId('all-back').addEventListener('click', () => closeAll());

function closeAll() {
  if (!allOpen) return;
  allOpen = false;
  hoverHold = false;
  if (mode === 'none') {
    selectTile(null);
    aim = { angle, tilt: clamp(tilt, -MAX_TILT, MAX_TILT) };
  }
  orbit.classList.remove('all');
  allButton.classList.remove('gone');
}

async function viewAll() {
  if (allBusy || allOpen) return;
  if (mode !== 'none') back();
  allButton.classList.add('gone');
  if (!reduceMotion) {
    allBusy = true;
    await throwGrenade(orbit, allButton, { unit: unitOf(orbit), colors: projects.map((_, i) => laneColor(i)) });
    spin = 0.9; // the blast also spins the sphere hard; it slows as it settles
    allBusy = false;
  }
  allOpen = true;
  orbit.classList.add('all'); // the sphere is knocked to the left and the list opens on the right
}
allButton.addEventListener('click', viewAll);

// ----- controls -----
pullButton.addEventListener('click', () => (mode === 'none' ? pick(Math.max(0, selected)) : back()));
byId('orbit-next').addEventListener('click', () => pick((selected + 1) % total));
window.addEventListener('keydown', (event) => {
  const onControl = event.target instanceof Element && event.target.closest('button, a');
  if (event.key === 'Enter' && !state.menuOpen && mode === 'picked' && isOn('projects') && !onControl) read();
});

// ----- spin and drag -----
let dragging = false;
let lastX = 0;
let lastY = 0;
let travelled = 0;
let pressed = null;
let startX = 0;
let startY = 0;
// A mouse drag always turns the sphere. A finger either spins it (sideways, 'x') or is swiping the page ('y');
// which one is not known until it has moved a little.
let axis = 'x';
let lastFrame = null;

function frame(now) {
  requestAnimationFrame(frame);
  if (!isOn('projects')) {
    lastFrame = null;
    return;
  }
  lastFrame ??= now;
  const dt = Math.min(50, now - lastFrame);
  lastFrame = now;
  if (!dragging && aim) {
    const k = 1 - Math.exp(-dt / 110);
    angle += (aim.angle - angle) * k;
    tilt += (aim.tilt - tilt) * k;
    if (Math.abs(aim.angle - angle) < 0.05 && Math.abs(aim.tilt - tilt) < 0.05) {
      angle = aim.angle;
      tilt = aim.tilt;
      aim = null;
    }
  } else if (!dragging && mode === 'none' && !hoverHold) {
    angle += (spin + AUTO_SPIN) * dt; // the sphere never stops turning
    spin *= 0.996 ** dt;
    if (Math.abs(spin) < 0.0005) spin = 0;
  }
  render();
}

function dragStart(x, y, target, byFinger = false) {
  aim = null;
  dragging = true;
  lastX = x;
  lastY = y;
  startX = x;
  startY = y;
  axis = byFinger ? null : 'x';
  travelled = 0;
  spin = 0;
  pressed = target;
  scene.classList.add('dragging');
}
function dragMove(x, y) {
  if (!dragging) return;
  if (axis === null) {
    const acrossX = Math.abs(x - startX);
    const acrossY = Math.abs(y - startY);
    if (acrossX + acrossY < AXIS_SLOP) return;
    axis = acrossY > acrossX * 1.2 ? 'y' : 'x';
    lastX = x;
    lastY = y;
  }
  if (axis === 'y') {
    travelled = CLICK_SLOP; // a page swipe: the sphere stays as it is, and it is not a tap
    return;
  }
  const dx = x - lastX;
  const dy = y - lastY;
  travelled += Math.abs(dx) + Math.abs(dy);
  angle += dx * 0.32;
  const limit = mode === 'none' ? MAX_TILT : MAX_TILT_PICKED;
  tilt = clamp(tilt - dy * 0.22, -limit, limit);
  spin = (dx * 0.32) / 16;
  lastX = x;
  lastY = y;
}
function dragEnd() {
  if (!dragging) return;
  dragging = false;
  scene.classList.remove('dragging');
  if (travelled >= CLICK_SLOP || !pressed) return;
  // it was a click
  const tileEl = pressed instanceof Element ? pressed.closest('.dome-tile') : null;
  if (tileEl && mode === 'picked' && selectedTile && tileEl === selectedTile.el)
    read(); // a second click on the same book opens it
  else if (mode === 'picked')
    unpick(); // any other click puts the book back
  else if (tileEl) pick(+tileEl.dataset.project, tileEl);
}
// Pointer events, so one press is one event whatever made it. With separate mouse and touch listeners a tap
// arrived twice (the touch, then the mouse events a browser sends after it), which pulled a book out and opened
// it in the same tap.
scene.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
  dragStart(event.pageX, event.pageY, event.target, event.pointerType !== 'mouse');
  if (event.pointerType === 'mouse') event.preventDefault(); // no text selection while dragging
});
window.addEventListener('pointermove', (event) => {
  if (event.isPrimary) dragMove(event.pageX, event.pageY);
});
window.addEventListener('pointerup', (event) => {
  if (event.isPrimary) dragEnd();
});
window.addEventListener('pointercancel', () => {
  travelled = CLICK_SLOP; // the browser took the gesture: it is not a click
  dragEnd();
});

// ----- what the rest of the page may ask -----

const cornerEls = ['.orbit-tl h2', '.orbit-tr', '#orbit-all', '.orbit-bl', '.orbit-br'].map((selector) =>
  orbit.querySelector(selector),
);
const pill = orbit.querySelector('.orbit-pill');
const isShown = (el) => el.getClientRects().length > 0;

// the largest circle around (cx, cy) that keeps `margin` clear of every box
function clearRadius(cx, cy, boxes, margin) {
  let radius = Infinity;
  for (const box of boxes) {
    const nearX = clamp(cx, box.left, box.right);
    const nearY = clamp(cy, box.top, box.bottom);
    radius = Math.min(radius, Math.hypot(nearX - cx, nearY - cy) - margin);
  }
  return radius;
}

/**
 * Size the sphere to the room it has, whatever the window: as large as fits among the heading, the counter,
 * the list of names and the bar at the foot. Also works out where it goes when the project list is open.
 */
export function layoutProjects() {
  const u = unitOf(orbit);
  const frame = orbit.getBoundingClientRect();
  const margin = 10 * u;
  const boxes = cornerEls.filter(isShown).map((el) => el.getBoundingClientRect());
  const isWide = (box) => box.width > frame.width * 0.6;

  // The sphere stands on a floor: the bar at the foot, or the line of help above it where that runs the full
  // width (a phone). Everything else is a corner it has to stay clear of.
  const floor = Math.min(pill.getBoundingClientRect().top, ...boxes.filter(isWide).map((box) => box.top)) - margin;
  const corners = boxes.filter((box) => !isWide(box));
  const upper = corners.filter((box) => box.bottom < frame.top + frame.height * 0.45);
  const lower = corners.filter((box) => !upper.includes(box));
  const cx = frame.left + frame.width / 2;

  // Two ways to place it, and the one that gives the larger sphere wins. On a wide screen it rises between the
  // corner texts. Where they leave no room between them (a phone, an upright tablet) it sits under them.
  const place = (top, around) => {
    const cy = (top + floor) / 2;
    const reach = Math.min((floor - top) / 2 - 14 * u, frame.width / 2 - 4 * u, clearRadius(cx, cy, around, margin));
    return { top, cy, reach };
  };
  const between = place(frame.top, corners);
  const under = upper.length ? place(Math.max(...upper.map((box) => box.bottom)) + margin, lower) : between;
  const best = under.reach > between.reach ? under : between;

  scene.style.top = `${(best.top - frame.top).toFixed(1)}px`;
  scene.style.bottom = `${Math.max(0, frame.bottom - floor).toFixed(1)}px`;
  orbit.style.setProperty('--dome-s', clamp(best.reach / REACH, 0.4, 3).toFixed(3));

  // With the list of every project open, the corners are gone and the sphere takes the room the list leaves:
  // above it where the layout is stacked, to its left otherwise.
  const list = { left: frame.left + allView.offsetLeft, top: frame.top + allView.offsetTop };
  const room = isStacked()
    ? { left: frame.left, right: frame.right, top: frame.top, bottom: list.top - margin }
    : {
        left: frame.left + (parseFloat(getComputedStyle(orbit.querySelector('.orbit-bl')).left) || 0),
        right: list.left - 70 * u, // the list's collapse handle sits to its left
        top: frame.top,
        bottom: frame.bottom,
      };
  const allReach = Math.min((room.right - room.left) / 2, (room.bottom - room.top) / 2) - margin;
  orbit.style.setProperty('--all-x', `${((room.left + room.right) / 2 - cx).toFixed(1)}px`);
  orbit.style.setProperty('--all-y', `${((room.top + room.bottom) / 2 - best.cy).toFixed(1)}px`);
  orbit.style.setProperty('--all-s', clamp(allReach / REACH, 0.3, 3).toFixed(3));
}

/** A push as the section arrives. */
export function kickSphere() {
  if (!reduceMotion) spin = 0.16;
}

/** Leaving the section: close any book at once. The open list is remembered. */
export function closeBooks() {
  if (mode === 'reading') {
    readerEl.style.transition = 'none';
    readerEl.style.opacity = '0';
    readerEl.classList.remove('settled');
    setReading(false);
    mode = 'picked';
  }
  if (mode === 'picked') unpick();
  hoverHold = false;
}

/** True while a book is open or the blast is running: the page must not change section. */
export const isReading = () => mode === 'reading' || allBusy;

/** Turn the sphere to a project and pull its book out (a click on the project's commit in the tree). */
export function showProject(project) {
  if (allBusy || mode === 'reading') return;
  hoverHold = false;
  pick(project);
}

/** True if the finger that just lifted from the sphere was spinning it, so the page must not treat it as a swipe. */
export const sphereKeptTouch = () => axis === 'x' && travelled >= CLICK_SLOP;

/** The project whose book is out, or -1. */
export const selectedProject = () => (mode === 'none' ? -1 : selected);

export { back as stepBack };

layoutProjects();
updateUi();
render();
requestAnimationFrame(frame);
