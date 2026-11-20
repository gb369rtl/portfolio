import assert from 'node:assert/strict';
import { test } from 'node:test';
import { architectureSvg } from '../src/sections/projects/architecture.js';

const diagram = {
  nodes: [
    { id: 'user', label: 'Reviewer', col: 0, row: 0, kind: 'person' },
    { id: 'api', label: 'API, FastAPI', col: 1, row: 0 },
    { id: 'db', label: 'Postgres', col: 1, row: 1, kind: 'storage' },
  ],
  edges: [
    { from: 'user', to: 'api', label: 'asks <a question>' },
    { from: 'api', to: 'db' },
  ],
};

test('one box per node, marked with its kind', () => {
  const svg = architectureSvg(diagram);
  assert.equal(svg.match(/<g class="an /g).length, 3);
  assert.match(svg, /class="an person"/);
  assert.match(svg, /class="an storage"/);
  assert.match(svg, /class="an service"/);
});

test('the drawing is as large as its grid', () => {
  assert.match(architectureSvg(diagram), /viewBox="0 0 372 224"/);
});

test('"Name, detail" is set on two lines', () => {
  assert.match(architectureSvg(diagram), />API<tspan class="sub"[^>]*>FastAPI<\/tspan>/);
});

test('one arrow per edge; labels are escaped', () => {
  const svg = architectureSvg(diagram);
  assert.equal(svg.match(/<path class="ae"/g).length, 2);
  assert.match(svg, /asks &lt;a question&gt;/);
});

test('an edge to a node that does not exist is left out', () => {
  const svg = architectureSvg({ ...diagram, edges: [{ from: 'api', to: 'nowhere' }] });
  assert.ok(!svg.includes('class="ae"'));
});

test('travelling dots are drawn only when motion is allowed', () => {
  assert.equal(architectureSvg(diagram).match(/<animateMotion/g).length, 2);
  assert.ok(!architectureSvg(diagram, { animate: false }).includes('animateMotion'));
});
