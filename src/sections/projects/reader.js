// The inside of a book: a summary on the left; tabs and the write-up on the right. The write-up is the
// Markdown in content/projects/<id>/, loaded the first time the book is opened.

import { loadWriteup } from '../../core/content.js';
import { reduceMotion } from '../../core/env.js';
import { renderMarkdown } from '../../lib/markdown.js';
import { capitalize, esc, pad2 } from '../../lib/util.js';
import { architectureSvg } from './architecture.js';

const TAB_LABELS = {
  overview: 'Overview',
  architecture: 'Architecture',
  technical: 'Technical',
  build: 'Build',
  product: 'Product',
  readme: 'README',
};
const SKELETON =
  '<span class="sk" style="width:46%"></span><span class="sk"></span><span class="sk" style="width:88%"></span>';
const ARCH_KEY =
  '<p class="arch-key"><i class="person"></i>a person <i class="storage"></i>storage <i></i>a service or step</p>';

/** What a tab says when its file has not been written yet: built from the project's own facts. */
function summaryMarkdown(project) {
  const design = project.status === 'design';
  const lines = [`# ${project.name}`, '', project.summary || '', ''];
  if (project.highlights?.length) {
    lines.push(design ? '## What it will do' : '## What it does', '');
    lines.push(...project.highlights.map((item) => `- ${capitalize(item.text)}`), '');
  }
  if (project.stack?.length) lines.push('## Stack', '', project.stack.map((name) => `\`${name}\``).join(' '), '');
  if (design) lines.push('> Designed end to end. The Build tab has the order.');
  else if (!project.repo) lines.push(`> ${project.sourceNote || 'The source is private.'}`);
  return lines.join('\n');
}

const readmes = new Map();

/** A public project's README, straight from GitHub. Falls back to the summary if it cannot be read. */
function loadReadme(project) {
  if (!readmes.has(project.id)) {
    const raw = `https://raw.githubusercontent.com/${project.repo}/HEAD/`;
    readmes.set(
      project.id,
      fetch(`https://api.github.com/repos/${project.repo}/readme`, {
        headers: { Accept: 'application/vnd.github.raw' },
      })
        .then((response) => (response.ok ? response.text() : Promise.reject(new Error('no readme'))))
        .then((text) => {
          if (!text.trim()) throw new Error('empty readme');
          return renderMarkdown(text, { imageBase: raw, linkBase: `https://github.com/${project.repo}/blob/HEAD/` });
        })
        .catch(() => renderMarkdown(summaryMarkdown(project))),
    );
  }
  return readmes.get(project.id);
}

const sourceHtml = (project) => {
  if (project.repo) {
    return `<a class="rd-link" href="https://github.com/${esc(project.repo)}" target="_blank" rel="noopener noreferrer">open on GitHub</a>`;
  }
  const note =
    project.status === 'design'
      ? 'Designed end to end. The Build tab has the order I am building it in.'
      : project.sourceNote || 'private repository';
  return `<span class="rd-private">${esc(note)}</span>`;
};

/**
 * @param {HTMLElement} el the reader's box
 * @param {{ onClose: () => void }} handlers
 */
export function createReader(el, { onClose }) {
  let tab = 'overview'; // the tab stays as you go from book to book
  let open = null; // the project on the page
  let body = null;

  async function showTab(key) {
    const project = open;
    tab = key;
    el.querySelectorAll('[data-tab]').forEach((button) => {
      button.setAttribute('aria-selected', String(button.dataset.tab === key));
    });
    body.classList.toggle('wide', key === 'architecture');
    body.innerHTML = SKELETON;
    el.querySelector('.rd-readme').scrollTop = 0;

    let html;
    if (key === 'readme') {
      html = await loadReadme(project);
    } else {
      const writeup = await loadWriteup(project);
      const diagram = key === 'architecture' ? writeup.architecture : null;
      html = diagram
        ? `<h4>How the parts connect</h4>${architectureSvg(diagram, { animate: !reduceMotion })}<p>${esc(diagram.note || '')}</p>` +
          ARCH_KEY +
          renderMarkdown(diagram.details || '')
        : renderMarkdown(writeup[key] || summaryMarkdown(project));
    }
    if (open === project && tab === key) body.innerHTML = html; // unless the visitor has moved on meanwhile
  }

  /** Put a project on the page. */
  function fill(project, { index, total, color }) {
    open = project;
    const tabs = project.writeup?.length ? [...project.writeup] : ['overview'];
    if (project.repo) tabs.push('readme');
    el.style.setProperty('--c', color);
    el.innerHTML =
      `<aside class="rd-side"><div class="rd-head"><div class="branch"><span>project/${esc(project.id)}</span>` +
      `<span>${pad2(index + 1)} / ${pad2(total)}</span></div><h3>${esc(project.name)}</h3></div><div class="rd-body">` +
      (project.summary ? `<p>${esc(project.summary)}</p>` : '') +
      (project.stack?.length
        ? `<div><div class="rd-label">Stack</div><div class="rd-chips">${project.stack.map((name) => `<span>${esc(name)}</span>`).join('')}</div></div>`
        : '') +
      `${sourceHtml(project)}</div></aside>` +
      '<article class="rd-readme" tabindex="0"><div class="rd-tabs" role="tablist">' +
      tabs
        .map(
          (key) => `<button type="button" role="tab" data-tab="${key}">${TAB_LABELS[key] || capitalize(key)}</button>`,
        )
        .join('') +
      '<button type="button" class="rd-close">Close</button></div><div class="md"></div></article>';
    body = el.querySelector('.md');
    el.querySelectorAll('[data-tab]').forEach((button) =>
      button.addEventListener('click', () => showTab(button.dataset.tab)),
    );
    el.querySelector('.rd-close').addEventListener('click', onClose);
    showTab(tabs.includes(tab) ? tab : tabs[0]);
  }

  return { fill };
}
