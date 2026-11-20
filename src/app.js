// Starts the page. Each import below draws its own part when it loads; the order is the order they depend on
// each other: the git tree first (it sets how much room the sections leave on the left), then the sections,
// then the navigation that moves between them.

import { layoutGraph } from './graph/graph.js';
import { layoutHero } from './sections/hero/hero.js';
import './sections/experience.js';
import './sections/skills.js';
import { layoutProjects } from './sections/projects/projects.js';
import './sections/contact.js';
import './navigation/navigation.js';
import { fitSections } from './core/scale.js';

// The window changed size: redraw what is measured in script, and check again that every section fits.
function relayout() {
  layoutGraph();
  fitSections();
  layoutProjects();
  layoutHero();
}

let scheduled = false;
window.addEventListener('resize', () => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    relayout();
  });
});

fitSections();
document.fonts.ready.then(fitSections); // text is a different size once the real fonts are in
