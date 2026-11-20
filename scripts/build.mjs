// Makes dist/: the folder to put online. The page has no build step, so this only checks the content and
// copies the files a visitor's browser asks for, leaving the tooling, tests and docs behind.
//
//   npm run build          then: npm run dev -- --dir dist   to look at the result

import { cp, mkdir, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkContent } from './check-content.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = join(root, 'dist');
const PUBLISHED = ['index.html', 'assets', 'content', 'src'];

const problems = checkContent(root);
if (problems.length) {
  console.error('Not building: content/ has problems. Run "npm run check" to see them.');
  process.exit(1);
}

await rm(out, { recursive: true, force: true });
await mkdir(out);
for (const name of PUBLISHED) await cp(join(root, name), join(out, name), { recursive: true });

async function measure(folder) {
  let files = 0;
  let bytes = 0;
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) {
      const inner = await measure(path);
      files += inner.files;
      bytes += inner.bytes;
    } else {
      files += 1;
      bytes += (await stat(path)).size;
    }
  }
  return { files, bytes };
}
const { files, bytes } = await measure(out);
console.log(`dist/ is ready: ${files} files, ${Math.round(bytes / 1024)} KB`);
