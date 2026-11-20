// Prints resume/resume.html to assets/Geetam-Resume.pdf, the file the page's resume links open.
//
//   npm run resume
//
// It uses the Chrome or Edge already on the machine, headless. Set CHROME_PATH to point at another browser.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = join(root, 'resume', 'resume.html');
const profile = JSON.parse(readFileSync(join(root, 'content', 'profile.json'), 'utf8'));
const output = join(root, profile.resume.file); // the same file the page links to

const CANDIDATES = {
  win32: [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  ],
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'],
};

const browser = [process.env.CHROME_PATH, ...(CANDIDATES[process.platform] || [])].find(
  (path) => path && existsSync(path),
);
if (!browser) {
  console.error('No Chrome or Edge found. Set CHROME_PATH to the browser to print with.');
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), 'resume-print-')); // a throwaway browser profile
try {
  execFileSync(
    browser,
    [
      '--headless=new',
      '--no-pdf-header-footer',
      `--user-data-dir=${scratch}`,
      `--print-to-pdf=${output}`,
      pathToFileURL(source).href,
    ],
    { stdio: 'ignore' },
  );
} finally {
  rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}

console.log(`${profile.resume.file} written (${Math.round(statSync(output).size / 1024)} KB) from resume/resume.html`);
