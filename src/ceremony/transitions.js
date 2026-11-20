// What plays while the page changes section. The first time a section is reached, the git commands that
// create its part of the history are run and the tree grows; after that, going back to it is one checkout.

import { experience, profile, projects } from '../core/content.js';
import { graphWrap, overlay, skipHint } from '../core/dom.js';
import { reduceMotion } from '../core/env.js';
import { SECTIONS, state } from '../core/state.js';
import { commitRef, HEAD_ROW, reveal, setHeadCommit, setHeadSection } from '../graph/graph.js';
import { wait } from '../lib/util.js';
import { hammerLines, hideCommands, sleep } from './hammer.js';

const release = profile.contact.release;

// per section: the commands, the part of the tree they draw, the gap between commits appearing, and the hold after
const FIRST_VISIT = {
  experience: {
    commands: ['git checkout -b experience'],
    group: 'exp',
    step: 150,
    hold: experience.length * 150 + 900,
  },
  skills: {
    commands: [
      'git checkout -b dev experience',
      'git commit -m "docs(skills): index the stack used across experience"',
    ],
    group: 'dev',
    step: 0,
    hold: 1100,
  },
  projects: {
    commands: ['ls projects | xargs -I{} git branch project/{} dev'], // one branch per project folder, all cut from dev
    group: 'proj',
    step: 70,
    hold: projects.length * 70 + 900,
  },
  contact: {
    commands: [
      'git checkout main',
      `git merge --no-ff -m "release: ${release}" \\\n    $(git branch --list 'project/*')`, // one merge commit, every project branch a parent
      `git tag -a ${release} -m "portfolio ${release}"`,
    ],
    group: 'merge',
    step: 0,
    hold: 1300,
  },
};

function begin() {
  state.inCeremony = true;
  state.skipping = false;
  overlay.classList.add('active');
  graphWrap.classList.add('elevated', 'full'); // the tree on the left opens into the full-height commit table
}

async function end() {
  hideCommands();
  skipHint.classList.remove('active');
  graphWrap.classList.remove('full'); // and folds back to the edge as the section appears
  overlay.classList.remove('active');
  state.inCeremony = false;
  state.skipping = false;
  await wait(reduceMotion ? 0 : 320);
  graphWrap.classList.remove('elevated');
}

/** The first arrival at a section: run its commands and grow the tree. */
export async function firstVisit(sectionIndex) {
  begin();
  skipHint.classList.add('active');
  await sleep(450);
  const stage = FIRST_VISIT[SECTIONS[sectionIndex]];
  if (stage) {
    await hammerLines(stage.commands);
    reveal(stage.group, stage.step);
    setHeadSection(sectionIndex);
    await sleep(stage.hold);
  }
  await end();
}

/** A return to a section already seen, or a jump to one commit: a single checkout. */
export async function checkout(sectionIndex, nav) {
  begin();
  await sleep(300);
  await hammerLines([`git checkout ${nav ? nav.ref : commitRef(HEAD_ROW[sectionIndex])}`]);
  if (nav) setHeadCommit(nav.commit);
  else setHeadSection(sectionIndex);
  await sleep(600);
  await end();
}
