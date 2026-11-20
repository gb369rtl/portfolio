// A small static file server for working on the page: npm run dev [-- --port 8080] [-- --dir dist]
// The page loads its modules and content over HTTP, so it cannot be opened straight from the disk.
// No dependencies, nothing cached, bound to this machine only.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

const option = (name, fallback) => {
  const at = process.argv.indexOf(`--${name}`);
  return at > 0 ? process.argv[at + 1] : fallback;
};
const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const root = resolve(projectRoot, option('dir', '.'));
const port = Number(option('port', process.env.PORT || 5173));

const server = createServer(async (request, response) => {
  const send = (status, body) => {
    response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(body);
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') return send(405, 'Method not allowed');

  let path;
  try {
    path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  } catch {
    return send(400, 'Bad request');
  }
  let file = normalize(join(root, path));
  if (file !== root && !file.startsWith(root + sep)) return send(403, 'Forbidden'); // never serve outside the folder

  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const info = await stat(file);
    response.writeHead(200, {
      'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': 'no-store',
    });
    if (request.method === 'HEAD') return response.end();
    return createReadStream(file).pipe(response);
  } catch {
    return send(404, `Not found: ${path}`);
  }
});

server.on('error', (error) => {
  console.error(
    error.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: npm run dev -- --port ${port + 1}` : error.message,
  );
  process.exit(1);
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root}\n  http://127.0.0.1:${port}/`);
});
