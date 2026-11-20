// Elements that more than one module needs.

export const byId = (id) => document.getElementById(id);

export const app = byId('app');
export const track = byId('track');
export const overlay = byId('overlay');
export const graphWrap = byId('graph-wrap');
export const skipHint = byId('skip-hint');
export const sectionEls = [...document.querySelectorAll('.story-section')];

export const sectionEl = (key) => document.querySelector(`.story-section[data-key="${key}"]`);
