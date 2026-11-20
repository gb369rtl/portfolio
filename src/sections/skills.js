// Skills: one tape per group that keeps running; the highlighted items are the ones reached for most.

import { skills } from '../core/content.js';
import { byId } from '../core/dom.js';
import { esc } from '../lib/util.js';

const SECONDS_PER_ITEM = 3.6;
const COPIES = 4; // the tape is four copies long and moves by one, so it never shows a gap

const list = byId('skills');

for (const group of skills) {
  const highlight = new Set(group.highlight);
  const tape = (hidden) =>
    group.items
      .map(
        (item) =>
          `<span${highlight.has(item) ? ' class="core"' : ''}${hidden ? ' aria-hidden="true"' : ''}>${esc(item)}</span>`,
      )
      .join('');
  const row = document.createElement('div');
  row.className = 'sk-row';
  row.innerHTML =
    `<h3>${esc(group.name)}</h3><div class="sk-track">` +
    `<div class="sk-run" style="--dur:${(group.items.length * SECONDS_PER_ITEM).toFixed(1)}s">` +
    `${tape(false)}${tape(true).repeat(COPIES - 1)}</div></div>`;
  list.appendChild(row);
}
