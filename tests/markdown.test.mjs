import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMarkdown } from '../src/lib/markdown.js';

test('headings start at h3, under the reader’s own title', () => {
  assert.equal(renderMarkdown('# One\n\n## Two'), '<h3>One</h3><h4>Two</h4>');
});

test('lines of a paragraph are joined', () => {
  assert.equal(renderMarkdown('first line\nsecond line'), '<p>first line second line</p>');
});

test('bullet and numbered lists', () => {
  assert.equal(renderMarkdown('- a\n- b'), '<ul><li>a</li><li>b</li></ul>');
  assert.equal(renderMarkdown('1. a\n2. b'), '<ol><li>a</li><li>b</li></ol>');
});

test('bold, emphasis and inline code', () => {
  assert.equal(
    renderMarkdown('**Ingest.** uses `AES-256` *always*'),
    '<p><strong>Ingest.</strong> uses <code>AES-256</code> <em>always</em></p>',
  );
});

test('inline code is left exactly as written', () => {
  assert.equal(renderMarkdown('`**not bold**`'), '<p><code>**not bold**</code></p>');
});

test('a table', () => {
  const html = renderMarkdown('| Stage | Budget |\n| --- | --- |\n| speech | 300 ms |');
  assert.equal(
    html,
    '<table><thead><tr><th>Stage</th><th>Budget</th></tr></thead><tbody><tr><td>speech</td><td>300 ms</td></tr></tbody></table>',
  );
});

test('a fenced block keeps its text and its line breaks', () => {
  assert.equal(
    renderMarkdown('~~~\nif (a < b) {\n  run();\n}\n~~~'),
    '<pre><code>if (a &lt; b) {\n  run();\n}</code></pre>',
  );
});

test('links open in a new tab', () => {
  assert.equal(
    renderMarkdown('[docs](https://example.com/a)'),
    '<p><a href="https://example.com/a" target="_blank" rel="noopener noreferrer">docs</a></p>',
  );
});

test('a relative link is resolved against the base it is given, and dropped without one', () => {
  assert.match(
    renderMarkdown('[guide](docs/guide.md)', { linkBase: 'https://example.com/repo/' }),
    /href="https:\/\/example\.com\/repo\/docs\/guide\.md"/,
  );
  assert.equal(renderMarkdown('[guide](docs/guide.md)'), '<p>guide</p>');
});

test('HTML in the source never reaches the page', () => {
  const html = renderMarkdown('<script>alert(1)</script> and <b onclick="x()">bold</b>');
  assert.ok(!html.includes('<script'));
  assert.ok(!html.includes('onclick'));
});

test('a javascript: link is not followed', () => {
  assert.equal(renderMarkdown('[x](javascript:alert(1))'), '<p>x)</p>');
});

test('angle brackets in text are escaped', () => {
  assert.equal(renderMarkdown('a < b'), '<p>a &lt; b</p>');
});
