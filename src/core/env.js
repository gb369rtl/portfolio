// What the device and the visitor ask for.

// `?motion=reduce` shows the reduced-motion page without changing the system setting
export const reduceMotion =
  window.matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]motion=reduce/.test(location.search);

// a touch device or a small screen gets a lighter portrait
export const modestDevice =
  window.matchMedia('(pointer: coarse)').matches || Math.min(window.innerWidth, window.innerHeight) < 620;
