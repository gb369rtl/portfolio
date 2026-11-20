// The commands that are "run" between sections: each line is hammered onto the page by the word Enter.
// A ceremony can be skipped with Escape, which is why its pauses go through sleep() and not a plain timer.

import { app, byId } from '../core/dom.js';
import { reduceMotion } from '../core/env.js';
import { pageUnit } from '../core/scale.js';
import { state } from '../core/state.js';
import { esc, rand } from '../lib/util.js';

const stack = byId('cmd-stack');
const linesEl = byId('cmd-lines');
const hammer = byId('hammer');

const pending = [];

/** A pause inside a ceremony. Resolves at once when motion is reduced or the visitor has asked to skip. */
export function sleep(ms) {
  if (reduceMotion || state.skipping) return Promise.resolve();
  return new Promise((resolve) => {
    const entry = { resolve };
    entry.id = setTimeout(() => {
      pending.splice(pending.indexOf(entry), 1);
      resolve();
    }, ms);
    pending.push(entry);
  });
}

/** Finish the running ceremony now. */
export function skipCeremony() {
  if (!state.inCeremony) return;
  state.skipping = true;
  pending.splice(0).forEach((entry) => {
    clearTimeout(entry.id);
    entry.resolve();
  });
}

export function hideCommands() {
  stack.classList.remove('active');
}

function impactAt(x, y, u) {
  app.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: 'translate(-8px,6px)' },
      { transform: 'translate(7px,-4px)' },
      { transform: 'translate(-4px,3px)' },
      { transform: 'translate(2px,-1px)' },
      { transform: 'translate(0,0)' },
    ],
    { duration: 260, easing: 'ease-out' },
  );
  const spark = (className, keyframes, duration) => {
    const el = document.createElement('div');
    el.className = className;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    stack.appendChild(el);
    el.animate(keyframes, { duration, easing: 'ease-out' }).onfinish = () => el.remove();
  };
  spark(
    'impact-ring',
    [
      { transform: 'scale(0.1)', opacity: 0.9 },
      { transform: 'scale(1)', opacity: 0 },
    ],
    420,
  );
  spark(
    'impact-flash',
    [
      { transform: 'scale(0.4)', opacity: 1 },
      { transform: 'scale(1.5)', opacity: 0 },
    ],
    260,
  );
  for (let i = 0; i < 9; i++) {
    const bit = document.createElement('div');
    bit.className = 'debris';
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    stack.appendChild(bit);
    const angle = rand(-Math.PI, 0);
    const distance = rand(40, 120) * u;
    bit.animate(
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(${Math.cos(angle) * distance}px,${Math.sin(angle) * distance + 70 * u}px) rotate(${rand(-300, 300)}deg)`,
          opacity: 0,
        },
      ],
      { duration: rand(420, 640), easing: 'cubic-bezier(.2,.6,.4,1)' },
    ).onfinish = () => bit.remove();
  }
}

/** Show a list of shell commands, each struck onto the page in turn. */
export async function hammerLines(lines) {
  linesEl.innerHTML = '';
  stack.classList.add('active');
  const rows = lines.map((line) => {
    const row = document.createElement('div');
    row.className = 'cmd-line';
    row.innerHTML = `<span class="prompt">$</span>${esc(line)}`;
    linesEl.appendChild(row);
    return row;
  });
  const u = pageUnit();
  for (const [i, row] of rows.entries()) {
    if (state.skipping || reduceMotion) {
      row.style.visibility = 'visible';
      continue;
    }
    const faceY = row.offsetTop + 6 * u; // where the hammer's face lands
    hammer.style.top = `${faceY - 68 * u}px`; // the face sits 68 units down the hammer's own box
    hammer.classList.add('shown');
    const swing = hammer.animate([{ transform: 'rotate(64deg)' }, { transform: 'rotate(0deg)' }], {
      duration: 150,
      easing: 'cubic-bezier(.6,0,1,.45)',
      fill: 'forwards',
    });
    await sleep(150);
    row.classList.add('hit');
    impactAt(14 * u, faceY + 8 * u, u);
    await sleep(110);
    swing.cancel();
    hammer.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(64deg)' }], {
      duration: 190,
      easing: 'ease-out',
    });
    await sleep(i === rows.length - 1 ? 200 : 230);
  }
  hammer.classList.remove('shown');
}
