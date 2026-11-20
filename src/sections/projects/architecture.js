// Draws a project's architecture.json as a flow diagram: boxes on a grid, arrows between them, and (when
// motion is allowed) dots that keep travelling along the arrows. Returns SVG markup; touches nothing.
//
// A node sits at a column and a row. kind "person" and "storage" are drawn differently from a service.
// A label written "Name, detail" is set on two lines.

import { esc } from '../../lib/util.js';

const CELL_W = 186;
const CELL_H = 104;
const BOX_W = 146;
const BOX_H = 52;

// the four numbers pairs of a cubic curve from one box to another, chosen by where the boxes sit
function route(from, to) {
  if (to.col > from.col) {
    const bend = Math.min(46, (to.x - from.x - BOX_W) / 2 + 10);
    return [from.x + BOX_W, from.cy, from.x + BOX_W + bend, from.cy, to.x - bend, to.cy, to.x - 5, to.cy];
  }
  if (to.col === from.col && to.row > from.row) {
    return [from.cx, from.y + BOX_H, from.cx, from.y + BOX_H + 12, to.cx, to.y - 14, to.cx, to.y - 5];
  }
  if (to.col === from.col) {
    return [from.cx, from.y, from.cx, from.y - 12, to.cx, to.y + BOX_H + 14, to.cx, to.y + BOX_H + 5];
  }
  if (to.row === from.row) {
    // back along the same row: loop underneath
    return [from.cx, from.y + BOX_H, from.cx, from.y + BOX_H + 40, to.cx, to.y + BOX_H + 40, to.cx, to.y + BOX_H + 5];
  }
  const startY = to.row > from.row ? from.y + BOX_H : from.y;
  return [from.cx, startY, from.cx, to.cy, to.x + BOX_W + 44, to.cy, to.x + BOX_W + 5, to.cy];
}

/**
 * @param {{ nodes: {id: string, label: string, col: number, row: number, kind?: string}[], edges: {from: string, to: string, label?: string}[] }} diagram
 * @param {{ animate?: boolean }} [options]
 */
export function architectureSvg(diagram, { animate = true } = {}) {
  const nodes = new Map();
  let columns = 0;
  let rows = 0;
  for (const spec of diagram.nodes) {
    const x = spec.col * CELL_W + (CELL_W - BOX_W) / 2;
    const y = spec.row * CELL_H + (CELL_H - BOX_H) / 2;
    nodes.set(spec.id, { ...spec, x, y, cx: x + BOX_W / 2, cy: y + BOX_H / 2 });
    columns = Math.max(columns, spec.col + 1);
    rows = Math.max(rows, spec.row + 1);
  }
  const width = columns * CELL_W;
  const height = rows * CELL_H + 16;

  let arrows = '';
  let dots = '';
  diagram.edges.forEach((edge, i) => {
    const from = nodes.get(edge.from);
    const to = nodes.get(edge.to);
    if (!from || !to) return;
    const p = route(from, to);
    const d = `M${p[0]},${p[1]} C${p[2]},${p[3]} ${p[4]},${p[5]} ${p[6]},${p[7]}`;
    arrows += `<path class="ae" pathLength="1" style="--i:${i}" marker-end="url(#arch-arrow)" d="${d}"/>`;
    if (edge.label) {
      const midX = (p[0] + 3 * p[2] + 3 * p[4] + p[6]) / 8;
      // a label between two boxes in a row sits above them, where there is room
      const midY = to.row === from.row && to.col > from.col ? from.y - 3 : (p[1] + 3 * p[3] + 3 * p[5] + p[7]) / 8;
      arrows += `<text class="al" style="--i:${i}" x="${midX.toFixed(1)}" y="${(midY - 5).toFixed(1)}">${esc(edge.label)}</text>`;
    }
    if (animate) {
      const duration = 1.9 + (i % 3) * 0.25;
      const begin = (0.9 + i * 0.16).toFixed(2);
      dots += `<circle class="ad" r="3.6"><animateMotion dur="${duration}s" begin="${begin}s" repeatCount="indefinite" path="${d}"/></circle>`;
    }
  });

  let boxes = '';
  for (const node of nodes.values()) {
    const [title, ...detail] = node.label.split(', ');
    const sub = detail.length ? `<tspan class="sub" x="${node.cx}" dy="16">${esc(detail.join(', '))}</tspan>` : '';
    boxes +=
      `<g class="an ${node.kind || 'service'}" style="--c:${node.col}"><rect x="${node.x}" y="${node.y}" width="${BOX_W}" height="${BOX_H}"/>` +
      `<text x="${node.cx}" y="${node.cy + (detail.length ? -3 : 5)}">${esc(title)}${sub}</text></g>`;
  }

  return (
    `<div class="arch"><svg viewBox="0 0 ${width} ${height}" style="max-width:calc(${width} * var(--u))" role="img" aria-label="Architecture diagram">` +
    '<defs><marker id="arch-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M0,0.5 L7,4 L0,7.5 Z"/></marker></defs>' +
    `${arrows}${boxes}${dots}</svg></div>`
  );
}
