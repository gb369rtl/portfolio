// The hero. The page arrives as a ring of pixels that counts to 100; then four cursors carry those pixels
// out to where each part belongs: the portrait (set in letters that spell the stack) and the words. Once the
// page is built the cursors keep working, the letters can be knocked about, and resting the pointer on the
// portrait shows the photograph.
//
// To look at the opening by eye: ?t=3.2 holds it at that second, &keep leaves the pixels over the real parts.

import { profile } from '../../core/content.js';
import { byId, sectionEl } from '../../core/dom.js';
import { modestDevice, reduceMotion, touchInput } from '../../core/env.js';
import { goTo } from '../../core/router.js';
import { isStacked, unitOf } from '../../core/scale.js';
import { SECTIONS, state } from '../../core/state.js';
import { clamp, rand, wait } from '../../lib/util.js';
import { createCursors } from './cursors.js';
import { collectInk } from './ink.js';
import { createLetterPhysics } from './letters.js';
import { createLoader, RING_RADIUS } from './loader.js';
import { heroTextHtml } from './markup.js';
import { pointer } from './pointer.js';
import { inkAt, loadPortraitMap, writeSurface } from './portrait-map.js';
import { allocDots, createRenderer } from './renderer.js';

const PORTRAIT_MAP = new URL('../../../assets/portrait-map.png', import.meta.url).href;
const ASPECT = 5 / 6; // the portrait is 300 x 360
const SMALLEST = 0.6; // the words are never drawn below this share of the page's unit

// Seconds after the count reaches 100: when a part's pixels start to leave the ring, how long they keep
// leaving, when the real element takes over from its pixels, which fade group they belong to, and how far apart they sit.
const PLAN = {
  photo: { start: 1.36, stagger: 1.5 },
  h1: { start: 0.97, stagger: 0.55, show: 2.6, group: 0, pitch: 1.9 },
  bio: { start: 1.47, stagger: 0.5, show: 3.0, group: 1, pitch: 1.4 },
  intro: { start: 3.5, stagger: 0.3, show: 4.75, group: 2, pitch: 1.4 },
  actions: { start: 4.0, stagger: 0.3, show: 5.15, group: 3, pitch: 1.5 },
};
const TRAVEL = 1.1;
const TOTAL = 5.6;
const SPREAD = 1 - TRAVEL / TOTAL;
const SPAN = SPREAD * TOTAL;
const LANDED = PLAN.photo.start + PLAN.photo.stagger + TRAVEL; // the last letter of the portrait is in place

const CURSOR_COLORS = ['#A61E5C', '#1F4FD8', '#B8430A', '#0F6B4F'];
const REST_MS = 130; // how long the pointer rests on the portrait before the photograph shows

const toward = (dt, rate) => 1 - Math.exp(-dt * rate);

// ---------------------------------------------------------------- the parts

const hero = sectionEl('hero');
const text = byId('hero-text');
text.innerHTML = heroTextHtml(profile);
byId('hero-brand').textContent = profile.brand;
byId('hero-face').setAttribute('aria-label', `Portrait of ${profile.name} set in letters`);

const people = [...profile.hero.collaborators.slice(0, 3), profile.name];
byId('frame-label').textContent = `${people.length} people editing this page`;

const photo = byId('hero-photo');
const photograph = photo.querySelector('img');
const intro = text.querySelector('.hero-intro');
const h1 = text.querySelector('h1');
const bio = text.querySelector('.bio');
const actions = text.querySelector('.hero-actions');
const parts = [photo, intro, h1, bio, actions];
const LABELS = ['photo.jpg', 'div / Intro', 'h1 / Headline', 'p / Bio', 'div / Actions'];

byId('hero-work').addEventListener('click', () => goTo(SECTIONS.indexOf('projects')));
byId('hero-talk').addEventListener('click', () => goTo(SECTIONS.indexOf('contact')));

// the one instruction the page needs; it is also a button, for anyone who would rather press than swipe
const hint = byId('scroll-hint');
hint.querySelector('span').textContent = `${touchInput ? 'swipe' : 'scroll'} up to begin`;
hint.addEventListener('click', () => goTo(1));

const origin = () => hero.getBoundingClientRect();
const boxOf = (el) => {
  const box = el.getBoundingClientRect();
  const from = origin();
  const left = box.left - from.left;
  const top = box.top - from.top;
  return { left, top, width: box.width, height: box.height, x: left + box.width / 2, y: top + box.height / 2 };
};

// ---------------------------------------------------------------- layout

const range = document.createRange();
// the longest line of text in an element, not the width of its box
const inkWidth = (el) => {
  range.selectNodeContents(el);
  return range.getBoundingClientRect().width;
};

function placePhoto(cx, cy, height) {
  const width = height * ASPECT;
  photo.style.left = `${cx - width / 2}px`;
  photo.style.top = `${cy - height / 2}px`;
  photo.style.width = `${width}px`;
  photo.style.height = `${height}px`;
  return width;
}

// Places the portrait and the words, and returns the height the words may use.
function place() {
  const w = hero.clientWidth;
  const h = hero.clientHeight;
  const u = unitOf(hero);

  if (isStacked()) {
    // Stacked: the words sit at the foot of the screen and the portrait takes all the room above them,
    // under the name. The words must leave the portrait at least a quarter of the screen.
    text.style.width = '';
    text.style.left = '';
    hero.style.removeProperty('--text-left');
    const top = 50 * u;
    const gap = 16 * u;
    const textTop = text.offsetTop;
    const smallest = h * 0.26;
    const room = Math.max(smallest, textTop - gap - top);
    const height = Math.min(room, (w * 0.9) / ASPECT);
    placePhoto(w / 2, top + room / 2, height);
    return h - top - smallest - gap - (h - textTop - text.offsetHeight);
  }

  // Side by side: the portrait keeps its place on the right and the words take the room beside it, nearer the
  // portrait than the page edge.
  const cx = w * 0.705;
  const width = placePhoto(cx, h * 0.535, Math.min(h * 0.86, w * 0.48));
  const clear = parseFloat(getComputedStyle(hero).paddingLeft) || 20 * u;
  const edge = cx - width / 2;
  text.style.width = `${Math.max(320 * u, Math.min(620 * u, edge - clear * 2))}px`;
  const widest = Math.max(intro.offsetWidth, inkWidth(h1), inkWidth(bio), actions.offsetWidth);
  const left = `${Math.max(clear, (edge - widest) * 0.62)}px`;
  text.style.left = left;
  hero.style.setProperty('--text-left', left);
  return h - 110 * u; // clear of the name at the top and the hint at the bottom
}

let afterLayout = () => {};

/** Lay the hero out for the window's size. If the words would not fit, they are drawn smaller until they do. */
export function layoutHero() {
  hero.style.removeProperty('--u');
  let share = 1;
  for (let pass = 0; pass < 6; pass++) {
    const room = place();
    const need = text.offsetHeight;
    if (need <= room || share <= SMALLEST) break;
    share = Math.max(SMALLEST, share * Math.max(0.8, room / need) * 0.985);
    hero.style.setProperty('--u', `calc(var(--u0) * ${share.toFixed(4)})`);
  }
  afterLayout();
}

// with no WebGL, or if the opening fails: the photograph and the words, in place
function showStill() {
  delete hero.dataset.phase;
  parts.forEach((el) => el.classList.remove('pre', 'selected'));
  photograph.classList.add('on');
  hero.classList.add('floating');
}

// ---------------------------------------------------------------- the opening

async function open() {
  layoutHero();
  const inkColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim();
  const faceRenderer = createRenderer(byId('hero-face'), inkColor);
  const wordRenderer = faceRenderer && createRenderer(byId('hero-ink'), inkColor);
  if (!wordRenderer) {
    showStill();
    return;
  }

  const still = reduceMotion;
  let assembled = false;
  let stale = false; // the window changed while the words were still pixels
  parts.forEach((el) => el.classList.add('pre'));
  hero.dataset.phase = 'loading';
  const loader = createLoader(byId('hero-loader'), { instant: still });
  const counted = loader.run();
  loader.real = 0.15;

  // ----- the portrait: letters, heavier where the photo is darker; read along a line and it is the stack -----
  await Promise.race([Promise.all([document.fonts.load('800 50px Archivo'), document.fonts.ready]), wait(1800)]);
  loader.real = 0.35;
  const copy = `${profile.hero.portraitWords.join('·').toUpperCase()}·`;
  const glyphs = [...new Set(copy)];
  const CELL = 64;
  const strip = document.createElement('canvas');
  strip.width = glyphs.length * CELL;
  strip.height = CELL;
  const stripCtx = strip.getContext('2d');
  stripCtx.font = '800 50px Archivo';
  stripCtx.textAlign = 'center';
  stripCtx.textBaseline = 'alphabetic';
  stripCtx.fillStyle = '#000';
  glyphs.forEach((glyph, i) => stripCtx.fillText(glyph, i * CELL + CELL / 2, glyph === '·' ? 44 : 50));

  const map = await loadPortraitMap(PORTRAIT_MAP);
  loader.real = 0.55;
  await wait(30);
  const rows = modestDevice ? 58 : 86;
  const cellHeight = 2 / rows;
  const columns = Math.floor((map.aspect * 2) / (cellHeight * 0.64));
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const u = (column + 0.5) / columns;
      const v = (row + 0.5) / rows;
      const ink = inkAt(map, u, v, 0.0, 1.3);
      if (ink > 0.022) cells.push({ u, v, ink });
    }
  }
  const face = allocDots(cells.length);
  cells.forEach((cell, i) => {
    writeSurface(map, cell.u, cell.v, face, i);
    face.S[i * 2] = 0.9;
    face.S[i * 2 + 1] = 0.6 + 1.75 * cell.ink ** 1.6;
    face.M[i * 3] = (PLAN.photo.start + (i / cells.length) * PLAN.photo.stagger) / SPAN;
    face.M[i * 3 + 1] = Math.random();
    face.M[i * 3 + 2] = cell.ink;
    face.G[i] = glyphs.indexOf(copy[i % copy.length]);
  });

  // ----- the words, as pixels -----
  layoutHero();
  const unit = unitOf(hero);
  const from = origin();
  const marks = [
    [h1, PLAN.h1],
    [bio, PLAN.bio],
    [intro, PLAN.intro],
    [actions, PLAN.actions],
  ].flatMap(([el, plan]) =>
    collectInk(el, { origin: from, pitch: plan.pitch * unit }).map((dot) => ({ ...dot, plan })),
  );
  const words = allocDots(marks.length);
  marks.forEach((dot, i) => {
    words.B[i * 3] = dot.x; // this canvas works in pixels; y runs up
    words.B[i * 3 + 1] = -dot.y;
    words.S[i * 2] = 2.2 * unit;
    words.S[i * 2 + 1] = dot.size;
    words.M[i * 3] = (dot.plan.start + dot.order * dot.plan.stagger) / SPAN;
    words.M[i * 3 + 1] = Math.random();
    words.M[i * 3 + 2] = 1;
    words.G[i] = dot.plan.group;
  });

  let fade = [1, 1, 1, 1]; // one per group of word pixels
  let fadeTo = [1, 1, 1, 1];
  const placeWords = () => {
    wordRenderer.place(0, 0, 2);
    wordRenderer.u.uSize = wordRenderer.dpr;
  };
  afterLayout = () => {
    placeWords();
    // the word pixels were measured for the old window; if it changes mid-opening, hand over to the real words at once
    if (!assembled) {
      stale = true;
      fadeTo = [0, 0, 0, 0];
      [intro, h1, bio, actions].forEach((el) => el.classList.remove('pre'));
    }
  };
  loader.real = 1;
  await counted;

  // ----- everything starts on the ring -----
  const fitFace = (from) => {
    const b = photo.getBoundingClientRect();
    const box = { left: b.left - from.left, top: b.top - from.top, width: b.width, height: b.height };
    faceRenderer.place(box.left + box.width / 2, box.top + box.height / 2, box.height);
    faceRenderer.u.uSize = (box.height / rows) * faceRenderer.dpr;
    return box;
  };
  fitFace(origin());
  placeWords();
  const ring = { x: hero.clientWidth / 2, y: hero.clientHeight / 2, r: RING_RADIUS * unit };
  for (let i = 0; i < face.n; i++) {
    const angle = face.M[i * 3 + 1] * Math.PI * 2;
    const [x, y] = faceRenderer.toUnits(ring.x + Math.sin(angle) * ring.r, ring.y - Math.cos(angle) * ring.r);
    face.A[i * 3] = x;
    face.A[i * 3 + 1] = y;
  }
  for (let i = 0; i < words.n; i++) {
    const angle = words.M[i * 3 + 1] * Math.PI * 2;
    const radius = ring.r * (1 + (Math.random() - 0.5) * 0.06);
    words.A[i * 3] = ring.x + Math.sin(angle) * radius;
    words.A[i * 3 + 1] = -(ring.y - Math.cos(angle) * radius);
  }
  faceRenderer.setDots(face);
  faceRenderer.setAtlas(strip, glyphs.length);
  Object.assign(faceRenderer.u, { uJitter: 0, uArc: 0.12, uSpread: SPREAD, uPersp: 0.1 });
  wordRenderer.setDots(words);
  Object.assign(wordRenderer.u, { uJitter: 0.25, uArc: 70 * unit, uSpread: SPREAD, uPersp: 0 });
  hero.dataset.phase = 'ready';

  // ----- the cursors -----
  const drawRect = byId('draw-rect');
  const cursors = createCursors(byId('cursor-layer'), drawRect);
  const select = (el, cursor, label) => {
    el.style.setProperty('--sel', cursor.color);
    el.dataset.label = label;
    el.classList.add('selected');
  };
  const deselect = (el) => el.classList.remove('selected');

  let launch = performance.now();
  if (stale) fade = [0, 0, 0, 0];
  const until = (seconds) => wait(Math.max(0, launch + seconds * 1000 - performance.now()));
  const pinned = /[?&]t=([\d.]+)/.exec(location.search);
  const PIN = pinned ? +pinned[1] : null;
  const KEEP = /[?&]keep/.test(location.search);
  const live = () => state.current === 0 && !document.hidden;

  // A cursor goes to the ring, takes a part's pixels, and leads them to where the part belongs.
  async function carry(cursor, el, plan, label) {
    const home = boxOf(el);
    await until(plan.start - 0.62);
    await cursors.moveTo(cursor, ring.x + rand(-30, 30) * unit, ring.y + rand(-30, 30) * unit, 500);
    await until(plan.start);
    await cursors.moveTo(cursor, home.x, home.y, 780);
    select(el, cursor, label);
    await until(plan.show);
    el.classList.remove('pre');
    if (!KEEP) fadeTo[plan.group] = 0; // the real words take over from their pixels
    await wait(380);
    deselect(el);
  }
  // The portrait gets a frame first, drawn corner to corner; then its letters pour into it.
  async function framePhoto(cursor) {
    const box = boxOf(photo);
    await cursors.moveTo(cursor, box.left, box.top, 600);
    drawRect.style.cssText = `display:block;left:${box.left}px;top:${box.top}px;width:0;height:0`;
    cursor.draw = { left: box.left, top: box.top };
    await cursors.moveTo(cursor, box.left + box.width, box.top + box.height, 760);
    cursor.draw = null;
    drawRect.style.display = 'none';
    select(photo, cursor, LABELS[0]);
    await until(LANDED + 0.1);
    photo.classList.remove('pre');
    deselect(photo);
  }
  const bounds = () => ({
    left: 30 * unit,
    right: hero.clientWidth - 90 * unit,
    top: 50 * unit,
    bottom: hero.clientHeight - 60 * unit,
  });

  // after the build the cursors keep working: nudging a part, crossing the portrait, wandering
  async function idle(cursor, n) {
    await wait(300 + n * 400);
    for (;;) {
      if (!live()) {
        await wait(600);
        continue;
      }
      const choice = Math.random();
      if (choice < 0.34) {
        const k = Math.floor(Math.random() * parts.length);
        const el = parts[k];
        if (!el.dataset.busy) {
          el.dataset.busy = '1';
          const home = boxOf(el);
          await cursors.moveTo(cursor, home.x, home.y, rand(700, 1100));
          select(el, cursor, LABELS[k]);
          if (el === actions) {
            await wait(rand(500, 900)); // the buttons are looked at, never dragged from under a visitor's pointer
          } else {
            cursor.drag = { el, homeX: home.x, homeY: home.y };
            await cursors.moveTo(cursor, home.x + rand(-22, 22) * unit, home.y + rand(-14, 14) * unit, 480);
            await wait(rand(200, 500));
            await cursors.moveTo(cursor, home.x, home.y, 480);
            cursor.drag = null;
            el.style.transform = '';
          }
          await wait(200);
          deselect(el);
          delete el.dataset.busy;
        }
      } else if (choice < 0.62) {
        const box = boxOf(photo);
        const margin = 30 * unit;
        const fromLeft = Math.random() < 0.5;
        const leftOf = box.left - margin;
        const rightOf = box.left + box.width + margin;
        const across = () => box.top + rand(0.15, 0.85) * box.height;
        await cursors.moveTo(cursor, fromLeft ? leftOf : rightOf, across(), rand(700, 1000));
        await cursors.moveTo(cursor, fromLeft ? rightOf : leftOf, across(), rand(520, 760));
      } else {
        const area = bounds();
        await cursors.moveTo(cursor, rand(area.left, area.right), rand(area.top, area.bottom), rand(900, 1500));
      }
      await wait(rand(250, 900));
    }
  }

  if (still) {
    // reduced motion: everything in place at once, no cursors
    parts.forEach((el) => el.classList.remove('pre'));
    fadeTo = [0, 0, 0, 0];
    fade = [0, 0, 0, 0];
    assembled = true;
    launch -= TOTAL * 1000;
  } else {
    const w = hero.clientWidth;
    const h = hero.clientHeight;
    const off = 40 * unit;
    const designer = cursors.add(people[0], CURSOR_COLORS[0], w + off, h * 0.2);
    const dev = cursors.add(people[1], CURSOR_COLORS[1], w * 0.6, -off);
    const git = cursors.add(people[2], CURSOR_COLORS[2], w + off, h * 0.8);
    const me = cursors.add(people[3], CURSOR_COLORS[3], w * 0.5, h + off);
    Promise.all([
      framePhoto(designer),
      carry(dev, h1, PLAN.h1, LABELS[2]).then(() => carry(dev, intro, PLAN.intro, LABELS[1])),
      carry(git, bio, PLAN.bio, LABELS[3]).then(() => carry(git, actions, PLAN.actions, LABELS[4])),
      until(0.4).then(() => {
        const area = bounds();
        return cursors.moveTo(me, rand(area.left, area.right), rand(area.top, area.bottom), 900);
      }),
    ]).then(() => {
      assembled = true;
      if (KEEP) return;
      hero.classList.add('floating');
      cursors.list.forEach((cursor, n) => idle(cursor, n));
    });
  }

  // ----- every frame -----
  const knock = createLetterPhysics(face, faceRenderer);
  const head = [0, 0];
  const rest = { x: 0, y: 0, since: 0, on: false };
  let last = performance.now();
  let shown = 0;
  let wordsCleared = false;

  // on a touch screen a tap on the portrait toggles the photograph
  window.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !assembled || state.current !== 0) return;
    const b = photo.getBoundingClientRect();
    if (event.clientX > b.left && event.clientX < b.right && event.clientY > b.top && event.clientY < b.bottom) {
      rest.on = !rest.on;
    }
  });

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (!live()) return; // another section is on screen

    const from = origin();
    const t = PIN !== null ? PIN : (now - launch) / 1000;
    const progress = clamp(t / TOTAL, 0, 1);
    cursors.step(now);

    const box = fitFace(from); // the portrait follows its frame, wherever a cursor drags it
    faceRenderer.u.uP = progress;
    faceRenderer.u.uTime = t;
    wordRenderer.u.uP = progress;
    wordRenderer.u.uTime = t;
    for (let i = 0; i < 4; i++) fade[i] += (fadeTo[i] - fade[i]) * toward(dt, 9);
    wordRenderer.u.uFade = fade;

    // the visitor's own pointer: the head leans toward it, and a pointer at rest shows the photograph
    const at = { x: pointer.x - from.left, y: pointer.y - from.top };
    const over =
      assembled &&
      pointer.active &&
      at.x > box.left &&
      at.x < box.left + box.width &&
      at.y > box.top &&
      at.y < box.top + box.height;
    if (pointer.touch) {
      if (!over && pointer.active && now - pointer.at < 400 && assembled) rest.on = false;
    } else if (over) {
      // once it is showing, the photograph stays until the pointer leaves the portrait
      if (!rest.on) {
        if (Math.hypot(at.x - rest.x, at.y - rest.y) > 5) Object.assign(rest, { x: at.x, y: at.y, since: now });
        else if (now - rest.since > REST_MS) rest.on = true;
      }
    } else rest.on = false;

    let lean = [0, 0];
    if (pointer.active && assembled && !still) {
      lean = [0.14 * ((at.x / hero.clientWidth) * 2 - 1), 0.06 * (1 - (at.y / hero.clientHeight) * 2)];
    }
    head[0] += (lean[0] - head[0]) * toward(dt, 3);
    head[1] += (lean[1] - head[1]) * toward(dt, 3);
    shown += ((rest.on ? 1 : 0) - shown) * toward(dt, rest.on ? 18 : 8);
    photograph.classList.toggle('on', rest.on);
    faceRenderer.u.uHead = [head[0], -head[1]];
    faceRenderer.u.uOpacity = 1 - shown * 0.95;

    // once every letter is home, the pointer and the cursors are stones that can knock them
    if (t > LANDED && !still) knock(Math.min(0.032, dt), box, [pointer.active ? at : null, ...cursors.list]);

    faceRenderer.draw();
    if (fade[0] + fade[1] + fade[2] + fade[3] > 0.004) wordRenderer.draw();
    else if (!wordsCleared) {
      wordsCleared = true;
      wordRenderer.u.uOpacity = 0;
      wordRenderer.draw();
    }
  }
  requestAnimationFrame(frame);
}

open().catch((error) => {
  console.error(error);
  showStill();
});
