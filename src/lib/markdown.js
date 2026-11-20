// A small Markdown renderer for the project write-ups. It escapes everything it is given: no HTML from a
// content file or a README ever reaches the page, only the tags written here.
// Supported: headings, paragraphs, lists, tables, block quotes, rules, fenced code, links, images, bold,
// emphasis and inline code.

import { esc } from './util.js';

/** An absolute, safe URL for a link or image, or null if it should not be followed. */
function absoluteUrl(url, base, isLink) {
  if (/^https?:\/\//i.test(url)) return url;
  if (isLink && /^mailto:/i.test(url)) return url;
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('#') || !base) return null;
  return base + url.replace(/^\.?\//, '');
}

// raw HTML in a README: keep what an image says, drop every other tag
const stripHtml = (line) =>
  line
    .replace(/<img[^>]*src=["']([^"']+)["'][^>]*>/gi, '![]($1)')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/?[a-zA-Z][^>]*>/g, '');

const cells = (row) =>
  row
    .trim()
    .replace(/^\||\|$/g, '')
    .split('|')
    .map((cell) => cell.trim());

const FENCE = /^\s*(```|~~~)/;
const HOLD = ''; // a private-use character, which a write-up never contains
const HELD = /(\d+)/g;

/**
 * @param {string} source Markdown text
 * @param {{ imageBase?: string, linkBase?: string }} [options] where relative images and links point
 * @returns {string} HTML
 */
export function renderMarkdown(source, { imageBase = null, linkBase = null } = {}) {
  function inline(raw) {
    const codes = []; // inline code is set aside first, so nothing below can touch what is inside it
    let t = esc(raw);
    t = t.replace(/`([^`]+)`/g, (_, code) => `${HOLD}${codes.push(code) - 1}${HOLD}`);
    t = t.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (_, alt, url) => {
      const src = absoluteUrl(url, imageBase, false);
      return src ? `<img loading="lazy" alt="${alt}" src="${src}">` : '';
    });
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)[^)]*\)/g, (_, label, url) => {
      const href = absoluteUrl(url, linkBase, true);
      return href ? `<a href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    });
    t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/__([^_]+)__/g, '<strong>$1</strong>');
    t = t.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    return t.replace(HELD, (_, n) => `<code>${codes[+n]}</code>`);
  }

  const lines = String(source)
    .replace(/\r/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n');
  const out = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map((item) => `<li>${item}</li>`).join('')}</${list.tag}>`);
    list = null;
  };
  const flush = () => {
    flushParagraph();
    flushList();
  };

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];

    if (FENCE.test(raw)) {
      flush();
      const code = [];
      for (i++; i < lines.length && !FENCE.test(lines[i]); i++) code.push(lines[i]);
      i++;
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }

    const line = stripHtml(raw);
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    const heading = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (heading) {
      flush();
      const level = Math.min(6, heading[1].length + 2); // the reader's own title is the h3, so # starts there
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      i++;
      continue;
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush();
      out.push('<hr>');
      i++;
      continue;
    }

    const next = lines[i + 1];
    if (line.includes('|') && next !== undefined && /^\s*\|?\s*:?-{2,}/.test(next) && next.includes('|')) {
      flush();
      let html = `<table><thead><tr>${cells(line)
        .map((cell) => `<th>${inline(cell)}</th>`)
        .join('')}</tr></thead><tbody>`;
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) {
        html += `<tr>${cells(stripHtml(lines[i]))
          .map((cell) => `<td>${inline(cell)}</td>`)
          .join('')}</tr>`;
      }
      out.push(`${html}</tbody></table>`);
      continue;
    }

    if (/^\s*>/.test(line)) {
      flush();
      const quote = [];
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) quote.push(stripHtml(lines[i]).replace(/^\s*>\s?/, ''));
      out.push(`<blockquote><p>${inline(quote.join(' '))}</p></blockquote>`);
      continue;
    }

    const item = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (item) {
      flushParagraph();
      const tag = /\d/.test(item[1]) ? 'ol' : 'ul';
      if (!list || list.tag !== tag) {
        flushList();
        list = { tag, items: [] };
      }
      list.items.push(inline(item[2].replace(/^\[[ xX]\]\s*/, '')));
      i++;
      continue;
    }

    // an indented line under a list item continues that item
    if (list && /^\s{2,}\S/.test(raw)) {
      list.items[list.items.length - 1] += ` ${inline(line.trim())}`;
      i++;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
    i++;
  }
  flush();
  return out.join('');
}
