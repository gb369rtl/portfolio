// Where the visitor's pointer is, kept up to date for the hero's frame loop.

export const pointer = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  active: false,
  touch: false,
  /** when it last moved, on the performance.now() clock */
  at: 0,
};

function track(event) {
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  pointer.active = true;
  pointer.touch = event.pointerType === 'touch';
  pointer.at = performance.now();
}

window.addEventListener('pointermove', track, { passive: true });
window.addEventListener('pointerdown', track, { passive: true });
document.documentElement.addEventListener('pointerleave', (event) => {
  if (event.pointerType !== 'touch') pointer.active = false;
});
