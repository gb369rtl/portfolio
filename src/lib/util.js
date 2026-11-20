// Small helpers with no knowledge of the page.

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const rand = (min, max) => min + Math.random() * (max - min);

export const clamp = (value, min, max) => (value < min ? min : value > max ? max : value);

export const pad2 = (n) => String(n).padStart(2, '0');

export const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

/** Text from a content file, made safe to place inside HTML. */
export const esc = (text) => String(text).replace(/[&<>"]/g, (ch) => ESCAPES[ch]);
