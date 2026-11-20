import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildHistory, commitRef, laneColor, treeShape } from '../src/graph/model.js';

const experience = [
  { company: 'First Co', role: 'Developer', dates: 'Jan 2023 - Dec 2023' },
  { company: 'Second Co', role: 'Engineer', dates: 'Jan 2024 - now' },
];
const projects = [
  { id: 'alpha', name: 'Alpha', tagline: 'a shipped thing', status: 'shipped' },
  { id: 'beta', name: 'Beta', tagline: 'a designed thing', status: 'design' },
  { id: 'gamma', name: 'Gamma', status: 'shipped' },
];
const history = buildHistory({ experience, projects, release: 'v1.0' });

test('one commit for the start, each job, the skills, each project and the release', () => {
  assert.equal(history.commits.length, 1 + 2 + 1 + 3 + 1);
  assert.deepEqual(
    history.commits.map((commit) => commit.kind),
    ['main', 'exp', 'exp', 'dev', 'proj', 'proj', 'proj', 'merge'],
  );
});

test('HEAD rests on the newest commit of each section', () => {
  assert.deepEqual(history.headRows, [0, 2, 3, 6, 7]);
  history.headRows.forEach((row, section) => assert.equal(history.commits[row].section, section));
});

test('shipped work is a feat commit and a design is a docs commit', () => {
  assert.equal(history.commits[4].type, 'feat(alpha)');
  assert.equal(history.commits[5].type, 'docs(beta)');
});

test('a project without a tagline falls back to its name', () => {
  assert.equal(history.commits[6].subject, 'Gamma');
});

test('only the newest job carries the experience branch name', () => {
  assert.deepEqual(history.commits[1].refs, []);
  assert.deepEqual(history.commits[2].refs, [{ name: 'experience' }]);
  assert.equal(history.commits[1].to, 'experience~1');
  assert.equal(history.commits[2].to, 'experience');
});

test('the release commit carries main and the tag', () => {
  assert.deepEqual(history.commits.at(-1).refs, [{ name: 'main' }, { name: 'v1.0', dark: true }]);
});

test('the first commit is main until the merge, and main~1 after it', () => {
  assert.equal(commitRef(history, 0, false), 'main');
  assert.equal(commitRef(history, 0, true), 'main~1');
  assert.equal(commitRef(history, 4, true), 'project/alpha');
});

test('the tree has a node per commit, the first one at the bottom', () => {
  const shape = treeShape(history, 10, 20, 40);
  assert.equal(shape.nodes.length, history.commits.length);
  assert.equal(shape.height, history.commits.length * 40);
  assert.ok(shape.nodes[0].y > shape.nodes.at(-1).y);
});

test('main and the release share a lane; every project has its own', () => {
  const shape = treeShape(history, 10, 20, 40);
  const xs = shape.nodes.map((node) => node.x);
  assert.equal(xs[0], xs.at(-1));
  assert.equal(new Set(xs.slice(4, 7)).size, 3);
  assert.equal(shape.width, 10 * 2 + (2 + 3) * 20);
});

test('the tree draws main, experience, dev, then a branch and a merge line per project', () => {
  const shape = treeShape(history, 10, 20, 40);
  assert.deepEqual(
    shape.paths.map((path) => path.group),
    ['main', 'exp', 'dev', 'proj', 'merge', 'proj', 'merge', 'proj', 'merge'],
  );
});

test('lane colours repeat after the twelve the stylesheet defines', () => {
  assert.equal(laneColor(0), 'var(--lane-0)');
  assert.equal(laneColor(13), 'var(--lane-1)');
});
