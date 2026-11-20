// Draws the git history twice from one model: the tree on the left edge, which is also the page's navigation
// (every commit that has been drawn can be clicked), and the full-height commit table shown during a section
// change and as the commit menu.

import { experience, profile, projects } from '../core/content.js';
import { byId, graphWrap } from '../core/dom.js';
import { reduceMotion } from '../core/env.js';
import { jump } from '../core/router.js';
import { pageUnit } from '../core/scale.js';
import { state } from '../core/state.js';
import { esc } from '../lib/util.js';
import { buildHistory, commitRef as refOf, treeShape } from './model.js';

const history = buildHistory({ experience, projects, release: profile.contact.release });

export const COMMITS = history.commits;
/** The commit HEAD rests on in each section. */
export const HEAD_ROW = history.headRows;

const STAGE_GROUPS = { 1: ['exp'], 2: ['dev'], 3: ['proj'], 4: ['merge'] };
const total = COMMITS.length;

const rail = byId('git-graph');
const table = byId('gg-full');
const tip = byId('gg-tip');

const refsHtml = (commit) =>
  commit.refs
    .map(
      (ref) =>
        `<span class="gg-ref${ref.dark ? ' dark' : ''}${ref.moves ? ' moves' : ''}" style="--c:${commit.color}">${esc(ref.name)}</span>`,
    )
    .join('');
const messageHtml = (commit) => `<b>${esc(commit.type)}:</b> ${esc(commit.subject)}`;

function treeMarkup(shape, radius) {
  const paths = shape.paths.map(
    (path) =>
      `<path class="gp${path.group === 'main' ? ' on' : ''}" data-g="${path.group}" pathLength="1" style="stroke:${path.color}" d="${path.d}"/>`,
  );
  const nodes = shape.nodes.map(
    (node, row) =>
      `<circle class="gn${row === 0 ? ' on' : ''}" data-g="${node.group}" data-k="${row}" style="--c:${node.color}" cx="${node.x}" cy="${node.y}" r="${radius}"/>`,
  );
  return paths.join('') + nodes.join('');
}

// ----- the commit table: the tree at a fixed size beside one row per commit, newest first -----
const tableShape = treeShape(history, 16, 18, 40);
const tableSvg = byId('gg-big');
tableSvg.setAttribute('viewBox', `0 0 ${tableShape.width} ${tableShape.height}`);
tableSvg.innerHTML = treeMarkup(tableShape, 5.5);
byId('gg-rows').innerHTML = COMMITS.map(
  (commit, row) =>
    `<div class="gg-row${row === 0 ? ' on' : ''}" data-g="${commit.group}" data-k="${row}"><span class="gg-ref dark gg-hp">HEAD</span>` +
    `${refsHtml(commit)}<span class="gg-msg">${messageHtml(commit)}</span><span class="gg-when">${esc(commit.when)}</span></div>`,
)
  .reverse()
  .join('');

/** The table's graph column is as wide as the tree is at the table's height. */
function fitTable() {
  const body = table.querySelector('.gg-body');
  table.style.setProperty('--gg-gw', `${((body.clientHeight * tableShape.width) / tableShape.height).toFixed(1)}px`);
}

// ----- the tree on the left, in real pixels. It is the full height of the page from the first section on,
//       so every commit arrives at the size it keeps. -----
rail.innerHTML =
  `<g class="gg-ink">${treeMarkup(treeShape(history, 1, 1, 1), 3)}</g>` +
  COMMITS.map(
    (commit, row) => `<rect class="gh${row === 0 ? ' on' : ''}" data-g="${commit.group}" data-k="${row}"/>`,
  ).join('') +
  '<circle class="gg-halo"/><circle class="gg-hot"/>';
const railPaths = rail.querySelectorAll('.gp');
const railNodes = rail.querySelectorAll('.gn');
const railBands = rail.querySelectorAll('.gh'); // one band per commit, as wide as the tree: point anywhere level with it
const halo = rail.querySelector('.gg-halo');
const hot = rail.querySelector('.gg-hot');

let railShape = null;
let railRadius = 4.6;
let hovered = -1;

function drawRail() {
  const u = pageUnit();
  const height = graphWrap.clientHeight - 38 * u; // 16 above, 22 below
  railShape = treeShape(history, 6.44 * u, 7.24 * u, height / total);
  railRadius = 4.6 * u;
  rail.style.width = `${railShape.width.toFixed(1)}px`;
  rail.style.height = `${height.toFixed(1)}px`;
  rail.setAttribute('viewBox', `0 0 ${railShape.width.toFixed(1)} ${height.toFixed(1)}`);
  railPaths.forEach((path, i) => path.setAttribute('d', railShape.paths[i].d));
  railNodes.forEach((node, row) => {
    const at = railShape.nodes[row];
    node.setAttribute('cx', at.x);
    node.setAttribute('cy', at.y);
    node.setAttribute('r', railRadius.toFixed(2));
    const band = railBands[row];
    band.setAttribute('x', 0);
    band.setAttribute('y', (at.y - railShape.rowHeight / 2).toFixed(2));
    band.setAttribute('width', railShape.width.toFixed(1));
    band.setAttribute('height', railShape.rowHeight.toFixed(2));
  });
  // the sections leave exactly this much room on the left, however many project lanes there are
  document.documentElement.style.setProperty('--graph-w', `calc(${(railShape.width / u).toFixed(1)} * var(--u))`);
  if (hovered >= 0) hoverCommit(hovered);
}

const isMerged = () => railNodes[total - 1].classList.contains('on');

/** Light up one commit in the tree and open its message beside it. Pass -1 to clear. */
export function hoverCommit(row) {
  hovered = row;
  const on = row >= 0;
  hot.classList.toggle('on', on);
  halo.classList.toggle('on', on);
  tip.classList.toggle('on', on);
  if (!on) return;
  const u = pageUnit();
  const at = railShape.nodes[row];
  const commit = COMMITS[row];
  const box = rail.getBoundingClientRect();
  const radius = railRadius * 1.45;
  const gap = 12 * u;
  for (const dot of [hot, halo]) {
    dot.setAttribute('cx', at.x);
    dot.setAttribute('cy', at.y);
    dot.setAttribute('r', radius.toFixed(2));
    dot.style.setProperty('--c', commit.color);
  }
  const refs = row === 0 && isMerged() ? '' : refsHtml(commit); // after the merge, main is no longer on the first commit
  tip.innerHTML =
    (row === state.headCommit ? '<span class="gg-ref dark">HEAD</span>' : '') +
    `${refs}<span class="gg-msg">${messageHtml(commit)}</span>` +
    (commit.when ? `<span class="gg-when">${esc(commit.when)}</span>` : '');
  tip.style.setProperty('--c', commit.color);
  tip.style.setProperty('--lead', `${Math.max(0, railShape.width + gap - at.x - radius - 4 * u).toFixed(1)}px`);
  tip.style.left = `${(box.left + railShape.width + gap).toFixed(1)}px`;
  tip.style.top = `${(box.top + at.y).toFixed(1)}px`;
}

const bandOf = (event) => (event.target instanceof Element ? event.target.closest('.gh') : null);
rail.addEventListener('mouseover', (event) => {
  const band = bandOf(event);
  if (band) hoverCommit(+band.dataset.k);
});
rail.addEventListener('mouseout', (event) => {
  if (!event.relatedTarget || !rail.contains(event.relatedTarget)) hoverCommit(-1);
});
rail.addEventListener('click', (event) => {
  const band = bandOf(event);
  if (band) jump(+band.dataset.k);
});

/** Draw the lanes of a group, then let its commits and rows appear one after another, `step` ms apart. */
export function reveal(group, step) {
  document.querySelectorAll(`.gp[data-g="${group}"]`).forEach((el) => el.classList.add('on'));
  document
    .querySelectorAll(`.gn[data-g="${group}"], .gg-row[data-g="${group}"], .gh[data-g="${group}"]`)
    .forEach((el) => {
      el.style.transitionDelay = step ? `${(+el.dataset.k % 20) * step}ms` : '0ms';
      el.classList.add('on');
    });
}

/** Draw everything a section adds, at once (used when a jump passes over sections that were never visited). */
export function revealStage(sectionIndex) {
  (STAGE_GROUPS[sectionIndex] || []).forEach((group) => reveal(group, 0));
}

/** Move HEAD to a commit. */
export function setHeadCommit(row) {
  state.headCommit = row;
  const key = String(row);
  document.querySelectorAll('.gn, .gg-row').forEach((el) => el.classList.toggle('head', el.dataset.k === key));
}

/** Move HEAD to the commit a section rests on. */
export function setHeadSection(sectionIndex) {
  setHeadCommit(HEAD_ROW[sectionIndex]);
}

/** How git would name a commit right now. */
export const commitRef = (row) => refOf(history, row, isMerged());

/** Redraw for the window's size. */
export function layoutGraph() {
  drawRail();
  fitTable();
}

if (reduceMotion) [1, 2, 3, 4].forEach(revealStage);
setHeadSection(0);
layoutGraph();
