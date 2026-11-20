// Writes the parts of index.html that must be plain HTML from the content files, because the things that read
// them do not run scripts: search engines and link previews read the <head>, and a browser with scripts off
// reads the <noscript> line.
//
//   npm run sync           rewrite index.html from content/site.json and content/profile.json
//   npm run sync -- --check   exit 1 if index.html is out of date (used by "npm run check" and CI)

import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const read = async (path) => readFile(new URL(path, root), 'utf8');
const esc = (text) =>
  String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const site = JSON.parse(await read('content/site.json'));
const profile = JSON.parse(await read('content/profile.json'));

// a link preview needs an absolute image address; until the site has one, the relative path is the best there is
const base = site.url ? site.url.replace(/\/?$/, '/') : '';
const head = [
  `<title>${esc(site.title)}</title>`,
  `<meta name="description" content="${esc(site.description)}" />`,
  base && `<link rel="canonical" href="${esc(base)}" />`,
  '<meta property="og:type" content="website" />',
  base && `<meta property="og:url" content="${esc(base)}" />`,
  `<meta property="og:title" content="${esc(site.share.title)}" />`,
  `<meta property="og:description" content="${esc(site.share.description)}" />`,
  `<meta property="og:image" content="${esc(base + site.share.image)}" />`,
  `<meta property="og:image:width" content="${site.share.imageWidth}" />`,
  `<meta property="og:image:height" content="${site.share.imageHeight}" />`,
  '<meta name="twitter:card" content="summary_large_image" />',
].filter(Boolean);

const links = [
  `<a href="mailto:${esc(profile.email)}">${esc(profile.email)}</a>`,
  ...profile.links.map((link) => `<a href="${esc(link.url)}">${esc(link.label)}</a>`),
  `<a href="${esc(profile.resume.file)}">${esc(profile.resume.label)}</a>`,
];
const noscript = [
  '<noscript>',
  `  <p>${esc(profile.name)}, ${esc(profile.role)}. This page needs JavaScript to show the rest: ${links.join(', ')}.</p>`,
  '</noscript>',
];

function fill(html, name, lines) {
  const block = new RegExp(`(^[ \\t]*)<!-- ${name}:start([^>]*)-->[\\s\\S]*?<!-- ${name}:end -->`, 'm');
  if (!block.test(html)) throw new Error(`index.html has no <!-- ${name}:start --> ... <!-- ${name}:end --> block`);
  return html.replace(block, (_, indent, note) =>
    [
      `${indent}<!-- ${name}:start${note}-->`,
      ...lines.map((line) => indent + line),
      `${indent}<!-- ${name}:end -->`,
    ].join('\n'),
  );
}

const current = await read('index.html');
let next = fill(current, 'head', head);
next = fill(next, 'noscript', noscript);
next = next.replace(/<html lang="[^"]*">/, `<html lang="${esc(site.language)}">`);

if (process.argv.includes('--check')) {
  if (next !== current) {
    console.error('index.html is out of date with content/site.json or content/profile.json. Run: npm run sync');
    process.exit(1);
  }
  console.log('index.html matches the content files.');
} else if (next === current) {
  console.log('index.html is already up to date.');
} else {
  await writeFile(new URL('index.html', root), next);
  console.log('index.html updated from content/.');
}
