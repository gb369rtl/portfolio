// Months are written as "YYYY-MM" in content/experience.json. An end of null means the job is current.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parse(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match || +match[2] < 1 || +match[2] > 12) throw new Error(`"${month}" is not a month written as YYYY-MM`);
  return { year: +match[1], month: +match[2] - 1 };
}

/** "Jun 2024 - Mar 2025", "Apr - May 2025, contract", "Sep 2025 - now" */
export function formatRange(start, end, note) {
  const a = parse(start);
  const b = end ? parse(end) : null;
  const from = b && b.year === a.year ? MONTHS[a.month] : `${MONTHS[a.month]} ${a.year}`;
  const to = b ? `${MONTHS[b.month]} ${b.year}` : 'now';
  return `${from} - ${to}${note ? `, ${note}` : ''}`;
}

/** Whole months from the start month to the given day. */
export function monthsSince(start, today = new Date()) {
  const a = parse(start);
  return Math.max(0, (today.getFullYear() - a.year) * 12 + today.getMonth() - a.month);
}

const count = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** 29 -> "2 years and 5 months" */
export function formatSpan(months) {
  const years = Math.floor(months / 12);
  const rest = months % 12;
  return (
    [years && count(years, 'year'), rest && count(rest, 'month')].filter(Boolean).join(' and ') || 'less than a month'
  );
}
