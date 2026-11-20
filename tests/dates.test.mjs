import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatRange, formatSpan, monthsSince } from '../src/lib/dates.js';

test('a range across two years names both years', () => {
  assert.equal(formatRange('2024-06', '2025-03'), 'Jun 2024 - Mar 2025');
});

test('a range inside one year names the year once', () => {
  assert.equal(formatRange('2025-04', '2025-05'), 'Apr - May 2025');
});

test('a current job ends in "now"', () => {
  assert.equal(formatRange('2025-09', null), 'Sep 2025 - now');
});

test('a note follows the dates', () => {
  assert.equal(formatRange('2025-05', '2025-09', 'contract'), 'May - Sep 2025, contract');
});

test('a month that is not YYYY-MM is refused', () => {
  assert.throws(() => formatRange('June 2024', null), /YYYY-MM/);
  assert.throws(() => formatRange('2024-13', null), /YYYY-MM/);
});

test('months are counted from the start month to today', () => {
  assert.equal(monthsSince('2024-06', new Date(2026, 10, 20)), 29);
  assert.equal(monthsSince('2024-06', new Date(2024, 5, 30)), 0);
});

test('a start in the future counts as nothing, not a negative', () => {
  assert.equal(monthsSince('2030-01', new Date(2026, 0, 1)), 0);
});

test('a span is written in years and months, with plurals', () => {
  assert.equal(formatSpan(29), '2 years and 5 months');
  assert.equal(formatSpan(13), '1 year and 1 month');
  assert.equal(formatSpan(24), '2 years');
  assert.equal(formatSpan(7), '7 months');
  assert.equal(formatSpan(0), 'less than a month');
});
