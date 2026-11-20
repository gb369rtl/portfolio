// Asking for a section change.
// The navigation code imports every section, so a section cannot import it back. Navigation registers itself
// here instead, and sections and the git tree ask through these two functions.

let handlers = {
  goTo: () => {},
  jump: () => false,
};

export function registerNavigation(next) {
  handlers = next;
}

/** Go to a section by index. */
export const goTo = (index, nav) => handlers.goTo(index, nav);

/** Check out a commit by its row number: goes to its section and its job or project. Returns false if it could not. */
export const jump = (commit) => handlers.jump(commit);
