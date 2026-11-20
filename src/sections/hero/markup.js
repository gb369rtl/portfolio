// The hero's words, built from content/profile.json. Top to bottom: availability, greeting, headline, bio,
// two actions, then the links. data-ink marks the shapes the opening animation redraws as pixels (see ink.js).

import { ICONS } from '../../lib/icons.js';
import { esc } from '../../lib/util.js';

function iconLink(link) {
  const icon = ICONS[link.id];
  const label = esc(link.label);
  const open = `<a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer"`;
  if (!icon) return `${open} class="cv">${label}</a>`;
  return (
    `${open} aria-label="${label}" title="${label}">` +
    `<svg viewBox="${icon.viewBox}" data-ink="icon" aria-hidden="true"><path d="${icon.d}"/></svg></a>`
  );
}

export function heroTextHtml(profile) {
  const { hero, links, resume } = profile;
  return `
    <div class="hero-intro asm">
      <p class="avail" data-ink="line"><i data-ink="dot" aria-hidden="true"></i>${esc(hero.availability)}</p>
      <p class="hello">${esc(hero.greeting)}</p>
    </div>
    <h1 class="asm"><span>${esc(hero.headline.marked)}</span> ${esc(hero.headline.rest)}</h1>
    <p class="bio asm">${esc(hero.bio)}</p>
    <div class="hero-actions asm">
      <div class="hero-cta">
        <button type="button" class="hero-btn solid" id="hero-work" data-ink="fill">${esc(hero.actions.work)}</button>
        <button type="button" class="hero-btn line" id="hero-talk" data-ink="line">${esc(hero.actions.contact)}</button>
      </div>
      <div class="hero-social">
        ${links.map(iconLink).join('')}
        <a class="cv" href="${esc(resume.file)}" target="_blank" rel="noopener" title="${esc(resume.label)} (PDF, opens in a new tab)">
          <svg viewBox="${ICONS.download.viewBox}" data-ink="stroke" stroke-width="2.2" aria-hidden="true"><path d="${ICONS.download.d}"/></svg>${esc(resume.label)}</a>
      </div>
    </div>`;
}
