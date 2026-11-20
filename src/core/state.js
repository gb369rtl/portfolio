// The page's shared state: which section is on screen and what is in progress.
// Everything else (the sphere's spin, the hero's pixels) is private to its own module.

export const SECTIONS = ['hero', 'experience', 'skills', 'projects', 'contact'];

export const state = {
  current: 0, // index of the section on screen
  maxReached: 0, // the furthest section seen; its git commands have already been played
  isTransitioning: false, // a section change is running
  inCeremony: false, // the commands are being hammered in
  skipping: false, // the visitor pressed Escape during a ceremony
  menuOpen: false, // the commit list is open as a menu
  headCommit: 0, // the commit HEAD points at
};

export const isOn = (key) => SECTIONS[state.current] === key;
