// Everything the page says comes from content/. The facts are loaded once, before anything is drawn;
// a project's write-up is loaded the first time its book is opened.

import { formatRange } from '../lib/dates.js';

const ROOT = new URL('../../content/', import.meta.url);

async function request(path) {
  const response = await fetch(new URL(path, ROOT));
  if (!response.ok) throw new Error(`content/${path} answered ${response.status}`);
  return response;
}
const json = async (path) => (await request(path)).json();
const text = async (path) => (await request(path)).text();

const [site, profile, jobs, skills, projects] = await Promise.all([
  json('site.json'),
  json('profile.json'),
  json('experience.json'),
  json('skills.json'),
  json('projects.json'),
]);

/** Jobs, oldest first, each with its dates written out ("Jun 2024 - Mar 2025"). */
const experience = jobs.map((job) => ({ ...job, dates: formatRange(job.start, job.end, job.note) }));

export { site, profile, experience, skills, projects };

const writeups = new Map();

async function fetchWriteup(project) {
  const base = `projects/${project.id}/`;
  const parts = await Promise.all(
    (project.writeup || []).map(async (name) => {
      if (name !== 'architecture') return [name, await text(`${base}${name}.md`)];
      const diagram = await json(`${base}architecture.json`);
      const details = diagram.details ? await text(base + diagram.details) : '';
      return [name, { ...diagram, details }];
    }),
  );
  return Object.fromEntries(parts);
}

/**
 * A project's write-up: Markdown text by tab name, and the diagram under `architecture`.
 * Resolves to an empty object if the files cannot be read, so a book always opens.
 */
export function loadWriteup(project) {
  if (!writeups.has(project.id)) {
    writeups.set(
      project.id,
      fetchWriteup(project).catch((error) => {
        console.error(error);
        writeups.delete(project.id);
        return {};
      }),
    );
  }
  return writeups.get(project.id);
}
