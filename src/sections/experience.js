// Experience: the jobs are commits on the right. Click one and a hand comes in, presses it, picks it up and
// carries it onto the page, where its work is listed as commit lines.

import { experience } from '../core/content.js';
import { byId, sectionEl } from '../core/dom.js';
import { reduceMotion } from '../core/env.js';
import { unitOf } from '../core/scale.js';
import { isOn, state } from '../core/state.js';
import { setHeadCommit } from '../graph/graph.js';
import { capitalize, esc, wait } from '../lib/util.js';

const EASE_OUT = 'cubic-bezier(.22, 1, .36, 1)';
const DRAG = 'cubic-bezier(.5, 0, .2, 1)';
const HAND =
  '<svg viewBox="0 0 46 46"><g fill="#FBFCF9" stroke="#10231C" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round">' +
  '<rect class="f" x="10" y="9" width="6.5" height="19" rx="3.25"/><rect class="f" x="16.8" y="5" width="6.5" height="22" rx="3.25"/>' +
  '<rect class="f" x="23.6" y="6" width="6.5" height="21" rx="3.25"/><rect class="f" x="30.4" y="10" width="6.5" height="18" rx="3.25"/>' +
  '<path class="t" d="M10.5 30 L5.5 24 Q3.4 21 6 19.4 Q8.4 18.2 10.4 21"/>' +
  '<path d="M10 22 L10 31 Q10 42 23 42 Q37 42 37 30 L37 22 Z"/></g></svg>';

const section = sectionEl('experience');
const rail = byId('exp-rail');
const detail = byId('exp-detail');
const hint = rail.querySelector('.exp-hint');

// ----- the jobs as commits, newest first -----
const buttons = experience
  .map((job, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'exp-commit';
    button.dataset.i = i;
    button.style.setProperty('--n', experience.length - 1 - i);
    button.innerHTML = `<b><span>${esc(job.company)}</span></b><small>${esc(job.role)}</small><small>${esc(job.dates)}</small>`;
    button.addEventListener('click', () => pull(i));
    return button;
  })
  .reverse();
buttons.forEach((button) => rail.insertBefore(button, hint));

// ----- every job's page is laid out in the same place; only the chosen one is visible -----
detail.innerHTML = experience
  .map(
    (job) =>
      `<div class="exp-card"><div class="exp-dates">${esc(job.dates)}</div><h3>${esc(job.company)}</h3>` +
      `<div class="exp-role">${esc(job.role)}</div><ul class="exp-list">${job.work
        .map(
          (line, j) =>
            `<li style="--j:${j}"><span class="scope">${esc(line.scope)}</span><span>${esc(capitalize(line.text))}</span></li>`,
        )
        .join('')}</ul></div>`,
  )
  .join('');
const cards = [...detail.children];

const hand = document.createElement('div');
hand.id = 'grab-hand';
hand.setAttribute('aria-hidden', 'true');
hand.innerHTML = HAND;
document.body.appendChild(hand);

let busy = false;
let shownJob = -1;
let queued = null;

function show(index) {
  shownJob = index;
  if (isOn('experience') && !state.isTransitioning) setHeadCommit(1 + index);
  buttons.forEach((button) => {
    const on = +button.dataset.i === index;
    button.classList.toggle('active', on);
    if (on) button.classList.add('seen');
  });
  cards.forEach((card, i) => card.classList.toggle('shown', i === index));
}

const at = (x, y) => `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
const move = (el, from, to, duration, easing = EASE_OUT) =>
  el.animate([{ transform: from }, { transform: to }], { duration, easing, fill: 'forwards' }).finished;

// The hand, the press ring and the lifted name are drawn over the whole page, outside the section, so they are
// given the section's unit to stay the same size as what they point at.
function floating(className, u) {
  const el = document.createElement('div');
  el.className = className;
  el.style.setProperty('--u', `${u}px`);
  document.body.appendChild(el);
  return el;
}

async function pull(index) {
  if (busy || index === shownJob) return;
  if (reduceMotion) {
    show(index);
    return;
  }
  busy = true;
  const u = unitOf(section);
  hand.style.setProperty('--u', `${u}px`);
  const button = buttons.find((b) => +b.dataset.i === index);
  const name = button.querySelector('b span').getBoundingClientRect();
  const page = detail.getBoundingClientRect();
  const handX = name.left + name.width * 0.5 - 16 * u;
  const handY = name.top + name.height * 0.5 - 6 * u;

  hand.classList.remove('closed');
  hand.classList.add('on');
  await move(hand, at(window.innerWidth + 40 * u, window.innerHeight * 0.75), at(handX, handY), 560);

  // the hand presses the commit first, the way a visitor would click it
  hand.classList.add('press');
  button.classList.add('pressed');
  const ring = floating('exp-press', u);
  // placed with `translate`, not `transform`: the ring animates `scale`, and a transform would be scaled with it,
  // which made the ring slide in from the corner instead of growing where the hand pressed
  ring.style.translate = `${(handX + 16 * u).toFixed(1)}px ${(handY + 8 * u).toFixed(1)}px`;
  ring
    .animate(
      [
        { scale: 0.3, opacity: 1 },
        { scale: 1.5, opacity: 0 },
      ],
      { duration: 420, easing: EASE_OUT },
    )
    .finished.then(() => ring.remove());
  await wait(240);
  hand.classList.remove('press');
  button.classList.remove('pressed');
  await wait(90);

  // then closes on it
  hand.classList.add('closed');
  const ghost = floating('exp-ghost', u);
  ghost.textContent = experience[index].company;
  const ghostX = name.left - 10 * u;
  const ghostY = name.top - 6 * u;
  ghost.style.transform = at(ghostX, ghostY);
  button.classList.add('lifted');
  detail.querySelector('.exp-card.shown')?.classList.remove('shown');
  await wait(160);

  // and carries it across to the page
  const targetX = page.left;
  const targetY = page.top + 22 * u;
  const dx = targetX - ghostX;
  const dy = targetY - ghostY;
  await Promise.all([
    move(
      ghost,
      `${at(ghostX, ghostY)} rotate(0deg) scale(1)`,
      `${at(targetX, targetY)} rotate(-3deg) scale(1.7)`,
      760,
      DRAG,
    ),
    move(hand, at(handX, handY), at(handX + dx + 40 * u, handY + dy + 16 * u), 760, DRAG),
  ]);
  hand.classList.remove('closed');
  show(index);
  ghost
    .animate([{ opacity: 1 }, { opacity: 0 }], { duration: 280, fill: 'forwards' })
    .finished.then(() => ghost.remove());
  button.classList.remove('lifted');
  await move(
    hand,
    at(handX + dx + 40 * u, handY + dy + 16 * u),
    at(handX + dx - 30 * u, window.innerHeight + 70 * u),
    320,
  );
  hand.classList.remove('on');
  rail.classList.add('invite'); // the commits nobody has opened yet now ask to be clicked
  busy = false;

  if (queued !== null) {
    const next = queued;
    queued = null;
    pull(next);
  }
}

/**
 * Called each time the section is entered. Every visit starts over: the page is empty again and the hand
 * shows the move once more.
 * @param {number | null} jobIndex the job whose commit was clicked in the tree; null for the latest one
 */
export function enterExperience(jobIndex) {
  const wanted = jobIndex ?? experience.length - 1;
  if (busy) {
    queued = wanted;
    return;
  }
  shownJob = -1;
  cards.forEach((card) => card.classList.remove('shown'));
  rail.classList.remove('invite');
  buttons.forEach((button) => button.classList.remove('active', 'seen'));
  if (reduceMotion) {
    show(wanted);
    rail.classList.add('invite');
  } else pull(wanted);
}
