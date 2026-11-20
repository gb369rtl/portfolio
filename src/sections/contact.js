// Let's talk: how to reach me, and what this release contains. Every line of the release summary is counted
// from the content files and is a way back into the page.

import { experience, profile, projects } from '../core/content.js';
import { byId } from '../core/dom.js';
import { goTo } from '../core/router.js';
import { SECTIONS } from '../core/state.js';
import { formatSpan, monthsSince } from '../lib/dates.js';
import { esc } from '../lib/util.js';

const COPIED_MS = 1800;

const { contact, education, email, links, resume } = profile;
const external = (url, label) => `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;

byId('contact-main').innerHTML = `
  <div class="tag-line"><span class="pill mono">${esc(contact.release)}</span><span class="mono">tagged on main</span></div>
  <h2>${esc(contact.heading)}</h2>
  <p class="bio">${esc(contact.blurb)}</p>
  <div class="links">
    <button type="button" class="mail" id="mail-copy" aria-live="polite" title="Click to copy">${esc(email)}</button>
    ${links.map((link) => external(link.url, link.label)).join('')}
    ${external(resume.file, resume.label)}
  </div>
  <footer class="contact-foot"><span>${esc(education.degree)}, ${esc(education.school)}</span><span>${esc(education.years)}</span></footer>`;
byId('release-tag').textContent = contact.release;

// ----- what the release contains -----
const shipped = projects.filter((project) => project.status !== 'design').length;
const designed = projects.length - shipped;
// time in the trade runs from the first job's start month to today, so it is right whenever the page is opened
const rows = [
  { scope: 'experience', text: formatSpan(monthsSince(experience[0].start)), to: 'experience' },
  { scope: 'skills', text: contact.focus, to: 'skills' },
  {
    scope: 'projects',
    text: [shipped && `${shipped} shipped`, designed && `${designed} designed`].filter(Boolean).join(', '),
    to: 'projects',
  },
  { scope: 'init', text: 'start again from the first commit', to: 'hero' },
];
const releaseList = byId('release-list');
releaseList.innerHTML = rows
  .map(
    (row) =>
      `<li><button type="button" data-to="${row.to}"><span class="scope">${row.scope}</span><span>${esc(row.text)}</span></button></li>`,
  )
  .join('');
releaseList.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) goTo(SECTIONS.indexOf(button.dataset.to));
});

// ----- the address is a button: a click copies it and says so in place -----
const mailButton = byId('mail-copy');
let revert;

function showCopied() {
  // hold the width, so the links beside it stay put while the text changes
  if (!mailButton.classList.contains('done')) mailButton.style.minWidth = `${mailButton.offsetWidth}px`;
  mailButton.textContent = 'Email copied';
  mailButton.classList.add('done');
  clearTimeout(revert);
  revert = setTimeout(() => {
    mailButton.textContent = email;
    mailButton.classList.remove('done');
    mailButton.style.minWidth = '';
  }, COPIED_MS);
}

// The synchronous copy answers inside the click and works without a secure origin, so it is tried first.
function copyNow(value) {
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.cssText = 'position:fixed;left:-99px;top:0;opacity:0';
  document.body.appendChild(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

mailButton.addEventListener('click', () => {
  const openMail = () => {
    location.href = `mailto:${email}`;
  };
  const copied = copyNow(email);
  mailButton.focus();
  if (copied) showCopied();
  else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(email).then(showCopied, openMail);
  else openMail(); // nothing can copy here: open the mail app instead
});
