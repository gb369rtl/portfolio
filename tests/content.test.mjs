import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkContent } from '../scripts/check-content.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('the content in this repository is sound', () => {
  assert.deepEqual(checkContent(root), []);
});

// The checks below break a copy of the real content one way at a time and expect the checker to say so.
const copy = mkdtempSync(join(tmpdir(), 'portfolio-content-'));
after(() => rmSync(copy, { recursive: true, force: true }));
cpSync(join(root, 'content'), join(copy, 'content'), { recursive: true });
cpSync(join(root, 'assets'), join(copy, 'assets'), { recursive: true });

function problemsAfter(file, change) {
  const path = join(copy, 'content', file);
  const original = readFileSync(path, 'utf8');
  const data = JSON.parse(original);
  change(data);
  writeFileSync(path, JSON.stringify(data));
  try {
    return checkContent(copy);
  } finally {
    writeFileSync(path, original);
  }
}

test('a highlighted skill must be one of the group’s items', () => {
  const problems = problemsAfter('skills.json', (groups) => groups[0].highlight.push('Telepathy'));
  assert.equal(problems.length, 1);
  assert.match(problems[0], /Telepathy/);
});

test('a job cannot end before it starts', () => {
  const problems = problemsAfter('experience.json', (jobs) => {
    jobs[0].end = '2001-01';
  });
  assert.ok(problems.some((problem) => /ends before it starts/.test(problem)));
});

test('a month must be written as YYYY-MM', () => {
  const problems = problemsAfter('experience.json', (jobs) => {
    jobs[0].start = 'June 2024';
  });
  assert.ok(problems.some((problem) => /YYYY-MM/.test(problem)));
});

test('a project cannot name a write-up that has no file', () => {
  const problems = problemsAfter('projects.json', (projects) => {
    projects[0].writeup.push('build');
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /build\.md does not exist/);
});

test('two projects cannot share an id', () => {
  const problems = problemsAfter('projects.json', (projects) => {
    projects[1].id = projects[0].id;
  });
  assert.ok(problems.some((problem) => /used twice/.test(problem)));
});

test('a status other than shipped or design is refused', () => {
  const problems = problemsAfter('projects.json', (projects) => {
    projects[0].status = 'planned';
  });
  assert.ok(problems.some((problem) => /status must be one of/.test(problem)));
});

test('an arrow must join two boxes that exist', () => {
  const problems = problemsAfter('projects/pay-bot/architecture.json', (diagram) => {
    diagram.edges.push({ from: diagram.nodes[0].id, to: 'nowhere' });
  });
  assert.equal(problems.length, 1);
  assert.match(problems[0], /nowhere/);
});

test('a file that is not JSON is reported, not thrown', () => {
  const path = join(copy, 'content', 'skills.json');
  const original = readFileSync(path, 'utf8');
  writeFileSync(path, '{ not json');
  try {
    assert.ok(checkContent(copy).some((problem) => /skills\.json: not valid JSON/.test(problem)));
  } finally {
    writeFileSync(path, original);
  }
});
