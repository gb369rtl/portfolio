// The other people "editing" the hero: name-tagged cursors that move in slight curves, the way a hand does.
// A cursor can drag an element along with it, or draw a selection rectangle as it goes.

import { rand } from '../../lib/util.js';

const ARROW = 'M1.5,1.5 L1.5,17.5 L6,13.6 L9,20.5 L12,19.2 L9,12.5 L15,12.5 Z';
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const at = (x, y) => `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;

/**
 * @param {HTMLElement} layer where the cursors are drawn
 * @param {HTMLElement} drawRect the rectangle a cursor can draw
 */
export function createCursors(layer, drawRect) {
  const list = [];

  function add(name, color, x, y) {
    const el = document.createElement('div');
    el.className = 'fake-cursor';
    el.innerHTML =
      `<svg viewBox="0 0 18 22"><path d="${ARROW}" style="fill:${color};stroke:var(--text)" stroke-width="1.2" stroke-linejoin="round"/></svg>` +
      `<span style="background:${color}"></span>`;
    el.querySelector('span').textContent = name;
    el.style.transform = at(x, y);
    layer.appendChild(el);
    const cursor = { el, color, x, y, tween: null, drag: null, draw: null };
    list.push(cursor);
    return cursor;
  }

  /** Move a cursor; resolves when it arrives. */
  function moveTo(cursor, x, y, duration) {
    return new Promise((resolve) => {
      const dx = x - cursor.x;
      const dy = y - cursor.y;
      const length = Math.hypot(dx, dy) || 1;
      const bow = rand(-0.12, 0.12) * length; // a slight curve reads as a hand
      cursor.tween = {
        fromX: cursor.x,
        fromY: cursor.y,
        toX: x,
        toY: y,
        start: null,
        duration,
        bowX: (-dy / length) * bow,
        bowY: (dx / length) * bow,
        resolve,
      };
    });
  }

  /** Advance every cursor to the time `now`. Call once per frame. */
  function step(now) {
    for (const cursor of list) {
      const tween = cursor.tween;
      if (tween) {
        tween.start ??= now;
        const progress = Math.min(1, (now - tween.start) / tween.duration);
        const eased = easeInOut(progress);
        const bow = Math.sin(Math.PI * progress);
        cursor.x = tween.fromX + (tween.toX - tween.fromX) * eased + tween.bowX * bow;
        cursor.y = tween.fromY + (tween.toY - tween.fromY) * eased + tween.bowY * bow;
        if (progress >= 1) {
          cursor.tween = null;
          tween.resolve();
        }
      }
      cursor.el.style.transform = at(cursor.x, cursor.y);
      if (cursor.drag) cursor.drag.el.style.transform = at(cursor.x - cursor.drag.homeX, cursor.y - cursor.drag.homeY);
      if (cursor.draw) {
        drawRect.style.width = `${Math.max(0, cursor.x - cursor.draw.left)}px`;
        drawRect.style.height = `${Math.max(0, cursor.y - cursor.draw.top)}px`;
      }
    }
  }

  return { list, add, moveTo, step };
}
