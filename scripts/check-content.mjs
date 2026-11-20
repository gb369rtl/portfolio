// Checks everything in content/ before it reaches the page: required fields, dates, links between files,
// and that every write-up and diagram a project names really exists.
//
//   npm run check
//
// Each problem is printed with the file and the entry it is in. Exits 1 if there are any.

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const WRITEUP_TABS = ['overview', 'architecture', 'technical', 'build', 'product'];
const NODE_KINDS = ['person', 'storage'];
const STATUSES = ['shipped', 'design'];

const isText = (value) => typeof value === 'string' && value.trim().length > 0;
const isList = (value) => Array.isArray(value) && value.length > 0;
const duplicates = (values) => [...new Set(values.filter((value, i) => values.indexOf(value) !== i))];

/**
 * @param {string} root the project folder (the one that holds content/ and assets/)
 * @returns {string[]} one line per problem; empty when the content is sound
 */
export function checkContent(root) {
  const problems = [];
  const content = join(root, 'content');

  const load = (file) => {
    try {
      return JSON.parse(readFileSync(join(content, file), 'utf8'));
    } catch (error) {
      problems.push(
        `${file}: ${error.code === 'ENOENT' ? 'the file is missing' : `not valid JSON (${error.message})`}`,
      );
      return null;
    }
  };
  // need(place, value is fine?, what is wrong)
  const scope = (file) => (where, ok, message) => {
    if (!ok) problems.push(`${file}: ${where}: ${message}`);
  };
  const asset = (path) => isText(path) && existsSync(join(root, path));

  // ---- site.json
  const site = load('site.json');
  if (site) {
    const need = scope('site.json');
    need('title', isText(site.title), 'is required');
    need('description', isText(site.description), 'is required');
    need('language', isText(site.language), 'is required, for example "en"');
    need('url', site.url === '' || /^https:\/\//.test(site.url), 'must be empty or start with https://');
    need('share', isText(site.share?.title) && isText(site.share?.description), 'needs a title and a description');
    need('share.image', asset(site.share?.image), `"${site.share?.image}" is not a file in this project`);
  }

  // ---- profile.json
  const profile = load('profile.json');
  if (profile) {
    const need = scope('profile.json');
    for (const key of ['name', 'brand', 'role', 'email']) need(key, isText(profile[key]), 'is required');
    need('email', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(profile.email || ''), 'is not an email address');
    need('links', Array.isArray(profile.links), 'must be a list');
    (profile.links || []).forEach((link, i) => {
      need(`links[${i}]`, isText(link.id) && isText(link.label), 'needs an id and a label');
      need(`links[${i}].url`, /^https:\/\//.test(link.url || ''), 'must start with https://');
    });
    need('resume.file', asset(profile.resume?.file), `"${profile.resume?.file}" is not a file in this project`);
    need('resume.label', isText(profile.resume?.label), 'is required');
    for (const key of ['degree', 'school', 'years'])
      need(`education.${key}`, isText(profile.education?.[key]), 'is required');
    const hero = profile.hero || {};
    for (const key of ['availability', 'greeting', 'bio']) need(`hero.${key}`, isText(hero[key]), 'is required');
    need('hero.headline', isText(hero.headline?.marked) && isText(hero.headline?.rest), 'needs "marked" and "rest"');
    need('hero.actions', isText(hero.actions?.work) && isText(hero.actions?.contact), 'needs "work" and "contact"');
    need(
      'hero.portraitWords',
      isList(hero.portraitWords) && hero.portraitWords.every(isText),
      'must be a list of words',
    );
    need(
      'hero.collaborators',
      Array.isArray(hero.collaborators) && hero.collaborators.length === 3,
      'must name exactly three cursors',
    );
    for (const key of ['heading', 'blurb', 'release', 'focus'])
      need(`contact.${key}`, isText(profile.contact?.[key]), 'is required');
  }

  // ---- experience.json
  const experience = load('experience.json');
  if (experience) {
    const need = scope('experience.json');
    need('the file', isList(experience), 'must be a list with at least one job');
    const jobs = Array.isArray(experience) ? experience : [];
    duplicates(jobs.map((job) => job.id)).forEach((id) => need(id, false, 'this id is used twice'));
    jobs.forEach((job, i) => {
      const where = job.id || `job ${i + 1}`;
      need(where, isText(job.id) && isText(job.company) && isText(job.role), 'needs an id, a company and a role');
      need(where, MONTH.test(job.start || ''), `start "${job.start}" must be a month written as YYYY-MM`);
      need(
        where,
        job.end === null || MONTH.test(job.end || ''),
        `end "${job.end}" must be YYYY-MM, or null for a current job`,
      );
      need(where, !job.end || !MONTH.test(job.start || '') || job.end >= job.start, 'ends before it starts');
      need(where, i === 0 || !jobs[i - 1].start || job.start >= jobs[i - 1].start, 'jobs must be listed oldest first');
      need(where, isList(job.work), 'needs at least one line of work');
      (job.work || []).forEach((line, j) => {
        need(`${where}, work line ${j + 1}`, isText(line.scope) && isText(line.text), 'needs a scope and a text');
      });
    });
  }

  // ---- skills.json
  const skills = load('skills.json');
  if (skills) {
    const need = scope('skills.json');
    need('the file', isList(skills), 'must be a list with at least one group');
    const groups = Array.isArray(skills) ? skills : [];
    duplicates(groups.map((group) => group.id)).forEach((id) => need(id, false, 'this id is used twice'));
    groups.forEach((group, i) => {
      const where = group.id || `group ${i + 1}`;
      need(where, isText(group.id) && isText(group.name), 'needs an id and a name');
      need(where, isList(group.items) && group.items.every(isText), 'needs a list of items');
      duplicates(group.items || []).forEach((item) => need(where, false, `"${item}" is listed twice`));
      (group.highlight || []).forEach((item) => {
        need(where, (group.items || []).includes(item), `highlights "${item}", which is not one of its items`);
      });
    });
  }

  // ---- projects.json and each project's folder
  const projects = load('projects.json');
  if (projects) {
    const need = scope('projects.json');
    need('the file', isList(projects), 'must be a list with at least one project');
    const list = Array.isArray(projects) ? projects : [];
    duplicates(list.map((project) => project.id)).forEach((id) => need(id, false, 'this id is used twice'));
    list.forEach((project, i) => {
      const where = project.id || `project ${i + 1}`;
      need(where, SLUG.test(project.id || ''), 'id must be lower-case words joined by hyphens, like "pay-bot"');
      need(
        where,
        isText(project.name) && isText(project.tagline) && isText(project.summary),
        'needs a name, a tagline and a summary',
      );
      need(where, STATUSES.includes(project.status), `status must be one of: ${STATUSES.join(', ')}`);
      need(where, isList(project.stack) && project.stack.every(isText), 'needs a stack list');
      need(
        where,
        project.repo === null || /^[\w.-]+\/[\w.-]+$/.test(project.repo || ''),
        'repo must be null or "owner/name"',
      );
      const folder = `projects/${project.id}`;
      for (const tab of project.writeup || []) {
        need(where, WRITEUP_TABS.includes(tab), `writeup lists "${tab}"; allowed: ${WRITEUP_TABS.join(', ')}`);
        const file = tab === 'architecture' ? 'architecture.json' : `${tab}.md`;
        need(
          where,
          existsSync(join(content, folder, file)),
          `writeup lists "${tab}" but content/${folder}/${file} does not exist`,
        );
      }
      if ((project.writeup || []).includes('architecture') && existsSync(join(content, folder, 'architecture.json'))) {
        checkDiagram(`${folder}/architecture.json`);
      }
    });
    const folders = existsSync(join(content, 'projects')) ? readdirSync(join(content, 'projects')) : [];
    folders
      .filter((folder) => !list.some((project) => project.id === folder))
      .forEach((folder) => need(folder, false, `content/projects/${folder} exists but no project has that id`));
  }

  function checkDiagram(file) {
    const diagram = load(file);
    if (!diagram) return;
    const need = scope(file);
    need('nodes', isList(diagram.nodes), 'must be a list with at least one node');
    const nodes = Array.isArray(diagram.nodes) ? diagram.nodes : [];
    const ids = nodes.map((node) => node.id);
    duplicates(ids).forEach((id) => need(id, false, 'this node id is used twice'));
    duplicates(nodes.map((node) => `column ${node.col}, row ${node.row}`)).forEach((cell) =>
      need(cell, false, 'two nodes share this cell'),
    );
    nodes.forEach((node, i) => {
      const where = node.id || `node ${i + 1}`;
      need(where, isText(node.id) && isText(node.label), 'needs an id and a label');
      need(
        where,
        Number.isInteger(node.col) && Number.isInteger(node.row) && node.col >= 0 && node.row >= 0,
        'col and row must be whole numbers from 0',
      );
      need(
        where,
        node.kind === undefined || NODE_KINDS.includes(node.kind),
        `kind must be left out or one of: ${NODE_KINDS.join(', ')}`,
      );
    });
    (diagram.edges || []).forEach((edge, i) => {
      need(
        `edge ${i + 1}`,
        ids.includes(edge.from) && ids.includes(edge.to),
        `joins "${edge.from}" to "${edge.to}", and one of them is not a node`,
      );
    });
    if (diagram.details !== undefined) {
      const beside = file.replace(/[^/]+$/, diagram.details);
      need(
        'details',
        existsSync(join(content, beside)),
        `names "${diagram.details}" but content/${beside} does not exist`,
      );
    }
  }

  return problems;
}

// run from the command line
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const problems = checkContent(fileURLToPath(new URL('..', import.meta.url)));
  if (problems.length) {
    console.error(`${problems.length} problem${problems.length === 1 ? '' : 's'} in content/:\n`);
    problems.forEach((problem) => console.error(`  ${problem}`));
    process.exit(1);
  }
  console.log('content/ is sound.');
}
