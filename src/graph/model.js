// The portfolio told as a git history. This file is the model only: which commits exist, what they say and
// where they sit in the tree. src/graph/graph.js draws it; nothing here touches the page.
//
//   main ──●───────────────────────────────────────●  release: merge the project branches into main
//           \                                     /
//   experience ●──●──●──●                        /    one commit per job
//                        \                      /
//   dev                   ●                    /      skills
//                          \__ project/* ●●●●●/       one branch per project

const INK = 'var(--text)';
const LANES = 12; // tokens.css defines --lane-0 to --lane-11

/** The colour of a project's branch. */
export const laneColor = (index) => `var(--lane-${index % LANES})`;

/**
 * @returns {{ commits: object[], headRows: number[], lanes: number }}
 *   commits  one per row, oldest first
 *   headRows the commit HEAD rests on in each section: hero, experience, skills, projects, contact
 */
export function buildHistory({ experience, projects, release }) {
  const jobs = experience.length;
  const dev = jobs + 1;
  const merge = dev + projects.length + 1;
  const commits = [];

  commits[0] = {
    group: 'main',
    color: INK,
    refs: [{ name: 'main', moves: true }],
    type: 'chore',
    subject: 'initial commit',
    when: '',
    section: 0,
    kind: 'main',
    to: 'main',
  };
  experience.forEach((job, i) => {
    const last = i === jobs - 1;
    commits[1 + i] = {
      group: 'exp',
      color: 'var(--lane-exp)',
      refs: last ? [{ name: 'experience' }] : [],
      type: 'feat(experience)',
      subject: `${job.company}, ${job.role}`,
      when: job.dates,
      section: 1,
      kind: 'exp',
      item: i,
      to: last ? 'experience' : `experience~${jobs - 1 - i}`,
    };
  });
  commits[dev] = {
    group: 'dev',
    color: 'var(--lane-dev)',
    refs: [{ name: 'dev' }],
    type: 'docs(skills)',
    subject: 'index the stack used across experience',
    when: '',
    section: 2,
    kind: 'dev',
    to: 'dev',
  };
  projects.forEach((project, i) => {
    commits[dev + 1 + i] = {
      group: 'proj',
      color: laneColor(i),
      refs: [{ name: `project/${project.id}` }],
      type: `${project.status === 'design' ? 'docs' : 'feat'}(${project.id})`, // shipped work is feat, a design is docs
      subject: project.tagline || project.name,
      when: project.status,
      section: 3,
      kind: 'proj',
      item: i,
      to: `project/${project.id}`,
    };
  });
  commits[merge] = {
    group: 'merge',
    color: INK,
    refs: [{ name: 'main' }, { name: release, dark: true }],
    type: 'release',
    subject: 'merge the project branches into main',
    when: '',
    section: 4,
    kind: 'merge',
    to: 'main',
  };

  return { commits, headRows: [0, jobs, dev, dev + projects.length, merge], lanes: projects.length };
}

/**
 * The same tree at any size: lanes `gap` apart starting at `x0`, rows `rowHeight` apart, the first commit at the bottom.
 * @returns {{ paths: {group: string, color: string, d: string}[], nodes: {group: string, color: string, x: number, y: number}[], width: number, height: number, rowHeight: number }}
 */
export function treeShape(history, x0, gap, rowHeight) {
  const { commits, headRows, lanes } = history;
  const total = commits.length;
  const [, lastJob, dev, , merge] = headRows;
  const x = (lane) => +(x0 + lane * gap).toFixed(2);
  const y = (row) => +((total - 1 - row + 0.5) * rowHeight).toFixed(2);
  const curve = (lane1, row1, lane2, row2) =>
    `M${x(lane1)},${y(row1)} C${x(lane1)},${(y(row1) - rowHeight * 0.7).toFixed(2)} ` +
    `${x(lane2)},${(y(row2) + rowHeight * 0.7).toFixed(2)} ${x(lane2)},${y(row2)}`;

  const paths = [
    { group: 'main', color: INK, d: `M${x(0)},${y(0)} L${x(0)},${y(merge)}` },
    { group: 'exp', color: 'var(--lane-exp)', d: `${curve(0, 0, 1, 1)} L${x(1)},${y(lastJob)}` },
    { group: 'dev', color: 'var(--lane-dev)', d: curve(1, lastJob, 2, dev) },
  ];
  for (let i = 0; i < lanes; i++) {
    paths.push({
      group: 'proj',
      color: laneColor(i),
      d: `${curve(2, dev, 3 + i, dev + 1)} L${x(3 + i)},${y(merge - 1)}`,
    });
    paths.push({ group: 'merge', color: laneColor(i), d: curve(3 + i, merge - 1, 0, merge) });
  }

  // which lane each commit sits in
  const laneOf = (commit) => ({ main: 0, merge: 0, exp: 1, dev: 2 })[commit.kind] ?? 3 + commit.item;
  const nodes = commits.map((commit, row) => ({
    group: commit.group,
    color: commit.color,
    x: x(laneOf(commit)),
    y: y(row),
  }));

  return { paths, nodes, width: x0 * 2 + (2 + lanes) * gap, height: total * rowHeight, rowHeight };
}

/** How git would name a commit. Once main has moved to the merge, the first commit is main~1. */
export function commitRef(history, row, merged) {
  return row === 0 && merged ? 'main~1' : history.commits[row].to;
}
