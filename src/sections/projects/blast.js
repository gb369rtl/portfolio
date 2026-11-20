// "View all projects": the button squeezes into a grenade, the grenade is lobbed into the middle of the sphere,
// and it goes off. Animation only; the caller decides what the blast does.

import { app } from '../../core/dom.js';
import { rand, wait } from '../../lib/util.js';

const GRENADE_W = 44;
const GRENADE_H = 56;
const SHARDS = 22;
const GRENADE =
  `<svg viewBox="0 0 ${GRENADE_W} ${GRENADE_H}"><rect x="16" y="6" width="12" height="9" fill="#10231C"/>` +
  '<path d="M27 8 H37 Q41 8 41 13 V30" fill="none" stroke="#10231C" stroke-width="4" stroke-linecap="round"/>' +
  '<circle cx="9" cy="8" r="6" fill="none" stroke="#C92A0E" stroke-width="3"/><path d="M15 9 H18" stroke="#C92A0E" stroke-width="3"/>' +
  '<ellipse cx="22" cy="35" rx="16" ry="19" fill="#10231C"/>' +
  '<path d="M8 28 H36 M6.5 36 H37.5 M9 44 H35 M15 17.5 V52.5 M22 16 V54 M29 17.5 V52.5" stroke="#F3E24B" stroke-width="1.6" opacity="0.85"/></svg>';

const at = (x, y, extra = '') => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) ${extra}`;

/**
 * @param {HTMLElement} container the box the grenade flies in; the blast is at its centre
 * @param {HTMLElement} button where the grenade starts
 * @param {{ unit: number, colors: string[] }} options unit: one design pixel in real pixels; colors: the shards' colours
 * @returns {Promise<void>} resolves at the moment of the blast
 */
export async function throwGrenade(container, button, { unit, colors }) {
  const box = container.getBoundingClientRect();
  const start = button.getBoundingClientRect();
  const startX = start.left + start.width / 2 - box.left;
  const startY = start.top + start.height / 2 - box.top;
  const centreX = box.width / 2;
  const centreY = box.height / 2;

  const grenade = document.createElement('div');
  grenade.className = 'grenade';
  grenade.innerHTML = GRENADE;
  container.appendChild(grenade);

  // 1. the button squeezes down into the grenade
  const squeeze = `scale(${(start.width / (GRENADE_W * unit)).toFixed(2)},${(start.height / (GRENADE_H * unit)).toFixed(2)})`;
  await grenade.animate(
    [
      { transform: at(startX, startY, squeeze), opacity: 0.2 },
      { transform: at(startX, startY, 'scale(1.25)'), opacity: 1, offset: 0.7 },
      { transform: at(startX, startY, 'scale(1)'), opacity: 1 },
    ],
    { duration: 320, easing: 'cubic-bezier(.22, 1, .36, 1)', fill: 'forwards' },
  ).finished;
  await wait(140);

  // 2. it is lobbed in an arc into the middle of the sphere, growing as it comes
  const peakX = (startX + centreX) / 2;
  const peakY = Math.min(startY, centreY) - 150 * unit;
  await grenade.animate(
    [
      { transform: at(startX, startY, 'rotate(0deg) scale(1)') },
      { transform: at(peakX, peakY, 'rotate(300deg) scale(1.7)'), offset: 0.45 },
      { transform: at(centreX, centreY, 'rotate(620deg) scale(2.6)') },
    ],
    { duration: 720, easing: 'cubic-bezier(.4, 0, .6, 1)', fill: 'forwards' },
  ).finished;
  await wait(160);
  grenade.remove();

  // 3. the blast: a flash, a ring, shards and a shake
  const burst = (className, keyframes, options) => {
    const el = document.createElement('div');
    el.className = className;
    el.style.left = `${centreX}px`;
    el.style.top = `${centreY}px`;
    container.appendChild(el);
    el.animate(keyframes, options).onfinish = () => el.remove();
    return el;
  };
  burst(
    'blast-flash',
    [
      { transform: 'scale(0.15)', opacity: 1 },
      { transform: 'scale(4.2)', opacity: 0 },
    ],
    {
      duration: 620,
      easing: 'cubic-bezier(.16, .8, .3, 1)',
    },
  );
  burst(
    'blast-ring',
    [
      { transform: 'scale(0.1)', opacity: 0.9 },
      { transform: 'scale(5)', opacity: 0 },
    ],
    {
      duration: 700,
      easing: 'ease-out',
    },
  );
  for (let i = 0; i < SHARDS; i++) {
    const angle = rand(0, Math.PI * 2);
    const distance = rand(260, 620) * unit;
    const x = (Math.cos(angle) * distance).toFixed(0);
    const y = (Math.sin(angle) * distance).toFixed(0);
    const shard = burst(
      'blast-bit',
      [
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${x}px,${y}px) rotate(${rand(-500, 500).toFixed(0)}deg)`, opacity: 0 },
      ],
      { duration: rand(600, 950), easing: 'cubic-bezier(.16, .8, .3, 1)' },
    );
    shard.style.background = colors[i % colors.length];
  }
  app.animate(
    [
      { transform: 'translate(0,0)' },
      { transform: 'translate(-12px,8px)' },
      { transform: 'translate(10px,-7px)' },
      { transform: 'translate(-6px,4px)' },
      { transform: 'translate(3px,-2px)' },
      { transform: 'translate(0,0)' },
    ],
    { duration: 340, easing: 'ease-out' },
  );
}
